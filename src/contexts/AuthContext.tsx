'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
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

  // Fetch user profile from Supabase
  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('🔍 Fetching user profile for ID:', userId);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Error fetching user profile:', error.message, 'Code:', error.code);
        
        // Infinite recursion hatası kontrolü
        if (error.code === '42P17') {
          console.error('🔄 CRITICAL: Infinite recursion in RLS policies detected!');
          return;
        }
        
        // RLS erişim hatası
        if (error.code === 'PGRST301') {
          console.error('🔒 RLS Policy blocked access - user may not be authenticated properly');
          return;
        }
        
        // Varsayılan profil oluştur
        console.log('📝 Creating fallback profile...');
        const defaultProfile: UserProfile = {
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
        setUserProfile(defaultProfile);
        return;
      }

      console.log('✅ User profile loaded successfully:', data.first_name, data.last_name, data.personnel_number);
      setUserProfile(data);
    } catch (error) {
      console.error('💥 Unexpected error fetching user profile:', error);
      // Fallback profil
      const defaultProfile: UserProfile = {
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
      setUserProfile(defaultProfile);
    }
  };

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      }
      
      setLoading(false);
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setUserProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
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
