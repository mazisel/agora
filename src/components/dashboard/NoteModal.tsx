'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Trash2, StickyNote, Calendar, Edit3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  created_at: string;
  updated_at: string;
  pinned: boolean;
  user_id: string;
}

interface NoteModalProps {
  note: Note | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onDelete: (id: string) => void;
}

const noteColors = [
  'from-blue-400 to-blue-600',
  'from-green-400 to-green-600',
  'from-purple-400 to-purple-600',
  'from-orange-400 to-orange-600',
  'from-pink-400 to-pink-600'
];

export default function NoteModal({ note, isOpen, onClose, onUpdate, onDelete }: NoteModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedNote, setEditedNote] = useState({
    title: '',
    content: '',
    color: noteColors[0]
  });
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (note) {
      setEditedNote({
        title: note.title,
        content: note.content,
        color: note.color
      });
    }
  }, [note]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!mounted || !isOpen || !note) return null;

  const handleSave = async () => {
    if (!editedNote.title.trim() || !editedNote.content.trim()) return;

    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('notes')
        .update({
          title: editedNote.title.trim(),
          content: editedNote.content.trim(),
          color: editedNote.color,
          updated_at: new Date().toISOString()
        })
        .eq('id', note.id);

      if (error) throw error;

      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating note:', error);
      alert('Not güncellenirken hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Bu notu silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', note.id);

      if (error) throw error;

      onDelete(note.id);
      onClose();
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Not silinirken hata oluştu.');
    }
  };

  const togglePin = async () => {
    try {
      const { error } = await supabase
        .from('notes')
        .update({ 
          pinned: !note.pinned,
          updated_at: new Date().toISOString()
        })
        .eq('id', note.id);

      if (error) throw error;
      onUpdate();
    } catch (error) {
      console.error('Error toggling pin:', error);
      alert('Not sabitleme durumu değiştirilirken hata oluştu.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCancel = () => {
    setEditedNote({
      title: note.title,
      content: note.content,
      color: note.color
    });
    setIsEditing(false);
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700/50 w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${note.color}`}></div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {isEditing ? 'Notu Düzenle' : note.title}
              </h2>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Calendar className="w-3 h-3" />
                  <span>Oluşturulma: {formatDate(note.created_at)}</span>
                </div>
                {note.updated_at !== note.created_at && (
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Edit3 className="w-3 h-3" />
                    <span>Güncelleme: {formatDate(note.updated_at)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                <button
                  onClick={togglePin}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    note.pinned 
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' 
                      : 'text-slate-400 hover:text-yellow-400 hover:bg-slate-700/50'
                  }`}
                  title={note.pinned ? 'Sabitlemeyi kaldır' : 'Sabitle'}
                >
                  <StickyNote className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700/50 rounded-lg transition-all duration-200"
                  title="Düzenle"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition-all duration-200"
                  title="Sil"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={isEditing ? handleCancel : onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200"
              title={isEditing ? 'İptal' : 'Kapat'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {isEditing ? (
            <div className="space-y-4">
              {/* Title Input */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Başlık
                </label>
                <input
                  type="text"
                  value={editedNote.title}
                  onChange={(e) => setEditedNote({ ...editedNote, title: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  placeholder="Not başlığı..."
                />
              </div>

              {/* Content Textarea */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  İçerik
                </label>
                <textarea
                  value={editedNote.content}
                  onChange={(e) => setEditedNote({ ...editedNote, content: e.target.value })}
                  className="w-full px-4 py-3 h-64 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  placeholder="Not içeriği..."
                />
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Renk
                </label>
                <div className="flex gap-3">
                  {noteColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setEditedNote({ ...editedNote, color })}
                      className={`w-8 h-8 rounded-full bg-gradient-to-r ${color} transition-transform duration-150 ${
                        editedNote.color === color ? 'ring-2 ring-white scale-110' : 'hover:scale-110'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="prose prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-slate-200 leading-relaxed">
                {note.content}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {isEditing && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-700/50">
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-all"
              disabled={isSaving}
            >
              İptal
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !editedNote.title.trim() || !editedNote.content.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Kaydet</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
