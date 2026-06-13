import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useFirewall } from '../context/FirewallContext';
import { supabase } from '../supabaseClient';
import { TurnstileCaptcha } from '../components/shared/TurnstileCaptcha';
import TaskFlowLogo from '../components/shared/TaskFlowLogo';

const ForgotPassword: React.FC = () => {
  const { checkAndIncrementRateLimit, logAuditEvent, sanitizeInput, validatePayload } = useFirewall();
  
  const [email, setEmail] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // 1. CAPTCHA verification
    if (!captchaToken) {
      setErrorMsg('Please complete the security check to proceed.');
      return;
    }

    // 2. Request payload validation
    const validation = validatePayload({ email }, 'forgot-password');
    if (!validation.valid) {
      setErrorMsg(validation.errorMsg || 'Invalid request parameters.');
      return;
    }

    setLoading(true);

    // 3. Application firewall rate limiting check
    const rateCheck = await checkAndIncrementRateLimit('forgot-password');
    if (!rateCheck.allowed) {
      setErrorMsg(rateCheck.errorMsg || 'Too many password reset requests. Please try again later.');
      await logAuditEvent('Blocked Password Reset Attempt', email);
      setLoading(false);
      return;
    }

    // 4. Sanitize input
    const sanitizedEmail = sanitizeInput(email);

    try {
      // 5. Send password reset request using Supabase Auth
      // Redirects user back to /reset-password endpoint
      const { data, error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      // 6. Log Audit Log
      await logAuditEvent('Password Reset Request', sanitizedEmail);
      setIsSent(true);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setErrorMsg(err.message || 'Failed to send password recovery email. Please check the address and try again.');
      await logAuditEvent('Failed Password Reset Attempt', sanitizedEmail);
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
            Reset Password
          </h2>
          <p className="text-sm font-medium" style={{ color: 'rgba(196, 181, 253, 0.65)' }}>We'll send you instructions to reset your password.</p>
        </div>

        {/* Forgot Password Card */}
        <div className="relative rounded-3xl border border-slate-800/80 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-slate-700/60 group overflow-hidden">
          {/* Card Glow Border */}
          <div className="absolute -inset-px bg-gradient-to-r from-brand-500/20 to-violet-500/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

          {errorMsg && (
            <div className="relative mb-5 flex items-start gap-2.5 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-xs font-semibold text-rose-400 leading-relaxed animate-in slide-in-from-top-2 duration-300">
              <ShieldAlert size={18} className="shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!isSent ? (
            <form onSubmit={handleSubmit} className="relative space-y-6">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Email Address</label>
                <div className="relative mt-2">
                  <Mail className="absolute left-4 top-3.5 text-slate-500 transition-colors group-focus-within:text-brand-400" size={16} />
                  <input
                     id="email-input"
                     type="email"
                     required
                     placeholder="name@company.com"
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 py-3.5 pl-11 pr-4 text-sm text-slate-200 placeholder-slate-605 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 focus:outline-none transition-all duration-200"
                  />
                </div>
              </div>

              {/* Firewall Security Bot Protection CAPTCHA */}
              <div className="py-1 relative z-20">
                <TurnstileCaptcha 
                  action="forgot_password" 
                  onVerify={(token) => setCaptchaToken(token)} 
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="relative flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-3.5 text-sm font-semibold text-white hover:bg-brand-500 transition-all duration-200 shadow-xl shadow-brand-500/20 hover:shadow-brand-500/30 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:hover:shadow-none"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Send Reset Link</span>
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
                <h4 className="text-base font-bold text-slate-200">Recovery Email Dispatched</h4>
                <p className="text-xs leading-relaxed text-slate-400 font-medium">
                  A secure password recovery link has been sent to <strong className="text-slate-355 font-bold">{email}</strong>. Check your inbox and follow the instructions.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsSent(false);
                  setCaptchaToken(null);
                }}
                className="text-xs font-bold text-brand-400 hover:text-brand-300 transition-colors"
              >
                Resend link
              </button>
            </div>
          )}

          <div className="relative mt-8 border-t border-slate-800/80 pt-5 text-center">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-450 hover:text-slate-200 transition-colors">
              <ArrowLeft size={14} className="stroke-[2.5]" />
              <span>Back to login</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
