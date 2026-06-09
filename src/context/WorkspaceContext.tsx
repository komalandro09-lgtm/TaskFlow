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
}

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

export interface Project {
  id: string;
  workspace_id: string;
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
  notifications: Notification[];
  activities: ActivityLog[];
  loading: boolean;
  createWorkspace: (name: string, description: string, logoUrl: string) => Promise<{ workspace: Workspace | null; error: any }>;
  updateWorkspace: (workspaceId: string, updates: Partial<Workspace>) => Promise<{ workspace: Workspace | null; error: any }>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  createProject: (projectData: Omit<Project, 'id' | 'workspace_id' | 'created_at'>) => Promise<{ project: Project | null; error: any }>;
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<{ project: Project | null; error: any }>;
  deleteProject: (projectId: string) => Promise<{ error: any }>;
  inviteMember: (email: string, role: 'manager' | 'member') => Promise<{ member: WorkspaceMember | null; error: any }>;
  removeMember: (memberId: string) => Promise<{ error: any }>;
  changeMemberRole: (memberId: string, role: 'manager' | 'member') => Promise<{ error: any }>;
  acceptInvitation: (memberId: string) => Promise<{ error: any }>;
  declineInvitation: (memberId: string) => Promise<{ error: any }>;
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
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  logActivity: (action: string, targetType: string, targetName: string) => Promise<void>;
  triggerNotification: (userId: string, title: string, description: string) => Promise<void>;
  refreshWorkspaceData: () => Promise<void>;
  seedDatabase: () => Promise<{ success: boolean; error: any }>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
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
    const notificationChannel = supabase
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

    return () => {
      supabase.removeChannel(notificationChannel);
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

      const wsList = workspaceData || [];
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
      setMembers(memberList);

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

      const { data, error } = await supabase
        .from('projects')
        .insert({
          ...projectData,
          workspace_id: activeWorkspace.id
        })
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

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      await logActivity('deleted', 'project', name);
      await refreshWorkspaceData();
      return { error: null };
    } catch (error: any) {
      console.error('Error deleting project:', error);
      return { error };
    }
  };

  const inviteMember = async (email: string, role: 'manager' | 'member') => {
    try {
      if (!activeWorkspace || !user) throw new Error('No active workspace');

      // Check if user is registered in the profiles table (query Supabase first, fallback to mock)
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

      let userId = '';
      let targetProfile = null;

      if (profile) {
        userId = profile.id;
        targetProfile = profile;
      } else {
        // In live Supabase mode, the database expects a valid UUID that exists in profiles table
        if (!isUsingMock) {
          throw new Error('This email address is not registered on TaskFlow. Please ask them to sign up first!');
        }

        // Simulating auto-creating a profile for the guest invitation in mock mode
        userId = 'user_' + Math.random().toString(36).substr(2, 9);
        targetProfile = {
          id: userId,
          email,
          full_name: email.split('@')[0],
          avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${email.split('@')[0]}`
        };
        const dbState = JSON.parse(localStorage.getItem('taskflow_mock_db') || '{}');
        dbState.profiles = dbState.profiles || [];
        dbState.profiles.push(targetProfile);
        localStorage.setItem('taskflow_mock_db', JSON.stringify(dbState));
      }

      // Check if already member
      const existing = members.find(m => m.user_id === userId);
      if (existing) {
        throw new Error('User is already a member of this workspace');
      }

      const { data, error } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: activeWorkspace.id,
          user_id: userId,
          role,
          status: 'pending' // starts as pending invitation
        })
        .select()
        .single();

      if (error) throw error;

      await triggerNotification(userId, `Workspace Invitation: ${activeWorkspace.name}`, `${user.full_name} invited you to join their workspace.`);
      await logActivity('invited', 'member', email);
      await refreshWorkspaceData();

      return { member: { ...data, profile: targetProfile }, error: null };
    } catch (error: any) {
      console.error('Error inviting member:', error);
      return { member: null, error };
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const member = members.find(m => m.id === memberId);
      const name = member?.profile?.full_name || 'Unknown';

      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      await logActivity('removed member', 'user', name);
      await refreshWorkspaceData();
      return { error: null };
    } catch (error: any) {
      console.error('Error removing member:', error);
      return { error };
    }
  };

  const changeMemberRole = async (memberId: string, role: 'manager' | 'member') => {
    try {
      const { error } = await supabase
        .from('workspace_members')
        .update({ role })
        .eq('id', memberId);

      if (error) throw error;

      const member = members.find(m => m.id === memberId);
      if (member) {
        await logActivity('updated role to ' + role + ' for', 'member', member.profile?.full_name || 'Unknown');
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

  const seedDatabase = async () => {
    try {
      if (!user) throw new Error('Not authenticated');
      setLoading(true);

      // 1. Double check user profile exists in profiles
      const { data: profileCheck } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (!profileCheck) {
        await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          full_name: user.full_name || user.email.split('@')[0],
          avatar_url: user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`
        });
      }

      // 2. Insert Workspace
      const { data: wsData, error: wsErr } = await supabase
        .from('workspaces')
        .insert({
          name: 'Acme Agency Co.',
          description: 'Workspace for all creative design projects, client work, and marketing campaigns.',
          logo_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=60',
          owner_id: user.id
        })
        .select()
        .single();
      
      if (wsErr) throw wsErr;
      const workspaceId = wsData.id;

      // 3. Add Workspace Member (Owner)
      const { error: memberErr } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspaceId,
          user_id: user.id,
          role: 'owner',
          status: 'active'
        });
      
      if (memberErr) throw memberErr;

      // 4. Insert Projects
      const projectsToInsert = [
        {
          workspace_id: workspaceId,
          name: 'TaskFlow Website Redesign',
          description: 'Revamping the core promotional site and client onboarding portals to drive SaaS signups.',
          start_date: '2026-06-01',
          due_date: '2026-07-15',
          priority: 'high',
          status: 'active'
        },
        {
          workspace_id: workspaceId,
          name: 'Mobile App Beta Launch',
          description: 'Publishing iOS and Android builds to TestFlight and Google Beta, getting feedback from first 100 beta testers.',
          start_date: '2026-06-10',
          due_date: '2026-08-30',
          priority: 'critical',
          status: 'active'
        },
        {
          workspace_id: workspaceId,
          name: 'Annual Security Review',
          description: 'Conducting standard penetration tests, upgrading RLS roles, and renewing SOC 2 compliance reports.',
          start_date: '2026-05-15',
          due_date: '2026-06-05',
          priority: 'medium',
          status: 'completed'
        }
      ];

      const insertedProjects: any[] = [];
      for (const p of projectsToInsert) {
        const { data: pData, error: pErr } = await supabase
          .from('projects')
          .insert(p)
          .select()
          .single();
        if (pErr) throw pErr;
        insertedProjects.push(pData);

        // Add user as project member
        await supabase.from('project_members').insert({
          project_id: pData.id,
          user_id: user.id
        });
      }

      // Find the first project to attach tasks
      const p1 = insertedProjects[0]; // TaskFlow Website Redesign
      const p2 = insertedProjects[1]; // Mobile App Beta Launch

      if (p1) {
        // 5. Insert Tasks for p1
        const tasksToInsert = [
          {
            project_id: p1.id,
            title: 'Design high-fidelity homepage mockups',
            description: 'Design dark mode home layouts focusing on pricing card details and the interactive product carousel widgets.',
            assignee_id: user.id,
            priority: 'high',
            status: 'in_progress',
            due_date: new Date(Date.now() + 3600000 * 240).toISOString(),
            labels: ['Design', 'UI/UX']
          },
          {
            project_id: p1.id,
            title: 'Setup routing framework in React App',
            description: 'Define routes using React Router DOM, create sidebar bindings, and protect dashboards with auth checks.',
            assignee_id: user.id,
            priority: 'critical',
            status: 'todo',
            due_date: new Date(Date.now() + 3600000 * 120).toISOString(),
            labels: ['Frontend', 'Vite']
          },
          {
            project_id: p1.id,
            title: 'Configure local storage hybrid database clients',
            description: 'Provide query fallback interceptors for developer testing when offline or missing Supabase keys.',
            assignee_id: user.id,
            priority: 'medium',
            status: 'review',
            due_date: new Date().toISOString(),
            labels: ['Database', 'Config']
          },
          {
            project_id: p1.id,
            title: 'Review landing copy writing',
            description: 'Confirm tagline headings, objectives, user value propositions, and success metrics wording.',
            assignee_id: user.id,
            priority: 'low',
            status: 'completed',
            due_date: new Date(Date.now() - 3600000 * 120).toISOString(),
            labels: ['Copy']
          }
        ];

        const insertedTasks: any[] = [];
        for (const t of tasksToInsert) {
          const { data: tData, error: tErr } = await supabase
            .from('tasks')
            .insert(t)
            .select()
            .single();
          if (tErr) throw tErr;
          insertedTasks.push(tData);
        }

        // Attach checklist items to t1 (homepage mockups) and t3 (local storage client)
        const t1 = insertedTasks[0];
        const t3 = insertedTasks[2];

        if (t1) {
          await supabase.from('checklists').insert([
            { task_id: t1.id, title: 'Complete dashboard sidebar mockup', is_completed: true },
            { task_id: t1.id, title: 'Verify responsive sizes (mobile & tablet)', is_completed: false },
            { task_id: t1.id, title: 'Design user profile settings page popup', is_completed: false }
          ]);

          // Add comments
          await supabase.from('comments').insert([
            { task_id: t1.id, user_id: user.id, content: "The typography look looks excellent, David. Should we introduce Outfit font for a more SaaS feeling?" },
            { task_id: t1.id, user_id: user.id, content: "Let's stick to Inter for content paragraphs, but Outfit or Roboto for larger H1/H2 elements sounds fantastic!" }
          ]);

          // Add attachments
          await supabase.from('attachments').insert({
            task_id: t1.id,
            name: 'homepage_final.jpg',
            url: 'https://images.unsplash.com/photo-1541462608141-2f5297e10a27?w=300&auto=format&fit=crop&q=80',
            file_type: 'image/jpeg',
            size: 124500
          });
        }

        if (t3) {
          await supabase.from('checklists').insert([
            { task_id: t3.id, title: 'Test LocalStorage loading speed', is_completed: true },
            { task_id: t3.id, title: 'Write unit mock tests', is_completed: true }
          ]);

          await supabase.from('attachments').insert({
            task_id: t3.id,
            name: 'database_mock_specs.pdf',
            url: '#',
            file_type: 'application/pdf',
            size: 345000
          });
        }
      }

      if (p2) {
        // Insert tasks for p2
        await supabase.from('tasks').insert({
          project_id: p2.id,
          title: 'Prepare App Store deployment configs',
          description: 'Compile developer certificates, write description summaries, upload screenshots of active workspaces.',
          assignee_id: user.id,
          priority: 'high',
          status: 'backlog',
          due_date: new Date(Date.now() + 3600000 * 480).toISOString(),
          labels: ['DevOps', 'Mobile']
        });
      }

      // 6. Insert Activity logs
      await supabase.from('activity_logs').insert([
        { workspace_id: workspaceId, user_id: user.id, action: 'created', target_type: 'project', target_name: 'TaskFlow Website Redesign' },
        { workspace_id: workspaceId, user_id: user.id, action: 'created task', target_type: 'task', target_name: 'Design high-fidelity homepage mockups' }
      ]);

      // 7. Reload all data
      await loadWorkspacesData();
      return { success: true, error: null };
    } catch (error: any) {
      console.error('Failed to seed live database:', error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  return (
    <WorkspaceContext.Provider value={{
      workspaces,
      activeWorkspace,
      projects,
      members,
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
