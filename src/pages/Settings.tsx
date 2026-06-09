import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { 
  User, 
  Settings as SettingsIcon, 
  Briefcase, 
  Check, 
  X, 
  Sparkles, 
  ShieldCheck, 
  UploadCloud 
} from 'lucide-react';

const Settings: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const { activeWorkspace, members, refreshWorkspaceData, acceptInvitation, declineInvitation, seedDatabase, updateWorkspace } = useWorkspace();

  // Profile forms
  const [profileName, setProfileName] = useState(user?.full_name || '');
  const [profileAvatar, setProfileAvatar] = useState(user?.avatar_url || '');
  const [profileSuccess, setProfileSuccess] = useState(false);

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
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">Account & Settings</h2>
        <p className="text-sm text-slate-400">Configure personal credentials and update workspace features.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* User Profile Form */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 shadow-xl backdrop-blur-sm">
          <div className="mb-5 flex items-center gap-2 border-b border-slate-800 pb-3">
            <User className="text-brand-400" size={18} />
            <h3 className="text-sm font-bold text-slate-200">Personal Profile</h3>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Full Name</label>
              <input
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Avatar Image URL</label>
              <input
                type="text"
                value={profileAvatar}
                onChange={(e) => setProfileAvatar(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-500 transition-colors shadow-md shadow-brand-500/10"
              >
                <span>Save Changes</span>
              </button>
              {profileSuccess && (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 animate-fade-in">
                  <Check size={14} />
                  <span>Profile updated</span>
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Workspace Management Form */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 shadow-xl backdrop-blur-sm">
          <div className="mb-5 flex items-center gap-2 border-b border-slate-800 pb-3">
            <Briefcase className="text-violet-400" size={18} />
            <h3 className="text-sm font-bold text-slate-200">Workspace Settings</h3>
          </div>

          {!isWorkspaceAdmin ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-slate-500">
              <ShieldCheck size={28} className="stroke-[1.5] mb-2" />
              <p className="text-xs font-bold">Admin Privileges Required</p>
              <p className="text-[10px] text-slate-600 max-w-xs mt-1">Only workspace owners and project managers can edit this workspace details.</p>
            </div>
          ) : (
            <form onSubmit={handleUpdateWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Workspace Name</label>
                <input
                  type="text"
                  required
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Description</label>
                <textarea
                  value={wsDesc}
                  onChange={(e) => setWsDesc(e.target.value)}
                  rows={2}
                  className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-brand-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Workspace Logo URL</label>
                <input
                  type="text"
                  value={wsLogo}
                  onChange={(e) => setWsLogo(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-500 transition-colors shadow-md shadow-violet-500/10"
                >
                  <span>Update Settings</span>
                </button>
                {wsSuccess && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                    <Check size={14} />
                    <span>Workspace updated</span>
                  </span>
                )}
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Pending Workspace Invites list (displayed only if invites exist) */}
      {pendingInvites.length > 0 && (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 shadow-xl backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="text-amber-400" size={18} />
            <h3 className="text-sm font-bold text-slate-200">Pending Workspace Invites</h3>
          </div>

          <div className="space-y-3">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div>
                  <p className="text-xs font-bold text-slate-200">{invite.profile.full_name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{invite.profile.email} (Invited as {invite.role})</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => acceptInvitation(invite.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500 hover:text-white transition-colors"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => declineInvitation(invite.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/25 hover:bg-rose-500 hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Database Seeding Section */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 shadow-xl backdrop-blur-sm">
        <div className="mb-4 flex items-center gap-2 border-b border-slate-800 pb-3">
          <Sparkles className="text-violet-400" size={18} />
          <h3 className="text-sm font-bold text-slate-200">Database Seeding</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          If your database is empty, you can seed it with the default website mockup data (workspaces, projects, Kanban cards, check lists, comments, files). This will insert all necessary records directly into Supabase under your account so you can start testing immediately.
        </p>
        <div className="flex items-center gap-4">
          <button
            onClick={handleSeedDatabase}
            disabled={seeding}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:from-brand-500 hover:to-violet-500 transition-all shadow-md shadow-brand-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {seeding ? (
              <span>Seeding Database...</span>
            ) : (
              <>
                <Sparkles size={14} />
                <span>Seed Database with Mock Data</span>
              </>
            )}
          </button>
          {seedStatus === 'success' && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 animate-fade-in">
              <Check size={14} />
              <span>Database seeded successfully!</span>
            </span>
          )}
          {seedStatus === 'error' && (
            <span className="flex items-center gap-1 text-xs font-semibold text-rose-400 animate-fade-in">
              <X size={14} />
              <span>Failed to seed database. Verify RLS tables exist.</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
