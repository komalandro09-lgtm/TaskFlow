import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isUsingMock } from '../supabaseClient';
import { useAuth } from './AuthContext';

// Schema Interfaces
export interface Workspace {
  id: string;
  name: string;
  description: string;
  logo_url: string;
  owner_id: string;
  created_at: string;
  plan?: 'Free' | 'Starter' | 'Pro' | 'Enterprise';
  subscription_status?: 'active' | 'cancelled' | 'expired';
}

export const PLAN_LIMITS = {
  Free: { projects: 9999, members: 9999, workspaces: 9999 },
  Starter: { projects: 9999, members: 9999, workspaces: 9999 },
  Pro: { projects: 9999, members: 9999, workspaces: 9999 },
  Enterprise: { projects: 9999, members: 9999, workspaces: 9999 }
};

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'manager' | 'member';
  status: 'active' | 'pending';
  profile: {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string;
  };
}

export interface WorkspaceInvitation {
  id: string;
  workspace_id: string;
  email: string;
  role: 'owner' | 'manager' | 'member';
  token: string;
  status: 'Pending' | 'Accepted' | 'Declined' | 'Expired' | 'Cancelled';
  invited_by: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  profile?: {
    full_name: string;
    avatar_url: string;
  };
}

export interface Team {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'lead' | 'member';
  created_at: string;
  profile: {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string;
  };
}

export interface Project {
  id: string;
  workspace_id: string;
  team_id?: string | null;
  name: string;
  description: string;
  start_date: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'on hold' | 'completed' | 'archived';
  created_at: string;
  progress?: number; // calculated progress percentage
}

export interface Task {
  id: string;
  project_id: string;
  team_id?: string | null;
  title: string;
  description: string;
  assignee_id: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'completed';
  due_date: string | null;
  labels: string[];
  created_at: string;
  checklistCount?: { total: number; completed: number };
  commentCount?: number;
  attachmentCount?: number;
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    full_name: string;
    avatar_url: string;
  };
}

export interface ChecklistItem {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  created_at: string;
}

export interface Attachment {
  id: string;
  task_id: string;
  name: string;
  url: string;
  file_type: string;
  size: number;
  created_at: string;
}

export interface ProjectMessage {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string;
  };
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  description: string;
  is_read: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  workspace_id: string;
  user_id: string;
  action: string;
  target_type: string;
  target_name: string;
  created_at: string;
  profile?: {
    full_name: string;
    avatar_url: string;
  };
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  projects: Project[];
  members: WorkspaceMember[];
  invitations: WorkspaceInvitation[];
  teams: Team[];
  teamMembers: TeamMember[];
  notifications: Notification[];
  activities: ActivityLog[];
  loading: boolean;
  createWorkspace: (name: string, description: string, logoUrl: string) => Promise<{ workspace: Workspace | null; error: any }>;
  updateWorkspace: (workspaceId: string, updates: Partial<Workspace>) => Promise<{ workspace: Workspace | null; error: any }>;
  deleteWorkspace: (workspaceId: string) => Promise<{ error: any }>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  createProject: (projectData: Omit<Project, 'id' | 'workspace_id' | 'created_at'>) => Promise<{ project: Project | null; error: any }>;
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<{ project: Project | null; error: any }>;
  deleteProject: (projectId: string) => Promise<{ error: any }>;
  inviteMember: (email: string, role: 'manager' | 'member') => Promise<{ member: any | null; error: any }>;
  removeMember: (memberId: string) => Promise<{ error: any }>;
  changeMemberRole: (memberId: string, role: 'manager' | 'member') => Promise<{ error: any }>;
  acceptInvitation: (memberId: string) => Promise<{ error: any }>;
  declineInvitation: (memberId: string) => Promise<{ error: any }>;
  resendInvitation: (invitationId: string) => Promise<{ error: any }>;
  cancelInvitation: (invitationId: string) => Promise<{ error: any }>;
  acceptInviteByToken: (token: string) => Promise<{ workspace_id?: string; error: any }>;
  declineInviteByToken: (token: string) => Promise<{ error: any }>;
  getInviteByToken: (token: string) => Promise<{ invitation: any; error: any }>;
  createTeam: (name: string, description: string, color: string, icon: string) => Promise<{ team: Team | null; error: any }>;
  updateTeam: (teamId: string, updates: Partial<Team>) => Promise<{ team: Team | null; error: any }>;
  deleteTeam: (teamId: string) => Promise<{ error: any }>;
  addTeamMember: (teamId: string, email: string, role: 'lead' | 'member') => Promise<{ member: TeamMember | null; error: any }>;
  removeTeamMember: (teamMemberId: string) => Promise<{ error: any }>;
  changeTeamMemberRole: (teamMemberId: string, role: 'lead' | 'member') => Promise<{ error: any }>;
  getProjectTasks: (projectId: string) => Promise<{ tasks: Task[]; error: any }>;
  createTask: (projectId: string, taskData: Omit<Task, 'id' | 'project_id' | 'created_at'>) => Promise<{ task: Task | null; error: any }>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<{ task: Task | null; error: any }>;
  deleteTask: (taskId: string) => Promise<{ error: any }>;
  getTaskDetails: (taskId: string) => Promise<{ checklist: ChecklistItem[]; comments: Comment[]; attachments: Attachment[]; error: any }>;
  addChecklistItem: (taskId: string, title: string) => Promise<{ item: ChecklistItem | null; error: any }>;
  toggleChecklistItem: (itemId: string, isCompleted: boolean) => Promise<{ error: any }>;
  deleteChecklistItem: (itemId: string) => Promise<{ error: any }>;
  addComment: (taskId: string, content: string) => Promise<{ comment: Comment | null; error: any }>;
  deleteComment: (commentId: string) => Promise<{ error: any }>;
  addAttachment: (taskId: string, name: string, url: string, fileType: string, size: number) => Promise<{ attachment: Attachment | null; error: any }>;
  deleteAttachment: (attachmentId: string) => Promise<{ error: any }>;
  getProjectMessages: (projectId: string) => Promise<{ messages: ProjectMessage[]; error: any }>;
  sendProjectMessage: (projectId: string, content: string) => Promise<{ message: ProjectMessage | null; error: any }>;
  getWorkspaceMessages: (workspaceId: string) => Promise<{ messages: any[]; error: any }>;
  sendWorkspaceMessage: (workspaceId: string, content: string) => Promise<{ message: any; error: any }>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  logActivity: (action: string, targetType: string, targetName: string) => Promise<void>;
  triggerNotification: (userId: string, title: string, description: string) => Promise<void>;
  refreshWorkspaceData: () => Promise<void>;
  seedDatabase: () => Promise<{ success: boolean; error: any }>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

// Helper: Send invitation email via Resend API directly
const RESEND_API_KEY = 're_Lsr8q3qh_CgYSiaKZ2X4f4oLur2zRGuja';

async function sendInvitationEmail(
  recipientEmail: string,
  workspaceName: string,
  inviterName: string,
  assignedRole: string,
  inviteToken: string
) {
  const inviteUrl = `${window.location.origin}/invite?token=${inviteToken}`;

  const emailHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 28px;">
        <div style="display: inline-block; padding: 12px; background: linear-gradient(135deg, #4f46e5, #8b5cf6); border-radius: 14px; color: #ffffff; font-weight: bold; font-size: 22px; width: 40px; height: 40px; line-height: 40px; text-shadow: 0 2px 4px rgba(0,0,0,0.15);">TF</div>
        <h2 style="color: #0f172a; margin-top: 16px; margin-bottom: 4px; font-size: 24px; font-weight: 800;">Join ${workspaceName}</h2>
        <p style="color: #64748b; font-size: 14px; margin: 0;">Collaborate with your team on TaskFlow</p>
      </div>
      <div style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 24px;">
        <p>Hello,</p>
        <p><strong>${inviterName}</strong> has invited you to join the <strong>${workspaceName}</strong> workspace on TaskFlow as a <strong>${assignedRole}</strong>.</p>
        <div style="text-align: center; margin: 36px 0;">
          <a href="${inviteUrl}" style="background: linear-gradient(135deg, #4f46e5, #6366f1); color: #ffffff; padding: 14px 30px; text-decoration: none; font-weight: 700; border-radius: 12px; display: inline-block; font-size: 14px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">Accept Invitation</a>
        </div>
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">This invitation link will expire in 7 days.</p>
      </div>
      <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
      <p style="font-size: 11px; color: #94a3b8; line-height: 1.5; text-align: center; margin: 0;">If you did not expect this invitation, you can safely ignore this email.</p>
    </div>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'TaskFlow <onboarding@resend.dev>',
        to: [recipientEmail],
        subject: `Invitation to join ${workspaceName} on TaskFlow`,
        html: emailHtml
      })
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('Resend API error:', result);
      return { error: result };
    }
    console.log('Invitation email sent successfully:', result);
    return { error: null };
  } catch (err) {
    console.error('Failed to send invitation email:', err);
    return { error: err };
  }
}

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeToast, setActiveToast] = useState<{id: string, title: string, desc: string} | null>(null);

  // 1. Initial Load of Workspaces
  useEffect(() => {
    if (!user) {
      setWorkspaces([]);
      setActiveWorkspace(null);
      setProjects([]);
      setMembers([]);
      setTeams([]);
      setTeamMembers([]);
      setNotifications([]);
      setActivities([]);
      setLoading(false);
      return;
    }

    loadWorkspacesData();

    // Ask for notification permission if not asked yet
    if ('Notification' in window && window.Notification.permission === 'default') {
      window.Notification.requestPermission();
    }

    // Set up Realtime Subscription for Notifications
    let notificationChannel: any = null;
    if (supabase.channel) {
      notificationChannel = supabase
        .channel('public:notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotif = payload.new as Notification;
            // Update local state so it appears in the topbar immediately
            setNotifications((prev) => {
              // Prevent duplicates if triggerNotification already added it
              if (prev.some(n => n.id === newNotif.id)) return prev;
              return [newNotif, ...prev];
            });

            // Show browser popup
            if ('Notification' in window && window.Notification.permission === 'granted') {
              new window.Notification(newNotif.title, { body: newNotif.description });
            }

            // Show in-app visual toast
            setActiveToast({ id: newNotif.id, title: newNotif.title, desc: newNotif.description });
            setTimeout(() => {
              setActiveToast(current => current?.id === newNotif.id ? null : current);
            }, 5000);
          }
        )
        .subscribe();
    }

    return () => {
      if (notificationChannel && supabase.removeChannel) {
        supabase.removeChannel(notificationChannel);
      }
    };
  }, [user]);

  // Load Workspaces data
  const loadWorkspacesData = async () => {
    setLoading(true);
    try {
      // Fetch workspaces where user is owner or member
      const { data: workspaceData, error: wsError } = await supabase
        .from('workspaces')
        .select('*');

      if (wsError) throw wsError;

      const wsList = (workspaceData || []).map((ws: any) => ({
        plan: 'Free',
        subscription_status: 'active',
        ...ws
      }));
      setWorkspaces(wsList);

      if (wsList.length > 0) {
        // Recover last active workspace or default to first
        const savedWsId = localStorage.getItem('taskflow_active_workspace_id');
        const active = wsList.find((w: any) => w.id === savedWsId) || wsList[0];
        setActiveWorkspace(active);
        localStorage.setItem('taskflow_active_workspace_id', active.id);
        
        await loadWorkspaceSubData(active.id);
      } else {
        setActiveWorkspace(null);
        setProjects([]);
        setMembers([]);
        setTeams([]);
        setTeamMembers([]);
        setLoading(false);
      }

      // Load user-specific notifications
      if (user) {
        const { data: notifData } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        setNotifications(notifData || []);
      }

    } catch (err) {
      console.error('Error loading workspaces:', err);
      setLoading(false);
    }
  };

  // Load projects, members, activities for specific workspace
  const loadWorkspaceSubData = async (workspaceId: string) => {
    try {
      // 1. Fetch projects
      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('workspace_id', workspaceId);

      // Fetch all tasks for these projects to calculate progress
      const projectIds = (projectData || []).map(p => p.id);
      let allTasks: any[] = [];
      if (projectIds.length > 0) {
        const { data: taskData } = await supabase
          .from('tasks')
          .select('id, project_id, status')
          .in('project_id', projectIds);
        allTasks = taskData || [];
      }

      // Map progress values
      const projectList = (projectData || []).map((project: any) => {
        let projectTasks = allTasks.filter((t: any) => t.project_id === project.id);
        if (projectTasks.length === 0 && projectIds.length === 0) {
          // Fallback to local storage (mock mode)
          const dbState = JSON.parse(localStorage.getItem('taskflow_mock_db') || '{}');
          projectTasks = (dbState.tasks || []).filter((t: any) => t.project_id === project.id);
        }
        const total = projectTasks.length;
        const completed = projectTasks.filter((t: any) => t.status === 'completed').length;
        return {
          ...project,
          progress: total > 0 ? Math.round((completed / total) * 100) : 0
        };
      });
      setProjects(projectList);

      // 2. Fetch workspace members
      const { data: memberData } = await supabase
        .from('workspace_members')
        .select('*, profiles(*)')
        .eq('workspace_id', workspaceId);

      // Map profiles for membership directory
      const memberList = (memberData || []).map((member: any) => {
        let profile = member.profiles;
        if (!profile) {
          const dbState = JSON.parse(localStorage.getItem('taskflow_mock_db') || '{}');
          profile = (dbState.profiles || []).find((p: any) => p.id === member.user_id) || {
            id: member.user_id,
            email: 'unknown@taskflow.com',
            full_name: 'Unknown Member',
            avatar_url: ''
          };
        }
        return { ...member, profile };
      });

      // Fetch workspace invitations
      let inviteList: any[] = [];
      try {
        const { data: inviteData } = await supabase
          .from('workspace_invitations')
          .select('*')
          .eq('workspace_id', workspaceId);

        if (inviteData) {
          inviteList = inviteData.map((inv: any) => {
            const inviter = memberList.find(m => m.user_id === inv.invited_by) || { profile: { full_name: 'Workspace Owner' } };
            return {
              ...inv,
              profile: {
                id: `invite_${inv.id}`,
                email: inv.email,
                full_name: inv.email.split('@')[0] + ' (Guest)',
                avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${inv.email.split('@')[0]}`,
                inviter_name: inviter.profile?.full_name || 'Workspace Owner'
              }
            };
          });
        }
      } catch (err) {
        console.error('Error fetching guest invitations:', err);
      }
      setInvitations(inviteList);

      // Map pending invitations to guest members for backward compatibility in standard directory listing
      const guestMembers = inviteList
        .filter((inv: any) => inv.status === 'Pending')
        .map((inv: any) => ({
          id: inv.id,
          workspace_id: inv.workspace_id,
          user_id: `invite_${inv.id}`,
          role: inv.role,
          status: 'pending',
          is_guest_invite: true,
          profile: {
            id: `invite_${inv.id}`,
            email: inv.email,
            full_name: inv.email.split('@')[0] + ' (Invited Guest)',
            avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${inv.email.split('@')[0]}`
          }
        }));

      setMembers([...memberList, ...guestMembers]);

      // 2.5 Fetch teams
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('workspace_id', workspaceId);
      
      const teamList = teamData || [];
      setTeams(teamList);

      // 2.6 Fetch team members
      let teamMembersList: any[] = [];
      const teamIds = teamList.map((t: any) => t.id);
      if (teamIds.length > 0) {
        const { data: tMembersData } = await supabase
          .from('team_members')
          .select('*, profiles(*)')
          .in('team_id', teamIds);
        
        teamMembersList = (tMembersData || []).map((tm: any) => {
          let profile = tm.profiles;
          if (!profile) {
            const dbState = JSON.parse(localStorage.getItem('taskflow_mock_db') || '{}');
            profile = (dbState.profiles || []).find((p: any) => p.id === tm.user_id) || {
              id: tm.user_id,
              email: 'unknown@taskflow.com',
              full_name: 'Unknown Member',
              avatar_url: ''
            };
          }
          return { ...tm, profile };
        });
      }
      setTeamMembers(teamMembersList);

      // 3. Fetch activity logs
      const { data: activityData } = await supabase
        .from('activity_logs')
        .select('*, profiles(*)')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      const activityList = (activityData || []).map((act: any) => {
        let profile = act.profiles;
        if (!profile) {
          const dbState = JSON.parse(localStorage.getItem('taskflow_mock_db') || '{}');
          profile = (dbState.profiles || []).find((p: any) => p.id === act.user_id);
        }
        return { ...act, profile };
      });
      setActivities(activityList);

    } catch (err) {
      console.error('Error loading sub data:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshWorkspaceData = async () => {
    if (activeWorkspace) {
      await loadWorkspaceSubData(activeWorkspace.id);
    }
  };

  const switchWorkspace = async (workspaceId: string) => {
    const target = workspaces.find(w => w.id === workspaceId);
    if (target) {
      setLoading(true);
      setActiveWorkspace(target);
      localStorage.setItem('taskflow_active_workspace_id', workspaceId);
      await loadWorkspaceSubData(workspaceId);
    }
  };

  const createWorkspace = async (name: string, description: string, logoUrl: string) => {
    try {
      if (!user) throw new Error('Not authenticated');

      if (workspaces.length > 0) {
        const currentPlan = activeWorkspace?.plan || 'Free';
        const limits = PLAN_LIMITS[currentPlan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.Free;
        if (workspaces.length >= limits.workspaces) {
          throw new Error(`Workspace limit reached. Your current plan (${currentPlan}) only allows up to ${limits.workspaces} workspace(s). Please upgrade to create more workspaces.`);
        }
      }
      
      const { data, error } = await supabase
        .from('workspaces')
        .insert({
          name,
          description,
          logo_url: logoUrl || `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=60`,
          owner_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Add workspace owner member role
      await supabase.from('workspace_members').insert({
        workspace_id: data.id,
        user_id: user.id,
        role: 'owner',
        status: 'active'
      });

      // Reload workspaces
      await loadWorkspacesData();
      return { workspace: data, error: null };
    } catch (error: any) {
      console.error('Error creating workspace:', error);
      return { workspace: null, error };
    }
  };

  const updateWorkspace = async (workspaceId: string, updates: Partial<Workspace>) => {
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .update(updates)
        .eq('id', workspaceId)
        .select()
        .single();

      if (error) throw error;

      await logActivity('updated details of workspace', 'workspace', data.name);
      await loadWorkspacesData();
      return { workspace: data, error: null };
    } catch (error: any) {
      console.error('Error updating workspace:', error);
      return { workspace: null, error };
    }
  };

  const createProject = async (projectData: Omit<Project, 'id' | 'workspace_id' | 'created_at'>) => {
    try {
      if (!activeWorkspace || !user) throw new Error('No active workspace or user');

      const currentPlan = activeWorkspace.plan || 'Free';
      const limits = PLAN_LIMITS[currentPlan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.Free;
      if (projects.length >= limits.projects) {
        throw new Error(`Project limit reached. Your workspace is on the ${currentPlan} plan, which only allows up to ${limits.projects} projects. Please upgrade your plan in settings to create more projects.`);
      }

      // Sanitize date fields: convert empty strings to null to avoid Supabase DATE type rejection (400 error)
      const sanitizedData = {
        ...projectData,
        start_date: projectData.start_date || null,
        due_date: projectData.due_date || null,
        workspace_id: activeWorkspace.id
      };

      const { data, error } = await supabase
        .from('projects')
        .insert(sanitizedData)
        .select()
        .single();

      if (error) throw error;

      // Assign creator as project member
      await supabase.from('project_members').insert({
        project_id: data.id,
        user_id: user.id
      });

      await logActivity('created', 'project', data.name);
      await refreshWorkspaceData();
      return { project: data, error: null };
    } catch (error: any) {
      console.error('Error creating project:', error);
      return { project: null, error };
    }
  };

  const updateProject = async (projectId: string, updates: Partial<Project>) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId)
        .select()
        .single();

      if (error) throw error;

      await logActivity('updated project details for', 'project', data.name);
      await refreshWorkspaceData();
      return { project: data, error: null };
    } catch (error: any) {
      console.error('Error updating project:', error);
      return { project: null, error };
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      const project = projects.find(p => p.id === projectId);
      const name = project ? project.name : 'Unknown';

      // Security check: only the workspace owner is allowed to delete projects
      const currentMemberRecord = members.find(m => m.user_id === user?.id);
      const isWorkspaceOwner = activeWorkspace?.owner_id === user?.id || currentMemberRecord?.role === 'owner';

      if (!isWorkspaceOwner) {
        throw new Error('Unauthorized: Only the workspace owner can delete projects.');
      }

      if (isUsingMock) {
        const dbData = localStorage.getItem('taskflow_mock_db');
        if (dbData) {
          const db = JSON.parse(dbData);

          // 1. Delete project
          db.projects = (db.projects || []).filter((p: any) => p.id !== projectId);

          // 2. Delete project members
          db.project_members = (db.project_members || []).filter((pm: any) => pm.project_id !== projectId);

          // 3. Find tasks of this project
          const projectTasks = (db.tasks || []).filter((t: any) => t.project_id === projectId);
          const projectTaskIds = projectTasks.map((t: any) => t.id);

          // 4. Delete tasks
          db.tasks = (db.tasks || []).filter((t: any) => t.project_id !== projectId);

          // 5. Delete checklists, comments, attachments
          db.checklists = (db.checklists || []).filter((c: any) => !projectTaskIds.includes(c.task_id));
          db.comments = (db.comments || []).filter((cm: any) => !projectTaskIds.includes(cm.task_id));
          db.attachments = (db.attachments || []).filter((att: any) => !projectTaskIds.includes(att.task_id));

          // 6. Delete project messages
          db.project_messages = (db.project_messages || []).filter((msg: any) => msg.project_id !== projectId);

          localStorage.setItem('taskflow_mock_db', JSON.stringify(db));
        }
      } else {
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', projectId);

        if (error) throw error;
      }

      await logActivity('deleted', 'project', name);
      await refreshWorkspaceData();
      return { error: null };
    } catch (error: any) {
      console.error('Error deleting project:', error);
      return { error };
    }
  };

  const deleteWorkspace = async (workspaceId: string) => {
    try {
      const workspace = workspaces.find(w => w.id === workspaceId);
      const name = workspace ? workspace.name : 'Unknown';

      // If we are using mock database, perform local CASCADE delete
      if (isUsingMock) {
        const dbData = localStorage.getItem('taskflow_mock_db');
        if (dbData) {
          const db = JSON.parse(dbData);
          
          // 1. Delete workspace
          db.workspaces = (db.workspaces || []).filter((w: any) => w.id !== workspaceId);
          
          // 2. Delete workspace members
          db.workspace_members = (db.workspace_members || []).filter((wm: any) => wm.workspace_id !== workspaceId);
          
          // 3. Find projects of this workspace
          const workspaceProjects = (db.projects || []).filter((p: any) => p.workspace_id === workspaceId);
          const workspaceProjectIds = workspaceProjects.map((p: any) => p.id);
          
          // 4. Delete projects and project members
          db.projects = (db.projects || []).filter((p: any) => p.workspace_id !== workspaceId);
          db.project_members = (db.project_members || []).filter((pm: any) => !workspaceProjectIds.includes(pm.project_id));
          
          // 5. Delete tasks of this workspace
          const workspaceTasks = (db.tasks || []).filter((t: any) => workspaceProjectIds.includes(t.project_id));
          const workspaceTaskIds = workspaceTasks.map((t: any) => t.id);
          db.tasks = (db.tasks || []).filter((t: any) => !workspaceProjectIds.includes(t.project_id));
          
          // 6. Delete checklists, comments, attachments
          db.checklists = (db.checklists || []).filter((c: any) => !workspaceTaskIds.includes(c.task_id));
          db.comments = (db.comments || []).filter((cm: any) => !workspaceTaskIds.includes(cm.task_id));
          db.attachments = (db.attachments || []).filter((att: any) => !workspaceTaskIds.includes(att.task_id));
          
          // 7. Find teams of this workspace
          const workspaceTeams = (db.teams || []).filter((t: any) => t.workspace_id === workspaceId);
          const workspaceTeamIds = workspaceTeams.map((t: any) => t.id);
          
          // 8. Delete teams and team members
          db.teams = (db.teams || []).filter((t: any) => t.workspace_id !== workspaceId);
          db.team_members = (db.team_members || []).filter((tm: any) => !workspaceTeamIds.includes(tm.team_id));
          
          // 9. Delete activities, notifications, messages
          db.activity_logs = (db.activity_logs || []).filter((act: any) => act.workspace_id !== workspaceId);
          db.project_messages = (db.project_messages || []).filter((msg: any) => !workspaceProjectIds.includes(msg.project_id));
          db.workspace_messages = (db.workspace_messages || []).filter((msg: any) => msg.workspace_id !== workspaceId);
          db.workspace_invitations = (db.workspace_invitations || []).filter((inv: any) => inv.workspace_id !== workspaceId);

          localStorage.setItem('taskflow_mock_db', JSON.stringify(db));
        }
      } else {
        // Live database CASCADE is handled by Supabase foreign keys
        const { error } = await supabase
          .from('workspaces')
          .delete()
          .eq('id', workspaceId);

        if (error) throw error;
      }

      await logActivity('deleted workspace', 'workspace', name);

      // Reload workspaces
      const { data: workspaceData, error: wsError } = await supabase
        .from('workspaces')
        .select('*');

      if (wsError) throw wsError;

      const wsList = workspaceData || [];
      setWorkspaces(wsList);

      if (wsList.length > 0) {
        // Fallback to the first available workspace that is not the deleted one
        const fallback = wsList.find((w: any) => w.id !== workspaceId) || wsList[0];
        setActiveWorkspace(fallback);
        localStorage.setItem('taskflow_active_workspace_id', fallback.id);
        await loadWorkspaceSubData(fallback.id);
      } else {
        setActiveWorkspace(null);
        setProjects([]);
        setMembers([]);
        setTeams([]);
        setTeamMembers([]);
        localStorage.removeItem('taskflow_active_workspace_id');
      }

      return { error: null };
    } catch (error: any) {
      console.error('Error deleting workspace:', error);
      return { error };
    }
  };

  const inviteMember = async (email: string, role: 'manager' | 'member') => {
    try {
      if (!activeWorkspace || !user) throw new Error('No active workspace');

      const currentPlan = activeWorkspace.plan || 'Free';
      const limits = PLAN_LIMITS[currentPlan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.Free;
      if (members.length >= limits.members) {
        throw new Error(`Member limit reached. Your workspace is on the ${currentPlan} plan, which only allows up to ${limits.members} collaborators. Please upgrade your plan in settings to invite more members.`);
      }
      const normalizedEmail = email.trim().toLowerCase();

      // Check if already invited or member of the workspace
      const existingInvite = invitations.find(i => i.email.toLowerCase() === normalizedEmail && i.status === 'Pending');
      if (existingInvite) {
        throw new Error('This email address has already been invited to this workspace.');
      }

      // Check if already active member
      const activeMember = members.find(m => m.profile?.email.toLowerCase() === normalizedEmail && m.status === 'active');
      if (activeMember) {
        throw new Error('User is already a member of this workspace');
      }

      // Check if user has an existing profile
      let profile = null;
      const { data: supabaseProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (supabaseProfile) {
        profile = supabaseProfile;
      } else if (isUsingMock) {
        const dbState = JSON.parse(localStorage.getItem('taskflow_mock_db') || '{}');
        profile = (dbState.profiles || []).find((p: any) => p.email.toLowerCase() === normalizedEmail);
      }

      const generatedToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Create invitation in workspace_invitations table
      const insertData: any = {
        workspace_id: activeWorkspace.id,
        email: normalizedEmail,
        role,
        status: 'Pending',
        invited_by: user.id,
        expires_at: expiresAt
      };
      // For mock mode, pass a generated token. For live mode, let the DB generate it via DEFAULT.
      if (isUsingMock) {
        insertData.token = generatedToken;
      }

      const { data: inviteData, error: insertError } = await supabase
        .from('workspace_invitations')
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error('This email address has already been invited to this workspace.');
        }
        throw insertError;
      }

      const tokenToUse = inviteData.token || generatedToken;
      // Send invitation email directly via Resend API
      const { error: emailError } = await sendInvitationEmail(
        normalizedEmail,
        activeWorkspace.name,
        user.full_name,
        role,
        tokenToUse
      );
      if (emailError) {
        console.error('Error sending invitation email:', emailError);
      }

      // If user is registered, trigger in-app notification
      if (profile) {
        await triggerNotification(
          profile.id,
          `Workspace Invitation: ${activeWorkspace.name}`,
          `${user.full_name} invited you to join their workspace as a ${role}.`
        );
        await logActivity('invited', 'member', normalizedEmail);
      } else {
        await logActivity('invited guest', 'member', normalizedEmail);
      }

      await refreshWorkspaceData();
      return { member: inviteData, error: null };
    } catch (error: any) {
      console.error('Error inviting member:', error);
      return { member: null, error };
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('workspace_invitations')
        .update({ status: 'Cancelled' })
        .eq('id', invitationId);

      if (error) throw error;
      await refreshWorkspaceData();
      return { error: null };
    } catch (error: any) {
      console.error('Error cancelling invitation:', error);
      return { error };
    }
  };

  const resendInvitation = async (invitationId: string) => {
    try {
      if (!activeWorkspace || !user) throw new Error('No active workspace');
      
      let invitation = null;
      if (isUsingMock) {
        const dbState = JSON.parse(localStorage.getItem('taskflow_mock_db') || '{}');
        invitation = (dbState.workspace_invitations || []).find((i: any) => i.id === invitationId);
      } else {
        const { data } = await supabase
          .from('workspace_invitations')
          .select('*')
          .eq('id', invitationId)
          .single();
        invitation = data;
      }
      
      if (!invitation) throw new Error('Invitation not found');

      const newToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: updatedInvite, error: updateError } = await supabase
        .from('workspace_invitations')
        .update({
          status: 'Pending',
          expires_at: expiresAt,
          token: newToken
        })
        .eq('id', invitationId)
        .select()
        .single();

      if (updateError) throw updateError;

      const tokenToUse = updatedInvite.token || newToken;
      // Resend invitation email directly via Resend API
      const { error: emailError } = await sendInvitationEmail(
        invitation.email,
        activeWorkspace.name,
        user.full_name,
        invitation.role,
        tokenToUse
      );
      if (emailError) {
        console.error('Error resending invitation email:', emailError);
      }

      await refreshWorkspaceData();
      return { error: null };
    } catch (error: any) {
      console.error('Error resending invitation:', error);
      return { error };
    }
  };

  const getInviteByToken = async (token: string) => {
    try {
      if (isUsingMock) {
        const dbState = JSON.parse(localStorage.getItem('taskflow_mock_db') || '{}');
        const invitation = (dbState.workspace_invitations || []).find((i: any) => i.token === token);
        if (!invitation) return { invitation: null, error: new Error('Invitation not found') };
        
        const workspace = (dbState.workspaces || []).find((w: any) => w.id === invitation.workspace_id);
        const inviter = (dbState.profiles || []).find((p: any) => p.id === invitation.invited_by);
        
        return {
          invitation: {
            id: invitation.id,
            workspace_id: invitation.workspace_id,
            workspace_name: workspace ? workspace.name : 'Unknown Workspace',
            inviter_name: inviter ? inviter.full_name : 'Workspace Owner',
            email: invitation.email,
            role: invitation.role,
            status: invitation.status,
            expires_at: invitation.expires_at
          },
          error: null
        };
      }

      const { data, error } = await supabase.rpc('get_invitation_by_token', { invite_token: token });
      if (error) throw error;
      return { invitation: data?.[0] || null, error: null };
    } catch (error: any) {
      console.error('Error getting invitation by token:', error);
      return { invitation: null, error };
    }
  };

  const acceptInviteByToken = async (token: string) => {
    try {
      if (isUsingMock) {
        if (!user) throw new Error('Not authenticated');
        const dbState = JSON.parse(localStorage.getItem('taskflow_mock_db') || '{}');
        const inviteIndex = (dbState.workspace_invitations || []).findIndex((i: any) => i.token === token);
        if (inviteIndex === -1) throw new Error('Invitation not found');
        
        const invite = dbState.workspace_invitations[inviteIndex];
        if (invite.status !== 'Pending') throw new Error(`Invitation has already been ${invite.status.toLowerCase()}`);
        if (new Date(invite.expires_at) < new Date()) {
          dbState.workspace_invitations[inviteIndex].status = 'Expired';
          localStorage.setItem('taskflow_mock_db', JSON.stringify(dbState));
          throw new Error('Invitation has expired');
        }
        
        if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
          throw new Error(`This invitation was sent to ${invite.email}, but you are logged in as ${user.email}`);
        }
        
        dbState.workspace_members = dbState.workspace_members || [];
        const existingMember = dbState.workspace_members.find((m: any) => m.workspace_id === invite.workspace_id && m.user_id === user.id);
        if (existingMember) {
          const mIdx = dbState.workspace_members.findIndex((m: any) => m.id === existingMember.id);
          dbState.workspace_members[mIdx].status = 'active';
          dbState.workspace_members[mIdx].role = invite.role;
        } else {
          dbState.workspace_members.push({
            id: 'wm_' + Math.random().toString(36).substr(2, 9),
            workspace_id: invite.workspace_id,
            user_id: user.id,
            role: invite.role,
            status: 'active',
            created_at: new Date().toISOString()
          });
        }
        
        dbState.workspace_invitations[inviteIndex].status = 'Accepted';
        dbState.workspace_invitations[inviteIndex].accepted_at = new Date().toISOString();
        
        dbState.activity_logs = dbState.activity_logs || [];
        dbState.activity_logs.push({
          id: 'act_' + Math.random().toString(36).substr(2, 9),
          workspace_id: invite.workspace_id,
          user_id: user.id,
          action: 'joined',
          target_type: 'user',
          target_name: user.full_name,
          created_at: new Date().toISOString()
        });
        
        localStorage.setItem('taskflow_mock_db', JSON.stringify(dbState));
        await refreshWorkspaceData();
        await switchWorkspace(invite.workspace_id);
        return { workspace_id: invite.workspace_id, error: null };
      }

      const { data, error } = await supabase.rpc('accept_workspace_invitation', { invite_token: token });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await refreshWorkspaceData();
      if (data?.workspace_id) {
        await switchWorkspace(data.workspace_id);
      }
      return { workspace_id: data?.workspace_id, error: null };
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      return { error };
    }
  };

  const declineInviteByToken = async (token: string) => {
    try {
      if (isUsingMock) {
        if (!user) throw new Error('Not authenticated');
        const dbState = JSON.parse(localStorage.getItem('taskflow_mock_db') || '{}');
        const inviteIndex = (dbState.workspace_invitations || []).findIndex((i: any) => i.token === token);
        if (inviteIndex === -1) throw new Error('Invitation not found');
        
        const invite = dbState.workspace_invitations[inviteIndex];
        if (invite.status !== 'Pending') throw new Error(`Invitation has already been ${invite.status.toLowerCase()}`);
        if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
          throw new Error(`This invitation was sent to ${invite.email}, but you are logged in as ${user.email}`);
        }
        
        dbState.workspace_invitations[inviteIndex].status = 'Declined';
        localStorage.setItem('taskflow_mock_db', JSON.stringify(dbState));
        return { error: null };
      }

      const { data, error } = await supabase.rpc('decline_workspace_invitation', { invite_token: token });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return { error: null };
    } catch (error: any) {
      console.error('Error declining invitation:', error);
      return { error };
    }
  };


  const removeMember = async (memberId: string) => {
    try {
      const guestInvite = members.find(m => m.id === memberId && (m as any).is_guest_invite);
      if (guestInvite) {
        const { error } = await supabase
          .from('workspace_invitations')
          .delete()
          .eq('id', memberId);

        if (error) throw error;
        await logActivity('revoked invite', 'user', guestInvite.profile?.email || 'Unknown');
      } else {
        const member = members.find(m => m.id === memberId);
        const name = member?.profile?.full_name || 'Unknown';

        const { error } = await supabase
          .from('workspace_members')
          .delete()
          .eq('id', memberId);

        if (error) throw error;
        await logActivity('removed member', 'user', name);
      }

      await refreshWorkspaceData();
      return { error: null };
    } catch (error: any) {
      console.error('Error removing member:', error);
      return { error };
    }
  };

  const changeMemberRole = async (memberId: string, role: 'manager' | 'member') => {
    try {
      const guestInvite = members.find(m => m.id === memberId && (m as any).is_guest_invite);
      if (guestInvite) {
        const { error } = await supabase
          .from('workspace_invitations')
          .update({ role })
          .eq('id', memberId);

        if (error) throw error;
        await logActivity('updated role to ' + role + ' for guest', 'member', guestInvite.profile?.email || 'Unknown');
      } else {
        const { error } = await supabase
          .from('workspace_members')
          .update({ role })
          .eq('id', memberId);

        if (error) throw error;

        const member = members.find(m => m.id === memberId);
        if (member) {
          await logActivity('updated role to ' + role + ' for', 'member', member.profile?.full_name || 'Unknown');
        }
      }

      await refreshWorkspaceData();
      return { error: null };
    } catch (error: any) {
      console.error('Error changing role:', error);
      return { error };
    }
  };

  const acceptInvitation = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('workspace_members')
        .update({ status: 'active' })
        .eq('id', memberId);

      if (error) throw error;
      
      const member = members.find(m => m.id === memberId);
      if (member) {
        await logActivity('accepted workspace invitation', 'member', member.profile?.full_name || 'Unknown');
      }
      await refreshWorkspaceData();
      return { error: null };
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      return { error };
    }
  };

  const declineInvitation = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      await refreshWorkspaceData();
      return { error: null };
    } catch (error: any) {
      console.error('Error declining invitation:', error);
      return { error };
    }
  };

  const createTeam = async (name: string, description: string, color: string, icon: string) => {
    try {
      if (!activeWorkspace) throw new Error('No active workspace');
      
      const { data, error } = await supabase
        .from('teams')
        .insert({
          workspace_id: activeWorkspace.id,
          name,
          description,
          color,
          icon
        })
        .select()
        .single();
      
      if (error) throw error;
      
      await logActivity('created team', 'team', name);
      await refreshWorkspaceData();
      return { team: data, error: null };
    } catch (error: any) {
      console.error('Error creating team:', error);
      return { team: null, error };
    }
  };

  const updateTeam = async (teamId: string, updates: Partial<Team>) => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .update(updates)
        .eq('id', teamId)
        .select()
        .single();
      
      if (error) throw error;
      
      await logActivity('updated team details for', 'team', data.name);
      await refreshWorkspaceData();
      return { team: data, error: null };
    } catch (error: any) {
      console.error('Error updating team:', error);
      return { team: null, error };
    }
  };

  const deleteTeam = async (teamId: string) => {
    try {
      const team = teams.find(t => t.id === teamId);
      const name = team ? team.name : 'Unknown';
      
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);
      
      if (error) throw error;
      
      await logActivity('deleted team', 'team', name);
      await refreshWorkspaceData();
      return { error: null };
    } catch (error: any) {
      console.error('Error deleting team:', error);
      return { error };
    }
  };

  const addTeamMember = async (teamId: string, email: string, role: 'lead' | 'member') => {
    try {
      // Find user profile by email
      let profile = null;
      const { data: supabaseProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email.toLowerCase())
        .maybeSingle();
      
      if (supabaseProfile) {
        profile = supabaseProfile;
      } else if (isUsingMock) {
        const dbState = JSON.parse(localStorage.getItem('taskflow_mock_db') || '{}');
        profile = (dbState.profiles || []).find((p: any) => p.email.toLowerCase() === email.toLowerCase());
      }
      
      if (!profile) {
        throw new Error('This email is not registered. Please ask them to sign up to TaskFlow first.');
      }
      
      // Check if already in team
      const existing = teamMembers.find(tm => tm.team_id === teamId && tm.user_id === profile.id);
      if (existing) {
        throw new Error('This user is already a member of the team.');
      }
      
      const { data, error } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: profile.id,
          role
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const team = teams.find(t => t.id === teamId);
      await triggerNotification(profile.id, `Added to Team: ${team?.name || 'Team'}`, `You have been added as a ${role} to ${team?.name || 'the team'}.`);
      await logActivity('added ' + profile.full_name + ' to', 'team', team?.name || 'team');
      await refreshWorkspaceData();
      return { member: { ...data, profile }, error: null };
    } catch (error: any) {
      console.error('Error adding team member:', error);
      return { member: null, error };
    }
  };

  const removeTeamMember = async (teamMemberId: string) => {
    try {
      const tm = teamMembers.find(m => m.id === teamMemberId);
      const name = tm?.profile?.full_name || 'Unknown';
      const team = teams.find(t => t.id === tm?.team_id);
      
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', teamMemberId);
      
      if (error) throw error;
      
      if (tm) {
        await triggerNotification(tm.user_id, `Removed from Team: ${team?.name || 'Team'}`, `You have been removed from ${team?.name || 'the team'}.`);
      }
      await logActivity('removed ' + name + ' from', 'team', team?.name || 'team');
      await refreshWorkspaceData();
      return { error: null };
    } catch (error: any) {
      console.error('Error removing team member:', error);
      return { error };
    }
  };

  const changeTeamMemberRole = async (teamMemberId: string, role: 'lead' | 'member') => {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ role })
        .eq('id', teamMemberId);
      
      if (error) throw error;
      
      const tm = teamMembers.find(m => m.id === teamMemberId);
      const team = teams.find(t => t.id === tm?.team_id);
      if (tm) {
        await logActivity('changed role to ' + role + ' for ' + tm.profile?.full_name + ' in', 'team', team?.name || 'team');
      }
      await refreshWorkspaceData();
      return { error: null };
    } catch (error: any) {
      console.error('Error changing team member role:', error);
      return { error };
    }
  };

  // -------------------------------------------------------------
  // Tasks (Kanban) CRUD methods
  // -------------------------------------------------------------
  const getProjectTasks = async (projectId: string) => {
    try {
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;

      const taskIds = (tasks || []).map(t => t.id);
      
      let allChecklists: any[] = [];
      let allComments: any[] = [];
      let allAttachments: any[] = [];

      if (taskIds.length > 0) {
        const [checklistsRes, commentsRes, attachmentsRes] = await Promise.all([
          supabase.from('checklists').select('*').in('task_id', taskIds),
          supabase.from('comments').select('*').in('task_id', taskIds),
          supabase.from('attachments').select('*').in('task_id', taskIds)
        ]);

        allChecklists = checklistsRes.data || [];
        allComments = commentsRes.data || [];
        allAttachments = attachmentsRes.data || [];
      }

      const enrichedTasks = (tasks || []).map((task: any) => {
        let checklists = allChecklists.filter((c: any) => c.task_id === task.id);
        let comments = allComments.filter((c: any) => c.task_id === task.id);
        let attachments = allAttachments.filter((c: any) => c.task_id === task.id);

        if (taskIds.length === 0 || (checklists.length === 0 && comments.length === 0 && attachments.length === 0)) {
          // Fallback to local storage (mock mode)
          const dbState = JSON.parse(localStorage.getItem('taskflow_mock_db') || '{}');
          checklists = (dbState.checklists || []).filter((c: any) => c.task_id === task.id);
          comments = (dbState.comments || []).filter((c: any) => c.task_id === task.id);
          attachments = (dbState.attachments || []).filter((c: any) => c.task_id === task.id);
        }
        
        return {
          ...task,
          checklistCount: {
            total: checklists.length,
            completed: checklists.filter((c: any) => c.is_completed).length
          },
          commentCount: comments.length,
          attachmentCount: attachments.length
        };
      });

      return { tasks: enrichedTasks, error: null };
    } catch (error: any) {
      console.error('Error loading tasks:', error);
      return { tasks: [], error };
    }
  };

  const createTask = async (projectId: string, taskData: Omit<Task, 'id' | 'project_id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...taskData,
          project_id: projectId
        })
        .select()
        .single();

      if (error) throw error;

      if (taskData.assignee_id && user) {
        const proj = projects.find(p => p.id === projectId);
        await triggerNotification(taskData.assignee_id, `New task assigned in ${proj?.name || 'Project'}`, `${user.full_name} assigned you: "${data.title}"`);
      }

      await logActivity('created task', 'task', data.title);
      return { task: data, error: null };
    } catch (error: any) {
      console.error('Error creating task:', error);
      return { task: null, error };
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;

      // Log specific status transitions
      if (updates.status) {
        await logActivity(`moved task to "${updates.status}"`, 'task', data.title);
      } else {
        await logActivity('updated details of task', 'task', data.title);
      }

      return { task: data, error: null };
    } catch (error: any) {
      console.error('Error updating task:', error);
      return { task: null, error };
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const dbState = JSON.parse(localStorage.getItem('taskflow_mock_db') || '{}');
      const task = (dbState.tasks || []).find((t: any) => t.id === taskId);
      const name = task ? task.title : 'Unknown';

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      await logActivity('deleted task', 'task', name);
      return { error: null };
    } catch (error: any) {
      console.error('Error deleting task:', error);
      return { error };
    }
  };

  // -------------------------------------------------------------
  // Checklist / Comments / Attachments details query
  // -------------------------------------------------------------
  const getTaskDetails = async (taskId: string) => {
    try {
      // 1. Fetch Checklist
      const { data: checklist } = await supabase
        .from('checklists')
        .select('*')
        .eq('task_id', taskId);

      // 2. Fetch Comments
      const { data: commentData } = await supabase
        .from('comments')
        .select('*, profiles(*)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      // Join comment profiles
      const comments = (commentData || []).map((c: any) => {
        let profile = c.profiles;
        if (!profile) {
          const dbState = JSON.parse(localStorage.getItem('taskflow_mock_db') || '{}');
          profile = (dbState.profiles || []).find((p: any) => p.id === c.user_id);
        }
        return { ...c, profile };
      });

      // 3. Fetch Attachments
      const { data: attachments } = await supabase
        .from('attachments')
        .select('*')
        .eq('task_id', taskId);

      return { checklist: checklist || [], comments: comments || [], attachments: attachments || [], error: null };
    } catch (error: any) {
      console.error('Error loading task details:', error);
      return { checklist: [], comments: [], attachments: [], error };
    }
  };

  const addChecklistItem = async (taskId: string, title: string) => {
    try {
      const { data, error } = await supabase
        .from('checklists')
        .insert({ task_id: taskId, title, is_completed: false })
        .select()
        .single();
      
      if (error) throw error;

      // Log activity
      let task = null;
      const { data: supTask } = await supabase.from('tasks').select('*').eq('id', taskId).maybeSingle();
      if (supTask) {
        task = supTask;
      } else {
        const dbState = JSON.parse(localStorage.getItem('taskflow_mock_db') || '{}');
        task = (dbState.tasks || []).find((t: any) => t.id === taskId);
      }
      await logActivity(`added subtask "${title}" to`, 'task', task ? task.title : 'task');

      return { item: data, error: null };
    } catch (error: any) {
      return { item: null, error };
    }
  };

  const toggleChecklistItem = async (itemId: string, isCompleted: boolean) => {
    try {
      const { data, error } = await supabase
        .from('checklists')
        .update({ is_completed: isCompleted })
        .eq('id', itemId)
        .select()
        .single();
      
      if (error) throw error;

      let item = data;
      if (!item) {
        const dbState = JSON.parse(localStorage.getItem('taskflow_mock_db') || '{}');
        item = (dbState.checklists || []).find((c: any) => c.id === itemId);
      }
      if (item) {
        let task = null;
        const { data: supTask } = await supabase.from('tasks').select('*').eq('id', item.task_id).maybeSingle();
        if (supTask) {
          task = supTask;
        } else {
          const dbState = JSON.parse(localStorage.getItem('taskflow_mock_db') || '{}');
          task = (dbState.tasks || []).find((t: any) => t.id === item.task_id);
        }
        const actionText = isCompleted ? 'completed subtask' : 'uncompleted subtask';
        await logActivity(`${actionText} "${item.title}" in`, 'task', task ? task.title : 'task');
      }
      
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const deleteChecklistItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('checklists')
        .delete()
        .eq('id', itemId);
      
      return { error };
    } catch (error: any) {
      return { error };
    }
  };

  const addComment = async (taskId: string, content: string) => {
    try {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('comments')
        .insert({ task_id: taskId, user_id: user.id, content })
        .select()
        .single();
      
      if (error) throw error;

      // Retrieve commenter profile details
      let profile = null;
      const { data: supabaseProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (supabaseProfile) {
        profile = supabaseProfile;
      } else {
        const dbState = JSON.parse(localStorage.getItem('taskflow_mock_db') || '{}');
        profile = (dbState.profiles || []).find((p: any) => p.id === user.id);
      }

      // Trigger notification if assigned
      let task = null;
      const { data: supabaseTask } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (supabaseTask) {
        task = supabaseTask;
      } else {
        const dbState = JSON.parse(localStorage.getItem('taskflow_mock_db') || '{}');
        task = (dbState.tasks || []).find((t: any) => t.id === taskId);
      }

      if (task && task.assignee_id) {
        await triggerNotification(task.assignee_id, `New Comment on "${task.title}"`, `${user.full_name}: "${content.substring(0, 40)}${content.length > 40 ? '...' : ''}"`);
      }

      // Mention notifications
      members.forEach((member) => {
        const name = member.profile?.full_name;
        if (name && content.toLowerCase().includes(`@${name.toLowerCase()}`)) {
          triggerNotification(
            member.user_id,
            `Mentioned you in comment on "${task?.title || 'task'}"`,
            `${user.full_name}: "${content.substring(0, 40)}${content.length > 40 ? '...' : ''}"`
          );
        }
      });

      return { comment: { ...data, profile }, error: null };
    } catch (error: any) {
      return { comment: null, error };
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);
      
      return { error };
    } catch (error: any) {
      return { error };
    }
  };

  const addAttachment = async (taskId: string, name: string, url: string, fileType: string, size: number) => {
    try {
      const { data, error } = await supabase
        .from('attachments')
        .insert({ task_id: taskId, name, url, file_type: fileType, size })
        .select()
        .single();
      
      if (error) throw error;
      
      await logActivity('uploaded attachment ' + name + ' for', 'task', name);
      return { attachment: data, error: null };
    } catch (error: any) {
      return { attachment: null, error };
    }
  };

  const deleteAttachment = async (attachmentId: string) => {
    try {
      const { error } = await supabase
        .from('attachments')
        .delete()
        .eq('id', attachmentId);
      
      return { error };
    } catch (error: any) {
      return { error };
    }
  };

  const getProjectMessages = async (projectId: string) => {
    try {
      const { data: messagesData, error } = await supabase
        .from('project_messages')
        .select('*, profiles(*)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const messages = (messagesData || []).map((m: any) => {
        let profile = m.profiles;
        if (!profile) {
          const dbState = JSON.parse(localStorage.getItem('taskflow_mock_db') || '{}');
          profile = (dbState.profiles || []).find((p: any) => p.id === m.user_id);
        }
        return { ...m, profile };
      });

      return { messages, error: null };
    } catch (error: any) {
      console.error('Error loading project messages:', error);
      return { messages: [], error };
    }
  };

  const sendProjectMessage = async (projectId: string, content: string) => {
    try {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('project_messages')
        .insert({ project_id: projectId, user_id: user.id, content })
        .select()
        .single();

      if (error) throw error;

      let profile = null;
      const { data: supabaseProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (supabaseProfile) {
        profile = supabaseProfile;
      } else {
        const dbState = JSON.parse(localStorage.getItem('taskflow_mock_db') || '{}');
        profile = (dbState.profiles || []).find((p: any) => p.id === user.id);
      }

      // Mention notifications in chat
      members.forEach((member) => {
        const name = member.profile?.full_name;
        if (name && content.toLowerCase().includes(`@${name.toLowerCase()}`)) {
          const proj = projects.find(p => p.id === projectId);
          triggerNotification(
            member.user_id,
            `Mentioned in project chat: ${proj?.name || 'Project'}`,
            `${user.full_name}: "${content.substring(0, 40)}${content.length > 40 ? '...' : ''}"`
          );
        }
      });

      return { message: { ...data, profile }, error: null };
    } catch (error: any) {
      console.error('Error sending project message:', error);
      return { message: null, error };
    }
  };

  const getWorkspaceMessages = async (workspaceId: string) => {
    try {
      const { data: messagesData, error } = await supabase
        .from('workspace_messages')
        .select(`
          *,
          profiles:user_id (*)
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const messages = (messagesData || []).map((m: any) => {
        let profile = m.profiles;
        if (!profile) {
          const dbState = JSON.parse(localStorage.getItem('taskflow_mock_db') || '{}');
          profile = (dbState.profiles || []).find((p: any) => p.id === m.user_id);
        }
        return { ...m, profile };
      });

      return { messages, error: null };
    } catch (error: any) {
      console.error('Error loading workspace messages:', error);
      return { messages: [], error };
    }
  };

  const sendWorkspaceMessage = async (workspaceId: string, content: string) => {
    try {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('workspace_messages')
        .insert({ workspace_id: workspaceId, user_id: user.id, content })
        .select()
        .single();

      if (error) throw error;

      let profile = null;
      const { data: supabaseProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (supabaseProfile) {
        profile = supabaseProfile;
      } else {
        const dbState = JSON.parse(localStorage.getItem('taskflow_mock_db') || '{}');
        profile = (dbState.profiles || []).find((p: any) => p.id === user.id);
      }

      // Dispatch event in mock mode to update UI immediately on other pages/instances
      if (isUsingMock) {
        window.dispatchEvent(new CustomEvent('workspace-chat-message', { detail: { workspaceId } }));
      }

      // Mention notifications in chat
      members.forEach((member) => {
        const name = member.profile?.full_name;
        if (name && content.toLowerCase().includes(`@${name.toLowerCase()}`) && member.user_id !== user.id) {
          triggerNotification(
            member.user_id,
            `Mentioned in workspace chat: ${activeWorkspace?.name || 'Workspace'}`,
            `${user.full_name}: "${content.substring(0, 40)}${content.length > 40 ? '...' : ''}"`
          );
        }
      });

      return { message: { ...data, profile }, error: null };
    } catch (error: any) {
      console.error('Error sending workspace message:', error);
      return { message: null, error };
    }
  };

  // -------------------------------------------------------------
  // Helpers: Notifications & Activity Logging
  // -------------------------------------------------------------
  const markNotificationRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      
      if (error) throw error;
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      if (!user) return;
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id);
      
      if (error) throw error;
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const logActivity = async (action: string, targetType: string, targetName: string) => {
    try {
      if (!activeWorkspace || !user) return;
      
      const { data, error } = await supabase
        .from('activity_logs')
        .insert({
          workspace_id: activeWorkspace.id,
          user_id: user.id,
          action,
          target_type: targetType,
          target_name: targetName
        })
        .select()
        .single();

      if (error) throw error;

      // Add profile info and append locally
      const enrichedLog = { ...data, profile: user };
      setActivities(prev => [enrichedLog, ...prev]);
    } catch (err) {
      console.error('Failed to log activity:', err);
    }
  };

  const triggerNotification = async (userId: string, title: string, description: string) => {
    try {
      // Build the notification object
      const notifPayload = {
        user_id: userId,
        title,
        description,
        is_read: false
      };

      let savedNotif: any = null;

      // Try inserting into Supabase/mock DB
      // We only append `.select().maybeSingle()` if the notification is for the current user.
      // If we insert a notification for someone else, the SELECT policy blocks the read and returns 403.
      const query = supabase.from('notifications').insert(notifPayload);
      const insertResult = (user && userId === user.id)
        ? await query.select().maybeSingle()
        : await query;

      if (insertResult?.error) {
        console.error('Notification insert error:', insertResult.error);
      }

      savedNotif = insertResult?.data || {
        ...notifPayload,
        id: 'notif_' + Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString()
      };

      // Always update local state for the current user
      if (user && userId === user.id && savedNotif) {
        setNotifications(prev => {
          // Prevent duplicates
          if (prev.some(n => n.id === savedNotif.id)) return prev;
          return [savedNotif, ...prev];
        });
      }

      // Always show in-app toast popup for current user
      if (user && userId === user.id) {
        setActiveToast({ id: savedNotif.id, title, desc: description });
        setTimeout(() => {
          setActiveToast(current => current?.id === savedNotif.id ? null : current);
        }, 5000);
      }

      // Show browser desktop notification
      if (user && userId === user.id && 'Notification' in window && window.Notification.permission === 'granted') {
        new window.Notification(title, { body: description });
      }
    } catch (err) {
      console.error('Failed to send notification:', err);
    }
  };

  // seedDatabase is kept for API compatibility but no longer inserts any mock data.
  const seedDatabase = async () => {
    return { success: true, error: null };
  };

  return (
    <WorkspaceContext.Provider value={{
      workspaces,
      activeWorkspace,
      projects,
      members,
      invitations,
      teams,
      teamMembers,
      notifications,
      activities,
      loading,
      createWorkspace,
      updateWorkspace,
      switchWorkspace,
      createProject,
      updateProject,
      deleteProject,
      inviteMember,
      removeMember,
      changeMemberRole,
      acceptInvitation,
      declineInvitation,
      resendInvitation,
      cancelInvitation,
      acceptInviteByToken,
      declineInviteByToken,
      getInviteByToken,
      createTeam,
      updateTeam,
      deleteTeam,
      addTeamMember,
      removeTeamMember,
      changeTeamMemberRole,
      getProjectTasks,
      createTask,
      updateTask,
      deleteTask,
      getTaskDetails,
      addChecklistItem,
      toggleChecklistItem,
      deleteChecklistItem,
      addComment,
      deleteComment,
      addAttachment,
      deleteAttachment,
      markNotificationRead,
      markAllNotificationsRead,
      logActivity,
      getProjectMessages,
      sendProjectMessage,
      getWorkspaceMessages,
      sendWorkspaceMessage,
      deleteWorkspace,
      triggerNotification,
      refreshWorkspaceData,
      seedDatabase
    }}>
      {children}
      
      {/* In-App Notification Toast Pop-up */}
      {activeToast && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 border border-brand-500/30 shadow-2xl shadow-brand-500/10 rounded-xl p-4 w-80 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-brand-500"></div>
            <button 
              onClick={() => setActiveToast(null)}
              className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              ×
            </button>
            <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-1 pr-4">{activeToast.title}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{activeToast.desc}</p>
          </div>
        </div>
      )}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
