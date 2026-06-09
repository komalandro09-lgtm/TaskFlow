import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../supabaseClient';
import type { Project, Task, WorkspaceMember } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import { 
  KanbanSquare, 
  Files, 
  Calendar, 
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
  Send
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
    getProjectMessages,
    sendProjectMessage,
    activities,
    refreshWorkspaceData
  } = useWorkspace();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectAttachments, setProjectAttachments] = useState<any[]>([]);
  const [projectMessages, setProjectMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [activeTab, setActiveTab] = useState<'kanban' | 'files' | 'chat'>('kanban');
  const [loading, setLoading] = useState(true);
  const now = new Date();

  // Mentions state
  const [mentionSuggestions, setMentionSuggestions] = useState<WorkspaceMember[]>([]);
  const [mentionInputId, setMentionInputId] = useState<'comment' | 'chat' | null>(null);
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
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [editDueDate, setEditDueDate] = useState('');

  useEffect(() => {
    const proj = projects.find(p => p.id === projectId);
    if (proj) {
      setProject(proj);
      loadTasks();
      loadChatMessages();
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

  const loadChatMessages = async () => {
    if (!projectId) return;
    const { messages } = await getProjectMessages(projectId);
    setProjectMessages(messages);
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
      labels: labelsArray
    });

    if (!error && task) {
      setIsNewTaskModalOpen(false);
      setTaskTitle('');
      setTaskDesc('');
      setTaskAssignee('');
      setTaskPriority('medium');
      setTaskDueDate('');
      setTaskLabels('');
      loadTasks();
      loadChatMessages();
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
      loadTasks();
      loadChatMessages();
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
    if (confirm('Are you sure you want to delete this task? This action is permanent.')) {
      await deleteTask(taskId);
      handleCloseTaskDetails();
      loadTasks();
      loadChatMessages();
      refreshWorkspaceData();
    }
  };

  // -------------------------------------------------------------
  // HTML5 Native Drag & Drop Implementation
  // -------------------------------------------------------------
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

    // Optimistically update local task status
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: targetStatus } : t));

    // Update in DB
    const { error } = await updateTask(taskId, { status: targetStatus });
    if (!error) {
      loadTasks();
      loadChatMessages();
      refreshWorkspaceData();
    } else {
      loadTasks();
    }
  };

  // -------------------------------------------------------------
  // Task Details Modal Fetching & Operations
  // -------------------------------------------------------------
  const handleOpenTaskDetails = async (task: Task) => {
    setSelectedTask(task);
    setIsEditingTask(false);
    
    // Set edit defaults
    setEditTitle(task.title);
    setEditDesc(task.description);
    setEditAssignee(task.assignee_id || '');
    setEditPriority(task.priority);
    setEditDueDate(task.due_date ? new Date(task.due_date).toISOString().substring(0, 10) : '');

    // Load checklists, comments, attachments
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
      loadChatMessages();
      refreshWorkspaceData();
    }
  };

  const handleToggleChecklist = async (itemId: string, currentStatus: boolean) => {
    setTaskChecklist(prev => prev.map(item => item.id === itemId ? { ...item, is_completed: !currentStatus } : item));
    await toggleChecklistItem(itemId, !currentStatus);
    loadTasks();
    loadChatMessages();
    refreshWorkspaceData();
  };

  const handleDeleteChecklist = async (itemId: string) => {
    setTaskChecklist(prev => prev.filter(item => item.id !== itemId));
    await deleteChecklistItem(itemId);
    loadTasks();
    loadChatMessages();
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
      loadChatMessages();
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
        loadChatMessages();
        refreshWorkspaceData();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !projectId) return;

    const { message } = await sendProjectMessage(projectId, chatInput);
    if (message) {
      setProjectMessages(prev => [...prev, message]);
      setChatInput('');
      refreshWorkspaceData();
    }
  };

  // Mentions helper
  const handleTextChange = (text: string, inputType: 'comment' | 'chat') => {
    if (inputType === 'comment') {
      setNewCommentText(text);
    } else {
      setChatInput(text);
    }

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
        (m.profile?.full_name || '').toLowerCase().includes(query.toLowerCase()) ||
        (m.profile?.email || '').toLowerCase().includes(query.toLowerCase())
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
    if (mentionInputId === 'comment') {
      const beforeAt = newCommentText.slice(0, mentionIndex);
      const updatedText = beforeAt + `@${memberName} `;
      setNewCommentText(updatedText);
    } else if (mentionInputId === 'chat') {
      const beforeAt = chatInput.slice(0, mentionIndex);
      const updatedText = beforeAt + `@${memberName} `;
      setChatInput(updatedText);
    }
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
            <span key={index} className="inline-block rounded-md bg-brand-500/10 dark:bg-brand-500/20 px-1 py-0.5 text-brand-600 dark:text-brand-400 font-bold border border-brand-500/20 shadow-xs">
              {part}
            </span>
          );
        }
      }
      return part;
    });
  };

  // Compile unified timeline of activity logs + chat messages
  const projectTaskNames = tasks.map(t => t.title);
  const projectActivities = activities.filter(act => {
    if (act.workspace_id !== activeWorkspace?.id) return false;
    if (act.target_type === 'project' && act.target_name === project?.name) return true;
    if (act.target_type === 'task' && projectTaskNames.includes(act.target_name)) return true;
    return false;
  });

  const formattedActivities = projectActivities.map(act => ({
    id: act.id,
    created_at: act.created_at,
    type: 'activity',
    action: act.action,
    target_type: act.target_type,
    target_name: act.target_name,
    profile: act.profile,
    user_id: act.user_id
  }));

  const formattedMessages = projectMessages.map(msg => ({
    id: msg.id,
    created_at: msg.created_at,
    type: 'chat',
    content: msg.content,
    user_id: msg.user_id,
    profile: msg.profile
  }));

  const combinedTimeline = [...formattedActivities, ...formattedMessages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // -------------------------------------------------------------
  // Filter Operations
  // -------------------------------------------------------------
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (t.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAssignee = filterAssignee === 'all' || t.assignee_id === filterAssignee;
    const matchesPriority = filterPriority === 'all' || t.priority === filterPriority;

    return matchesSearch && matchesAssignee && matchesPriority;
  });

  // Organize tasks by column status
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
      case 'high': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'medium': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      default: return 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-350 dark:border-slate-700/50';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-full flex flex-col transition-colors duration-200">
      {/* Sub-Header Metadata summary */}
      {project && (
        <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${getPriorityBadgeColor(project.priority)}`}>
                {project.priority} priority
              </span>
              <span className="rounded bg-slate-200 dark:bg-slate-850 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                {project.status}
              </span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-white md:text-3xl">{project.name}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{project.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <Calendar size={14} />
              <span>Due: {project.due_date || 'No due date'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={14} />
              <span>Start: {project.start_date || 'N/A'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs list */}
      <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-850">
        <button
          onClick={() => setActiveTab('kanban')}
          className={`flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition-all ${
            activeTab === 'kanban' 
              ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-bold' 
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <KanbanSquare size={16} />
          <span>Kanban Board</span>
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition-all ${
            activeTab === 'chat' 
              ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-bold' 
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <MessageSquare size={16} />
          <span>Team Chat & Stream</span>
          <span className="rounded-full bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-600 dark:text-slate-450 font-bold">
            {projectMessages.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition-all ${
            activeTab === 'files' 
              ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-bold' 
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Files size={16} />
          <span>File Repository</span>
          <span className="rounded-full bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-600 dark:text-slate-450 font-bold">
            {projectAttachments.length}
          </span>
        </button>
      </div>

      {activeTab === 'kanban' && (
        // -------------------------------------------------------------
        // KANBAN BOARD TAB
        // -------------------------------------------------------------
        <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
          {/* Kanban Inline Filters */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/10 p-3 sm:flex-row sm:items-center shadow-xs">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-3 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search board tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-100/50 dark:bg-slate-950/40 py-2 pl-9 pr-4 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:border-brand-500/80 focus:bg-white dark:focus:bg-slate-950 focus:outline-none"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 py-2 px-3 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="all">All Assignees</option>
                {members.map(m => (
                  <option key={m.user_id} value={m.user_id}>{m.profile.full_name}</option>
                ))}
              </select>

              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 py-2 px-3 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Kanban columns flex row */}
          <div className="flex-1 overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-[1000px] h-full items-start">
              {Object.entries(columns).map(([colStatus, col]) => (
                <div
                  key={colStatus}
                  onDragOver={(e) => handleDragOver(e, colStatus)}
                  onDrop={(e) => handleDrop(e, colStatus)}
                  className={`flex w-72 flex-col rounded-2xl border bg-white dark:bg-slate-900/10 p-3 transition-colors shadow-xs ${
                    draggedOverCol === colStatus 
                      ? 'border-brand-500/80 bg-brand-500/[0.02]' 
                      : 'border-slate-200 dark:border-slate-850'
                  }`}
                >
                  {/* Column Header */}
                  <div className="mb-4 flex items-center justify-between px-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 tracking-wide">{col.name}</span>
                      <span className="rounded-full bg-slate-200 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                        {col.tasks.length}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setNewTasksCol(colStatus as any);
                        setIsNewTaskModalOpen(true);
                      }}
                      className="rounded-lg p-1 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850 hover:text-slate-700 dark:hover:text-slate-300"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Tasks List */}
                  <div className="space-y-3 min-h-[300px] overflow-y-auto">
                    {col.tasks.map((task) => {
                      const assignee = members.find(m => m.user_id === task.assignee_id);
                      const isOverdue = task.due_date && new Date(task.due_date) < now && task.status !== 'completed';

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onClick={() => handleOpenTaskDetails(task)}
                          className="group rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-900/30 p-4 shadow-xs hover:border-slate-350 dark:hover:border-slate-700/80 hover:bg-white dark:hover:bg-slate-900/50 transition-all duration-200 cursor-grab active:cursor-grabbing"
                        >
                          {/* Priority badge */}
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

                          {/* Task Title */}
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-colors line-clamp-2">
                            {task.title}
                          </h4>

                          {/* Labels */}
                          {task.labels && task.labels.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-1">
                              {task.labels.map((lbl, i) => (
                                <span key={i} className="rounded bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                                  {lbl}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Footer details: assignee and logs */}
                          <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-850/50 pt-3 text-[10px] text-slate-500 dark:text-slate-450 font-semibold">
                            <div className="flex items-center gap-2">
                              {task.checklistCount && task.checklistCount.total > 0 && (
                                <div className="flex items-center gap-0.5" title="Checklist progress">
                                  <CheckSquare size={10} />
                                  <span>{task.checklistCount.completed}/{task.checklistCount.total}</span>
                                </div>
                              )}
                              {task.commentCount && task.commentCount > 0 ? (
                                <div className="flex items-center gap-0.5" title="Comments count">
                                  <MessageSquare size={10} />
                                  <span>{task.commentCount}</span>
                                </div>
                              ) : null}
                              {task.attachmentCount && task.attachmentCount > 0 ? (
                                <div className="flex items-center gap-0.5" title="Files attached">
                                  <Paperclip size={10} />
                                  <span>{task.attachmentCount}</span>
                                </div>
                              ) : null}
                            </div>

                            {/* Assignee Avatar */}
                            {assignee ? (
                              <img
                                src={assignee.profile.avatar_url}
                                alt={assignee.profile.full_name}
                                title={assignee.profile.full_name}
                                className="h-5.5 w-5.5 rounded-full object-cover border border-slate-200 dark:border-slate-800"
                              />
                            ) : (
                              <div className="rounded-full bg-slate-200 dark:bg-slate-850 p-0.5 text-slate-400 dark:text-slate-600" title="Unassigned">
                                <User size={12} />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'chat' && (
        // -------------------------------------------------------------
        // TEAM CHAT & STREAM TAB
        // -------------------------------------------------------------
        <div className="flex-1 flex flex-col space-y-4 overflow-hidden border border-slate-250 dark:border-slate-800 bg-white/60 dark:bg-slate-900/10 rounded-2xl p-4 shadow-sm h-[600px]">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Unified Team Stream</h3>
              <p className="text-xs text-slate-500">Real-time workspace collaboration logs and member conversations.</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1 scroll-smooth">
            {combinedTimeline.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500">
                <MessageSquare className="stroke-[1.5] mb-2 text-slate-400" size={32} />
                <p className="text-xs font-bold text-slate-650 dark:text-slate-450">Empty Stream Log</p>
                <p className="text-[10px] text-slate-400 max-w-xs mt-1">Send a message to team chat or complete/update tasks to write to the timeline.</p>
              </div>
            ) : (
              combinedTimeline.map((item: any) => {
                if (item.type === 'activity') {
                  return (
                    <div key={item.id} className="flex items-center justify-center py-1.5">
                      <div className="flex items-center gap-2 rounded-full border border-slate-200/80 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/50 px-4 py-1.5 text-[11px] text-slate-600 dark:text-slate-400 font-semibold shadow-xs">
                        <Clock size={10} className="text-slate-400" />
                        <span>
                          <strong className="text-slate-800 dark:text-slate-200">{item.profile?.full_name || 'System User'}</strong>
                          {' '}{item.action}{' '}
                          <span className="rounded bg-slate-200 dark:bg-slate-800/80 px-1.5 py-0.5 text-[10px] font-mono text-slate-700 dark:text-slate-300">
                            {item.target_type}: {item.target_name}
                          </span>
                        </span>
                        <span className="text-[9px] text-slate-450 dark:text-slate-500">
                          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                } else {
                  const isCurrentUser = item.user_id === currentUser?.id;
                  return (
                    <div key={item.id} className={`flex gap-3 text-xs ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                      {item.profile?.avatar_url ? (
                        <img src={item.profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover border border-slate-250 dark:border-slate-800 self-end mb-1 shadow-sm" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-855 font-bold border border-slate-350 self-end mb-1 shadow-sm text-slate-600 dark:text-slate-400">
                          {(item.profile?.full_name || 'US').substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      
                      <div className={`flex flex-col max-w-[70%] ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px]">
                          <span className="font-bold text-slate-800 dark:text-slate-300">{item.profile?.full_name}</span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500">
                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className={`rounded-2xl p-3 border shadow-xs ${
                          isCurrentUser 
                            ? 'bg-brand-600 border-brand-500 text-white rounded-br-none' 
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none'
                        }`}>
                          <p className="leading-relaxed whitespace-pre-wrap">{renderMentionedText(item.content)}</p>
                        </div>
                      </div>
                    </div>
                  );
                }
              })
            )}
          </div>

          {/* Message input bar */}
          <form onSubmit={handleSendChatMessage} className="flex gap-2 relative">
            <input
              type="text"
              required
              placeholder="Send message to team chat (use @ to mention)..."
              value={chatInput}
              onChange={(e) => handleTextChange(e.target.value, 'chat')}
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-450 dark:placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
            />
            {/* Mentions autocomplete list */}
            {mentionInputId === 'chat' && mentionSuggestions.length > 0 && (
              <div className="absolute bottom-full left-0 z-50 mb-1 w-64 rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 p-1.5 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-100">
                <p className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">Workspace Teammates</p>
                <div className="max-h-40 overflow-y-auto">
                  {mentionSuggestions.map(member => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => handleSelectMention(member.profile.full_name)}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <img src={member.profile.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
                      <div className="truncate">
                        <p className="font-bold">{member.profile.full_name}</p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500">{member.profile.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button
              type="submit"
              className="rounded-xl bg-brand-600 px-5 py-3 text-xs font-bold text-white hover:bg-brand-500 transition-colors shadow-md shadow-brand-500/10 flex items-center gap-1.5"
            >
              <span>Send</span>
              <Send size={12} />
            </button>
          </form>
        </div>
      )}

      {activeTab === 'files' && (
        // -------------------------------------------------------------
        // FILE REPOSITORY TAB
        // -------------------------------------------------------------
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Workspace Attachments</h3>
              <p className="text-xs text-slate-500">Collects all files uploaded across the project tasks checklist.</p>
            </div>
          </div>

          {projectAttachments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-850 py-16 text-center">
              <Upload className="mx-auto text-slate-400 dark:text-slate-600 mb-3" size={32} />
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400">No Files Uploaded Yet</h4>
              <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-1 max-w-xs mx-auto">Open a Kanban task card and attach files under task resources.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {projectAttachments.map((file: any) => {
                const isImage = file.file_type?.startsWith('image/');
                const sizeKb = Math.round(file.size / 1024) || 0;

                return (
                  <div key={file.id} className="group relative flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900/20 p-3 hover:border-slate-350 dark:hover:border-slate-700/80 transition-colors shadow-xs">
                    {/* Visual Preview Box */}
                    <div className="flex h-28 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-950 overflow-hidden relative border border-slate-200 dark:border-slate-900">
                      {isImage && file.url !== '#' ? (
                        <img src={file.url} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200" />
                      ) : (
                        <div className="text-slate-400 dark:text-slate-650 flex flex-col items-center gap-1.5">
                          <ImageIcon size={28} />
                          <span className="text-[8px] font-bold tracking-widest uppercase text-slate-500">
                            {file.name.split('.').pop()}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 overflow-hidden">
                      <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-[8px] text-slate-450 dark:text-slate-500 mt-0.5 font-semibold">Size: {sizeKb} KB</p>
                    </div>

                    {/* Download option */}
                    <div className="absolute right-2.5 top-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {file.url !== '#' && (
                        <a
                          href={file.url}
                          download={file.name}
                          className="flex h-6 w-6 items-center justify-center rounded-lg bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-slate-800 dark:hover:text-white shadow-sm"
                        >
                          <Download size={12} />
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

      {/* -------------------------------------------------------------
          MODAL: CREATE TASK
          ------------------------------------------------------------- */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Add Task to: {newTasksCol}</h3>
              <button
                onClick={() => setIsNewTaskModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateTask} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Build API integration handlers"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 p-2.5 text-sm text-slate-850 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Description</label>
                <textarea
                  placeholder="Briefly describe what needs to be done..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  rows={2}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 p-2.5 text-sm text-slate-850 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:border-brand-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Assign To</label>
                <select
                  value={taskAssignee}
                  onChange={(e) => setTaskAssignee(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:border-brand-500 focus:outline-none cursor-pointer"
                >
                  <option value="">Unassigned</option>
                  {members.map(m => (
                    <option key={m.user_id} value={m.user_id}>{m.profile.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Priority Level</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:border-brand-500 focus:outline-none cursor-pointer"
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
                    className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:border-brand-500 focus:outline-none [color-scheme:dark]"
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
                  className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 p-2.5 text-sm text-slate-850 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 transition-colors shadow-md shadow-brand-500/20"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL: TASK DETAILS (Checklist, Comments, Attachments)
          ------------------------------------------------------------- */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl h-screen bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-250">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-850 p-6 text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <KanbanSquare className="text-brand-500 dark:text-brand-400" size={18} />
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Task Details & Workspace Resources</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDeleteTask(selectedTask.id)}
                  title="Delete Task"
                  className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-rose-500 dark:hover:text-rose-400"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={handleCloseTaskDetails}
                  className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-800 dark:hover:text-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Content Scrollable Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white dark:bg-slate-950">
              {!isEditingTask ? (
                // VIEW DETAILS PANEL
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{selectedTask.title}</h3>
                      <p className="text-xs text-slate-650 dark:text-slate-400 mt-2 leading-relaxed whitespace-pre-line">
                        {selectedTask.description || 'No description provided.'}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsEditingTask(true)}
                      className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white font-semibold rounded-lg bg-slate-100 dark:bg-slate-900 px-3 py-1.5 border border-slate-200 dark:border-slate-800 transition-colors shrink-0 shadow-xs"
                    >
                      <Edit size={12} />
                      <span>Edit</span>
                    </button>
                  </div>

                  {/* Badges Grid */}
                  <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-100/30 dark:bg-slate-900/20 p-4 border border-slate-200 dark:border-slate-850/50">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Assignee</span>
                      <div className="mt-1.5 flex items-center gap-2">
                        {members.find(m => m.user_id === selectedTask.assignee_id) ? (
                          <>
                            <img
                              src={members.find(m => m.user_id === selectedTask.assignee_id)?.profile.avatar_url}
                              alt=""
                              className="h-6 w-6 rounded-full object-cover border border-slate-200"
                            />
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {members.find(m => m.user_id === selectedTask.assignee_id)?.profile.full_name}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400 dark:text-slate-600">Unassigned</span>
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
                // EDIT DETAILS PANEL FORM
                <form onSubmit={handleUpdateTaskDetails} className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/10 p-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Task Title *</label>
                    <input
                      type="text"
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 p-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Description</label>
                    <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      rows={3}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 p-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-500 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assignee</label>
                      <select
                        value={editAssignee}
                        onChange={(e) => setEditAssignee(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 p-2 text-xs text-slate-800 dark:text-slate-250 focus:outline-none"
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
                        className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 p-2 text-xs text-slate-800 dark:text-slate-250 focus:outline-none"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-850">
                    <button
                      type="button"
                      onClick={() => setIsEditingTask(false)}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-855 dark:hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-500"
                    >
                      Save Updates
                    </button>
                  </div>
                </form>
              )}

              {/* 1. Checklist / Subtasks Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <CheckSquare size={16} className="text-brand-500 dark:text-brand-400" />
                  <h4 className="text-xs font-bold text-slate-755 dark:text-slate-200 uppercase tracking-wider">Subtasks Checklist</h4>
                </div>

                {/* Progress bar */}
                {taskChecklist.length > 0 && (
                  <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                      style={{
                        width: `${Math.round((taskChecklist.filter(item => item.is_completed).length / taskChecklist.length) * 100)}%`
                      }}
                    />
                  </div>
                )}

                {/* Items List */}
                <div className="space-y-1.5">
                  {taskChecklist.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-900/30 p-2.5 border border-slate-200 dark:border-slate-850/50 shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={item.is_completed}
                          onChange={() => handleToggleChecklist(item.id, item.is_completed)}
                          className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 text-brand-600 focus:ring-0 cursor-pointer"
                        />
                        <span className={`text-xs text-slate-700 dark:text-slate-200 ${item.is_completed ? 'line-through text-slate-400 dark:text-slate-550' : ''}`}>
                          {item.title}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteChecklist(item.id)}
                        className="text-slate-400 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-455"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Form to Add Item */}
                <form onSubmit={handleAddChecklist} className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Add subtask details..."
                    value={newChecklistTitle}
                    onChange={(e) => setNewChecklistTitle(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 p-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-brand-500"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750 hover:text-slate-900 dark:hover:text-white"
                  >
                    Add
                  </button>
                </form>
              </div>

              {/* 2. Attachments Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <Paperclip size={16} className="text-violet-500 dark:text-violet-400" />
                  <h4 className="text-xs font-bold text-slate-755 dark:text-slate-200 uppercase tracking-wider">Resources & Task Files</h4>
                </div>

                <div className="space-y-2">
                  {taskAttachments.map((file) => (
                    <div key={file.id} className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-900/30 p-2 border border-slate-200 dark:border-slate-850/50 shadow-xs">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {file.file_type?.startsWith('image/') ? (
                          <img src={file.url} alt="" className="h-8 w-8 rounded object-cover border border-slate-200 shadow-sm" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 dark:bg-slate-950 border border-slate-200 text-[9px] font-bold text-slate-500">
                            DOC
                          </div>
                        )}
                        <div className="truncate">
                          <p className="text-xs text-slate-800 dark:text-slate-200 truncate">{file.name}</p>
                          <p className="text-[9px] text-slate-450 dark:text-slate-500">{(file.size / 1024).toFixed(0)} KB</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {file.url !== '#' && (
                          <a
                            href={file.url}
                            download={file.name}
                            className="rounded p-1 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-800 dark:hover:text-white"
                          >
                            <Download size={12} />
                          </a>
                        )}
                        <button
                          onClick={() => {
                            setTaskAttachments(prev => prev.filter(a => a.id !== file.id));
                            deleteAttachment(file.id);
                            loadTasks();
                            refreshWorkspaceData();
                          }}
                          className="rounded p-1 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-rose-500 dark:hover:text-rose-400"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <label className="flex items-center justify-center w-full h-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 hover:border-brand-500/50 hover:bg-slate-100 dark:hover:bg-slate-950/40 cursor-pointer transition-all shadow-xs">
                  <div className="flex flex-col items-center gap-1 text-slate-400 dark:text-slate-500">
                    <Upload size={16} />
                    <span className="text-[10px] font-bold">Upload resources from PC</span>
                  </div>
                  <input
                    type="file"
                    onChange={handleAddFileAttachment}
                    className="hidden"
                  />
                </label>
              </div>

              {/* 3. Comments Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-1.5">
                  <MessageSquare size={16} className="text-brand-500 dark:text-brand-400" />
                  <h4 className="text-xs font-bold text-slate-755 dark:text-slate-200 uppercase tracking-wider">Comments Log</h4>
                </div>

                {/* Comment Form */}
                <form onSubmit={handleAddComment} className="flex gap-2 relative">
                  <input
                    type="text"
                    required
                    placeholder="Leave a comment reply (use @ to mention)..."
                    value={newCommentText}
                    onChange={(e) => handleTextChange(e.target.value, 'comment')}
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-650 focus:outline-none focus:border-brand-500"
                  />
                  {/* Comments suggestions dropdown */}
                  {mentionInputId === 'comment' && mentionSuggestions.length > 0 && (
                    <div className="absolute bottom-full left-0 z-50 mb-1 w-64 rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 p-1.5 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-100">
                      <p className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">Workspace Teammates</p>
                      <div className="max-h-40 overflow-y-auto">
                        {mentionSuggestions.map(member => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => handleSelectMention(member.profile.full_name)}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <img src={member.profile.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
                            <div className="truncate">
                              <p className="font-bold">{member.profile.full_name}</p>
                              <p className="text-[9px] text-slate-400 dark:text-slate-550">{member.profile.email}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <button
                    type="submit"
                    className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-500 shadow-sm"
                  >
                    Reply
                  </button>
                </form>

                {/* Comments List */}
                <div className="space-y-3.5">
                  {taskComments.map((comm) => (
                    <div key={comm.id} className="flex gap-3 text-xs">
                      {comm.profile?.avatar_url ? (
                        <img src={comm.profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover border border-slate-200 dark:border-slate-800 shadow-sm" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 font-bold border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 shadow-sm">
                          {(comm.profile?.full_name || 'US').substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-900/30 p-3 border border-slate-200 dark:border-slate-850/50 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{comm.profile?.full_name}</span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500">{new Date(comm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="mt-1 text-slate-650 dark:text-slate-300 leading-relaxed">{renderMentionedText(comm.content)}</p>
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

export default ProjectDetail;
