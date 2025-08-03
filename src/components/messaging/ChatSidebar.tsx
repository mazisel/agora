'use client';

import { useState } from 'react';
import { useMessaging } from '@/contexts/MessagingContext';
import { Hash, Lock, Users, Circle, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function ChatSidebar() {
  const { state, setActiveChannel } = useMessaging();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredChannels = state.channels.filter(channel =>
    channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (channel.description && channel.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'public':
        return <Hash className="w-4 h-4" />;
      case 'private':
        return <Lock className="w-4 h-4" />;
      case 'direct':
        return <Users className="w-4 h-4" />;
      default:
        return <Hash className="w-4 h-4" />;
    }
  };

  const getUnreadCount = (channelId: string) => {
    // Aktif kanalda badge gösterme
    if (state.activeChannelId === channelId) {
      return 0;
    }
    return state.unreadCounts[channelId] || 0;
  };

  const getLastMessage = (channelId: string) => {
    const messages = state.messages[channelId];
    if (!messages || messages.length === 0) return null;
    
    return messages[messages.length - 1];
  };

  const getLastActivity = (channelId: string) => {
    const lastMessage = getLastMessage(channelId);
    if (!lastMessage) return null;
    
    return formatDistanceToNow(new Date(lastMessage.created_at), { 
      addSuffix: true, 
      locale: tr 
    });
  };

  const getLastMessagePreview = (channelId: string) => {
    const lastMessage = getLastMessage(channelId);
    if (!lastMessage) return 'Henüz mesaj yok';
    
    if (lastMessage.is_deleted) return 'Bu mesaj silindi';
    
    const senderName = lastMessage.user_profile?.first_name || 'Kullanıcı';
    const content = lastMessage.content || 'Dosya gönderildi';
    
    // Mesajı kısalt
    const truncatedContent = content.length > 30 ? content.substring(0, 30) + '...' : content;
    
    return `${senderName}: ${truncatedContent}`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Arama */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Kanalları ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
          />
        </div>
      </div>

      {/* Kanallar Listesi */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {state.isLoading ? (
          <div className="p-4">
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center gap-3 p-3">
                    <div className="w-4 h-4 bg-slate-600 rounded"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-slate-600 rounded w-3/4 mb-1"></div>
                      <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredChannels.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-slate-400 text-sm">
              {searchTerm ? 'Kanal bulunamadı' : 'Henüz kanal yok'}
            </p>
          </div>
        ) : (
          <div className="p-2">
            {filteredChannels.map((channel) => {
              const isActive = state.activeChannelId === channel.id;
              const unreadCount = getUnreadCount(channel.id);
              const lastActivity = getLastActivity(channel.id);

              return (
                <button
                  key={channel.id}
                  onClick={() => setActiveChannel(channel.id)}
                  className={`w-full text-left p-3 rounded-lg transition-all duration-200 group ${
                    isActive
                      ? 'bg-blue-500/20 border border-blue-500/30 text-blue-300'
                      : 'hover:bg-slate-700/50 text-slate-300 border border-transparent hover:border-slate-600/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`${
                      isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-300'
                    }`}>
                      {getChannelIcon(channel.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`font-medium text-sm truncate ${
                          isActive ? 'text-blue-300' : 'text-white'
                        }`}>
                          {channel.name}
                        </h3>
                        {unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold min-w-[20px] text-center">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        {/* Son mesaj önizlemesi */}
                        <p className={`text-xs truncate ${
                          isActive ? 'text-blue-400/70' : 'text-slate-400'
                        }`}>
                          {getLastMessagePreview(channel.id)}
                        </p>
                        
                        {/* Zaman damgası */}
                        {lastActivity && (
                          <span className={`text-xs ${
                            isActive ? 'text-blue-400/70' : 'text-slate-500'
                          }`}>
                            {lastActivity}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Online indicator for direct messages */}
                  {channel.type === 'direct' && (
                    <div className="absolute top-2 right-2">
                      <Circle className="w-2 h-2 fill-green-400 text-green-400" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Alt Bilgi */}
      <div className="p-4 border-t border-slate-700/50">
        <div className="text-xs text-slate-500 text-center">
          {filteredChannels.length} kanal
        </div>
      </div>
    </div>
  );
}
