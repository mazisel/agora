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
  MessageSquare, 
  Ticket,
  Settings,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Building2
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
    id: 'projects',
    label: 'Projeler',
    icon: FolderOpen,
    active: false,
    href: '/projects'
  },
  {
    id: 'messages',
    label: 'Mesajlar',
    icon: MessageSquare,
    active: false,
    href: '/messages',
    badge: 3
  },
  {
    id: 'tasks',
    label: 'Görevler',
    icon: Ticket,
    active: false,
    href: '/tasks',
    badge: 5
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
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const pathname = usePathname();
  const { signOut, user, userProfile } = useAuth();
  const { canAccess } = usePermissions();

  // Load badge counts
  useEffect(() => {
    if (!user) return;

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

        // Get unread messages count (messages user hasn't read yet)
        const { data: memberChannels } = await supabase
          .from('channel_members')
          .select('channel_id')
          .eq('user_id', user.id);

        if (memberChannels && memberChannels.length > 0) {
          const memberChannelIds = memberChannels.map(m => m.channel_id);
          
          // Get all messages from user's channels (except own messages)
          const { data: allMessages } = await supabase
            .from('messages')
            .select('id')
            .in('channel_id', memberChannelIds)
            .neq('sender_id', user.id);

          if (allMessages && allMessages.length > 0) {
            const messageIds = allMessages.map(m => m.id);
            
            // Get messages that user has already read
            const { data: readMessages } = await supabase
              .from('message_reads')
              .select('message_id')
              .eq('user_id', user.id)
              .in('message_id', messageIds);

            const readMessageIds = readMessages?.map(r => r.message_id) || [];
            const unreadCount = messageIds.filter(id => !readMessageIds.includes(id)).length;
            setUnreadMessageCount(unreadCount);
          } else {
            setUnreadMessageCount(0);
          }
        } else {
          setUnreadMessageCount(0);
        }
      } catch (error) {
        console.error('Error loading badge counts:', error);
      }
    };

    loadCounts();

    // Subscribe to real-time updates
    const tasksSubscription = supabase
      .channel('tasks-count')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `assigned_to=eq.${user.id}`
      }, () => {
        loadCounts();
      })
      .subscribe();

    // Subscribe to new messages (for incrementing unread count)
    const messagesSubscription = supabase
      .channel('sidebar-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, async (payload) => {
        const newMessage = payload.new as any;
        
        // Check if this message is in a channel the user is a member of
        const { data: memberChannels } = await supabase
          .from('channel_members')
          .select('channel_id')
          .eq('user_id', user.id);

        const memberChannelIds = memberChannels?.map(m => m.channel_id) || [];
        
        // If message is in user's channel and not from user, increment unread count
        if (memberChannelIds.includes(newMessage.channel_id) && newMessage.sender_id !== user.id) {
          setUnreadMessageCount(prev => prev + 1);
        }
      })
      .subscribe();

    // Subscribe to message reads (for decrementing unread count)
    const messageReadsSubscription = supabase
      .channel('sidebar-message-reads')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'message_reads',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        // Decrement unread count when user reads a message
        setUnreadMessageCount(prev => Math.max(0, prev - 1));
      })
      .subscribe();

    // Subscribe to bulk message reads (when user switches channels)
    const bulkReadsSubscription = supabase
      .channel('sidebar-bulk-reads')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'message_reads',
        filter: `user_id=eq.${user.id}`
      }, async () => {
        // Recalculate total unread count when bulk reads happen
        loadCounts();
      })
      .subscribe();

    return () => {
      tasksSubscription.unsubscribe();
      messagesSubscription.unsubscribe();
      messageReadsSubscription.unsubscribe();
      bulkReadsSubscription.unsubscribe();
    };
  }, [user]);

  const handleLogout = async () => {
    await signOut();
  };

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
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
          <div className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center shadow-lg">
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
                    parent.innerHTML = `
                      <div class="w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        ${userProfile?.first_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    `;
                  }
                }}
              />
            ) : (
              <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
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
                className={`group flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl transition-all duration-200 relative ${
                  itemIsActive
                    ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-300 border border-blue-500/30 shadow-lg shadow-blue-500/10'
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white border border-transparent hover:border-slate-600/50'
                }`}
              >
                <div className={`p-2 rounded-lg ${
                  itemIsActive 
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
                    {item.id === 'messages' && unreadMessageCount > 0 && (
                      <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold min-w-[20px] text-center">
                        {unreadMessageCount}
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
                    {item.badge && (
                      <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                        {item.badge}
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
                className={`group flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl transition-all duration-200 relative ${
                  itemIsActive
                    ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-300 border border-blue-500/30 shadow-lg shadow-blue-500/10'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white border border-transparent hover:border-slate-600/50'
                }`}
              >
                <div className={`p-2 rounded-lg ${
                  itemIsActive 
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
            <p className="text-xs text-slate-500 mb-1">Ekip Yönetim Sistemi</p>
            <p className="text-xs text-slate-600">v1.0.0</p>
          </div>
        </div>
      )}
    </div>
  );
}
