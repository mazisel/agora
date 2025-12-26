'use client';

import { formatDateTimeSafe } from '@/lib/dateUtils';
import { useState, useEffect } from 'react';
import { Calendar, Plus, Edit3, Save, X, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface DailyNote {
  id: string;
  date: string;
  content: string;
  mood: 'great' | 'good' | 'okay' | 'bad';
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface WeekInfo {
  startDate: Date;
  endDate: Date;
  weekNumber: number;
  year: number;
}

interface WeekDay {
  name: string;
  date: string;
  short: string;
  fullDate: Date;
}

// Get current week info
function getCurrentWeek(): WeekInfo {
  const now = new Date();
  const startOfWeek = new Date(now);
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday as start of week
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 4); // Friday
  endOfWeek.setHours(23, 59, 59, 999);

  const weekNumber = getWeekNumber(startOfWeek);

  return {
    startDate: startOfWeek,
    endDate: endOfWeek,
    weekNumber,
    year: startOfWeek.getFullYear()
  };
}

// Get week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Generate week days
function generateWeekDays(startDate: Date): WeekDay[] {
  const days = [];
  const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
  const dayShorts = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum'];

  for (let i = 0; i < 5; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);

    days.push({
      name: dayNames[i],
      date: `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}`,
      short: dayShorts[i],
      fullDate: date
    });
  }

  return days;
}

export default function WeeklyActivities() {
  const [notes, setNotes] = useState<DailyNote[]>([]);
  const [currentWeek, setCurrentWeek] = useState<WeekInfo>(getCurrentWeek());
  const [isLoading, setIsLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<{ date: string, dayName: string } | null>(null);
  const [editContent, setEditContent] = useState('');
  const [selectedMood, setSelectedMood] = useState<DailyNote['mood']>('good');
  const [viewingNote, setViewingNote] = useState<DailyNote | null>(null);

  const weekDays = generateWeekDays(currentWeek.startDate);
  const today = new Date();
  const isCurrentWeek = currentWeek.startDate <= today && today <= currentWeek.endDate;

  // Fetch notes for current week
  const fetchNotes = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setNotes([]);
        return;
      }

      const startDateStr = currentWeek.startDate.toISOString().split('T')[0];
      const endDateStr = currentWeek.endDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('daily_notes')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .order('date', { ascending: true });

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
  }, [currentWeek]);

  const getNoteForDate = (date: string) => {
    return notes.find(note => note.date === date);
  };

  const getMoodColor = (mood: DailyNote['mood']) => {
    switch (mood) {
      case 'great':
        return 'from-green-400 to-emerald-500';
      case 'good':
        return 'from-blue-400 to-blue-500';
      case 'okay':
        return 'from-yellow-400 to-orange-500';
      case 'bad':
        return 'from-red-400 to-red-500';
      default:
        return 'from-slate-400 to-slate-500';
    }
  };

  const getMoodEmoji = (mood: DailyNote['mood']) => {
    switch (mood) {
      case 'great':
        return '😊';
      case 'good':
        return '🙂';
      case 'okay':
        return '😐';
      case 'bad':
        return '😔';
      default:
        return '🙂';
    }
  };

  const startEditing = (date: string, dayName: string) => {
    const existingNote = getNoteForDate(date);
    setEditingNote({ date, dayName });
    setEditContent(existingNote?.content || '');
    setSelectedMood(existingNote?.mood || 'good');
  };

  const saveNote = async () => {
    if (!editContent.trim() || !editingNote) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const existingNote = getNoteForDate(editingNote.date);

      if (existingNote) {
        // Update existing note
        const { error } = await supabase
          .from('daily_notes')
          .update({
            content: editContent.trim(),
            mood: selectedMood,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingNote.id);

        if (error) throw error;
      } else {
        // Create new note
        const { error } = await supabase
          .from('daily_notes')
          .insert([{
            date: editingNote.date,
            content: editContent.trim(),
            mood: selectedMood,
            user_id: user.id
          }]);

        if (error) throw error;
      }

      await fetchNotes();
      setEditingNote(null);
      setEditContent('');
      setSelectedMood('good');
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Not kaydedilirken hata oluştu.');
    }
  };

  const cancelEditing = () => {
    setEditingNote(null);
    setEditContent('');
    setSelectedMood('good');
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newStartDate = new Date(currentWeek.startDate);
    newStartDate.setDate(newStartDate.getDate() + (direction === 'next' ? 7 : -7));

    const newEndDate = new Date(newStartDate);
    newEndDate.setDate(newStartDate.getDate() + 4);
    newEndDate.setHours(23, 59, 59, 999);

    const weekNumber = getWeekNumber(newStartDate);

    setCurrentWeek({
      startDate: newStartDate,
      endDate: newEndDate,
      weekNumber,
      year: newStartDate.getFullYear()
    });
  };

  const goToCurrentWeek = () => {
    setCurrentWeek(getCurrentWeek());
  };

  const canEditDate = (date: Date) => {
    return isCurrentWeek && date <= today;
  };

  const formatWeekRange = () => {
    const start = currentWeek.startDate;
    const end = currentWeek.endDate;

    return `${start.getDate().toString().padStart(2, '0')}.${(start.getMonth() + 1).toString().padStart(2, '0')}.${start.getFullYear()} - ${end.getDate().toString().padStart(2, '0')}.${(end.getMonth() + 1).toString().padStart(2, '0')}.${end.getFullYear()}`;
  };

  const [selectedDay, setSelectedDay] = useState<WeekDay | null>(null);

  useEffect(() => {
    // Select today by default when the component mounts and it's the current week
    if (isCurrentWeek) {
      const todayDateStr = today.toISOString().split('T')[0];
      const todayData = weekDays.find(day => day.fullDate.toISOString().split('T')[0] === todayDateStr);
      setSelectedDay(todayData || weekDays[0]);
    } else {
      setSelectedDay(weekDays[0]);
    }
  }, [weekDays.map(d => d.date).join(',')]); // Rerun when weekDays change

  const selectedNote = selectedDay ? getNoteForDate(selectedDay.fullDate.toISOString().split('T')[0]) : null;

  return (
    <div className="mb-8">
      {/* Header for Desktop */}
      <div className="hidden lg:flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Haftalık Güncem</h2>
          <p className="text-sm text-slate-400 mt-1">Bu haftaki deneyimlerinizi kaydedin</p>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center gap-2">
          {/* Week Navigation with integrated buttons */}
          <div className="flex items-center bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden flex-1">
            <button
              onClick={() => navigateWeek('prev')}
              className="p-3 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all border-r border-slate-700/50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="px-4 py-2 flex-1 text-center">
              <span className="text-sm text-slate-300 font-medium">{formatWeekRange()}</span>
              <div className="text-xs text-slate-500 mt-1">
                {currentWeek.year} - Hafta {currentWeek.weekNumber}
              </div>
            </div>

            <button
              onClick={() => navigateWeek('next')}
              className="p-3 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all border-l border-slate-700/50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Go to Current Week */}
          {!isCurrentWeek && (
            <button
              onClick={goToCurrentWeek}
              className="px-3 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-all text-sm font-medium"
            >
              Bu Hafta
            </button>
          )}
        </div>
      </div>

      {/* Header for Mobile */}
      <div className="lg:hidden px-4 mb-4">
        <h2 className="text-xl font-bold text-white">Haftalık Güncem</h2>
        <p className="text-sm text-slate-400 mt-1">{currentWeek.year} - Hafta {currentWeek.weekNumber}</p>
      </div>

      {/* Horizontal Scrollable Day Tabs for Mobile */}
      <div className="lg:hidden pl-4 mb-4">
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          {weekDays.map(day => (
            <button
              key={day.name}
              onClick={() => setSelectedDay(day)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors duration-200 ${selectedDay?.date === day.date ? 'bg-blue-500 text-white' : 'bg-slate-700/50 text-slate-300'
                }`}>
              {day.short}
            </button>
          ))}
        </div>
      </div>

      {/* Content for Mobile */}
      <div className="lg:hidden px-4">
        {isLoading ? (
          <div className="relative bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-4 animate-pulse">
            <div className="h-4 bg-slate-700 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-slate-700/70 rounded w-full"></div>
            <div className="h-3 bg-slate-700/70 rounded w-3/4 mt-1"></div>
          </div>
        ) : selectedDay && (
          <div className={`relative bg-slate-800/50 backdrop-blur-sm rounded-2xl border transition-all duration-300 p-4 ${selectedDay.fullDate.toDateString() === today.toDateString()
            ? 'border-blue-500/50'
            : 'border-slate-700/50'
            }`}>
            {selectedNote ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${getMoodColor(selectedNote.mood)} flex items-center justify-center`}>
                      <span className="text-xs">{getMoodEmoji(selectedNote.mood)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="w-3 h-3" />
                      {new Date(selectedNote.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  {canEditDate(selectedDay.fullDate) && (
                    <button
                      onClick={() => startEditing(selectedDay.fullDate.toISOString().split('T')[0], selectedDay.name)}
                      className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700/50 rounded-lg transition-all"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p
                  onClick={() => setViewingNote(selectedNote)}
                  className="text-sm text-slate-300 leading-relaxed line-clamp-3 cursor-pointer hover:text-white transition-colors"
                >
                  {selectedNote.content}
                </p>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-slate-400 mb-3">
                  {canEditDate(selectedDay.fullDate) ? 'Henüz not eklenmemiş' : 'Bu güne not ekleyemezsiniz'}
                </p>
                {canEditDate(selectedDay.fullDate) && (
                  <button
                    onClick={() => startEditing(selectedDay.fullDate.toISOString().split('T')[0], selectedDay.name)}
                    className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-all text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Not Ekle
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Week Days Grid for Desktop */}
      <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {isLoading ? (
          // Skeleton Loading Cards
          weekDays.map((day) => (
            <div key={day.name} className="relative bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50">
              {/* Day Header Skeleton */}
              <div className="p-4 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="w-8 h-4 bg-slate-700 rounded animate-pulse mb-1"></div>
                    <div className="w-12 h-3 bg-slate-700/70 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>

              {/* Content Area Skeleton */}
              <div className="p-4 relative">
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-slate-700/50 rounded-xl mx-auto mb-3 animate-pulse"></div>
                  <div className="w-24 h-3 bg-slate-700/50 rounded mx-auto mb-2 animate-pulse"></div>
                  <div className="w-16 h-3 bg-slate-700/30 rounded mx-auto animate-pulse"></div>
                </div>
              </div>
            </div>
          ))
        ) : (
          weekDays.map((day) => {
            const dateStr = day.fullDate.toISOString().split('T')[0];
            const note = getNoteForDate(dateStr);
            const isToday = day.fullDate.toDateString() === today.toDateString();
            const canEdit = canEditDate(day.fullDate);

            return (
              <div key={day.name} className={`relative bg-slate-800/50 backdrop-blur-sm rounded-2xl border transition-all duration-300 ${isToday
                ? 'border-blue-500/50 ring-2 ring-blue-500/20'
                : 'border-slate-700/50 hover:border-slate-600/50'
                }`}>
                {/* Day Header */}
                <div className="p-4 border-b border-slate-700/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white text-sm">{day.short}</h3>
                      <p className="text-xs text-slate-400">{day.date}</p>
                    </div>
                    {isToday && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-4 relative">
                  {note ? (
                    <div className="space-y-3">
                      {/* Mood Indicator */}
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${getMoodColor(note.mood)} flex items-center justify-center`}>
                          <span className="text-xs">{getMoodEmoji(note.mood)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="w-3 h-3" />
                          {new Date(note.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      {/* Note Content - Clickable */}
                      <p
                        onClick={() => setViewingNote(note)}
                        className="text-sm text-slate-300 leading-relaxed line-clamp-4 cursor-pointer hover:text-white transition-colors"
                      >
                        {note.content}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8 relative">
                      <div className="w-12 h-12 bg-slate-700/50 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Plus className="w-6 h-6 text-slate-500" />
                      </div>
                      <p className="text-xs text-slate-500 mb-3">
                        {canEdit ? 'Henüz not eklenmemiş' : 'Bu güne not ekleyemezsiniz'}
                      </p>

                      {/* Add Icon Button */}
                      {canEdit && (
                        <button
                          onClick={() => startEditing(dateStr, day.name)}
                          className="absolute bottom-0 right-0 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-blue-400 hover:bg-slate-700/50 rounded-lg transition-all"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Edit Icon Button - Outside content area, positioned on card */}
                {note && canEdit && (
                  <button
                    onClick={() => startEditing(dateStr, day.name)}
                    className="absolute bottom-4 right-4 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-blue-400 hover:bg-slate-700/50 rounded-lg transition-all"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Edit Note Modal */}
      {editingNote && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {editingNote.dayName} Günce
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">
                    {new Date(editingNote.date).toLocaleDateString('tr-TR')}
                  </p>
                </div>
                <button
                  onClick={cancelEditing}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="space-y-6">
                {/* Mood Selector */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Bugün nasıl geçti?
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(['great', 'good', 'okay', 'bad'] as const).map((mood) => (
                      <button
                        key={mood}
                        onClick={() => setSelectedMood(mood)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${selectedMood === mood
                          ? `bg-gradient-to-r ${getMoodColor(mood)} border-transparent text-white scale-105`
                          : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50 hover:border-slate-500'
                          }`}
                      >
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-2xl ${selectedMood === mood ? 'bg-white/20' : 'bg-slate-600'
                          }`}>
                          {getMoodEmoji(mood)}
                        </div>
                        <span className="text-sm font-medium">
                          {mood === 'great' ? 'Harika' :
                            mood === 'good' ? 'İyi' :
                              mood === 'okay' ? 'Orta' :
                                mood === 'bad' ? 'Kötü' : mood}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content Input */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Günce İçeriği
                  </label>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="Bugün neler yaptınız? Nasıl geçti? Hangi deneyimler yaşadınız?&#10;&#10;Örnek:&#10;- Sabah toplantısında yeni proje hakkında konuştuk&#10;- Öğleden sonra kod review yaptım&#10;- Akşam spor salonuna gittim&#10;- Genel olarak verimli bir gün geçirdim"
                    className="w-full h-48 bg-slate-700/50 border border-slate-600 rounded-xl p-4 text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    rows={8}
                  />
                  <div className="mt-2 text-xs text-slate-500">
                    {editContent.length} karakter
                  </div>
                </div>

                {/* Tips */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-blue-400 mb-2">💡 Günce Yazma İpuçları</h4>
                  <ul className="text-xs text-slate-300 space-y-1">
                    <li>• Günün önemli olaylarını not edin</li>
                    <li>• Hissettiğiniz duyguları paylaşın</li>
                    <li>• Öğrendiğiniz yeni şeyleri yazın</li>
                    <li>• Yarın için planlarınızı belirtin</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-700/50">
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={cancelEditing}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={saveNote}
                  disabled={!editContent.trim()}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {getNoteForDate(editingNote.date) ? 'Güncelle' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Note Detail Modal */}
      {viewingNote && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${getMoodColor(viewingNote.mood)} flex items-center justify-center`}>
                    <span className="text-lg">{getMoodEmoji(viewingNote.mood)}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {new Date(viewingNote.date).toLocaleDateString('tr-TR', { weekday: 'long' })}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {new Date(viewingNote.date).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingNote(null)}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                {/* Time */}
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Clock className="w-4 h-4" />
                  <span>
                    Oluşturulma: {formatDateTimeSafe(viewingNote.created_at)}
                  </span>
                </div>

                {/* Full Content */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">Günce İçeriği</h4>
                  <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {viewingNote.content}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-700/50">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  {canEditDate(new Date(viewingNote.date))
                    ? 'Düzenlemek için kartın üzerindeki ✏️ butonunu kullanın'
                    : 'Bu günce sadece görüntülenebilir'
                  }
                </div>
                {canEditDate(new Date(viewingNote.date)) && (
                  <button
                    onClick={() => {
                      setViewingNote(null);
                      const dayName = new Date(viewingNote.date).toLocaleDateString('tr-TR', { weekday: 'long' });
                      startEditing(viewingNote.date, dayName);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all text-sm font-medium"
                  >
                    <Edit3 className="w-3 h-3" />
                    Düzenle
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
