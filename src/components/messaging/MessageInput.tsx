'use client';

import { useState, useRef, useEffect } from 'react';
import { useMessaging } from '@/contexts/MessagingContext';
import { Send, Paperclip, Smile } from 'lucide-react';
import EmojiPicker from './EmojiPicker';

export default function MessageInput() {
  const { state, sendMessage } = useMessaging();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [textareaHeight, setTextareaHeight] = useState(44);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = '20px';
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 100;
      const newHeight = Math.min(scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
      setTextareaHeight(newHeight + 16); // Add padding for container
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

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    // Trigger height adjustment after emoji is added
    setTimeout(() => {
      adjustTextareaHeight();
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 0);
  };

  const toggleEmojiPicker = () => {
    setIsEmojiPickerOpen(!isEmojiPickerOpen);
  };

  if (!state.activeChannelId) {
    return null;
  }

  const activeChannel = state.channels.find(c => c.id === state.activeChannelId);
  const hasMessage = message.trim().length > 0;

  return (
    <div className="bg-slate-800 border-t border-slate-700 px-4 py-3">
      <div className="flex items-stretch gap-3">
        {/* Input Container */}
        <div className="flex-1">
          <div 
            className="flex items-end bg-slate-700 rounded-lg border border-slate-600 px-4 py-2"
            style={{ minHeight: `${textareaHeight}px` }}
          >
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
            
            {/* Action Buttons Container */}
            <div className="flex items-center gap-1 ml-2">
              {/* File Picker Button */}
              <button
                type="button"
                className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-300 transition-colors"
                title="Dosya ekle"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              {/* Emoji Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={toggleEmojiPicker}
                  className={`flex-shrink-0 p-1 transition-colors ${
                    isEmojiPickerOpen 
                      ? 'text-blue-400' 
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                  title="Emoji ekle"
                >
                  <Smile className="w-5 h-5" />
                </button>
                
                {/* Emoji Picker */}
                <EmojiPicker
                  isOpen={isEmojiPickerOpen}
                  onEmojiSelect={handleEmojiSelect}
                  onClose={() => setIsEmojiPickerOpen(false)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Send Button - matches input container height exactly */}
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={!hasMessage || isLoading}
          className={`flex-shrink-0 px-4 rounded-lg flex items-center justify-center transition-all ${
            hasMessage && !isLoading
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-slate-600 text-slate-400 cursor-not-allowed'
          }`}
          style={{ height: `${textareaHeight}px` }}
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
