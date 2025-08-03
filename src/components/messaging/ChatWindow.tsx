'use client';

import { useRef, useEffect } from 'react';
import { useMessaging } from '@/contexts/MessagingContext';
import { useAuth } from '@/contexts/AuthContext';
import { Send, Hash } from 'lucide-react';
import MessageItem from './MessageItem';
import MessageInput from './MessageInput';

export default function ChatWindow() {
  const { state, markAsRead } = useMessaging();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeChannel = state.channels.find(c => c.id === state.activeChannelId);
  const messages = state.activeChannelId ? state.messages[state.activeChannelId] || [] : [];

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Mark messages as read when channel changes
  useEffect(() => {
    if (state.activeChannelId) {
      markAsRead({ channel_id: state.activeChannelId });
    }
  }, [state.activeChannelId, markAsRead]);

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

  return (
    <div className="flex-1 flex flex-col bg-slate-800">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mb-4">
              <Hash className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-300 mb-2">
              #{activeChannel.name} kanalına hoş geldiniz!
            </h3>
            <p className="text-slate-500">Bu kanalın başlangıcı. İlk mesajı gönderin!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                isOwn={message.user_id === user?.id}
              />
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <MessageInput />
    </div>
  );
}
