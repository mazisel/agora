/**
 * Authentication Debug Utilities
 * Bu dosya authentication sorunlarını debug etmek ve çözmek için kullanılır
 */

import { supabase } from './supabase';

/**
 * Tüm auth storage'ını temizler ve debug bilgisi verir
 */
export const debugAndClearAuthStorage = () => {
  if (typeof window === 'undefined') return;

  console.log('🔍 Auth Debug: Checking storage...');

  // Mevcut storage'ı logla
  const authKeys = Object.keys(localStorage).filter(key =>
    key.includes('supabase') || key.includes('auth') || key.startsWith('sb-')
  );

  console.log('📦 Found auth-related storage keys:', authKeys);

  authKeys.forEach(key => {
    const value = localStorage.getItem(key);
    console.log(`🔑 ${key}:`, value ? 'Has value' : 'Empty');
  });

  // Tüm auth storage'ını temizle
  authKeys.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });

  console.log('🧹 Cleared all auth storage');
};

/**
 * Supabase session durumunu kontrol eder
 */
export const debugSupabaseSession = async () => {
  try {
    console.log('🔍 Checking Supabase session...');

    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('❌ Session error:', error);
      return { session: null, error };
    }

    if (session) {
      console.log('✅ Active session found:', {
        userId: session.user?.id,
        email: session.user?.email,
        expiresAt: new Date(session.expires_at! * 1000).toLocaleString(),
        tokenType: session.token_type
      });
    } else {
      console.log('ℹ️ No active session');
    }

    return { session, error: null };
  } catch (error) {
    console.error('💥 Unexpected error checking session:', error);
    return { session: null, error };
  }
};

/**
 * Auth durumunu tamamen sıfırlar
 */
export const resetAuthState = async () => {
  console.log('🔄 Resetting auth state...');

  try {
    // Supabase oturumunu kapat
    await supabase.auth.signOut();

    // Storage'ı temizle
    debugAndClearAuthStorage();

    // Sayfayı yenile
    if (typeof window !== 'undefined') {
      console.log('🔄 Reloading page...');
      window.location.reload();
    }
  } catch (error) {
    console.error('❌ Error resetting auth state:', error);
  }
};

/**
 * Auth durumunu konsola yazdırır
 */
export const logAuthState = async () => {
  console.log('📊 === AUTH STATE DEBUG ===');

  // Storage durumu
  debugAndClearAuthStorage();

  // Session durumu
  await debugSupabaseSession();

  // Environment variables
  console.log('🌍 Environment check:', {
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    nodeEnv: process.env.NODE_ENV
  });

  console.log('📊 === END AUTH DEBUG ===');
};

// Global debug fonksiyonları (development modunda)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).authDebug = {
    clearStorage: debugAndClearAuthStorage,
    checkSession: debugSupabaseSession,
    reset: resetAuthState,
    log: logAuthState
  };

  console.log('🛠️ Auth debug tools available: window.authDebug');
}
