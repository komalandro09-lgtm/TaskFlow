import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { 
  Activity, 
  Search, 
  User, 
  Clock, 
  ArrowLeft,
  RefreshCcw
} from 'lucide-react';

const ActivityLogs: React.FC = () => {
  const { activeWorkspace, activities, members, refreshWorkspaceData } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUser, setFilterUser] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!activeWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 max-w-md mx-auto text-center page-enter">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500 dark:text-violet-400 mb-4 border border-violet-200/25">
          <Activity size={24} />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Workspace Required</h3>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Please select or create a workspace first to view activity feeds.
        </p>
      </div>
    );
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshWorkspaceData();
    setIsRefreshing(false);
  };

  const filteredLogs = activities.filter(log => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = log.action.toLowerCase().includes(query) || 
      log.target_type.toLowerCase().includes(query) || 
      log.target_name.toLowerCase().includes(query) ||
      (log.profile?.full_name || '').toLowerCase().includes(query);

    const matchesUser = filterUser === 'all' || log.user_id === filterUser;

    return matchesSearch && matchesUser;
  });

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto page-enter">
      {/* Top Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-violet-100 dark:border-violet-900/40 pb-5">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-955 dark:text-white md:text-3xl">Workspace Activity Log</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Audit timeline logging team interactions, project updates, and task details.</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 border border-violet-200/50 dark:border-violet-900/55 hover:bg-violet-500/10 transition-all duration-200 disabled:opacity-50 shrink-0 bg-white/50 dark:bg-slate-950/40 backdrop-blur-md"
        >
          <RefreshCcw size={13} className={isRefreshing ? 'animate-spin' : ''} />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh Logs'}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 p-4 glass-panel sm:flex-row sm:items-center animate-fade-in-up delay-50 rounded-2xl">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-3.5 text-violet-400 dark:text-violet-500" />
          <input
            type="text"
            placeholder="Filter logs by action, target or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl py-3 pl-10 pr-4 text-xs focus:outline-none glass-input"
          />
        </div>
        <select
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
          className="rounded-xl py-3 px-4 text-xs text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer shrink-0 glass-input"
        >
          <option value="all">All Teammates</option>
          {members.map(m => (
            <option key={m.user_id} value={m.user_id}>{m.profile.full_name}</option>
          ))}
        </select>
      </div>

      {/* Activity Timeline List */}
      <div className="p-6 glass-card animate-fade-in-up delay-100 rounded-2xl">
        {filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-550">
            <Activity className="mx-auto text-violet-400 dark:text-violet-650 mb-3 animate-pulse" size={32} />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Logs Found</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-2 leading-relaxed">No activities matching your query were recorded in this workspace.</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-violet-100 dark:border-violet-900/40 ml-4 pl-6 space-y-6">
            {filteredLogs.map((log) => (
              <div key={log.id} className="relative group animate-fade-in-up">
                {/* Visual Bullet Icon */}
                <div className="absolute -left-[31px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white dark:bg-slate-950 border-2 border-violet-500 dark:border-violet-400 shadow-sm group-hover:scale-110 transition-transform">
                  <div className="h-2 w-2 rounded-full bg-violet-500 dark:bg-violet-400 animate-pulse" />
                </div>

                <div className="flex flex-col gap-1.5 md:flex-row md:items-start md:justify-between">
                  <div className="flex gap-3 text-xs leading-relaxed">
                    {log.profile?.avatar_url ? (
                      <img 
                        src={log.profile.avatar_url} 
                        alt="" 
                        className="h-8 w-8 rounded-full object-cover border border-violet-150/40 mt-0.5 shadow-sm" 
                      />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold border border-violet-200/30 text-[9px] mt-0.5 shadow-sm">
                        {(log.profile?.full_name || 'US').substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-slate-650 dark:text-slate-350 leading-relaxed">
                        <strong className="text-slate-900 dark:text-slate-100 font-bold">{log.profile?.full_name || 'System User'}</strong>
                        {' '}{log.action}{' '}
                        <span className="rounded bg-violet-50 dark:bg-violet-950/60 border border-violet-100/40 dark:border-violet-900/30 px-1.5 py-0.5 text-[10px] text-violet-700 dark:text-violet-300 font-mono font-semibold">
                          {log.target_type}: {log.target_name}
                        </span>
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5 text-[9px] text-slate-400 font-semibold">
                        <Clock size={10} className="text-violet-400 dark:text-violet-500" />
                        <span>{formatTime(log.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLogs;
