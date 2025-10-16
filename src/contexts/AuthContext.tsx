'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { handleAuthError, clearAuthSession } from '@/lib/auth-utils';
import { debugLoading } from '@/lib/loading-debug';
import { UserProfile } from '@/types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Create fallback profile immediately
  const createFallbackProfile = (userId: string): UserProfile => {
    return {
      id: userId,
      personnel_number: 'P0000',
      first_name: 'Kullanıcı',
      last_name: '',
      status: 'active',
      work_type: 'full_time',
      is_leader: false,
      authority_level: 'employee',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  };

  // Simplified profile fetch with immediate fallback
  const fetchUserProfile = async (userId: string) => {
    const debugKey = `profile-${userId}`;
    debugLoading.start(debugKey, 'Fetching user profile');
    
    // Set fallback profile immediately to prevent loading hang
    const fallbackProfile = createFallbackProfile(userId);
    setUserProfile(fallbackProfile);
    
    try {
      // Much shorter timeout - 3 seconds
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .abortSignal(controller.signal)
        .single();

      clearTimeout(timeoutId);

      if (error) {
        debugLoading.error(debugKey, error);
        // Keep fallback profile
        return;
      }

      if (data) {
        setUserProfile(data);
        debugLoading.end(debugKey);
      }
    } catch (error: any) {
      debugLoading.error(debugKey, error);
      // Keep fallback profile
    }
  };

  useEffect(() => {
    let mounted = true;
    let initTimeout: NodeJS.Timeout;

    const updateLastLogin = async (userId: string) => {
      try {
        await supabase
          .from('user_profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', userId);
      } catch (error) {
        console.error('Failed to update last login:', error);
      }
    };
    
    // Get initial session with timeout
    const getSession = async () => {
      try {
        // Set a maximum 5 second timeout for initial auth check
        initTimeout = setTimeout(() => {
          if (mounted) {
            setLoading(false);
          }
        }, 5000);

        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (initTimeout) {
          clearTimeout(initTimeout);
        }
        
        if (!mounted) return;
        
        if (error) {
          console.error('❌ Session error:', error);
          setSession(null);
          setUser(null);
          setUserProfile(null);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          updateLastLogin(session.user.id);
          // Don't await - let it run in background
          fetchUserProfile(session.user.id);
        } else {
          setUserProfile(null);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('💥 Unexpected error getting session:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
          setUserProfile(null);
          setLoading(false);
        }
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        // Handle sign out
        if (event === 'SIGNED_OUT' || !session) {
          setSession(null);
          setUser(null);
          setUserProfile(null);
          return;
        }
        
        // Handle sign in or token refresh
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            updateLastLogin(session.user.id);
            // Don't await - let it run in background
            fetchUserProfile(session.user.id);
          }
        }
      }
    );

    return () => {
      mounted = false;
      if (initTimeout) {
        clearTimeout(initTimeout);
      }
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await clearAuthSession();
  };

  const value = {
    user,
    userProfile,
    session,
    loading,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
