import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import {
  Mail,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  LogIn,
  UserPlus,
  LogOut,
  Loader2,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import TaskFlowLogo from '../components/shared/TaskFlowLogo';

const InviteLanding: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { getInviteByToken, acceptInviteByToken, declineInviteByToken } = useWorkspace();

  const token = searchParams.get('token') || '';

  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionResult, setActionResult] = useState<'accepted' | 'declined' | null>(null);

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided. Please check your invitation link.');
      setLoading(false);
      return;
    }

    loadInvitation();
  }, [token]);

  const loadInvitation = async () => {
    setLoading(true);
    setError('');
    const { invitation: inv, error: err } = await getInviteByToken(token);
    if (err || !inv) {
      setError('Invitation not found. It may have been deleted or the link is invalid.');
    } else {
      // Check expiration
      if (new Date(inv.expires_at) < new Date() && inv.status === 'Pending') {
        inv.status = 'Expired';
      }
      setInvitation(inv);
    }
    setLoading(false);
  };

  const handleAccept = async () => {
    setActionLoading(true);
    setError('');
    const { workspace_id, error: err } = await acceptInviteByToken(token);
    if (err) {
      setError(err.message || 'Failed to accept invitation.');
    } else {
      setActionResult('accepted');
      setTimeout(() => {
        navigate('/');
      }, 2000);
    }
    setActionLoading(false);
  };

  const handleDecline = async () => {
    setActionLoading(true);
    setError('');
    const { error: err } = await declineInviteByToken(token);
    if (err) {
      setError(err.message || 'Failed to decline invitation.');
    } else {
      setActionResult('declined');
    }
    setActionLoading(false);
  };

  const handleLogout = async () => {
    await logout();
  };

  // Determine what to render based on invitation status
  const renderContent = () => {
    // Loading state
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
          <p className="text-sm text-slate-400 font-medium">Loading invitation details...</p>
        </div>
      );
    }

    // Error state / no invitation
    if (error && !invitation) {
      return (
        <div className="flex flex-col items-center py-12 gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle size={32} />
          </div>
          <h3 className="text-xl font-bold text-white">Invalid Invitation</h3>
          <p className="text-sm text-slate-400 max-w-sm leading-relaxed">{error}</p>
          <Link
            to="/login"
            className="mt-4 flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 transition-all"
          >
            <LogIn size={16} />
            Go to Login
          </Link>
        </div>
      );
    }

    // Status-based rendering
    if (invitation.status === 'Expired') {
      return (
        <div className="flex flex-col items-center py-12 gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock size={32} />
          </div>
          <h3 className="text-xl font-bold text-white">Invitation Expired</h3>
          <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
            This invitation to join <strong className="text-white">{invitation.workspace_name}</strong> has expired.
            Please ask the workspace administrator to send a new invitation.
          </p>
        </div>
      );
    }

    if (invitation.status === 'Cancelled') {
      return (
        <div className="flex flex-col items-center py-12 gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <XCircle size={32} />
          </div>
          <h3 className="text-xl font-bold text-white">Invitation Cancelled</h3>
          <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
            This invitation to join <strong className="text-white">{invitation.workspace_name}</strong> has been cancelled by the workspace administrator.
          </p>
        </div>
      );
    }

    if (invitation.status === 'Accepted' || actionResult === 'accepted') {
      return (
        <div className="flex flex-col items-center py-12 gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-xl font-bold text-white">
            {actionResult === 'accepted' ? 'Invitation Accepted!' : 'Already Accepted'}
          </h3>
          <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
            {actionResult === 'accepted'
              ? `You've been added to ${invitation.workspace_name}. Redirecting to your dashboard...`
              : `This invitation to ${invitation.workspace_name} has already been accepted.`}
          </p>
          {!actionResult && (
            <button
              onClick={() => navigate('/')}
              className="mt-4 flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 transition-all"
            >
              Go to Dashboard
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      );
    }

    if (invitation.status === 'Declined' || actionResult === 'declined') {
      return (
        <div className="flex flex-col items-center py-12 gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <XCircle size={32} />
          </div>
          <h3 className="text-xl font-bold text-white">Invitation Declined</h3>
          <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
            You've declined the invitation to join <strong className="text-white">{invitation.workspace_name}</strong>.
          </p>
        </div>
      );
    }

    // Pending — show invitation details and actions
    return (
      <div className="space-y-6">
        {/* Invitation Info Card */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-violet-500 text-white font-bold text-sm shadow-lg shadow-brand-500/20">
              {invitation.workspace_name?.substring(0, 2).toUpperCase() || 'WS'}
            </div>
            <div>
              <h4 className="font-bold text-white text-base">{invitation.workspace_name}</h4>
              <p className="text-xs text-slate-400">Workspace Invitation</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Mail size={10} />
                Invited Email
              </span>
              <p className="text-sm text-white font-semibold mt-1.5 truncate">{invitation.email}</p>
            </div>
            <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Shield size={10} />
                Assigned Role
              </span>
              <p className="text-sm text-white font-semibold mt-1.5 capitalize">{invitation.role}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-slate-900/30 border border-slate-800/50 px-3 py-2.5 text-xs text-slate-400">
            <Sparkles size={12} className="text-brand-400 shrink-0" />
            <span>
              Invited by <strong className="text-slate-200">{invitation.inviter_name}</strong>
              {' · '}
              Expires {new Date(invitation.expires_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-xs font-semibold text-rose-400">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* User is NOT logged in */}
        {!user && (
          <div className="space-y-3">
            <p className="text-sm text-slate-400 text-center">
              Sign in or create an account to accept this invitation.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Link
                to={`/login?token=${token}&email=${encodeURIComponent(invitation.email)}`}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700/50 hover:border-slate-600 transition-all"
              >
                <LogIn size={16} />
                Sign In
              </Link>
              <Link
                to={`/register?token=${token}&email=${encodeURIComponent(invitation.email)}`}
                className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-500 transition-all shadow-lg shadow-brand-500/20"
              >
                <UserPlus size={16} />
                Create Account
              </Link>
            </div>
          </div>
        )}

        {/* User IS logged in but wrong email */}
        {user && user.email.toLowerCase() !== invitation.email.toLowerCase() && (
          <div className="space-y-3">
            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs font-semibold text-amber-400">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <div>
                <p>This invitation was sent to <strong className="text-amber-300">{invitation.email}</strong>, but you're signed in as <strong className="text-amber-300">{user.email}</strong>.</p>
                <p className="mt-1 text-amber-500/80">Please sign out and use the correct account.</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700/50 transition-all"
            >
              <LogOut size={16} />
              Sign Out & Switch Account
            </button>
          </div>
        )}

        {/* User IS logged in with correct email */}
        {user && user.email.toLowerCase() === invitation.email.toLowerCase() && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleDecline}
              disabled={actionLoading}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 transition-all disabled:opacity-50"
            >
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
              Decline
            </button>
            <button
              onClick={handleAccept}
              disabled={actionLoading}
              className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-500 transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50"
            >
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Accept Invitation
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center bg-slate-950 px-4 py-16 overflow-hidden">
      {/* Background Ambient Lights */}
      <div className="absolute top-[-10%] left-[-10%] h-[50%] w-[50%] rounded-full bg-brand-500/10 blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] h-[50%] w-[50%] rounded-full bg-violet-600/10 blur-[140px] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none"></div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(transparent_1px,#020617_1px)] bg-[size:20px_20px] opacity-40 pointer-events-none"></div>

      <div className="z-10 w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        {/* Brand Header */}
        <div className="mb-8 text-center flex flex-col items-center gap-3">
          <TaskFlowLogo variant="full" iconSize={44} textSize={22} />
          <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: 'white', fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em' }}>
            Workspace Invitation
          </h2>
          <p className="text-sm font-medium" style={{ color: 'rgba(196, 181, 253, 0.65)' }}>You've been invited to join a workspace on TaskFlow.</p>
        </div>

        {/* Main Card */}
        <div className="relative rounded-3xl border border-slate-800/80 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-slate-700/60 group overflow-hidden">
          {/* Card Border Glow */}
          <div className="absolute -inset-px bg-gradient-to-r from-brand-500/20 to-violet-500/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

          <div className="relative">
            {renderContent()}
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-slate-400 font-medium">
          <Link to="/" className="font-semibold text-brand-400 hover:text-brand-300 transition-colors">
            TaskFlow
          </Link>
          {' · '}Workspace Collaboration Platform
        </p>
      </div>
    </div>
  );
};

export default InviteLanding;
