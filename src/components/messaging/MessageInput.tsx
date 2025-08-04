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
    <div className="bg-white border-t border-gray-200 px-4 py-2">
      <div className="flex items-end space-x-2">
        {/* Attachment Button */}
        <button
          type="button"
          className="flex-shrink-0 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Input Container */}
        <div className="flex-1 relative">
          <div className="flex items-end bg-gray-50 rounded-2xl border border-gray-200 px-3 py-1">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Mesaj yazın..."
              className="flex-1 bg-transparent text-gray-900 placeholder-gray-500 resize-none border-0 outline-none py-2 px-1 text-sm leading-5 max-h-24"
              disabled={isLoading}
              rows={1}
              style={{ height: '20px' }}
            />
            
            {/* Emoji Button */}
            <button
              type="button"
              className="flex-shrink-0 p-1 text-gray-500 hover:text-gray-700 transition-colors"
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
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            hasMessage && !isLoading
              ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-md'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
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
