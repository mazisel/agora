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
    <div className="px-4 py-3 bg-slate-800 border-t border-slate-700/50">
      <div className="flex items-center gap-3">
        {/* Attachment Button */}
        <button
          type="button"
          className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-all duration-200"
          title="Dosya ekle"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Message Input */}
        <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={`${activeChannel?.type === 'direct' ? activeChannel.name : `#${activeChannel?.name || 'kanal'}`} kanalına mesaj yazın...`}
              className={`w-full px-4 py-3 bg-slate-700/50 border rounded-full text-white placeholder-slate-400 focus:outline-none resize-none overflow-hidden min-h-[44px] max-h-[120px] transition-all duration-200 ${
                isFocused ? 'border-blue-500 bg-slate-700' : 'border-slate-600/50'
              }`}
              disabled={isLoading}
              rows={1}
              style={{ height: 'auto' }}
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!hasMessage || isLoading}
            className={`p-2.5 rounded-full transition-all duration-200 ${
              hasMessage && !isLoading
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                : 'bg-slate-600/50 text-slate-400 cursor-not-allowed'
            }`}
            title="Mesaj gönder"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>

        {/* Emoji Button */}
        <button
          type="button"
          className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-all duration-200"
          title="Emoji ekle"
        >
          <Smile className="w-5 h-5" />
        </button>
      </div>
      
      {/* Keyboard hint */}
      {!hasMessage && (
        <div className="mt-2 text-xs text-slate-500 text-center">
          Enter: gönder • Shift+Enter: yeni satır
        </div>
      )}
    </div>
  );
}
