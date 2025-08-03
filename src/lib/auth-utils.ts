import { supabase } from './supabase';

/**
 * Kullanıcı oturumunu temizler ve login sayfasına yönlendirir
 */
export const clearAuthSession = async () => {
  try {
    // Supabase oturumunu kapat
    await supabase.auth.signOut();
    
    // Local storage'ı temizle
    if (typeof window !== 'undefined') {
      // Tüm auth-related storage'ları temizle
      const keysToRemove = [
        'supabase.auth.token',
        'sb-riacmnpxjsbrppzfjeur-auth-token',
        'supabase.auth.refresh_token',
        'sb-riacmnpxjsbrppzfjeur-auth-refresh-token'
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      // Supabase storage'ını da temizle
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });
    }
    
    console.log('Auth session cleared successfully');
  } catch (error) {
    console.error('Error clearing auth session:', error);
  }
};

/**
 * Refresh token hatalarını kontrol eder ve gerekirse oturumu temizler
 */
export const handleAuthError = async (error: any) => {
  if (!error) return false;
  
  const errorMessage = error.message || '';
  const isRefreshTokenError = 
    errorMessage.includes('refresh_token_not_found') ||
    errorMessage.includes('Invalid Refresh Token') ||
    errorMessage.includes('JWT expired') ||
    error.status === 401;
  
  if (isRefreshTokenError) {
    console.log('Refresh token error detected, clearing session...');
    await clearAuthSession();
    
    // Login sayfasına yönlendir
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    
    return true;
  }
  
  return false;
};

/**
 * Supabase client'ı yeniden başlatır (gerekirse)
 */
export const reinitializeAuth = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      await handleAuthError(error);
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Error reinitializing auth:', error);
    await clearAuthSession();
    return null;
  }
};
