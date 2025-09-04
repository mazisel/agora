'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Plus, Clock, CheckCircle, XCircle, Calendar, MapPin, User, Utensils, ChevronLeft, ChevronRight } from 'lucide-react';

interface MeetingRoomRequest {
  id: string;
  title: string;
  description?: string;
  room_id: string;
  meeting_date: string;
  start_time: string;
  end_time: string;
  participant_count: number;
  catering_needed: boolean;
  catering_details?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  admin_notes?: string;
  created_at: string;
  meeting_rooms?: {
    id: string;
    name: string;
    location: string;
    capacity: number;
    equipment: string[];
  };
  reviewed_by_profile?: {
    first_name: string;
    last_name: string;
  };
}

interface MeetingRoom {
  id: string;
  name: string;
  location: string;
  capacity: number;
  description?: string;
  equipment: string[];
  is_available: boolean;
}

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  room_name: string;
  status: string;
}

export default function MeetingRoomsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MeetingRoomRequest[]>([]);
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    room_id: '',
    meeting_date: '',
    start_time: '09:00',
    end_time: '10:00',
    participant_count: 1,
    catering_needed: false,
    catering_details: ''
  });

  useEffect(() => {
    if (user) {
      fetchRequests();
      fetchRooms();
      fetchCalendarEvents();
    }
  }, [user, currentDate]);

  const fetchRequests = async () => {
    try {
      const response = await fetch(`/api/modules/meeting-room-requests?userId=${user?.id}`);
      const data = await response.json();
      
      if (data.success) {
        setRequests(data.requests);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await fetch('/api/modules/meeting-rooms?available=true&active=true');
      const data = await response.json();
      
      if (data.success) {
        setRooms(data.rooms);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const fetchCalendarEvents = async () => {
    try {
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const response = await fetch(`/api/modules/meeting-room-requests?calendar=true&start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}`);
      const data = await response.json();
      
      if (data.success) {
        setCalendarEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    try {
      const response = await fetch('/api/modules/meeting-room-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          user_id: user.id
        }),
      });

      const data = await response.json();

      if (data.success) {
        setRequests([data.request, ...requests]);
        setShowCreateForm(false);
        setFormData({
          title: '',
          description: '',
          room_id: '',
          meeting_date: '',
          start_time: '09:00',
          end_time: '10:00',
          participant_count: 1,
          catering_needed: false,
          catering_details: ''
        });
        fetchCalendarEvents(); // Refresh calendar
      } else {
        console.error('API Error:', data);
        alert(data.error || 'Talep oluşturulurken hata oluştu');
      }
    } catch (error) {
      console.error('Error creating request:', error);
      alert('Talep oluşturulurken hata oluştu');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-500/20';
      case 'approved': return 'text-green-400 bg-green-500/20';
      case 'rejected': return 'text-red-400 bg-red-500/20';
      case 'completed': return 'text-blue-400 bg-blue-500/20';
      case 'cancelled': return 'text-gray-400 bg-gray-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Beklemede';
      case 'approved': return 'Onaylandı';
      case 'rejected': return 'Reddedildi';
      case 'completed': return 'Tamamlandı';
      case 'cancelled': return 'İptal Edildi';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  // Calendar functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getEventsForDate = (date: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    return calendarEvents.filter(event => event.start_time.startsWith(dateStr));
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 border border-slate-700/30"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const events = getEventsForDate(day);
      const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
      
      days.push(
        <div key={day} className={`h-24 border border-slate-700/30 p-1 ${isToday ? 'bg-blue-500/10' : ''}`}>
          <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-400' : 'text-slate-300'}`}>
            {day}
          </div>
          <div className="space-y-1">
            {events.slice(0, 2).map((event, index) => (
              <div
                key={index}
                className={`text-xs p-1 rounded truncate ${
                  event.status === 'approved' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                }`}
                title={`${event.title} (${event.room_name}) ${event.start_time.split('T')[1]?.slice(0, 5)} - ${event.end_time.split('T')[1]?.slice(0, 5)}`}
              >
                {event.title}
              </div>
            ))}
            {events.length > 2 && (
              <div className="text-xs text-slate-400">+{events.length - 2} daha</div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Toplantı Odası Rezervasyonu</h1>
            <p className="text-slate-400">Toplantı odası talep ve rezervasyon sistemi</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Yeni Talep</span>
        </button>
      </div>

      {/* Calendar */}
      <div className="mb-8">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-white">Rezervasyon Takvimi</h2>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-slate-400" />
              </button>
              <h3 className="text-lg font-medium text-white min-w-[200px] text-center">
                {currentDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
              </h3>
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-0 border border-slate-700/30 rounded-lg overflow-hidden">
            {/* Header */}
            {['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'].map(day => (
              <div key={day} className="bg-slate-700/50 p-3 text-center text-sm font-medium text-slate-300 border-b border-slate-700/30">
                {day}
              </div>
            ))}
            {/* Calendar Days */}
            {renderCalendar()}
          </div>
          
          <div className="flex items-center space-x-4 mt-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500/20 border border-green-500/30 rounded"></div>
              <span className="text-slate-400">Onaylanmış</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500/20 border border-yellow-500/30 rounded"></div>
              <span className="text-slate-400">Beklemede</span>
            </div>
          </div>
        </div>
      </div>

      {/* Available Rooms Info */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Mevcut Toplantı Odaları</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <div key={room.id} className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
              <h3 className="font-semibold text-white mb-2">{room.name}</h3>
              <div className="space-y-1 text-sm text-slate-300">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{room.location}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>{room.capacity} kişilik</span>
                </div>
                {room.description && (
                  <p className="text-xs text-slate-400 mt-2">{room.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700/50">
              <h2 className="text-xl font-bold text-white">Yeni Toplantı Odası Talebi</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Toplantı Başlığı *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="Toplantı başlığını girin"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Açıklama
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  rows={3}
                  placeholder="Toplantı hakkında detaylar"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Toplantı Odası *
                </label>
                <select
                  value={formData.room_id}
                  onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  required
                >
                  <option value="">Oda seçin</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name} - {room.location} ({room.capacity} kişilik)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Tarih *
                  </label>
                  <input
                    type="date"
                    value={formData.meeting_date}
                    onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Başlangıç Saati *
                  </label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Bitiş Saati *
                  </label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Katılımcı Sayısı *
                </label>
                <input
                  type="number"
                  value={formData.participant_count}
                  onChange={(e) => setFormData({ ...formData, participant_count: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  min="1"
                  max="50"
                  required
                />
              </div>

              <div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.catering_needed}
                    onChange={(e) => setFormData({ ...formData, catering_needed: e.target.checked })}
                    className="rounded border-slate-600 bg-slate-700/50 text-blue-600 focus:ring-blue-500/50"
                  />
                  <span className="text-sm font-medium text-slate-300">İkram gerekli</span>
                </label>
              </div>

              {formData.catering_needed && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    İkram Detayları
                  </label>
                  <textarea
                    value={formData.catering_details}
                    onChange={(e) => setFormData({ ...formData, catering_details: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    rows={2}
                    placeholder="İkram ihtiyaçlarını belirtin"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Talep Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Requests List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Taleplerim</h2>
        {requests.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Henüz toplantı odası talebiniz yok</h3>
            <p className="text-slate-400 mb-4">İlk talebinizi oluşturmak için yukarıdaki butona tıklayın.</p>
          </div>
        ) : (
          requests.map((request) => (
            <div key={request.id} className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${getStatusColor(request.status)}`}>
                    {getStatusIcon(request.status)}
                    <span>{getStatusText(request.status)}</span>
                  </div>
                </div>
                <div className="text-sm text-slate-400">
                  {new Date(request.created_at).toLocaleDateString('tr-TR')}
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white mb-2">{request.title}</h3>
                {request.description && (
                  <p className="text-sm text-slate-400 mb-3">{request.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-300">
                    {new Date(request.meeting_date).toLocaleDateString('tr-TR')}
                    <span className="ml-2 text-slate-500">
                      {request.start_time} - {request.end_time}
                    </span>
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-300">{request.participant_count} katılımcı</span>
                </div>
                {request.meeting_rooms && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-300">
                      {request.meeting_rooms.name} ({request.meeting_rooms.location})
                    </span>
                  </div>
                )}
                {request.catering_needed && (
                  <div className="flex items-center space-x-2">
                    <Utensils className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-300">İkram gerekli</span>
                  </div>
                )}
              </div>

              {request.catering_needed && request.catering_details && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-slate-300 mb-1">İkram Detayları:</h4>
                  <p className="text-sm text-slate-400">{request.catering_details}</p>
                </div>
              )}

              {request.admin_notes && (
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-slate-300 mb-1">Yönetici Notu:</h4>
                  <p className="text-sm text-slate-400">{request.admin_notes}</p>
                  {request.reviewed_by_profile && (
                    <p className="text-xs text-slate-500 mt-1">
                      İncelendi: {request.reviewed_by_profile.first_name} {request.reviewed_by_profile.last_name}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
