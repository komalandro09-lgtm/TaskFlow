import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';
import { supabase } from '../supabaseClient';
import type { Project, Task, WorkspaceMember } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import { 
  KanbanSquare, 
  Files, 
  Calendar, 
  Flag, 
  Search, 
  Filter, 
  Plus, 
  X, 
  User, 
  CheckSquare, 
  MessageSquare, 
  Paperclip,
  Trash2,
  Edit,
  Clock,
  ChevronRight,
  Briefcase,
  AlertTriangle,
  Upload,
  Download,
  Image as ImageIcon
} from 'lucide-react';

const ProjectDetail: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { 
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
    logActivity
  } = useWorkspace();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectAttachments, setProjectAttachments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'kanban' | 'files'>('kanban');
  const [loading, setLoading] = useState(true);
  const now = new Date();

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
    } else if (projects.length > 0) {
      // Navigate away if project not found
      navigate('/projects');
    }
  }, [projectId, projects]);

  const loadTasks = async () => {
    if (!projectId) return;
    setLoading(true);
    const { tasks: taskList } = await getProjectTasks(projectId);
    setTasks(taskList);

    // Fetch project attachments from Supabase, fallback to localStorage
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
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('Are you sure you want to delete this task? This action is permanent.')) {
      await deleteTask(taskId);
      setSelectedTask(null);
      loadTasks();
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
    if (error) {
      // Revert if error
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
    }
  };

  const handleToggleChecklist = async (itemId: string, currentStatus: boolean) => {
    setTaskChecklist(prev => prev.map(item => item.id === itemId ? { ...item, is_completed: !currentStatus } : item));
    await toggleChecklistItem(itemId, !currentStatus);
    loadTasks();
  };

  const handleDeleteChecklist = async (itemId: string) => {
    setTaskChecklist(prev => prev.filter(item => item.id !== itemId));
    await deleteChecklistItem(itemId);
    loadTasks();
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedTask) return;

    const { comment } = await addComment(selectedTask.id, newCommentText);
    if (comment) {
      setTaskComments(prev => [...prev, comment]);
      setNewCommentText('');
      loadTasks();
    }
  };

  const handleAddFileAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTask) return;

    // Mock file upload: read as base64 for image previews, or dummy references
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
      }
    };
    reader.readAsDataURL(file);
  };

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

  // Gather unique labels from tasks for visual filter
  const getPriorityBadgeColor = (prio: string) => {
    switch (prio) {
      case 'critical': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'high': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'medium': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default: return 'bg-slate-800 text-slate-400 border-slate-700/50';
    }
  };

  // Compile all attachments across the project for the file repo tab
  const projectFiles = projectAttachments;

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-full flex flex-col">
      {/* Sub-Header Metadata summary */}
      {project && (
        <div className="flex flex-col gap-4 border-b border-slate-800/80 pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${getPriorityBadgeColor(project.priority)}`}>
                {project.priority} priority
              </span>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase">
                {project.status}
              </span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">{project.name}</h2>
            <p className="text-sm text-slate-400 mt-1">{project.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
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
      <div className="flex items-center gap-4 border-b border-slate-850">
        <button
          onClick={() => setActiveTab('kanban')}
          className={`flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition-all ${
            activeTab === 'kanban' 
              ? 'border-brand-500 text-brand-400 font-bold' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <KanbanSquare size={16} />
          <span>Kanban Board</span>
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition-all ${
            activeTab === 'files' 
              ? 'border-brand-500 text-brand-400 font-bold' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Files size={16} />
          <span>File Repository</span>
          <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
            {projectFiles.length}
          </span>
        </button>
      </div>

      {activeTab === 'kanban' ? (
        // -------------------------------------------------------------
        // KANBAN BOARD TAB
        // -------------------------------------------------------------
        <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
          {/* Kanban Inline Filters */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/10 p-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search board tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-800/80 bg-slate-950/40 py-2 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-600 focus:border-brand-500/80 focus:bg-slate-950 focus:outline-none"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
                className="rounded-xl border border-slate-800/80 bg-slate-950/40 py-2 px-3 text-xs text-slate-300 focus:outline-none"
              >
                <option value="all">All Assignees</option>
                {members.map(m => (
                  <option key={m.user_id} value={m.user_id}>{m.profile.full_name}</option>
                ))}
              </select>

              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="rounded-xl border border-slate-800/80 bg-slate-950/40 py-2 px-3 text-xs text-slate-300 focus:outline-none"
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
                  className={`flex w-72 flex-col rounded-2xl border bg-slate-900/10 p-3 transition-colors ${
                    draggedOverCol === colStatus 
                      ? 'border-brand-500/80 bg-brand-500/[0.02]' 
                      : 'border-slate-850'
                  }`}
                >
                  {/* Column Header */}
                  <div className="mb-4 flex items-center justify-between px-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200 tracking-wide">{col.name}</span>
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                        {col.tasks.length}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setNewTasksCol(colStatus as any);
                        setIsNewTaskModalOpen(true);
                      }}
                      className="rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300"
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
                          className="group rounded-xl border border-slate-850 bg-slate-900/30 p-4 shadow hover:border-slate-700/80 hover:bg-slate-900/50 transition-all duration-200 cursor-grab active:cursor-grabbing"
                        >
                          {/* Priority badge */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className={`rounded px-1.5 py-0.5 text-[8px] font-extrabold uppercase border ${getPriorityBadgeColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            
                            {isOverdue && (
                              <span className="flex items-center gap-0.5 text-[8px] font-bold text-rose-400">
                                <AlertTriangle size={8} className="animate-pulse" />
                                <span>Overdue</span>
                              </span>
                            )}
                          </div>

                          {/* Task Title */}
                          <h4 className="text-xs font-bold text-slate-200 group-hover:text-brand-400 transition-colors line-clamp-2">
                            {task.title}
                          </h4>

                          {/* Labels */}
                          {task.labels && task.labels.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-1">
                              {task.labels.map((lbl, i) => (
                                <span key={i} className="rounded bg-slate-800 px-1.5 py-0.5 text-[8px] font-bold text-slate-400 uppercase">
                                  {lbl}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Footer details: assignee and logs */}
                          <div className="mt-4 flex items-center justify-between border-t border-slate-850/50 pt-3 text-[10px] text-slate-500 font-semibold">
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
                                className="h-5.5 w-5.5 rounded-full object-cover border border-slate-800"
                              />
                            ) : (
                              <div className="rounded-full bg-slate-800 p-0.5 text-slate-600" title="Unassigned">
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
      ) : (
        // -------------------------------------------------------------
        // FILE REPOSITORY TAB
        // -------------------------------------------------------------
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-200">Workspace Attachments</h3>
              <p className="text-xs text-slate-500">Collects all files uploaded across the project tasks checklist.</p>
            </div>
          </div>

          {projectFiles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-850 py-16 text-center">
              <Upload className="mx-auto text-slate-600 mb-3" size={32} />
              <h4 className="text-xs font-bold text-slate-400">No Files Uploaded Yet</h4>
              <p className="text-[10px] text-slate-600 mt-1 max-w-xs mx-auto">Open a Kanban task card and attach files under task resources.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {projectFiles.map((file: any) => {
                const isImage = file.file_type?.startsWith('image/');
                const sizeKb = Math.round(file.size / 1024) || 0;

                return (
                  <div key={file.id} className="group relative flex flex-col justify-between rounded-xl border border-slate-850 bg-slate-900/20 p-3 hover:border-slate-700/80 transition-colors">
                    {/* Visual Preview Box */}
                    <div className="flex h-28 items-center justify-center rounded-lg bg-slate-950 overflow-hidden relative border border-slate-900">
                      {isImage && file.url !== '#' ? (
                        <img src={file.url} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200" />
                      ) : (
                        <div className="text-slate-600 flex flex-col items-center gap-1.5">
                          <ImageIcon size={28} />
                          <span className="text-[8px] font-bold tracking-widest uppercase text-slate-500">
                            {file.name.split('.').pop()}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 overflow-hidden">
                      <p className="text-[10px] font-bold text-slate-300 truncate" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-[8px] text-slate-500 mt-0.5 font-semibold">Size: {sizeKb} KB</p>
                    </div>

                    {/* Download option (simulated hover display) */}
                    <div className="absolute right-2.5 top-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {file.url !== '#' && (
                        <a
                          href={file.url}
                          download={file.name}
                          className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-900 text-slate-400 hover:bg-slate-850 hover:text-white"
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100">Add Task to column: {newTasksCol}</h3>
              <button
                onClick={() => setIsNewTaskModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateTask} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Build API integration handlers"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Description</label>
                <textarea
                  placeholder="Briefly describe what needs to be done..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  rows={2}
                  className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-brand-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Assign To</label>
                <select
                  value={taskAssignee}
                  onChange={(e) => setTaskAssignee(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-200 focus:border-brand-500 focus:outline-none cursor-pointer"
                >
                  <option value="">Unassigned</option>
                  {members.map(m => (
                    <option key={m.user_id} value={m.user_id}>{m.profile.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Priority Level</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-200 focus:border-brand-500 focus:outline-none cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-200 focus:border-brand-500 focus:outline-none [color-scheme:dark]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Labels (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="Design, Frontend, Bug"
                  value={taskLabels}
                  onChange={(e) => setTaskLabels(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 transition-colors shadow-lg shadow-brand-500/20"
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
          <div className="w-full max-w-2xl h-screen bg-slate-950 border-l border-slate-800 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-250">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-850 p-6">
              <div className="flex items-center gap-2">
                <KanbanSquare className="text-brand-400" size={18} />
                <span className="text-xs font-semibold text-slate-400">Task Details & Resources</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDeleteTask(selectedTask.id)}
                  title="Delete Task"
                  className="rounded-lg p-1 text-slate-500 hover:bg-slate-900 hover:text-rose-400"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Content Scrollable Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {!isEditingTask ? (
                // VIEW DETAILS PANEL
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-100">{selectedTask.title}</h3>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed whitespace-pre-line">
                        {selectedTask.description || 'No description provided.'}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsEditingTask(true)}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-white font-semibold"
                    >
                      <Edit size={12} />
                      <span>Edit</span>
                    </button>
                  </div>

                  {/* Badges Grid */}
                  <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-900/20 p-4 border border-slate-850/50">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Assignee</span>
                      <div className="mt-1.5 flex items-center gap-2">
                        {members.find(m => m.user_id === selectedTask.assignee_id) ? (
                          <>
                            <img
                              src={members.find(m => m.user_id === selectedTask.assignee_id)?.profile.avatar_url}
                              alt=""
                              className="h-6 w-6 rounded-full object-cover"
                            />
                            <span className="text-xs font-semibold text-slate-300">
                              {members.find(m => m.user_id === selectedTask.assignee_id)?.profile.full_name}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs font-semibold text-slate-500">Unassigned</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Priority</span>
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
                <form onSubmit={handleUpdateTaskDetails} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/10 p-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Task Title *</label>
                    <input
                      type="text"
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</label>
                    <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      rows={3}
                      className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Assignee</label>
                      <select
                        value={editAssignee}
                        onChange={(e) => setEditAssignee(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200 focus:outline-none"
                      >
                        <option value="">Unassigned</option>
                        {members.map(m => (
                          <option key={m.user_id} value={m.user_id}>{m.profile.full_name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Priority</label>
                      <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value as any)}
                        className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200 focus:outline-none"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-850">
                    <button
                      type="button"
                      onClick={() => setIsEditingTask(false)}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white"
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

              {/* 1. Checklist Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <CheckSquare size={16} className="text-brand-400" />
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Checklist</h4>
                </div>

                {/* Progress bar */}
                {taskChecklist.length > 0 && (
                  <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
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
                    <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-900/30 p-2.5 border border-slate-850/50">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={item.is_completed}
                          onChange={() => handleToggleChecklist(item.id, item.is_completed)}
                          className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-brand-500 focus:ring-0 cursor-pointer"
                        />
                        <span className={`text-xs text-slate-200 ${item.is_completed ? 'line-through text-slate-500' : ''}`}>
                          {item.title}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteChecklist(item.id)}
                        className="text-slate-600 hover:text-rose-400"
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
                    placeholder="Add item details..."
                    value={newChecklistTitle}
                    onChange={(e) => setNewChecklistTitle(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-750 hover:text-white"
                  >
                    Add
                  </button>
                </form>
              </div>

              {/* 2. Attachments / Task Files Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <Paperclip size={16} className="text-violet-400" />
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Resources & Attachments</h4>
                </div>

                <div className="space-y-2">
                  {taskAttachments.map((file) => (
                    <div key={file.id} className="flex items-center justify-between rounded-lg bg-slate-900/30 p-2 border border-slate-850/50">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {file.file_type?.startsWith('image/') ? (
                          <img src={file.url} alt="" className="h-8 w-8 rounded object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-950 text-[9px] font-bold">
                            DOC
                          </div>
                        )}
                        <div className="truncate">
                          <p className="text-xs text-slate-200 truncate">{file.name}</p>
                          <p className="text-[9px] text-slate-500">{(file.size / 1024).toFixed(0)} KB</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {file.url !== '#' && (
                          <a
                            href={file.url}
                            download={file.name}
                            className="rounded p-1 text-slate-500 hover:bg-slate-900 hover:text-white"
                          >
                            <Download size={12} />
                          </a>
                        )}
                        <button
                          onClick={() => {
                            setTaskAttachments(prev => prev.filter(a => a.id !== file.id));
                            deleteAttachment(file.id);
                          }}
                          className="rounded p-1 text-slate-500 hover:bg-slate-900 hover:text-rose-400"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <label className="flex items-center justify-center w-full h-16 rounded-xl border border-dashed border-slate-800 bg-slate-950/20 hover:border-brand-500/50 hover:bg-slate-950/40 cursor-pointer transition-all">
                  <div className="flex flex-col items-center gap-1 text-slate-500">
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
                  <MessageSquare size={16} className="text-brand-400" />
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Comments Log</h4>
                </div>

                {/* Comment Form */}
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Leave a comment reply..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-500"
                  >
                    Reply
                  </button>
                </form>

                {/* Comments List */}
                <div className="space-y-3.5">
                  {taskComments.map((comm) => (
                    <div key={comm.id} className="flex gap-3 text-xs">
                      {comm.profile?.avatar_url ? (
                        <img src={comm.profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover border border-slate-800" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 font-bold">
                          {comm.profile?.full_name.substring(0, 2).toUpperCase() || 'US'}
                        </div>
                      )}
                      <div className="flex-1 rounded-xl bg-slate-900/30 p-3 border border-slate-850/50">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200">{comm.profile?.full_name}</span>
                          <span className="text-[9px] text-slate-500">{new Date(comm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="mt-1 text-slate-300 leading-relaxed">{comm.content}</p>
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
