import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import type { Task, Project } from '../context/WorkspaceContext';
import * as LucideIcons from 'lucide-react';
import { 
  KanbanSquare, 
  List, 
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
  FolderOpen
} from 'lucide-react';

const Tasks: React.FC = () => {
  const { theme } = useTheme();
  const { user: currentUser } = useAuth();
  const { 
    activeWorkspace,
    projects, 
    members, 
    teams,
    teamMembers,
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
    refreshWorkspaceData
  } = useWorkspace();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<'board' | 'list'>('board');
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

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTeam, setFilterTeam] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  // Drag-and-drop column highlight
  const [draggedOverCol, setDraggedOverCol] = useState<string | null>(null);

  // New task form state
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTaskCol, setNewTaskCol] = useState<'backlog' | 'todo' | 'in_progress' | 'review' | 'completed'>('todo');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskProjId, setTaskProjId] = useState('');
  const [taskTeamId, setTaskTeamId] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskLabels, setTaskLabels] = useState('');

  // Active Task Detail drawer states
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
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [editDueDate, setEditDueDate] = useState('');

  useEffect(() => {
    if (activeWorkspace) {
      loadAllTasks();
    }
  }, [activeWorkspace, projects]);

  const loadAllTasks = async () => {
    if (projects.length === 0) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const projectIds = projects.map(p => p.id);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .in('project_id', projectIds);

      if (!error && data) {
        // Fetch checklists, comments, and attachments count in parallel
        const taskIds = data.map((t: any) => t.id);
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

        const enriched = data.map((task: any) => {
          const checklists = allChecklists.filter((c: any) => c.task_id === task.id);
          const comments = allComments.filter((c: any) => c.task_id === task.id);
          const attachments = allAttachments.filter((c: any) => c.task_id === task.id);
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
        setTasks(enriched);
      } else {
        // Fallback to local storage (mock mode)
        const dbState = JSON.parse(localStorage.getItem('taskflow_mock_db') || '{}');
        const localTasks = (dbState.tasks || []).filter((t: any) => projectIds.includes(t.project_id));
        const enriched = localTasks.map((task: any) => {
          const checklists = (dbState.checklists || []).filter((c: any) => c.task_id === task.id);
          const comments = (dbState.comments || []).filter((c: any) => c.task_id === task.id);
          const attachments = (dbState.attachments || []).filter((c: any) => c.task_id === task.id);
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
        setTasks(enriched);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskProjId) return;

    const labelsArray = taskLabels.split(',').map(l => l.trim()).filter(l => l.length > 0);

    const { task, error } = await createTask(taskProjId, {
      title: taskTitle,
      description: taskDesc,
      assignee_id: taskAssignee || null,
      priority: taskPriority,
      status: newTaskCol,
      due_date: taskDueDate || null,
      labels: labelsArray,
      team_id: taskTeamId || null
    } as any);

    if (!error && task) {
      setIsNewTaskOpen(false);
      setTaskTitle('');
      setTaskDesc('');
      setTaskProjId('');
      setTaskTeamId('');
      setTaskAssignee('');
      setTaskPriority('medium');
      setTaskDueDate('');
      setTaskLabels('');
      loadAllTasks();
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
      due_date: editDueDate || null
    });

    if (!error && task) {
      setSelectedTask(task);
      setIsEditingTask(false);
      loadAllTasks();
      refreshWorkspaceData();
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      await deleteTask(taskId);
      setSelectedTask(null);
      loadAllTasks();
      refreshWorkspaceData();
    }
  };

  // Drag and Drop
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

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: targetStatus } : t));

    const { error } = await updateTask(taskId, { status: targetStatus });
    if (!error) {
      loadAllTasks();
      refreshWorkspaceData();
    } else {
      loadAllTasks();
    }
  };

  // Task Details Drawer Fetching
  const handleOpenTaskDetails = async (task: Task) => {
    setSelectedTask(task);
    setIsEditingTask(false);
    setEditTitle(task.title);
    setEditDesc(task.description);
    setEditAssignee(task.assignee_id || '');
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
      loadAllTasks();
    }
  };

  const handleToggleChecklist = async (itemId: string, currentStatus: boolean) => {
    setTaskChecklist(prev => prev.map(item => item.id === itemId ? { ...item, is_completed: !currentStatus } : item));
    await toggleChecklistItem(itemId, !currentStatus);
    loadAllTasks();
  };

  const handleDeleteChecklist = async (itemId: string) => {
    setTaskChecklist(prev => prev.filter(item => item.id !== itemId));
    await deleteChecklistItem(itemId);
    loadAllTasks();
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedTask) return;

    const { comment } = await addComment(selectedTask.id, newCommentText);
    if (comment) {
      setTaskComments(prev => [...prev, comment]);
      setNewCommentText('');
      loadAllTasks();
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
        loadAllTasks();
      }
    };
    reader.readAsDataURL(file);
  };

  // Filter computation
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (t.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    // Project filter
    const matchesProject = filterProject === 'all' || t.project_id === filterProject;

    // Team filter: filter projects belonging to selected team OR direct task association
    let matchesTeam = true;
    if (filterTeam !== 'all') {
      const proj = projects.find(p => p.id === t.project_id);
      const isAssociatedByProject = proj && proj.team_id === filterTeam;
      const isAssociatedByDirectTask = (t as any).team_id === filterTeam;
      matchesTeam = !!(isAssociatedByProject || isAssociatedByDirectTask);
    }

    const matchesAssignee = filterAssignee === 'all' || t.assignee_id === filterAssignee;
    const matchesPriority = filterPriority === 'all' || t.priority === filterPriority;

    return matchesSearch && matchesProject && matchesTeam && matchesAssignee && matchesPriority;
  });

  const columns = {
    backlog: { name: 'Backlog', tasks: filteredTasks.filter(t => t.status === 'backlog') },
    todo: { name: 'To Do', tasks: filteredTasks.filter(t => t.status === 'todo') },
    in_progress: { name: 'In Progress', tasks: filteredTasks.filter(t => t.status === 'in_progress') },
    review: { name: 'Review', tasks: filteredTasks.filter(t => t.status === 'review') },
    completed: { name: 'Completed', tasks: filteredTasks.filter(t => t.status === 'completed') }
  };

  const getPriorityBadgeColor = (prio: string) => {
    switch (prio) {
      case 'critical': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      case 'high': return 'bg-amber-500/10 text-amber-605 dark:text-amber-400 border-amber-500/20';
      case 'medium': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-205 dark:border-slate-700/50';
    }
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
            <span key={index} className="inline-block rounded bg-brand-500/10 dark:bg-brand-500/20 px-1 py-0.5 text-brand-600 dark:text-brand-400 font-bold border border-brand-500/20">
              {part}
            </span>
          );
        }
      }
      return part;
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-full flex flex-col page-enter">
      {/* Top Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-violet-100 dark:border-violet-900/30 pb-5">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-955 dark:text-white md:text-3xl animate-fade-in-up delay-50">Workspace Tasks Board</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">View and organize all tasks across workspace projects and teams.</p>
        </div>
        <div className="flex items-center gap-3 animate-fade-in-up delay-100">
          {/* Toggle board vs list view */}
          <div className="flex items-center rounded-xl p-1 shrink-0 glass-panel bg-white/40 dark:bg-slate-900/30">
            <button
              onClick={() => setViewType('board')}
              className={`p-1.5 rounded-lg transition-colors ${viewType === 'board' ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold' : 'text-slate-450 hover:text-slate-700'}`}
              title="Board View"
            >
              <KanbanSquare size={16} />
            </button>
            <button
              onClick={() => setViewType('list')}
              className={`p-1.5 rounded-lg transition-colors ${viewType === 'list' ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold' : 'text-slate-450 hover:text-slate-700'}`}
              title="List Table View"
            >
              <List size={16} />
            </button>
          </div>
          <button
            onClick={() => {
              if (projects.length > 0) {
                setTaskProjId(projects[0].id);
                setNewTaskCol('todo');
                setIsNewTaskOpen(true);
              } else {
                alert("Please create a project first before creating tasks.");
              }
            }}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white btn-brand"
          >
            <Plus size={16} />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="flex flex-col gap-3 p-4 glass-panel rounded-2xl animate-fade-in-up delay-150">
        <div className="relative w-full">
          <Search size={16} className="absolute left-3.5 top-3.5 text-violet-400 dark:text-violet-500" />
          <input
            type="text"
            placeholder="Search board tasks by keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl py-3 pl-10 pr-4 text-xs focus:outline-none glass-input"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <select
            value={filterTeam}
            onChange={(e) => setFilterTeam(e.target.value)}
            className="rounded-xl py-2.5 px-3 text-xs focus:outline-none cursor-pointer glass-input text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Teams</option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="rounded-xl py-2.5 px-3 text-xs focus:outline-none cursor-pointer glass-input text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="rounded-xl py-2.5 px-3 text-xs focus:outline-none cursor-pointer glass-input text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Assignees</option>
            {members.map(m => (
              <option key={m.user_id} value={m.user_id}>{m.profile.full_name}</option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="rounded-xl py-2.5 px-3 text-xs focus:outline-none cursor-pointer glass-input text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-slate-500">
          <p>Loading tasks data...</p>
        </div>
      ) : viewType === 'board' ? (
        // Board View
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-[1000px] h-full items-start">
            {Object.entries(columns).map(([colStatus, col]) => (
              <div
                key={colStatus}
                onDragOver={(e) => handleDragOver(e, colStatus)}
                onDrop={(e) => handleDrop(e, colStatus)}
                className={`flex w-72 flex-col rounded-2xl border p-3 transition-colors shadow-xs ${
                  draggedOverCol === colStatus 
                    ? 'border-violet-500 bg-violet-500/10 dark:bg-violet-500/20 shadow-lg shadow-violet-500/5' 
                    : 'border-violet-100 dark:border-violet-900/30'
                } glass-panel bg-white/40 dark:bg-slate-900/10`}
              >
                <div className="mb-4 flex items-center justify-between px-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 tracking-wide">{col.name}</span>
                    <span className="rounded-full bg-violet-100 dark:bg-violet-900/50 px-2 py-0.5 text-[10px] font-bold text-violet-600 dark:text-violet-400">
                      {col.tasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (projects.length > 0) {
                        setTaskProjId(projects[0].id);
                        setNewTaskCol(colStatus as any);
                        setIsNewTaskOpen(true);
                      }
                    }}
                    className="rounded-lg p-1 text-slate-400 hover:bg-violet-100 dark:hover:bg-violet-900/55 hover:text-slate-700 dark:hover:text-white transition-all"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className="space-y-3 min-h-[300px] overflow-y-auto">
                  {col.tasks.map((task) => {
                    const assignee = members.find(m => m.user_id === task.assignee_id);
                    const isOverdue = task.due_date && new Date(task.due_date) < now && task.status !== 'completed';
                    
                    // Resolve project name and team name
                    const proj = projects.find(p => p.id === task.project_id);
                    const taskTeamId = task.team_id || (proj && proj.team_id);
                    const team = teams.find(t => t.id === taskTeamId);

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onClick={() => handleOpenTaskDetails(task)}
                        className="group hover-lift rounded-xl p-4 glass-card hover:border-violet-500/40 dark:hover:border-violet-500/35 transition-all duration-200 cursor-grab active:cursor-grabbing hover:shadow-lg hover:shadow-violet-500/5"
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className={`rounded px-1.5 py-0.5 text-[8px] font-extrabold uppercase border ${getPriorityBadgeColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          {isOverdue && (
                            <span className="flex items-center gap-0.5 text-[8px] font-bold text-rose-500 dark:text-rose-400">
                              <AlertTriangle size={8} className="animate-pulse" />
                              <span>Overdue</span>
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors line-clamp-2">
                          {task.title}
                        </h4>

                        {/* Project and Team details */}
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[9px] font-bold">
                          {proj && (
                            <span className="rounded bg-violet-50/50 dark:bg-violet-950/45 border border-violet-100/30 dark:border-violet-900/20 px-1.5 py-0.5 text-slate-550 dark:text-slate-400 uppercase max-w-[120px] truncate" title={proj.name}>
                              {proj.name}
                            </span>
                          )}
                          {team && (
                            <span 
                              className="rounded px-1.5 py-0.5 uppercase max-w-[120px] truncate border border-violet-100/10"
                              style={{ backgroundColor: `${team.color}15`, color: team.color }}
                              title={team.name}
                            >
                              {team.name}
                            </span>
                          )}
                        </div>

                        {/* Checklist/Comment counters and assignee */}
                        <div className="mt-4 flex items-center justify-between border-t border-violet-100/50 dark:border-violet-900/20 pt-3 text-[10px] text-slate-500 dark:text-slate-450 font-semibold">
                          <div className="flex items-center gap-2">
                            {task.checklistCount && task.checklistCount.total > 0 && (
                              <div className="flex items-center gap-0.5" title="Checklist progress">
                                <CheckSquare size={10} />
                                <span>{task.checklistCount.completed}/{task.checklistCount.total}</span>
                              </div>
                            )}
                            {task.commentCount && task.commentCount > 0 ? (
                              <div className="flex items-center gap-0.5">
                                <MessageSquare size={10} />
                                <span>{task.commentCount}</span>
                              </div>
                            ) : null}
                            {task.attachmentCount && task.attachmentCount > 0 ? (
                              <div className="flex items-center gap-0.5">
                                <Paperclip size={10} />
                                <span>{task.attachmentCount}</span>
                              </div>
                            ) : null}
                          </div>

                          {assignee ? (
                            <img
                              src={assignee.profile.avatar_url}
                              alt=""
                              title={assignee.profile.full_name}
                              className="h-5.5 w-5.5 rounded-full object-cover border border-violet-200 dark:border-violet-800"
                            />
                          ) : (
                            <div className="rounded-full bg-violet-50 dark:bg-violet-950/40 p-0.5 text-slate-400 border border-violet-100/50 dark:border-violet-900/30" title="Unassigned">
                              <User size={12} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {col.tasks.length === 0 && (
                    <div className="py-8 text-center text-slate-500 text-[10px]">No tasks in {col.name.toLowerCase()}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // List View (Table layout)
        <div className="overflow-hidden glass-panel rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-violet-100 dark:border-violet-900/30 bg-violet-50/20 dark:bg-violet-950/20 text-slate-700 dark:text-slate-350 uppercase tracking-wider font-bold">
                  <th className="px-5 py-3.5">Task Title</th>
                  <th className="px-5 py-3.5">Project</th>
                  <th className="px-5 py-3.5">Team</th>
                  <th className="px-5 py-3.5">Priority</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Due Date</th>
                  <th className="px-5 py-3.5">Assignee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-100/30 dark:divide-violet-900/10">
                {filteredTasks.map(task => {
                  const assignee = members.find(m => m.user_id === task.assignee_id);
                  const proj = projects.find(p => p.id === task.project_id);
                  const taskTeamId = task.team_id || (proj && proj.team_id);
                  const team = teams.find(t => t.id === taskTeamId);
                  const isOverdue = task.due_date && new Date(task.due_date) < now && task.status !== 'completed';

                  return (
                    <tr 
                      key={task.id}
                      onClick={() => handleOpenTaskDetails(task)}
                      className="hover:bg-violet-50/20 dark:hover:bg-violet-900/10 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs hover:text-violet-600 dark:hover:text-violet-400 transition-colors">{task.title}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-slate-500 dark:text-slate-400 font-semibold">{proj ? proj.name : 'N/A'}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        {team ? (
                          <span 
                            className="rounded px-2 py-0.5 text-[10px] font-bold uppercase border border-violet-100/10"
                            style={{ backgroundColor: `${team.color}15`, color: team.color }}
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
                          <div className="absolute left-1/2 -translate-x-1/2 mt-1.5 z-30 w-32 rounded-xl p-1.5 shadow-2xl animate-dropdown glass-panel bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-violet-100 dark:border-violet-900/30">
                            {['low', 'medium', 'high', 'critical'].map(prio => (
                              <button
                                key={prio}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setActivePrioritySelector(null);
                                  await updateTask(task.id, { priority: prio as any });
                                  loadAllTasks();
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
                          <div className="absolute left-1/2 -translate-x-1/2 mt-1.5 z-30 w-32 rounded-xl p-1.5 shadow-2xl animate-dropdown glass-panel bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-violet-100 dark:border-violet-900/30">
                            {['backlog', 'todo', 'in_progress', 'review', 'completed'].map(st => (
                              <button
                                key={st}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setActiveStatusSelector(null);
                                  await updateTask(task.id, { status: st as any });
                                  loadAllTasks();
                                }}
                                className={`w-full text-center text-[10px] font-bold uppercase py-2 px-1.5 my-0.5 rounded transition-all ${getStatusColorMonday(st)}`}
                              >
                                {st.replace('_', ' ')}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`font-semibold ${isOverdue ? 'text-rose-500 dark:text-rose-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                          {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {assignee ? (
                            <>
                              <img src={assignee.profile.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover border border-violet-200 dark:border-violet-800" />
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
                    <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                      No tasks match current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {isNewTaskOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-slate-850 dark:text-slate-100 glass-panel bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-violet-100 dark:border-violet-900/30">
            <div className="flex items-center justify-between border-b border-violet-100 dark:border-violet-900/30 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Workspace Task</h3>
              <button
                onClick={() => setIsNewTaskOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-violet-100 dark:hover:bg-violet-900/50 hover:text-slate-700 dark:hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateTask} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Select Project *</label>
                <select
                  required
                  value={taskProjId}
                  onChange={(e) => setTaskProjId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl p-2.5 text-sm focus:outline-none cursor-pointer glass-input text-slate-700 dark:text-slate-300"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Build API integration handlers"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="mt-1.5 w-full rounded-xl p-2.5 text-sm focus:outline-none glass-input text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Description</label>
                <textarea
                  placeholder="Describe task directives..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  rows={2}
                  className="mt-1.5 w-full rounded-xl p-2.5 text-sm focus:outline-none resize-none glass-input text-slate-850 dark:text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Assign To Team</label>
                  <select
                    value={taskTeamId}
                    onChange={(e) => setTaskTeamId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl p-2.5 text-sm focus:outline-none cursor-pointer glass-input text-slate-700 dark:text-slate-300"
                  >
                    <option value="">No Team</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Assign To Member</label>
                  <select
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    className="mt-1.5 w-full rounded-xl p-2.5 text-sm focus:outline-none cursor-pointer glass-input text-slate-700 dark:text-slate-300"
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
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Priority Level</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="mt-1.5 w-full rounded-xl p-2.5 text-sm focus:outline-none cursor-pointer glass-input text-slate-850 dark:text-slate-200"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="mt-1.5 w-full rounded-xl p-2.5 text-sm focus:outline-none glass-input text-slate-850 dark:text-slate-200 [color-scheme:dark]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Labels (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="Design, Frontend, Bug"
                  value={taskLabels}
                  onChange={(e) => setTaskLabels(e.target.value)}
                  className="mt-1.5 w-full rounded-xl p-2.5 text-sm focus:outline-none glass-input text-slate-850 dark:text-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-violet-100 dark:border-violet-900/30">
                <button
                  type="button"
                  onClick={() => setIsNewTaskOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl px-4 py-2.5 text-sm font-bold text-white btn-brand"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task detail drawer (Linear style side pane) */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl h-screen flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-250 glass-panel bg-white/95 dark:bg-slate-955/95 border-l border-violet-100 dark:border-violet-900/30">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-violet-100 dark:border-violet-900/30 p-5 text-slate-850 dark:text-white bg-white/50 dark:bg-slate-950/50">
              <div className="flex items-center gap-2">
                <KanbanSquare className="text-violet-500" size={18} />
                <span className="text-xs font-semibold text-slate-500">Task Workspace</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeleteTask(selectedTask.id)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-violet-100/50 dark:hover:bg-violet-900/50 hover:text-rose-500 transition-colors"
                  title="Delete Task"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-violet-100/50 dark:hover:bg-violet-900/50 hover:text-slate-800 dark:hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable details */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {!isEditingTask ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-800 dark:text-white leading-snug">{selectedTask.title}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed whitespace-pre-line">
                        {selectedTask.description || 'No description provided.'}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsEditingTask(true)}
                      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-850 dark:hover:text-white font-bold rounded-lg bg-violet-50/50 dark:bg-violet-955/50 hover:bg-violet-100/80 dark:hover:bg-violet-900/50 px-3 py-1.5 border border-violet-100 dark:border-violet-900/30 shrink-0 shadow-xs transition-all"
                    >
                      <Edit size={12} />
                      <span>Edit</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 rounded-xl p-4 glass-card border border-violet-100/50 dark:border-violet-900/20 bg-white/40 dark:bg-slate-900/10">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Assignee</span>
                      <div className="mt-1.5 flex items-center gap-2">
                        {members.find(m => m.user_id === selectedTask.assignee_id) ? (
                          <>
                            <img
                              src={members.find(m => m.user_id === selectedTask.assignee_id)?.profile.avatar_url}
                              alt=""
                              className="h-6 w-6 rounded-full object-cover border border-violet-200 dark:border-violet-850"
                            />
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {members.find(m => m.user_id === selectedTask.assignee_id)?.profile.full_name}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 font-semibold">Unassigned</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Priority</span>
                      <div className="mt-1.5">
                        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${getPriorityBadgeColor(selectedTask.priority)}`}>
                          {selectedTask.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleUpdateTaskDetails} className="space-y-4 rounded-xl p-4 animate-in fade-in duration-200 glass-card bg-white/40 dark:bg-slate-900/10 border border-violet-100/50 dark:border-violet-900/20">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Task Title *</label>
                    <input
                      type="text"
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="mt-1.5 w-full rounded-xl p-2 text-xs focus:outline-none glass-input text-slate-805 dark:text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Description</label>
                    <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      rows={3}
                      className="mt-1.5 w-full rounded-xl p-2 text-xs text-slate-850 dark:text-slate-200 focus:outline-none resize-none glass-input"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assignee</label>
                      <select
                        value={editAssignee}
                        onChange={(e) => setEditAssignee(e.target.value)}
                        className="mt-1.5 w-full rounded-xl p-2 text-xs focus:outline-none glass-input text-slate-700 dark:text-slate-300"
                      >
                        <option value="">Unassigned</option>
                        {members.map(m => (
                          <option key={m.user_id} value={m.user_id}>{m.profile.full_name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Priority</label>
                      <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value as any)}
                        className="mt-1.5 w-full rounded-xl p-2 text-xs focus:outline-none glass-input text-slate-707 dark:text-slate-300"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-violet-100 dark:border-violet-900/30 pt-3">
                    <button
                      type="button"
                      onClick={() => setIsEditingTask(false)}
                      className="rounded-lg px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 hover:text-slate-800 dark:hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg px-3 py-1.5 text-xs font-bold text-white btn-brand"
                    >
                      Save Updates
                    </button>
                  </div>
                </form>
              )}

              {/* Checklist */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">
                  <CheckSquare size={14} className="text-violet-500" />
                  <span>Subtasks Checklist</span>
                </div>
                {taskChecklist.length > 0 && (
                  <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${Math.round((taskChecklist.filter(item => item.is_completed).length / taskChecklist.length) * 100)}%` }}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  {taskChecklist.map(item => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg p-2.5 glass-card border border-violet-100/50 dark:border-violet-900/20 bg-white/40 dark:bg-slate-900/10 shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={item.is_completed}
                          onChange={() => handleToggleChecklist(item.id, item.is_completed)}
                          className="h-4 w-4 rounded border-violet-300 dark:border-violet-805 text-violet-600 bg-slate-50 cursor-pointer focus:ring-0"
                        />
                        <span className={`text-xs text-slate-705 dark:text-slate-200 ${item.is_completed ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
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
                    className="flex-1 rounded-xl p-2 text-xs focus:outline-none glass-input text-slate-800 dark:text-slate-200"
                  />
                  <button type="submit" className="rounded-xl px-4 py-2 text-xs font-bold text-white btn-brand">Add</button>
                </form>
              </div>

              {/* Attachments */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-350 text-xs uppercase tracking-wider">
                  <Paperclip size={14} className="text-violet-500" />
                  <span>Task Attachments</span>
                </div>
                <div className="space-y-2">
                  {taskAttachments.map(file => (
                    <div key={file.id} className="flex items-center justify-between rounded-lg p-2 glass-card border border-violet-100/50 dark:border-violet-900/20 bg-white/40 dark:bg-slate-900/10 shadow-xs">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {file.file_type?.startsWith('image/') ? (
                          <img src={file.url} alt="" className="h-8 w-8 rounded object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-violet-100 dark:bg-violet-950/80 border border-violet-200 dark:border-violet-800 text-[9px] font-bold text-violet-500">DOC</div>
                        )}
                        <div className="truncate">
                          <p className="text-xs text-slate-805 dark:text-slate-200 truncate">{file.name}</p>
                          <p className="text-[9px] text-slate-450">{(file.size / 1024).toFixed(0)} KB</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {file.url !== '#' && (
                          <a href={file.url} download={file.name} className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"><Download size={12} /></a>
                        )}
                        <button 
                          onClick={() => {
                            setTaskAttachments(prev => prev.filter(a => a.id !== file.id));
                            deleteAttachment(file.id);
                            loadAllTasks();
                          }} 
                          className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <label className="flex items-center justify-center w-full h-16 rounded-xl border border-dashed border-violet-205 dark:border-violet-850/50 bg-white/30 dark:bg-slate-950/10 hover:border-violet-500/50 hover:bg-violet-50/20 dark:hover:bg-violet-950/30 cursor-pointer transition-all shadow-xs">
                  <div className="flex flex-col items-center gap-1 text-slate-400 dark:text-slate-500">
                    <Upload size={16} className="text-violet-500" />
                    <span className="text-[10px] font-bold">Upload computer resources</span>
                  </div>
                  <input type="file" onChange={handleAddFileAttachment} className="hidden" />
                </label>
              </div>

              {/* Comments */}
              <div className="space-y-4">
                <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-350 text-xs uppercase tracking-wider">
                  <MessageSquare size={14} className="text-violet-500" />
                  <span>Discussion Comments</span>
                </div>
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Leave a comment reply..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="flex-1 rounded-xl p-2.5 text-xs focus:outline-none glass-input text-slate-850 dark:text-slate-200"
                  />
                  <button type="submit" className="rounded-xl px-4 py-2 text-xs font-bold text-white btn-brand">Reply</button>
                </form>

                <div className="space-y-3.5">
                  {taskComments.map(comm => (
                    <div key={comm.id} className="flex gap-3 text-xs">
                      {comm.profile?.avatar_url ? (
                        <img src={comm.profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover border border-violet-200 dark:border-violet-850" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400 font-bold border border-violet-200 dark:border-violet-800 text-xs">{(comm.profile?.full_name || 'US').substring(0, 2).toUpperCase()}</div>
                      )}
                      <div className="flex-1 rounded-xl p-3 glass-card border border-violet-100/50 dark:border-violet-900/20 bg-white/40 dark:bg-slate-900/10 shadow-xs animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{comm.profile?.full_name}</span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500">{new Date(comm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="mt-1 text-slate-600 dark:text-slate-300 leading-relaxed">{renderMentionedText(comm.content)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
