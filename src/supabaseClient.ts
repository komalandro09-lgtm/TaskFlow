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
// MOCK DATABASE CLIENT (backed by localStorage — no seed data)
// -------------------------------------------------------------

const MOCK_STORAGE_KEY = 'taskflow_mock_db';
const MOCK_SESSION_KEY = 'taskflow_mock_session';

// DB version — bump to wipe stale localStorage across all browsers
const DB_VERSION = '4';

// Empty initial database structure — no fake users, workspaces, or data
function getEmptyDb() {
  return {
    profiles: [],
    workspaces: [],
    workspace_members: [],
    projects: [],
    project_members: [],
    tasks: [],
    checklists: [],
    comments: [],
    attachments: [],
    notifications: [],
    activity_logs: [],
    project_messages: [],
    workspace_messages: [],
    firewall_blocked_ips: [],
    firewall_rate_limits: [],
    audit_logs: [],
    teams: [],
    team_members: [],
    workspace_invitations: [],
  };
}

function loadDb() {
  // Wipe and reset if DB version is stale
  const storedVersion = localStorage.getItem('taskflow_db_version');
  if (storedVersion !== DB_VERSION) {
    localStorage.removeItem(MOCK_STORAGE_KEY);
    localStorage.removeItem(MOCK_SESSION_KEY);
    localStorage.removeItem('taskflow_active_workspace_id');
    localStorage.removeItem('taskflow_mock_data_cleared');
    localStorage.setItem('taskflow_db_version', DB_VERSION);
  }

  const data = localStorage.getItem(MOCK_STORAGE_KEY);
  let db: any = null;
  if (data) {
    try {
      db = JSON.parse(data);
    } catch (e) {
      console.error('Corrupted mock database, resetting...');
    }
  }

  if (!db) {
    db = getEmptyDb();
    saveDb(db);
  } else {
    // Ensure all table keys exist (for forward-compatibility)
    const empty = getEmptyDb();
    let changed = false;
    for (const key of Object.keys(empty)) {
      if (!Array.isArray(db[key])) {
        db[key] = [];
        changed = true;
      }
    }
    if (changed) saveDb(db);
  }

  return db;
}

function saveDb(db: any) {
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(db));
}

// Returns the currently logged-in mock user (or null if not logged in)
function getSessionUser() {
  const session = localStorage.getItem(MOCK_SESSION_KEY);
  if (session) {
    try {
      return JSON.parse(session).user;
    } catch (e) {}
  }
  return null;
}

// -------------------------------------------------------------
// Mock Supabase API
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
        avatar_url:
          options?.data?.avatar_url ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
            options?.data?.full_name || email.split('@')[0]
          )}`,
        is_admin: false,
        updated_at: new Date().toISOString(),
      };

      db.profiles.push(newProfile);
      saveDb(db);

      const session = { access_token: 'mock_jwt_' + newUserId, user: newProfile };
      localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(session));

      return { data: { user: newProfile, session }, error: null };
    },

    signInWithPassword: async ({ email, password }: any) => {
      const db = loadDb();
      const profile = db.profiles.find(
        (p: any) => p.email.toLowerCase() === email.toLowerCase()
      );

      if (!profile) {
        return {
          data: { user: null, session: null },
          error: new Error('Invalid email or password'),
        };
      }

      const session = { access_token: 'mock_jwt_' + profile.id, user: profile };
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
      const user = getSessionUser();
      return { data: { user }, error: null };
    },

    resetPasswordForEmail: async (email: string, options?: any) => {
      const db = loadDb();
      const profile = db.profiles.find(
        (p: any) => p.email.toLowerCase() === email.toLowerCase()
      );
      if (!profile) {
        return { data: null, error: new Error('No account found with that email') };
      }
      return { data: {}, error: null };
    },

    updateUser: async ({ password, data }: any) => {
      const session = localStorage.getItem(MOCK_SESSION_KEY);
      if (!session) return { data: { user: null }, error: new Error('Not authenticated') };

      const parsed = JSON.parse(session);
      const db = loadDb();
      const idx = db.profiles.findIndex((p: any) => p.id === parsed.user.id);

      if (idx !== -1) {
        if (data?.full_name) db.profiles[idx].full_name = data.full_name;
        if (data?.avatar_url) db.profiles[idx].avatar_url = data.avatar_url;
        db.profiles[idx].updated_at = new Date().toISOString();
        saveDb(db);
        parsed.user = db.profiles[idx];
        localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(parsed));
        return { data: { user: parsed.user }, error: null };
      }

      return { data: { user: null }, error: new Error('Profile not found') };
    },

    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      // No-op for mock — auth state is synchronous
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
  },

  // Generic query builder
  from: (table: string) => {
    const queryChain = {
      table,
      operation: { type: 'select', args: null } as {
        type: 'select' | 'insert' | 'update' | 'delete';
        args: any;
      },
      filters: [] as ((data: any[]) => any[])[],
      sorts: [] as ((data: any[]) => any[])[],
      limitCount: null as number | null,
      singleRow: false,
      maybeSingleRow: false,

      select(fields?: string) { return this; },

      eq(column: string, value: any) {
        this.filters.push((data) => data.filter((item: any) => item[column] === value));
        return this;
      },

      neq(column: string, value: any) {
        this.filters.push((data) => data.filter((item: any) => item[column] !== value));
        return this;
      },

      in(column: string, values: any[]) {
        this.filters.push((data) => data.filter((item: any) => values.includes(item[column])));
        return this;
      },

      order(column: string, { ascending = true } = {}) {
        this.sorts.push((data) =>
          [...data].sort((a: any, b: any) => {
            if (a[column] === b[column]) return 0;
            const comp = a[column] < b[column] ? -1 : 1;
            return ascending ? comp : -comp;
          })
        );
        return this;
      },

      limit(n: number) {
        this.limitCount = n;
        return this;
      },

      single() { this.singleRow = true; return this; },
      maybeSingle() { this.maybeSingleRow = true; return this; },

      insert(rowData: any) { this.operation = { type: 'insert', args: rowData }; return this; },
      update(updateData: any) { this.operation = { type: 'update', args: updateData }; return this; },
      delete() { this.operation = { type: 'delete', args: null }; return this; },

      execute() {
        const dbState = loadDb();
        let records: any[] = [...((dbState[this.table as keyof typeof dbState] as any[]) || [])];

        for (const f of this.filters) records = f(records);
        for (const s of this.sorts) records = s(records);
        if (this.limitCount !== null) records = records.slice(0, this.limitCount);

        let resultData: any = records;

        if (this.operation.type === 'insert') {
          const rowData = this.operation.args;
          const isArray = Array.isArray(rowData);
          const rows = isArray ? rowData : [rowData];
          const all: any[] = (dbState[this.table as keyof typeof dbState] as any[]) || [];

          const inserted = rows.map((row: any) => {
            const item = {
              id: row.id || 'id_' + Math.random().toString(36).substr(2, 9),
              created_at: new Date().toISOString(),
              ...row,
            };
            all.push(item);
            return item;
          });

          (dbState as any)[this.table] = all;
          saveDb(dbState);
          resultData = isArray ? inserted : inserted[0];

        } else if (this.operation.type === 'update') {
          const all: any[] = (dbState[this.table as keyof typeof dbState] as any[]) || [];
          const ids = records.map((r: any) => r.id);
          const updated = all.map((rec: any) =>
            ids.includes(rec.id) ? { ...rec, ...this.operation.args } : rec
          );
          (dbState as any)[this.table] = updated;
          saveDb(dbState);
          resultData = updated.filter((r: any) => ids.includes(r.id));

        } else if (this.operation.type === 'delete') {
          const all: any[] = (dbState[this.table as keyof typeof dbState] as any[]) || [];
          const ids = records.map((r: any) => r.id);
          (dbState as any)[this.table] = all.filter((r: any) => !ids.includes(r.id));
          saveDb(dbState);
          resultData = records;
        }

        if (this.singleRow) {
          const item = Array.isArray(resultData) ? (resultData[0] ?? null) : resultData;
          return { data: item, error: item ? null : new Error('No row found') };
        }
        if (this.maybeSingleRow) {
          const item = Array.isArray(resultData) ? (resultData[0] ?? null) : resultData;
          return { data: item, error: null };
        }
        return { data: resultData, error: null };
      },

      then(resolve: any, _reject: any) {
        resolve(this.execute());
      },
    };

    return queryChain;
  },

  // Realtime stub (no-op in mock mode)
  channel: (_name: string) => ({
    on: (_event: string, _filter: any, _cb: any) => ({
      subscribe: () => null,
    }),
  }),
  removeChannel: (_ch: any) => {},
};

// Main export — automatically picks live Supabase or mock
export const supabase = isLiveSupabase ? liveClient : mockSupabase;
