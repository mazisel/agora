'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import PermissionGuard from '@/components/auth/PermissionGuard';
import { Users, Building2, DollarSign, Calendar, Building, Mail, UserCheck, Headphones, ArrowLeft, Home, Puzzle } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, loading } = useAuth();
  const { canAccess } = usePermissions();
  const router = useRouter();
  const pathname = usePathname();
  const [hasModules, setHasModules] = useState(false);

  // Check if user has assigned modules
  useEffect(() => {
    const checkModules = async () => {
      if (!userProfile?.id) return;

      try {
        const response = await fetch(`/api/modules/user?userId=${user?.id}`);
        const data = await response.json();

        if (data.success) {
          setHasModules((data.modules?.length || 0) > 0);
        }
      } catch (error) {
        console.error('Error checking modules:', error);
      }
    };

    checkModules();
  }, [userProfile?.id, user?.id]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Redirect module managers to modules page if they're on admin root
  useEffect(() => {
    if (!loading && user && userProfile && hasModules && !canAccess.manager()) {
      if (pathname === '/admin') {
        router.push('/admin/modules');
      }
    }
  }, [loading, user, userProfile, hasModules, canAccess, pathname, router]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  const tabs = [
    {
      id: 'users',
      label: 'Kullanıcılar',
      icon: Users,
      href: '/admin',
      active: pathname === '/admin'
    },
    {
      id: 'departments',
      label: 'Departmanlar',
      icon: Building2,
      href: '/admin/departments',
      active: pathname === '/admin/departments'
    },
    {
      id: 'finance',
      label: 'Finans',
      icon: DollarSign,
      href: '/admin/finance',
      active: pathname === '/admin/finance'
    },
    {
      id: 'events',
      label: 'Etkinlikler',
      icon: Calendar,
      href: '/admin/events',
      active: pathname === '/admin/events'
    },
    {
      id: 'companies',
      label: 'Müşteri Firmalar',
      icon: Building,
      href: '/admin/companies',
      active: pathname === '/admin/companies'
    },
    {
      id: 'notifications',
      label: 'Bildirimler',
      icon: Mail,
      href: '/admin/notifications',
      active: pathname === '/admin/notifications'
    },
    {
      id: 'profile-requests',
      label: 'Profil Talepleri',
      icon: UserCheck,
      href: '/admin/profile-requests',
      active: pathname === '/admin/profile-requests'
    },
    {
      id: 'support',
      label: 'Destek',
      icon: Headphones,
      href: '/admin/support',
      active: pathname === '/admin/support'
    },
    {
      id: 'modules',
      label: 'Modüller',
      icon: Puzzle,
      href: '/admin/modules',
      active: pathname === '/admin/modules'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Admin erişim kontrolü - manager veya modül sorumlusu olmalı */}
      {!canAccess.manager() && !hasModules ? (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center w-full">
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
              Mevcut yetki seviyeniz: <span className="text-blue-400 font-medium">{userProfile?.authority_level || 'employee'}</span>
            </p>
            <button 
              onClick={() => router.push('/')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Geri Dön
            </button>
          </div>
        </div>
      ) : (
        <>
        {/* Sidebar */}
        <div className="w-64 bg-slate-800/50 border-r border-slate-700/50 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-slate-700/50">
            <h1 className="text-xl font-bold text-white">Admin Panel</h1>
            <p className="text-slate-400 text-sm mt-1">Sistem Yönetimi</p>
          </div>

          {/* Dashboard Dön Butonu */}
          <div className="p-4 border-b border-slate-700/50">
            <a
              href="/"
              className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all text-slate-400 hover:text-white hover:bg-slate-700/50 border border-slate-600/30 hover:border-slate-500/50"
            >
              <ArrowLeft className="w-5 h-5" />
              Dashboard'a Dön
            </a>
          </div>

          {/* Sidebar Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              
              // Modül sekmesi için özel kontrol
              if (tab.id === 'modules') {
                // Sadece admin yetkisi olanlar veya modül sorumluları görebilir
                if (!canAccess.manager() && !hasModules) {
                  return null;
                }
              } else {
                // Diğer sekmeler için sadece manager ve üstü yetkiler
                if (!canAccess.manager()) {
                  return null;
                }
              }
              
              return (
                <a
                  key={tab.id}
                  href={tab.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                    tab.active
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </a>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Main Header */}
          <div className="p-6 border-b border-slate-700/50 bg-slate-800/30">
            <h2 className="text-2xl font-bold text-white">
              {tabs.find(tab => tab.active)?.label || 'Admin Panel'}
            </h2>
            <p className="text-slate-400 mt-1">Sistem yönetimi ve konfigürasyon</p>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-auto">
            {children}
          </div>
        </div>
        </>
      )}
    </div>
  );
}
