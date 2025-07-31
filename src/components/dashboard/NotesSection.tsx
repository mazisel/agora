'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Search, StickyNote } from 'lucide-react';
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

const noteColors = [
  'from-blue-400 to-blue-600',
  'from-green-400 to-green-600',
  'from-purple-400 to-purple-600',
  'from-orange-400 to-orange-600',
  'from-pink-400 to-pink-600'
];

export default function NotesSection() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    color: noteColors[0]
  });

  // Fetch notes from Supabase
  const fetchNotes = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setNotes([]);
        return;
      }

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const createNote = async () => {
    if (!newNote.title.trim() || !newNote.content.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notes')
        .insert([{
          title: newNote.title.trim(),
          content: newNote.content.trim(),
          color: newNote.color,
          pinned: false,
          user_id: user.id
        }]);

      if (error) throw error;

      await fetchNotes();
      setNewNote({ title: '', content: '', color: noteColors[0] });
      setIsCreating(false);
    } catch (error) {
      console.error('Error creating note:', error);
      alert('Not oluşturulurken hata oluştu.');
    }
  };

  const deleteNote = async (id: string) => {
    if (!confirm('Bu notu silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Not silinirken hata oluştu.');
    }
  };

  const togglePin = async (id: string) => {
    try {
      const note = notes.find(n => n.id === id);
      if (!note) return;

      const { error } = await supabase
        .from('notes')
        .update({ 
          pinned: !note.pinned,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      await fetchNotes();
    } catch (error) {
      console.error('Error toggling pin:', error);
      alert('Not sabitleme durumu değiştirilirken hata oluştu.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}.${month}`;
  };

  return (
    <div className="h-full flex flex-col bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-bold text-white">Notlarım</h3>
          <p className="text-xs text-slate-400 mt-1">{notes.length} not</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSearching(!isSearching)}
            className={`p-2 rounded-lg transition-all duration-200 ${
              isSearching 
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm"
          >
            <Plus className="w-3 h-3" />
            <span>Yeni</span>
          </button>
        </div>
      </div>

      {/* Search Bar - Collapsible */}
      {isSearching && (
        <div className="mb-4 p-3 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-400" />
            <input
              type="text"
              placeholder="Notlarda ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-xs"
              autoFocus
            />
          </div>
          {searchTerm && (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {filteredNotes.length} sonuç bulundu
              </span>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setIsSearching(false);
                }}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                Temizle
              </button>
            </div>
          )}
        </div>
      )}


      {/* Create Note Form */}
      {isCreating && (
        <div className="mb-4 p-3 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50">
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Not başlığı..."
              value={newNote.title}
              onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 text-xs"
            />
            <textarea
              placeholder="Not içeriği..."
              value={newNote.content}
              onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
              className="w-full px-3 py-2 h-20 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm"
            />
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex gap-2">
                {noteColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewNote({ ...newNote, color })}
                    className={`w-6 h-6 rounded-full bg-gradient-to-r ${color} transition-transform duration-150 ${
                      newNote.color === color ? 'ring-2 ring-white scale-110' : 'hover:scale-110'
                    }`}
                  />
                ))}
              </div>
              <div className="flex gap-2 self-end sm:self-auto">
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-all text-sm"
                >
                  İptal
                </button>
                <button
                  onClick={createNote}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all text-sm"
                >
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes List */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600/30 scrollbar-track-transparent hover:scrollbar-thumb-slate-500/50 pr-1">
          <div className="space-y-2">
            {isLoading ? (
              // Loading Skeleton
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="p-3 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-slate-700 animate-pulse"></div>
                      <div>
                        <div className="w-20 h-3 bg-slate-700 rounded animate-pulse mb-1"></div>
                        <div className="w-12 h-2 bg-slate-700/70 rounded animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="w-full h-2 bg-slate-700/50 rounded animate-pulse"></div>
                    <div className="w-3/4 h-2 bg-slate-700/30 rounded animate-pulse"></div>
                  </div>
                </div>
              ))
            ) : (
              filteredNotes.map((note) => (
                <div
                key={note.id}
                className="group p-3 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${note.color}`}></div>
                    <div>
                      <h4 className="font-semibold text-white text-xs group-hover:text-blue-300 transition-colors">
                        {note.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400">{formatDate(note.created_at)}</span>
                        {note.pinned && (
                          <StickyNote className="w-2.5 h-2.5 text-yellow-400" />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => togglePin(note.id)}
                      className="p-1 rounded hover:bg-slate-700 transition-colors"
                    >
                      <StickyNote className={`w-3 h-3 ${note.pinned ? 'text-yellow-400' : 'text-slate-400 hover:text-yellow-400'}`} />
                    </button>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="p-1 rounded hover:bg-slate-700 transition-colors"
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                  {note.content}
                </p>
              </div>
              ))
            )}

            {/* Empty State */}
            {!isLoading && filteredNotes.length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <StickyNote className="w-6 h-6 text-slate-600" />
                </div>
                <h4 className="text-sm font-semibold text-white mb-2">
                  {searchTerm ? 'Not Bulunamadı' : 'Henüz Not Yok'}
                </h4>
                <p className="text-xs text-slate-400">
                  {searchTerm ? 'Arama kriterlerinize uygun not bulunamadı' : 'Notlarınız burada görünecek'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
