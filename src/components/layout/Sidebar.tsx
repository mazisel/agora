'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard,
  FolderOpen,
  Ticket,
  Settings,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Building2,
  UserCircle,

  HelpCircle,
  Grid3X3,
  Puzzle
} from 'lucide-react';

interface SidebarProps {
  collapsed?: boolean;
}

const menuItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    active: true,
    href: '/'
  },
  {
    id: 'quick-menu',
    label: 'Hızlı Menü',
    icon: Grid3X3,
    active: false,
    href: '/quick-menu'
  },

  {
    id: 'projects',
    label: 'Projeler',
    icon: FolderOpen,
    active: false,
    href: '/projects'
  },
  {
    id: 'tasks',
    label: 'Görevler',
    icon: Ticket,
    active: false,
    href: '/tasks',
    badge: 5
  },
  {
    id: 'profile',
    label: 'Profilim',
    icon: UserCircle,
    active: false,
    href: '/profile'
  },
  {
    id: 'support',
    label: 'Destek',
    icon: HelpCircle,
    active: false,
    href: '/support'
  }
];

const bottomItems = [
  {
    id: 'admin',
    label: 'Yönetim',
    icon: User,
    href: '/admin'
  },
  {
    id: 'settings',
    label: 'Ayarlar',
    icon: Settings,
    href: '/settings'
  },
  {
    id: 'logout',
    label: 'Çıkış',
    icon: LogOut,
    href: '/login'
  }
];

export default function Sidebar({ collapsed: initialCollapsed = false }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [taskCount, setTaskCount] = useState(0);
  const [hasModules, setHasModules] = useState(false);
  const pathname = usePathname();
  const { signOut, user, userProfile } = useAuth();
  const { canAccess } = usePermissions();



  // Load badge counts and check modules
  useEffect(() => {
    if (!user?.id || !userProfile?.id) return;

    const loadCounts = async () => {
      try {
        // Get pending tasks count (only todo status)
        const { data: tasks, error: tasksError } = await supabase
          .from('tasks')
          .select('id')
          .eq('assigned_to', user.id)
          .eq('status', 'todo');

        if (!tasksError) {
          setTaskCount(tasks?.length || 0);
        }

        // Check if user has assigned modules
        const response = await fetch(`/api/modules/user?userId=${user?.id}`);
        const data = await response.json();

        if (data.success) {
          setHasModules((data.modules?.length || 0) > 0);
        }
      } catch (error) {
        console.error('Error loading badge counts:', error);
      }
    };

    loadCounts();

    // Polling interval for updates
    const interval = setInterval(() => {
      loadCounts();
    }, 30000); // Update every 30 seconds

    return () => {
      clearInterval(interval);
    };
  }, [user?.id, userProfile?.id]);

  const handleLogout = async () => {
    await signOut();
  };

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }

    // Özel durum: /modules path'i için
    if (href === '/modules') {
      // Sadece tam olarak /modules veya /modules/ ise aktif
      return pathname === '/modules' || pathname === '/modules/';
    }

    // Özel durum: /quick-menu path'i için
    if (href === '/quick-menu') {
      // /quick-menu ile başlayan veya /modules/[moduleId] pattern'i ile eşleşen path'ler
      return pathname.startsWith('/quick-menu') ||
        (pathname.startsWith('/modules/') && pathname.split('/').length === 3);
    }

    return pathname.startsWith(href);
  };

  return (
    <div className={`${collapsed ? 'w-20' : 'w-64'} bg-slate-900/50 backdrop-blur-sm border-r border-slate-700/50 flex flex-col transition-all duration-300 relative`}>
      {/* Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 w-6 h-6 bg-slate-800 border border-slate-600 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors z-10"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3 text-slate-400" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-slate-400" />
        )}
      </button>

      {/* User Profile */}
      <div className="p-6 border-b border-slate-700/50">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-4'}`}>
          <div className={`${collapsed ? 'w-10 h-10' : 'w-14 h-14'} aspect-square rounded-xl overflow-hidden flex-shrink-0 shadow-lg`}>
            {userProfile?.profile_photo_url &&
              !userProfile.profile_photo_url.startsWith('blob:') &&
              userProfile.profile_photo_url.trim() !== '' ? (
              <img
                src={userProfile.profile_photo_url}
                alt="Profil Fotoğrafı"
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fotoğraf yüklenemezse baş harfleri göster
                  const target = e.currentTarget;
                  const parent = target.parentElement;
                  if (parent) {
                    const size = collapsed ? 'w-10 h-10' : 'w-14 h-14';
                    const fontSize = collapsed ? 'text-sm' : 'text-lg';
                    parent.innerHTML = `
                      <div class="${size} bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold ${fontSize} shadow-lg">
                        ${userProfile?.first_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    `;
                  }
                }}
              />
            ) : (
              <div className={`${collapsed ? 'w-10 h-10 text-sm' : 'w-14 h-14 text-lg'} bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg`}>
                {userProfile?.first_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              {/* Name */}
              <h3 className="font-semibold text-white text-base truncate mb-1">
                {userProfile && userProfile.first_name
                  ? `${userProfile.first_name} ${userProfile.last_name || ''}`.trim()
                  : user?.email?.split('@')[0] || 'Kullanıcı'
                }
              </h3>

              {/* Personnel Number */}
              <p className="text-sm text-slate-400 font-mono truncate mb-0.5">
                {userProfile?.personnel_number || 'P0000'}
              </p>

              {/* Position */}
              <p className="text-sm text-slate-500 truncate">
                {userProfile?.position || 'Çalışan'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const itemIsActive = isActive(item.href);


            return (
              <Link
                key={item.id}
                href={item.href}
                className={`group flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl transition-all duration-200 relative hover:z-50 ${itemIsActive
                  ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-300 border border-blue-500/30 shadow-lg shadow-blue-500/10'
                  : 'text-slate-300 hover:bg-slate-800/50 hover:text-white border border-transparent hover:border-slate-600/50'
                  }`}
              >
                <div className={`p-2 rounded-lg ${itemIsActive
                  ? 'bg-blue-500/20 text-blue-300'
                  : 'text-slate-400 group-hover:text-white group-hover:bg-slate-700/50'
                  } transition-all duration-200`}>
                  <Icon className="w-4 h-4" />
                </div>

                {!collapsed && (
                  <>
                    <span className="font-medium text-sm flex-1">{item.label}</span>
                    {/* Dynamic badges */}
                    {item.id === 'tasks' && taskCount > 0 && (
                      <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold min-w-[20px] text-center">
                        {taskCount}
                      </span>
                    )}

                  </>
                )}

                {/* Active Indicator */}
                {itemIsActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full"></div>
                )}

                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {item.label}
                    {item.id === 'tasks' && taskCount > 0 && (
                      <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                        {taskCount}
                      </span>
                    )}

                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-slate-700/50">
        <div className="space-y-2">
          {bottomItems.map((item) => {
            const Icon = item.icon;

            // Yönetim menüsünü manager ve üstü yetkiler veya modül sorumluları için göster
            if (item.id === 'admin' && !canAccess.manager() && !hasModules) {
              return null;
            }

            if (item.id === 'logout') {
              return (
                <button
                  key={item.id}
                  onClick={handleLogout}
                  className={`group flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl transition-all duration-200 text-slate-400 hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/30 w-full`}
                >
                  <div className="p-2 rounded-lg text-slate-400 group-hover:bg-red-500/10 group-hover:text-red-400 transition-all duration-200">
                    <Icon className="w-4 h-4" />
                  </div>

                  {!collapsed && (
                    <span className="font-medium text-sm">{item.label}</span>
                  )}

                  {/* Tooltip for collapsed state */}
                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                      {item.label}
                    </div>
                  )}
                </button>
              );
            }

            const itemIsActive = isActive(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`group flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl transition-all duration-200 relative ${itemIsActive
                  ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-300 border border-blue-500/30 shadow-lg shadow-blue-500/10'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white border border-transparent hover:border-slate-600/50'
                  }`}
              >
                <div className={`p-2 rounded-lg ${itemIsActive
                  ? 'bg-blue-500/20 text-blue-300'
                  : 'text-slate-400 group-hover:bg-slate-700/50 group-hover:text-white'
                  } transition-all duration-200`}>
                  <Icon className="w-4 h-4" />
                </div>

                {!collapsed && (
                  <span className="font-medium text-sm">{item.label}</span>
                )}

                {/* Active Indicator */}
                {itemIsActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full"></div>
                )}

                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-slate-700/50">
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-1">e4 Labs</p>
            <p className="text-xs text-slate-600">v1.0.1</p>
          </div>
        </div>
      )}
    </div>
  );
}
