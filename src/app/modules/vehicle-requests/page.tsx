'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Car, Plus, Clock, CheckCircle, XCircle, Calendar, MapPin, Users } from 'lucide-react';

interface VehicleRequest {
  id: string;
  request_date: string;
  end_date?: string;
  start_time: string;
  end_time: string;
  destination: string;
  purpose: string;
  passenger_count: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  admin_notes?: string;
  created_at: string;
  vehicles?: {
    id: string;
    plate_number: string;
    brand: string;
    model: string;
    color: string;
  };
  reviewed_by_profile?: {
    first_name: string;
    last_name: string;
  };
}

interface Vehicle {
  id: string;
  plate_number: string;
  brand: string;
  model: string;
  color: string;
  fuel_type: string;
  capacity: number;
  is_available: boolean;
}

export default function VehicleRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<VehicleRequest[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    destination: '',
    purpose: '',
    passenger_count: 1
  });

  useEffect(() => {
    if (user) {
      fetchRequests();
      fetchVehicles();
    }
  }, [user]);

  const fetchRequests = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/modules/vehicle-requests?userId=${user?.id}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
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

  const fetchVehicles = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/modules/vehicles?available=true&active=true', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      const data = await response.json();

      if (data.success) {
        setVehicles(data.vehicles);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/modules/vehicle-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
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
          start_date: '',
          end_date: '',
          destination: '',
          purpose: '',
          passenger_count: 1
        });
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
            <Car className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Araç Talepleri</h1>
            <p className="text-slate-400">Araç talep ve rezervasyon sistemi</p>
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

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-md w-full mx-4">
            <div className="p-6 border-b border-slate-700/50">
              <h2 className="text-xl font-bold text-white">Yeni Araç Talebi</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Başlangıç Tarihi
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Bitiş Tarihi
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    required
                    min={formData.start_date || new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Gidilecek Yer
                </label>
                <input
                  type="text"
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="Gidilecek yeri belirtin"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Amaç
                </label>
                <textarea
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  rows={3}
                  placeholder="Araç kullanım amacını belirtin"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Yolcu Sayısı
                </label>
                <input
                  type="number"
                  value={formData.passenger_count}
                  onChange={(e) => setFormData({ ...formData, passenger_count: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  min="1"
                  max="20"
                  required
                />
              </div>

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
        {requests.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Car className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Henüz araç talebiniz yok</h3>
            <p className="text-slate-400 mb-4">İlk araç talebinizi oluşturmak için yukarıdaki butona tıklayın.</p>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-300">
                    {new Date(request.request_date).toLocaleDateString('tr-TR')}
                    {request.end_date && request.end_date !== request.request_date && (
                      <> - {new Date(request.end_date).toLocaleDateString('tr-TR')}</>
                    )}
                    <span className="ml-2 text-slate-500">
                      {request.start_time} / {request.end_time}
                    </span>
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-300">{request.destination}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-300">{request.passenger_count} kişi</span>
                </div>
                {request.vehicles && (
                  <div className="flex items-center space-x-2">
                    <Car className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-300">
                      {request.vehicles.brand} {request.vehicles.model} ({request.vehicles.plate_number})
                    </span>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-medium text-slate-300 mb-1">Amaç:</h4>
                <p className="text-sm text-slate-400">{request.purpose}</p>
              </div>

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
