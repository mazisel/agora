'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  X, 
  Save,
  Filter
} from 'lucide-react';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  attendees: number;
  type: 'meeting' | 'deadline' | 'event' | 'reminder';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  created_by: string;
  participants?: string[];
  participant_names?: string[];
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  personnel_number: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'meeting' | 'deadline' | 'event' | 'reminder'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [participantSearch, setParticipantSearch] = useState('');
  
  const { user, loading } = useAuth();
  const router = useRouter();

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    location: '',
    attendees: 1,
    type: 'meeting' as 'meeting' | 'deadline' | 'event' | 'reminder',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });

  // Fetch events from Supabase
  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          event_participants (
            user_id,
            user_profiles (
              first_name,
              last_name,
              personnel_number
            )
          )
        `)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) throw error;
      
      // Process events to include participant info
      const processedEvents = (data || []).map(event => ({
        ...event,
        participants: event.event_participants?.map((p: any) => p.user_id) || [],
        participant_names: event.event_participants?.map((p: any) => 
          `${p.user_profiles?.first_name} ${p.user_profiles?.last_name} (${p.user_profiles?.personnel_number})`
        ) || []
      }));
      
      setEvents(processedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('Etkinlikler yüklenirken hata oluştu.');
    }
  };

  // Fetch employees from Supabase
  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, personnel_number')
        .eq('status', 'active')
        .order('first_name', { ascending: true });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Fetch events and employees on component mount
  useEffect(() => {
    if (user) {
      fetchEvents();
      fetchEmployees();
    }
  }, [user]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  // Filter events
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || event.type === filterType;
    const matchesPriority = filterPriority === 'all' || event.priority === filterPriority;
    
    return matchesSearch && matchesType && matchesPriority;
  });

  const getTypeIcon = (type: Event['type']) => {
    switch (type) {
      case 'meeting':
        return <Users className="w-4 h-4" />;
      case 'deadline':
        return <Clock className="w-4 h-4" />;
      case 'event':
        return <Calendar className="w-4 h-4" />;
      case 'reminder':
        return <Clock className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: Event['type']) => {
    switch (type) {
      case 'meeting':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'deadline':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'event':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'reminder':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default:
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    }
  };

  const getPriorityColor = (priority: Event['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-slate-500';
    }
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.description || !newEvent.date || !newEvent.time) {
      setError('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // First, create the event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .insert([{
          title: newEvent.title,
          description: newEvent.description,
          date: newEvent.date,
          time: newEvent.time,
          location: newEvent.location,
          attendees: newEvent.attendees,
          type: newEvent.type,
          priority: newEvent.priority,
          created_by: user.id
        }])
        .select()
        .single();

      if (eventError) throw eventError;

      // Then, add participants if any are selected
      if (selectedParticipants.length > 0) {
        const participantInserts = selectedParticipants.map(userId => ({
          event_id: eventData.id,
          user_id: userId
        }));

        const { error: participantError } = await supabase
          .from('event_participants')
          .insert(participantInserts);

        if (participantError) throw participantError;
      }

      await fetchEvents();
      
      setNewEvent({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        location: '',
        attendees: 1,
        type: 'meeting',
        priority: 'medium'
      });
      setSelectedParticipants([]);
      setParticipantSearch('');
      setIsCreating(false);
      setIsLoading(false);
      
      alert('Etkinlik başarıyla oluşturuldu!');
    } catch (error) {
      console.error('Error creating event:', error);
      setError('Etkinlik oluşturulurken hata oluştu.');
      setIsLoading(false);
    }
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent) return;

    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase
        .from('events')
        .update({
          title: editingEvent.title,
          description: editingEvent.description,
          date: editingEvent.date,
          time: editingEvent.time,
          location: editingEvent.location,
          attendees: editingEvent.attendees,
          type: editingEvent.type,
          priority: editingEvent.priority
        })
        .eq('id', editingEvent.id);

      if (error) throw error;

      await fetchEvents();
      setEditingEvent(null);
      setIsLoading(false);
      
      alert('Etkinlik başarıyla güncellendi!');
    } catch (error) {
      console.error('Error updating event:', error);
      setError('Etkinlik güncellenirken hata oluştu.');
      setIsLoading(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Bu etkinliği silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchEvents();
      alert('Etkinlik başarıyla silindi!');
    } catch (error) {
      console.error('Error deleting event:', error);
      setError('Etkinlik silinirken hata oluştu.');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Etkinlik Yönetimi</h2>
            <p className="text-slate-400">Şirket etkinliklerini yönetin</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <span className="text-sm text-slate-300 font-medium">Toplam: {events.length} etkinlik</span>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-200 font-medium"
            >
              <Plus className="w-4 h-4" />
              Yeni Etkinlik
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Etkinlik ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
            >
              <option value="all">Tüm Tipler</option>
              <option value="meeting">Toplantı</option>
              <option value="deadline">Deadline</option>
              <option value="event">Etkinlik</option>
              <option value="reminder">Hatırlatma</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as any)}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
            >
              <option value="all">Tüm Öncelikler</option>
              <option value="high">Yüksek</option>
              <option value="medium">Orta</option>
              <option value="low">Düşük</option>
            </select>
          </div>
        </div>

        {/* Filtered Results Summary */}
        {(searchTerm || filterType !== 'all' || filterPriority !== 'all') && (
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">
                Filtrelenmiş: {filteredEvents.length} etkinlik
              </span>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('all');
                  setFilterPriority('all');
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                Filtreleri Temizle
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Events Table */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Etkinlik</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Tarih & Saat</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Konum</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Katılımcı</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Tip</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Öncelik</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event) => (
                <tr key={event.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                  <td className="py-4 px-6">
                    <div>
                      <div className="font-medium text-white">{event.title}</div>
                      <div className="text-slate-400 text-sm line-clamp-1">{event.description}</div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-slate-300">
                      <div>{new Date(event.date).toLocaleDateString('tr-TR')}</div>
                      <div className="text-slate-400 text-sm">{event.time}</div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span className="text-slate-300 text-sm">{event.location}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span className="text-slate-300">{event.attendees}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border ${getTypeColor(event.type)}`}>
                      {getTypeIcon(event.type)}
                      <span>
                        {event.type === 'meeting' ? 'Toplantı' :
                         event.type === 'deadline' ? 'Deadline' :
                         event.type === 'event' ? 'Etkinlik' :
                         event.type === 'reminder' ? 'Hatırlatma' : event.type}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getPriorityColor(event.priority)}`}></div>
                      <span className="text-slate-300 text-sm">
                        {event.priority === 'high' ? 'Yüksek' :
                         event.priority === 'medium' ? 'Orta' :
                         event.priority === 'low' ? 'Düşük' : event.priority}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingEvent(event)}
                        className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                        title="Düzenle"
                      >
                        <Edit3 className="w-4 h-4 text-slate-400 hover:text-purple-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {searchTerm || filterType !== 'all' || filterPriority !== 'all' 
                ? 'Etkinlik Bulunamadı' 
                : 'Henüz Etkinlik Yok'}
            </h3>
            <p className="text-slate-400 mb-6">
              {searchTerm || filterType !== 'all' || filterPriority !== 'all'
                ? 'Arama kriterlerinize uygun etkinlik bulunamadı'
                : 'İlk etkinliği oluşturun'}
            </p>
            {!(searchTerm || filterType !== 'all' || filterPriority !== 'all') && (
              <button
                onClick={() => setIsCreating(true)}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-200 font-medium"
              >
                İlk Etkinliği Oluştur
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Yeni Etkinlik Oluştur</h3>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setSelectedParticipants([]);
                    setParticipantSearch('');
                  }}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {/* Error Message */}
              {error && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Başlık *</label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                    placeholder="Etkinlik başlığı"
                    required
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Açıklama *</label>
                  <textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 resize-none"
                    rows={3}
                    placeholder="Etkinlik açıklaması"
                    required
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Tarih *</label>
                  <input
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                    required
                  />
                </div>

                {/* Time */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Saat *</label>
                  <input
                    type="time"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                    required
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Konum</label>
                  <input
                    type="text"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                    placeholder="Toplantı odası, online vb."
                  />
                </div>

                {/* Attendees */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Katılımcı Sayısı</label>
                  <input
                    type="number"
                    value={newEvent.attendees}
                    onChange={(e) => setNewEvent({ ...newEvent, attendees: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                    min="1"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Tip</label>
                  <select
                    value={newEvent.type}
                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as any })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                  >
                    <option value="meeting">Toplantı</option>
                    <option value="deadline">Deadline</option>
                    <option value="event">Etkinlik</option>
                    <option value="reminder">Hatırlatma</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Öncelik</label>
                  <select
                    value={newEvent.priority}
                    onChange={(e) => setNewEvent({ ...newEvent, priority: e.target.value as any })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                  >
                    <option value="low">Düşük</option>
                    <option value="medium">Orta</option>
                    <option value="high">Yüksek</option>
                  </select>
                </div>

                {/* Participants */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Katılımcılar</label>
                  
                  {/* Participant Search */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Katılımcı ara..."
                      value={participantSearch}
                      onChange={(e) => setParticipantSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-600/50 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all text-sm"
                    />
                  </div>

                  <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-4 max-h-40 overflow-y-auto">
                    {employees.length === 0 ? (
                      <p className="text-slate-400 text-sm">Çalışan listesi yükleniyor...</p>
                    ) : (
                      <div className="space-y-2">
                        {employees
                          .filter(employee => {
                            const searchLower = participantSearch.toLowerCase();
                            return (
                              employee.first_name.toLowerCase().includes(searchLower) ||
                              employee.last_name.toLowerCase().includes(searchLower) ||
                              employee.personnel_number.toLowerCase().includes(searchLower) ||
                              `${employee.first_name} ${employee.last_name}`.toLowerCase().includes(searchLower)
                            );
                          })
                          .map((employee) => (
                            <label key={employee.id} className="flex items-center gap-3 cursor-pointer hover:bg-slate-600/30 p-2 rounded-lg transition-colors">
                              <input
                                type="checkbox"
                                checked={selectedParticipants.includes(employee.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedParticipants([...selectedParticipants, employee.id]);
                                  } else {
                                    setSelectedParticipants(selectedParticipants.filter(id => id !== employee.id));
                                  }
                                }}
                                className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-500 rounded focus:ring-purple-500 focus:ring-2"
                              />
                              <div className="flex-1">
                                <div className="text-white text-sm font-medium">
                                  {employee.first_name} {employee.last_name}
                                </div>
                                <div className="text-slate-400 text-xs">
                                  {employee.personnel_number}
                                </div>
                              </div>
                            </label>
                          ))}
                      </div>
                    )}
                    
                    {/* No results message */}
                    {employees.length > 0 && 
                     employees.filter(employee => {
                       const searchLower = participantSearch.toLowerCase();
                       return (
                         employee.first_name.toLowerCase().includes(searchLower) ||
                         employee.last_name.toLowerCase().includes(searchLower) ||
                         employee.personnel_number.toLowerCase().includes(searchLower) ||
                         `${employee.first_name} ${employee.last_name}`.toLowerCase().includes(searchLower)
                       );
                     }).length === 0 && participantSearch && (
                      <div className="text-center py-4">
                        <p className="text-slate-400 text-sm">"{participantSearch}" için sonuç bulunamadı</p>
                      </div>
                    )}
                  </div>
                  
                  {selectedParticipants.length > 0 && (
                    <div className="mt-2 text-sm text-slate-300">
                      {selectedParticipants.length} kişi seçildi
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-700/50">
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleCreateEvent}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Etkinlik Oluştur
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Etkinlik Düzenle</h3>
                <button
                  onClick={() => setEditingEvent(null)}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Başlık</label>
                  <input
                    type="text"
                    value={editingEvent.title}
                    onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Açıklama</label>
                  <textarea
                    value={editingEvent.description}
                    onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 resize-none"
                    rows={3}
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Tarih</label>
                  <input
                    type="date"
                    value={editingEvent.date}
                    onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                  />
                </div>

                {/* Time */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Saat</label>
                  <input
                    type="time"
                    value={editingEvent.time}
                    onChange={(e) => setEditingEvent({ ...editingEvent, time: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Konum</label>
                  <input
                    type="text"
                    value={editingEvent.location}
                    onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                  />
                </div>

                {/* Attendees */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Katılımcı Sayısı</label>
                  <input
                    type="number"
                    value={editingEvent.attendees}
                    onChange={(e) => setEditingEvent({ ...editingEvent, attendees: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                    min="1"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Tip</label>
                  <select
                    value={editingEvent.type}
                    onChange={(e) => setEditingEvent({ ...editingEvent, type: e.target.value as any })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                  >
                    <option value="meeting">Toplantı</option>
                    <option value="deadline">Deadline</option>
                    <option value="event">Etkinlik</option>
                    <option value="reminder">Hatırlatma</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Öncelik</label>
                  <select
                    value={editingEvent.priority}
                    onChange={(e) => setEditingEvent({ ...editingEvent, priority: e.target.value as any })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                  >
                    <option value="low">Düşük</option>
                    <option value="medium">Orta</option>
                    <option value="high">Yüksek</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-700/50">
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setEditingEvent(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleUpdateEvent}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Güncelleniyor...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Güncelle
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
