import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useTheme } from '../../context/ThemeContext';
import { Bell, Search, CheckCheck, Inbox, Menu, KanbanSquare, CheckSquare, User, Loader2, Sun, Moon, Briefcase } from 'lucide-react';
import { supabase } from '../../supabaseClient';

interface TopbarProps {
  onMenuClick?: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { 
    notifications, 
    markNotificationRead, 
    markAllNotificationsRead,
    activeWorkspace,
    workspaces,
    switchWorkspace,
    projects,
    members,
    teams
  } = useWorkspace();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search workspace states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    workspaces: any[];
    projects: any[];
    tasks: any[];
    members: any[];
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search results or notifications when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search query logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setShowSearchResults(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      setShowSearchResults(true);
      try {
        const query = searchQuery.toLowerCase();

        // 1. Search workspaces locally in context
        const matchedWorkspaces = (workspaces || []).filter(w => 
          w.name.toLowerCase().includes(query) || 
          (w.description || '').toLowerCase().includes(query)
        );

        // 2. Search projects locally in context
        const matchedProjects = (projects || []).filter(p => 
          p.name.toLowerCase().includes(query) || 
          (p.description || '').toLowerCase().includes(query)
        );

        // 3. Search members locally in context
        const matchedMembers = (members || []).filter(m => 
          (m.profile?.full_name || '').toLowerCase().includes(query) || 
          (m.profile?.email || '').toLowerCase().includes(query)
        );

        // 4. Search tasks in active workspace projects
        let matchedTasks: any[] = [];
        const projectIds = (projects || []).map(p => p.id);
        if (projectIds.length > 0) {
          const { data: dbTasks } = await supabase
            .from('tasks')
            .select('*')
            .in('project_id', projectIds);

          if (dbTasks) {
            matchedTasks = dbTasks.filter((t: any) => 
              t.title.toLowerCase().includes(query) || 
              (t.description || '').toLowerCase().includes(query)
            );
          } else {
            // Mock DB fallback
            const dbState = JSON.parse(localStorage.getItem('taskflow_mock_db') || '{}');
            const localTasks = (dbState.tasks || []).filter((t: any) => projectIds.includes(t.project_id));
            matchedTasks = localTasks.filter((t: any) => 
              t.title.toLowerCase().includes(query) || 
              (t.description || '').toLowerCase().includes(query)
            );
          }
        }

        setSearchResults({
          workspaces: matchedWorkspaces,
          projects: matchedProjects,
          tasks: matchedTasks,
          members: matchedMembers
        });
      } catch (err) {
        console.error('Search query failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, workspaces, projects, members, activeWorkspace]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Header Title Resolver based on route
  const getHeaderTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path === '/projects') return 'Projects';
    if (path.startsWith('/project/')) return 'Project Workspace';
    if (path === '/members') return 'Members';
    if (path === '/settings') return 'Settings';
    if (path === '/teams') return 'Teams';
    if (path.startsWith('/team/')) {
      const teamId = path.split('/')[2];
      const team = teams?.find(t => t.id === teamId);
      return team ? `${team.name}` : 'Team';
    }
    if (path === '/tasks') return 'Tasks';
    if (path === '/files') return 'Files';
    if (path === '/activity') return 'Activity';
    return 'TaskFlow';
  };

  const getHeaderSubtitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Overview of your workspace activity';
    if (path === '/projects') return 'Manage and track all projects';
    if (path.startsWith('/project/')) return 'View and edit project details';
    if (path === '/members') return 'Your team and collaborators';
    if (path === '/settings') return 'Workspace preferences and configuration';
    if (path === '/teams') return 'Organize your squads and groups';
    if (path === '/tasks') return 'All tasks across your workspace';
    if (path === '/files') return 'Shared documents and assets';
    if (path === '/activity') return 'Recent events and audit trail';
    return '';
  };

  const formatNotifTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const iconButtonStyle = {
    background: theme === 'dark' ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255, 255, 255, 0.9)',
    border: theme === 'dark' ? '1px solid rgba(139, 92, 246, 0.15)' : '1px solid rgba(139, 92, 246, 0.12)',
    color: theme === 'dark' ? '#a78bfa' : '#7c3aed',
    borderRadius: '12px',
    padding: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <header 
      className="sticky top-0 z-40 flex h-16 w-full items-center justify-between px-4 md:px-6 transition-all duration-200"
      style={{
        background: theme === 'dark' 
          ? 'rgba(10, 6, 20, 0.92)' 
          : 'rgba(252, 250, 255, 0.92)',
        backdropFilter: 'blur(16px) saturate(180%)',
        borderBottom: theme === 'dark'
          ? '1px solid rgba(139, 92, 246, 0.1)'
          : '1px solid rgba(139, 92, 246, 0.1)',
        boxShadow: theme === 'dark'
          ? '0 1px 20px rgba(0, 0, 0, 0.3)'
          : '0 1px 20px rgba(109, 40, 217, 0.06)',
      }}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="rounded-xl p-2 md:hidden transition-all duration-200"
          style={iconButtonStyle}
        >
          <Menu size={18} />
        </button>

        <div>
          <h1 className="text-base font-bold tracking-tight md:text-lg" style={{ 
            color: theme === 'dark' ? '#e2e0ff' : '#1e1b4b',
            fontFamily: "'Outfit', sans-serif",
            letterSpacing: '-0.02em'
          }}>
            {getHeaderTitle()}
          </h1>
          <p className="text-[11px] font-medium hidden sm:block" style={{
            color: theme === 'dark' ? 'rgba(167, 139, 250, 0.5)' : 'rgba(109, 40, 217, 0.5)'
          }}>
            {getHeaderSubtitle()}
          </p>
        </div>
      </div>

      {/* Global Actions Bar */}
      <div className="flex items-center gap-2">
        {/* Search Input */}
        <div className="relative hidden max-w-xs md:block" ref={searchContainerRef}>
          <Search 
            size={14} 
            className="absolute left-3.5 top-3 pointer-events-none"
            style={{ color: theme === 'dark' ? 'rgba(167, 139, 250, 0.5)' : 'rgba(109, 40, 217, 0.4)' }}
          />
          <input
            type="text"
            placeholder="Search workspace..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-52 py-2 pl-9 pr-4 text-xs focus:outline-none transition-all duration-200 rounded-xl"
            style={{
              background: theme === 'dark' ? 'rgba(139, 92, 246, 0.07)' : 'rgba(139, 92, 246, 0.05)',
              border: theme === 'dark' ? '1px solid rgba(139, 92, 246, 0.15)' : '1px solid rgba(139, 92, 246, 0.12)',
              color: theme === 'dark' ? '#e2e0ff' : '#1e1b4b',
            }}
            onFocus={e => {
              (e.target as HTMLElement).style.width = '240px';
              (e.target as HTMLElement).style.borderColor = 'rgba(139, 92, 246, 0.4)';
              (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.08)';
              (e.target as HTMLElement).style.background = theme === 'dark' ? 'rgba(139, 92, 246, 0.12)' : 'white';
              searchQuery.trim() && setShowSearchResults(true);
            }}
            onBlur={e => {
              (e.target as HTMLElement).style.width = '';
              (e.target as HTMLElement).style.borderColor = theme === 'dark' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.12)';
              (e.target as HTMLElement).style.boxShadow = 'none';
              (e.target as HTMLElement).style.background = theme === 'dark' ? 'rgba(139, 92, 246, 0.07)' : 'rgba(139, 92, 246, 0.05)';
            }}
          />

          {/* Search Results Dropdown */}
          {showSearchResults && (
            <div 
              className="absolute left-0 mt-2 w-80 rounded-2xl p-2 animate-dropdown max-h-96 overflow-y-auto z-50"
              style={{
                background: theme === 'dark' ? '#150b2e' : 'white',
                border: theme === 'dark' ? '1px solid rgba(139, 92, 246, 0.2)' : '1px solid rgba(139, 92, 246, 0.12)',
                boxShadow: theme === 'dark' 
                  ? '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(139, 92, 246, 0.08)' 
                  : '0 20px 60px rgba(109, 40, 217, 0.12)',
              }}
            >
              <div className="px-3 py-2 flex items-center justify-between mb-1" style={{ borderBottom: '1px solid rgba(139, 92, 246, 0.1)' }}>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme === 'dark' ? 'rgba(167, 139, 250, 0.6)' : 'rgba(109, 40, 217, 0.5)' }}>Search Results</span>
                {isSearching && <Loader2 className="animate-spin text-violet-500" size={13} />}
              </div>

              <div className="py-1">
                {isSearching && !searchResults && (
                  <div className="py-8 text-center text-xs" style={{ color: theme === 'dark' ? 'rgba(167, 139, 250, 0.5)' : 'rgba(109, 40, 217, 0.4)' }}>
                    Searching workspace...
                  </div>
                )}

                {!isSearching && (!searchResults || (searchResults.workspaces.length === 0 && searchResults.projects.length === 0 && searchResults.tasks.length === 0 && searchResults.members.length === 0)) ? (
                  <div className="py-8 text-center text-xs" style={{ color: theme === 'dark' ? 'rgba(167, 139, 250, 0.5)' : 'rgba(109, 40, 217, 0.4)' }}>
                    No results found for "{searchQuery}"
                  </div>
                ) : (
                  searchResults && (
                    <div className="flex flex-col gap-2">
                      {/* Workspaces Group */}
                      {searchResults.workspaces.length > 0 && (
                        <div>
                          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: theme === 'dark' ? 'rgba(167, 139, 250, 0.5)' : 'rgba(109, 40, 217, 0.4)' }}>Workspaces</div>
                          {searchResults.workspaces.map(w => (
                            <button
                              key={w.id}
                              onClick={() => {
                                switchWorkspace(w.id);
                                setShowSearchResults(false);
                                setSearchQuery('');
                                navigate('/');
                              }}
                              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors"
                              style={{ color: theme === 'dark' ? '#c4b5fd' : '#6d28d9' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = theme === 'dark' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.06)'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                            >
                              <Briefcase size={13} className="text-amber-400" />
                              <span className="truncate font-medium">{w.name}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Projects Group */}
                      {searchResults.projects.length > 0 && (
                        <div>
                          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: theme === 'dark' ? 'rgba(167, 139, 250, 0.5)' : 'rgba(109, 40, 217, 0.4)' }}>Projects</div>
                          {searchResults.projects.map(p => (
                            <button
                              key={p.id}
                              onClick={() => {
                                navigate(`/project/${p.id}`);
                                setShowSearchResults(false);
                                setSearchQuery('');
                              }}
                              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors"
                              style={{ color: theme === 'dark' ? '#c4b5fd' : '#6d28d9' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = theme === 'dark' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.06)'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                            >
                              <KanbanSquare size={13} className="text-violet-400" />
                              <span className="truncate font-medium">{p.name}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Tasks Group */}
                      {searchResults.tasks.length > 0 && (
                        <div>
                          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: theme === 'dark' ? 'rgba(167, 139, 250, 0.5)' : 'rgba(109, 40, 217, 0.4)' }}>Tasks</div>
                          {searchResults.tasks.map(t => (
                            <button
                              key={t.id}
                              onClick={() => {
                                navigate(`/project/${t.project_id}?task=${t.id}`);
                                setShowSearchResults(false);
                                setSearchQuery('');
                              }}
                              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors"
                              style={{ color: theme === 'dark' ? '#c4b5fd' : '#6d28d9' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = theme === 'dark' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.06)'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                            >
                              <CheckSquare size={13} className="text-emerald-400" />
                              <span className="truncate font-medium">{t.title}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Members Group */}
                      {searchResults.members.length > 0 && (
                        <div>
                          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: theme === 'dark' ? 'rgba(167, 139, 250, 0.5)' : 'rgba(109, 40, 217, 0.4)' }}>Team Members</div>
                          {searchResults.members.map(m => (
                            <button
                              key={m.id}
                              onClick={() => {
                                navigate('/members');
                                setShowSearchResults(false);
                                setSearchQuery('');
                              }}
                              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors"
                              style={{ color: theme === 'dark' ? '#c4b5fd' : '#6d28d9' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = theme === 'dark' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.06)'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                            >
                              <User size={13} className="text-blue-400" />
                              <span className="truncate font-medium">
                                {m.profile?.full_name || 'Pending User'}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="relative transition-all duration-200 hover:scale-105 active:scale-95"
          style={iconButtonStyle}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = theme === 'dark' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.08)';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139, 92, 246, 0.3)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = theme === 'dark' ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255, 255, 255, 0.9)';
            (e.currentTarget as HTMLElement).style.borderColor = theme === 'dark' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.12)';
          }}
        >
          {theme === 'dark' ? (
            <Sun size={17} style={{ color: '#fbbf24' }} className="transition-all duration-300" />
          ) : (
            <Moon size={17} style={{ color: '#7c3aed' }} className="transition-all duration-300" />
          )}
        </button>

        {/* Notifications Icon Tray */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative transition-all duration-200 hover:scale-105 active:scale-95"
            style={iconButtonStyle}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = theme === 'dark' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.08)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139, 92, 246, 0.3)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = theme === 'dark' ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255, 255, 255, 0.9)';
              (e.currentTarget as HTMLElement).style.borderColor = theme === 'dark' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.12)';
            }}
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span 
                className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white ring-2"
                style={{
                  background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
                  ringColor: theme === 'dark' ? '#0a0614' : '#f4f2ff',
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Flyout Drawer */}
          {isNotifOpen && (
            <div 
              className="absolute right-0 z-50 mt-2 w-80 rounded-2xl p-2 animate-dropdown"
              style={{
                background: theme === 'dark' ? '#150b2e' : 'white',
                border: theme === 'dark' ? '1px solid rgba(139, 92, 246, 0.2)' : '1px solid rgba(139, 92, 246, 0.12)',
                boxShadow: theme === 'dark' 
                  ? '0 20px 60px rgba(0, 0, 0, 0.6)' 
                  : '0 20px 60px rgba(109, 40, 217, 0.12)',
              }}
            >
              <div className="flex items-center justify-between px-3 py-2 mb-1" style={{ borderBottom: '1px solid rgba(139, 92, 246, 0.1)' }}>
                <span className="text-sm font-bold" style={{ color: theme === 'dark' ? '#e2e0ff' : '#1e1b4b' }}>Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="flex items-center gap-1 text-[10px] font-bold transition-colors hover:opacity-80"
                    style={{ color: '#a78bfa' }}
                  >
                    <CheckCheck size={11} />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto py-1">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div 
                      className="rounded-full p-3 mb-3"
                      style={{ background: 'rgba(139, 92, 246, 0.1)' }}
                    >
                      <Inbox size={20} style={{ color: '#a78bfa' }} />
                    </div>
                    <p className="text-xs font-semibold" style={{ color: theme === 'dark' ? '#c4b5fd' : '#6d28d9' }}>All caught up!</p>
                    <p className="text-[10px] mt-0.5" style={{ color: theme === 'dark' ? 'rgba(167, 139, 250, 0.4)' : 'rgba(109, 40, 217, 0.4)' }}>No new notifications.</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => !notif.is_read && markNotificationRead(notif.id)}
                      className="flex flex-col gap-0.5 rounded-xl px-3 py-2.5 text-left cursor-pointer transition-all duration-200 mb-1"
                      style={{
                        background: notif.is_read 
                          ? 'transparent' 
                          : theme === 'dark' ? 'rgba(139, 92, 246, 0.07)' : 'rgba(139, 92, 246, 0.04)',
                        borderLeft: notif.is_read ? '3px solid transparent' : '3px solid rgba(139, 92, 246, 0.5)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold" style={{ color: notif.is_read ? (theme === 'dark' ? 'rgba(167, 139, 250, 0.5)' : 'rgba(109, 40, 217, 0.4)') : (theme === 'dark' ? '#e2e0ff' : '#1e1b4b') }}>
                          {notif.title}
                        </span>
                        <span className="text-[9px] whitespace-nowrap" style={{ color: 'rgba(167, 139, 250, 0.4)' }}>
                          {formatNotifTime(notif.created_at)}
                        </span>
                      </div>
                      <p className="text-[10px] leading-relaxed" style={{ color: theme === 'dark' ? 'rgba(167, 139, 250, 0.5)' : 'rgba(109, 40, 217, 0.45)' }}>
                        {notif.description}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
