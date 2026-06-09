import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  LayoutDashboard, 
  FolderKanban, 
  Users, 
  Settings, 
  LogOut, 
  ChevronDown, 
  Plus, 
  FolderPlus,
  X,
  Briefcase
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { workspaces, activeWorkspace, switchWorkspace, createWorkspace, projects } = useWorkspace();
  
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');
  const [newWsLogo, setNewWsLogo] = useState('');

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    
    const { workspace, error } = await createWorkspace(newWsName, newWsDesc, newWsLogo);
    if (!error && workspace) {
      setIsCreateModalOpen(false);
      setNewWsName('');
      setNewWsDesc('');
      setNewWsLogo('');
    }
  };

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Projects', path: '/projects', icon: FolderKanban, badge: projects.length > 0 ? projects.length : undefined },
    { name: 'Members', path: '/members', icon: Users },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="relative flex h-full w-64 flex-col border-r border-slate-800/80 bg-slate-950 p-4">
      {/* Brand Logo */}
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-brand-600 to-violet-500 text-white shadow-lg shadow-brand-500/20">
          <Briefcase size={20} className="stroke-[2.5]" />
        </div>
        <span className="text-xl font-bold tracking-tight text-white bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
          TaskFlow
        </span>
        <span className="rounded bg-brand-500/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-400">SaaS</span>
      </div>

      {/* Workspace Selector */}
      <div className="relative mb-6">
        <button
          onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
          className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-left hover:border-slate-700/80 hover:bg-slate-900 transition-all duration-200"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {activeWorkspace?.logo_url ? (
              <img
                src={activeWorkspace.logo_url}
                alt={activeWorkspace.name}
                className="h-7 w-7 rounded-lg object-cover border border-slate-800"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-slate-400">
                <Briefcase size={14} />
              </div>
            )}
            <div className="truncate">
              <p className="text-sm font-semibold text-slate-200 truncate">{activeWorkspace?.name || 'No Workspace'}</p>
              <p className="text-[10px] font-medium text-slate-400 truncate">Workspace</p>
            </div>
          </div>
          <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isWorkspaceMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {isWorkspaceMenuOpen && (
          <div className="absolute left-0 right-0 z-50 mt-2 rounded-xl border border-slate-800 bg-slate-900 p-2 shadow-xl shadow-black/40 animate-in fade-in slide-in-from-top-1 duration-150">
            <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Workspaces</p>
            <div className="max-h-48 overflow-y-auto py-1">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    switchWorkspace(ws.id);
                    setIsWorkspaceMenuOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-800 transition-colors ${
                    activeWorkspace?.id === ws.id ? 'bg-brand-500/10 text-brand-400 font-medium' : 'text-slate-300'
                  }`}
                >
                  {ws.logo_url ? (
                    <img src={ws.logo_url} alt={ws.name} className="h-6 w-6 rounded object-cover" />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-slate-800 text-[10px]">
                      {ws.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="truncate">{ws.name}</span>
                </button>
              ))}
            </div>
            <hr className="my-1 border-slate-800" />
            <button
              onClick={() => {
                setIsWorkspaceMenuOpen(false);
                setIsCreateModalOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            >
              <Plus size={16} />
              <span>New Workspace</span>
            </button>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-brand-500/10 text-brand-400'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`
            }
          >
            <div className="flex items-center gap-3">
              <item.icon size={18} />
              <span>{item.name}</span>
            </div>
            {item.badge && (
              <span className="rounded-full bg-brand-500/10 px-2.5 py-0.5 text-xs font-bold text-brand-400">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Active User profile peek */}
      <div className="mt-auto border-t border-slate-800/80 pt-4">
        <div className="flex items-center gap-3 rounded-xl bg-slate-900/20 p-2 border border-transparent hover:border-slate-800 hover:bg-slate-900/30 transition-all duration-200">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt={user.full_name} className="h-10 w-10 rounded-full object-cover border border-slate-700" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white font-bold text-sm">
              {user?.full_name.substring(0, 2).toUpperCase() || 'US'}
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <h4 className="text-sm font-semibold text-slate-200 truncate">{user?.full_name}</h4>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            title="Sign Out"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Create Workspace Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FolderPlus className="text-brand-400" size={20} />
                <h3 className="text-lg font-bold text-slate-100">Create Workspace</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateWorkspace} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Workspace Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Creative Labs"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Description</label>
                <textarea
                  placeholder="Short description of this workspace..."
                  value={newWsDesc}
                  onChange={(e) => setNewWsDesc(e.target.value)}
                  rows={3}
                  className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-brand-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Logo URL</label>
                <input
                  type="text"
                  placeholder="https://example.com/logo.png"
                  value={newWsLogo}
                  onChange={(e) => setNewWsLogo(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 transition-colors shadow-lg shadow-brand-500/20"
                >
                  Create Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
