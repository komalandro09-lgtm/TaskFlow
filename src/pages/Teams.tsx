import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';
import * as LucideIcons from 'lucide-react';
import { 
  Users, 
  Plus, 
  FolderKanban, 
  CheckCircle2, 
  X, 
  Info,
  ChevronRight,
  TrendingUp
} from 'lucide-react';

const TEAM_COLORS = [
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Rose
  '#EC4899', // Pink
];

const TEAM_ICONS = [
  { name: 'Users', label: 'Default' },
  { name: 'Palette', label: 'Design' },
  { name: 'Code', label: 'Dev' },
  { name: 'Megaphone', label: 'Marketing' },
  { name: 'LineChart', label: 'Sales' },
  { name: 'Cpu', label: 'Tech' },
  { name: 'HeartHandshake', label: 'Support' },
];

const Teams: React.FC = () => {
  const navigate = useNavigate();
  const { activeWorkspace, teams, teamMembers, projects, createTeam, members } = useWorkspace();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(TEAM_COLORS[0]);
  const [icon, setIcon] = useState(TEAM_ICONS[0].name);
  const [errorMsg, setErrorMsg] = useState('');

  if (!activeWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 max-w-md mx-auto text-center animate-in fade-in duration-300">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 dark:from-brand-500/20 text-brand-600 dark:text-brand-400 mb-6 border border-brand-500/15 shadow-sm">
          <Users size={26} />
        </div>
        <h3 className="text-xl font-bold tracking-tight text-slate-850 dark:text-white">Workspace Required</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed">
          Please select or create a workspace first to manage teams.
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

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!name.trim()) return;

    const { team, error } = await createTeam(name, description, color, icon);
    if (error) {
      setErrorMsg(error.message || 'Failed to create team.');
    } else {
      setIsModalOpen(false);
      setName('');
      setDescription('');
      setColor(TEAM_COLORS[0]);
      setIcon(TEAM_ICONS[0].name);
    }
  };

  // Resolve Lucide icons dynamically
  const renderIcon = (iconName: string, size = 20) => {
    const IconComp = (LucideIcons as any)[iconName] || LucideIcons.Users;
    return <IconComp size={size} />;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto transition-colors duration-200 page-enter">
      {/* Top Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-white md:text-3xl">Teams Management</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Add team layers inside workspaces, align priorities, and track collective outputs.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl btn-brand px-4 py-2.5 text-sm font-bold shadow-lg shadow-brand-primary/20"
        >
          <Plus size={16} />
          <span>Create Team</span>
        </button>
      </div>

      {/* Teams Grid */}
      {teams.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-violet-200/50 dark:border-violet-800/30 bg-white/10 dark:bg-slate-900/10 py-16 text-center shadow-xs">
          <Users className="mx-auto text-slate-450 dark:text-slate-655 mb-3" size={36} />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Teams Configured</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto mb-4">Introduce team spaces to divide workspace projects, members, and targets.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="rounded-xl glass-input px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            Create Your First Team
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team, index) => {
            // Stats calculations
            const membersCount = teamMembers.filter(tm => tm.team_id === team.id).length;
            const teamProjects = projects.filter(p => p.team_id === team.id);
            const activeProjectsCount = teamProjects.filter(p => p.status === 'active').length;
            
            // Average progress calculation
            const avgProgress = teamProjects.length > 0 
              ? Math.round(teamProjects.reduce((acc, p) => acc + (p.progress || 0), 0) / teamProjects.length)
              : 0;

            return (
              <div
                key={team.id}
                onClick={() => navigate(`/team/${team.id}`)}
                className="group hover-lift relative flex flex-col justify-between rounded-2xl glass-card p-5 shadow-xs cursor-pointer animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Header Icon & Dot details */}
                <div className="flex items-center justify-between gap-4">
                  <div 
                    className="flex h-11 w-11 items-center justify-center rounded-xl shadow-xs"
                    style={{ backgroundColor: `${team.color}15`, color: team.color }}
                  >
                    {renderIcon(team.icon, 20)}
                  </div>
                  <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 group-hover:text-brand-primary transition-all duration-200" />
                </div>

                {/* Team Info */}
                <div className="mt-4">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-brand-primary transition-colors">
                    {team.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                    {team.description || 'No description provided.'}
                  </p>
                </div>

                {/* Team Stats Summary */}
                <div className="mt-6 grid grid-cols-3 gap-2 border-t border-violet-100/60 dark:border-slate-800/40 pt-4 text-center">
                  <div>
                    <span className="block text-xs font-extrabold text-slate-800 dark:text-slate-100">{membersCount}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">Members</span>
                  </div>
                  <div>
                    <span className="block text-xs font-extrabold text-slate-800 dark:text-slate-100">{activeProjectsCount}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">Projects</span>
                  </div>
                  <div>
                    <span className="block text-xs font-extrabold text-slate-800 dark:text-slate-100">{avgProgress}%</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">Progress</span>
                  </div>
                </div>

                {/* Visual Progress Bar */}
                <div className="mt-4">
                  <div className="h-1.5 w-full rounded-full bg-violet-100/50 dark:bg-slate-950/40 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-300"
                      style={{ 
                        width: `${avgProgress}%`,
                        backgroundColor: team.color
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Team Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border border-violet-200/30 dark:border-violet-805/30 bg-white dark:bg-slate-950 p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-100 overflow-hidden">
            {/* Ambient Modal Stripe */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-brand-primary to-brand-dark"></div>

            <div className="flex items-center justify-between border-b border-violet-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Users className="text-brand-primary" size={20} />
                <h3 className="text-lg font-bold">Create Workspace Team</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 dark:text-slate-500 hover:bg-slate-105 dark:hover:bg-slate-900 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateTeam} className="mt-4 space-y-4">
              {errorMsg && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-500/5 border border-rose-500/10 p-2.5 text-xs text-rose-500 font-semibold">
                  <Info size={14} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400">Team Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Frontend Development"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl glass-input p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400">Description</label>
                <textarea
                  placeholder="Briefly state this team's roadmap..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="mt-1.5 w-full rounded-xl glass-input p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none resize-none"
                />
              </div>

              {/* Color Presets */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400">Theme Color</label>
                <div className="mt-2 flex flex-wrap gap-2.5">
                  {TEAM_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`h-7 w-7 rounded-full border-2 transition-all hover:scale-110 ${color === c ? 'border-slate-800 dark:border-white scale-105' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Icon Presets */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-555 dark:text-slate-400">Team Icon</label>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {TEAM_ICONS.map(i => (
                    <button
                      key={i.name}
                      type="button"
                      onClick={() => setIcon(i.name)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all text-xs ${
                        icon === i.name 
                          ? 'border-brand-primary bg-brand-primary/5 text-brand-primary font-bold' 
                          : 'border-violet-100/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {renderIcon(i.name, 16)}
                      <span className="text-[9px] tracking-tight">{i.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-violet-100 dark:border-slate-805">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-505 dark:text-slate-455 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl btn-brand px-5 py-2.5 text-xs font-bold shadow-lg shadow-brand-primary/20"
                >
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Teams;
