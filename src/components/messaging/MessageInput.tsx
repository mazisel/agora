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
    <div className="p-4 bg-slate-800 border-t border-slate-700">
      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        {/* Message Input Container */}
        <div className="flex-1 relative">
          <div className={`bg-slate-700 rounded-lg border transition-colors ${
            isFocused ? 'border-blue-500' : 'border-slate-600'
          }`}>
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={`${activeChannel?.type === 'direct' ? activeChannel.name : `#${activeChannel?.name || 'kanal'}`} kanalına mesaj yazın...`}
              className="w-full px-4 py-3 bg-transparent text-white placeholder-slate-400 focus:outline-none resize-none overflow-hidden min-h-[48px] max-h-[120px]"
              disabled={isLoading}
              rows={1}
              style={{ height: 'auto' }}
            />
          </div>
          
          {/* Keyboard hint */}
          {!hasMessage && (
            <div className="mt-1 text-xs text-slate-500">
              Enter: gönder • Shift+Enter: yeni satır
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Attachment Button */}
          <button
            type="button"
            className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
            title="Dosya ekle"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!hasMessage || isLoading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              hasMessage && !isLoading
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-slate-600 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Gönder</span>
          </button>
        </div>
      </form>
      
      {/* Typing indicator */}
      <div className="mt-2 text-xs text-slate-500 min-h-[16px]">
        {/* Typing indicators will be shown here */}
      </div>
    </div>
  );
}
