'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import PermissionGuard from '@/components/auth/PermissionGuard';
import { Users, Building2, DollarSign, Calendar, Building, Mail, UserCheck } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

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
    }
  ];

  return (
    <PermissionGuard requireDashboardAccess={true}>
      <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Admin Panel</h1>
          <p className="text-slate-400">Sistem yönetimi ve konfigürasyon</p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-slate-700/50">
            <nav className="flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <a
                    key={tab.id}
                    href={tab.href}
                    className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      tab.active
                        ? 'border-blue-500 text-blue-400'
                        : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </a>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div>{children}</div>
      </div>
      </div>
    </PermissionGuard>
  );
}
