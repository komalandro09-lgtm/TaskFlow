import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useTheme } from '../context/ThemeContext';
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
  Trash2,
  CreditCard,
  History,
  CheckCircle,
  TrendingUp,
  Download,
  Info,
  Key,
  Printer,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface Invoice {
  id: string;
  date: string;
  workspaceId: string;
  planName: string;
  amount: number;
  currency: string;
  status: 'Paid' | 'Failed' | 'Pending';
  paymentId: string;
  billingCycle: 'Monthly' | 'Yearly';
}

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const { 
    activeWorkspace, 
    workspaces,
    members, 
    projects,
    acceptInvitation, 
    declineInvitation, 
    seedDatabase, 
    updateWorkspace, 
    deleteWorkspace 
  } = useWorkspace();
  const { theme } = useTheme();

  // Tab State
  const [activeTab, setActiveTab] = useState<'general' | 'billing'>('general');

  // General Settings States
  const [profileName, setProfileName] = useState(user?.full_name || '');
  const [profileAvatar, setProfileAvatar] = useState(user?.avatar_url || '');
  const [profileSuccess, setProfileSuccess] = useState(false);

  const [wsName, setWsName] = useState(activeWorkspace?.name || '');
  const [wsDesc, setWsDesc] = useState(activeWorkspace?.description || '');
  const [wsLogo, setWsLogo] = useState(activeWorkspace?.logo_url || '');
  const [wsSuccess, setWsSuccess] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [seeding, setSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Billing States
  const [isYearly, setIsYearly] = useState(false);
  const [razorpayKey, setRazorpayKey] = useState(() => {
    return localStorage.getItem('taskflow_razorpay_key') || '';
  });
  const [billingHistory, setBillingHistory] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  
  // Custom Payment Dialog State (for manual fallback checkout)
  const [isMockCheckoutOpen, setIsMockCheckoutOpen] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<{name: string, price: number, cycle: 'Monthly' | 'Yearly'} | null>(null);
  const [mockCardNum, setMockCardNum] = useState('');
  const [mockCardExpiry, setMockCardExpiry] = useState('');
  const [mockCardCvc, setMockCardCvc] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState('');

  // Synchronize inputs when active workspace changes
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

  // Load Invoices for active workspace
  useEffect(() => {
    if (!activeWorkspace) return;
    const stored = localStorage.getItem('taskflow_invoices');
    let invoices: Invoice[] = [];
    if (stored) {
      try {
        invoices = JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse invoices');
      }
    }
    
    // Filter for current workspace
    const workspaceInvoices = invoices.filter(inv => inv.workspaceId === activeWorkspace.id);
    
    // If no invoices exist for this workspace, seed with a Free plan setup invoice
    if (workspaceInvoices.length === 0) {
      const initialInvoice: Invoice = {
        id: `INV-${new Date(activeWorkspace.created_at || Date.now()).getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        date: activeWorkspace.created_at || new Date().toISOString(),
        workspaceId: activeWorkspace.id,
        planName: 'Free',
        amount: 0,
        currency: 'INR',
        status: 'Paid',
        paymentId: 'pay_free_signup',
        billingCycle: 'Monthly'
      };
      
      const updatedAll = [...invoices, initialInvoice];
      localStorage.setItem('taskflow_invoices', JSON.stringify(updatedAll));
      setBillingHistory([initialInvoice]);
    } else {
      setBillingHistory(workspaceInvoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }
  }, [activeWorkspace]);

  // Authorization checks
  const currentMemberRecord = members.find(m => m.user_id === user?.id);
  const isWorkspaceAdmin = currentMemberRecord?.role === 'owner' || currentMemberRecord?.role === 'manager';
  const pendingInvites = members.filter(m => m.status === 'pending');

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

  // -------------------------------------------------------------
  // Razorpay Payment Integration
  // -------------------------------------------------------------
  
  const saveRazorpayKey = (keyVal: string) => {
    setRazorpayKey(keyVal);
    localStorage.setItem('taskflow_razorpay_key', keyVal);
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const triggerUpgrade = async (planName: string, monthlyPrice: number, yearlyPrice: number) => {
    if (!activeWorkspace || !user) return;
    
    const cycle = isYearly ? 'Yearly' : 'Monthly';
    const originalPrice = isYearly ? yearlyPrice : monthlyPrice;
    const inrAmount = isYearly ? originalPrice * 12 : originalPrice;
    
    if (planName !== 'Starter' && planName !== 'Pro') {
      // Downgrade to Free plan (immediate update without checkout)
      await handleSubscriptionSuccess(planName, 0, 'pay_free_downgrade', cycle);
      return;
    }

    setCheckoutPlan({ name: planName, price: inrAmount, cycle });

    // Step 1: Attempt to load the official Razorpay Checkout SDK script
    const isLoaded = await loadRazorpayScript();
    
    if (isLoaded) {
      try {
        const keyId = razorpayKey.trim() || 'rzp_test_5g2K41f9hM9Z1w'; // default public testing sandbox key
        
        const options = {
          key: keyId,
          amount: inrAmount * 100, // Razorpay amount in paise
          currency: 'INR',
          name: 'TaskFlow',
          description: `${planName} Subscription Upgrade - ${cycle}`,
          image: activeWorkspace.logo_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80',
          handler: async function (response: any) {
            const paymentId = response.razorpay_payment_id || `pay_mock_${Math.random().toString(36).substr(2, 9)}`;
            await handleSubscriptionSuccess(planName, inrAmount, paymentId, cycle);
          },
          prefill: {
            name: user.full_name || '',
            email: user.email || '',
          },
          theme: {
            color: '#6d28d9', // taskflow primary purple color
          },
          modal: {
            ondismiss: function () {
              console.log('Razorpay modal closed');
            }
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } catch (err) {
        console.error('Failed to open Razorpay checkout modal, running mock UI backup:', err);
        setIsMockCheckoutOpen(true);
      }
    } else {
      // Fallback: load internal mock payment checkout drawer
      console.warn('Razorpay script blocked or offline. Falling back to local checkout simulation.');
      setIsMockCheckoutOpen(true);
    }
  };

  const handleSubscriptionSuccess = async (planName: string, amount: number, paymentId: string, billingCycle: 'Monthly' | 'Yearly') => {
    if (!activeWorkspace) return;
    
    setPaymentLoading(true);
    
    // Update workspace details
    const { error } = await updateWorkspace(activeWorkspace.id, {
      plan: planName as any,
      subscription_status: 'active'
    });

    if (error) {
      console.error('Error upgrading workspace plan:', error);
      setPaymentLoading(false);
      return;
    }

    // Log transaction invoice
    const newInvoice: Invoice = {
      id: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString(),
      workspaceId: activeWorkspace.id,
      planName,
      amount,
      currency: 'INR',
      status: 'Paid',
      paymentId,
      billingCycle
    };

    const stored = localStorage.getItem('taskflow_invoices');
    let invoices: Invoice[] = [];
    if (stored) {
      try { invoices = JSON.parse(stored); } catch (e) {}
    }
    const updated = [newInvoice, ...invoices];
    localStorage.setItem('taskflow_invoices', JSON.stringify(updated));
    setBillingHistory(updated.filter(inv => inv.workspaceId === activeWorkspace.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    
    setPaymentLoading(false);
    setIsMockCheckoutOpen(false);
    setPaymentSuccessMsg(`Success! Upgraded workspace "${activeWorkspace.name}" to the ${planName} plan.`);
    setTimeout(() => setPaymentSuccessMsg(''), 5000);
  };

  // Perform mock checkout payment simulation
  const handleMockPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutPlan || !activeWorkspace) return;
    
    setPaymentLoading(true);
    // Simulate API network latency
    setTimeout(async () => {
      const paymentId = `pay_mock_${Math.random().toString(36).substr(2, 9)}`;
      await handleSubscriptionSuccess(checkoutPlan.name, checkoutPlan.price, paymentId, checkoutPlan.cycle);
      
      setMockCardNum('');
      setMockCardExpiry('');
      setMockCardCvc('');
    }, 1500);
  };

  // -------------------------------------------------------------
  // Visual limit computations based on active workspace plan
  // -------------------------------------------------------------
  const planLimits = {
    Free: { projects: 5, members: 3, workspaces: 1 },
    Starter: { projects: 9999, members: 10, workspaces: 3 },
    Pro: { projects: 9999, members: 9999, workspaces: 9999 },
    Enterprise: { projects: 9999, members: 9999, workspaces: 9999 }
  };

  const currentPlan = activeWorkspace?.plan || 'Free';
  const limits = planLimits[currentPlan as keyof typeof planLimits] || planLimits.Free;

  const projectsCount = projects.length;
  const membersCount = members.length;
  const workspacesCount = workspaces.length;

  const projectPercent = Math.min((projectsCount / limits.projects) * 100, 100);
  const memberPercent = Math.min((membersCount / limits.members) * 100, 100);
  const workspacePercent = Math.min((workspacesCount / limits.workspaces) * 100, 100);

  // Format printable receipt print execution
  const handlePrintReceipt = () => {
    const printContent = document.getElementById('receipt-invoice-print');
    if (!printContent) return;
    const winPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
    if (!winPrint) return;
    winPrint.document.write(`
      <html>
        <head>
          <title>TaskFlow Receipt - ${selectedInvoice?.id}</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body class="p-8 bg-white text-slate-900" onload="window.print();window.close();">
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    winPrint.document.close();
    winPrint.focus();
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto page-enter pb-16">
      {/* Settings Header */}
      <div className="border-b border-violet-100 dark:border-violet-900/40 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white md:text-3xl">Account & Settings</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configure profile details and manage your subscription.</p>
        </div>
        
        {/* Tab Selection */}
        <div className="flex gap-2 p-1 bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200/50 dark:border-violet-900/20 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
              activeTab === 'general'
                ? 'bg-white dark:bg-violet-950/60 text-violet-600 dark:text-white shadow-sm ring-1 ring-violet-500/10'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <User size={14} />
            <span>General Settings</span>
          </button>
        </div>
      </div>

      {paymentSuccessMsg && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-semibold animate-fade-in">
          <CheckCircle size={18} className="shrink-0" />
          <span>{paymentSuccessMsg}</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          TAB 1: GENERAL SETTINGS
          ─────────────────────────────────────────────────────────── */}
      {activeTab === 'general' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* User Profile Form */}
            <div className="rounded-3xl glass-card p-6 relative overflow-hidden animate-fade-in-up">
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
                    className="mt-2 w-full rounded-2xl p-3 text-sm text-slate-800 dark:text-slate-250 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none glass-input"
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

            {/* Workspace Settings Form */}
            <div className="rounded-3xl glass-card p-6 relative overflow-hidden animate-fade-in-up">
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
                      className="mt-2 w-full rounded-2xl p-3 text-sm text-slate-800 dark:text-slate-205 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none glass-input"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Description</label>
                    <textarea
                      value={wsDesc}
                      onChange={(e) => setWsDesc(e.target.value)}
                      rows={2}
                      className="mt-2 w-full rounded-2xl p-3 text-sm text-slate-800 dark:text-slate-205 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none resize-none glass-input"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Workspace Logo URL</label>
                    <input
                      type="text"
                      value={wsLogo}
                      onChange={(e) => setWsLogo(e.target.value)}
                      className="mt-2 w-full rounded-2xl p-3 text-sm text-slate-800 dark:text-slate-205 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none glass-input"
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

          {/* Pending Invitations list */}
          {pendingInvites.length > 0 && (
            <div className="rounded-3xl glass-card p-6 animate-fade-in-up">
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
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-450 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all duration-150 active:scale-[0.92]"
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
          <div className="rounded-3xl glass-card p-6 relative overflow-hidden animate-fade-in-up">
            <div className="mb-5 flex items-center gap-3 border-b border-violet-50 dark:border-violet-900/20 pb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <Database size={18} />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-250 uppercase tracking-wider">Database Seeding</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
              If your database has been reset or is empty, you can seed it with TaskFlow's premium mock data. This automatically creates workspaces, custom teams, projects, checklists, activity logs, and pre-seeded team files.
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
            <div className="rounded-3xl border border-rose-500/20 bg-rose-500/5 dark:bg-rose-950/5 p-6 animate-fade-in-up">
              <div className="mb-5 flex items-center gap-3 border-b border-rose-500/10 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <AlertTriangle size={18} />
                </div>
                <h3 className="text-sm font-bold text-rose-800 dark:text-rose-450 uppercase tracking-wider">Danger Zone</h3>
              </div>
              <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mb-5 leading-relaxed">
                Permanently delete this workspace and all its data. This action is irreversible. All projects, tasks, checklists, member assignments, and chats will be deleted forever.
              </p>
              <div className="flex items-center gap-4 border-t border-rose-500/10 pt-4">
                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-750 transition-all duration-155 active:scale-[0.96] flex-shrink-0 animate-pulse"
                >
                  <Trash2 size={14} />
                  <span>Delete Workspace</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          TAB 2: BILLING & SUBSCRIPTION DASHBOARD
          ─────────────────────────────────────────────────────────── */}
      {activeTab === 'billing' && (
        <div className="space-y-8 animate-fade-in-up">
          {/* Active Workspace / Plan Overview */}
          <div className="rounded-3xl glass-card p-6 grid grid-cols-1 md:grid-cols-3 gap-6 relative overflow-hidden">
            <div className="md:col-span-1 border-r border-violet-100 dark:border-violet-900/20 pr-0 md:pr-6 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-violet-500 dark:text-violet-400 uppercase tracking-wider">Active Workspace Plan</p>
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-white mt-1">{activeWorkspace?.name || 'Workspace'}</h3>
                
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-3xl font-black text-violet-600 dark:text-violet-400 font-sans uppercase">
                    {currentPlan}
                  </span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full uppercase tracking-wide">
                    {activeWorkspace?.subscription_status === 'active' ? 'Active' : 'Unsubscribed'}
                  </span>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-violet-50 dark:border-violet-900/10 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center justify-between font-medium">
                  <span>Cycle:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {billingHistory[0]?.billingCycle === 'Yearly' ? 'Annual Renewal' : 'Monthly Renewal'}
                  </span>
                </div>
                <div className="flex items-center justify-between font-medium mt-1.5">
                  <span>Last Paid:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {billingHistory[0] ? new Date(billingHistory[0].date).toLocaleDateString() : 'Never'}
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Workspace Limits Progress */}
            <div className="md:col-span-2 flex flex-col justify-between gap-5 pl-0 md:pl-2">
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-250 uppercase tracking-wider mb-4">Workspace Resource Allocations</h4>
                
                <div className="space-y-4">
                  {/* Projects limit */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-500 dark:text-slate-400">Projects Count</span>
                      <span className="text-slate-800 dark:text-slate-200">
                        {projectsCount} / {limits.projects > 1000 ? 'Unlimited' : limits.projects}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-850 overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 transition-all duration-500" 
                        style={{ width: `${projectPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Members limit */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-500 dark:text-slate-400">Team Collaborators</span>
                      <span className="text-slate-800 dark:text-slate-200">
                        {membersCount} / {limits.members > 1000 ? 'Unlimited' : limits.members}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-850 overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-600 transition-all duration-500" 
                        style={{ width: `${memberPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Workspace limit */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-500 dark:text-slate-400">Workspaces Limit</span>
                      <span className="text-slate-800 dark:text-slate-200">
                        {workspacesCount} / {limits.workspaces > 1000 ? 'Unlimited' : limits.workspaces}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-850 overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600 transition-all duration-500" 
                        style={{ width: `${workspacePercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed mt-2">
                <Info size={12} className="shrink-0 text-violet-400" />
                <span>Need extra workspaces or projects? Select a larger package from the pricing grids below.</span>
              </div>
            </div>
          </div>

          {/* Pricing Selector Matrix */}
          <div className="rounded-3xl glass-card p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-violet-50 dark:border-violet-900/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                  <TrendingUp size={15} />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-250 uppercase tracking-wider">Available Upgrades & Packages</h3>
              </div>

              {/* Monthly/Yearly switch */}
              <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl w-fit border border-violet-100/10">
                <button
                  onClick={() => setIsYearly(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    !isYearly ? 'bg-white dark:bg-violet-950/60 shadow-sm text-violet-600 dark:text-white' : 'text-slate-500 dark:text-slate-450'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setIsYearly(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isYearly ? 'bg-white dark:bg-violet-950/60 shadow-sm text-violet-600 dark:text-white' : 'text-slate-500 dark:text-slate-450'
                  }`}
                >
                  <span>Yearly</span>
                  <span className="text-[9px] font-extrabold px-1 bg-emerald-500 text-white rounded">
                    -20%
                  </span>
                </button>
              </div>
            </div>

            {/* Plans List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Starter Plan Card */}
              <div 
                className={`rounded-2xl border p-5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${
                  currentPlan === 'Starter'
                    ? 'border-violet-500 bg-violet-500/5 dark:bg-violet-950/5'
                    : 'border-violet-100/60 dark:border-violet-900/20 bg-white/5 dark:bg-slate-900/10'
                }`}
              >
                {currentPlan === 'Starter' && (
                  <span className="absolute top-2 right-2 text-[8px] font-black text-white bg-violet-600 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Current
                  </span>
                )}
                <div>
                  <h4 className="text-base font-extrabold text-slate-800 dark:text-white">Starter Squad</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Excellent package for small, collaborative teams.</p>
                  
                  <div className="mt-4 mb-5 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {isYearly ? '₹580' : '₹750'}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                      /month, billed {isYearly ? 'yearly' : 'monthly'}
                    </span>
                  </div>
                  
                  <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-350 border-t border-violet-50 dark:border-violet-900/10 pt-4">
                    <li className="flex items-center gap-2"><Check size={12} className="text-violet-500 shrink-0" /> 10 Team Members</li>
                    <li className="flex items-center gap-2"><Check size={12} className="text-violet-500 shrink-0" /> 3 Collaborative Workspaces</li>
                    <li className="flex items-center gap-2"><Check size={12} className="text-violet-500 shrink-0" /> Unlimited Projects</li>
                    <li className="flex items-center gap-2"><Check size={12} className="text-violet-500 shrink-0" /> Priority Support</li>
                  </ul>
                </div>

                <button
                  onClick={() => triggerUpgrade('Starter', 750, 580)}
                  disabled={currentPlan === 'Starter'}
                  className={`mt-6 w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                    currentPlan === 'Starter'
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      : 'bg-violet-600 text-white hover:bg-violet-700 active:scale-[0.98]'
                  }`}
                >
                  {currentPlan === 'Starter' ? 'Current Package' : 'Upgrade Workspace'}
                </button>
              </div>

              {/* Pro Plan Card */}
              <div 
                className={`rounded-2xl border p-5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${
                  currentPlan === 'Pro'
                    ? 'border-violet-500 bg-violet-500/5 dark:bg-violet-950/5 shadow-lg shadow-violet-500/10'
                    : 'border-violet-100/60 dark:border-violet-900/20 bg-white/5 dark:bg-slate-900/10'
                }`}
              >
                {currentPlan === 'Pro' ? (
                  <span className="absolute top-2 right-2 text-[8px] font-black text-white bg-violet-600 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Current
                  </span>
                ) : (
                  <span className="absolute top-2 right-2 text-[8px] font-black text-white bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5">
                    ⭐ Popular
                  </span>
                )}
                <div>
                  <h4 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <span>TaskFlow Pro</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Full automation tools and unlimited workspace metrics.</p>
                  
                  <div className="mt-4 mb-5 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {isYearly ? '₹1200' : '₹1500'}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                      /month, billed {isYearly ? 'yearly' : 'monthly'}
                    </span>
                  </div>
                  
                  <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-350 border-t border-violet-50 dark:border-violet-900/10 pt-4">
                    <li className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200"><Check size={12} className="text-violet-500 shrink-0" /> Unlimited Members</li>
                    <li className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200"><Check size={12} className="text-violet-500 shrink-0" /> Unlimited Workspaces</li>
                    <li className="flex items-center gap-2"><Check size={12} className="text-violet-500 shrink-0" /> Unlimited Projects & Tasks</li>
                    <li className="flex items-center gap-2"><Check size={12} className="text-violet-500 shrink-0" /> Dedicated Account Manager</li>
                  </ul>
                </div>

                <button
                  onClick={() => triggerUpgrade('Pro', 1500, 1200)}
                  disabled={currentPlan === 'Pro'}
                  className={`mt-6 w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                    currentPlan === 'Pro'
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      : 'bg-violet-600 text-white hover:bg-violet-700 active:scale-[0.98]'
                  }`}
                >
                  {currentPlan === 'Pro' ? 'Current Package' : 'Upgrade Workspace'}
                </button>
              </div>

              {/* Enterprise / Sales Plan Card */}
              <div className="rounded-2xl border border-violet-100/60 dark:border-violet-900/20 bg-white/5 dark:bg-slate-900/10 p-5 flex flex-col justify-between relative overflow-hidden">
                <div>
                  <h4 className="text-base font-extrabold text-slate-800 dark:text-white">Custom Corporate</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">On-premise architectures and private deployments.</p>
                  
                  <div className="mt-4 mb-5 flex items-baseline gap-1">
                    <span className="text-xl font-bold text-slate-900 dark:text-white">
                      Custom Quote
                    </span>
                  </div>
                  
                  <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-350 border-t border-violet-50 dark:border-violet-900/10 pt-4">
                    <li className="flex items-center gap-2"><Check size={12} className="text-violet-500 shrink-0" /> On-Premise Install</li>
                    <li className="flex items-center gap-2"><Check size={12} className="text-violet-500 shrink-0" /> SSO / SAML integrations</li>
                    <li className="flex items-center gap-2"><Check size={12} className="text-violet-500 shrink-0" /> SLA Uptime Guarantee</li>
                    <li className="flex items-center gap-2"><Check size={12} className="text-violet-500 shrink-0" /> 24/7 Phone & Email</li>
                  </ul>
                </div>

                <a
                  href="mailto:sales@taskflow.saas"
                  className="mt-6 w-full py-2.5 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700 text-center transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-1"
                >
                  <span>Contact Sales</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
            
            {/* Free Downgrade option */}
            {currentPlan !== 'Free' && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => triggerUpgrade('Free', 0, 0)}
                  className="text-xs font-semibold text-slate-400 hover:text-rose-500 transition-colors"
                >
                  Downgrade to Free Basic plan
                </button>
              </div>
            )}
          </div>

          {/* Razorpay Key Settings config card */}
          <div className="rounded-3xl glass-card p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-violet-50 dark:border-violet-900/20 pb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <Key size={18} />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-250 uppercase tracking-wider">Razorpay Developer API Keys</h3>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              By default, payments utilize TaskFlow's test key which opens the secure Razorpay sandbox in standard developer mode. To route payments using your own Merchant ID, input your Razorpay Test Key ID below.
            </p>
            
            <div className="max-w-md">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Razorpay Key ID (Test)</label>
              <div className="mt-2 flex gap-3">
                <input
                  type="text"
                  placeholder="rzp_test_..."
                  value={razorpayKey}
                  onChange={(e) => saveRazorpayKey(e.target.value)}
                  className="w-full rounded-2xl p-3 text-xs text-slate-800 dark:text-slate-205 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none glass-input"
                />
                {razorpayKey && (
                  <button
                    onClick={() => saveRazorpayKey('')}
                    className="px-3 rounded-2xl text-xs font-semibold border border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Billing Transaction Log history */}
          <div className="rounded-3xl glass-card p-6 space-y-5">
            <div className="flex items-center gap-3 border-b border-violet-50 dark:border-violet-900/20 pb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <History size={18} />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-250 uppercase tracking-wider">Transaction Invoice Logs</h3>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-violet-100/50 dark:border-violet-900/10">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-950/20 border-b border-violet-50/40 dark:border-violet-900/10 text-slate-500 dark:text-slate-400 font-semibold">
                    <th className="p-3">Invoice ID</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Plan Package</th>
                    <th className="p-3">Cycle</th>
                    <th className="p-3">Amount Charged</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-violet-50/20 dark:divide-violet-900/5 text-slate-700 dark:text-slate-200">
                  {billingHistory.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-950/10 transition-colors">
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">{invoice.id}</td>
                      <td className="p-3">{new Date(invoice.date).toLocaleDateString()}</td>
                      <td className="p-3 font-medium uppercase">{invoice.planName} Plan</td>
                      <td className="p-3 font-medium">{invoice.billingCycle}</td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">
                        {invoice.amount === 0 ? 'Free' : `₹${invoice.amount.toLocaleString()}`}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          {invoice.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setIsReceiptModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-violet-100 dark:border-violet-900/25 hover:bg-violet-500 hover:text-white hover:border-violet-500 transition-all font-bold text-[10px]"
                        >
                          View Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          MODAL: MOCK CARD CHECKOUT SIMULATION FALLBACK
          ─────────────────────────────────────────────────────────── */}
      {isMockCheckoutOpen && checkoutPlan && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMockCheckoutOpen(false)}
          />
          
          <div className="relative w-full max-w-md transform overflow-hidden rounded-3xl border border-violet-500/30 bg-white dark:bg-slate-950 p-6 shadow-2xl transition-all animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-violet-50 dark:border-violet-900/20 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-violet-600 flex items-center justify-center text-white font-bold">TF</div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Razorpay Secure Checkout</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Local Sandbox Payment Simulation</p>
                </div>
              </div>
              <button 
                onClick={() => setIsMockCheckoutOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-violet-500/5 dark:bg-violet-950/20 rounded-2xl p-4 border border-violet-500/10 mb-5 text-xs">
              <div className="flex items-center justify-between font-semibold mb-1.5">
                <span className="text-slate-500 dark:text-slate-400">Plan Upgrading:</span>
                <span className="text-slate-900 dark:text-white uppercase font-bold">{checkoutPlan.name} Plan</span>
              </div>
              <div className="flex items-center justify-between font-semibold">
                <span className="text-slate-500 dark:text-slate-400">Total Amount:</span>
                <span className="text-slate-900 dark:text-white font-black text-sm">₹{checkoutPlan.price.toLocaleString()} INR</span>
              </div>
            </div>

            <form onSubmit={handleMockPaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Dummy Card Number</label>
                <input
                  type="text"
                  required
                  placeholder="4111 1111 1111 1111"
                  value={mockCardNum}
                  onChange={(e) => setMockCardNum(e.target.value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim().substring(0, 19))}
                  className="mt-1.5 w-full rounded-xl p-3 text-xs text-slate-800 dark:text-slate-205 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none glass-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Expiry Date</label>
                  <input
                    type="text"
                    required
                    placeholder="MM/YY"
                    value={mockCardExpiry}
                    onChange={(e) => setMockCardExpiry(e.target.value.substring(0, 5))}
                    className="mt-1.5 w-full rounded-xl p-3 text-xs text-slate-800 dark:text-slate-205 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none glass-input"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">CVV/CVC</label>
                  <input
                    type="password"
                    required
                    placeholder="***"
                    value={mockCardCvc}
                    onChange={(e) => setMockCardCvc(e.target.value.replace(/\D/g, '').substring(0, 3))}
                    className="mt-1.5 w-full rounded-xl p-3 text-xs text-slate-800 dark:text-slate-205 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none glass-input"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={paymentLoading}
                className="mt-4 w-full py-3 rounded-xl bg-violet-600 text-white font-bold text-xs hover:bg-violet-750 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {paymentLoading ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Processing Payment Verification...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={14} />
                    <span>Verify Sandbox Payment</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          MODAL: INVOICE RECEIPT VIEW & PRINT MODAL
          ─────────────────────────────────────────────────────────── */}
      {isReceiptModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsReceiptModalOpen(false)}
          />
          
          <div className="relative w-full max-w-2xl transform overflow-hidden rounded-3xl border border-violet-500/20 bg-white dark:bg-slate-950 p-6 shadow-2xl transition-all animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-violet-50 dark:border-violet-900/20 pb-4 mb-6">
              <span className="text-xs font-bold text-slate-400">Tax Invoice / Receipt</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintReceipt}
                  className="flex items-center gap-1.5 rounded-xl border border-violet-100 dark:border-violet-900/20 px-3.5 py-2 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all"
                >
                  <Printer size={12} />
                  <span>Print / PDF</span>
                </button>
                <button 
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl p-1"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Receipt Printable Component */}
            <div id="receipt-invoice-print" className="space-y-6 bg-slate-50/20 dark:bg-slate-900/10 p-5 rounded-2xl border border-violet-50/10">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div className="text-xl font-black text-violet-600">TASKFLOW</div>
                  <p className="text-[10px] text-slate-400 mt-1">Enterprise Software & Project Orchestration</p>
                  <p className="text-[9px] text-slate-400">102 Cloudways Inc, Block B-4, Bengaluru, India</p>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Invoice Receipt</div>
                  <p className="text-[10px] text-slate-400 mt-1">Invoice Ref: {selectedInvoice.id}</p>
                  <p className="text-[10px] text-slate-400">Date: {new Date(selectedInvoice.date).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-b border-violet-100/50 dark:border-violet-900/15 py-4 text-xs font-medium">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Billed To:</p>
                  <p className="text-slate-800 dark:text-slate-100 font-bold">{user?.full_name || 'Owner Profile'}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{user?.email}</p>
                  <p className="text-[10px] text-slate-400">Workspace: {activeWorkspace?.name}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Transaction Details:</p>
                  <p className="text-slate-800 dark:text-slate-100 font-semibold">Gateway ID: {selectedInvoice.paymentId}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Currency: {selectedInvoice.currency} (Indian Rupee)</p>
                  <p className="text-[10px] text-slate-450">Status: PAID</p>
                </div>
              </div>

              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-violet-100/30 dark:border-violet-900/10 text-slate-400 font-bold">
                    <th className="py-2">Item Description</th>
                    <th className="py-2">Period</th>
                    <th className="py-2 text-right">Line Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-violet-50/10 text-slate-700 dark:text-slate-205">
                  <tr>
                    <td className="py-3 font-semibold text-slate-900 dark:text-white">
                      TaskFlow {selectedInvoice.planName} Plan subscription
                    </td>
                    <td className="py-3">{selectedInvoice.billingCycle}ly subscription license</td>
                    <td className="py-3 text-right font-semibold text-slate-900 dark:text-white">
                      ₹{selectedInvoice.amount.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="flex justify-end pt-4 border-t border-violet-100/30 dark:border-violet-900/10">
                <div className="w-48 text-xs font-medium space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Subtotal:</span>
                    <span>₹{selectedInvoice.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">GST (0% - Test/Intl):</span>
                    <span>₹0</span>
                  </div>
                  <div className="flex justify-between border-t border-violet-100/50 dark:border-violet-900/15 pt-2 text-slate-900 dark:text-white font-bold">
                    <span>Grand Total:</span>
                    <span>₹{selectedInvoice.amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Workspace Confirmation Modal */}
      {isDeleteModalOpen && activeWorkspace && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsDeleteModalOpen(false)}
          />
          
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
              <div className="mt-4 rounded-xl bg-rose-500/10 p-3 text-xs font-semibold text-rose-600 dark:text-rose-450">
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-150"
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
