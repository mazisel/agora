'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Package, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Truck,
  Eye,
  Calendar,
  User,
  AlertTriangle,
  X
} from 'lucide-react';

interface OfficeSupplyItem {
  name: string;
  quantity: number;
  unit: string;
  description?: string;
  estimated_cost?: number;
}

interface OfficeSupplyRequest {
  id: string;
  user_id: string;
  request_date: string;
  items: OfficeSupplyItem[];
  justification?: string;
  urgency_level: 'low' | 'normal' | 'high' | 'urgent';
  department?: string;
  cost_center?: string;
  estimated_cost?: number;
  status: 'pending' | 'approved' | 'rejected' | 'ordered' | 'delivered' | 'cancelled';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  delivery_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  user_profiles?: {
    first_name: string;
    last_name: string;
    personnel_number: string;
    department?: string;
    position?: string;
  };
  approver?: {
    first_name: string;
    last_name: string;
  };
}

export default function AdminOfficeSuppliesPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<OfficeSupplyRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<OfficeSupplyRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [viewingRequest, setViewingRequest] = useState<OfficeSupplyRequest | null>(null);
  const [processingRequest, setProcessingRequest] = useState<OfficeSupplyRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'order' | 'deliver'>('approve');
  const [rejectionReason, setRejectionReason] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const urgencyColors = {
    low: 'bg-gray-500/20 text-gray-400',
    normal: 'bg-blue-500/20 text-blue-400',
    high: 'bg-orange-500/20 text-orange-400',
    urgent: 'bg-red-500/20 text-red-400'
  };

  const urgencyLabels = {
    low: 'Düşük',
    normal: 'Normal',
    high: 'Yüksek',
    urgent: 'Acil'
  };

  const statusColors = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    approved: 'bg-green-500/20 text-green-400',
    rejected: 'bg-red-500/20 text-red-400',
    ordered: 'bg-blue-500/20 text-blue-400',
    delivered: 'bg-purple-500/20 text-purple-400',
    cancelled: 'bg-gray-500/20 text-gray-400'
  };

  const statusLabels = {
    pending: 'Beklemede',
    approved: 'Onaylandı',
    rejected: 'Reddedildi',
    ordered: 'Sipariş Verildi',
    delivered: 'Teslim Edildi',
    cancelled: 'İptal Edildi'
  };

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/admin/office-supplies');
      const data = await response.json();

      if (data.success) {
        setRequests(data.requests);
        setFilteredRequests(data.requests);
      } else {
        setError('Talepler yüklenirken hata oluştu.');
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      setError('Talepler yüklenirken hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    let filtered = requests;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(request => 
        request.user_profiles?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.user_profiles?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.user_profiles?.personnel_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter);
    }

    // Urgency filter
    if (urgencyFilter !== 'all') {
      filtered = filtered.filter(request => request.urgency_level === urgencyFilter);
    }

    setFilteredRequests(filtered);
  }, [requests, searchTerm, statusFilter, urgencyFilter]);

  const handleAction = async () => {
    if (!processingRequest || !user) return;

    if (actionType === 'reject' && !rejectionReason.trim()) {
      setError('Red gerekçesi zorunludur.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const updateData: any = {
        id: processingRequest.id,
        status: actionType === 'approve' ? 'approved' : 
                actionType === 'reject' ? 'rejected' :
                actionType === 'order' ? 'ordered' : 'delivered'
      };

      if (actionType === 'approve') {
        updateData.approved_by = user.id;
      } else if (actionType === 'reject') {
        updateData.rejection_reason = rejectionReason;
      } else if (actionType === 'deliver' && deliveryDate) {
        updateData.delivery_date = deliveryDate;
      }

      if (notes.trim()) {
        updateData.notes = notes;
      }

      const response = await fetch('/api/admin/office-supplies', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (data.success) {
        setProcessingRequest(null);
        setRejectionReason('');
        setDeliveryDate('');
        setNotes('');
        fetchRequests();
      } else {
        setError(data.error || 'İşlem gerçekleştirilirken hata oluştu.');
      }
    } catch (error) {
      console.error('Error processing request:', error);
      setError('İşlem gerçekleştirilirken hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusCounts = () => {
    return {
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      ordered: requests.filter(r => r.status === 'ordered').length,
      delivered: requests.filter(r => r.status === 'delivered').length,
    };
  };

  const statusCounts = getStatusCounts();

  if (isLoading && requests.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Ofis Malzeme Talepleri Yönetimi</h1>
          <p className="text-slate-400">Personel ofis malzeme taleplerini inceleyin ve onaylayın</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-400" />
              <div>
                <p className="text-yellow-400 font-semibold text-lg">{statusCounts.pending}</p>
                <p className="text-yellow-400/80 text-sm">Beklemede</p>
              </div>
            </div>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-green-400 font-semibold text-lg">{statusCounts.approved}</p>
                <p className="text-green-400/80 text-sm">Onaylandı</p>
              </div>
            </div>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-400" />
              <div>
                <p className="text-red-400 font-semibold text-lg">{statusCounts.rejected}</p>
                <p className="text-red-400/80 text-sm">Reddedildi</p>
              </div>
            </div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-blue-400 font-semibold text-lg">{statusCounts.ordered}</p>
                <p className="text-blue-400/80 text-sm">Sipariş Verildi</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Truck className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-purple-400 font-semibold text-lg">{statusCounts.delivered}</p>
                <p className="text-purple-400/80 text-sm">Teslim Edildi</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Personel, departman veya malzeme ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="pending">Beklemede</option>
              <option value="approved">Onaylandı</option>
              <option value="rejected">Reddedildi</option>
              <option value="ordered">Sipariş Verildi</option>
              <option value="delivered">Teslim Edildi</option>
            </select>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="all">Tüm Aciliyet Seviyeleri</option>
              <option value="urgent">Acil</option>
              <option value="high">Yüksek</option>
              <option value="normal">Normal</option>
              <option value="low">Düşük</option>
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Requests Table */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Personel</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Malzemeler</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Tarih</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Aciliyet</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Maliyet</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Durum</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <div className="font-medium text-white">
                          {request.user_profiles?.first_name} {request.user_profiles?.last_name}
                        </div>
                        <div className="text-sm text-slate-400">
                          {request.user_profiles?.personnel_number} • {request.user_profiles?.department}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-slate-300">
                        {request.items.length} malzeme
                        {request.items.slice(0, 2).map((item, index) => (
                          <div key={index} className="text-xs text-slate-500">
                            {item.quantity} {item.unit} {item.name}
                          </div>
                        ))}
                        {request.items.length > 2 && (
                          <div className="text-xs text-slate-500">+{request.items.length - 2} daha...</div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-slate-300">
                        {new Date(request.request_date).toLocaleDateString('tr-TR')}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${urgencyColors[request.urgency_level]}`}>
                        {urgencyLabels[request.urgency_level]}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-slate-300">
                        {request.estimated_cost ? `${request.estimated_cost.toLocaleString('tr-TR')} ₺` : '-'}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-lg text-sm font-medium ${statusColors[request.status]}`}>
                        {statusLabels[request.status]}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setViewingRequest(request)}
                          className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                          title="Detayları Görüntüle"
                        >
                          <Eye className="w-4 h-4 text-slate-400 hover:text-blue-400" />
                        </button>
                        {request.status === 'pending' && (
                          <>
                            <button
                              onClick={() => {
                                setProcessingRequest(request);
                                setActionType('approve');
                              }}
                              className="p-2 rounded-lg hover:bg-green-500/20 transition-colors"
                              title="Onayla"
                            >
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            </button>
                            <button
                              onClick={() => {
                                setProcessingRequest(request);
                                setActionType('reject');
                              }}
                              className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                              title="Reddet"
                            >
                              <XCircle className="w-4 h-4 text-red-400" />
                            </button>
                          </>
                        )}
                        {request.status === 'approved' && (
                          <button
                            onClick={() => {
                              setProcessingRequest(request);
                              setActionType('order');
                            }}
                            className="p-2 rounded-lg hover:bg-blue-500/20 transition-colors"
                            title="Sipariş Ver"
                          >
                            <Package className="w-4 h-4 text-blue-400" />
                          </button>
                        )}
                        {request.status === 'ordered' && (
                          <button
                            onClick={() => {
                              setProcessingRequest(request);
                              setActionType('deliver');
                              setDeliveryDate(new Date().toISOString().split('T')[0]);
                            }}
                            className="p-2 rounded-lg hover:bg-purple-500/20 transition-colors"
                            title="Teslim Et"
                          >
                            <Truck className="w-4 h-4 text-purple-400" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {filteredRequests.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-slate-600" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Talep bulunamadı</h3>
              <p className="text-slate-400">Arama kriterlerinize uygun talep bulunmuyor</p>
            </div>
          )}
        </div>

        {/* View Request Modal */}
        {viewingRequest && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Talep Detayları</h3>
                  <button
                    onClick={() => setViewingRequest(null)}
                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                <div className="space-y-6">
                  {/* Request Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-slate-400 mb-2">Talep Eden</h4>
                      <div className="text-white">
                        <p className="font-medium">
                          {viewingRequest.user_profiles?.first_name} {viewingRequest.user_profiles?.last_name}
                        </p>
                        <p className="text-sm text-slate-400">
                          {viewingRequest.user_profiles?.personnel_number} • {viewingRequest.user_profiles?.department}
                        </p>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-slate-400 mb-2">Talep Tarihi</h4>
                      <p className="text-white">{new Date(viewingRequest.request_date).toLocaleDateString('tr-TR')}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-slate-400 mb-2">Durum</h4>
                      <span className={`px-3 py-1 rounded-lg text-sm font-medium ${statusColors[viewingRequest.status]}`}>
                        {statusLabels[viewingRequest.status]}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-slate-400 mb-2">Aciliyet</h4>
                      <span className={`px-3 py-1 rounded-lg text-sm font-medium ${urgencyColors[viewingRequest.urgency_level]}`}>
                        {urgencyLabels[viewingRequest.urgency_level]}
                      </span>
                    </div>
                  </div>

                  {/* Items */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-4">Talep Edilen Malzemeler</h4>
                    <div className="space-y-3">
                      {viewingRequest.items.map((item, index) => (
                        <div key={index} className="p-4 bg-slate-700/30 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="font-medium text-white">{item.name}</h5>
                              {item.description && (
                                <p className="text-sm text-slate-400 mt-1">{item.description}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-white font-medium">{item.quantity} {item.unit}</p>
                              {item.estimated_cost && (
                                <p className="text-sm text-slate-400">
                                  {item.estimated_cost.toLocaleString('tr-TR')} ₺/birim
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {viewingRequest.estimated_cost && (
                      <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                        <div className="flex items-center justify-between">
                          <span className="text-blue-400 font-medium">Toplam Tahmini Maliyet:</span>
                          <span className="text-blue-400 font-bold text-lg">
                            {viewingRequest.estimated_cost.toLocaleString('tr-TR')} ₺
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Additional Info */}
                  {(viewingRequest.justification || viewingRequest.department || viewingRequest.cost_center) && (
                    <div className="space-y-4">
                      {viewingRequest.justification && (
                        <div>
                          <h4 className="text-sm font-medium text-slate-400 mb-2">Gerekçe</h4>
                          <p className="text-white">{viewingRequest.justification}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {viewingRequest.department && (
                          <div>
                            <h4 className="text-sm font-medium text-slate-400 mb-2">Departman</h4>
                            <p className="text-white">{viewingRequest.department}</p>
                          </div>
                        )}
                        {viewingRequest.cost_center && (
                          <div>
                            <h4 className="text-sm font-medium text-slate-400 mb-2">Masraf Merkezi</h4>
                            <p className="text-white">{viewingRequest.cost_center}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Status Info */}
                  {(viewingRequest.approver || viewingRequest.rejection_reason || viewingRequest.delivery_date || viewingRequest.notes) && (
                    <div className="space-y-4">
                      {viewingRequest.approver && (
                        <div>
                          <h4 className="text-sm font-medium text-slate-400 mb-2">Onaylayan</h4>
                          <p className="text-white">
                            {viewingRequest.approver.first_name} {viewingRequest.approver.last_name}
                          </p>
                          {viewingRequest.approved_at && (
                            <p className="text-sm text-slate-400">
                              {new Date(viewingRequest.approved_at).toLocaleDateString('tr-TR')}
                            </p>
                          )}
                        </div>
                      )}
                      {viewingRequest.rejection_reason && (
                        <div>
                          <h4 className="text-sm font-medium text-slate-400 mb-2">Red Gerekçesi</h4>
                          <p className="text-red-400">{viewingRequest.rejection_reason}</p>
                        </div>
                      )}
                      {viewingRequest.delivery_date && (
                        <div>
                          <h4 className="text-sm font-medium text-slate-400 mb-2">Teslim Tarihi</h4>
                          <p className="text-white">{new Date(viewingRequest.delivery_date).toLocaleDateString('tr-TR')}</p>
                        </div>
                      )}
                      {viewingRequest.notes && (
                        <div>
                          <h4 className="text-sm font-medium text-slate-400 mb-2">Notlar</h4>
                          <p className="text-white">{viewingRequest.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-700/50">
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setViewingRequest(null)}
                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                  >
                    Kapat
                  </button>
                  {viewingRequest.status === 'pending' && (
                    <>
                      <button
                        onClick={() => {
                          setViewingRequest(null);
                          setProcessingRequest(viewingRequest);
                          setActionType('approve');
                        }}
                        className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Onayla
                      </button>
                      <button
                        onClick={() => {
                          setViewingRequest(null);
                          setProcessingRequest(viewingRequest);
                          setActionType('reject');
                        }}
                        className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium"
                      >
                        <XCircle className="w-4 h-4" />
                        Reddet
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Process Request Modal */}
        {processingRequest && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-md w-full">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">
                    {actionType === 'approve' ? 'Talebi Onayla' :
                     actionType === 'reject' ? 'Talebi Reddet' :
                     actionType === 'order' ? 'Sipariş Ver' : 'Teslim Et'}
                  </h3>
                  <button
                    onClick={() => {
                      setProcessingRequest(null);
                      setRejectionReason('');
                      setDeliveryDate('');
                      setNotes('');
                    }}
                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                      actionType === 'approve' ? 'bg-green-500/20' :
                      actionType === 'reject' ? 'bg-red-500/20' :
                      actionType === 'order' ? 'bg-blue-500/20' : 'bg-purple-500/20'
                    }`}>
                      {actionType === 'approve' ? <CheckCircle className="w-8 h-8 text-green-400" /> :
                       actionType === 'reject' ? <XCircle className="w-8 h-8 text-red-400" /> :
                       actionType === 'order' ? <Package className="w-8 h-8 text-blue-400" /> :
                       <Truck className="w-8 h-8 text-purple-400" />}
                    </div>
                    <h4 className="text-lg font-semibold text-white mb-2">
                      {processingRequest.user_profiles?.first_name} {processingRequest.user_profiles?.last_name}
                    </h4>
                    <p className="text-slate-400">
                      {actionType === 'approve' ? 'Bu talebi onaylamak istediğinizden emin misiniz?' :
                       actionType === 'reject' ? 'Bu talebi reddetmek istediğinizden emin misiniz?' :
                       actionType === 'order' ? 'Bu talep için sipariş vermek istediğinizden emin misiniz?' :
                       'Bu talebi teslim edildi olarak işaretlemek istediğinizden emin misiniz?'}
                    </p>
                  </div>

                  {actionType === 'reject' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Red Gerekçesi *</label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
                        rows={3}
                        placeholder="Reddetme gerekçesini açıklayın..."
                        required
                      />
                    </div>
                  )}

                  {actionType === 'deliver' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Teslim Tarihi</label>
                      <input
                        type="date"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Notlar (İsteğe bağlı)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                      rows={2}
                      placeholder="Ek notlar..."
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-700/50">
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => {
                      setProcessingRequest(null);
                      setRejectionReason('');
                      setDeliveryDate('');
                      setNotes('');
                    }}
                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleAction}
                    disabled={isLoading || (actionType === 'reject' && !rejectionReason.trim())}
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                      actionType === 'approve' ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700' :
                      actionType === 'reject' ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' :
                      actionType === 'order' ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700' :
                      'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
                    } text-white`}
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        İşleniyor...
                      </>
                    ) : (
                      <>
                        {actionType === 'approve' ? <CheckCircle className="w-4 h-4" /> :
                         actionType === 'reject' ? <XCircle className="w-4 h-4" /> :
                         actionType === 'order' ? <Package className="w-4 h-4" /> :
                         <Truck className="w-4 h-4" />}
                        {actionType === 'approve' ? 'Onayla' :
                         actionType === 'reject' ? 'Reddet' :
                         actionType === 'order' ? 'Sipariş Ver' : 'Teslim Et'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
