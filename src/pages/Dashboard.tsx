import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { supabase } from '../supabaseClient';
import { 
  Folder, 
  CheckCircle2, 
  AlertTriangle, 
  ListTodo, 
  TrendingUp, 
  Users,
  Activity,
  ArrowUpRight,
  Check,
  X,
  Sparkles
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

const Dashboard: React.FC = () => {
  const { activeWorkspace, projects, members, activities, seedDatabase } = useWorkspace();
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    async function fetchTasks() {
      setLoadingTasks(true);
      try {
        if (projects.length === 0) {
          setAllTasks([]);
          setLoadingTasks(false);
          return;
        }
        
        const projectIds = projects.map(p => p.id);
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .in('project_id', projectIds);
        
        if (!error && data) {
          setAllTasks(data);
        } else {
          // Fallback to local storage (mock mode)
          const dbState = JSON.parse(localStorage.getItem('taskflow_mock_db') || '{}');
          const localTasks = (dbState.tasks || []).filter((t: any) => projectIds.includes(t.project_id));
          setAllTasks(localTasks);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingTasks(false);
      }
    }

    fetchTasks();
  }, [projects]);

  const handleSeedDatabase = async () => {
    setSeeding(true);
    setSeedStatus('idle');
    const { success } = await seedDatabase();
    if (success) {
      setSeedStatus('success');
      // Reload page to reflect active workspace state properly
      window.location.reload();
    } else {
      setSeedStatus('error');
    }
    setSeeding(false);
  };

  // 1. Calculate Metrics
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const totalTasks = allTasks.length;

  const now = new Date();
  const overdueTasks = allTasks.filter((t: any) => {
    if (t.status === 'completed' || !t.due_date) return false;
    return new Date(t.due_date) < now;
  }).length;

  // 2. Prepare Chart Data (Task Completion Trend over 5 weeks)
  const trendData = [
    { week: 'Week 1', completed: 4, active: 8 },
    { week: 'Week 2', completed: 8, active: 12 },
    { week: 'Week 3', completed: 15, active: 11 },
    { week: 'Week 4', completed: 22, active: 14 },
    { week: 'Week 5', completed: 31, active: 10 },
  ];

  // 3. Prepare Chart Data (Workload distribution per member)
  const workloadData = members.map(m => {
    const memberTasks = allTasks.filter((t: any) => t.assignee_id === m.user_id);
    return {
      name: m.profile.full_name.split(' ')[0],
      tasks: memberTasks.length,
      avatar: m.profile.avatar_url
    };
  });

  const COLORS = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#6d28d9'];

  const formatActivityTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString();
  };

  if (!activeWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 max-w-2xl mx-auto text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-500 to-violet-500 text-white shadow-xl shadow-brand-500/20 mb-6 animate-pulse">
          <Sparkles size={28} />
        </div>
        <h2 className="text-2xl font-extrabold text-white md:text-3xl mb-3">Welcome to TaskFlow!</h2>
        <p className="text-sm text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
          Your live Supabase database is connected successfully!
          However, you don't have any workspaces setup yet. You can seed this environment with standard website mockup data (workspaces, projects, Kanban tasks, check lists, comments, files) automatically.
        </p>
        <div className="w-full flex flex-col items-center justify-center gap-4">
          <button
            onClick={handleSeedDatabase}
            disabled={seeding}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 px-8 py-3.5 text-sm font-bold text-white hover:from-brand-500 hover:to-violet-500 transition-all shadow-lg shadow-brand-500/10 disabled:opacity-50"
          >
            {seeding ? (
              <span>Seeding Database...</span>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Seed Database with Mock Data</span>
              </>
            )}
          </button>
          {seedStatus === 'success' && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <Check size={14} />
              <span>Database seeded successfully! Reloading...</span>
            </span>
          )}
          {seedStatus === 'error' && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-400">
              <X size={14} />
              <span>Failed to seed database. Verify table schemas in Supabase.</span>
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">
            Workspace Overview
          </h2>
          <p className="text-sm text-slate-400">Track and monitor your workspace progress and team metrics.</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Projects */}
        <div className="group rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 shadow-lg backdrop-blur-sm transition-all duration-200 hover:border-slate-700/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Projects</span>
            <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-400 border border-blue-500/15">
              <Folder size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{totalProjects}</span>
            <span className="text-xs font-semibold text-slate-400">Active: {activeProjects}</span>
          </div>
        </div>

        {/* Completed Projects */}
        <div className="group rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 shadow-lg backdrop-blur-sm transition-all duration-200 hover:border-slate-700/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Completed Projects</span>
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400 border border-emerald-500/15">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{completedProjects}</span>
            <span className="text-xs font-semibold text-emerald-400">Success Rate</span>
          </div>
        </div>

        {/* Total Tasks */}
        <div className="group rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 shadow-lg backdrop-blur-sm transition-all duration-200 hover:border-slate-700/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Workspace Tasks</span>
            <div className="rounded-xl bg-brand-500/10 p-2.5 text-brand-400 border border-brand-500/15">
              <ListTodo size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{totalTasks}</span>
            <span className="text-xs font-semibold text-slate-400">Total assigned</span>
          </div>
        </div>

        {/* Overdue Tasks */}
        <div className="group rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 shadow-lg backdrop-blur-sm transition-all duration-200 hover:border-slate-700/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Overdue Tasks</span>
            <div className={`rounded-xl p-2.5 border ${overdueTasks > 0 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse' : 'bg-slate-800/50 text-slate-500 border-slate-700/20'}`}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold ${overdueTasks > 0 ? 'text-rose-400' : 'text-white'}`}>{overdueTasks}</span>
            <span className="text-xs font-semibold text-slate-400">Requires attention</span>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Productivity Trends */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 shadow-xl backdrop-blur-sm lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-brand-400" size={18} />
              <h3 className="text-sm font-bold text-slate-200">Productivity Trends</h3>
            </div>
            <span className="rounded bg-brand-500/10 px-2 py-0.5 text-[10px] font-bold text-brand-400">5-Week Log</span>
          </div>
          
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="week" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  labelStyle={{ fontWeight: 'bold', color: '#f8fafc' }}
                />
                <Area type="monotone" dataKey="completed" name="Completed Tasks" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCompleted)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Workload Distribution */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 shadow-xl backdrop-blur-sm">
          <div className="mb-6 flex items-center gap-2">
            <Users className="text-violet-400" size={18} />
            <h3 className="text-sm font-bold text-slate-200">Workload Distribution</h3>
          </div>

          <div className="h-64 w-full text-xs">
            {workloadData.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-slate-500">
                <p>No members configured</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workloadData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" />
                  <YAxis stroke="#64748b" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    labelStyle={{ fontWeight: 'bold', color: '#f8fafc' }}
                  />
                  <Bar dataKey="tasks" name="Active Tasks" radius={[6, 6, 0, 0]}>
                    {workloadData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Activity Logs & Members Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Workspace Activities */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 shadow-xl backdrop-blur-sm lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="text-brand-400" size={18} />
              <h3 className="text-sm font-bold text-slate-200">Recent Activities</h3>
            </div>
          </div>

          <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
            {activities.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <p className="text-sm">No activity logs recorded yet.</p>
              </div>
            ) : (
              activities.map((act) => (
                <div key={act.id} className="flex gap-3 text-sm border-b border-slate-850 pb-3 last:border-0 last:pb-0">
                  {act.profile?.avatar_url ? (
                    <img src={act.profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover border border-slate-700 mt-0.5" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold mt-0.5">
                      {act.profile?.full_name.substring(0, 2).toUpperCase() || 'US'}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-xs text-slate-300">
                      <strong className="text-slate-100 font-semibold">{act.profile?.full_name || 'System User'}</strong>
                      {' '}{act.action}{' '}
                      <span className="rounded bg-slate-800/80 px-1.5 py-0.5 text-[10px] text-slate-300 font-mono">
                        {act.target_type}: {act.target_name}
                      </span>
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">{formatActivityTime(act.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Workspace Quick Members list */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 shadow-xl backdrop-blur-sm">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="text-violet-400" size={18} />
              <h3 className="text-sm font-bold text-slate-200">Team Members</h3>
            </div>
            <a href="/members" className="flex items-center gap-0.5 text-xs text-brand-400 hover:text-brand-300 font-semibold">
              <span>View Directory</span>
              <ArrowUpRight size={12} />
            </a>
          </div>

          <div className="space-y-4">
            {members.slice(0, 4).map((member) => (
              <div key={member.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {member.profile?.avatar_url ? (
                    <img src={member.profile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover border border-slate-800" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-xs font-bold">
                      {member.profile?.full_name.substring(0, 2).toUpperCase() || 'US'}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-200 truncate">{member.profile?.full_name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{member.profile?.email}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold border uppercase ${
                  member.role === 'owner' 
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/15' 
                    : member.role === 'manager'
                    ? 'bg-brand-500/10 text-brand-400 border-brand-500/15'
                    : 'bg-slate-850 text-slate-400 border-slate-800'
                }`}>
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
