import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import { 
  UserPlus, 
  Mail, 
  Shield, 
  Trash2,
  X,
  Search,
  Check,
  UserCheck,
  AlertCircle,
  RefreshCw,
  XCircle,
  Clock,
  Send
} from 'lucide-react';

const Members: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { activeWorkspace, members, invitations, inviteMember, removeMember, changeMemberRole, resendInvitation, cancelInvitation } = useWorkspace();
  
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'manager' | 'member'>('member');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteError, setInviteError] = useState('');

  // Check if current user is owner or manager to authorize member operations
  const currentMemberRecord = members.find(m => m.user_id === currentUser?.id);
  const isAuthorized = currentMemberRecord?.role === 'owner' || currentMemberRecord?.role === 'manager';

  if (!activeWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 max-w-md mx-auto text-center animate-in fade-in duration-300">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 dark:from-brand-500/20 text-brand-600 dark:text-brand-400 mb-6 border border-brand-500/15 shadow-sm">
          <UserPlus size={26} />
        </div>
        <h3 className="text-xl font-bold tracking-tight text-slate-850 dark:text-white">Workspace Required</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed">
          Please select or create a workspace first to manage team members. You can switch workspaces from the sidebar selector or click below to return to the Dashboard.
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

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviteSuccess(false);
    setInviteError('');

    const { error } = await inviteMember(inviteEmail, inviteRole);
    if (error) {
      setInviteError(error.message || 'Failed to send workspace invitation.');
    } else {
      setInviteSuccess(true);
      setInviteEmail('');
      setTimeout(() => {
        setIsInviteModalOpen(false);
        setInviteSuccess(false);
      }, 1500);
    }
  };

  const handleRoleChange = async (memberId: string, currentRole: string) => {
    if (!isAuthorized) return;
    const newRole = currentRole === 'manager' ? 'member' : 'manager';
    await changeMemberRole(memberId, newRole);
  };

  const handleRemove = async (memberId: string, fullName: string) => {
    if (!isAuthorized) return;
    if (confirm(`Are you sure you want to remove ${fullName} from this workspace? They will lose access to all projects and tasks.`)) {
      await removeMember(memberId);
    }
  };

  const filteredMembers = members.filter(m => {
    const term = searchQuery.toLowerCase();
    return (m.profile?.full_name || '').toLowerCase().includes(term) || (m.profile?.email || '').toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto transition-all duration-300 page-enter">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-violet-100/40 dark:border-slate-805/40 pb-5">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-3xl">Workspace Directory</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">View team directories, manage role permissions, and invite collaborators.</p>
        </div>
        {isAuthorized && (
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-2 rounded-xl btn-brand px-4 py-2.5 text-sm font-bold shadow-lg shadow-brand-primary/20"
          >
            <UserPlus size={16} />
            <span>Invite Member</span>
          </button>
        )}
      </div>

      {/* Control Actions / Search Bar */}
      <div className="flex rounded-2xl glass-panel p-4 shadow-sm">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-3.5 text-slate-450 dark:text-violet-400/50" />
          <input
            type="text"
            placeholder="Search team members by name or email address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl glass-input py-3 pl-11 pr-4 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Directory Table Layout */}
      <div className="rounded-2xl border border-violet-100/50 dark:border-slate-800/60 bg-white/10 dark:bg-slate-900/10 overflow-hidden shadow-sm backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-violet-100/60 dark:border-slate-800 bg-violet-50/20 dark:bg-slate-900/30 text-slate-550 dark:text-slate-400 uppercase tracking-wider font-semibold">
                <th className="px-6 py-4.5 text-xs">Name & Email</th>
                <th className="px-6 py-4.5 text-xs">Workspace Role</th>
                <th className="px-6 py-4.5 text-xs">Status</th>
                {isAuthorized && <th className="px-6 py-4.5 text-right text-xs">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-100/30 dark:divide-slate-800/40">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={isAuthorized ? 4 : 3} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <UserCheck size={28} className="stroke-[1.5] text-slate-300 dark:text-slate-655" />
                      <p className="text-sm font-semibold">No team members match your search criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-violet-50/10 dark:hover:bg-slate-900/20 transition-all duration-150">
                    {/* Name and avatar */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3.5">
                        {member.profile.avatar_url ? (
                          <img src={member.profile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover border border-slate-200 dark:border-slate-800 shadow-sm" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-brand-500/10 to-violet-500/10 dark:from-brand-500/20 dark:to-violet-500/20 text-brand-600 dark:text-brand-300 text-sm font-bold border border-brand-500/20">
                            {(member.profile?.full_name || 'US').substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-850 dark:text-slate-200 text-sm">{member.profile.full_name}</p>
                          <p className="text-slate-500 dark:text-slate-405 text-xs mt-0.5">{member.profile.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role badge */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase ${
                        member.role === 'owner' 
                          ? 'bg-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20' 
                          : member.role === 'manager'
                          ? 'bg-brand-primary/5 text-brand-primary dark:text-brand-primary border-brand-primary/20'
                          : 'bg-slate-100 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                      }`}>
                        <Shield size={11} className="stroke-[2]" />
                        <span>{member.role}</span>
                      </span>
                    </td>

                    {/* Status badge */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold border ${
                        member.status === 'active' 
                          ? 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-450 border-emerald-500/20' 
                          : 'bg-orange-500/5 text-orange-600 dark:text-orange-455 border-orange-500/20 animate-pulse'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${member.status === 'active' ? 'bg-emerald-500 dark:bg-emerald-450' : 'bg-orange-500 dark:bg-orange-455'}`}></span>
                        <span className="capitalize">{member.status}</span>
                      </span>
                    </td>

                    {/* Operations actions */}
                    {isAuthorized && (
                      <td className="px-6 py-4 text-right">
                        {member.role !== 'owner' && member.user_id !== currentUser?.id && (
                          <div className="flex items-center justify-end gap-2.5">
                            <button
                              onClick={() => handleRoleChange(member.id, member.role)}
                              className="rounded-xl border border-violet-100/80 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-1.5 text-xs font-semibold text-slate-605 dark:text-slate-305 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white transition-all active:scale-[0.97]"
                            >
                              {member.role === 'manager' ? 'Demote to Member' : 'Promote to Manager'}
                            </button>
                            <button
                              onClick={() => handleRemove(member.id, member.profile.full_name)}
                              title="Remove Member"
                              className="rounded-xl border border-slate-205 dark:border-slate-800 p-2 text-slate-400 dark:text-slate-500 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-450 hover:border-rose-300 dark:hover:border-rose-500/20 transition-all active:scale-[0.95]"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invitations Management Section */}
      {isAuthorized && invitations.filter(i => i.status === 'Pending' || i.status === 'Expired').length > 0 && (
        <div className="rounded-2xl border border-violet-100/50 dark:border-slate-800/80 bg-white/10 dark:bg-slate-900/10 overflow-hidden shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-violet-100/60 dark:border-slate-800 bg-violet-50/20 dark:bg-slate-900/30">
            <Clock size={16} className="text-amber-500" />
            <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Pending Invitations</h3>
            <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 ml-1">
              {invitations.filter(i => i.status === 'Pending').length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-violet-100/50 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="px-6 py-3.5 text-xs">Email</th>
                  <th className="px-6 py-3.5 text-xs">Role</th>
                  <th className="px-6 py-3.5 text-xs">Status</th>
                  <th className="px-6 py-3.5 text-xs">Expires</th>
                  <th className="px-6 py-3.5 text-right text-xs">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-100/30 dark:divide-slate-800/40">
                {invitations
                  .filter(i => i.status === 'Pending' || i.status === 'Expired')
                  .map((inv) => (
                    <tr key={inv.id} className="hover:bg-violet-50/10 dark:hover:bg-slate-900/20 transition-all duration-150">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-brand-500/10 to-violet-500/10 dark:from-brand-500/20 dark:to-violet-500/20 text-brand-600 dark:text-brand-300 text-[10px] font-bold border border-brand-500/20">
                            {inv.email.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-850 dark:text-slate-200 text-sm">{inv.email}</p>
                            <p className="text-[10px] text-slate-405 mt-0.5">Invited by {inv.profile?.inviter_name || 'Admin'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase bg-brand-primary/5 text-brand-primary dark:text-brand-primary border-brand-primary/20">
                          <Shield size={11} className="stroke-[2]" />
                          {inv.role}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold border ${
                          inv.status === 'Pending'
                            ? 'bg-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20 animate-pulse'
                            : 'bg-slate-100 dark:bg-slate-800/40 text-slate-500 border-slate-200 dark:border-slate-800'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${inv.status === 'Pending' ? 'bg-amber-500' : 'bg-slate-400'}`}></span>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {new Date(inv.expires_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={async () => {
                              await resendInvitation(inv.id);
                            }}
                            title="Resend Invitation Email"
                            className="flex items-center gap-1.5 rounded-xl border border-violet-100 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1.5 text-[11px] font-semibold text-brand-primary hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:border-brand-primary/30 transition-all active:scale-[0.97]"
                          >
                            <Send size={12} />
                            Resend
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Cancel invitation for ${inv.email}?`)) {
                                await cancelInvitation(inv.id);
                              }
                            }}
                            title="Cancel Invitation"
                            className="rounded-xl border border-slate-200 dark:border-slate-800 p-2 text-slate-400 dark:text-slate-500 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-500/20 transition-all active:scale-[0.95]"
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border border-violet-200/30 dark:border-violet-805/30 bg-white dark:bg-slate-950 p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-100 overflow-hidden">
            {/* Ambient Modal Stripe */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-brand-primary to-brand-dark"></div>

            <div className="flex items-center justify-between border-b border-violet-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
                  <UserPlus size={18} />
                </div>
                <h3 className="text-lg font-bold">Invite Team Member</h3>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-700 dark:hover:text-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            {inviteSuccess ? (
              <div className="my-8 text-center space-y-3.5 animate-in zoom-in-95 duration-300">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                  <Check size={24} className="stroke-[2.5]" />
                </div>
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">Invitation Sent!</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">A workspace invitation has been sent successfully to the provided email address.</p>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="mt-5 space-y-5">
                {inviteError && (
                  <div className="flex flex-col gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-xs font-semibold text-rose-600 dark:text-rose-400">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle size={16} className="stroke-[2.5] shrink-0 mt-0.5 text-rose-500" />
                      <span>{inviteError}</span>
                    </div>
                    {inviteError.toLowerCase().includes('limit') && (
                      <button
                        type="button"
                        onClick={() => navigate('/settings')}
                        className="w-fit flex items-center gap-1 bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-3 py-1.5 font-bold text-[10px] shadow-sm transition-all"
                      >
                        Upgrade Workspace Plan
                      </button>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400">Email Address *</label>
                  <div className="relative mt-2">
                    <Mail className="absolute left-3.5 top-3.5 text-slate-400 dark:text-slate-500" size={16} />
                    <input
                      type="email"
                      required
                      placeholder="teammate@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full rounded-2xl glass-input py-3 pl-11 pr-4 text-sm text-slate-850 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400">Workspace Permission Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="mt-2 w-full rounded-2xl glass-input p-3 text-sm text-slate-800 dark:text-slate-250 focus:outline-none cursor-pointer"
                  >
                    <option value="member">Team Member (Can manage assigned tasks & comment)</option>
                    <option value="manager">Project Manager (Can create projects, assign tasks, & manage team)</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-violet-100 dark:border-slate-805">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-505 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl btn-brand px-5 py-2.5 text-xs font-bold shadow-md active:scale-[0.98]"
                  >
                    Send Invitation
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

export default Members;
