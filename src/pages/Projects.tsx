import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';
import { useTheme } from '../context/ThemeContext';
import type { Project } from '../context/WorkspaceContext';
import { 
  FolderPlus, 
  Calendar, 
  FolderOpen,
  X,
  Search,
  Filter,
  MoreVertical,
  Trash2,
  Clock
} from 'lucide-react';

const Projects: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { activeWorkspace, projects, createProject, deleteProject } = useWorkspace();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [status, setStatus] = useState<'active' | 'on hold' | 'completed' | 'archived'>('active');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeProjectMenu, setActiveProjectMenu] = useState<string | null>(null);

  if (!activeWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 max-w-md mx-auto text-center animate-in fade-in duration-300">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 dark:from-brand-500/20 text-brand-600 dark:text-brand-400 mb-6 border border-brand-500/15 shadow-sm">
          <FolderPlus size={26} />
        </div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-white">Workspace Required</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2.5 max-w-xs leading-relaxed">
          Please select or create a workspace first to manage projects. You can create a workspace from the sidebar selector or click below to return to the Dashboard.
        </p>
        <button
          onClick={() => navigate('/')}
          className="mt-6 btn-brand rounded-xl px-5 py-3 text-xs font-bold shadow-md shadow-brand-primary/20"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const { project, error } = await createProject({
      name,
      description,
      start_date: startDate,
      due_date: dueDate,
      priority,
      status
    });

    if (!error && project) {
      setIsModalOpen(false);
      setName('');
      setDescription('');
      setStartDate('');
      setDueDate('');
      setPriority('medium');
      setStatus('active');
    }
  };

  const handleDelete = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid navigating into project
    if (confirm('Are you sure you want to delete this project? All associated tasks, checklists, and comments will be permanently lost.')) {
      await deleteProject(projectId);
      setActiveProjectMenu(null);
    }
  };

  // Filter & Search resolution
  const filteredProjects = projects.filter(p => {
    const matchesQuery = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterStatus === 'all') return matchesQuery;
    return matchesQuery && p.status === filterStatus;
  });

  const getPriorityColor = (prio: string) => {
    switch (prio) {
      case 'critical': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      case 'high': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'medium': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      default: return 'bg-slate-200 dark:bg-slate-800 text-slate-605 dark:text-slate-400 border-slate-300 dark:border-slate-700/50';
    }
  };

  const getStatusColor = (stat: string) => {
    switch (stat) {
      case 'completed': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'on hold': return 'bg-orange-500/10 text-orange-605 dark:text-orange-405 border-orange-500/20';
      case 'archived': return 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-500 border-slate-300 dark:border-slate-700';
      default: return 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/20';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto transition-colors duration-200 page-enter">
      {/* Top Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-white md:text-3xl">Projects Tracker</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Organize goals, align team members, and track dashboard progress.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl btn-brand px-4 py-2.5 text-sm font-bold shadow-lg shadow-brand-primary/20"
        >
          <FolderPlus size={16} />
          <span>New Project</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl glass-panel p-4 sm:flex-row sm:items-center shadow-xs">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-3.5 text-slate-450 dark:text-violet-400/50" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl glass-input py-3 pl-10 pr-4 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-450 dark:text-violet-400/50" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl glass-input py-3 px-4 text-xs text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="all">All Projects</option>
            <option value="active">Active</option>
            <option value="on hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-violet-200/50 dark:border-violet-800/30 bg-white/10 dark:bg-slate-900/10 py-16 text-center shadow-xs">
          <FolderOpen className="mx-auto text-slate-400 dark:text-slate-655 mb-3" size={32} />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Projects Found</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">Create a new project or adjust filters to begin tracking tasks.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project, index) => (
            <div
              key={project.id}
              onClick={() => navigate(`/project/${project.id}`)}
              className="relative flex flex-col justify-between rounded-2xl glass-card p-6 shadow-xs cursor-pointer hover-lift transition-all duration-200 animate-fade-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Menu and badges */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-wrap gap-1.5">
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${getPriorityColor(project.priority)}`}>
                    {project.priority}
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                </div>

                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveProjectMenu(activeProjectMenu === project.id ? null : project.id);
                    }}
                    className="rounded-lg p-1 text-slate-450 dark:text-slate-500 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-750 dark:hover:text-slate-300"
                  >
                    <MoreVertical size={14} />
                  </button>

                  {activeProjectMenu === project.id && (
                    <div className="absolute right-0 z-20 mt-1 w-32 rounded-lg border border-violet-100 dark:border-slate-800 bg-white dark:bg-slate-950 p-1 shadow-2xl animate-dropdown">
                      <button
                        onClick={(e) => handleDelete(project.id, e)}
                        className="flex w-full items-center gap-1.5 rounded px-2.5 py-1.5 text-left text-xs font-semibold text-rose-500 hover:bg-slate-50 dark:hover:bg-slate-900"
                      >
                        <Trash2 size={12} />
                        <span>Delete Project</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Title & Desc */}
              <div className="mt-4">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-brand-primary transition-colors">
                  {project.name}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2">
                  {project.description || 'No description provided.'}
                </p>
              </div>

              {/* Dates */}
              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-violet-100/60 dark:border-slate-800/40 pt-4 text-[10px] text-slate-500 dark:text-slate-450 font-semibold">
                <div className="flex items-center gap-1">
                  <Calendar size={12} />
                  <span>Start: {project.start_date || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  <span>Due: {project.due_date || 'N/A'}</span>
                </div>
              </div>

              {/* Progress Tracker */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-[10px] text-slate-550 dark:text-slate-450 font-bold mb-1">
                  <span>Task Progress</span>
                  <span>{project.progress || 0}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-violet-100/50 dark:bg-slate-950/40 overflow-hidden border border-violet-100/20 dark:border-transparent">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-brand-primary to-brand-dark transition-all duration-300" 
                    style={{ width: `${project.progress || 0}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl border border-violet-200/30 dark:border-violet-805/30 bg-white dark:bg-slate-950 p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-100 overflow-hidden">
            {/* Ambient Modal Stripe */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-brand-primary to-brand-dark"></div>

            <div className="flex items-center justify-between border-b border-violet-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <FolderPlus className="text-brand-primary dark:text-brand-primary" size={20} />
                <h3 className="text-lg font-bold">Create New Project</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 dark:text-slate-500 hover:bg-slate-105 dark:hover:bg-slate-800 hover:text-slate-850 dark:hover:text-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateProject} className="mt-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400">Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q3 Roadmap Campaign"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl glass-input p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400">Description</label>
                <textarea
                  placeholder="Summarize objectives, goals, and key results of this project..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1.5 w-full rounded-xl glass-input p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1.5 w-full rounded-xl glass-input p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="mt-1.5 w-full rounded-xl glass-input p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400">Priority Level</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="mt-1.5 w-full rounded-xl glass-input p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="mt-1.5 w-full rounded-xl glass-input p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="on hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-violet-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl btn-brand px-5 py-2.5 text-xs font-bold shadow-lg shadow-brand-primary/20"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
