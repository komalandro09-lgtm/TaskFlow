import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
}

interface AuthContextType {
  user: Profile | null;
  session: any | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: any }>;
  register: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  logout: () => Promise<{ error: any }>;
  updateProfile: (fullName: string, avatarUrl: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize session and auth listener
  useEffect(() => {
    async function initializeAuth() {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession) {
          setSession(currentSession);
          
          // Get the profile details
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();

          if (profile) {
            setUser(profile);
          } else {
            // Profile not found, but we have user metadata
            setUser({
              id: currentSession.user.id,
              email: currentSession.user.email || '',
              full_name: currentSession.user.user_metadata?.full_name || currentSession.user.email?.split('@')[0] || '',
              avatar_url: currentSession.user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${currentSession.user.email?.split('@')[0] || ''}`
            });
          }
        }
      } catch (err) {
        console.error('Failed to initialize session:', err);
      } finally {
        setLoading(false);
      }
    }

    initializeAuth();

    // Setup live listener if Supabase supports onAuthStateChange
    if (supabase.auth.onAuthStateChange) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event: string, sessionData: any) => {
          setSession(sessionData);
          if (sessionData?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', sessionData.user.id)
              .single();
            
            if (profile) {
              setUser(profile);
            } else {
              setUser({
                id: sessionData.user.id,
                email: sessionData.user.email || '',
                full_name: sessionData.user.user_metadata?.full_name || '',
                avatar_url: sessionData.user.user_metadata?.avatar_url || ''
              });
            }
          } else {
            setUser(null);
          }
          setLoading(false);
        }
      );
      return () => {
        subscription?.unsubscribe();
      };
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data?.session) {
        setSession(data.session);
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
        
        setUser(profile || {
          id: data.user.id,
          email: data.user.email || '',
          full_name: data.user.user_metadata?.full_name || '',
          avatar_url: data.user.user_metadata?.avatar_url || ''
        });
      }
      return { error: null };
    } catch (error: any) {
      console.error('Login error:', error);
      return { error };
    }
  };

  const register = async (email: string, password: string, fullName: string) => {
    try {
      const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${fullName}`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            avatar_url: avatarUrl
          }
        }
      });
      if (error) throw error;

      // In live mode, RLS triggers profile insertion. In mock, we insert it.
      if (data?.user) {
        // Double check profile exists (for mock or trigger delay)
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (!existingProfile) {
          await supabase.from('profiles').insert({
            id: data.user.id,
            email: email,
            full_name: fullName,
            avatar_url: avatarUrl
          });
        }
        
        // Auto-login user
        if (data.session) {
          setSession(data.session);
          setUser({
            id: data.user.id,
            email,
            full_name: fullName,
            avatar_url: avatarUrl
          });
        }
      }
      return { error: null };
    } catch (error: any) {
      console.error('Registration error:', error);
      return { error };
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
      return { error: null };
    } catch (error: any) {
      console.error('Logout error:', error);
      return { error };
    }
  };

  const updateProfile = async (fullName: string, avatarUrl: string) => {
    try {
      if (!user) throw new Error('Not authenticated');
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName, avatar_url: avatarUrl })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Sync auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: fullName, avatar_url: avatarUrl }
      });
      
      if (authError) {
        console.warn('Auth user metadata sync failed, but profile was updated:', authError);
      }

      setUser((prev) => prev ? { ...prev, full_name: fullName, avatar_url: avatarUrl } : null);
      return { error: null };
    } catch (error: any) {
      console.error('Profile update error:', error);
      return { error };
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
