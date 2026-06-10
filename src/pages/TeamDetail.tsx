import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import * as LucideIcons from 'lucide-react';
import { 
  Users, 
  FolderPlus, 
  Trash2, 
  X, 
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  Check,
  Mail,
  FolderKanban,
  Activity,
  Award,
  Plus
} from 'lucide-react';

const TeamDetail: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { 
    teams, 
    teamMembers, 
    projects, 
    addTeamMember, 
    removeTeamMember, 
    changeTeamMemberRole,
    members: workspaceMembers,
    deleteTeam
  } = useWorkspace();

  const [team, setTeam] = useState<any>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'lead' | 'member'>('member');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState(false);

  useEffect(() => {
    const t = teams.find(item => item.id === teamId);
    if (t) {
      setTeam(t);
    } else if (teams.length > 0) {
      navigate('/teams');
    }
  }, [teamId, teams]);

  if (!team) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-slate-500">
        <p className="text-sm">Loading team details...</p>
      </div>
    );
  }

  // Filter items associated with this team
  const tMembers = teamMembers.filter(tm => tm.team_id === team.id);
  const tProjects = projects.filter(p => p.team_id === team.id);
  
  // Find Team Lead
  const teamLead = tMembers.find(tm => tm.role === 'lead');

  // Average progress
  const teamProgress = tProjects.length > 0 
    ? Math.round(tProjects.reduce((acc, p) => acc + (p.progress || 0), 0) / tProjects.length)
    : 0;

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess(false);

    if (!inviteEmail.trim()) return;

    // Check if the user is in the workspace first
    const isWsMember = workspaceMembers.some(wm => wm.profile?.email.toLowerCase() === inviteEmail.toLowerCase());
    if (!isWsMember) {
      setInviteError("This user is not a member of the workspace. Please invite them to the workspace first from the Members directory.");
      return;
    }

    const { member, error } = await addTeamMember(team.id, inviteEmail, inviteRole);
    if (error) {
      setInviteError(error.message || 'Failed to add member to team.');
    } else {
      setInviteSuccess(true);
      setInviteEmail('');
      setTimeout(() => {
        setIsInviteOpen(false);
        setInviteSuccess(false);
      }, 1500);
    }
  };

  const handleRemoveMember = async (teamMemberId: string, name: string) => {
    if (confirm(`Remove ${name} from this team?`)) {
      await removeTeamMember(teamMemberId);
    }
  };

  const handleChangeRole = async (teamMemberId: string, currentRole: 'lead' | 'member') => {
    const nextRole = currentRole === 'lead' ? 'member' : 'lead';
    
    // If promoting to lead, demote current lead to member to preserve 1 lead per team structure
    if (nextRole === 'lead' && teamLead) {
      await changeTeamMemberRole(teamLead.id, 'member');
    }
    
    await changeTeamMemberRole(teamMemberId, nextRole);
  };

  const handleDeleteTeam = async () => {
    if (confirm(`Are you sure you want to delete "${team.name}"? This team space will be removed permanently.`)) {
      const { error } = await deleteTeam(team.id);
      if (!error) {
        navigate('/teams');
      }
    }
  };

  const renderTeamIcon = (iconName: string, size = 24) => {
    const IconComp = (LucideIcons as any)[iconName] || LucideIcons.Users;
    return <IconComp size={size} />;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto transition-colors duration-200">
      {/* Welcome header widget */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200/60 dark:border-slate-805/85 pb-5">
        <div className="flex items-center gap-3">
          <div 
            className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-md shadow-brand-500/10"
            style={{ backgroundColor: team.color }}
          >
            {renderTeamIcon(team.icon, 24)}
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-white">{team.name}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-lg">{team.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsInviteOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-500 transition-colors shadow-sm"
          >
            <Plus size={14} />
            <span>Add Member</span>
          </button>
          <button
            onClick={handleDeleteTeam}
            className="flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-500/5 dark:bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-500 hover:bg-rose-500 hover:text-white transition-colors"
          >
            <Trash2 size={14} />
            <span>Delete Team</span>
          </button>
        </div>
      </div>

      {/* Metrics board */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Team Progress</span>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-2xl font-extrabold text-slate-800 dark:text-white">{teamProgress}%</span>
            <div className="h-2 w-24 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${teamProgress}%`, backgroundColor: team.color }} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-bold">Team Lead</span>
          <div className="mt-2.5 flex items-center gap-2">
            {teamLead ? (
              <>
                <img src={teamLead.profile?.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover border border-slate-200" />
                <div className="overflow-hidden">
                  <span className="block text-xs font-bold text-slate-850 dark:text-slate-200 truncate">{teamLead.profile?.full_name}</span>
                  <span className="text-[9px] text-slate-455 dark:text-slate-500 truncate block leading-none mt-0.5">Manager</span>
                </div>
              </>
            ) : (
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Unassigned lead</span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Members</span>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-800 dark:text-white">{tMembers.length}</span>
            <span className="text-[10px] text-slate-500">Collaborators</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Projects</span>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-800 dark:text-white">{tProjects.length}</span>
            <span className="text-[10px] text-slate-500">Connected trackables</span>
          </div>
        </div>
      </div>

      {/* Main dashboard body */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Members column */}
        <div className="rounded-2xl border border-slate-205 dark:border-slate-800/80 bg-white dark:bg-slate-900/30 p-5 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-850 pb-3">
            <Users className="text-brand-500" size={16} />
            <h3 className="text-sm font-bold text-slate-755 dark:text-slate-200">Teammates & Roles</h3>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-850">
            {tMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3 overflow-hidden">
                  <img src={member.profile?.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover border border-slate-200/60 shadow-xs" />
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{member.profile?.full_name}</p>
                    <p className="text-[10px] text-slate-455 dark:text-slate-500 truncate">{member.profile?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleChangeRole(member.id, member.role)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border transition-colors ${
                      member.role === 'lead'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-brand-500/40 hover:text-brand-500'
                    }`}
                  >
                    <Award size={10} />
                    <span>{member.role === 'lead' ? 'Team Lead' : 'Make Lead'}</span>
                  </button>

                  <button
                    onClick={() => handleRemoveMember(member.id, member.profile?.full_name)}
                    className="rounded p-1 text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}

            {tMembers.length === 0 && (
              <div className="py-8 text-center text-slate-500">
                <p className="text-xs font-semibold">No team members assigned.</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Click "Add Member" to build your team roster.</p>
              </div>
            )}
          </div>
        </div>

        {/* Projects list card column */}
        <div className="rounded-2xl border border-slate-205 dark:border-slate-800/80 bg-white dark:bg-slate-900/30 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-850 pb-3">
            <FolderKanban className="text-violet-500" size={16} />
            <h3 className="text-sm font-bold text-slate-755 dark:text-slate-200">Team Projects</h3>
          </div>

          <div className="space-y-3">
            {tProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/project/${project.id}`)}
                className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/20 p-3 hover:border-brand-500/30 hover:bg-white dark:hover:bg-slate-905 transition-all cursor-pointer shadow-xs"
              >
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{project.name}</p>
                  <p className="text-[9px] text-slate-455 dark:text-slate-500 truncate font-semibold uppercase mt-0.5">{project.status}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-705 dark:text-slate-400">{project.progress}%</span>
                  <ChevronRight size={12} className="text-slate-400" />
                </div>
              </div>
            ))}

            {tProjects.length === 0 && (
              <div className="py-8 text-center text-slate-550">
                <p className="text-xs font-semibold">No projects connected.</p>
                <p className="text-[10px] text-slate-450 mt-0.5">Assign team_id to projects to display them in this panel.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Member Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="text-brand-500" size={20} />
                <h3 className="text-lg font-bold">Add Team Teammate</h3>
              </div>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            {inviteSuccess ? (
              <div className="my-6 text-center space-y-3 animate-in fade-in duration-200">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Check size={18} />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Added Successfully!</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">User is now part of this workspace team.</p>
              </div>
            ) : (
              <form onSubmit={handleAddMember} className="mt-4 space-y-4">
                {inviteError && (
                  <div className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-[11px] font-semibold text-rose-500">
                    <ShieldAlert size={14} />
                    <span>{inviteError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Teammate Email *</label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3 top-3 text-slate-400 dark:text-slate-500" size={16} />
                    <input
                      type="email"
                      required
                      placeholder="e.g. member@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-905 py-2.5 pl-10 pr-4 text-sm text-slate-800 dark:text-slate-200 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Team Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-905 p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:border-brand-500 focus:outline-none cursor-pointer"
                  >
                    <option value="member">Team Member</option>
                    <option value="lead">Team Lead</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsInviteOpen(false)}
                    className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-550 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 transition-colors shadow-lg shadow-brand-500/20"
                  >
                    Add Teammate
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamDetail;
