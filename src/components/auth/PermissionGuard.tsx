'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { AuthorityLevel } from '@/types/permissions';

interface PermissionGuardProps {
  children: ReactNode;
  requiredLevel?: AuthorityLevel;
  requireDashboardAccess?: boolean;
  fallback?: ReactNode;
  redirectTo?: string;
}

export default function PermissionGuard({
  children,
  requiredLevel,
  requireDashboardAccess = false,
  fallback,
  redirectTo
}: PermissionGuardProps) {
  const { checkPermission, canAccess, userProfile } = usePermissions();
  const router = useRouter();

  // Kullanıcı profili yüklenene kadar bekle
  if (!userProfile) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Yetki kontrol ediliyor...</p>
        </div>
      </div>
    );
  }

  // Dashboard erişim kontrolü
  if (requireDashboardAccess && !canAccess.dashboard()) {
    if (redirectTo) {
      router.push(redirectTo);
      return null;
    }
    
    return fallback || (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Erişim Yetkisi Yok</h2>
          <p className="text-slate-400 mb-4">
            Dashboard'a erişim için yönetici, direktör veya admin yetkisine sahip olmanız gerekiyor.
          </p>
          <p className="text-sm text-slate-500">
            Mevcut yetki seviyeniz: <span className="text-blue-400 font-medium">{userProfile.authority_level}</span>
          </p>
          <button 
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Geri Dön
          </button>
        </div>
      </div>
    );
  }

  // Belirli yetki seviyesi kontrolü
  if (requiredLevel && !checkPermission(requiredLevel)) {
    if (redirectTo) {
      router.push(redirectTo);
      return null;
    }
    
    return fallback || (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Yetkisiz Erişim</h2>
          <p className="text-slate-400 mb-4">
            Bu sayfaya erişim için <span className="text-blue-400 font-medium">{requiredLevel}</span> yetkisine sahip olmanız gerekiyor.
          </p>
          <p className="text-sm text-slate-500">
            Mevcut yetki seviyeniz: <span className="text-blue-400 font-medium">{userProfile.authority_level}</span>
          </p>
          <button 
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Geri Dön
          </button>
        </div>
      </div>
    );
  }

  // Yetki kontrolü geçti, içeriği göster
  return <>{children}</>;
}
