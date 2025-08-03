'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import PermissionGuard from '@/components/auth/PermissionGuard';
import { 
  Users, 
  Check, 
  X, 
  Clock, 
  AlertCircle,
  User,
  Phone,
  MapPin,
  UserCheck
} from 'lucide-react';

interface ProfileUpdateRequest {
  id: string;
  user_id: string;
  request_type: string;
  current_value: string;
  requested_value: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string;
  created_at: string;
}

export default function ProfileRequestsPage() {
  const [requests, setRequests] = useState<ProfileUpdateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('profile_update_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading requests:', error);
        setMessage({ type: 'error', text: 'Talepler yüklenirken hata oluştu!' });
      } else {
        setRequests(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: 'Beklenmeyen bir hata oluştu!' });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (requestId: string, action: 'approve' | 'reject', adminNotes?: string) => {
    setProcessingId(requestId);
    setMessage(null);

    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setMessage({ type: 'error', text: 'Oturum bulunamadı!' });
        setProcessingId(null);
        return;
      }

      // Call our API endpoint
      const response = await fetch('/api/admin/approve-profile-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          requestId,
          action,
          adminNotes: adminNotes || ''
        })
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: result.error || 'İşlem sırasında hata oluştu!' });
      } else {
        setMessage({ type: 'success', text: result.message });
        loadRequests();
      }
    } catch (error) {
      console.error('Error processing request:', error);
      setMessage({ type: 'error', text: 'Beklenmeyen bir hata oluştu!' });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'approved': return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'rejected': return 'text-red-400 bg-red-500/10 border-red-500/30';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Bekliyor';
      case 'approved': return 'Onaylandı';
      case 'rejected': return 'Reddedildi';
      default: return status;
    }
  };

  const getFieldLabel = (field: string) => {
    switch (field) {
      case 'phone': return 'Telefon';
      case 'address': return 'Adres';
      case 'emergency_contact': return 'Acil Durum İletişim Bilgileri';
      case 'emergency_contact_name': return 'Acil Durum İletişim Adı';
      case 'emergency_contact_phone': return 'Acil Durum İletişim Telefonu';
      default: return field;
    }
  };

  const getFieldIcon = (field: string) => {
    switch (field) {
      case 'phone': return Phone;
      case 'address': return MapPin;
      case 'emergency_contact_name': return UserCheck;
      case 'emergency_contact_phone': return Phone;
      default: return User;
    }
  };

  const filteredRequests = requests.filter(request => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-white">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <PermissionGuard requiredLevel="admin">
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold text-white">Profil Güncelleme Talepleri</h1>
            </div>
            <p className="text-slate-400">Kullanıcıların profil bilgi güncelleme taleplerini yönetin</p>
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg border ${
              message.type === 'success' 
                ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              <div className="flex items-center gap-2">
                {message.type === 'success' ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <span>{message.text}</span>
              </div>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="mb-6">
            <div className="flex gap-2">
              {[
                { key: 'pending', label: 'Bekleyen', count: requests.filter(r => r.status === 'pending').length },
                { key: 'approved', label: 'Onaylanan', count: requests.filter(r => r.status === 'approved').length },
                { key: 'rejected', label: 'Reddedilen', count: requests.filter(r => r.status === 'rejected').length },
                { key: 'all', label: 'Tümü', count: requests.length }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key as any)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    filter === tab.key
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'text-slate-400 hover:bg-slate-700/50 hover:text-white border border-transparent'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </div>

          {/* Requests List */}
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-400 mb-2">Talep Bulunamadı</h3>
              <p className="text-slate-500">Seçilen filtreye uygun talep bulunmuyor.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => {
                const FieldIcon = getFieldIcon(request.request_type);
                return (
                  <div key={request.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-700/50 rounded-lg">
                          <FieldIcon className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">
                            Kullanıcı ID: {request.user_id}
                          </h3>
                          <p className="text-sm text-slate-400">
                            {getFieldLabel(request.request_type)}
                          </p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                        {getStatusText(request.status)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="p-3 bg-slate-700/30 rounded-lg">
                        <h4 className="text-sm font-medium text-slate-300 mb-1">Mevcut Değer</h4>
                        <p className="text-white">{request.current_value || 'Boş'}</p>
                      </div>
                      <div className="p-3 bg-slate-700/30 rounded-lg">
                        <h4 className="text-sm font-medium text-slate-300 mb-1">Talep Edilen Değer</h4>
                        {request.request_type === 'emergency_contact' ? (
                          <div className="text-white">
                            {(() => {
                              try {
                                const data = JSON.parse(request.requested_value);
                                return (
                                  <div>
                                    <div><strong>Ad:</strong> {data.name}</div>
                                    <div><strong>Telefon:</strong> {data.phone}</div>
                                  </div>
                                );
                              } catch {
                                return <span>{request.requested_value}</span>;
                              }
                            })()}
                          </div>
                        ) : (
                          <p className="text-white">{request.requested_value}</p>
                        )}
                      </div>
                    </div>

                    {request.reason && (
                      <div className="mb-4 p-3 bg-slate-700/30 rounded-lg">
                        <h4 className="text-sm font-medium text-slate-300 mb-1">Değişiklik Nedeni</h4>
                        <p className="text-white">{request.reason}</p>
                      </div>
                    )}

                    {request.admin_notes && (
                      <div className="mb-4 p-3 bg-slate-700/30 rounded-lg">
                        <h4 className="text-sm font-medium text-slate-300 mb-1">Admin Notu</h4>
                        <p className="text-white">{request.admin_notes}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-400">
                        Talep Tarihi: {new Date(request.created_at).toLocaleDateString('tr-TR')}
                      </p>
                      
                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRequestAction(request.id, 'reject')}
                            disabled={processingId === request.id}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            {processingId === request.id ? 'İşleniyor...' : 'Reddet'}
                          </button>
                          <button
                            onClick={() => handleRequestAction(request.id, 'approve')}
                            disabled={processingId === request.id}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
                          >
                            <Check className="w-4 h-4" />
                            {processingId === request.id ? 'İşleniyor...' : 'Onayla'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PermissionGuard>
  );
}
