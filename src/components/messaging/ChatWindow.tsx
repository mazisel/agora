'use client';

import { useRef, useEffect, useState } from 'react';
import { useMessaging } from '@/contexts/MessagingContext';
import { useAuth } from '@/contexts/AuthContext';
import { Hash, Users, Lock, Globe, Loader2 } from 'lucide-react';
import MessageItem from './MessageItem';
import MessageInput from './MessageInput';
import { MessageSkeletonList } from './MessageSkeleton';

export default function ChatWindow() {
  const { state, markAsRead, loadMessages, loadOlderMessages } = useMessaging();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isScrollingToBottom, setIsScrollingToBottom] = useState(false);

  const activeChannel = state.channels.find(c => c.id === state.activeChannelId);
  const messages = state.activeChannelId ? state.messages[state.activeChannelId] || [] : [];
  const isLoadingOlderMessages = state.activeChannelId ? state.messagesLoading[state.activeChannelId] || false : false;
  const hasMoreMessages = state.activeChannelId ? state.hasMoreMessages[state.activeChannelId] || false : false;

  // Load messages when channel changes
  useEffect(() => {
    if (state.activeChannelId && activeChannel) {
      setIsInitialLoad(true);
      setShouldScrollToBottom(true);
      
      loadMessages(state.activeChannelId).finally(() => {
        setIsInitialLoad(false);
      });
    }
  }, [state.activeChannelId, activeChannel, loadMessages]);

  // Scroll to bottom after messages are loaded
  useEffect(() => {
    if (!isInitialLoad && messages.length > 0 && messagesEndRef.current) {
      // İlk yükleme sonrası scroll'u en alta götür
      setIsScrollingToBottom(true);
      
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
          
          // Scroll animasyonu bitince skeleton'u kapat
          setTimeout(() => {
            setIsScrollingToBottom(false);
          }, 300);
        }
      }, 100);
    }
  }, [isInitialLoad, messages.length]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (!isInitialLoad && messages.length > 0) {
      const container = messagesContainerRef.current;
      if (container) {
        const { scrollTop, scrollHeight, clientHeight } = container;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
        
        if (isNearBottom) {
          setTimeout(() => {
            if (messagesEndRef.current) {
              messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }
          }, 50);
        }
      }
    }
  }, [messages.length, isInitialLoad]);

  // Check if user is near bottom to decide auto-scroll and load older messages
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      const isNearTop = scrollTop < 100;
      
      setShouldScrollToBottom(isNearBottom);
      
      // Load older messages when scrolling near top
      if (isNearTop && hasMoreMessages && !isLoadingOlderMessages && !isInitialLoad && state.activeChannelId) {
        loadOlderMessages(state.activeChannelId);
      }
    }
  };

  // Mark messages as read when channel changes
  useEffect(() => {
    if (state.activeChannelId) {
      markAsRead({ channel_id: state.activeChannelId });
    }
  }, [state.activeChannelId, markAsRead]);

  // Scroll to bottom when new message is added and user is near bottom
  useEffect(() => {
    if (messages.length > 0) {
      const container = messagesContainerRef.current;
      if (container) {
        const { scrollTop, scrollHeight, clientHeight } = container;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        if (isNearBottom) {
          setShouldScrollToBottom(true);
        }
      }
    }
  }, [messages.length]);

  if (!activeChannel) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-800">
        <div className="text-center">
          <Hash className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-300 mb-2">Kanal seçin</h3>
          <p className="text-slate-500">Mesajlaşmaya başlamak için sol taraftan bir kanal seçin.</p>
        </div>
      </div>
    );
  }

  const getChannelIcon = () => {
    switch (activeChannel.type) {
      case 'private':
        return <Lock className="w-4 h-4" />;
      case 'direct':
        return <Users className="w-4 h-4" />;
      default:
        return <Hash className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-800 min-h-0 overflow-hidden">
      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800 relative"
        style={{
          scrollBehavior: 'auto',
          overflowAnchor: 'none',
          scrollbarWidth: 'thin'
        }}
      >
        {isInitialLoad ? (
          <div className="flex flex-col">
            {/* Channel Welcome Message Skeleton */}
            <div className="px-6 py-8 border-b border-slate-700/50">
              <div className="flex items-center gap-4 mb-4 animate-pulse">
                <div className="w-12 h-12 bg-slate-600 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-6 bg-slate-600 rounded w-48 mb-2"></div>
                  <div className="h-4 bg-slate-700 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-slate-700 rounded w-24"></div>
                </div>
              </div>
            </div>

            {/* Messages Skeleton */}
            <div className="flex-1 px-4 py-2">
              <MessageSkeletonList count={8} />
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mb-4">
              {getChannelIcon()}
            </div>
            <h3 className="text-lg font-medium text-slate-300 mb-2">
              {activeChannel.type === 'direct' 
                ? `${activeChannel.name} ile konuşmaya başlayın!`
                : `#${activeChannel.name} kanalına hoş geldiniz!`
              }
            </h3>
            <p className="text-slate-500">
              {activeChannel.type === 'direct' 
                ? 'Bu konuşmanın başlangıcı. İlk mesajı gönderin!'
                : 'Bu kanalın başlangıcı. İlk mesajı gönderin!'
              }
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Channel Welcome Message */}
            <div className="px-6 py-8 border-b border-slate-700/50">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center">
                  {getChannelIcon()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {activeChannel.type === 'direct' 
                      ? activeChannel.name 
                      : `#${activeChannel.name} kanalının başlangıcı`
                    }
                  </h3>
                  {activeChannel.description && (
                    <p className="text-slate-400 mt-1">{activeChannel.description}</p>
                  )}
                  <p className="text-sm text-slate-500 mt-2">
                    {new Date(activeChannel.created_at).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })} tarihinde oluşturuldu
                  </p>
                </div>
              </div>
            </div>

            {/* Loading indicator for older messages */}
            {isLoadingOlderMessages && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin mr-2" />
                <span className="text-sm text-slate-400">Eski mesajlar yükleniyor...</span>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 px-4 py-2">
              <div className="space-y-1">
                {messages.map((message, index) => {
                  const prevMessage = index > 0 ? messages[index - 1] : null;
                  const showAvatar = !prevMessage || 
                    prevMessage.user_id !== message.user_id ||
                    new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() > 300000; // 5 minutes

                  return (
                    <MessageItem
                      key={message.id}
                      message={message}
                      isOwn={message.user_id === user?.id}
                      showAvatar={showAvatar}
                    />
                  );
                })}
              </div>
            </div>
            <div ref={messagesEndRef} className="h-1" />
          </div>
        )}

        {/* Scroll Loading Overlay */}
        {isScrollingToBottom && (
          <div className="absolute inset-0 bg-slate-800/80 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
              <p className="text-slate-300 text-sm">Mesajlara gidiliyor...</p>
            </div>
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="flex-shrink-0">
        <MessageInput />
      </div>
    </div>
  );
}
