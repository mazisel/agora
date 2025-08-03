'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import NProgress from 'nprogress';

// NProgress konfigürasyonu
NProgress.configure({
  minimum: 0.1,
  easing: 'ease',
  speed: 500,
  showSpinner: false,
  trickleSpeed: 200,
});

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Sayfa değişikliğinde progress bar'ı tamamla
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Kısa bir gecikme ile progress bar'ı tamamla
    timeoutRef.current = setTimeout(() => {
      NProgress.done();
    }, 100);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [pathname, searchParams]);

  useEffect(() => {
    // Link tıklamalarını dinle
    const handleAnchorClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const anchor = target.closest('a');
      
      if (anchor && anchor.href) {
        try {
          const url = new URL(anchor.href);
          const currentUrl = new URL(window.location.href);
          
          // Aynı origin'de ve farklı path'te ise progress bar'ı başlat
          if (
            url.origin === currentUrl.origin &&
            url.pathname !== currentUrl.pathname &&
            !anchor.target &&
            !anchor.getAttribute('download') &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.shiftKey &&
            event.button === 0
          ) {
            // Minimum 200ms gecikme ile başlat
            setTimeout(() => {
              NProgress.start();
            }, 50);
          }
        } catch (error) {
          // URL parse hatası durumunda hiçbir şey yapma
        }
      }
    };

    // Form submit'lerini dinle
    const handleFormSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement;
      if (form && form.method.toLowerCase() === 'get') {
        setTimeout(() => {
          NProgress.start();
        }, 50);
      }
    };

    // Browser back/forward butonlarını dinle
    const handlePopState = () => {
      setTimeout(() => {
        NProgress.start();
      }, 50);
    };

    document.addEventListener('click', handleAnchorClick);
    document.addEventListener('submit', handleFormSubmit);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('click', handleAnchorClick);
      document.removeEventListener('submit', handleFormSubmit);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return <>{children}</>;
}
