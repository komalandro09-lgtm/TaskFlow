import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useFirewall } from '../context/FirewallContext';
import { useAuth } from '../context/AuthContext';
import { Lock, ShieldAlert, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import TaskFlowLogo from '../components/shared/TaskFlowLogo';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { logAuditEvent, sanitizeInput } = useFirewall();
  const { session } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  // Password requirements state
  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password && password === confirmPassword;

  // Simple password strength calculator
  const getPasswordStrength = () => {
    if (!password) return { label: 'Empty', color: 'bg-slate-800', percentage: 0 };
    let score = 0;
    if (hasMinLength) score += 1;
    if (hasLetter) score += 1;
    if (hasNumber) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1; // Special char

    if (score === 1) return { label: 'Weak', color: 'bg-rose-500', percentage: 25 };
    if (score === 2) return { label: 'Fair', color: 'bg-amber-500', percentage: 50 };
    if (score === 3) return { label: 'Good', color: 'bg-blue-500', percentage: 75 };
    return { label: 'Strong', color: 'bg-emerald-500', percentage: 100 };
  };

  const strength = getPasswordStrength();

  // Redirect if no session and not in mock mode
  useEffect(() => {
    // In a live Supabase environment, the user must have an active recovery session.
    // In mock mode, we bypass this check to allow developers to simulate the flow easily.
    const isMock = searchParams.get('mock') === 'true' || localStorage.getItem('taskflow_mock_session') !== null;
    
    if (!isMock && !session) {
      setErrorMsg('Invalid or expired password reset session. Please request a new recovery email.');
    }
  }, [session, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!hasMinLength || !hasLetter || !hasNumber) {
      setErrorMsg('Password does not meet the security requirements.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      // Use Supabase updateUser to update password
      const { data, error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      // Log success event in audit logs
      const userEmail = data.user?.email || session?.user?.email || 'unknown@user.com';
      await logAuditEvent('Password Reset Success', userEmail, data.user?.id);
      
      setSuccess(true);
    } catch (err: any) {
      console.error('Password reset submit error:', err);
      setErrorMsg(err.message || 'Failed to update password. Try again.');
      await logAuditEvent('Failed Password Reset Save Attempt', session?.user?.email);
    } finally {
      setLoading(false);
    }
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
            Choose New Password
          </h2>
          <p className="text-sm font-medium" style={{ color: 'rgba(196, 181, 253, 0.65)' }}>Secure your account with a strong, private password.</p>
        </div>

        {/* Card */}
        <div className="relative rounded-3xl border border-slate-800/80 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-slate-700/60 group overflow-hidden">
          {/* Card Border Glow */}
          <div className="absolute -inset-px bg-gradient-to-r from-brand-500/20 to-violet-500/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

          {errorMsg && (
            <div className="relative mb-5 flex items-start gap-2.5 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-xs font-semibold text-rose-400 leading-relaxed animate-in slide-in-from-top-2 duration-300">
              <ShieldAlert size={18} className="shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!success ? (
            <form onSubmit={handleSubmit} className="relative space-y-6">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">New Password</label>
                <div className="relative mt-2">
                  <Lock className="absolute left-4 top-3.5 text-slate-500 transition-colors group-focus-within:text-brand-400" size={16} />
                  <input
                    id="reset-password-input"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 py-3.5 pl-11 pr-4 text-sm text-slate-200 placeholder-slate-605 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 focus:outline-none transition-all duration-200"
                  />
                </div>

                {/* Password Strength Indicator */}
                {password && (
                  <div className="mt-3.5 space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                      <span className="text-slate-550">Security Strength:</span>
                      <span className={strength.percentage >= 75 ? 'text-emerald-400' : strength.percentage >= 50 ? 'text-amber-400' : 'text-rose-400'}>
                        {strength.label}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-950 overflow-hidden ring-1 ring-white/5">
                      <div className={`h-full transition-all duration-300 ${strength.color}`} style={{ width: `${strength.percentage}%` }}></div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Confirm Password</label>
                <div className="relative mt-2">
                  <Lock className="absolute left-4 top-3.5 text-slate-500 transition-colors group-focus-within:text-brand-400" size={16} />
                  <input
                    id="reset-password-confirm"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 py-3.5 pl-11 pr-4 text-sm text-slate-200 placeholder-slate-605 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 focus:outline-none transition-all duration-200"
                  />
                </div>
              </div>

              {/* Password Requirements Checklist */}
              <div className="rounded-2xl bg-slate-950/40 p-4.5 border border-slate-800/60 space-y-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Password Rules</p>
                <div className="flex items-center gap-2.5 text-xs font-medium">
                  <CheckCircle2 size={15} className={hasMinLength ? 'text-emerald-400 fill-emerald-500/10' : 'text-slate-600'} />
                  <span className={hasMinLength ? 'text-slate-200' : 'text-slate-500'}>Minimum 8 characters</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs font-medium">
                  <CheckCircle2 size={15} className={hasLetter ? 'text-emerald-400 fill-emerald-500/10' : 'text-slate-600'} />
                  <span className={hasLetter ? 'text-slate-200' : 'text-slate-500'}>Contains at least one letter</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs font-medium">
                  <CheckCircle2 size={15} className={hasNumber ? 'text-emerald-400 fill-emerald-500/10' : 'text-slate-600'} />
                  <span className={hasNumber ? 'text-slate-200' : 'text-slate-500'}>Contains at least one number</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs font-medium">
                  <CheckCircle2 size={15} className={passwordsMatch ? 'text-emerald-400 fill-emerald-500/10' : 'text-slate-600'} />
                  <span className={passwordsMatch ? 'text-slate-200' : 'text-slate-500'}>Passwords match</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !hasMinLength || !hasLetter || !hasNumber || !passwordsMatch}
                className="relative flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-3.5 text-sm font-semibold text-white hover:bg-brand-500 transition-all duration-200 shadow-xl shadow-brand-500/20 hover:shadow-brand-500/30 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:hover:shadow-none"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  <>
                    <span>Update Password</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="relative text-center space-y-5 py-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                <ShieldCheck size={26} className="stroke-[2.2]" />
              </div>
              <div className="space-y-2">
                <h4 className="text-base font-bold text-slate-200">Password Saved Successfully</h4>
                <p className="text-xs leading-relaxed text-slate-400 font-medium">
                  Your identity has been re-verified and password updated. You can now log back into TaskFlow.
                </p>
              </div>
              <button
                id="reset-password-login-btn"
                onClick={() => navigate('/login')}
                className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-brand-605 py-3.5 text-sm font-semibold text-white hover:bg-brand-500 transition-colors shadow-lg shadow-brand-500/20"
              >
                <span>Continue to login</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
