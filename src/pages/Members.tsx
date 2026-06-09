import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  UserPlus, 
  Mail, 
  UserCheck, 
  Shield, 
  Trash2,
  X,
  Search,
  Check
} from 'lucide-react';

const Members: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { members, inviteMember, removeMember, changeMemberRole } = useWorkspace();
  
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'manager' | 'member'>('member');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteError, setInviteError] = useState('');

  // Check if current user is owner or manager to authorize member operations
  const currentMemberRecord = members.find(m => m.user_id === currentUser?.id);
  const isAuthorized = currentMemberRecord?.role === 'owner' || currentMemberRecord?.role === 'manager';

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
    return m.profile.full_name.toLowerCase().includes(term) || m.profile.email.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">Workspace Directory</h2>
          <p className="text-sm text-slate-400">View team directories, manage role permissions, and invite collaborators.</p>
        </div>
        {isAuthorized && (
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 transition-colors shadow-lg shadow-brand-500/20"
          >
            <UserPlus size={16} />
            <span>Invite Member</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="flex rounded-2xl border border-slate-800/80 bg-slate-900/20 p-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950/40 py-3 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:border-brand-500/80 focus:bg-slate-950 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Directory Table Layout */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/20 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="px-6 py-4">Name & Email</th>
                <th className="px-6 py-4">Workspace Role</th>
                <th className="px-6 py-4">Status</th>
                {isAuthorized && <th className="px-6 py-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-slate-900/20 transition-colors">
                  {/* Name and avatar */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {member.profile.avatar_url ? (
                        <img src={member.profile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover border border-slate-800" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-sm font-bold">
                          {member.profile.full_name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-slate-200 text-sm">{member.profile.full_name}</p>
                        <p className="text-slate-400 text-xs mt-0.5">{member.profile.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Role badge */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                      member.role === 'owner' 
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                        : member.role === 'manager'
                        ? 'bg-brand-500/10 text-brand-400 border-brand-500/20'
                        : 'bg-slate-850 text-slate-400 border-slate-800'
                    }`}>
                      <Shield size={10} />
                      <span>{member.role}</span>
                    </span>
                  </td>

                  {/* Status badge */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                      member.status === 'active' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-orange-500/10 text-orange-400 border-orange-500/20 animate-pulse'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${member.status === 'active' ? 'bg-emerald-400' : 'bg-orange-400'}`}></span>
                      <span className="capitalize">{member.status}</span>
                    </span>
                  </td>

                  {/* Operations actions */}
                  {isAuthorized && (
                    <td className="px-6 py-4 text-right">
                      {member.role !== 'owner' && member.user_id !== currentUser?.id && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleRoleChange(member.id, member.role)}
                            className="rounded-lg border border-slate-800 px-3 py-1.5 font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                          >
                            {member.role === 'manager' ? 'Demote to Member' : 'Promote to Manager'}
                          </button>
                          <button
                            onClick={() => handleRemove(member.id, member.profile.full_name)}
                            title="Remove Member"
                            className="rounded-lg border border-slate-850 p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 transition-all duration-150"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Member Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="text-brand-400" size={20} />
                <h3 className="text-lg font-bold text-slate-100">Invite Team Member</h3>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            {inviteSuccess ? (
              <div className="my-6 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Check size={20} />
                </div>
                <h4 className="text-sm font-bold text-slate-200">Invitation Sent!</h4>
                <p className="text-xs text-slate-400">An invitation email has been sent successfully.</p>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="mt-4 space-y-4">
                {inviteError && (
                  <div className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-[11px] font-semibold text-rose-400">
                    <Shield size={14} className="stroke-[2.5]" />
                    <span>{inviteError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Email Address *</label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3 top-3 text-slate-500" size={16} />
                    <input
                      type="email"
                      required
                      placeholder="teammate@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-600 focus:border-brand-500/80 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Workspace Permission Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-200 focus:border-brand-500 focus:outline-none cursor-pointer"
                  >
                    <option value="member">Team Member (Can manage assigned tasks & comment)</option>
                    <option value="manager">Project Manager (Can create projects, assign tasks, & manage team)</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 transition-colors shadow-lg shadow-brand-500/20"
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
