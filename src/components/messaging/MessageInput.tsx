'use client';

import { useState, useRef, useEffect } from 'react';
import { useMessaging } from '@/contexts/MessagingContext';
import { Send, Paperclip, Smile } from 'lucide-react';

export default function MessageInput() {
  const { state, sendMessage } = useMessaging();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = '20px';
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 100;
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
        if (textareaRef.current) {
          textareaRef.current.style.height = '20px';
          textareaRef.current.focus();
        }
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

  if (!state.activeChannelId) {
    return null;
  }

  const activeChannel = state.channels.find(c => c.id === state.activeChannelId);
  const hasMessage = message.trim().length > 0;

  return (
    <div className="bg-slate-800 border-t border-slate-700 px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Attachment Button */}
        <button
          type="button"
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Input Container */}
        <div className="flex-1">
          <div className="flex items-center bg-slate-700 rounded-lg border border-slate-600 px-4 py-2">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={`${activeChannel?.type === 'direct' ? activeChannel.name : `#${activeChannel?.name || 'kanal'}`} kanalına mesaj yazın...`}
              className="flex-1 bg-transparent text-white placeholder-slate-400 resize-none border-0 outline-none text-sm leading-5 max-h-24 py-1"
              disabled={isLoading}
              rows={1}
              style={{ height: '20px' }}
            />
            
            {/* Emoji Button */}
            <button
              type="button"
              className="flex-shrink-0 ml-2 p-1 text-slate-400 hover:text-slate-300 transition-colors"
            >
              <Smile className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Send Button */}
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={!hasMessage || isLoading}
          className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
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
        </button>
      </div>
    </div>
  );
}
