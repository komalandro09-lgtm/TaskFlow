import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useTheme } from '../../context/ThemeContext';
import { Bell, Search, CheckCheck, Inbox, Menu, Sun, Moon, KanbanSquare, CheckSquare, User, Loader2 } from 'lucide-react';
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
    projects,
    members
  } = useWorkspace();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search workspace states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
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
    if (!searchQuery.trim() || !activeWorkspace) {
      setSearchResults(null);
      setShowSearchResults(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      setShowSearchResults(true);
      try {
        const query = searchQuery.toLowerCase();

        // 1. Search projects locally in context
        const matchedProjects = (projects || []).filter(p => 
          p.name.toLowerCase().includes(query) || 
          (p.description || '').toLowerCase().includes(query)
        );

        // 2. Search members locally in context
        const matchedMembers = (members || []).filter(m => 
          (m.profile?.full_name || '').toLowerCase().includes(query) || 
          (m.profile?.email || '').toLowerCase().includes(query)
        );

        // 3. Search tasks in active workspace projects
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
  }, [searchQuery, projects, members, activeWorkspace]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Header Title Resolver based on route
  const getHeaderTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Workspace Dashboard';
    if (path === '/projects') return 'Projects Tracker';
    if (path.startsWith('/project/')) return 'Project Workspace';
    if (path === '/members') return 'Member Directory';
    if (path === '/settings') return 'Workspace Settings';
    return 'TaskFlow';
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

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-slate-950/85 px-4 backdrop-blur-md transition-colors duration-200 md:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-700 dark:hover:text-slate-200 md:hidden transition-colors"
        >
          <Menu size={18} />
        </button>
        <h1 className="text-base font-bold tracking-tight text-slate-850 dark:text-white md:text-xl truncate max-w-[180px] sm:max-w-xs md:max-w-none">
          {getHeaderTitle()}
        </h1>
      </div>

      {/* Global Actions Bar */}
      <div className="flex items-center gap-3">
        {/* Search Input */}
        <div className="relative hidden max-w-xs md:block" ref={searchContainerRef}>
          <Search size={16} className="absolute left-3.5 top-2.5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search workspace..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.trim() && setShowSearchResults(true)}
            className="w-56 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/40 py-2 pl-10 pr-4 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-brand-500/80 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all duration-200"
          />

          {/* Search Results Dropdown */}
          {showSearchResults && (
            <div className="absolute left-0 mt-2 w-80 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 shadow-2xl shadow-slate-200 dark:shadow-black/60 animate-in fade-in slide-in-from-top-2 duration-150 max-h-96 overflow-y-auto z-50">
              <div className="border-b border-slate-100 dark:border-slate-800 px-3 py-2 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Search Results</span>
                {isSearching && <Loader2 className="animate-spin text-brand-500" size={14} />}
              </div>

              <div className="py-1">
                {isSearching && !searchResults && (
                  <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">Searching workspace...</div>
                )}

                {!isSearching && (!searchResults || (searchResults.projects.length === 0 && searchResults.tasks.length === 0 && searchResults.members.length === 0)) ? (
                  <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                    No results found for "{searchQuery}"
                  </div>
                ) : (
                  searchResults && (
                    <div className="flex flex-col gap-3">
                      {/* Projects Group */}
                      {searchResults.projects.length > 0 && (
                        <div>
                          <div className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Projects</div>
                          {searchResults.projects.map(p => (
                            <button
                              key={p.id}
                              onClick={() => {
                                navigate(`/project/${p.id}`);
                                setShowSearchResults(false);
                                setSearchQuery('');
                              }}
                              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                            >
                              <KanbanSquare size={14} className="text-brand-500" />
                              <span className="truncate font-medium">{p.name}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Tasks Group */}
                      {searchResults.tasks.length > 0 && (
                        <div>
                          <div className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tasks</div>
                          {searchResults.tasks.map(t => (
                            <button
                              key={t.id}
                              onClick={() => {
                                navigate(`/project/${t.project_id}?task=${t.id}`);
                                setShowSearchResults(false);
                                setSearchQuery('');
                              }}
                              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                            >
                              <CheckSquare size={14} className="text-emerald-500" />
                              <span className="truncate font-medium">{t.title}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Members Group */}
                      {searchResults.members.length > 0 && (
                        <div>
                          <div className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Teammates</div>
                          {searchResults.members.map(m => (
                            <button
                              key={m.id}
                              onClick={() => {
                                navigate('/members');
                                setShowSearchResults(false);
                                setSearchQuery('');
                              }}
                              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                            >
                              <User size={14} className="text-blue-500" />
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
          className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications Icon Tray */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[8px] font-bold text-white ring-2 ring-white dark:ring-slate-950">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Flyout Drawer */}
          {isNotifOpen && (
            <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 shadow-2xl shadow-slate-200 dark:shadow-black/60 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-3 py-2">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="flex items-center gap-1 text-[10px] font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
                  >
                    <CheckCheck size={12} />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto py-1">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="rounded-full bg-slate-100 dark:bg-slate-900 p-2 text-slate-400 dark:text-slate-500 mb-2">
                      <Inbox size={20} />
                    </div>
                    <p className="text-xs font-semibold text-slate-650 dark:text-slate-400">All caught up!</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-600">No new notifications.</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => !notif.is_read && markNotificationRead(notif.id)}
                      className={`flex flex-col gap-0.5 rounded-lg px-3 py-2 text-left cursor-pointer transition-colors ${
                        notif.is_read 
                          ? 'hover:bg-slate-50 dark:hover:bg-slate-900/35 text-slate-400 dark:text-slate-500' 
                          : 'bg-brand-500/[0.03] border-l-2 border-brand-500 hover:bg-brand-500/[0.06] text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold">{notif.title}</span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                          {formatNotifTime(notif.created_at)}
                        </span>
                      </div>
                      <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">{notif.description}</p>
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
