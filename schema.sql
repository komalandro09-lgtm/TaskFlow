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
CREATE TABLE firewall_blocked_ips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT UNIQUE NOT NULL,
  reason TEXT,
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  attempts_count INTEGER DEFAULT 1 NOT NULL
);

-- Firewall Rate Limits Table
CREATE TABLE firewall_rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL,
  action TEXT NOT NULL,
  attempt_count INTEGER DEFAULT 1 NOT NULL,
  last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE (ip_address, action)
);

-- Audit Logs Table
CREATE TABLE audit_logs (
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

-- Projects Policies
CREATE POLICY "Workspace members can view projects" ON projects FOR SELECT USING (
  EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = projects.workspace_id AND user_id = auth.uid())
);
CREATE POLICY "Workspace managers/owners can manage projects" ON projects FOR ALL USING (
  EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = projects.workspace_id AND user_id = auth.uid() AND role IN ('owner', 'manager'))
);

-- Tasks Policies
CREATE POLICY "Workspace members can view/manage tasks" ON tasks FOR ALL USING (
  EXISTS (
    SELECT 1 FROM projects p 
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id 
    WHERE p.id = tasks.project_id AND wm.user_id = auth.uid()
  )
);

-- Notifications Policies
CREATE POLICY "Users can manage their own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);

-- Activity Logs Policies
CREATE POLICY "Workspace members can view activity logs" ON activity_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = activity_logs.workspace_id AND user_id = auth.uid())
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
