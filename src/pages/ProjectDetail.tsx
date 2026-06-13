import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../supabaseClient';
import type { Project, Task, WorkspaceMember } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import * as LucideIcons from 'lucide-react';
import { 
  KanbanSquare, 
  Files, 
  Calendar, 
  Activity,
  Search, 
  Plus, 
  X, 
  User, 
  CheckSquare, 
  MessageSquare, 
  Paperclip,
  Trash2,
  Edit,
  Clock,
  AlertTriangle,
  Upload,
  Download,
  Image as ImageIcon,
  MessageCircle,
  FolderKanban,
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  List
} from 'lucide-react';

const ProjectDetail: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const taskIdParam = searchParams.get('task');
  const { user: currentUser } = useAuth();
  const { theme } = useTheme();
  const { 
    activeWorkspace,
    projects, 
    members, 
    teams,
    teamMembers,
    getProjectTasks, 
    createTask, 
    updateTask, 
    deleteTask,
    getTaskDetails,
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    addComment,
    addAttachment,
    deleteAttachment,
    logActivity,
    activities,
    refreshWorkspaceData
  } = useWorkspace();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectAttachments, setProjectAttachments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'table' | 'kanban' | 'files' | 'activity'>('table');
  const [loading, setLoading] = useState(true);
  const now = new Date();

  // Monday.com style interactive cell selectors
  const [activeStatusSelector, setActiveStatusSelector] = useState<string | null>(null);
  const [activePrioritySelector, setActivePrioritySelector] = useState<string | null>(null);

  useEffect(() => {
    const handleGlobalClick = () => {
      setActiveStatusSelector(null);
      setActivePrioritySelector(null);
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  const getStatusColorMonday = (status: string) => {
    switch (status) {
      case 'completed': return 'monday-bg-completed';
      case 'review': return 'monday-bg-review';
      case 'in_progress': return 'monday-bg-in_progress';
      case 'todo': return 'monday-bg-todo';
      default: return 'monday-bg-backlog';
    }
  };

  const getPriorityColorMonday = (prio: string) => {
    switch (prio) {
      case 'low': return 'monday-bg-low';
      case 'medium': return 'monday-bg-medium';
      case 'high': return 'monday-bg-high';
      case 'critical': return 'monday-bg-critical';
      default: return 'monday-bg-todo';
    }
  };

  // Mentions state
  const [mentionSuggestions, setMentionSuggestions] = useState<WorkspaceMember[]>([]);
  const [mentionInputId, setMentionInputId] = useState<'comment' | null>(null);
  const [mentionIndex, setMentionIndex] = useState(-1);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  // Drag and Drop visual column states
  const [draggedOverCol, setDraggedOverCol] = useState<string | null>(null);

  // New task form state
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTasksCol, setNewTasksCol] = useState<'backlog' | 'todo' | 'in_progress' | 'review' | 'completed'>('todo');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskTeamId, setTaskTeamId] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskLabels, setTaskLabels] = useState('');

  // Active Task Detail Modal states
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskChecklist, setTaskChecklist] = useState<any[]>([]);
  const [taskComments, setTaskComments] = useState<any[]>([]);
  const [taskAttachments, setTaskAttachments] = useState<any[]>([]);
  
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newCommentText, setNewCommentText] = useState('');

  // Editing active task inside details modal
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editAssignee, setEditAssignee] = useState('');
  const [editTeamId, setEditTeamId] = useState('');
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [editDueDate, setEditDueDate] = useState('');

  useEffect(() => {
    const proj = projects.find(p => p.id === projectId);
    if (proj) {
      setProject(proj);
      loadTasks();
    } else if (projects.length > 0) {
      navigate('/projects');
    }
  }, [projectId, projects]);

  useEffect(() => {
    if (taskIdParam && tasks.length > 0 && (!selectedTask || selectedTask.id !== taskIdParam)) {
      const task = tasks.find(t => t.id === taskIdParam);
      if (task) {
        handleOpenTaskDetails(task);
      }
    }
  }, [taskIdParam, tasks]);

  const loadTasks = async () => {
    if (!projectId) return;
    setLoading(true);
    const { tasks: taskList } = await getProjectTasks(projectId);
    setTasks(taskList);

    // Fetch project attachments
    const taskIds = (taskList || []).map(t => t.id);
    if (taskIds.length > 0) {
      const { data: attList } = await supabase
        .from('attachments')
        .select('*')
        .in('task_id', taskIds);
      
      if (attList) {
        setProjectAttachments(attList);
      } else {
        const dbState = JSON.parse(localStorage.getItem('taskflow_mock_db') || '{}');
        const localAtt = (dbState.attachments || []).filter((att: any) => taskIds.includes(att.task_id));
        setProjectAttachments(localAtt);
      }
    } else {
      setProjectAttachments([]);
    }
    setLoading(false);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !projectId) return;

    const labelsArray = taskLabels.split(',').map(l => l.trim()).filter(l => l.length > 0);

    const { task, error } = await createTask(projectId, {
      title: taskTitle,
      description: taskDesc,
      assignee_id: taskAssignee || null,
      priority: taskPriority,
      status: newTasksCol,
      due_date: taskDueDate || null,
      labels: labelsArray,
      team_id: taskTeamId || null
    } as any);

    if (!error && task) {
      setIsNewTaskModalOpen(false);
      setTaskTitle('');
      setTaskDesc('');
      setTaskAssignee('');
      setTaskTeamId('');
      setTaskPriority('medium');
      setTaskDueDate('');
      setTaskLabels('');
      loadTasks();
    }
  };

  const handleUpdateTaskDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    const { task, error } = await updateTask(selectedTask.id, {
      title: editTitle,
      description: editDesc,
      assignee_id: editAssignee || null,
      priority: editPriority,
      due_date: editDueDate || null,
      team_id: editTeamId || null
    } as any);

    if (!error && task) {
      setSelectedTask(task);
      setIsEditingTask(false);
      loadTasks();
      refreshWorkspaceData();
    }
  };

  const handleCloseTaskDetails = () => {
    setSelectedTask(null);
    if (searchParams.has('task')) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('task');
      navigate(`/project/${projectId}?${newParams.toString()}`, { replace: true });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('Delete this task permanently?')) {
      await deleteTask(taskId);
      handleCloseTaskDetails();
      loadTasks();
      refreshWorkspaceData();
    }
  };

  // HTML5 Drag & Drop
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, columnStatus: string) => {
    e.preventDefault();
    if (draggedOverCol !== columnStatus) {
      setDraggedOverCol(columnStatus);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: any) => {
    e.preventDefault();
    setDraggedOverCol(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: targetStatus } : t));

    const { error } = await updateTask(taskId, { status: targetStatus });
    if (!error) {
      loadTasks();
      refreshWorkspaceData();
    } else {
      loadTasks();
    }
  };

  const handleOpenTaskDetails = async (task: Task) => {
    setSelectedTask(task);
    setIsEditingTask(false);
    
    setEditTitle(task.title);
    setEditDesc(task.description);
    setEditAssignee(task.assignee_id || '');
    setEditTeamId((task as any).team_id || '');
    setEditPriority(task.priority);
    setEditDueDate(task.due_date ? new Date(task.due_date).toISOString().substring(0, 10) : '');

    const { checklist, comments, attachments } = await getTaskDetails(task.id);
    setTaskChecklist(checklist);
    setTaskComments(comments);
    setTaskAttachments(attachments);
  };

  const handleAddChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistTitle.trim() || !selectedTask) return;

    const { item } = await addChecklistItem(selectedTask.id, newChecklistTitle);
    if (item) {
      setTaskChecklist(prev => [...prev, item]);
      setNewChecklistTitle('');
      loadTasks();
      refreshWorkspaceData();
    }
  };

  const handleToggleChecklist = async (itemId: string, currentStatus: boolean) => {
    setTaskChecklist(prev => prev.map(item => item.id === itemId ? { ...item, is_completed: !currentStatus } : item));
    await toggleChecklistItem(itemId, !currentStatus);
    loadTasks();
    refreshWorkspaceData();
  };

  const handleDeleteChecklist = async (itemId: string) => {
    setTaskChecklist(prev => prev.filter(item => item.id !== itemId));
    await deleteChecklistItem(itemId);
    loadTasks();
    refreshWorkspaceData();
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedTask) return;

    const { comment } = await addComment(selectedTask.id, newCommentText);
    if (comment) {
      setTaskComments(prev => [...prev, comment]);
      setNewCommentText('');
      loadTasks();
      refreshWorkspaceData();
    }
  };

  const handleAddFileAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTask) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Url = event.target?.result as string || '#';
      const { attachment } = await addAttachment(
        selectedTask.id,
        file.name,
        file.type.startsWith('image/') ? base64Url : '#',
        file.type,
        file.size
      );
      if (attachment) {
        setTaskAttachments(prev => [...prev, attachment]);
        loadTasks();
        refreshWorkspaceData();
      }
    };
    reader.readAsDataURL(file);
  };

  // Mentions
  const handleTextChange = (text: string, inputType: 'comment') => {
    setNewCommentText(text);

    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = text.slice(lastAtIndex + 1);
      const spaceIndex = textAfterAt.indexOf(' ');
      if (spaceIndex !== -1 && spaceIndex < textAfterAt.length - 1) {
        setMentionInputId(null);
        setMentionSuggestions([]);
        return;
      }

      const query = spaceIndex === -1 ? textAfterAt : textAfterAt.slice(0, spaceIndex);
      const filtered = members.filter(m => 
        (m.profile?.full_name || '').toLowerCase().includes(query.toLowerCase())
      );

      if (filtered.length > 0) {
        setMentionSuggestions(filtered);
        setMentionInputId(inputType);
        setMentionIndex(lastAtIndex);
      } else {
        setMentionInputId(null);
        setMentionSuggestions([]);
      }
    } else {
      setMentionInputId(null);
      setMentionSuggestions([]);
    }
  };

  const handleSelectMention = (memberName: string) => {
    const beforeAt = newCommentText.slice(0, mentionIndex);
    const updatedText = beforeAt + `@${memberName} `;
    setNewCommentText(updatedText);
    setMentionInputId(null);
    setMentionSuggestions([]);
  };

  const renderMentionedText = (text: string) => {
    if (!text) return '';
    const parts = text.split(/(@[^\s@,]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const name = part.slice(1);
        const isMember = members.some(m => (m.profile?.full_name || '').toLowerCase() === name.toLowerCase());
        if (isMember) {
          return (
            <span key={index} className="inline-block rounded bg-brand-500/10 dark:bg-brand-500/20 px-1 py-0.5 text-brand-605 dark:text-brand-400 font-bold border border-brand-500/20">
              {part}
            </span>
          );
        }
      }
      return part;
    });
  };

  // Timeline
  const projectTaskNames = tasks.map(t => t.title);
  const projectActivities = activities.filter(act => {
    if (act.workspace_id !== activeWorkspace?.id) return false;
    if (act.target_type === 'project' && act.target_name === project?.name) return true;
    if (act.target_type === 'task' && projectTaskNames.includes(act.target_name)) return true;
    return false;
  });

  const combinedTimeline = projectActivities.map(act => ({
    id: act.id,
    created_at: act.created_at,
    type: 'activity',
    action: act.action,
    target_type: act.target_type,
    target_name: act.target_name,
    profile: act.profile,
    user_id: act.user_id
  })).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  // Filter Tasks
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (t.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAssignee = filterAssignee === 'all' || t.assignee_id === filterAssignee;
    const matchesPriority = filterPriority === 'all' || t.priority === filterPriority;
    return matchesSearch && matchesAssignee && matchesPriority;
  });

  const columns = {
    backlog: { name: 'Backlog', tasks: filteredTasks.filter(t => t.status === 'backlog') },
    todo: { name: 'To Do', tasks: filteredTasks.filter(t => t.status === 'todo') },
    in_progress: { name: 'In Progress', tasks: filteredTasks.filter(t => t.status === 'in_progress') },
    review: { name: 'Review', tasks: filteredTasks.filter(t => t.status === 'review') },
    completed: { name: 'Completed', tasks: filteredTasks.filter(t => t.status === 'completed') }
  };

  const getPriorityColor = (prio: string) => {
    switch (prio) {
      case 'critical': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25';
      case 'high': return 'bg-amber-500/10 text-amber-605 dark:text-amber-400 border-amber-500/25';
      case 'medium': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-transparent';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-full flex flex-col page-enter">
      {/* Head details */}
      {project && (
        <div className="flex flex-col gap-4 border-b border-violet-100 dark:border-violet-900/30 pb-6 lg:flex-row lg:items-center lg:justify-between animate-fade-in-up delay-50">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${getPriorityColor(project.priority)}`}>
                {project.priority} priority
              </span>
              <span className="rounded-full bg-violet-100/10 dark:bg-violet-900/20 px-2 py-0.5 text-[9px] font-bold text-violet-650 dark:text-violet-400 border border-violet-200/20 dark:border-violet-800/20 uppercase">
                {project.status}
              </span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white md:text-3xl">{project.name}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed max-w-xl">{project.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-violet-500" />
              <span>Due: {project.due_date || 'No due date'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={14} className="text-violet-500" />
              <span>Start: {project.start_date || 'N/A'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-violet-100 dark:border-violet-900/30 shrink-0 animate-fade-in-up delay-100">
        <button
          onClick={() => setActiveTab('table')}
          className={`flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition-all ${
            activeTab === 'table' 
              ? 'border-violet-500 text-violet-600 dark:text-violet-400 font-bold' 
              : 'border-transparent text-slate-500 hover:text-slate-805 dark:hover:text-slate-200'
          }`}
        >
          <List size={16} />
          <span>Main Table</span>
        </button>
        <button
          onClick={() => setActiveTab('kanban')}
          className={`flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition-all ${
            activeTab === 'kanban' 
              ? 'border-violet-500 text-violet-600 dark:text-violet-400 font-bold' 
              : 'border-transparent text-slate-500 hover:text-slate-805 dark:hover:text-slate-200'
          }`}
        >
          <KanbanSquare size={16} />
          <span>Kanban Board</span>
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition-all ${
            activeTab === 'activity' 
              ? 'border-violet-500 text-violet-600 dark:text-violet-400 font-bold' 
              : 'border-transparent text-slate-500 hover:text-slate-805 dark:hover:text-slate-200'
          }`}
        >
          <Activity size={16} />
          <span>Activity Feed</span>
          <span className="rounded-full bg-violet-100/10 dark:bg-violet-900/30 px-1.5 py-0.5 text-[9px] text-violet-600 dark:text-violet-400 font-bold border border-violet-200/20">
            {combinedTimeline.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition-all ${
            activeTab === 'files' 
              ? 'border-violet-500 text-violet-600 dark:text-violet-400 font-bold' 
              : 'border-transparent text-slate-500 hover:text-slate-805 dark:hover:text-slate-200'
          }`}
        >
          <Files size={16} />
          <span>File Repository</span>
          <span className="rounded-full bg-violet-100/10 dark:bg-violet-900/30 px-1.5 py-0.5 text-[9px] text-violet-600 dark:text-violet-400 font-bold border border-violet-200/20">
            {projectAttachments.length}
          </span>
        </button>
      </div>

      {activeTab === 'table' && (
        <div className="flex-1 flex flex-col space-y-4 overflow-hidden animate-fade-in">
          {/* Filters */}
          <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center glass-panel rounded-2xl shrink-0 animate-fade-in-up delay-150">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-2.5 text-violet-450 dark:text-violet-500" />
              <input
                type="text"
                placeholder="Search table tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl py-2.5 pl-9 pr-4 text-xs focus:outline-none glass-input"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <select
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
                className="rounded-xl py-2 px-3 text-xs focus:outline-none cursor-pointer glass-input"
              >
                <option value="all">All Assignees</option>
                {members.map(m => (
                  <option key={m.user_id} value={m.user_id}>{m.profile.full_name}</option>
                ))}
              </select>

              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="rounded-xl py-2 px-3 text-xs focus:outline-none cursor-pointer glass-input"
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>

              <button
                onClick={() => {
                  setNewTasksCol('todo');
                  setIsNewTaskModalOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white btn-brand shrink-0"
              >
                <Plus size={14} />
                <span>Create Task</span>
              </button>
            </div>
          </div>

          {/* Main Table view */}
          <div className="flex-1 overflow-y-auto rounded-2xl overflow-hidden glass-card animate-fade-in-up delay-200">
            <div className="overflow-x-auto h-full">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-violet-100 dark:border-violet-900/30 bg-violet-500/5 dark:bg-violet-950/20 text-violet-700 dark:text-violet-300 uppercase tracking-wider font-bold">
                    <th className="px-5 py-3.5">Task Title</th>
                    <th className="px-5 py-3.5 text-center">Team</th>
                    <th className="px-5 py-3.5 text-center">Priority</th>
                    <th className="px-5 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5 text-center">Due Date</th>
                    <th className="px-5 py-3.5 text-center">Assignee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-violet-100/40 dark:divide-violet-900/10">
                  {filteredTasks.map(task => {
                    const assignee = members.find(m => m.user_id === task.assignee_id);
                    const taskTeamId = task.team_id || (project && project.team_id);
                    const team = teams.find(t => t.id === taskTeamId);
                    const isOverdue = task.due_date && new Date(task.due_date) < now && task.status !== 'completed';

                    return (
                      <tr 
                        key={task.id}
                        onClick={() => handleOpenTaskDetails(task)}
                        className="hover:bg-violet-50/25 dark:hover:bg-violet-950/15 cursor-pointer transition-all duration-150"
                      >
                        <td className="px-5 py-3.5">
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs hover:text-violet-650 dark:hover:text-violet-400 transition-colors">{task.title}</span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {team ? (
                            <span 
                              className="rounded px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border"
                              style={{ backgroundColor: `${team.color}12`, color: team.color, borderColor: `${team.color}25` }}
                            >
                              {team.name}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 relative min-w-[125px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePrioritySelector(activePrioritySelector === task.id ? null : task.id);
                              setActiveStatusSelector(null);
                            }}
                            className={`monday-cell ${getPriorityColorMonday(task.priority)}`}
                          >
                            {task.priority}
                          </button>
                          {activePrioritySelector === task.id && (
                            <div className="absolute left-1/2 -translate-x-1/2 mt-1.5 z-30 w-32 rounded-xl p-1.5 shadow-2xl animate-dropdown glass-card bg-white/95 dark:bg-slate-900/95">
                              {['low', 'medium', 'high', 'critical'].map(prio => (
                                <button
                                  key={prio}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    setActivePrioritySelector(null);
                                    await updateTask(task.id, { priority: prio as any });
                                    loadTasks();
                                  }}
                                  className={`w-full text-center text-[10px] font-bold uppercase py-2 px-1.5 my-0.5 rounded transition-all ${getPriorityColorMonday(prio)}`}
                                >
                                  {prio}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 relative min-w-[135px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveStatusSelector(activeStatusSelector === task.id ? null : task.id);
                              setActivePrioritySelector(null);
                            }}
                            className={`monday-cell ${getStatusColorMonday(task.status)}`}
                          >
                            {task.status.replace('_', ' ')}
                          </button>
                          {activeStatusSelector === task.id && (
                            <div className="absolute left-1/2 -translate-x-1/2 mt-1.5 z-30 w-32 rounded-xl p-1.5 shadow-2xl animate-dropdown glass-card bg-white/95 dark:bg-slate-900/95">
                              {['backlog', 'todo', 'in_progress', 'review', 'completed'].map(st => (
                                <button
                                  key={st}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    setActiveStatusSelector(null);
                                    await updateTask(task.id, { status: st as any });
                                    loadTasks();
                                  }}
                                  className={`w-full text-center text-[10px] font-bold uppercase py-2 px-1.5 my-0.5 rounded transition-all ${getStatusColorMonday(st)}`}
                                >
                                  {st.replace('_', ' ')}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`font-semibold ${isOverdue ? 'text-rose-505 dark:text-rose-450 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                            {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {assignee ? (
                              <>
                                <img src={assignee.profile.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover border border-violet-100" />
                                <span className="font-semibold text-slate-700 dark:text-slate-300">{assignee.profile.full_name}</span>
                              </>
                            ) : (
                              <span className="text-slate-400 font-semibold">Unassigned</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTasks.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-slate-405 dark:text-slate-500">
                        No tasks found matching current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'kanban' && (
        <div className="flex-1 flex flex-col space-y-4 overflow-hidden animate-fade-in">
          {/* Filters */}
          <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center glass-panel rounded-2xl shrink-0 animate-fade-in-up delay-150">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-2.5 text-violet-450 dark:text-violet-500" />
              <input
                type="text"
                placeholder="Search board tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl py-2.5 pl-9 pr-4 text-xs focus:outline-none glass-input"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <select
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
                className="rounded-xl py-2 px-3 text-xs focus:outline-none cursor-pointer glass-input"
              >
                <option value="all">All Assignees</option>
                {members.map(m => (
                  <option key={m.user_id} value={m.user_id}>{m.profile.full_name}</option>
                ))}
              </select>

              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="rounded-xl py-2 px-3 text-xs focus:outline-none cursor-pointer glass-input"
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Kanban board columns */}
          <div className="flex-1 overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-[1000px] h-full items-start">
              {Object.entries(columns).map(([colStatus, col]) => (
                <div
                  key={colStatus}
                  onDragOver={(e) => handleDragOver(e, colStatus)}
                  onDrop={(e) => handleDrop(e, colStatus)}
                  className={`flex w-72 flex-col rounded-2xl p-3 transition-colors ${
                    draggedOverCol === colStatus 
                      ? 'bg-violet-500/10 border border-violet-500/50' 
                      : ''
                  } glass-panel`}
                >
                  {/* Column header */}
                  <div className="mb-4 flex items-center justify-between px-1.5 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wide uppercase">{col.name}</span>
                      <span className="rounded-full bg-violet-100/10 dark:bg-violet-900/30 px-2 py-0.5 text-[10px] font-bold text-violet-600 dark:text-violet-400 border border-violet-200/20">
                        {col.tasks.length}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setNewTasksCol(colStatus as any);
                        setIsNewTaskModalOpen(true);
                      }}
                      className="rounded-lg p-1 text-violet-400 hover:bg-violet-500/10 hover:text-violet-600 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Tasks List */}
                  <div className="space-y-3 min-h-[300px] overflow-y-auto">
                    {col.tasks.map((task, idx) => {
                      const assignee = members.find(m => m.user_id === task.assignee_id);
                      const isOverdue = task.due_date && new Date(task.due_date) < now && task.status !== 'completed';
                      
                      const taskTeamId = task.team_id || (project && project.team_id);
                      const team = teams.find(t => t.id === taskTeamId);
                      const delayClass = idx === 0 ? 'delay-50' :
                                        idx === 1 ? 'delay-100' :
                                        idx === 2 ? 'delay-150' : 'delay-200';

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onClick={() => handleOpenTaskDetails(task)}
                          className={`group hover-lift rounded-xl p-4 transition-all duration-200 cursor-grab active:cursor-grabbing glass-card hover:border-violet-500/45 dark:hover:border-violet-500/30 bg-white/60 dark:bg-slate-900/40 animate-fade-in-up ${delayClass}`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className={`rounded px-1.5 py-0.5 text-[8px] font-extrabold uppercase border ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            
                            {isOverdue && (
                              <span className="flex items-center gap-0.5 text-[8px] font-bold text-rose-500">
                                <AlertTriangle size={8} className="animate-pulse" />
                                <span>Overdue</span>
                              </span>
                            )}
                          </div>

                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors line-clamp-2 leading-tight">
                            {task.title}
                          </h4>

                          {/* Team Badge inside Task Card */}
                          {team && (
                            <div className="mt-2.5">
                              <span 
                                className="rounded px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider border"
                                style={{ backgroundColor: `${team.color}12`, color: team.color, borderColor: `${team.color}20` }}
                              >
                                {team.name}
                              </span>
                            </div>
                          )}

                          {/* Details line */}
                          <div className="mt-4 flex items-center justify-between border-t border-violet-50 dark:border-violet-900/25 pt-3 text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                            <div className="flex items-center gap-2">
                              {task.checklistCount && task.checklistCount.total > 0 && (
                                <div className="flex items-center gap-0.5 text-violet-550 dark:text-violet-400" title="Subtasks">
                                  <CheckSquare size={10} />
                                  <span>{task.checklistCount.completed}/{task.checklistCount.total}</span>
                                </div>
                              )}
                              {task.commentCount && task.commentCount > 0 ? (
                                <div className="flex items-center gap-0.5 text-violet-550 dark:text-violet-400" title="Comments">
                                  <MessageSquare size={10} />
                                  <span>{task.commentCount}</span>
                                </div>
                              ) : null}
                              {task.attachmentCount && task.attachmentCount > 0 ? (
                                <div className="flex items-center gap-0.5 text-violet-550 dark:text-violet-400" title="Attachments">
                                  <Paperclip size={10} />
                                  <span>{task.attachmentCount}</span>
                                </div>
                              ) : null}
                            </div>

                            {/* Assignee Avatar */}
                            {assignee ? (
                              <img
                                src={assignee.profile.avatar_url}
                                alt=""
                                title={assignee.profile.full_name}
                                className="h-5.5 w-5.5 rounded-full object-cover border border-slate-200"
                              />
                            ) : (
                              <div className="rounded-full bg-slate-200 dark:bg-slate-800 p-0.5 text-slate-400" title="Unassigned">
                                <User size={12} />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {col.tasks.length === 0 && (
                      <div className="py-8 text-center text-slate-405 text-[10px] border border-dashed border-violet-200/40 dark:border-violet-900/20 rounded-xl">No tasks here</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="flex-1 flex flex-col space-y-4 overflow-hidden rounded-2xl p-5 h-[550px] glass-card animate-fade-in">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Activity Timeline</h3>
            <p className="text-xs text-slate-500">Workspace operations related to this project.</p>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {combinedTimeline.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500">
                <Activity size={32} className="text-violet-400 mb-2 animate-pulse" />
                <p className="text-xs font-semibold">No activity logs recorded.</p>
              </div>
            ) : (
              combinedTimeline.map((item: any) => (
                <div key={item.id} className="flex items-center justify-center py-1">
                  <div className="flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] text-slate-700 dark:text-slate-350 font-semibold glass-panel bg-white/60 dark:bg-slate-950/40">
                    <Clock size={10} className="text-violet-400" />
                    <span>
                      <strong className="text-slate-900 dark:text-slate-100">{item.profile?.full_name || 'System User'}</strong>
                      {' '}{item.action}{' '}
                      <span className="rounded bg-violet-100/10 dark:bg-violet-900/30 border border-violet-200/20 px-1.5 py-0.5 text-[9px] font-mono font-bold text-violet-650 dark:text-violet-450">
                        {item.target_type}: {item.target_name}
                      </span>
                    </span>
                    <span className="text-[9px] text-slate-450">
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'files' && (
        <div className="flex-1 space-y-5 animate-fade-in">
          {projectAttachments.length === 0 ? (
            <div className="rounded-3xl glass-card py-16 text-center animate-fade-in-up delay-50">
              <Upload className="mx-auto text-violet-400 dark:text-violet-600 mb-2 animate-bounce" size={32} />
              <h4 className="text-xs font-bold text-slate-500">No resources uploaded.</h4>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
              {projectAttachments.map((file: any, idx) => {
                const isImage = file.file_type?.startsWith('image/');
                const sizeKb = Math.round(file.size / 1024) || 0;
                const delayClass = idx === 0 ? 'delay-50' :
                                  idx === 1 ? 'delay-100' :
                                  idx === 2 ? 'delay-150' : 'delay-200';

                return (
                  <div key={file.id} className={`group relative flex flex-col justify-between rounded-xl p-3 hover:border-violet-500/35 transition-all duration-300 glass-card hover-lift animate-fade-in-up ${delayClass}`}>
                    <div className="flex h-28 items-center justify-center rounded-lg bg-slate-50/40 dark:bg-slate-950/60 overflow-hidden relative border border-violet-100/50 dark:border-violet-900/30">
                      {isImage && file.url !== '#' ? (
                        <img src={file.url} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="text-slate-400 flex flex-col items-center gap-1">
                          <ImageIcon size={24} />
                          <span className="text-[8px] font-bold uppercase">{file.name.split('.').pop()}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-2.5 overflow-hidden">
                      <p className="text-[10px] font-bold text-slate-800 dark:text-slate-300 truncate">{file.name}</p>
                      <p className="text-[8px] text-slate-450 mt-0.5 font-bold uppercase">{sizeKb} KB</p>
                    </div>

                    <div className="absolute right-2.5 top-2.5 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-[-2px] group-hover:translate-y-0">
                      {file.url !== '#' && (
                        <a
                          href={file.url}
                          download={file.name}
                          className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/95 dark:bg-slate-900/95 text-slate-550 border border-violet-100 dark:border-violet-900/45 shadow-sm hover:bg-violet-500 hover:text-white transition-colors"
                        >
                          <Download size={11} />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Task Modal */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl p-6 shadow-2xl animate-dropdown text-slate-850 dark:text-slate-100 glass-panel bg-white/95 dark:bg-slate-950/95">
            <div className="flex items-center justify-between border-b border-violet-100 dark:border-violet-900/30 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">Add Task to: {newTasksCol.replace('_', ' ')}</h3>
              <button
                onClick={() => setIsNewTaskModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-violet-500/10 hover:text-violet-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateTask} className="mt-4 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Build API integration handlers"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="mt-1.5 w-full rounded-xl p-2.5 text-sm focus:outline-none glass-input"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Description</label>
                <textarea
                  placeholder="Summarize objectives..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  rows={2}
                  className="mt-1.5 w-full rounded-xl p-2.5 text-sm focus:outline-none resize-none glass-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Assign To Team</label>
                  <select
                    value={taskTeamId}
                    onChange={(e) => setTaskTeamId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl p-2.5 text-sm focus:outline-none cursor-pointer glass-input"
                  >
                    <option value="">No Team</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Assign To Teammate</label>
                  <select
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    className="mt-1.5 w-full rounded-xl p-2.5 text-sm focus:outline-none cursor-pointer glass-input"
                  >
                    <option value="">Unassigned</option>
                    {members.map(m => (
                      <option key={m.user_id} value={m.user_id}>{m.profile.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Priority Level</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="mt-1.5 w-full rounded-xl p-2.5 text-sm focus:outline-none cursor-pointer glass-input"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="mt-1.5 w-full rounded-xl p-2.5 text-sm focus:outline-none cursor-pointer glass-input [color-scheme:dark]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Labels (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="Design, Frontend, Bug"
                  value={taskLabels}
                  onChange={(e) => setTaskLabels(e.target.value)}
                  className="mt-1.5 w-full rounded-xl p-2.5 text-sm focus:outline-none glass-input"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-violet-100 dark:border-violet-900/30">
                <button
                  type="button"
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-violet-500/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl px-5 py-2.5 text-sm font-bold text-white btn-brand"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details Side Drawer panel */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-955/65 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-4xl h-screen flex flex-col justify-between shadow-2xl animate-slide-in-right glass-panel border-l bg-white/95 dark:bg-slate-950/95">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-violet-100 dark:border-violet-900/30 px-6 py-4 bg-slate-50/20 dark:bg-slate-950/20 shrink-0 text-slate-800 dark:text-white">
              <div className="flex items-center gap-2">
                <span className="rounded bg-violet-500/10 px-2 py-0.5 text-[9px] font-bold text-violet-600 dark:text-violet-400 border border-violet-500/20">Task details</span>
                {project && <span className="text-xs text-slate-500 font-bold max-w-[200px] truncate">/ {project.name}</span>}
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDeleteTask(selectedTask.id)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                  title="Delete Task"
                >
                  <Trash2 size={15} />
                </button>
                <button
                  onClick={handleCloseTaskDetails}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-violet-500/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Two-Column Side Drawer Layout */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* Left Column: Editor, checklists, and discussions */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {!isEditingTask ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-slate-850 dark:text-slate-100 leading-snug">{selectedTask.title}</h3>
                      <button 
                        onClick={() => setIsEditingTask(true)}
                        className="flex items-center gap-1 text-[10px] font-bold text-violet-650 dark:text-violet-400 hover:underline px-2.5 py-1 rounded-lg bg-violet-500/5 hover:bg-violet-500/10 transition-colors"
                      >
                        <Edit size={11} />
                        <span>Edit Task</span>
                      </button>
                    </div>
                    <p className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed whitespace-pre-line rounded-xl p-3.5 glass-card">
                      {selectedTask.description || 'No description provided.'}
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleUpdateTaskDetails} className="space-y-4 rounded-xl p-4 animate-in fade-in glass-panel bg-white/70 dark:bg-slate-900/30">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Task Title *</label>
                      <input
                        type="text"
                        required
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="mt-1.5 w-full rounded-xl p-2.5 text-xs focus:outline-none glass-input"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description</label>
                      <textarea
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        rows={4}
                        className="mt-1.5 w-full rounded-xl p-2.5 text-xs focus:outline-none resize-none glass-input"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-violet-100 dark:border-violet-900/30 pt-3">
                      <button
                        type="button"
                        onClick={() => setIsEditingTask(false)}
                        className="rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="rounded-lg px-4 py-1.5 text-xs font-bold text-white btn-brand"
                      >
                        Save updates
                      </button>
                    </div>
                  </form>
                )}

                {/* Subtasks checklist */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-705 dark:text-slate-350 text-xs uppercase tracking-wider">
                    <CheckSquare size={14} className="text-violet-500" />
                    <span>Subtasks Checklist</span>
                  </div>
                  {taskChecklist.length > 0 && (
                    <div className="h-1.5 w-full rounded-full bg-violet-100 dark:bg-violet-900/30 overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${Math.round((taskChecklist.filter(item => item.is_completed).length / taskChecklist.length) * 100)}%` }}
                      />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    {taskChecklist.map(item => (
                      <div key={item.id} className="flex items-center justify-between rounded-xl p-2.5 shadow-xs glass-panel bg-white/50 dark:bg-slate-950/30">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={item.is_completed}
                            onChange={() => handleToggleChecklist(item.id, item.is_completed)}
                            className="h-4 w-4 rounded border-violet-200 dark:border-violet-800 text-violet-600 bg-slate-50 cursor-pointer focus:ring-0"
                          />
                          <span className={`text-xs text-slate-700 dark:text-slate-200 ${item.is_completed ? 'line-through text-slate-400 dark:text-slate-500 font-medium' : 'font-medium'}`}>
                            {item.title}
                          </span>
                        </div>
                        <button onClick={() => handleDeleteChecklist(item.id)} className="text-slate-400 hover:text-rose-500 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleAddChecklist} className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Add subtask specifications..."
                      value={newChecklistTitle}
                      onChange={(e) => setNewChecklistTitle(e.target.value)}
                      className="flex-1 rounded-xl p-2 text-xs focus:outline-none glass-input"
                    />
                    <button type="submit" className="rounded-xl px-4 py-2 text-xs font-bold text-white btn-brand">Add</button>
                  </form>
                </div>

                {/* Attachments */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-705 dark:text-slate-355 text-xs uppercase tracking-wider">
                    <Paperclip size={14} className="text-violet-500" />
                    <span>Task Attachments</span>
                  </div>
                  <div className="space-y-2">
                    {taskAttachments.map(file => (
                      <div key={file.id} className="flex items-center justify-between rounded-lg p-2 shadow-xs glass-panel bg-white/40 dark:bg-slate-955/20">
                        <div className="flex items-center gap-2 overflow-hidden">
                          {file.file_type?.startsWith('image/') ? (
                            <img src={file.url} alt="" className="h-8 w-8 rounded object-cover shadow-sm border border-violet-100" />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded bg-violet-150/10 border border-violet-200/20 text-[9px] font-bold text-violet-500">DOC</div>
                          )}
                          <div className="truncate">
                            <p className="text-xs text-slate-800 dark:text-slate-200 truncate">{file.name}</p>
                            <p className="text-[9px] text-slate-400 font-semibold uppercase">{(file.size / 1024).toFixed(0)} KB</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {file.url !== '#' && (
                            <a href={file.url} download={file.name} className="p-1 text-slate-405 hover:text-violet-600"><Download size={12} /></a>
                          )}
                          <button 
                            onClick={() => {
                              setTaskAttachments(prev => prev.filter(a => a.id !== file.id));
                              deleteAttachment(file.id);
                              loadTasks();
                              refreshWorkspaceData();
                            }} 
                            className="p-1 text-slate-405 hover:text-rose-500"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <label className="flex items-center justify-center w-full h-16 rounded-xl cursor-pointer transition-all shadow-xs glass-card border-dashed border-violet-200 dark:border-violet-900/50 hover:border-violet-500 dark:hover:border-violet-400">
                    <div className="flex flex-col items-center gap-1 text-slate-400">
                      <Upload size={16} />
                      <span className="text-[10px] font-bold">Upload computer resources</span>
                    </div>
                    <input type="file" onChange={handleAddFileAttachment} className="hidden" />
                  </label>
                </div>

                {/* Discussions */}
                <div className="space-y-4 pt-2 border-t border-violet-100 dark:border-violet-900/30">
                  <div className="flex items-center gap-1.5 font-bold text-slate-705 dark:text-slate-300 text-xs uppercase tracking-wider">
                    <MessageSquare size={14} className="text-violet-500" />
                    <span>Discussions</span>
                  </div>
                  <form onSubmit={handleAddComment} className="flex gap-2 relative">
                    <input
                      type="text"
                      required
                      placeholder="Ask a question or leave a reply..."
                      value={newCommentText}
                      onChange={(e) => handleTextChange(e.target.value, 'comment')}
                      className="flex-1 rounded-xl p-2.5 text-xs focus:outline-none glass-input"
                    />
                    {mentionInputId === 'comment' && mentionSuggestions.length > 0 && (
                      <div className="absolute bottom-full left-0 z-50 mb-1.5 w-60 rounded-xl p-1.5 shadow-2xl animate-dropdown glass-card bg-white/95 dark:bg-slate-900/95">
                        <p className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Workspace Teammates</p>
                        <div className="max-h-36 overflow-y-auto">
                          {mentionSuggestions.map(member => (
                            <button
                              key={member.id}
                              type="button"
                              onClick={() => handleSelectMention(member.profile.full_name)}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-violet-500/10 transition-colors"
                            >
                              <img src={member.profile.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
                              <div className="truncate">
                                <p className="font-bold leading-none text-slate-800 dark:text-slate-200">{member.profile.full_name}</p>
                                <p className="text-[8px] text-slate-400 mt-1 leading-none">{member.profile.email}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <button type="submit" className="rounded-xl px-4 py-2 text-xs font-bold text-white btn-brand">Reply</button>
                  </form>

                  <div className="space-y-3.5">
                    {taskComments.map(comm => (
                      <div key={comm.id} className="flex gap-3 text-xs animate-fade-in">
                        {comm.profile?.avatar_url ? (
                          <img src={comm.profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover border border-violet-100 shrink-0 shadow-sm" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/10 text-violet-650 font-bold border border-violet-250/20 text-xs shrink-0 shadow-sm">{(comm.profile?.full_name || 'US').substring(0, 2).toUpperCase()}</div>
                        )}
                        <div className="flex-1 rounded-xl p-3 shadow-xs glass-card bg-white/60 dark:bg-slate-900/40">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-850 dark:text-slate-200">{comm.profile?.full_name}</span>
                            <span className="text-[9px] text-slate-400">{new Date(comm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="mt-1 text-slate-655 dark:text-slate-350 leading-relaxed font-medium">{renderMentionedText(comm.content)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Metadata details panel sidebar */}
              <div className="w-72 border-l border-violet-100/50 dark:border-violet-900/30 p-6 space-y-5 bg-slate-50/20 dark:bg-slate-950/20 shrink-0 overflow-y-auto">
                {!isEditingTask ? (
                  <div className="space-y-4">
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned Teammate</span>
                      <div className="mt-1.5 flex items-center gap-2 rounded-xl p-2.5 glass-card bg-white/70 dark:bg-slate-900/60">
                        {members.find(m => m.user_id === selectedTask.assignee_id) ? (
                          <>
                            <img
                              src={members.find(m => m.user_id === selectedTask.assignee_id)?.profile.avatar_url}
                              alt=""
                              className="h-7 w-7 rounded-full object-cover border border-violet-100"
                            />
                            <div className="overflow-hidden">
                              <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{members.find(m => m.user_id === selectedTask.assignee_id)?.profile.full_name}</span>
                              <span className="text-[9px] text-slate-400 truncate block mt-0.5">Teammate</span>
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 font-semibold p-1">Unassigned</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Workspace Team</span>
                      <div className="mt-1.5 rounded-xl p-2.5 glass-card bg-white/70 dark:bg-slate-900/60">
                        {teams.find(t => t.id === ((selectedTask as any).team_id || (project && project.team_id))) ? (
                          <div className="flex items-center gap-2">
                            <div 
                              className="h-2 w-2 rounded-full" 
                              style={{ backgroundColor: teams.find(t => t.id === ((selectedTask as any).team_id || (project && project.team_id)))?.color }}
                            />
                            <span className="text-xs font-bold text-slate-750 dark:text-slate-200 truncate">
                              {teams.find(t => t.id === ((selectedTask as any).team_id || (project && project.team_id)))?.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-semibold p-1">No team assigned</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Priority Level</span>
                      <div className="mt-1.5">
                        <span className={`rounded-full border px-2.5 py-1 text-[9px] font-extrabold uppercase ${getPriorityColor(selectedTask.priority)}`}>
                          {selectedTask.priority}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Due Date</span>
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-650 dark:text-slate-350 font-semibold">
                        <Calendar size={13} className="text-violet-500" />
                        <span className={(selectedTask.due_date && new Date(selectedTask.due_date) < now && selectedTask.status !== 'completed') ? 'text-rose-500 font-bold' : ''}>
                          {selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString() : 'No due date'}
                        </span>
                      </div>
                    </div>

                    {project && (
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Connected Project</span>
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-655 dark:text-slate-300 font-semibold font-sans">
                          <FolderKanban size={13} className="text-violet-500 shrink-0" />
                          <span className="truncate">{project.name}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Assignee</label>
                      <select
                        value={editAssignee}
                        onChange={(e) => setEditAssignee(e.target.value)}
                        className="mt-1.5 w-full rounded-xl p-2 text-xs focus:outline-none glass-input"
                      >
                        <option value="">Unassigned</option>
                        {members.map(m => (
                          <option key={m.user_id} value={m.user_id}>{m.profile.full_name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Team Assignment</label>
                      <select
                        value={editTeamId}
                        onChange={(e) => setEditTeamId(e.target.value)}
                        className="mt-1.5 w-full rounded-xl p-2 text-xs focus:outline-none glass-input"
                      >
                        <option value="">No Team</option>
                        {teams.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Priority</label>
                      <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value as any)}
                        className="mt-1.5 w-full rounded-xl p-2 text-xs focus:outline-none glass-input"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Due Date</label>
                      <input
                        type="date"
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                        className="mt-1.5 w-full rounded-xl p-2 text-xs focus:outline-none glass-input [color-scheme:dark]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
