import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFirewall } from '../context/FirewallContext';
import { User, Mail, Lock, ShieldAlert, ArrowRight } from 'lucide-react';
import { TurnstileCaptcha } from '../components/shared/TurnstileCaptcha';
import TaskFlowLogo from '../components/shared/TaskFlowLogo';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { checkAndIncrementRateLimit, logAuditEvent, sanitizeInput, validatePayload } = useFirewall();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Invitation token support
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('token') || '';
  const inviteEmail = searchParams.get('email') || '';
  const hasInvite = !!inviteToken && !!inviteEmail;

  useEffect(() => {
    if (inviteEmail) {
      setEmail(decodeURIComponent(inviteEmail));
    }
  }, [inviteEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // 1. CAPTCHA Check
    if (!captchaToken) {
      setErrorMsg('Please complete the security check to proceed.');
      return;
    }

    // 2. Request payload validation
    const validation = validatePayload({ fullName, email, password }, 'signup');
    if (!validation.valid) {
      setErrorMsg(validation.errorMsg || 'Invalid registration form parameters.');
      return;
    }

    setLoading(true);

    // 3. Application firewall rate limiting check (5 attempts per hour per IP)
    const rateCheck = await checkAndIncrementRateLimit('signup');
    if (!rateCheck.allowed) {
      setErrorMsg(rateCheck.errorMsg || 'Too many signup attempts. Try again later.');
      await logAuditEvent('Blocked Signup Attempt', email);
      setLoading(false);
      return;
    }

    // 4. Sanitize inputs
    const sanitizedName = sanitizeInput(fullName);
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedPassword = password; // Validate complexity, preserve special symbols

    // 5. Submit Auth
    const { error } = await register(sanitizedEmail, sanitizedPassword, sanitizedName);
    
    if (error) {
      setLoading(false);
      setErrorMsg(error.message || 'Failed to create account.');
      // 6. Log Failed Signup
      await logAuditEvent('Failed Signup Attempt', sanitizedEmail);
    } else {
      // 6. Log Success Signup
      await logAuditEvent('Signup Success', sanitizedEmail);
      setLoading(false);
      // If invitation token exists, redirect to invite page to accept
      if (inviteToken) {
        navigate(`/invite?token=${inviteToken}`);
      } else {
        navigate('/');
      }
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
            Create Account
          </h2>
          <p className="text-sm font-medium" style={{ color: 'rgba(196, 181, 253, 0.65)' }}>
            {hasInvite
              ? 'Create your account to accept the workspace invitation.'
              : 'Join TaskFlow and collaborate with your teammates.'}
          </p>
        </div>

        {/* Register Card */}
        <div className="relative rounded-3xl border border-slate-800/80 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-slate-700/60 group overflow-hidden">
          {/* Card Border Glow */}
          <div className="absolute -inset-px bg-gradient-to-r from-brand-500/20 to-violet-500/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

          {errorMsg && (
            <div className="relative mb-5 flex items-start gap-2.5 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-xs font-semibold text-rose-400 leading-relaxed animate-in slide-in-from-top-2 duration-300">
              <ShieldAlert size={18} className="shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="relative space-y-5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Full Name</label>
              <div className="relative mt-2">
                <User className="absolute left-4 top-3.5 text-slate-500 transition-colors group-focus-within:text-brand-400" size={16} />
                <input
                  id="register-name"
                  type="text"
                  required
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 py-3.5 pl-11 pr-4 text-sm text-slate-200 placeholder-slate-605 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 focus:outline-none transition-all duration-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Email Address</label>
              <div className="relative mt-2">
                <Mail className="absolute left-4 top-3.5 text-slate-500 transition-colors group-focus-within:text-brand-400" size={16} />
                <input
                  id="register-email"
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  readOnly={hasInvite}
                  className={`w-full rounded-2xl border border-slate-800 bg-slate-950/80 py-3.5 pl-11 pr-4 text-sm text-slate-200 placeholder-slate-605 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 focus:outline-none transition-all duration-200 ${hasInvite ? 'opacity-70 cursor-not-allowed' : ''}`}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Password</label>
              <div className="relative mt-2">
                <Lock className="absolute left-4 top-3.5 text-slate-500 transition-colors group-focus-within:text-brand-400" size={16} />
                <input
                  id="register-password"
                  type="password"
                  required
                  placeholder="Min. 8 characters with letter & number"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 py-3.5 pl-11 pr-4 text-sm text-slate-200 placeholder-slate-605 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 focus:outline-none transition-all duration-200"
                />
              </div>
            </div>

            {/* Firewall Security Bot Protection CAPTCHA */}
            <div className="py-1 relative z-20">
              <TurnstileCaptcha 
                action="signup" 
                onVerify={(token) => setCaptchaToken(token)} 
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative flex w-full items-center justify-center rounded-2xl bg-brand-600 py-3.5 text-sm font-semibold text-white hover:bg-brand-500 transition-all duration-200 shadow-xl shadow-brand-500/20 hover:shadow-brand-500/30 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:hover:shadow-none"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                <span className="flex items-center gap-1.5">
                  Sign Up <ArrowRight size={16} className="transition-transform duration-200" />
                </span>
              )}
            </button>
          </form>
        </div>

        {/* Footer Link */}
        <p className="mt-8 text-center text-sm text-slate-400 font-medium">
          Already have an account?{' '}
          <Link to="/login" id="login-link" className="font-semibold text-brand-400 hover:text-brand-300 transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
