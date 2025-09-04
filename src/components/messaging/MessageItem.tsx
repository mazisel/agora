'use client';

import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Message } from '@/types/messaging';
import { useAuth } from '@/contexts/AuthContext';
import { Download, FileText, Image, Video, Music } from 'lucide-react';

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
}

export default function MessageItem({ message, isOwn, showAvatar = true }: MessageItemProps) {
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

  // Dosya boyutunu formatla
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Dosya türü ikonu
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (fileType.startsWith('video/')) return <Video className="w-5 h-5" />;
    if (fileType.startsWith('audio/')) return <Music className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  // Dosya indirme
  const handleDownload = (url: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dosya ekleri render
  const renderAttachments = () => {
    if (!message.attachments || message.attachments.length === 0) return null;

    return (
      <div className={`mt-2 space-y-2 ${isOwn ? 'flex flex-col items-end' : ''}`}>
        {message.attachments.map((attachment) => {
          const isImage = attachment.file_type?.startsWith('image/');
          
          if (isImage) {
            // Resim önizlemesi
            return (
              <div
                key={attachment.id}
                className="relative max-w-xs rounded-lg overflow-hidden bg-slate-700 border border-slate-600"
              >
                <img
                  src={attachment.thumbnail_url || attachment.file_url}
                  alt={attachment.file_name}
                  className="w-full h-auto max-h-64 object-cover cursor-pointer"
                  onClick={() => window.open(attachment.file_url, '_blank')}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs truncate flex-1">
                      {attachment.file_name}
                    </span>
                    <button
                      onClick={() => handleDownload(attachment.file_url, attachment.file_name)}
                      className="ml-2 p-1 hover:bg-white hover:bg-opacity-20 rounded"
                      title="İndir"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          } else {
            // Diğer dosya türleri
            return (
              <div
                key={attachment.id}
                className={`flex items-center gap-3 p-3 rounded-lg border max-w-xs ${
                  isOwn 
                    ? 'bg-blue-700 border-blue-600 text-white' 
                    : 'bg-slate-700 border-slate-600 text-slate-100'
                }`}
              >
                <div className="flex-shrink-0 text-slate-300">
                  {getFileIcon(attachment.file_type || '')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {attachment.file_name}
                  </p>
                  {attachment.file_size && (
                    <p className="text-xs opacity-75">
                      {formatFileSize(attachment.file_size)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDownload(attachment.file_url, attachment.file_name)}
                  className="flex-shrink-0 p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                  title="İndir"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            );
          }
        })}
      </div>
    );
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
    <div className={`flex gap-3 hover:bg-slate-700/10 rounded-lg transition-colors ${
      isOwn ? 'flex-row-reverse' : ''
    } ${showAvatar ? 'py-2 px-2' : 'py-1 px-2'}`}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        {showAvatar ? (
          getUserAvatar(displayName)
        ) : (
          <div className="w-10 h-10 flex items-center justify-center">
            <span className="text-xs text-slate-500">
              {formatTime(message.created_at)}
            </span>
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 min-w-0 ${isOwn ? 'text-right' : ''}`}>
        {/* Header - only show when avatar is shown */}
        {showAvatar && (
          <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'justify-end' : ''}`}>
            <span className="font-medium text-white text-sm">
              {displayName}
            </span>
            <span className="text-xs text-slate-400">
              {formatTime(message.created_at)}
            </span>
          </div>
        )}

        {/* Message Bubble */}
        {message.content && (
          <div className={`inline-block max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl px-3 py-2 rounded-2xl text-sm leading-relaxed break-words whitespace-pre-wrap ${
            isOwn 
              ? 'bg-blue-600 text-white ml-auto' 
              : 'bg-slate-700 text-slate-100'
          }`}>
            {message.content}
          </div>
        )}

        {/* File Attachments */}
        {renderAttachments()}
      </div>
    </div>
  );
}
