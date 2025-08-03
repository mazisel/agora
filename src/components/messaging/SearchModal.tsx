'use client';

import { useState, useEffect, useRef } from 'react';
import { useMessaging } from '@/contexts/MessagingContext';
import { Search, X, Hash, Lock, Users, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface SearchModalProps {
  onClose: () => void;
}

export default function SearchModal({ onClose }: SearchModalProps) {
  const { state, searchMessages, clearSearch, setActiveChannel } = useMessaging();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus search input when modal opens
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }

    // Clear search when modal closes
    return () => {
      clearSearch();
    };
  }, [clearSearch]);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (query.trim()) {
        setIsSearching(true);
        searchMessages(query.trim()).finally(() => {
          setIsSearching(false);
        });
      } else {
        clearSearch();
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [query, searchMessages, clearSearch]);

  const handleResultClick = (channelId: string, messageId: string) => {
    setActiveChannel(channelId);
    onClose();
    
    // Scroll to message (you could implement this with refs or DOM manipulation)
    setTimeout(() => {
      const messageElement = document.getElementById(`message-${messageId}`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        messageElement.classList.add('highlight-message');
        setTimeout(() => {
          messageElement.classList.remove('highlight-message');
        }, 2000);
      }
    }, 100);
  };

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

  const highlightText = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text;
    
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-400/30 text-yellow-300 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  const getUserDisplayName = (user: any) => {
    if (user?.first_name) {
      return `${user.first_name} ${user.last_name || ''}`.trim();
    }
    return user?.email?.split('@')[0] || 'Bilinmeyen Kullanıcı';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[70vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Mesajlarda ara..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {!query.trim() ? (
            <div className="p-8 text-center">
              <Search className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-300 mb-2">Mesajlarda Ara</h3>
              <p className="text-slate-500">
                Tüm kanallarınızdaki mesajları arayabilirsiniz.
              </p>
              <div className="mt-4 text-sm text-slate-400">
                <p>İpuçları:</p>
                <ul className="mt-2 space-y-1 text-left max-w-sm mx-auto">
                  <li>• Kelime veya cümle arayın</li>
                  <li>• Büyük/küçük harf duyarlı değil</li>
                  <li>• En son 100 sonuç gösterilir</li>
                </ul>
              </div>
            </div>
          ) : isSearching ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Aranıyor...</p>
            </div>
          ) : state.searchResults.length === 0 ? (
            <div className="p-8 text-center">
              <Search className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-300 mb-2">Sonuç bulunamadı</h3>
              <p className="text-slate-500">
                "<span className="text-white">{query}</span>" için hiçbir mesaj bulunamadı.
              </p>
              <p className="text-sm text-slate-400 mt-2">
                Farklı kelimeler deneyebilir veya yazım hatası olup olmadığını kontrol edebilirsiniz.
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              <div className="text-sm text-slate-400 mb-4">
                {state.searchResults.length} sonuç bulundu
              </div>
              
              {state.searchResults.map((result) => (
                <button
                  key={result.message.id}
                  onClick={() => handleResultClick(result.channel.id, result.message.id)}
                  className="w-full text-left p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg border border-slate-600/30 hover:border-slate-500/50 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    {/* Channel Info */}
                    <div className="flex items-center gap-2 text-slate-400 text-sm min-w-0 flex-shrink-0">
                      {getChannelIcon(result.channel.type)}
                      <span className="truncate">{result.channel.name}</span>
                    </div>

                    {/* Message Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white text-sm">
                          {getUserDisplayName(result.message.user)}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDistanceToNow(new Date(result.message.created_at), { 
                            addSuffix: true, 
                            locale: tr 
                          })}
                        </span>
                      </div>
                      
                      <div className="text-sm text-slate-300 leading-relaxed">
                        {highlightText(result.highlight, query)}
                      </div>

                      {/* Message Type Indicator */}
                      {result.message.message_type !== 'text' && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-slate-600/50 text-slate-300">
                            {result.message.message_type === 'file' && 'Dosya'}
                            {result.message.message_type === 'image' && 'Resim'}
                            {result.message.message_type === 'video' && 'Video'}
                            {result.message.message_type === 'audio' && 'Ses'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700/50 text-center">
          <p className="text-xs text-slate-500">
            Enter tuşuna basarak arama yapın • ESC ile çıkın
          </p>
        </div>
      </div>
    </div>
  );
}
