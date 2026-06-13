import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Zap,
  Users,
  LayoutDashboard,
  FolderKanban,
  Bell,
  Shield,
  Star,
  ChevronRight,
  Play,
  TrendingUp,
  Clock,
  MessageSquare,
  FileText,
  Activity,
  Sparkles,
  Globe,
  Lock,
  BarChart3,
} from 'lucide-react';
import TaskFlowLogo from '../components/shared/TaskFlowLogo';

// ─── Animated Counter ───────────────────────────────────────────────────────
const Counter: React.FC<{ end: number; suffix?: string; duration?: number }> = ({
  end,
  suffix = '',
  duration = 2000,
}) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration]);
  return <>{count.toLocaleString()}{suffix}</>;
};

// ─── Data ────────────────────────────────────────────────────────────────────
const features = [
  {
    icon: LayoutDashboard,
    title: 'Smart Dashboard',
    desc: 'Get a bird\'s-eye view of all your projects, tasks, and team activity in one beautiful, real-time workspace.',
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.08)',
  },
  {
    icon: FolderKanban,
    title: 'Project Tracking',
    desc: 'Manage projects with priority levels, due dates, and progress bars. Never miss a milestone again.',
    color: '#6d28d9',
    bg: 'rgba(109,40,217,0.08)',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    desc: 'Invite members, assign roles, create teams, and communicate in real-time — all in one place.',
    color: '#7c3aed',
    bg: 'rgba(124,58,237,0.08)',
  },
  {
    icon: Bell,
    title: 'Smart Notifications',
    desc: 'Stay up-to-date with real-time notifications for task updates, mentions, and project changes.',
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.08)',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    desc: 'Row-level security, CAPTCHA protection, rate limiting, and audit logs to keep your data safe.',
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.08)',
  },
  {
    icon: Activity,
    title: 'Activity Logs',
    desc: 'Full audit trail of every action in your workspace. Transparency you can trust, compliance you need.',
    color: '#6d28d9',
    bg: 'rgba(109,40,217,0.08)',
  },
];

const stats = [
  { value: 10000, suffix: '+', label: 'Active Users' },
  { value: 50000, suffix: '+', label: 'Tasks Completed' },
  { value: 99, suffix: '.9%', label: 'Uptime SLA' },
  { value: 500, suffix: '+', label: 'Teams Onboarded' },
];

const steps = [
  { step: '01', title: 'Create Workspace', desc: 'Set up your workspace in seconds. Invite your team and configure roles.' },
  { step: '02', title: 'Launch Projects', desc: 'Create projects, set priorities and deadlines, and assign them to teams.' },
  { step: '03', title: 'Track Progress', desc: 'Monitor task completion, project milestones, and team performance live.' },
  { step: '04', title: 'Ship Faster', desc: 'Use insights, notifications, and collaboration tools to hit every deadline.' },
];

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'Product Manager @ NovaTech',
    avatar: 'SJ',
    color: '#8b5cf6',
    quote: 'TaskFlow completely transformed how our team works. The real-time updates and intuitive dashboard cut our meeting time in half.',
    stars: 5,
  },
  {
    name: 'Marcus Chen',
    role: 'CTO @ ScaleUp Labs',
    avatar: 'MC',
    color: '#6d28d9',
    quote: 'The enterprise security features gave us the confidence to migrate all our project data. Best decision we\'ve made this year.',
    stars: 5,
  },
  {
    name: 'Priya Sharma',
    role: 'Team Lead @ BuildCraft',
    avatar: 'PS',
    color: '#7c3aed',
    quote: 'Onboarding was seamless, the UI is stunning, and the team collaboration features are exactly what we needed to scale.',
    stars: 5,
  },
];

const navLinks = ['Features', 'How It Works', 'Testimonials', 'Pricing'];

// ─── Main Component ──────────────────────────────────────────────────────────
const Homepage: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        background: '#f4f2ff',
        color: '#1e1b4b',
        overflowX: 'hidden',
      }}
    >
      {/* ── NAV ── */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          transition: 'all 0.3s ease',
          background: scrolled ? 'rgba(255,255,255,0.92)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(139,92,246,0.12)' : '1px solid transparent',
          boxShadow: scrolled ? '0 4px 30px rgba(109,40,217,0.08)' : 'none',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '0 24px',
            height: 68,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo */}
          <TaskFlowLogo variant="full" iconSize={32} textSize={20} />

          {/* Desktop Nav Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 36 }} className="hidden md:flex">
            {navLinks.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase().replace(/\s+/g, '-')}`}
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#4c1d95',
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                  opacity: 0.75,
                }}
                onMouseEnter={e => ((e.target as HTMLElement).style.opacity = '1')}
                onMouseLeave={e => ((e.target as HTMLElement).style.opacity = '0.75')}
              >
                {link}
              </a>
            ))}
          </div>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link
              to="/login"
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#6d28d9',
                textDecoration: 'none',
                padding: '8px 16px',
                borderRadius: 10,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.07)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              Log In
            </Link>
            <Link
              to="/register"
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'white',
                textDecoration: 'none',
                padding: '10px 22px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                boxShadow: '0 4px 20px rgba(139,92,246,0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.25s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 28px rgba(139,92,246,0.5)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(139,92,246,0.4)';
              }}
            >
              Get Started Free <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #faf8ff 0%, #f0ecff 50%, #ede9fe 100%)',
          paddingTop: 100,
        }}
      >
        {/* Ambient orbs */}
        <div
          style={{
            position: 'absolute', top: '-10%', right: '-5%',
            width: '55%', height: '55%', borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(139,92,246,0.15) 0%, transparent 70%)',
            filter: 'blur(60px)', animation: 'floatBubble 14s ease-in-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute', bottom: '-10%', left: '-5%',
            width: '50%', height: '50%', borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(109,40,217,0.1) 0%, transparent 70%)',
            filter: 'blur(60px)', animation: 'floatBubble 20s ease-in-out infinite',
          }}
        />
        {/* Dot grid */}
        <div
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.4,
            backgroundImage: 'radial-gradient(circle, rgba(139,92,246,0.25) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          {/* Badge */}
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
              borderRadius: 30, padding: '6px 18px', marginBottom: 32,
              animation: 'fadeInUp 0.6s ease forwards',
            }}
          >
            <Sparkles size={14} style={{ color: '#8b5cf6' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#6d28d9', letterSpacing: '0.01em' }}>
              The Modern Project Management Platform
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{
              fontSize: 'clamp(40px, 6vw, 72px)',
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              color: '#1e1b4b',
              marginBottom: 24,
              animation: 'fadeInUp 0.7s 0.1s ease both',
            }}
          >
            Collaborate, Track &{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Ship Faster
            </span>
          </h1>

          {/* Sub */}
          <p
            style={{
              fontSize: 'clamp(16px, 2vw, 20px)',
              color: 'rgba(109,40,217,0.65)',
              lineHeight: 1.7,
              maxWidth: 620,
              margin: '0 auto 40px',
              fontWeight: 500,
              animation: 'fadeInUp 0.7s 0.2s ease both',
            }}
          >
            TaskFlow brings your teams, projects, and tasks into one unified workspace.
            Real-time collaboration, enterprise security, and beautiful design — all in one.
          </p>

          {/* CTAs */}
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 16, flexWrap: 'wrap',
              animation: 'fadeInUp 0.7s 0.3s ease both',
            }}
          >
            <Link
              to="/register"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                color: 'white', fontWeight: 700, fontSize: 16,
                padding: '14px 32px', borderRadius: 14, textDecoration: 'none',
                boxShadow: '0 8px 32px rgba(139,92,246,0.45)',
                transition: 'all 0.25s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(139,92,246,0.55)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(139,92,246,0.45)';
              }}
            >
              Start for Free <ArrowRight size={18} />
            </Link>
            <a
              href="#how-it-works"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(139,92,246,0.08)',
                border: '1.5px solid rgba(139,92,246,0.25)',
                color: '#6d28d9', fontWeight: 700, fontSize: 15,
                padding: '13px 28px', borderRadius: 14, textDecoration: 'none',
                transition: 'all 0.25s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.14)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.4)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.08)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.25)';
              }}
            >
              <Play size={16} fill="#6d28d9" /> See How It Works
            </a>
          </div>

          {/* Trust indicators */}
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 28, marginTop: 48, flexWrap: 'wrap',
              animation: 'fadeInUp 0.7s 0.4s ease both',
            }}
          >
            {[
              { icon: CheckCircle2, text: 'Free forever plan' },
              { icon: Shield, text: 'SOC2 compliant' },
              { icon: Zap, text: 'No credit card needed' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon size={15} style={{ color: '#8b5cf6' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(109,40,217,0.7)' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', padding: '60px 24px' }}>
        <div
          style={{
            maxWidth: 1100, margin: '0 auto',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 40,
            textAlign: 'center',
          }}
        >
          {stats.map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: 44, fontWeight: 800, color: 'white', fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.03em' }}>
                <Counter end={s.value} suffix={s.suffix} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.72)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding: '100px 24px', background: '#faf8ff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          {/* Section header */}
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.18)',
                borderRadius: 30, padding: '5px 16px', marginBottom: 20,
              }}
            >
              <Zap size={13} style={{ color: '#8b5cf6' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Everything You Need</span>
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontFamily: "'Outfit', sans-serif", fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.03em', marginBottom: 16 }}>
              Built for modern teams
            </h2>
            <p style={{ fontSize: 17, color: 'rgba(109,40,217,0.6)', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
              Every feature is designed to make your team faster, smarter, and more aligned.
            </p>
          </div>

          {/* Feature grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {features.map((f, i) => (
              <div
                key={f.title}
                style={{
                  background: 'white',
                  border: '1px solid rgba(139,92,246,0.1)',
                  borderRadius: 20,
                  padding: '32px 28px',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  cursor: 'default',
                  animation: `fadeInUp 0.5s ${i * 80}ms ease both`,
                  boxShadow: '0 2px 20px rgba(109,40,217,0.05)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(109,40,217,0.14)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.25)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 20px rgba(109,40,217,0.05)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.1)';
                }}
              >
                <div
                  style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: f.bg, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', marginBottom: 20,
                    border: `1px solid ${f.color}22`,
                  }}
                >
                  <f.icon size={22} style={{ color: f.color }} />
                </div>
                <h3 style={{ fontSize: 18, fontFamily: "'Outfit', sans-serif", fontWeight: 700, color: '#1e1b4b', marginBottom: 10 }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: 14, color: 'rgba(109,40,217,0.6)', lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" style={{ padding: '100px 24px', background: 'linear-gradient(135deg, #f0ecff 0%, #ede9fe 100%)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
                borderRadius: 30, padding: '5px 16px', marginBottom: 20,
              }}
            >
              <ChevronRight size={13} style={{ color: '#8b5cf6' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Simple Process</span>
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontFamily: "'Outfit', sans-serif", fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.03em', marginBottom: 16 }}>
              Up and running in minutes
            </h2>
            <p style={{ fontSize: 17, color: 'rgba(109,40,217,0.6)', maxWidth: 480, margin: '0 auto' }}>
              No complex setup. No training required. Just sign up and start shipping.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 32 }}>
            {steps.map((step, i) => (
              <div
                key={step.step}
                style={{
                  background: 'white',
                  border: '1px solid rgba(139,92,246,0.12)',
                  borderRadius: 20, padding: '32px 24px',
                  position: 'relative',
                  boxShadow: '0 4px 24px rgba(109,40,217,0.07)',
                  animation: `fadeInUp 0.5s ${i * 100}ms ease both`,
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(109,40,217,0.14)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(109,40,217,0.07)';
                }}
              >
                <div
                  style={{
                    fontSize: 36, fontFamily: "'Outfit', sans-serif", fontWeight: 800,
                    background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    marginBottom: 16, lineHeight: 1,
                  }}
                >
                  {step.step}
                </div>
                <h3 style={{ fontSize: 17, fontFamily: "'Outfit', sans-serif", fontWeight: 700, color: '#1e1b4b', marginBottom: 10 }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: 14, color: 'rgba(109,40,217,0.6)', lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURE HIGHLIGHT ── */}
      <section style={{ padding: '100px 24px', background: '#faf8ff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          {/* Left: visual mockup */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                borderRadius: 24, overflow: 'hidden',
                background: 'linear-gradient(135deg, #1e0f3d, #0f0720)',
                border: '1px solid rgba(139,92,246,0.25)',
                boxShadow: '0 24px 80px rgba(109,40,217,0.25)',
                padding: 24,
              }}
            >
              {/* Mock topbar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f43f5e' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981' }} />
                <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(139,92,246,0.15)', marginLeft: 12 }} />
              </div>

              {/* Mock stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Active Projects', val: '24', color: '#8b5cf6' },
                  { label: 'Tasks Done', val: '187', color: '#10b981' },
                  { label: 'Team Members', val: '12', color: '#f59e0b' },
                  { label: 'On Track', val: '96%', color: '#6d28d9' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'rgba(139,92,246,0.1)', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(139,92,246,0.15)' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "'Outfit', sans-serif" }}>{s.val}</div>
                    <div style={{ fontSize: 11, color: 'rgba(167,139,250,0.7)', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Mock project list */}
              {['Q3 Product Roadmap', 'Website Redesign', 'Mobile App v2.0'].map((proj, i) => (
                <div key={proj} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(139,92,246,0.07)', marginBottom: 8, border: '1px solid rgba(139,92,246,0.1)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: ['#8b5cf6', '#10b981', '#f59e0b'][i] }} />
                  <div style={{ flex: 1, fontSize: 12, color: '#c4b5fd', fontWeight: 600 }}>{proj}</div>
                  <div style={{ fontSize: 11, color: 'rgba(167,139,250,0.5)', background: 'rgba(139,92,246,0.1)', padding: '2px 8px', borderRadius: 6 }}>
                    {['Active', 'Review', 'In Progress'][i]}
                  </div>
                </div>
              ))}
            </div>

            {/* Floating badge */}
            <div
              style={{
                position: 'absolute', bottom: -16, right: -16,
                background: 'white', borderRadius: 14, padding: '12px 20px',
                boxShadow: '0 8px 32px rgba(109,40,217,0.18)',
                border: '1px solid rgba(139,92,246,0.15)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}
            >
              <TrendingUp size={20} style={{ color: '#10b981' }} />
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1e1b4b' }}>+38%</div>
                <div style={{ fontSize: 11, color: 'rgba(109,40,217,0.55)', fontWeight: 600 }}>Team velocity</div>
              </div>
            </div>
          </div>

          {/* Right: copy */}
          <div>
            <div
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.18)',
                borderRadius: 30, padding: '5px 16px', marginBottom: 24,
              }}
            >
              <BarChart3 size={13} style={{ color: '#8b5cf6' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Live Dashboard</span>
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', fontFamily: "'Outfit', sans-serif", fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.03em', marginBottom: 20, lineHeight: 1.2 }}>
              Everything visible,<br />nothing missed
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(109,40,217,0.6)', lineHeight: 1.7, marginBottom: 32 }}>
              Your dashboard shows live project health, task completion rates, team activity, and upcoming deadlines. All the context you need to make faster decisions.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { icon: Clock, text: 'Real-time task status updates across all projects' },
                { icon: Users, text: 'Team workload balancing and member overview' },
                { icon: Bell, text: 'Instant notifications for blockers and mentions' },
                { icon: Globe, text: 'Multi-workspace support for growing organizations' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={15} style={{ color: '#8b5cf6' }} />
                  </div>
                  <span style={{ fontSize: 14, color: '#1e1b4b', fontWeight: 500, paddingTop: 7, lineHeight: 1.4 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" style={{ padding: '100px 24px', background: 'linear-gradient(135deg, #f0ecff 0%, #ede9fe 100%)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.18)',
                borderRadius: 30, padding: '5px 16px', marginBottom: 20,
              }}
            >
              <Star size={13} style={{ color: '#f59e0b' }} fill="#f59e0b" />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Loved by Teams</span>
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontFamily: "'Outfit', sans-serif", fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.03em', marginBottom: 16 }}>
              What our users say
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {testimonials.map((t, i) => (
              <div
                key={t.name}
                style={{
                  background: 'white',
                  border: '1px solid rgba(139,92,246,0.12)',
                  borderRadius: 20, padding: '32px 28px',
                  boxShadow: '0 4px 24px rgba(109,40,217,0.07)',
                  transition: 'all 0.3s ease',
                  animation: `fadeInUp 0.5s ${i * 100}ms ease both`,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(109,40,217,0.14)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(109,40,217,0.07)';
                }}
              >
                {/* Stars */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
                  {Array.from({ length: t.stars }).map((_, si) => (
                    <Star key={si} size={16} style={{ color: '#f59e0b' }} fill="#f59e0b" />
                  ))}
                </div>

                {/* Quote */}
                <p style={{ fontSize: 15, color: '#1e1b4b', lineHeight: 1.7, marginBottom: 24, fontStyle: 'italic' }}>
                  "{t.quote}"
                </p>

                {/* Author */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 42, height: 42, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${t.color}, ${t.color}99)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 800, color: 'white',
                    }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1e1b4b' }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: 'rgba(109,40,217,0.55)', fontWeight: 500 }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section style={{ padding: '80px 24px', background: '#faf8ff' }}>
        <div
          style={{
            maxWidth: 800, margin: '0 auto', textAlign: 'center',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
            borderRadius: 28, padding: '60px 40px',
            boxShadow: '0 24px 80px rgba(139,92,246,0.4)',
            position: 'relative', overflow: 'hidden',
          }}
        >
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <Lock size={32} style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 20 }} />
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 44px)', fontFamily: "'Outfit', sans-serif", fontWeight: 800, color: 'white', letterSpacing: '-0.03em', marginBottom: 16 }}>
              Ready to transform your workflow?
            </h2>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.75)', marginBottom: 36, maxWidth: 480, margin: '0 auto 36px', lineHeight: 1.6 }}>
              Join thousands of teams already using TaskFlow to ship projects faster and collaborate better.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
              <Link
                to="/register"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'white',
                  color: '#6d28d9', fontWeight: 800, fontSize: 15,
                  padding: '14px 32px', borderRadius: 14, textDecoration: 'none',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  transition: 'all 0.25s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
                }}
              >
                Get Started Free <ArrowRight size={16} />
              </Link>
              <Link
                to="/login"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'rgba(255,255,255,0.12)',
                  border: '1.5px solid rgba(255,255,255,0.25)',
                  color: 'white', fontWeight: 700, fontSize: 15,
                  padding: '13px 28px', borderRadius: 14, textDecoration: 'none',
                  transition: 'all 0.25s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.2)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)';
                }}
              >
                Log In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#1e0f3d', padding: '60px 24px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 48 }}>
            {/* Brand */}
            <div>
              <TaskFlowLogo variant="full" iconSize={30} textSize={18} />
              <p style={{ fontSize: 14, color: 'rgba(167,139,250,0.6)', marginTop: 16, lineHeight: 1.65, maxWidth: 280 }}>
                The modern project management platform for high-performing teams. Collaborate, track, and ship faster.
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                {['TW', 'LI', 'GH'].map(s => (
                  <div key={s} style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#a78bfa', cursor: 'pointer', border: '1px solid rgba(139,92,246,0.2)', transition: 'all 0.2s' }}>
                    {s}
                  </div>
                ))}
              </div>
            </div>

            {/* Links */}
            {[
              { title: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
              { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
              { title: 'Legal', links: ['Privacy', 'Terms', 'Security', 'Cookies'] },
            ].map(col => (
              <div key={col.title}>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: '#c4b5fd', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>{col.title}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {col.links.map(link => (
                    <a key={link} href="#" style={{ fontSize: 14, color: 'rgba(167,139,250,0.5)', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }}
                      onMouseEnter={e => ((e.target as HTMLElement).style.color = '#c4b5fd')}
                      onMouseLeave={e => ((e.target as HTMLElement).style.color = 'rgba(167,139,250,0.5)')}
                    >
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: '1px solid rgba(139,92,246,0.12)', paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ fontSize: 13, color: 'rgba(167,139,250,0.4)', fontWeight: 500 }}>
              © {new Date().getFullYear()} TaskFlow. All rights reserved.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
              <span style={{ fontSize: 13, color: 'rgba(167,139,250,0.5)', fontWeight: 600 }}>All systems operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;
