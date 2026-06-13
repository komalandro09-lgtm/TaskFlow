import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFirewall } from '../context/FirewallContext';
import { Mail, Lock, ShieldAlert, ArrowRight, Zap } from 'lucide-react';
import { TurnstileCaptcha } from '../components/shared/TurnstileCaptcha';
import TaskFlowLogo from '../components/shared/TaskFlowLogo';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { checkAndIncrementRateLimit, logAuditEvent, sanitizeInput, validatePayload } = useFirewall();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Invitation token support
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('token') || '';
  const inviteEmail = searchParams.get('email') || '';

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
    const validation = validatePayload({ email }, 'login');
    if (!validation.valid) {
      setErrorMsg(validation.errorMsg || 'Invalid payload parameters.');
      return;
    }

    setLoading(true);

    // 3. Application firewall rate limiting check
    const rateCheck = await checkAndIncrementRateLimit('login');
    if (!rateCheck.allowed) {
      setErrorMsg(rateCheck.errorMsg || 'Too many login attempts. Your IP has been blocked.');
      await logAuditEvent('Blocked Login Attempt', email);
      setLoading(false);
      return;
    }

    // 4. Sanitize input
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedPassword = password;

    // 5. Submit Auth
    const { error } = await login(sanitizedEmail, sanitizedPassword);
    
    if (error) {
      setLoading(false);
      setErrorMsg(error.message || 'Incorrect email or password.');
      await logAuditEvent('Failed Login Attempt', sanitizedEmail);
    } else {
      await logAuditEvent('Login Success', sanitizedEmail);
      setLoading(false);
      if (inviteToken) {
        navigate(`/invite?token=${inviteToken}`);
      } else {
        navigate('/');
      }
    }
  };

  // Quick dev login helper
  const handleQuickLogin = async (role: 'owner' | 'developer') => {
    setErrorMsg('');
    setLoading(true);
    const targetEmail = role === 'owner' ? 'owner@taskflow.com' : 'developer@taskflow.com';
    const targetPassword = 'password123';

    const { error } = await login(targetEmail, targetPassword);
    if (error) {
      setLoading(false);
      setErrorMsg(error.message || 'Incorrect email or password.');
      await logAuditEvent('Failed Login Attempt (Quick Login)', targetEmail);
    } else {
      await logAuditEvent('Login Success (Quick Login)', targetEmail);
      setLoading(false);
      navigate('/');
    }
  };

  return (
    <div 
      className="relative flex min-h-screen w-screen items-center justify-center px-4 py-16 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f0720 0%, #1a0d38 40%, #0f0720 100%)' }}
    >
      {/* Ambient Orbs */}
      <div 
        className="absolute animate-float-slow pointer-events-none"
        style={{
          top: '-5%',
          left: '-5%',
          width: '55%',
          height: '55%',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(139, 92, 246, 0.18) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      <div 
        className="absolute animate-float-slower pointer-events-none"
        style={{
          bottom: '-10%',
          right: '-10%',
          width: '60%',
          height: '60%',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(244, 63, 94, 0.12) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />
      <div 
        className="absolute pointer-events-none"
        style={{
          top: '40%',
          left: '30%',
          width: '40%',
          height: '40%',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(109, 40, 217, 0.1) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Grid dot pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Subtle horizontal line decorations */}
      <div className="absolute inset-x-0 top-0 h-px pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.3), transparent)' }} />
      <div className="absolute inset-x-0 bottom-0 h-px pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.2), transparent)' }} />

      <div className="z-10 w-full max-w-[420px]" style={{ animation: 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
        {/* Brand Header */}
        <div className="mb-8 text-center flex flex-col items-center">
          <TaskFlowLogo variant="full-tagline" iconSize={52} textSize={26} />
        </div>

        {/* Login Card */}
        <div 
          className="relative rounded-3xl p-8 overflow-hidden group"
          style={{
            background: 'rgba(26, 14, 53, 0.85)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 24px 80px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          }}
        >
          {/* Card top gradient shimmer */}
          <div 
            className="absolute top-0 inset-x-0 h-px pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.5), rgba(244, 63, 94, 0.3), transparent)' }}
          />
          
          {/* Hover glow effect */}
          <div 
            className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(139, 92, 246, 0.08) 0%, transparent 70%)' }}
          />

          <div className="relative z-10">
            <h2 className="text-xl font-bold mb-1.5" style={{ color: '#f0ecff', fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em' }}>
              Welcome back
            </h2>
            <p className="text-xs mb-6" style={{ color: 'rgba(167, 139, 250, 0.55)' }}>
              Sign in to your workspace
            </p>

            {errorMsg && (
              <div 
                className="mb-5 flex items-start gap-2.5 rounded-2xl p-4 text-xs font-semibold leading-relaxed"
                style={{
                  background: 'rgba(244, 63, 94, 0.08)',
                  border: '1px solid rgba(244, 63, 94, 0.2)',
                  color: '#fb7185',
                  animation: 'fadeInUp 0.3s ease forwards',
                }}
              >
                <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(167, 139, 250, 0.65)' }}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail 
                    className="absolute left-4 top-3.5 pointer-events-none transition-colors duration-200" 
                    size={15} 
                    style={{ color: 'rgba(139, 92, 246, 0.5)' }}
                  />
                  <input
                    id="login-email"
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl py-3.5 pl-11 pr-4 text-sm placeholder-violet-800 focus:outline-none transition-all duration-200"
                    style={{
                      background: 'rgba(139, 92, 246, 0.08)',
                      border: '1px solid rgba(139, 92, 246, 0.18)',
                      color: '#e2e0ff',
                    }}
                    onFocus={e => {
                      (e.target as HTMLElement).style.borderColor = 'rgba(139, 92, 246, 0.5)';
                      (e.target as HTMLElement).style.background = 'rgba(139, 92, 246, 0.12)';
                      (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
                    }}
                    onBlur={e => {
                      (e.target as HTMLElement).style.borderColor = 'rgba(139, 92, 246, 0.18)';
                      (e.target as HTMLElement).style.background = 'rgba(139, 92, 246, 0.08)';
                      (e.target as HTMLElement).style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider" style={{ color: 'rgba(167, 139, 250, 0.65)' }}>
                    Password
                  </label>
                  <Link 
                    to="/forgot-password" 
                    id="forgot-password-link" 
                    className="text-xs font-semibold transition-colors"
                    style={{ color: '#a78bfa' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#c4b5fd'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#a78bfa'}
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock 
                    className="absolute left-4 top-3.5 pointer-events-none" 
                    size={15} 
                    style={{ color: 'rgba(139, 92, 246, 0.5)' }}
                  />
                  <input
                    id="login-password"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl py-3.5 pl-11 pr-4 text-sm placeholder-violet-800 focus:outline-none transition-all duration-200"
                    style={{
                      background: 'rgba(139, 92, 246, 0.08)',
                      border: '1px solid rgba(139, 92, 246, 0.18)',
                      color: '#e2e0ff',
                    }}
                    onFocus={e => {
                      (e.target as HTMLElement).style.borderColor = 'rgba(139, 92, 246, 0.5)';
                      (e.target as HTMLElement).style.background = 'rgba(139, 92, 246, 0.12)';
                      (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
                    }}
                    onBlur={e => {
                      (e.target as HTMLElement).style.borderColor = 'rgba(139, 92, 246, 0.18)';
                      (e.target as HTMLElement).style.background = 'rgba(139, 92, 246, 0.08)';
                      (e.target as HTMLElement).style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Firewall Security Bot Protection CAPTCHA */}
              <div className="py-1 relative z-20">
                <TurnstileCaptcha 
                  action="login" 
                  onVerify={(token) => setCaptchaToken(token)} 
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="relative flex w-full items-center justify-center rounded-2xl py-3.5 text-sm font-bold text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                style={{
                  background: loading ? 'rgba(109, 40, 217, 0.7)' : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 60%, #6d28d9 100%)',
                  boxShadow: loading ? 'none' : '0 8px 30px rgba(109, 40, 217, 0.45)',
                }}
                onMouseEnter={e => {
                  if (!loading) {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(109, 40, 217, 0.55)';
                  }
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = loading ? 'none' : '0 8px 30px rgba(109, 40, 217, 0.45)';
                }}
              >
                {/* Button shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                ) : (
                  <span className="flex items-center gap-2">
                    Sign In <ArrowRight size={15} />
                  </span>
                )}
              </button>
            </form>

            {/* Quick Demo Sign Ins */}
            <div className="relative mt-7 pt-6" style={{ borderTop: '1px solid rgba(139, 92, 246, 0.12)' }}>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'rgba(139, 92, 246, 0.5)' }}>
                <Zap size={12} style={{ color: '#a78bfa' }} />
                <span>Quick Demo Access</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  id="quick-login-owner"
                  onClick={() => handleQuickLogin('owner')}
                  className="flex flex-col items-center justify-center rounded-2xl p-3.5 transition-all duration-200 active:scale-[0.97]"
                  style={{
                    background: 'rgba(139, 92, 246, 0.08)',
                    border: '1px solid rgba(139, 92, 246, 0.15)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(139, 92, 246, 0.14)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139, 92, 246, 0.3)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(139, 92, 246, 0.08)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139, 92, 246, 0.15)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  }}
                >
                  <span className="text-[11px] font-bold" style={{ color: '#e2e0ff' }}>Workspace Owner</span>
                  <span className="text-[10px] font-medium mt-1 truncate max-w-full" style={{ color: '#a78bfa' }}>owner@taskflow.com</span>
                </button>
                <button
                  id="quick-login-member"
                  onClick={() => handleQuickLogin('developer')}
                  className="flex flex-col items-center justify-center rounded-2xl p-3.5 transition-all duration-200 active:scale-[0.97]"
                  style={{
                    background: 'rgba(139, 92, 246, 0.08)',
                    border: '1px solid rgba(139, 92, 246, 0.15)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(139, 92, 246, 0.14)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139, 92, 246, 0.3)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(139, 92, 246, 0.08)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139, 92, 246, 0.15)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  }}
                >
                  <span className="text-[11px] font-bold" style={{ color: '#e2e0ff' }}>Team Member</span>
                  <span className="text-[10px] font-medium mt-1 truncate max-w-full" style={{ color: '#a78bfa' }}>developer@taskflow.com</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Link */}
        <p className="mt-7 text-center text-sm font-medium" style={{ color: 'rgba(167, 139, 250, 0.55)' }}>
          Don't have an account?{' '}
          <Link 
            to="/register" 
            id="create-account-link" 
            className="font-bold transition-colors"
            style={{ color: '#a78bfa' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#c4b5fd'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#a78bfa'}
          >
            Create Account →
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
