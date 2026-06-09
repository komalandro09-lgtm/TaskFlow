import { createClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';


// Detect if we should use the live Supabase database
const isLiveSupabase = 
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder') && 
  !supabaseAnonKey.includes('placeholder') &&
  supabaseUrl !== 'YOUR_SUPABASE_URL' && 
  supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY';

export const isUsingMock = !isLiveSupabase;

// Initialize actual Supabase client if configured
let liveClient: any = null;
if (isLiveSupabase) {
  try {
    liveClient = createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.error('Failed to initialize live Supabase client, falling back to mock:', err);
  }
}

// -------------------------------------------------------------
// HIGH-FIDELITY MOCK DATABASE CLIENT (backed by localStorage)
// -------------------------------------------------------------

// Local storage key names
const MOCK_STORAGE_KEY = 'taskflow_mock_db';
const MOCK_SESSION_KEY = 'taskflow_mock_session';

// Seeding standard workspace and elements
const defaultWorkspaces = [
  {
    id: 'w1',
    name: 'Acme Agency Co.',
    description: 'Workspace for all creative design projects, client work, and marketing campaigns.',
    logo_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=60',
    owner_id: 'user1',
    created_at: new Date().toISOString()
  },
  {
    id: 'w2',
    name: 'Apollo Ventures',
    description: 'Workspace for tech startups, product design, and development teams.',
    logo_url: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=100&auto=format&fit=crop&q=60',
    owner_id: 'user1',
    created_at: new Date().toISOString()
  }
];

const defaultProfiles = [
  {
    id: 'user1',
    email: 'owner@taskflow.com',
    full_name: 'David Larsson',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    is_admin: true,
    updated_at: new Date().toISOString()
  },
  {
    id: 'user2',
    email: 'manager@taskflow.com',
    full_name: 'Sarah Chen',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    is_admin: false,
    updated_at: new Date().toISOString()
  },
  {
    id: 'user3',
    email: 'developer@taskflow.com',
    full_name: 'Marcus Miller',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    is_admin: false,
    updated_at: new Date().toISOString()
  }
];

const defaultWorkspaceMembers = [
  { id: 'wm1', workspace_id: 'w1', user_id: 'user1', role: 'owner', status: 'active', created_at: new Date().toISOString() },
  { id: 'wm2', workspace_id: 'w1', user_id: 'user2', role: 'manager', status: 'active', created_at: new Date().toISOString() },
  { id: 'wm3', workspace_id: 'w1', user_id: 'user3', role: 'member', status: 'active', created_at: new Date().toISOString() },
  { id: 'wm4', workspace_id: 'w2', user_id: 'user1', role: 'owner', status: 'active', created_at: new Date().toISOString() }
];

const defaultProjects = [
  {
    id: 'p1',
    workspace_id: 'w1',
    name: 'TaskFlow Website Redesign',
    description: 'Revamping the core promotional site and client onboarding portals to drive SaaS signups.',
    start_date: '2026-06-01',
    due_date: '2026-07-15',
    priority: 'high',
    status: 'active',
    created_at: new Date().toISOString()
  },
  {
    id: 'p2',
    workspace_id: 'w1',
    name: 'Mobile App Beta Launch',
    description: 'Publishing iOS and Android builds to TestFlight and Google Beta, getting feedback from first 100 beta testers.',
    start_date: '2026-06-10',
    due_date: '2026-08-30',
    priority: 'critical',
    status: 'active',
    created_at: new Date().toISOString()
  },
  {
    id: 'p3',
    workspace_id: 'w1',
    name: 'Annual Security Review',
    description: 'Conducting standard penetration tests, upgrading RLS roles, and renewing SOC 2 compliance reports.',
    start_date: '2026-05-15',
    due_date: '2026-06-05',
    priority: 'medium',
    status: 'completed',
    created_at: new Date().toISOString()
  }
];

const defaultProjectMembers = [
  { id: 'pm1', project_id: 'p1', user_id: 'user1', created_at: new Date().toISOString() },
  { id: 'pm2', project_id: 'p1', user_id: 'user2', created_at: new Date().toISOString() },
  { id: 'pm3', project_id: 'p1', user_id: 'user3', created_at: new Date().toISOString() },
  { id: 'pm4', project_id: 'p2', user_id: 'user1', created_at: new Date().toISOString() },
  { id: 'pm5', project_id: 'p2', user_id: 'user3', created_at: new Date().toISOString() }
];

const defaultTasks = [
  {
    id: 't1',
    project_id: 'p1',
    title: 'Design high-fidelity homepage mockups',
    description: 'Design dark mode home layouts focusing on pricing card details and the interactive product carousel widgets.',
    assignee_id: 'user2',
    priority: 'high',
    status: 'in_progress',
    due_date: '2026-06-20T18:00:00.000Z',
    labels: ['Design', 'UI/UX'],
    created_at: new Date().toISOString()
  },
  {
    id: 't2',
    project_id: 'p1',
    title: 'Setup routing framework in React App',
    description: 'Define routes using React Router DOM, create sidebar bindings, and protect dashboards with auth checks.',
    assignee_id: 'user3',
    priority: 'critical',
    status: 'todo',
    due_date: '2026-06-15T18:00:00.000Z',
    labels: ['Frontend', 'Vite'],
    created_at: new Date().toISOString()
  },
  {
    id: 't3',
    project_id: 'p1',
    title: 'Configure local storage hybrid database clients',
    description: 'Provide query fallback interceptors for developer testing when offline or missing Supabase keys.',
    assignee_id: 'user1',
    priority: 'medium',
    status: 'review',
    due_date: '2026-06-08T18:00:00.000Z',
    labels: ['Database', 'Config'],
    created_at: new Date().toISOString()
  },
  {
    id: 't4',
    project_id: 'p1',
    title: 'Review landing copy writing',
    description: 'Confirm tagline headings, objectives, user value propositions, and success metrics wording.',
    assignee_id: 'user2',
    priority: 'low',
    status: 'completed',
    due_date: '2026-06-01T18:00:00.000Z',
    labels: ['Copy'],
    created_at: new Date().toISOString()
  },
  {
    id: 't5',
    project_id: 'p2',
    title: 'Prepare App Store deployment configs',
    description: 'Compile developer certificates, write description summaries, upload screenshots of active workspaces.',
    assignee_id: 'user3',
    priority: 'high',
    status: 'backlog',
    due_date: '2026-07-10T18:00:00.000Z',
    labels: ['DevOps', 'Mobile'],
    created_at: new Date().toISOString()
  }
];

const defaultChecklists = [
  { id: 'c1', task_id: 't1', title: 'Complete dashboard sidebar mockup', is_completed: true, created_at: new Date().toISOString() },
  { id: 'c2', task_id: 't1', title: 'Verify responsive sizes (mobile & tablet)', is_completed: false, created_at: new Date().toISOString() },
  { id: 'c3', task_id: 't1', title: 'Design user profile settings page popup', is_completed: false, created_at: new Date().toISOString() },
  { id: 'c4', task_id: 't3', title: 'Test LocalStorage loading speed', is_completed: true, created_at: new Date().toISOString() },
  { id: 'c5', task_id: 't3', title: 'Write unit mock tests', is_completed: true, created_at: new Date().toISOString() }
];

const defaultComments = [
  { id: 'cm1', task_id: 't1', user_id: 'user3', content: "The typography look looks excellent, David. Should we introduce Outfit font for a more SaaS feeling?", created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: 'cm2', task_id: 't1', user_id: 'user1', content: "Let's stick to Inter for content paragraphs, but Outfit or Roboto for larger H1/H2 elements sounds fantastic!", created_at: new Date(Date.now() - 3600000).toISOString() }
];

const defaultAttachments = [
  { id: 'att1', task_id: 't1', name: 'homepage_final.jpg', url: 'https://images.unsplash.com/photo-1541462608141-2f5297e10a27?w=300&auto=format&fit=crop&q=80', file_type: 'image/jpeg', size: 124500, created_at: new Date().toISOString() },
  { id: 'att2', task_id: 't3', name: 'database_mock_specs.pdf', url: '#', file_type: 'application/pdf', size: 345000, created_at: new Date().toISOString() }
];

const defaultNotifications = [
  { id: 'n1', user_id: 'user1', title: 'Added to project Mobile App Beta Launch', description: 'Sarah Chen added you to the project members list.', is_read: false, created_at: new Date(Date.now() - 3600000 * 5).toISOString() },
  { id: 'n2', user_id: 'user1', title: 'Comment on homepage mockups task', description: 'Marcus Miller left a review comment about layout fonts.', is_read: false, created_at: new Date(Date.now() - 3600000 * 2).toISOString() }
];

const defaultActivityLogs = [
  { id: 'a1', workspace_id: 'w1', user_id: 'user1', action: 'created', target_type: 'project', target_name: 'TaskFlow Website Redesign', created_at: new Date(Date.now() - 3600000 * 24).toISOString() },
  { id: 'a2', workspace_id: 'w1', user_id: 'user2', action: 'moved', target_type: 'task', target_name: 'Design high-fidelity homepage mockups', created_at: new Date(Date.now() - 3600000 * 12).toISOString() },
  { id: 'a3', workspace_id: 'w1', user_id: 'user3', action: 'added comment to', target_type: 'task', target_name: 'Design high-fidelity homepage mockups', created_at: new Date(Date.now() - 3600000 * 2).toISOString() }
];

// Helper to initialize db structure
function loadDb() {
  const data = localStorage.getItem(MOCK_STORAGE_KEY);
  let db: any = null;
  if (data) {
    try {
      db = JSON.parse(data);
    } catch (e) {
      console.error("Corrupted mock database, resetting...");
    }
  }

  if (!db) {
    db = {
      profiles: defaultProfiles,
      workspaces: defaultWorkspaces,
      workspace_members: defaultWorkspaceMembers,
      projects: defaultProjects,
      project_members: defaultProjectMembers,
      tasks: defaultTasks,
      checklists: defaultChecklists,
      comments: defaultComments,
      attachments: defaultAttachments,
      notifications: defaultNotifications,
      activity_logs: defaultActivityLogs,
      project_messages: [],
      firewall_blocked_ips: [],
      firewall_rate_limits: [],
      audit_logs: []
    };
    saveDb(db);
  } else {
    // Ensure new tables/fields exist for migrations
    if (!db.firewall_blocked_ips) db.firewall_blocked_ips = [];
    if (!db.firewall_rate_limits) db.firewall_rate_limits = [];
    if (!db.audit_logs) db.audit_logs = [];
    if (!db.project_messages) db.project_messages = [];
    if (db.profiles) {
      db.profiles = db.profiles.map((p: any) => ({
        ...p,
        is_admin: p.id === 'user1' ? true : (p.is_admin || false)
      }));
    }
    saveDb(db);
  }
  return db;
}

function saveDb(db: any) {
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(db));
}

// Global active mock session helper
function getSessionUser() {
  const session = localStorage.getItem(MOCK_SESSION_KEY);
  if (session) {
    try {
      const parsed = JSON.parse(session);
      return parsed.user;
    } catch (e) {}
  }
  // Default fallback user for testing if not logged in
  return defaultProfiles[0];
}

// -------------------------------------------------------------
// Mock Supabase Object API mapping
// -------------------------------------------------------------
export const mockSupabase = {
  auth: {
    signUp: async ({ email, password, options }: any) => {
      const db = loadDb();
      if (db.profiles.some((p: any) => p.email.toLowerCase() === email.toLowerCase())) {
        return { data: { user: null }, error: new Error('User already exists') };
      }
      
      const newUserId = 'user_' + Math.random().toString(36).substr(2, 9);
      const newProfile = {
        id: newUserId,
        email,
        full_name: options?.data?.full_name || email.split('@')[0],
        avatar_url: options?.data?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${email.split('@')[0]}`,
        updated_at: new Date().toISOString()
      };
      
      db.profiles.push(newProfile);
      saveDb(db);

      const session = {
        access_token: 'mock_jwt_token',
        user: newProfile
      };
      
      localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(session));

      return { data: { user: newProfile, session }, error: null };
    },
    
    signInWithPassword: async ({ email, password }: any) => {
      const db = loadDb();
      const profile = db.profiles.find((p: any) => p.email.toLowerCase() === email.toLowerCase());
      
      if (!profile) {
        return { data: { user: null, session: null }, error: new Error('User not found or password incorrect') };
      }

      // Automatically mock success for demonstration login
      const session = {
        access_token: 'mock_jwt_token_' + profile.id,
        user: profile
      };

      localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(session));

      return { data: { user: profile, session }, error: null };
    },
    
    signOut: async () => {
      localStorage.removeItem(MOCK_SESSION_KEY);
      return { error: null };
    },

    getSession: async () => {
      const session = localStorage.getItem(MOCK_SESSION_KEY);
      if (session) {
        try {
          return { data: { session: JSON.parse(session) }, error: null };
        } catch (e) {}
      }
      return { data: { session: null }, error: null };
    },

    getUser: async () => {
      const session = localStorage.getItem(MOCK_SESSION_KEY);
      if (session) {
        try {
          const parsed = JSON.parse(session);
          return { data: { user: parsed.user }, error: null };
        } catch (e) {}
      }
      return { data: { user: null }, error: null };
    },

    resetPasswordForEmail: async (email: string, options?: any) => {
      const db = loadDb();
      const profile = db.profiles.find((p: any) => p.email.toLowerCase() === email.toLowerCase());
      if (!profile) {
        return { data: null, error: new Error('User with this email not found') };
      }
      return { data: {}, error: null };
    },

    updateUser: async ({ password, data }: any) => {
      const session = localStorage.getItem(MOCK_SESSION_KEY);
      if (!session) return { data: { user: null }, error: new Error('No active session') };

      const parsed = JSON.parse(session);
      const db = loadDb();
      const profileIndex = db.profiles.findIndex((p: any) => p.id === parsed.user.id);

      if (profileIndex !== -1) {
        if (data?.full_name) db.profiles[profileIndex].full_name = data.full_name;
        if (data?.avatar_url) db.profiles[profileIndex].avatar_url = data.avatar_url;
        db.profiles[profileIndex].updated_at = new Date().toISOString();
        saveDb(db);

        parsed.user = db.profiles[profileIndex];
        localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(parsed));
        return { data: { user: parsed.user }, error: null };
      }

      return { data: { user: null }, error: new Error('Profile not found') };
    }
  },

  // Database standard queries mockup
  from: (table: string) => {
    const db = loadDb();
    let currentData = [...(db[table as keyof typeof db] || [])];
    
    const queryChain = {
      data: currentData,
      error: null as any,
      
      select: function(fields?: string) {
        // Simple mock implementation of selection filtering could be added here, 
        // but returning full rows is standard for simple apps.
        return this;
      },
      
      eq: function(column: string, value: any) {
        this.data = this.data.filter((item: any) => item[column] === value);
        return this;
      },

      in: function(column: string, values: any[]) {
        this.data = this.data.filter((item: any) => values.includes(item[column]));
        return this;
      },
      
      order: function(column: string, { ascending = true } = {}) {
        this.data = [...this.data].sort((a: any, b: any) => {
          if (a[column] === b[column]) return 0;
          const comp = a[column] < b[column] ? -1 : 1;
          return ascending ? comp : -comp;
        });
        return this;
      },
      
      single: function() {
        const item = this.data[0] || null;
        return { data: item, error: item ? null : new Error('No row found') };
      },
      
      insert: async function(rowData: any) {
        const dbState = loadDb();
        const records = dbState[table as keyof typeof dbState] || [];
        
        // Wrap object vs array row insertion
        const isArray = Array.isArray(rowData);
        const rowsToInsert = isArray ? rowData : [rowData];
        
        const inserted = rowsToInsert.map((row: any) => {
          const item = { 
            id: row.id || 'id_' + Math.random().toString(36).substr(2, 9),
            created_at: new Date().toISOString(),
            ...row 
          };
          records.push(item);
          return item;
        });
        
        dbState[table as keyof typeof dbState] = records;
        saveDb(dbState);
        
        const resultData = isArray ? inserted : inserted[0];
        // Return a chainable object so .select().single()/.maybeSingle() works
        const chainable = {
          data: resultData,
          error: null as any,
          select: function(_fields?: string) { return this; },
          single: function() { return { data: Array.isArray(this.data) ? this.data[0] : this.data, error: null }; },
          maybeSingle: function() { return { data: Array.isArray(this.data) ? this.data[0] : this.data, error: null }; },
          then: function(resolve: any) { resolve({ data: this.data, error: this.error }); }
        };
        return chainable;
      },
      
      update: async function(updateData: any) {
        const dbState = loadDb();
        const records = dbState[table as keyof typeof dbState] || [];
        
        // Collect IDs of current query selection
        const targetIds = this.data.map((item: any) => item.id);
        
        const updatedRecords = records.map((record: any) => {
          if (targetIds.includes(record.id)) {
            return { ...record, ...updateData };
          }
          return record;
        });
        
        dbState[table as keyof typeof dbState] = updatedRecords;
        saveDb(dbState);
        
        const updatedSubset = updatedRecords.filter((record: any) => targetIds.includes(record.id));
        return { data: updatedSubset, error: null };
      },
      
      delete: async function() {
        const dbState = loadDb();
        const records = dbState[table as keyof typeof dbState] || [];
        const targetIds = this.data.map((item: any) => item.id);
        
        const remaining = records.filter((record: any) => !targetIds.includes(record.id));
        dbState[table as keyof typeof dbState] = remaining;
        saveDb(dbState);
        
        return { data: this.data, error: null };
      },

      // Handle async resolution for chaining queries
      then: function(resolve: any, reject: any) {
        resolve({ data: this.data, error: this.error });
      }
    };
    
    return queryChain;
  }
};

// Main Export Client (Automatically picks live or mock)
export const supabase = isLiveSupabase ? liveClient : mockSupabase;
