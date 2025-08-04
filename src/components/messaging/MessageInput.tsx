'use client';

import { useState, useRef, useEffect } from 'react';
import { useMessaging } from '@/contexts/MessagingContext';
import { Send, Paperclip, Smile, Mic } from 'lucide-react';

export default function MessageInput() {
  const { state, sendMessage } = useMessaging();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 120; // Max 5 lines approximately
      textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  };

  // Focus textarea when channel changes
  useEffect(() => {
    if (state.activeChannelId && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [state.activeChannelId]);

  // Adjust height when message changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!state.activeChannelId || !message.trim() || isLoading) {
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await sendMessage({
        channel_id: state.activeChannelId,
        content: message.trim(),
        message_type: 'text'
      });

      if (result) {
        setMessage('');
        // Reset textarea height
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
        // Focus back to textarea after sending
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  if (!state.activeChannelId) {
    return null;
  }

  const activeChannel = state.channels.find(c => c.id === state.activeChannelId);
  const hasMessage = message.trim().length > 0;

  return (
    <div className="px-4 py-3 bg-slate-900/50 backdrop-blur-sm border-t border-slate-700/50">
      <div className={`bg-slate-800 rounded-2xl border transition-all duration-200 ${
        isFocused ? 'border-blue-500/50 shadow-lg shadow-blue-500/10' : 'border-slate-600/50'
      }`}>
        <form onSubmit={handleSubmit} className="flex items-end gap-2 p-3">
          {/* Attachment Button */}
          <button
            type="button"
            className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-700/50 rounded-full transition-all duration-200 flex-shrink-0"
            title="Dosya ekle"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Message Input Container */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={`${activeChannel?.type === 'direct' ? activeChannel.name : `#${activeChannel?.name || 'kanal'}`} kanalına mesaj yazın...`}
              className="w-full px-4 py-3 bg-transparent text-white placeholder-slate-400 focus:outline-none resize-none overflow-hidden min-h-[44px] max-h-[120px] text-sm leading-5"
              disabled={isLoading}
              rows={1}
              style={{ height: 'auto' }}
            />
            
            {/* Placeholder hint */}
            {!hasMessage && !isFocused && (
              <div className="absolute bottom-1 right-3 text-xs text-slate-500 pointer-events-none">
                Enter: gönder • Shift+Enter: yeni satır
              </div>
            )}
          </div>

          {/* Emoji Button */}
          <button
            type="button"
            className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-700/50 rounded-full transition-all duration-200 flex-shrink-0"
            title="Emoji ekle"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Send/Voice Button */}
          {hasMessage ? (
            <button
              type="submit"
              disabled={isLoading}
              className={`p-3 rounded-full transition-all duration-200 flex-shrink-0 ${
                isLoading 
                  ? 'bg-slate-600 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-95 shadow-lg shadow-blue-600/25'
              }`}
              title="Mesaj gönder"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5 text-white" />
              )}
            </button>
          ) : (
            <button
              type="button"
              className="p-3 text-slate-400 hover:text-slate-300 hover:bg-slate-700/50 rounded-full transition-all duration-200 flex-shrink-0"
              title="Sesli mesaj"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </form>
      </div>
      
      {/* Typing indicator */}
      <div className="mt-2 px-2 text-xs text-slate-500 min-h-[16px]">
        {/* Typing indicators will be shown here */}
      </div>
    </div>
  );
}
