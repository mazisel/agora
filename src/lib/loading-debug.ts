'use client';

/**
 * Loading durumlarını debug etmek için utility fonksiyonlar
 */

let loadingStates: { [key: string]: { start: number; message: string } } = {};

export const debugLoading = {
  start: (key: string, message: string = 'Loading...') => {
    if (typeof window !== 'undefined') {
      loadingStates[key] = {
        start: Date.now(),
        message
      };
      console.log(`🔄 [${key}] Loading started: ${message}`);
    }
  },

  end: (key: string) => {
    if (typeof window !== 'undefined' && loadingStates[key]) {
      const duration = Date.now() - loadingStates[key].start;
      console.log(`✅ [${key}] Loading completed in ${duration}ms`);
      delete loadingStates[key];
    }
  },

  error: (key: string, error: any) => {
    if (typeof window !== 'undefined' && loadingStates[key]) {
      const duration = Date.now() - loadingStates[key].start;
      console.error(`❌ [${key}] Loading failed after ${duration}ms:`, error);
      delete loadingStates[key];
    }
  },

  timeout: (key: string, timeoutMs: number = 15000) => {
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        if (loadingStates[key]) {
          const duration = Date.now() - loadingStates[key].start;
          console.warn(`⏰ [${key}] Loading timeout after ${duration}ms - auto-clearing`);
          delete loadingStates[key];
        }
      }, timeoutMs);
    }
  },

  getActiveStates: () => {
    return Object.keys(loadingStates).map(key => ({
      key,
      duration: Date.now() - loadingStates[key].start,
      message: loadingStates[key].message
    }));
  },

  clearAll: () => {
    const activeStates = Object.keys(loadingStates);
    if (activeStates.length > 0) {
      console.warn(`🧹 Clearing ${activeStates.length} active loading states:`, activeStates);
      loadingStates = {};
    }
  }
};

// Development ortamında global olarak erişilebilir yap
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).debugLoading = debugLoading;
}
