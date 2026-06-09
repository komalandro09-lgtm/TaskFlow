import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Bell, Search, CheckCheck, Inbox, ShieldAlert } from 'lucide-react';

const Topbar: React.FC = () => {
  const location = useLocation();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useWorkspace();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close notifications list when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <header className="flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-slate-950/40 px-6 backdrop-blur-md">
      {/* Page Title */}
      <div>
        <h1 className="text-lg font-bold tracking-tight text-white md:text-xl">
          {getHeaderTitle()}
        </h1>
      </div>

      {/* Global Actions Bar */}
      <div className="flex items-center gap-4">
        {/* Search Input */}
        <div className="relative hidden max-w-xs md:block">
          <Search size={16} className="absolute left-3.5 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search workspace..."
            className="w-56 rounded-xl border border-slate-800 bg-slate-900/40 py-2 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:border-brand-500/80 focus:bg-slate-900 focus:outline-none transition-all duration-200"
          />
        </div>

        {/* Notifications Icon Tray */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative rounded-xl border border-slate-800 bg-slate-900/40 p-2 text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-colors"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[8px] font-bold text-white ring-2 ring-slate-950">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Flyout Drawer */}
          {isNotifOpen && (
            <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-slate-800 bg-slate-950 p-2 shadow-2xl shadow-black/60 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
                <span className="text-sm font-bold text-slate-200">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="flex items-center gap-1 text-[10px] font-bold text-brand-400 hover:text-brand-300"
                  >
                    <CheckCheck size={12} />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto py-1">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="rounded-full bg-slate-900 p-2 text-slate-500 mb-2">
                      <Inbox size={20} />
                    </div>
                    <p className="text-xs font-semibold text-slate-400">All caught up!</p>
                    <p className="text-[10px] text-slate-600">No new notifications.</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => !notif.is_read && markNotificationRead(notif.id)}
                      className={`flex flex-col gap-0.5 rounded-lg px-3 py-2 text-left cursor-pointer transition-colors ${
                        notif.is_read 
                          ? 'hover:bg-slate-900/35 text-slate-400' 
                          : 'bg-brand-500/[0.03] border-l-2 border-brand-500 hover:bg-brand-500/[0.06] text-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold">{notif.title}</span>
                        <span className="text-[9px] text-slate-500 whitespace-nowrap">
                          {formatNotifTime(notif.created_at)}
                        </span>
                      </div>
                      <p className="text-[10px] leading-relaxed text-slate-400">{notif.description}</p>
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
