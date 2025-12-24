'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Clock, CheckCircle, XCircle, Calendar, MapPin, User, Utensils, Monitor, Eye, CalendarDays } from 'lucide-react';

interface MeetingRoomRequest {
  id: string;
  title: string;
  description?: string;
  meeting_date: string;
  start_time: string;
  end_time: string;
  participant_count: number;
  equipment_needed: string[];
  catering_needed: boolean;
  catering_details?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  admin_notes?: string;
  created_at: string;
  user_profiles: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    department?: string;
    position?: string;
  };
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
  hourly_rate: number;
}

const equipmentOptions = [
  { value: 'projektor', label: 'Projektör' },
  { value: 'beyaz_tahta', label: 'Beyaz Tahta' },
  { value: 'video_konferans', label: 'Video Konferans' },
  { value: 'ses_sistemi', label: 'Ses Sistemi' }
];

export default function AdminMeetingRoomsPage() {
  const { user, session } = useAuth();
  const [requests, setRequests] = useState<MeetingRoomRequest[]>([]);
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<MeetingRoomRequest | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({
    status: '',
    room_id: '',
    admin_notes: ''
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'list' | 'calendar'>('list');
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (session?.access_token) {
      fetchRequests();
    }
    fetchRooms();
  }, [session]);

  const fetchRequests = async () => {
    if (!session?.access_token) return;

    try {
      const response = await fetch('/api/admin/meeting-room-requests', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
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

  const handleReviewRequest = (request: MeetingRoomRequest) => {
    setSelectedRequest(request);
    setReviewData({
      status: '',
      room_id: '',
      admin_notes: ''
    });
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedRequest || !reviewData.status || !session?.access_token) return;

    try {
      const response = await fetch('/api/admin/meeting-room-requests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          id: selectedRequest.id,
          status: reviewData.status,
          room_id: reviewData.room_id || null,
          admin_notes: reviewData.admin_notes,
          reviewed_by: user?.id
        }),
      });

      const data = await response.json();

      if (data.success) {
        setRequests(requests.map(req =>
          req.id === selectedRequest.id ? data.request : req
        ));
        setShowReviewModal(false);
        setSelectedRequest(null);
      } else {
        alert(data.error || 'Talep güncellenirken hata oluştu');
      }
    } catch (error) {
      console.error('Error updating request:', error);
      alert('Talep güncellenirken hata oluştu');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      case 'cancelled': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
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

  const getEquipmentLabel = (equipment: string) => {
    const option = equipmentOptions.find(opt => opt.value === equipment);
    return option ? option.label : equipment;
  };

  const filteredRequests = requests.filter(request => {
    if (statusFilter === 'all') return true;
    return request.status === statusFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-slate-900 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-3">
          <Users className="w-8 h-8 text-blue-400" />
          <h1 className="text-3xl font-bold text-white">Toplantı Odası Talep Yönetimi</h1>
        </div>

        <div className="flex items-center space-x-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="all">Tüm Talepler</option>
            <option value="pending">Beklemede</option>
            <option value="approved">Onaylandı</option>
            <option value="rejected">Reddedildi</option>
            <option value="completed">Tamamlandı</option>
          </select>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-slate-800/50 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${activeTab === 'list'
            ? 'bg-blue-600 text-white'
            : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
        >
          <Users className="w-4 h-4" />
          <span>Talep Listesi</span>
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${activeTab === 'calendar'
            ? 'bg-blue-600 text-white'
            : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Rezervasyon Takvimi</span>
        </button>
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-600">
            <h2 className="text-xl font-bold mb-4 text-white">Talep İnceleme</h2>

            {/* Request Details */}
            <div className="bg-slate-700 rounded-lg p-4 mb-6">
              <h3 className="font-medium mb-2 text-white">Talep Detayları</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-300">Talep Eden:</span>
                  <span className="text-white ml-2">{selectedRequest.user_profiles.first_name} {selectedRequest.user_profiles.last_name}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-300">Departman:</span>
                  <span className="text-white ml-2">{selectedRequest.user_profiles.department || 'Belirtilmemiş'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-300">Toplantı:</span>
                  <span className="text-white ml-2">{selectedRequest.title}</span>
                </div>
                {selectedRequest.description && (
                  <div>
                    <span className="font-medium text-gray-300">Açıklama:</span>
                    <p className="text-white mt-1">{selectedRequest.description}</p>
                  </div>
                )}
                <div>
                  <span className="font-medium text-gray-300">Tarih:</span>
                  <span className="text-white ml-2">
                    {new Date(selectedRequest.meeting_date).toLocaleDateString('tr-TR')}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-300">Saat:</span>
                  <span className="text-white ml-2">{selectedRequest.start_time} - {selectedRequest.end_time}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-300">Katılımcı Sayısı:</span>
                  <span className="text-white ml-2">{selectedRequest.participant_count} kişi</span>
                </div>
                {selectedRequest.equipment_needed.length > 0 && (
                  <div>
                    <span className="font-medium text-gray-300">Gerekli Ekipmanlar:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedRequest.equipment_needed.map((eq, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">
                          {getEquipmentLabel(eq)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedRequest.catering_needed && (
                  <div>
                    <span className="font-medium text-gray-300">İkram:</span>
                    <span className="text-white ml-2">Gerekli</span>
                    {selectedRequest.catering_details && (
                      <p className="text-gray-400 text-xs mt-1">{selectedRequest.catering_details}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Karar
                </label>
                <select
                  value={reviewData.status}
                  onChange={(e) => setReviewData({ ...reviewData, status: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  required
                >
                  <option value="">Seçiniz</option>
                  <option value="approved">Onayla</option>
                  <option value="rejected">Reddet</option>
                </select>
              </div>

              {reviewData.status === 'approved' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Atanacak Oda
                  </label>
                  <select
                    value={reviewData.room_id}
                    onChange={(e) => setReviewData({ ...reviewData, room_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                    required
                  >
                    <option value="">Oda Seçiniz</option>
                    {rooms
                      .filter(room => room.capacity >= selectedRequest.participant_count)
                      .map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name} ({room.location}) - {room.capacity} kişilik
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Yönetici Notu
                </label>
                <textarea
                  value={reviewData.admin_notes}
                  onChange={(e) => setReviewData({ ...reviewData, admin_notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400"
                  rows={3}
                  placeholder="İsteğe bağlı not ekleyebilirsiniz"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 text-gray-300 border border-slate-600 rounded-md hover:bg-slate-700"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleSubmitReview}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!reviewData.status || (reviewData.status === 'approved' && !reviewData.room_id)}
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Content based on active tab */}
      {activeTab === 'list' ? (
        /* Requests List */
        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                {statusFilter === 'all' ? 'Henüz toplantı odası talebi yok' : `${getStatusText(statusFilter)} durumunda talep yok`}
              </h3>
            </div>
          ) : (
            filteredRequests.map((request) => (
              <div key={request.id} className="bg-slate-800 rounded-lg shadow-md p-6 border border-slate-700">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${getStatusColor(request.status)}`}>
                      {getStatusIcon(request.status)}
                      <span>{getStatusText(request.status)}</span>
                    </div>
                    {request.status === 'pending' && (
                      <button
                        onClick={() => handleReviewRequest(request)}
                        className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700 flex items-center space-x-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span>İncele</span>
                      </button>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(request.created_at).toLocaleDateString('tr-TR')}
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white mb-2">{request.title}</h3>
                  {request.description && (
                    <p className="text-sm text-gray-400 mb-3">{request.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-300">Talep Eden</h4>
                    <p className="text-sm text-white">
                      {request.user_profiles.first_name} {request.user_profiles.last_name}
                    </p>
                    <p className="text-xs text-gray-400">{request.user_profiles.department}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">
                      {new Date(request.meeting_date).toLocaleDateString('tr-TR')}
                      <span className="ml-2 text-slate-500">
                        {request.start_time} - {request.end_time}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">{request.participant_count} katılımcı</span>
                  </div>
                  {request.meeting_rooms && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300">
                        {request.meeting_rooms.name} ({request.meeting_rooms.location})
                      </span>
                    </div>
                  )}
                  {request.catering_needed && (
                    <div className="flex items-center space-x-2">
                      <Utensils className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300">İkram gerekli</span>
                    </div>
                  )}
                </div>

                {request.equipment_needed.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Gerekli Ekipmanlar:</h4>
                    <div className="flex flex-wrap gap-2">
                      {request.equipment_needed.map((equipment, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">
                          {getEquipmentLabel(equipment)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {request.catering_needed && request.catering_details && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-1">İkram Detayları:</h4>
                    <p className="text-sm text-gray-400">{request.catering_details}</p>
                  </div>
                )}

                {request.admin_notes && (
                  <div className="bg-slate-700/30 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-gray-300 mb-1">Yönetici Notu:</h4>
                    <p className="text-sm text-gray-400">{request.admin_notes}</p>
                    {request.reviewed_by_profile && (
                      <p className="text-xs text-gray-500 mt-1">
                        İncelendi: {request.reviewed_by_profile.first_name} {request.reviewed_by_profile.last_name}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        /* Calendar View */
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Rezervasyon Takvimi</h2>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md"
              >
                ←
              </button>
              <span className="text-white font-medium">
                {currentDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md"
              >
                →
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day) => (
              <div key={day} className="p-3 text-center text-sm font-medium text-slate-400 bg-slate-700/50 rounded">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }, (_, i) => {
              const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
              const startDate = new Date(firstDay);
              startDate.setDate(startDate.getDate() - (firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1));

              const cellDate = new Date(startDate);
              cellDate.setDate(cellDate.getDate() + i);

              const isCurrentMonth = cellDate.getMonth() === currentDate.getMonth();
              const isToday = cellDate.toDateString() === new Date().toDateString();

              // Find reservations for this date
              const dayReservations = requests.filter(req => {
                if (req.status !== 'approved') return false;
                const reqDate = new Date(req.meeting_date);
                return cellDate.toDateString() === reqDate.toDateString();
              });

              return (
                <div
                  key={i}
                  className={`min-h-[100px] p-2 border border-slate-600 rounded ${isCurrentMonth ? 'bg-slate-700/30' : 'bg-slate-800/20'
                    } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className={`text-sm font-medium mb-1 ${isCurrentMonth ? 'text-white' : 'text-slate-500'
                    }`}>
                    {cellDate.getDate()}
                  </div>

                  <div className="space-y-1">
                    {dayReservations.slice(0, 2).map((reservation) => (
                      <div
                        key={reservation.id}
                        className="text-xs p-1 bg-green-600/20 text-green-300 rounded border border-green-600/30"
                        title={`${reservation.title} - ${reservation.user_profiles.first_name} ${reservation.user_profiles.last_name}`}
                      >
                        <div className="font-medium truncate">
                          {reservation.meeting_rooms?.name || 'Oda Atanmamış'}
                        </div>
                        <div className="truncate">
                          {reservation.start_time} - {reservation.end_time}
                        </div>
                      </div>
                    ))}
                    {dayReservations.length > 2 && (
                      <div className="text-xs text-slate-400">
                        +{dayReservations.length - 2} daha
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-600/20 border border-green-600/30 rounded"></div>
              <span className="text-sm text-slate-300">Onaylanmış Rezervasyon</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 ring-2 ring-blue-500 rounded"></div>
              <span className="text-sm text-slate-300">Bugün</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
