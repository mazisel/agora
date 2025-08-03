'use client';

import { useState } from 'react';
import { useMessaging } from '@/contexts/MessagingContext';
import { X, Hash, Lock, Users, AlertCircle } from 'lucide-react';

interface CreateChannelModalProps {
  onClose: () => void;
}

export default function CreateChannelModal({ onClose }: CreateChannelModalProps) {
  const { createChannel } = useMessaging();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'public' as 'public' | 'private'
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Kanal adı gereklidir');
      return;
    }

    if (formData.name.length < 2) {
      setError('Kanal adı en az 2 karakter olmalıdır');
      return;
    }

    if (formData.name.length > 50) {
      setError('Kanal adı en fazla 50 karakter olabilir');
      return;
    }

    // Kanal adını temizle (özel karakterleri kaldır, küçük harfe çevir)
    const cleanName = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9\-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (cleanName.length < 2) {
      setError('Kanal adı geçerli karakterler içermelidir (a-z, 0-9, -, _)');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const channel = await createChannel({
        name: cleanName,
        description: formData.description.trim() || undefined,
        type: formData.type
      });

      if (channel) {
        onClose();
      } else {
        setError('Kanal oluşturulurken bir hata oluştu');
      }
    } catch (error) {
      console.error('Error creating channel:', error);
      setError('Kanal oluşturulurken bir hata oluştu');
    } finally {
      setIsCreating(false);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, name: value }));
    setError('');
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'public':
        return <Hash className="w-5 h-5" />;
      case 'private':
        return <Lock className="w-5 h-5" />;
      default:
        return <Hash className="w-5 h-5" />;
    }
  };

  const getPreviewName = () => {
    if (!formData.name.trim()) return 'kanal-adi';
    
    return formData.name
      .toLowerCase()
      .replace(/[^a-z0-9\-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'kanal-adi';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Yeni Kanal Oluştur</h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Channel Type */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Kanal Türü
            </label>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, type: 'public' }))}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  formData.type === 'public'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-600 hover:border-slate-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Hash className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-white mb-1">Herkese Açık</h3>
                    <p className="text-sm text-slate-400">
                      Herkes bu kanalı görebilir ve katılabilir
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, type: 'private' }))}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  formData.type === 'private'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-600 hover:border-slate-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-white mb-1">Özel</h3>
                    <p className="text-sm text-slate-400">
                      Sadece davet edilen kişiler katılabilir
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Channel Name */}
          <div>
            <label htmlFor="channelName" className="block text-sm font-medium text-slate-300 mb-2">
              Kanal Adı
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                {getChannelIcon(formData.type)}
              </div>
              <input
                id="channelName"
                type="text"
                value={formData.name}
                onChange={handleNameChange}
                placeholder="örnek-kanal"
                className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                maxLength={50}
                required
              />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Önizleme: <span className="text-slate-300 font-mono">#{getPreviewName()}</span>
              </p>
              <p className="text-xs text-slate-500">
                {formData.name.length}/50
              </p>
            </div>
          </div>

          {/* Channel Description */}
          <div>
            <label htmlFor="channelDescription" className="block text-sm font-medium text-slate-300 mb-2">
              Açıklama <span className="text-slate-500">(isteğe bağlı)</span>
            </label>
            <textarea
              id="channelDescription"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Bu kanal ne hakkında?"
              className="w-full p-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none"
              rows={3}
              maxLength={200}
            />
            <p className="mt-1 text-xs text-slate-500 text-right">
              {formData.description.length}/200
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              disabled={isCreating}
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={!formData.name.trim() || isCreating}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Oluşturuluyor...
                </>
              ) : (
                'Kanal Oluştur'
              )}
            </button>
          </div>
        </form>

        {/* Info */}
        <div className="px-6 pb-6">
          <div className="bg-slate-700/30 rounded-lg p-4">
            <h4 className="text-sm font-medium text-slate-300 mb-2">Bilgi</h4>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• Kanal adları küçük harflerle yazılır</li>
              <li>• Özel karakterler tire (-) ile değiştirilir</li>
              <li>• Kanal oluşturduktan sonra adını değiştirebilirsiniz</li>
              <li>• Özel kanallar sadece davet ile erişilebilir</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
