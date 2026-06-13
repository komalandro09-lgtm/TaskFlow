import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useTheme } from '../../context/ThemeContext';
import * as LucideIcons from 'lucide-react';
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
  Briefcase,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  FileText,
  Activity,
  CheckSquare,
  MessageSquare
} from 'lucide-react';
import TaskFlowLogo from './TaskFlowLogo';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { logout, user } = useAuth();
  const { workspaces, activeWorkspace, switchWorkspace, createWorkspace, projects, teams } = useWorkspace();
  
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const workspaceDropdownRef = useRef<HTMLDivElement>(null);

  // Close workspace dropdown when clicking outside
  useEffect(() => {
    if (!isWorkspaceMenuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (workspaceDropdownRef.current && !workspaceDropdownRef.current.contains(e.target as Node)) {
        setIsWorkspaceMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isWorkspaceMenuOpen]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');
  const [newWsLogo, setNewWsLogo] = useState('');

  // Sidebar collapse state (saved in localStorage)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('taskflow_sidebar_collapsed') === 'true';
  });

  const toggleCollapse = () => {
    const nextVal = !isCollapsed;
    setIsCollapsed(nextVal);
    localStorage.setItem('taskflow_sidebar_collapsed', String(nextVal));
  };

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
    { name: 'Projects', path: '/projects', icon: FolderKanban },
    { name: 'Tasks', path: '/tasks', icon: CheckSquare },
    { name: 'Teams', path: '/teams', icon: Users },
    { name: 'Team Chat', path: '/chat', icon: MessageSquare },
    { name: 'Files', path: '/files', icon: FileText },
    { name: 'Activities', path: '/activity', icon: Activity },
    { name: 'Members', path: '/members', icon: Users },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  // Resolve Lucide icons dynamically for teams
  const renderTeamIcon = (iconName: string, color: string) => {
    const IconComp = (LucideIcons as any)[iconName] || LucideIcons.Users;
    return (
      <div 
        className="flex h-5 w-5 items-center justify-center rounded-md" 
        style={{ backgroundColor: `${color}20`, color: color }}
      >
        <IconComp size={12} className="stroke-[2.5]" />
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          onClick={onClose} 
          className="fixed inset-0 z-40 bg-violet-950/40 backdrop-blur-sm transition-all duration-300 md:hidden"
        />
      )}

      <aside 
        className={`fixed inset-y-0 left-0 z-50 flex h-full flex-col p-3 transition-all duration-300 md:relative md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isCollapsed ? 'w-[72px]' : 'w-[240px]'}`}
        style={{
          background: theme === 'dark'
            ? 'linear-gradient(180deg, #1e0f3d 0%, #160c2e 50%, #0f0720 100%)'
            : 'linear-gradient(180deg, #ffffff 0%, #f9f8ff 100%)',
          borderRight: theme === 'dark'
            ? '1px solid rgba(139, 92, 246, 0.15)'
            : '1px solid rgba(139, 92, 246, 0.08)',
        }}
      >
        {/* Subtle background glow */}
        <div 
          className="absolute top-0 left-0 w-full h-48 pointer-events-none"
          style={{
            background: theme === 'dark'
              ? 'radial-gradient(ellipse at 50% 0%, rgba(139, 92, 246, 0.15) 0%, transparent 70%)'
              : 'radial-gradient(ellipse at 50% 0%, rgba(139, 92, 246, 0.05) 0%, transparent 70%)',
          }}
        />

        {/* Toggle Collapse Button for Desktop */}
        <button 
          onClick={toggleCollapse}
          className="absolute -right-3.5 top-6 z-20 hidden h-7 w-7 items-center justify-center rounded-full border shadow-lg md:flex transition-all duration-200 hover:scale-110"
          style={{
            background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
            borderColor: 'rgba(139, 92, 246, 0.4)',
            color: 'white',
            boxShadow: '0 4px 12px rgba(109, 40, 217, 0.4)',
          }}
        >
          {isCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>

        {/* Brand Logo Header */}
        <div className={`relative z-10 mb-6 flex items-center px-1 pt-1 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            {isCollapsed ? (
              <TaskFlowLogo variant="icon" iconSize={34} />
            ) : (
              <TaskFlowLogo variant="full" iconSize={30} textSize={18} />
            )}
          </div>
          {/* Close button for mobile */}
          {isOpen && (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-violet-300/60 hover:bg-white/10 hover:text-white transition-colors md:hidden"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Workspace Selector */}
        <div ref={workspaceDropdownRef} className="relative mb-5" style={{ zIndex: isWorkspaceMenuOpen ? 200 : 10 }}>
          <button
            onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
            className={`flex w-full items-center justify-between rounded-xl p-2 text-left transition-all duration-200 ${isCollapsed ? 'justify-center p-1.5' : ''}`}
            style={{
              background: theme === 'dark' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)',
              border: theme === 'dark' ? '1px solid rgba(139, 92, 246, 0.2)' : '1px solid rgba(139, 92, 246, 0.12)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = theme === 'dark' ? 'rgba(139, 92, 246, 0.18)' : 'rgba(139, 92, 246, 0.1)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = theme === 'dark' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)';
            }}
          >
            <div className="flex items-center gap-2 overflow-hidden shrink-0">
              {activeWorkspace?.logo_url ? (
                <img
                  src={activeWorkspace.logo_url}
                  alt=""
                  className="h-7 w-7 rounded-lg object-cover border shrink-0"
                  style={{ borderColor: 'rgba(139, 92, 246, 0.3)' }}
                />
              ) : (
                <div 
                  className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0"
                  style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa' }}
                >
                  <Briefcase size={13} />
                </div>
              )}
              {!isCollapsed && (
                <div className="truncate animate-in fade-in duration-200">
                  <p className={`text-xs font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{activeWorkspace?.name || 'No Workspace'}</p>
                  <p className="text-[9px] font-semibold truncate" style={{ color: theme === 'dark' ? 'rgba(167, 139, 250, 0.7)' : 'rgba(109, 40, 217, 0.6)' }}>Workspace</p>
                </div>
              )}
            </div>
            {!isCollapsed && <ChevronDown size={13} className={`shrink-0 transition-transform duration-200 ${isWorkspaceMenuOpen ? 'rotate-180' : ''}`} style={{ color: '#a78bfa' }} />}
          </button>

          {isWorkspaceMenuOpen && (
            <div 
              className={`absolute mt-1.5 rounded-xl p-1.5 shadow-2xl animate-dropdown ${isCollapsed ? 'left-16 top-0' : 'left-0 right-0'}`}
              style={{
                zIndex: 300,
                minWidth: 220,
                background: theme === 'dark' ? '#1e0f3d' : '#ffffff',
                border: theme === 'dark' ? '1px solid rgba(139, 92, 246, 0.25)' : '1px solid rgba(139, 92, 246, 0.18)',
                boxShadow: theme === 'dark'
                  ? '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(139, 92, 246, 0.1)'
                  : '0 12px 48px rgba(109, 40, 217, 0.14), 0 0 0 1px rgba(139, 92, 246, 0.08)',
              }}
            >
              <p className="px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider" style={{ color: theme === 'dark' ? 'rgba(167, 139, 250, 0.6)' : 'rgba(109, 40, 217, 0.5)' }}>Workspaces</p>
              <div className="max-h-48 overflow-y-auto py-1">
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      switchWorkspace(ws.id);
                      setIsWorkspaceMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${
                      activeWorkspace?.id === ws.id 
                        ? 'font-bold' 
                        : 'font-medium'
                    }`}
                    style={{
                      background: activeWorkspace?.id === ws.id
                        ? (theme === 'dark' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.08)')
                        : 'transparent',
                      color: activeWorkspace?.id === ws.id
                        ? (theme === 'dark' ? '#c4b5fd' : '#6d28d9')
                        : (theme === 'dark' ? 'rgba(196, 181, 253, 0.7)' : 'rgba(30, 27, 75, 0.85)'),
                    }}
                    onMouseEnter={e => {
                      if (activeWorkspace?.id !== ws.id) {
                        (e.currentTarget as HTMLElement).style.background = theme === 'dark' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.04)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (activeWorkspace?.id !== ws.id) {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                      }
                    }}
                  >
                    {ws.logo_url ? (
                      <img src={ws.logo_url} alt="" className="h-5 w-5 rounded object-cover shrink-0" style={{ border: '1px solid rgba(139,92,246,0.2)' }} />
                    ) : (
                      <div className="flex h-5 w-5 items-center justify-center rounded shrink-0 text-[10px] font-bold" style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa' }}>
                        {ws.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="truncate">{ws.name}</span>
                  </button>
                ))}
              </div>
              <div style={{ borderTop: theme === 'dark' ? '1px solid rgba(139, 92, 246, 0.15)' : '1px solid rgba(139, 92, 246, 0.08)' }} className="mt-1 pt-1">
                <button
                  onClick={() => {
                    setIsWorkspaceMenuOpen(false);
                    setIsCreateModalOpen(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors"
                  style={{ color: theme === 'dark' ? 'rgba(167, 139, 250, 0.8)' : 'rgba(109, 40, 217, 0.8)' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = theme === 'dark' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.04)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  <Plus size={13} />
                  <span>New Workspace</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="relative flex-1 space-y-0.5 overflow-y-auto pr-1" style={{ zIndex: 1 }}>
          {!isCollapsed && (
            <p className="px-3 pb-2 text-[9px] font-extrabold uppercase tracking-widest" style={{ color: theme === 'dark' ? 'rgba(167, 139, 250, 0.4)' : 'rgba(109, 40, 217, 0.5)' }}>
              Navigation
            </p>
          )}
          {menuItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'font-bold'
                    : 'font-medium'
                } ${isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5 text-xs'}`
              }
              style={({ isActive }) => ({
                background: isActive
                  ? (theme === 'dark' 
                      ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.22), rgba(109, 40, 217, 0.12))' 
                      : 'linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(109, 40, 217, 0.06))')
                  : 'transparent',
                color: isActive 
                  ? (theme === 'dark' ? '#c4b5fd' : '#6d28d9') 
                  : (theme === 'dark' ? 'rgba(167, 139, 250, 0.65)' : 'rgba(79, 70, 229, 0.7)'),
                borderLeft: isActive ? '3px solid rgba(139, 92, 246, 0.8)' : '3px solid transparent',
              })}
            >
              <div className="flex items-center gap-3">
                <item.icon size={15} className="shrink-0 transition-transform duration-200 group-hover:scale-105" />
                {!isCollapsed && <span className="animate-in fade-in duration-200">{item.name}</span>}
              </div>
            </NavLink>
          ))}

          {/* Teams list divider inside sidebar */}
          {teams.length > 0 && !isCollapsed && (
            <div className="pt-4 pb-2 animate-in fade-in duration-200">
              <p className="px-3 text-[9px] font-extrabold uppercase tracking-widest pb-1.5" style={{ color: theme === 'dark' ? 'rgba(167, 139, 250, 0.4)' : 'rgba(109, 40, 217, 0.5)' }}>Teams</p>
              <div className="mt-1 space-y-0.5">
                {teams.map(team => (
                  <NavLink
                    key={team.id}
                    to={`/team/${team.id}`}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                        isActive 
                          ? 'font-bold' 
                          : ''
                      }`
                    }
                    style={({ isActive }) => ({
                      background: isActive
                        ? (theme === 'dark' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.08)')
                        : 'transparent',
                      color: isActive 
                        ? (theme === 'dark' ? '#c4b5fd' : '#6d28d9') 
                        : (theme === 'dark' ? 'rgba(167, 139, 250, 0.55)' : 'rgba(79, 70, 229, 0.65)'),
                    })}
                  >
                    {renderTeamIcon(team.icon, team.color)}
                    <span className="truncate">{team.name}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Footer Profile Details */}
        <div className="relative z-10 mt-auto pt-3" style={{ borderTop: theme === 'dark' ? '1px solid rgba(139, 92, 246, 0.12)' : '1px solid rgba(139, 92, 246, 0.08)' }}>
          <div 
            className={`flex items-center gap-2.5 rounded-xl p-2 ${isCollapsed ? 'justify-center p-1 border-0' : ''}`}
            style={{
              background: theme === 'dark' ? 'rgba(139, 92, 246, 0.07)' : 'rgba(139, 92, 246, 0.04)',
              border: isCollapsed ? 'none' : (theme === 'dark' ? '1px solid rgba(139, 92, 246, 0.12)' : '1px solid rgba(139, 92, 246, 0.08)'),
            }}
          >
            {user?.avatar_url ? (
              <img 
                src={user.avatar_url} 
                alt="" 
                className="h-8 w-8 rounded-full object-cover shrink-0" 
                style={{ border: '2px solid rgba(139, 92, 246, 0.4)' }}
              />
            ) : (
              <div 
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-xs text-white"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}
              >
                {user?.full_name?.substring(0, 2).toUpperCase() || 'US'}
              </div>
            )}
            {!isCollapsed && (
              <div className="flex-1 overflow-hidden animate-in fade-in duration-200">
                <h4 className={`text-xs font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{user?.full_name}</h4>
                <p className="text-[9px] truncate leading-none mt-0.5" style={{ color: theme === 'dark' ? 'rgba(167, 139, 250, 0.55)' : 'rgba(109, 40, 217, 0.6)' }}>{user?.email}</p>
              </div>
            )}
            {!isCollapsed && (
              <button
                onClick={logout}
                title="Sign Out"
                className="rounded-lg p-1.5 transition-all duration-200 hover:scale-105 shrink-0"
                style={{ color: 'rgba(167, 139, 250, 0.5)' }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(244, 63, 94, 0.15)';
                  (e.currentTarget as HTMLElement).style.color = '#f43f5e';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'rgba(167, 139, 250, 0.5)';
                }}
              >
                <LogOut size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Create Workspace Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(15, 7, 32, 0.75)', backdropFilter: 'blur(8px)' }}>
            <div 
              className="w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200"
              style={{
                background: '#1a0e35',
                border: '1px solid rgba(139, 92, 246, 0.25)',
                boxShadow: '0 24px 80px rgba(0, 0, 0, 0.6)',
              }}
            >
              <div className="flex items-center justify-between pb-4 mb-4" style={{ borderBottom: '1px solid rgba(139, 92, 246, 0.15)' }}>
                <div className="flex items-center gap-2.5 text-white">
                  <div className="rounded-lg p-1.5" style={{ background: 'rgba(139, 92, 246, 0.2)' }}>
                    <FolderPlus className="text-violet-400" size={16} />
                  </div>
                  <h3 className="text-base font-bold">Create Workspace</h3>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-lg p-1.5 text-violet-400/60 hover:text-violet-300 transition-colors"
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(139, 92, 246, 0.1)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <X size={16} />
                </button>
              </div>
              
               <form onSubmit={handleCreateWorkspace} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(167, 139, 250, 0.7)' }}>Workspace Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Creative Labs"
                    value={newWsName}
                    onChange={(e) => setNewWsName(e.target.value)}
                    className="w-full rounded-xl p-3 text-sm text-white placeholder-violet-700 focus:outline-none transition-all duration-200"
                    style={{
                      background: 'rgba(139, 92, 246, 0.08)',
                      border: '1px solid rgba(139, 92, 246, 0.2)',
                    }}
                    onFocus={e => {
                      (e.target as HTMLElement).style.borderColor = 'rgba(139, 92, 246, 0.5)';
                      (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
                    }}
                    onBlur={e => {
                      (e.target as HTMLElement).style.borderColor = 'rgba(139, 92, 246, 0.2)';
                      (e.target as HTMLElement).style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(167, 139, 250, 0.7)' }}>Description</label>
                  <textarea
                    placeholder="Short description of this workspace..."
                    value={newWsDesc}
                    onChange={(e) => setNewWsDesc(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl p-3 text-sm text-white placeholder-violet-700 focus:outline-none transition-all duration-200 resize-none"
                    style={{
                      background: 'rgba(139, 92, 246, 0.08)',
                      border: '1px solid rgba(139, 92, 246, 0.2)',
                    }}
                    onFocus={e => {
                      (e.target as HTMLElement).style.borderColor = 'rgba(139, 92, 246, 0.5)';
                      (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
                    }}
                    onBlur={e => {
                      (e.target as HTMLElement).style.borderColor = 'rgba(139, 92, 246, 0.2)';
                      (e.target as HTMLElement).style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(167, 139, 250, 0.7)' }}>Logo URL</label>
                  <input
                    type="text"
                    placeholder="https://example.com/logo.png"
                    value={newWsLogo}
                    onChange={(e) => setNewWsLogo(e.target.value)}
                    className="w-full rounded-xl p-3 text-sm text-white placeholder-violet-700 focus:outline-none transition-all duration-200"
                    style={{
                      background: 'rgba(139, 92, 246, 0.08)',
                      border: '1px solid rgba(139, 92, 246, 0.2)',
                    }}
                    onFocus={e => {
                      (e.target as HTMLElement).style.borderColor = 'rgba(139, 92, 246, 0.5)';
                      (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
                    }}
                    onBlur={e => {
                      (e.target as HTMLElement).style.borderColor = 'rgba(139, 92, 246, 0.2)';
                      (e.target as HTMLElement).style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3" style={{ borderTop: '1px solid rgba(139, 92, 246, 0.15)' }}>
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200"
                    style={{ color: 'rgba(167, 139, 250, 0.7)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(139, 92, 246, 0.1)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                      boxShadow: '0 4px 16px rgba(109, 40, 217, 0.4)',
                    }}
                  >
                    Create Workspace
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
