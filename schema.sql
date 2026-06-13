-- TASKFLOW SUPABASE DATABASE SCHEMA
-- NOTE: Tables are defined first to resolve forward-referencing in RLS policies.

-- ==========================================
-- 1. TABLE CREATIONS
-- ==========================================

-- Profiles Table (linked to Supabase Auth Users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT false NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Workspaces Table
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Workspace Members Table (Roles: 'owner', 'manager', 'member')
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'manager', 'member')) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('active', 'pending')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE (workspace_id, user_id)
);

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  due_date DATE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'on hold', 'completed', 'archived')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Project Members Table
CREATE TABLE IF NOT EXISTS project_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE (project_id, user_id)
);

-- Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')) NOT NULL,
  status TEXT DEFAULT 'todo' CHECK (status IN ('backlog', 'todo', 'in_progress', 'review', 'completed')) NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  labels TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Checklists Table
CREATE TABLE IF NOT EXISTS checklists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Comments Table
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Attachments Table
CREATE TABLE IF NOT EXISTS attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  file_type TEXT,
  size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Project Messages Table (Team Chat)
CREATE TABLE IF NOT EXISTS project_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Workspace Messages Table (Team Chat)
CREATE TABLE IF NOT EXISTS workspace_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Firewall Blocked IPs Table
CREATE TABLE IF NOT EXISTS firewall_blocked_ips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT UNIQUE NOT NULL,
  reason TEXT,
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  attempts_count INTEGER DEFAULT 1 NOT NULL
);

-- Firewall Rate Limits Table
CREATE TABLE IF NOT EXISTS firewall_rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL,
  action TEXT NOT NULL,
  attempt_count INTEGER DEFAULT 1 NOT NULL,
  last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE (ip_address, action)
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  email TEXT,
  action TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- ==========================================
-- 2. AUTOMATIC PROFILE CREATION TRIGGER (auth.users -> profiles)
-- ==========================================

-- Trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile first
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/initials/svg?seed=' || split_part(new.email, '@', 1))
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==========================================
-- 2.5. RLS SECURITY DEFINER FUNCTIONS (to avoid policy recursion)
-- ==========================================

CREATE OR REPLACE FUNCTION public.is_workspace_member(workspace_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_members.workspace_id = is_workspace_member.workspace_id
    AND workspace_members.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_workspace_owner(workspace_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = is_workspace_owner.workspace_id
    AND workspaces.owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_workspace_role(workspace_id UUID, roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_members.workspace_id = has_workspace_role.workspace_id
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role = ANY(roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- 3. ROW LEVEL SECURITY (RLS) & POLICIES
-- ==========================================

-- Enable RLS on Tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Clean existing policies to prevent conflicts
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profiles" ON profiles;

DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON workspaces;
DROP POLICY IF EXISTS "Workspace owners can insert workspaces" ON workspaces;
DROP POLICY IF EXISTS "Workspace owners can update workspaces" ON workspaces;
DROP POLICY IF EXISTS "Workspace owners can delete workspaces" ON workspaces;

DROP POLICY IF EXISTS "Workspace members can view membership lists" ON workspace_members;
DROP POLICY IF EXISTS "Allow members insertion by workspace owners or self" ON workspace_members;
DROP POLICY IF EXISTS "Workspace managers/owners can edit memberships" ON workspace_members;
DROP POLICY IF EXISTS "Users can update their own membership status" ON workspace_members;
DROP POLICY IF EXISTS "Users can delete their own membership" ON workspace_members;

DROP POLICY IF EXISTS "Workspace members can view projects" ON projects;
DROP POLICY IF EXISTS "Workspace managers/owners can manage projects" ON projects;

DROP POLICY IF EXISTS "Workspace members can view/manage tasks" ON tasks;

DROP POLICY IF EXISTS "Users can manage their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert notifications for anyone" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

DROP POLICY IF EXISTS "Workspace members can view activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Workspace members can insert activity logs" ON activity_logs;

DROP POLICY IF EXISTS "Admins can manage firewall_blocked_ips" ON firewall_blocked_ips;
DROP POLICY IF EXISTS "Admins can manage firewall_rate_limits" ON firewall_rate_limits;
DROP POLICY IF EXISTS "Admins can manage audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "Enable select for all on firewall_blocked_ips" ON firewall_blocked_ips;
DROP POLICY IF EXISTS "Enable insert for all on firewall_rate_limits" ON firewall_rate_limits;
DROP POLICY IF EXISTS "Enable update for all on firewall_rate_limits" ON firewall_rate_limits;
DROP POLICY IF EXISTS "Enable insert for all on audit_logs" ON audit_logs;

DROP POLICY IF EXISTS "Workspace members can view project messages" ON project_messages;
DROP POLICY IF EXISTS "Workspace members can insert project messages" ON project_messages;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profiles" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profiles" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Workspaces Policies
CREATE POLICY "Users can view workspaces they are members of" ON workspaces
  FOR SELECT USING (
    auth.uid() = owner_id OR 
    public.is_workspace_member(id)
  );
CREATE POLICY "Workspace owners can insert workspaces" ON workspaces FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Workspace owners can update workspaces" ON workspaces FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Workspace owners can delete workspaces" ON workspaces FOR DELETE USING (auth.uid() = owner_id);

-- Workspace Members Policies
CREATE POLICY "Workspace members can view membership lists" ON workspace_members FOR SELECT USING (
  public.is_workspace_member(workspace_id) OR
  public.is_workspace_owner(workspace_id)
);
CREATE POLICY "Allow members insertion by workspace owners or self" ON workspace_members FOR INSERT WITH CHECK (
  auth.uid() = user_id OR
  public.is_workspace_owner(workspace_id)
);
CREATE POLICY "Workspace managers/owners can edit memberships" ON workspace_members FOR ALL USING (
  public.has_workspace_role(workspace_id, ARRAY['owner', 'manager']) OR
  public.is_workspace_owner(workspace_id)
);
CREATE POLICY "Users can update their own membership status" ON workspace_members FOR UPDATE USING (
  auth.uid() = user_id
);
CREATE POLICY "Users can delete their own membership" ON workspace_members FOR DELETE USING (
  auth.uid() = user_id
);

-- Projects Policies
CREATE POLICY "Workspace members can view projects" ON projects FOR SELECT USING (
  public.is_workspace_member(workspace_id) OR
  public.is_workspace_owner(workspace_id)
);
CREATE POLICY "Workspace managers/owners can manage projects" ON projects FOR ALL USING (
  public.has_workspace_role(workspace_id, ARRAY['owner', 'manager']) OR
  public.is_workspace_owner(workspace_id)
);

-- Tasks Policies
CREATE POLICY "Workspace members can view/manage tasks" ON tasks FOR ALL USING (
  EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = tasks.project_id AND (
      public.is_workspace_member(p.workspace_id) OR
      public.is_workspace_owner(p.workspace_id)
    )
  )
);

-- Notifications Policies
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert notifications for anyone" ON notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notifications" ON notifications FOR DELETE USING (auth.uid() = user_id);

-- Activity Logs Policies
CREATE POLICY "Workspace members can view activity logs" ON activity_logs FOR SELECT USING (
  public.is_workspace_member(workspace_id) OR
  public.is_workspace_owner(workspace_id)
);
CREATE POLICY "Workspace members can insert activity logs" ON activity_logs FOR INSERT WITH CHECK (
  public.is_workspace_member(workspace_id) OR
  public.is_workspace_owner(workspace_id)
);

-- Project Messages Policies
ALTER TABLE project_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can view project messages" ON project_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = project_messages.project_id AND (
      public.is_workspace_member(p.workspace_id) OR
      public.is_workspace_owner(p.workspace_id)
    )
  )
);
CREATE POLICY "Workspace members can insert project messages" ON project_messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = project_messages.project_id AND (
      public.is_workspace_member(p.workspace_id) OR
      public.is_workspace_owner(p.workspace_id)
    )
  ) AND auth.uid() = user_id
);

-- Workspace Messages Policies
ALTER TABLE workspace_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can view workspace messages" ON workspace_messages FOR SELECT USING (
  public.is_workspace_member(workspace_id) OR
  public.is_workspace_owner(workspace_id)
);
CREATE POLICY "Workspace members can insert workspace messages" ON workspace_messages FOR INSERT WITH CHECK (
  (public.is_workspace_member(workspace_id) OR public.is_workspace_owner(workspace_id)) AND auth.uid() = user_id
);


-- ==========================================
-- 4. FIREWALL & AUDIT LOGS POLICIES
-- ==========================================

ALTER TABLE firewall_blocked_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE firewall_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins policy: Allow full read/write access to admins
CREATE POLICY "Admins can manage firewall_blocked_ips" ON firewall_blocked_ips
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can manage firewall_rate_limits" ON firewall_rate_limits
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can manage audit_logs" ON audit_logs
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Public/Client policy: Allow anyone to query blocked IPs, modify rate limits and insert audit logs
CREATE POLICY "Enable select for all on firewall_blocked_ips" ON firewall_blocked_ips
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all on firewall_rate_limits" ON firewall_rate_limits
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all on firewall_rate_limits" ON firewall_rate_limits
  FOR UPDATE USING (true);

CREATE POLICY "Enable insert for all on audit_logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- ==========================================
-- 5. REALTIME SUBSCRIPTIONS
-- ==========================================
-- Enable real-time for the notifications table so users receive pop-ups instantly
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;


-- ==========================================
-- 6. TEAMS & TEAM MEMBERSHIP SYSTEM
-- ==========================================

-- Teams Table
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366F1' NOT NULL,
  icon TEXT DEFAULT 'Users' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Team Members Table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('lead', 'member')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE (team_id, user_id)
);

-- Add team_id columns to projects and tasks tables
ALTER TABLE projects ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Teams Policies
CREATE POLICY "Workspace members can view teams" ON teams
  FOR SELECT USING (
    public.is_workspace_member(workspace_id) OR
    public.is_workspace_owner(workspace_id)
  );

CREATE POLICY "Workspace managers/owners can manage teams" ON teams
  FOR ALL USING (
    public.has_workspace_role(workspace_id, ARRAY['owner', 'manager']) OR
    public.is_workspace_owner(workspace_id)
  )
  WITH CHECK (
    public.has_workspace_role(workspace_id, ARRAY['owner', 'manager']) OR
    public.is_workspace_owner(workspace_id)
  );

-- Team Members Policies
CREATE POLICY "Workspace members can view team memberships" ON team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_members.team_id AND (
        public.is_workspace_member(t.workspace_id) OR
        public.is_workspace_owner(t.workspace_id)
      )
    )
  );

CREATE POLICY "Workspace managers/owners can manage team memberships" ON team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_members.team_id AND (
        public.has_workspace_role(t.workspace_id, ARRAY['owner', 'manager']) OR
        public.is_workspace_owner(t.workspace_id)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_members.team_id AND (
        public.has_workspace_role(t.workspace_id, ARRAY['owner', 'manager']) OR
        public.is_workspace_owner(t.workspace_id)
      )
    )
  );

-- ==========================================
-- 7. WORKSPACE INVITATIONS SYSTEM
-- ==========================================

-- Workspace Invitations Table
CREATE TABLE IF NOT EXISTS public.workspace_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'manager', 'member')) NOT NULL,
  token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Accepted', 'Declined', 'Expired', 'Cancelled')) NOT NULL,
  invited_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (workspace_id, email)
);

-- Enable RLS
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Enable Policies
CREATE POLICY "Workspace members can view invitations" ON public.workspace_invitations 
  FOR SELECT USING (
    public.is_workspace_member(workspace_id) OR public.is_workspace_owner(workspace_id)
  );

CREATE POLICY "Workspace managers/owners can manage invitations" ON public.workspace_invitations 
  FOR ALL USING (
    public.has_workspace_role(workspace_id, ARRAY['owner', 'manager']) OR public.is_workspace_owner(workspace_id)
  );

-- Allow public select by token for unauthenticated landing page validation
CREATE POLICY "Public select by invitation token" ON public.workspace_invitations
  FOR SELECT USING (true);

-- secure function to query invitation details by token anonymously
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(invite_token UUID)
RETURNS TABLE (
  id UUID,
  workspace_id UUID,
  workspace_name TEXT,
  inviter_name TEXT,
  email TEXT,
  role TEXT,
  status TEXT,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wi.id,
    wi.workspace_id,
    w.name AS workspace_name,
    p.full_name AS inviter_name,
    wi.email,
    wi.role,
    wi.status,
    wi.expires_at
  FROM public.workspace_invitations wi
  JOIN public.workspaces w ON wi.workspace_id = w.id
  JOIN public.profiles p ON wi.invited_by = p.id
  WHERE wi.token = invite_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- secure function to accept a workspace invitation
CREATE OR REPLACE FUNCTION public.accept_workspace_invitation(invite_token UUID)
RETURNS JSONB AS $$
DECLARE
  invitation_rec RECORD;
  profile_rec RECORD;
BEGIN
  -- Fetch invitation
  SELECT * INTO invitation_rec 
  FROM public.workspace_invitations 
  WHERE token = invite_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invitation not found');
  END IF;

  -- Verify status
  IF invitation_rec.status != 'Pending' THEN
    RETURN jsonb_build_object('error', 'Invitation has already been ' || LOWER(invitation_rec.status));
  END IF;

  -- Verify expiration
  IF invitation_rec.expires_at < NOW() THEN
    UPDATE public.workspace_invitations 
    SET status = 'Expired' 
    WHERE id = invitation_rec.id;
    RETURN jsonb_build_object('error', 'Invitation has expired');
  END IF;

  -- Verify logged-in caller
  SELECT * INTO profile_rec 
  FROM public.profiles 
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- Validate matching email address
  IF LOWER(profile_rec.email) != LOWER(invitation_rec.email) THEN
    RETURN jsonb_build_object('error', 'This invitation was sent to ' || invitation_rec.email || ', but you are logged in as ' || profile_rec.email);
  END IF;

  -- Add to workspace_members (or update status to active)
  IF EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_id = invitation_rec.workspace_id AND user_id = profile_rec.id
  ) THEN
    UPDATE public.workspace_members 
    SET role = invitation_rec.role, status = 'active'
    WHERE workspace_id = invitation_rec.workspace_id AND user_id = profile_rec.id;
  ELSE
    INSERT INTO public.workspace_members (workspace_id, user_id, role, status)
    VALUES (invitation_rec.workspace_id, profile_rec.id, invitation_rec.role, 'active');
  END IF;

  -- Update invitation status
  UPDATE public.workspace_invitations
  SET status = 'Accepted', accepted_at = NOW()
  WHERE id = invitation_rec.id;

  -- Log Activity
  INSERT INTO public.activity_logs (workspace_id, user_id, action, target_type, target_name)
  VALUES (invitation_rec.workspace_id, profile_rec.id, 'joined', 'user', profile_rec.full_name);

  -- Create Notification for Workspace Owner
  INSERT INTO public.notifications (user_id, title, description)
  SELECT owner_id, 'Invitation Accepted', profile_rec.full_name || ' accepted your invitation to join ' || name
  FROM public.workspaces
  WHERE id = invitation_rec.workspace_id;

  RETURN jsonb_build_object('success', true, 'workspace_id', invitation_rec.workspace_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- secure function to decline a workspace invitation
CREATE OR REPLACE FUNCTION public.decline_workspace_invitation(invite_token UUID)
RETURNS JSONB AS $$
DECLARE
  invitation_rec RECORD;
  profile_rec RECORD;
BEGIN
  -- Fetch invitation
  SELECT * INTO invitation_rec 
  FROM public.workspace_invitations 
  WHERE token = invite_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invitation not found');
  END IF;

  -- Verify status
  IF invitation_rec.status != 'Pending' THEN
    RETURN jsonb_build_object('error', 'Invitation is already ' || LOWER(invitation_rec.status));
  END IF;

  -- Verify logged-in caller
  SELECT * INTO profile_rec 
  FROM public.profiles 
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- Validate matching email address
  IF LOWER(profile_rec.email) != LOWER(invitation_rec.email) THEN
    RETURN jsonb_build_object('error', 'This invitation was sent to ' || invitation_rec.email || ', but you are logged in as ' || profile_rec.email);
  END IF;

  -- Update invitation status
  UPDATE public.workspace_invitations
  SET status = 'Declined'
  WHERE id = invitation_rec.id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Resend API Email Sender RPC
CREATE OR REPLACE FUNCTION public.send_invitation_email_via_resend(
  recipient_email TEXT,
  workspace_name TEXT,
  inviter_name TEXT,
  assigned_role TEXT,
  invite_token UUID,
  api_key TEXT
)
RETURNS JSONB AS $$
DECLARE
  response extensions.http_response;
  payload JSONB;
  email_html TEXT;
  invite_url TEXT;
BEGIN
  -- Construct the invite URL
  invite_url := 'http://localhost:5173/invite?token=' || invite_token::TEXT;

  -- Branded HTML Template
  email_html := '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">' ||
                '  <div style="text-align: center; margin-bottom: 28px;">' ||
                '    <div style="display: inline-block; padding: 12px; background: linear-gradient(135deg, #4f46e5, #8b5cf6); border-radius: 14px; color: #ffffff; font-weight: bold; font-size: 22px; width: 40px; height: 40px; line-height: 40px; text-shadow: 0 2px 4px rgba(0,0,0,0.15);">TF</div>' ||
                '    <h2 style="color: #0f172a; margin-top: 16px; margin-bottom: 4px; font-size: 24px; font-weight: 800; tracking-tight: -0.025em;">Join ' || workspace_name || '</h2>' ||
                '    <p style="color: #64748b; font-size: 14px; margin: 0;">Collaborate with your team on TaskFlow</p>' ||
                '  </div>' ||
                '  <div style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 24px;">' ||
                '    <p>Hello,</p>' ||
                '    <p><strong>' || inviter_name || '</strong> has invited you to join the <strong>' || workspace_name || '</strong> workspace on TaskFlow as a <strong>' || assigned_role || '</strong>.</p>' ||
                '    <div style="text-align: center; margin: 36px 0;">' ||
                '      <a href="' || invite_url || '" style="background: linear-gradient(135deg, #4f46e5, #6366f1); color: #ffffff; padding: 14px 30px; text-decoration: none; font-weight: 700; border-radius: 12px; display: inline-block; font-size: 14px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">Accept Invitation</a>' ||
                '    </div>' ||
                '    <p style="font-size: 12px; color: #94a3b8; text-align: center;">This invitation link will expire in 7 days.</p>' ||
                '  </div>' ||
                '  <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;" />' ||
                '  <p style="font-size: 11px; color: #94a3b8; line-height: 1.5; text-align: center; margin: 0;">If you did not expect this invitation, you can safely ignore this email.</p>' ||
                '</div>';

  -- Construct payload for Resend
  payload := jsonb_build_object(
    'from', 'TaskFlow <onboarding@resend.dev>',
    'to', ARRAY[recipient_email],
    'subject', 'Invitation to join ' || workspace_name || ' on TaskFlow',
    'html', email_html
  );

  -- Execute HTTP Post using http extension
  SELECT * INTO response FROM extensions.http(
    (
      'POST',
      'https://api.resend.com/emails',
      ARRAY[
        extensions.http_header('Authorization', 'Bearer ' || api_key),
        extensions.http_header('Content-Type', 'application/json')
      ],
      'application/json',
      payload::TEXT
    )::extensions.http_request
  );

  RETURN jsonb_build_object(
    'status', response.status,
    'content', response.content::JSONB
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


