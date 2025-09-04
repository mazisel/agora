'use client';

import { useState, useRef, useEffect } from 'react';
import { useMessaging } from '@/contexts/MessagingContext';
import { Send, Paperclip, Smile, X, Upload } from 'lucide-react';
import EmojiPicker from './EmojiPicker';
import { FileUploadProgress } from '@/types/messaging';
import { supabase } from '@/lib/supabase';

export default function MessageInput() {
  const { state, sendMessage } = useMessaging();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [textareaHeight, setTextareaHeight] = useState(44);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, FileUploadProgress>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    
    if (!state.activeChannelId || (!message.trim() && selectedFiles.length === 0) || isLoading) {
      return;
    }

    setIsLoading(true);
    
    try {
      // Mesaj türünü belirle
      let messageType: 'text' | 'file' | 'image' = 'text';
      if (selectedFiles.length > 0) {
        // Eğer sadece resim dosyaları varsa 'image', yoksa 'file'
        const hasOnlyImages = selectedFiles.every(file => file.type.startsWith('image/'));
        messageType = hasOnlyImages ? 'image' : 'file';
      }

      // Mesajı gönder
      const result = await sendMessage({
        channel_id: state.activeChannelId,
        content: message.trim(),
        message_type: messageType,
        attachments: selectedFiles
      });

      if (result) {
        // Sadece dosya olmayan mesajlar için hemen scroll yap
        if (selectedFiles.length === 0) {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('scrollToBottom'));
          }, 100);
        }

        // Dosyalar varsa paralel olarak yükle (mesaj gönderildikten sonra)
        if (selectedFiles.length > 0) {
          // Dosyaları arka planda paralel yükle ve tamamlandığında mesajı güncelle
          Promise.all(
            selectedFiles.map(file => uploadFile(file, result.id))
          ).then(() => {
            // Tüm dosyalar yüklendikten sonra mesajı yeniden çek
            setTimeout(async () => {
              try {
                const { data: updatedMessage } = await supabase
                  .from('messages')
                  .select(`
                    *,
                    attachments:message_attachments(*),
                    reactions:message_reactions(*)
                  `)
                  .eq('id', result.id)
                  .single();

                if (updatedMessage) {
                  // User profile bilgilerini ayrı çek
                  const { data: userProfile } = await supabase
                    .from('user_profiles')
                    .select('user_id, first_name, last_name, profile_photo_url')
                    .eq('user_id', updatedMessage.user_id)
                    .single();

                  const messageWithProfile = {
                    ...updatedMessage,
                    user_profile: userProfile
                  };

                  // MessagingContext'e mesaj güncelleme gönder
                  window.dispatchEvent(new CustomEvent('messageUpdated', {
                    detail: messageWithProfile
                  }));

                  // Dosya güncellendikten sonra scroll yap
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('scrollToBottom'));
                  }, 300);
                }
              } catch (error) {
                console.error('Error fetching updated message:', error);
              }
            }, 1000); // 1 saniye bekle
          }).catch(uploadError => {
            console.error('File upload error:', uploadError);
            // Dosya yükleme hatası olsa bile mesaj gönderildi
          });
        }

        // Formu hemen temizle (kullanıcı deneyimi için)
        setMessage('');
        setSelectedFiles([]);
        setUploadProgress({});
        
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

  // Dosya seçme
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Dosya değişikliği
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
    }
    // Input'u temizle
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Dosya kaldırma
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Dosya yükleme
  const uploadFile = async (file: File, messageId: string) => {
    const fileKey = `${file.name}-${file.size}`;
    
    setUploadProgress(prev => ({
      ...prev,
      [fileKey]: { file, progress: 0, status: 'uploading' }
    }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('messageId', messageId);

      // Supabase session'dan auth token'ı al
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const headers: HeadersInit = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch('/api/messages/upload-file', {
        method: 'POST',
        headers,
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Dosya yüklenemedi');
      }

      const result = await response.json();
      
      setUploadProgress(prev => ({
        ...prev,
        [fileKey]: { 
          file, 
          progress: 100, 
          status: 'completed',
          url: result.attachment.file_url
        }
      }));

      return result.attachment;
    } catch (error) {
      console.error('File upload error:', error);
      setUploadProgress(prev => ({
        ...prev,
        [fileKey]: { 
          file, 
          progress: 0, 
          status: 'error',
          error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        }
      }));
      throw error;
    }
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
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.type.includes('pdf')) return '📄';
    if (file.type.includes('word')) return '📝';
    if (file.type.includes('excel') || file.type.includes('spreadsheet')) return '📊';
    if (file.type.includes('zip') || file.type.includes('rar')) return '📦';
    return '📎';
  };

  if (!state.activeChannelId) {
    return null;
  }

  const activeChannel = state.channels.find(c => c.id === state.activeChannelId);
  const hasMessage = message.trim().length > 0;
  const hasContent = hasMessage || selectedFiles.length > 0;

  return (
    <div className="bg-slate-800 border-t border-slate-700 px-4 py-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.txt"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div className="mb-3 space-y-2">
          {selectedFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between bg-slate-700 rounded-lg p-3 border border-slate-600"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getFileIcon(file)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                title="Dosyayı kaldır"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit}>
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
              onClick={handleFileSelect}
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

            {/* Send Button - integrated inside input */}
            <button
              type="submit"
              disabled={!hasContent || isLoading}
              className={`flex-shrink-0 p-2 rounded-full transition-all ml-1 ${
                hasContent && !isLoading
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                  : 'bg-slate-600 text-slate-400 cursor-not-allowed'
              }`}
              title="Mesaj gönder"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
