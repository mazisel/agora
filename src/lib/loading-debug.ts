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
      // Debug logs removed for production
    }
  },

  end: (key: string) => {
    if (typeof window !== 'undefined' && loadingStates[key]) {
      delete loadingStates[key];
    }
  },

  error: (key: string, error: any) => {
    if (typeof window !== 'undefined' && loadingStates[key]) {
      // Only log actual errors, not debug info
      console.error(`Loading failed:`, error);
      delete loadingStates[key];
    }
  },

  timeout: (key: string, timeoutMs: number = 15000) => {
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        if (loadingStates[key]) {
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
    loadingStates = {};
  }
};

// Development ortamında global olarak erişilebilir yap
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).debugLoading = debugLoading;
}
