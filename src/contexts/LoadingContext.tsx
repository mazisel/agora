'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  loadingMessage: string;
  setLoading: (loading: boolean, message?: string) => void;
  clearLoading: () => void;
  withLoading: <T>(promise: Promise<T>, message?: string) => Promise<T>;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null);

  const setLoading = useCallback((loading: boolean, message: string = '') => {
    // Clear any existing timeout
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
      setLoadingTimeout(null);
    }

    if (loading) {
      setIsLoading(true);
      setLoadingMessage(message);
      
      // Auto-clear loading after 30 seconds to prevent infinite loading
      const timeout = setTimeout(() => {
        console.warn('Loading state auto-cleared after 30 seconds');
        setIsLoading(false);
        setLoadingMessage('');
        setLoadingTimeout(null);
      }, 30000);
      
      setLoadingTimeout(timeout);
    } else {
      setIsLoading(false);
      setLoadingMessage('');
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        setLoadingTimeout(null);
      }
    }
  }, [loadingTimeout]);

  const clearLoading = useCallback(() => {
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
      setLoadingTimeout(null);
    }
    setIsLoading(false);
    setLoadingMessage('');
  }, [loadingTimeout]);

  const withLoading = useCallback(async <T,>(
    promise: Promise<T>, 
    message: string = 'Yükleniyor...'
  ): Promise<T> => {
    try {
      setLoading(true, message);
      const result = await promise;
      return result;
    } catch (error) {
      throw error;
    } finally {
      // Always clear loading, even if there's an error
      setLoading(false);
    }
  }, [setLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    };
  }, [loadingTimeout]);

  // Auto-clear loading on page visibility change (when user switches tabs) - disabled to prevent flickering
  // useEffect(() => {
  //   const handleVisibilityChange = () => {
  //     if (document.visibilityState === 'visible' && isLoading) {
  //       // Clear loading when user returns to tab
  //       setTimeout(() => {
  //         if (isLoading) {
  //           console.warn('Loading state cleared due to visibility change');
  //           clearLoading();
  //         }
  //       }, 1000);
  //     }
  //   };

  //   document.addEventListener('visibilitychange', handleVisibilityChange);
  //   return () => {
  //     document.removeEventListener('visibilitychange', handleVisibilityChange);
  //   };
  // }, [isLoading, clearLoading]);

  const value = {
    isLoading,
    loadingMessage,
    setLoading,
    clearLoading,
    withLoading,
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {/* Global Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-8 max-w-sm w-full mx-4">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
              <h3 className="text-lg font-semibold text-white mb-2">Yükleniyor</h3>
              <p className="text-slate-400 text-center text-sm">
                {loadingMessage || 'İşlem gerçekleştiriliyor...'}
              </p>
              <button
                onClick={clearLoading}
                className="mt-4 px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                İptal Et
              </button>
            </div>
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}
