'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMessaging } from '@/contexts/MessagingContext';
import { MessageSquare, Hash, Lock, Users, Search, Plus, Settings, Phone, Video } from 'lucide-react';
import ChatSidebar from '@/components/messaging/ChatSidebar';
import ChatWindow from '@/components/messaging/ChatWindow';
import CreateChannelModal from '@/components/messaging/CreateChannelModal';
import MembersModal from '@/components/messaging/MembersModal';

export default function MessagesPage() {
  const { user } = useAuth();
  const { state, setActiveChannel } = useMessaging();
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  // İlk kanal seçimi
  useEffect(() => {
    if (state.channels.length > 0 && !state.activeChannelId) {
      setActiveChannel(state.channels[0].id);
    }
  }, [state.channels, state.activeChannelId, setActiveChannel]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-300 mb-2">Giriş Yapın</h2>
          <p className="text-slate-500">Mesajlaşma özelliğini kullanmak için giriş yapmanız gerekiyor.</p>
        </div>
      </div>
    );
  }

  const activeChannel = state.channels.find(c => c.id === state.activeChannelId);

  return (
    <div className="flex h-full bg-slate-900">
      {/* Sol Sidebar - Kanallar */}
      <div className="w-80 bg-slate-800/50 border-r border-slate-700/50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-blue-400" />
              Mesajlar
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateChannel(true)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                title="Kanal Oluştur"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Kanallar Listesi */}
        <ChatSidebar />
      </div>

      {/* Ana Chat Alanı */}
      <div className="flex-1 flex flex-col">
        {activeChannel ? (
          <>
            {/* Chat Header */}
            <div className="h-16 bg-slate-800/30 border-b border-slate-700/50 flex items-center justify-between px-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {activeChannel.type === 'public' ? (
                    <Hash className="w-5 h-5 text-slate-400" />
                  ) : activeChannel.type === 'private' ? (
                    <Lock className="w-5 h-5 text-slate-400" />
                  ) : (
                    <Users className="w-5 h-5 text-slate-400" />
                  )}
                  <h2 className="text-lg font-semibold text-white">
                    {activeChannel.name}
                  </h2>
                </div>
                {activeChannel.description && (
                  <span className="text-sm text-slate-400 border-l border-slate-600 pl-3">
                    {activeChannel.description}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowMembers(true)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                  title="Üyeler"
                >
                  <Users className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Window */}
            <ChatWindow />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-300 mb-2">Bir kanal seçin</h2>
              <p className="text-slate-500">Mesajlaşmaya başlamak için sol taraftan bir kanal seçin.</p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateChannel && (
        <CreateChannelModal onClose={() => setShowCreateChannel(false)} />
      )}

      {showMembers && activeChannel && (
        <MembersModal 
          channelId={activeChannel.id}
          channelName={activeChannel.name}
          onClose={() => setShowMembers(false)} 
        />
      )}
    </div>
  );
}
