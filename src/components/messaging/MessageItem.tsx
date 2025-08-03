'use client';

import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Message } from '@/types/messaging';
import { useAuth } from '@/contexts/AuthContext';

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
}

export default function MessageItem({ message, isOwn }: MessageItemProps) {
  const { user } = useAuth();

  const getUserDisplayName = () => {
    // Tüm mesajlar için user_profile bilgilerini kullan
    if (message.user_profile) {
      const { first_name, last_name } = message.user_profile;
      if (first_name) {
        return `${first_name} ${last_name || ''}`.trim();
      }
    }
    
    // Fallback olarak email'den isim çıkar
    if (isOwn && user) {
      const emailName = user.email?.split('@')[0];
      if (emailName) {
        return emailName
          .replace(/[._]/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
      return 'Sen';
    }
    
    return 'Kullanıcı';
  };

  const getUserAvatar = (name: string) => {
    // Önce profil resmini kontrol et
    if (message.user_profile?.profile_photo_url) {
      return (
        <img 
          src={message.user_profile.profile_photo_url} 
          alt={name}
          className="w-10 h-10 rounded-full object-cover"
          onError={(e) => {
            // Resim yüklenemezse fallback avatar göster
            const target = e.currentTarget;
            const parent = target.parentElement;
            if (parent) {
              const initial = name.charAt(0).toUpperCase();
              const colors = [
                'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
                'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
              ];
              const colorIndex = name.charCodeAt(0) % colors.length;
              parent.innerHTML = `
                <div class="w-10 h-10 ${colors[colorIndex]} rounded-full flex items-center justify-center text-white font-medium text-sm">
                  ${initial}
                </div>
              `;
            }
          }}
        />
      );
    }

    // Profil resmi yoksa renkli avatar
    const initial = name.charAt(0).toUpperCase();
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    const colorIndex = name.charCodeAt(0) % colors.length;
    
    return (
      <div className={`w-10 h-10 ${colors[colorIndex]} rounded-full flex items-center justify-center text-white font-medium text-sm`}>
        {initial}
      </div>
    );
  };

  const formatTime = (date: string) => {
    return format(new Date(date), 'HH:mm');
  };

  const displayName = getUserDisplayName();

  if (message.is_deleted) {
    return (
      <div className="flex items-center gap-3 opacity-50 py-2 px-4">
        <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center">
          <span className="text-xs text-slate-400">×</span>
        </div>
        <p className="text-slate-500 italic text-sm">Bu mesaj silindi</p>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 py-3 px-4 hover:bg-slate-700/20 ${isOwn ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        {getUserAvatar(displayName)}
      </div>

      {/* Message Content */}
      <div className={`flex-1 min-w-0 ${isOwn ? 'text-right' : ''}`}>
        {/* Header */}
        <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'justify-end' : ''}`}>
          <span className="font-medium text-white text-sm">
            {displayName}
          </span>
          <span className="text-xs text-slate-400">
            {formatTime(message.created_at)}
          </span>
        </div>

        {/* Message Bubble */}
        {message.content && (
          <div className={`inline-block max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-2xl text-sm leading-relaxed ${
            isOwn 
              ? 'bg-blue-600 text-white ml-auto' 
              : 'bg-slate-700 text-slate-100'
          }`}>
            {message.content}
          </div>
        )}
      </div>
    </div>
  );
}
