import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { 
  User, 
  Briefcase, 
  Check, 
  X, 
  Sparkles, 
  ShieldCheck,
  Loader2,
  Database,
  AlertTriangle,
  Trash2
} from 'lucide-react';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const { activeWorkspace, members, acceptInvitation, declineInvitation, seedDatabase, updateWorkspace, deleteWorkspace } = useWorkspace();

  // Profile forms
  const [profileName, setProfileName] = useState(user?.full_name || '');
  const [profileAvatar, setProfileAvatar] = useState(user?.avatar_url || '');
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Delete workspace state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleConfirmDeleteWorkspace = async () => {
    if (!activeWorkspace) return;
    setDeleting(true);
    setDeleteError('');
    const { error } = await deleteWorkspace(activeWorkspace.id);
    if (error) {
      setDeleteError(error.message || 'Failed to delete workspace.');
      setDeleting(false);
    } else {
      setIsDeleteModalOpen(false);
      setDeleting(false);
      navigate('/');
    }
  };

  // Database Seeding state
  const [seeding, setSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState<'idle' | 'success' | 'error'>('idle');

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

  // Workspace forms
  const [wsName, setWsName] = useState(activeWorkspace?.name || '');
  const [wsDesc, setWsDesc] = useState(activeWorkspace?.description || '');
  const [wsLogo, setWsLogo] = useState(activeWorkspace?.logo_url || '');
  const [wsSuccess, setWsSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileName(user.full_name);
      setProfileAvatar(user.avatar_url);
    }
  }, [user]);

  useEffect(() => {
    if (activeWorkspace) {
      setWsName(activeWorkspace.name);
      setWsDesc(activeWorkspace.description);
      setWsLogo(activeWorkspace.logo_url);
    }
  }, [activeWorkspace]);

  // Authorization checks
  const currentMemberRecord = members.find(m => m.user_id === user?.id);
  const isWorkspaceAdmin = currentMemberRecord?.role === 'owner' || currentMemberRecord?.role === 'manager';

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return;

    const { error } = await updateProfile(profileName, profileAvatar);
    if (!error) {
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 2000);
    }
  };

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsName.trim() || !activeWorkspace) return;

    const { error } = await updateWorkspace(activeWorkspace.id, {
      name: wsName,
      description: wsDesc,
      logo_url: wsLogo
    });

    if (!error) {
      setWsSuccess(true);
      setTimeout(() => setWsSuccess(false), 2000);
    }
  };

  const pendingInvites = members.filter(m => m.status === 'pending');

  return (
    <div className="space-y-8 max-w-5xl mx-auto page-enter">
      <div className="border-b border-violet-100 dark:border-violet-900/40 pb-5">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white md:text-3xl">Account & Settings</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configure personal credentials and update workspace features.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* User Profile Form */}
        <div className="rounded-3xl glass-card p-6 relative overflow-hidden animate-fade-in-up delay-50">
          <div className="mb-6 flex items-center gap-3 border-b border-violet-50 dark:border-violet-900/20 pb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <User size={18} />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-250 uppercase tracking-wider">Personal Profile</h3>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-5 text-slate-800 dark:text-slate-100">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Full Name</label>
              <input
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="mt-2 w-full rounded-2xl p-3 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none glass-input"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Avatar Image URL</label>
              <input
                type="text"
                value={profileAvatar}
                onChange={(e) => setProfileAvatar(e.target.value)}
                className="mt-2 w-full rounded-2xl p-3 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none glass-input"
              />
            </div>

            <div className="flex items-center gap-4 pt-2 border-t border-violet-50 dark:border-violet-900/20">
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold text-white btn-brand"
              >
                <span>Save Changes</span>
              </button>
              {profileSuccess && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-fade-in">
                  <Check size={14} className="stroke-[2.5]" />
                  <span>Profile updated</span>
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Workspace Management Form */}
        <div className="rounded-3xl glass-card p-6 relative overflow-hidden animate-fade-in-up delay-100">
          <div className="mb-6 flex items-center gap-3 border-b border-violet-50 dark:border-violet-900/20 pb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Briefcase size={18} />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-250 uppercase tracking-wider">Workspace Settings</h3>
          </div>

          {!activeWorkspace ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 dark:text-slate-500">
              <Briefcase size={32} className="stroke-[1.5] mb-3 text-slate-350 dark:text-slate-700" />
              <p className="text-sm font-semibold">Workspace Required</p>
              <p className="text-xs text-slate-500 dark:text-slate-650 max-w-xs mt-1.5 leading-relaxed">Please select or create a workspace using the sidebar selector first.</p>
            </div>
          ) : !isWorkspaceAdmin ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 dark:text-slate-500">
              <ShieldCheck size={32} className="stroke-[1.5] mb-3 text-slate-350 dark:text-slate-700" />
              <p className="text-sm font-semibold">Admin Privileges Required</p>
              <p className="text-xs text-slate-500 dark:text-slate-650 max-w-xs mt-1.5 leading-relaxed">Only workspace owners and project managers can edit this workspace details.</p>
            </div>
          ) : (
            <form onSubmit={handleUpdateWorkspace} className="space-y-5 text-slate-800 dark:text-slate-100">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Workspace Name *</label>
                <input
                  type="text"
                  required
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  className="mt-2 w-full rounded-2xl p-3 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none glass-input"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Description</label>
                <textarea
                  value={wsDesc}
                  onChange={(e) => setWsDesc(e.target.value)}
                  rows={2}
                  className="mt-2 w-full rounded-2xl p-3 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none resize-none glass-input"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Workspace Logo URL</label>
                <input
                  type="text"
                  value={wsLogo}
                  onChange={(e) => setWsLogo(e.target.value)}
                  className="mt-2 w-full rounded-2xl p-3 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none glass-input"
                />
              </div>

              <div className="flex items-center gap-4 pt-2 border-t border-violet-50 dark:border-violet-900/20">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold text-white btn-brand"
                >
                  <span>Update Settings</span>
                </button>
                {wsSuccess && (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-fade-in">
                    <Check size={14} className="stroke-[2.5]" />
                    <span>Workspace updated</span>
                  </span>
                )}
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Pending Workspace Invites list */}
      {pendingInvites.length > 0 && (
        <div className="rounded-3xl glass-card p-6 animate-fade-in-up delay-150">
          <div className="mb-5 flex items-center gap-3 border-b border-violet-50 dark:border-violet-900/20 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sparkles size={18} />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-250 uppercase tracking-wider">Pending Workspace Invites</h3>
          </div>

          <div className="space-y-3">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between rounded-2xl border border-violet-50 dark:border-violet-900/10 bg-slate-50/50 dark:bg-slate-900/30 p-4 transition-all duration-200 hover:border-violet-100 dark:hover:border-violet-900/30">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{invite.profile.full_name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{invite.profile.email} (Invited as {invite.role})</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => acceptInvitation(invite.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all duration-150 active:scale-[0.92]"
                  >
                    <Check size={15} />
                  </button>
                  <button
                    onClick={() => declineInvitation(invite.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all duration-150 active:scale-[0.92]"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Database Seeding Section */}
      <div className="rounded-3xl glass-card p-6 relative overflow-hidden animate-fade-in-up delay-200">
        <div className="mb-5 flex items-center gap-3 border-b border-violet-50 dark:border-violet-900/20 pb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <Database size={18} />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-250 uppercase tracking-wider">Database Seeding</h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
          If your database has been reset or is currently empty, you can seed it with TaskFlow's premium mock data models. This automatically creates workspaces, custom teams, demo projects, checklist items, activity logs, and pre-seeded team files directly linked to your current authentication profile.
        </p>
        <div className="flex items-center gap-4 border-t border-violet-50 dark:border-violet-900/20 pt-4">
          <button
            onClick={handleSeedDatabase}
            disabled={seeding}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white btn-brand disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {seeding ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Seeding Database...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} className="animate-pulse" />
                <span>Seed Database with Mock Data</span>
              </>
            )}
          </button>
          {seedStatus === 'success' && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-fade-in">
              <Check size={14} className="stroke-[2.5]" />
              <span>Database seeded successfully!</span>
            </span>
          )}
          {seedStatus === 'error' && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 animate-fade-in">
              <X size={14} className="stroke-[2.5]" />
              <span>Failed to seed. Verify Supabase tables.</span>
            </span>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      {activeWorkspace && isWorkspaceAdmin && (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/5 dark:bg-rose-950/5 p-6 animate-fade-in-up delay-250">
          <div className="mb-5 flex items-center gap-3 border-b border-rose-500/10 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-450">
              <AlertTriangle size={18} />
            </div>
            <h3 className="text-sm font-bold text-rose-800 dark:text-rose-400 uppercase tracking-wider">Danger Zone</h3>
          </div>
          <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mb-5 leading-relaxed">
            Permanently delete this workspace and all its data. This action is irreversible. All projects, tasks, checklists, member assignments, and chats associated with this workspace will be deleted forever.
          </p>
          <div className="flex items-center gap-4 border-t border-rose-500/10 pt-4">
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all duration-150 active:scale-[0.96] flex-shrink-0"
            >
              <Trash2 size={14} />
              <span>Delete Workspace</span>
            </button>
          </div>
        </div>
      )}

      {/* Delete Workspace Confirmation Modal */}
      {isDeleteModalOpen && activeWorkspace && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsDeleteModalOpen(false)}
          />
          
          {/* Modal Container */}
          <div className="relative w-full max-w-md transform overflow-hidden rounded-3xl border border-rose-500/30 bg-white/95 dark:bg-slate-900/95 p-6 shadow-2xl transition-all animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Workspace "{activeWorkspace.name}"?
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Are you sure you want to delete this workspace? This action cannot be undone.
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="mt-4 rounded-xl bg-rose-500/10 p-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-150"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDeleteWorkspace}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-rose-600/20 transition-all duration-150 hover:shadow-rose-600/30 active:scale-[0.96] disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
