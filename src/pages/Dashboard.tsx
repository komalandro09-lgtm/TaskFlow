import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
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
  Sparkles,
  Layers,
  PlusCircle,
  PlusSquare,
  UserPlus,
  MailOpen,
  Shield,
  Loader2
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
  const navigate = useNavigate();
  const { activeWorkspace, projects, members, activities, seedDatabase, teams, invitations, acceptInviteByToken, declineInviteByToken } = useWorkspace();
  const { user: currentUser } = useAuth();
  const { theme } = useTheme();
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [pendingInvite, setPendingInvite] = useState<any>(null);
  const [inviteActionLoading, setInviteActionLoading] = useState(false);

  // Check for pending invitations matching current user's email
  useEffect(() => {
    if (currentUser && invitations.length > 0) {
      const pending = invitations.find(
        (inv) => inv.email.toLowerCase() === currentUser.email.toLowerCase() && inv.status === 'Pending'
      );
      if (pending) {
        setPendingInvite(pending);
      }
    }
  }, [currentUser, invitations]);

  const handleAcceptPendingInvite = async () => {
    if (!pendingInvite) return;
    setInviteActionLoading(true);
    const { error } = await acceptInviteByToken(pendingInvite.token);
    if (!error) {
      setPendingInvite(null);
    }
    setInviteActionLoading(false);
  };

  const handleDeclinePendingInvite = async () => {
    if (!pendingInvite) return;
    setInviteActionLoading(true);
    const { error } = await declineInviteByToken(pendingInvite.token);
    if (!error) {
      setPendingInvite(null);
    }
    setInviteActionLoading(false);
  };

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
      window.location.reload();
    } else {
      setSeedStatus('error');
    }
    setSeeding(false);
  };

  // Metrics
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const totalTasks = allTasks.length;
  const totalTeams = teams.length;

  const now = new Date();
  const overdueTasks = allTasks.filter((t: any) => {
    if (t.status === 'completed' || !t.due_date) return false;
    return new Date(t.due_date) < now;
  }).length;

  // Chart data completion trends
  const trendData = [
    { week: 'Week 1', completed: 6, active: 10 },
    { week: 'Week 2', completed: 12, active: 15 },
    { week: 'Week 3', completed: 18, active: 12 },
    { week: 'Week 4', completed: 25, active: 16 },
    { week: 'Week 5', completed: 34, active: 11 },
  ];

  // Workload mapping
  const workloadData = members.map(m => {
    const memberTasks = allTasks.filter((t: any) => t.assignee_id === m.user_id);
    return {
      name: (m.profile?.full_name || 'User').split(' ')[0],
      tasks: memberTasks.length,
      avatar: m.profile?.avatar_url
    };
  });

  const COLORS = ['#8b5cf6', '#6d28d9', '#a78bfa', '#10b981', '#f59e0b'];

  const formatActivityTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString();
  };

  if (!activeWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 max-w-2xl mx-auto text-center animate-in fade-in duration-300">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white shadow-xl shadow-brand-500/20 mb-6 animate-pulse">
          <Sparkles size={28} />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white md:text-3xl mb-3">Welcome to TaskFlow!</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
          Your dashboard space is connected and ready to sync.
          Seed this workspace environment with standard Linear-style team setups, project structures, and board tasks automatically.
        </p>
        <div className="w-full flex flex-col items-center justify-center gap-4">
          <button
            onClick={handleSeedDatabase}
            disabled={seeding}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 px-8 py-3.5 text-sm font-bold text-white hover:from-brand-500 hover:to-indigo-500 transition-all shadow-lg shadow-brand-500/10 disabled:opacity-50"
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
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
              <Check size={14} />
              <span>Workspace seeded successfully! Reloading...</span>
            </span>
          )}
          {seedStatus === 'error' && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-500">
              <X size={14} />
              <span>Failed to seed database. Verify local storage parameters.</span>
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto transition-colors duration-200">
      {/* Header Banner */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-white md:text-3xl">
            {activeWorkspace.name} Overview
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Track and monitor your workspace progress and team metrics.</p>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="glass-card hover-glow rounded-2xl p-5 shadow-xs transition-all animate-fade-in-up delay-50 opacity-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Teams</span>
            <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-500 dark:text-indigo-400">
              <Layers size={16} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-slate-800 dark:text-white leading-none">{totalTeams}</span>
            <span className="text-[10px] text-slate-500 font-semibold">Layers</span>
          </div>
        </div>

        <div className="glass-card hover-glow rounded-2xl p-5 shadow-xs transition-all animate-fade-in-up delay-100 opacity-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Projects</span>
            <div className="rounded-xl bg-blue-500/10 p-2 text-blue-500 dark:text-blue-400">
              <Folder size={16} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-slate-800 dark:text-white leading-none">{totalProjects}</span>
            <span className="text-[10px] text-slate-500 font-semibold">Active: {activeProjects}</span>
          </div>
        </div>

        <div className="glass-card hover-glow rounded-2xl p-5 shadow-xs transition-all animate-fade-in-up delay-150 opacity-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Successes</span>
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-500 dark:text-emerald-400">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-slate-800 dark:text-white leading-none">{completedProjects}</span>
            <span className="text-[10px] text-slate-500 font-semibold">Done</span>
          </div>
        </div>

        <div className="glass-card hover-glow rounded-2xl p-5 shadow-xs transition-all animate-fade-in-up delay-200 opacity-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tasks</span>
            <div className="rounded-xl bg-brand-500/10 p-2 text-brand-500 dark:text-brand-400">
              <ListTodo size={16} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-slate-800 dark:text-white leading-none">{totalTasks}</span>
            <span className="text-[10px] text-slate-500 font-semibold">Assigned</span>
          </div>
        </div>

        <div className="glass-card hover-glow rounded-2xl p-5 shadow-xs transition-all animate-fade-in-up delay-250 opacity-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Overdue</span>
            <div className={`rounded-xl p-2 ${overdueTasks > 0 ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className={`text-2xl font-extrabold leading-none ${overdueTasks > 0 ? 'text-rose-500 dark:text-rose-400' : 'text-slate-800 dark:text-white'}`}>{overdueTasks}</span>
            <span className="text-[10px] text-slate-500 font-semibold">Attention</span>
          </div>
        </div>

        <div className="glass-card hover-glow rounded-2xl p-5 shadow-xs transition-all animate-fade-in-up delay-300 opacity-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Members</span>
            <div className="rounded-xl bg-violet-500/10 p-2 text-violet-550 dark:text-violet-400">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-slate-800 dark:text-white leading-none">{members.length}</span>
            <span className="text-[10px] text-slate-500 font-semibold">Active</span>
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div 
        className="rounded-2xl p-4"
        style={{ 
          background: 'var(--surface, white)',
          border: '1px solid rgba(139, 92, 246, 0.1)',
          boxShadow: '0 2px 12px rgba(109, 40, 217, 0.05)'
        }}
      >
        <h3 className="text-xs font-bold uppercase tracking-wider mb-3 px-1" style={{ color: 'rgba(109, 40, 217, 0.5)' }}>Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button 
            onClick={() => navigate('/projects')}
            className="flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold text-left transition-all duration-200 hover:scale-[1.02]"
            style={{
              background: 'rgba(139, 92, 246, 0.06)',
              border: '1px solid rgba(139, 92, 246, 0.12)',
              color: 'var(--text-primary, #1e1b4b)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(139, 92, 246, 0.12)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139, 92, 246, 0.25)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(139, 92, 246, 0.06)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139, 92, 246, 0.12)';
            }}
          >
            <PlusSquare size={14} style={{ color: '#8b5cf6' }} />
            <span>Create Project</span>
          </button>
          <button 
            onClick={() => navigate('/teams')}
            className="flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold text-left transition-all duration-200 hover:scale-[1.02]"
            style={{
              background: 'rgba(139, 92, 246, 0.06)',
              border: '1px solid rgba(139, 92, 246, 0.12)',
              color: 'var(--text-primary, #1e1b4b)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(139, 92, 246, 0.12)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139, 92, 246, 0.25)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(139, 92, 246, 0.06)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139, 92, 246, 0.12)';
            }}
          >
            <PlusCircle size={14} style={{ color: '#a78bfa' }} />
            <span>Create Team</span>
          </button>
          <button 
            onClick={() => navigate('/members')}
            className="flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold text-left transition-all duration-200 hover:scale-[1.02]"
            style={{
              background: 'rgba(139, 92, 246, 0.06)',
              border: '1px solid rgba(139, 92, 246, 0.12)',
              color: 'var(--text-primary, #1e1b4b)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(139, 92, 246, 0.12)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139, 92, 246, 0.25)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(139, 92, 246, 0.06)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139, 92, 246, 0.12)';
            }}
          >
            <UserPlus size={14} style={{ color: '#10b981' }} />
            <span>Invite Teammate</span>
          </button>
          <button 
            onClick={() => navigate('/tasks')}
            className="flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold text-left transition-all duration-200 hover:scale-[1.02]"
            style={{
              background: 'rgba(139, 92, 246, 0.06)',
              border: '1px solid rgba(139, 92, 246, 0.12)',
              color: 'var(--text-primary, #1e1b4b)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(139, 92, 246, 0.12)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139, 92, 246, 0.25)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(139, 92, 246, 0.06)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139, 92, 246, 0.12)';
            }}
          >
            <PlusCircle size={14} style={{ color: '#f59e0b' }} />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* Analytics Recharts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* area chart */}
        <div 
          className="rounded-2xl p-5 lg:col-span-2"
          style={{
            background: 'var(--surface, white)',
            border: '1px solid rgba(139, 92, 246, 0.1)',
            boxShadow: '0 2px 16px rgba(109, 40, 217, 0.05)'
          }}
        >
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp style={{ color: '#8b5cf6' }} size={16} />
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary, rgba(109,40,217,0.6))' }}>Productivity Trends</h3>
            </div>
            <span 
              className="rounded-lg px-2 py-0.5 text-[9px] font-bold"
              style={{
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                color: '#8b5cf6'
              }}
            >Active Log</span>
          </div>

          <div className="h-64 w-full text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.07)'} />
                <XAxis dataKey="week" stroke={theme === 'dark' ? 'rgba(167, 139, 250, 0.4)' : 'rgba(109, 40, 217, 0.4)'} />
                <YAxis stroke={theme === 'dark' ? 'rgba(167, 139, 250, 0.4)' : 'rgba(109, 40, 217, 0.4)'} />
                <Tooltip
                  contentStyle={theme === 'dark' ? { backgroundColor: '#1a0e35', borderColor: 'rgba(139, 92, 246, 0.25)', borderRadius: '12px', color: '#e2e0ff' } : { backgroundColor: '#ffffff', borderColor: 'rgba(139, 92, 246, 0.15)', borderRadius: '12px' }}
                  labelStyle={theme === 'dark' ? { fontWeight: 'bold', color: '#c4b5fd' } : { fontWeight: 'bold', color: '#1e1b4b' }}
                />
                <Area type="monotone" dataKey="completed" name="Completed Tasks" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCompleted)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* bar chart */}
        <div 
          className="rounded-2xl p-5"
          style={{
            background: 'var(--surface, white)',
            border: '1px solid rgba(139, 92, 246, 0.1)',
            boxShadow: '0 2px 16px rgba(109, 40, 217, 0.05)'
          }}
        >
          <div className="mb-5 flex items-center gap-2">
            <Users style={{ color: '#a78bfa' }} size={16} />
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary, rgba(109,40,217,0.6))' }}>Workload Distribution</h3>
          </div>

          <div className="h-64 w-full text-[10px]">
            {workloadData.length === 0 ? (
              <div className="flex h-full items-center justify-center" style={{ color: 'rgba(139, 92, 246, 0.4)' }}>
                <p>No member workloads found</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workloadData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.07)'} />
                  <XAxis dataKey="name" stroke={theme === 'dark' ? 'rgba(167, 139, 250, 0.4)' : 'rgba(109, 40, 217, 0.4)'} />
                  <YAxis stroke={theme === 'dark' ? 'rgba(167, 139, 250, 0.4)' : 'rgba(109, 40, 217, 0.4)'} allowDecimals={false} />
                  <Tooltip
                    contentStyle={theme === 'dark' ? { backgroundColor: '#1a0e35', borderColor: 'rgba(139, 92, 246, 0.25)', borderRadius: '12px', color: '#e2e0ff' } : { backgroundColor: '#ffffff', borderColor: 'rgba(139, 92, 246, 0.15)', borderRadius: '12px' }}
                    labelStyle={theme === 'dark' ? { fontWeight: 'bold', color: '#c4b5fd' } : { fontWeight: 'bold', color: '#1e1b4b' }}
                  />
                  <Bar dataKey="tasks" name="Tasks Count" radius={[4, 4, 0, 0]}>
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

      {/* Activity Timeline and Directory Directory */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent logs */}
        <div 
          className="rounded-2xl p-5 lg:col-span-2 space-y-4"
          style={{
            background: 'var(--surface, white)',
            border: '1px solid rgba(139, 92, 246, 0.1)',
            boxShadow: '0 2px 16px rgba(109, 40, 217, 0.05)'
          }}
        >
          <div className="flex items-center gap-2 pb-3 mb-2" style={{ borderBottom: '1px solid rgba(139, 92, 246, 0.1)' }}>
            <Activity style={{ color: '#8b5cf6' }} size={16} />
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary, rgba(109,40,217,0.6))' }}>Recent Workspace Activities</h3>
          </div>

          <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
            {activities.slice(0, 10).map((act) => (
              <div key={act.id} className="flex gap-3 text-xs pb-3 last:pb-0" style={{ borderBottom: '1px solid rgba(139, 92, 246, 0.06)' }}>
                {act.profile?.avatar_url ? (
                  <img src={act.profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover mt-0.5 shrink-0" style={{ border: '2px solid rgba(139, 92, 246, 0.2)' }} />
                ) : (
                  <div 
                    className="flex h-8 w-8 items-center justify-center rounded-full font-bold text-[9px] mt-0.5 shrink-0 text-white"
                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}
                  >
                    {(act.profile?.full_name || 'US').substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="leading-relaxed" style={{ color: 'var(--text-primary, #1e1b4b)' }}>
                    <strong className="font-bold">{act.profile?.full_name || 'System User'}</strong>
                    {' '}{act.action}{' '}
                    <span 
                      className="rounded px-1.5 py-0.5 text-[9px] font-mono font-semibold"
                      style={{
                        background: 'rgba(139, 92, 246, 0.08)',
                        color: 'var(--text-secondary, rgba(109,40,217,0.6))'
                      }}
                    >
                      {act.target_type}: {act.target_name}
                    </span>
                  </p>
                  <p className="text-[9px] font-semibold mt-1" style={{ color: 'rgba(139, 92, 246, 0.4)' }}>{formatActivityTime(act.created_at)}</p>
                </div>
              </div>
            ))}

            {activities.length === 0 && (
              <div className="py-8 text-center" style={{ color: 'rgba(139, 92, 246, 0.4)' }}>
                <p>No activity logs recorded yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Members Quick List */}
        <div 
          className="rounded-2xl p-5 space-y-4"
          style={{
            background: 'var(--surface, white)',
            border: '1px solid rgba(139, 92, 246, 0.1)',
            boxShadow: '0 2px 16px rgba(109, 40, 217, 0.05)'
          }}
        >
          <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid rgba(139, 92, 246, 0.1)' }}>
            <div className="flex items-center gap-2">
              <Users style={{ color: '#a78bfa' }} size={16} />
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary, rgba(109,40,217,0.6))' }}>Teammates</h3>
            </div>
            <button 
              onClick={() => navigate('/members')}
              className="flex items-center gap-0.5 text-[10px] font-bold transition-colors"
              style={{ color: '#a78bfa' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#c4b5fd'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#a78bfa'}
            >
              <span>Directory</span>
              <ArrowUpRight size={10} />
            </button>
          </div>

          <div className="space-y-4">
            {members.slice(0, 5).map((member) => (
              <div key={member.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  {member.profile?.avatar_url ? (
                    <img src={member.profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" style={{ border: '2px solid rgba(139, 92, 246, 0.2)' }} />
                  ) : (
                    <div 
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-[10px] text-white"
                      style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}
                    >
                      {(member.profile?.full_name || 'US').substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold truncate leading-none" style={{ color: 'var(--text-primary, #1e1b4b)' }}>{member.profile?.full_name}</p>
                    <p className="text-[9px] truncate mt-1 leading-none" style={{ color: 'rgba(139, 92, 246, 0.4)' }}>{member.profile?.email}</p>
                  </div>
                </div>
                <span 
                  className="rounded-full px-2 py-0.5 text-[8px] font-extrabold uppercase"
                  style={{
                    background: member.role === 'owner' 
                      ? 'rgba(245, 158, 11, 0.1)'
                      : member.role === 'manager'
                      ? 'rgba(139, 92, 246, 0.1)'
                      : 'rgba(139, 92, 246, 0.06)',
                    color: member.role === 'owner' 
                      ? '#d97706'
                      : member.role === 'manager'
                      ? '#7c3aed'
                      : 'rgba(139, 92, 246, 0.5)',
                    border: member.role === 'owner' 
                      ? '1px solid rgba(245, 158, 11, 0.2)'
                      : member.role === 'manager'
                      ? '1px solid rgba(139, 92, 246, 0.2)'
                      : '1px solid rgba(139, 92, 246, 0.1)',
                  }}
                >
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending Invitation Modal Overlay */}
      {pendingInvite && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-7 shadow-2xl animate-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-100 overflow-hidden">
            {/* Ambient Modal Stripe */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-brand-600 via-violet-500 to-cyan-500"></div>

            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-violet-500 text-white shadow-lg shadow-brand-500/20">
                <MailOpen size={28} />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Workspace Invitation</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">You have a pending invitation to join a workspace.</p>
              </div>

              <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 space-y-2.5 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Workspace</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-white">{pendingInvite.profile?.inviter_name ? 'Invited Workspace' : 'Workspace'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email</span>
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{pendingInvite.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned Role</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/20 bg-brand-500/5 px-2.5 py-0.5 text-[10px] font-bold text-brand-600 dark:text-brand-400 capitalize">
                    <Shield size={10} />
                    {pendingInvite.role}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full pt-2">
                <button
                  onClick={handleDeclinePendingInvite}
                  disabled={inviteActionLoading}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 transition-all disabled:opacity-50"
                >
                  {inviteActionLoading ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Decline'}
                </button>
                <button
                  onClick={handleAcceptPendingInvite}
                  disabled={inviteActionLoading}
                  className="rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-500 shadow-lg shadow-brand-500/15 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {inviteActionLoading ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Accept Invitation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
