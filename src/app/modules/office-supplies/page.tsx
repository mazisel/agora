'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Package, 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Truck,
  Eye,
  Edit3,
  Trash2,
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
}

interface OfficeSupplyItemOption {
  id: string;
  name: string;
  unit: string;
  estimated_unit_cost?: number;
  category?: {
    id: string;
    name: string;
  };
}

export default function OfficeSuppliesPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<OfficeSupplyRequest[]>([]);
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);
  const [availableItems, setAvailableItems] = useState<OfficeSupplyItemOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [viewingRequest, setViewingRequest] = useState<OfficeSupplyRequest | null>(null);
  const [editingRequest, setEditingRequest] = useState<OfficeSupplyRequest | null>(null);
  const [error, setError] = useState('');

  const [newRequest, setNewRequest] = useState({
    items: [{ name: '', quantity: 1, unit: 'adet', description: '', estimated_cost: 0 }] as OfficeSupplyItem[],
    justification: '',
    urgency_level: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    department: '',
    estimated_cost: 0
  });

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
    if (!user) return;

    try {
      const response = await fetch(`/api/modules/office-supplies?userId=${user.id}`);
      const data = await response.json();

      if (data.success) {
        setRequests(data.requests);
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

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      const data = await response.json();

      if (data.success) {
        setDepartments(data.departments);
      } else {
        console.error('Error fetching departments:', data.error);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchAvailableItems = async () => {
    try {
      const response = await fetch('/api/office-supplies-items');
      const data = await response.json();

      if (data.success) {
        setAvailableItems(data.items);
      } else {
        console.error('Error fetching items:', data.error);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchDepartments();
    fetchAvailableItems();
  }, [user]);

  const addItem = () => {
    setNewRequest({
      ...newRequest,
      items: [...newRequest.items, { name: '', quantity: 1, unit: 'adet', description: '', estimated_cost: 0 }]
    });
  };

  const removeItem = (index: number) => {
    if (newRequest.items.length > 1) {
      const updatedItems = newRequest.items.filter((_, i) => i !== index);
      setNewRequest({ ...newRequest, items: updatedItems });
    }
  };

  const updateItem = (index: number, field: keyof OfficeSupplyItem, value: any) => {
    const updatedItems = [...newRequest.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // If item name is selected from dropdown, auto-fill unit
    if (field === 'name') {
      const selectedItem = availableItems.find(item => item.name === value);
      if (selectedItem) {
        updatedItems[index].unit = selectedItem.unit;
      }
    }
    
    setNewRequest({ 
      ...newRequest, 
      items: updatedItems
    });
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Validate items
    const validItems = newRequest.items.filter(item => item.name.trim() && item.quantity > 0);
    if (validItems.length === 0) {
      setError('En az bir geçerli malzeme eklemelisiniz.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/modules/office-supplies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          items: validItems,
          justification: newRequest.justification,
          urgency_level: newRequest.urgency_level,
          department: newRequest.department,
          estimated_cost: newRequest.estimated_cost
        }),
      });

      const data = await response.json();

      if (data.success) {
        setNewRequest({
          items: [{ name: '', quantity: 1, unit: 'adet', description: '', estimated_cost: 0 }],
          justification: '',
          urgency_level: 'normal',
          department: '',
          estimated_cost: 0
        });
        setIsCreating(false);
        fetchRequests();
      } else {
        setError(data.error || 'Talep oluşturulurken hata oluştu.');
      }
    } catch (error) {
      console.error('Error creating request:', error);
      setError('Talep oluşturulurken hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (request: OfficeSupplyRequest) => {
    if (request.status === 'pending') {
      setEditingRequest(request);
      setNewRequest({
        items: request.items,
        justification: request.justification || '',
        urgency_level: request.urgency_level,
        department: request.department || '',
        estimated_cost: request.estimated_cost || 0
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingRequest) return;

    const validItems = newRequest.items.filter(item => item.name.trim() && item.quantity > 0);
    if (validItems.length === 0) {
      setError('En az bir geçerli malzeme eklemelisiniz.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/modules/office-supplies', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingRequest.id,
          items: validItems,
          justification: newRequest.justification,
          urgency_level: newRequest.urgency_level,
          department: newRequest.department,
          estimated_cost: newRequest.estimated_cost
        }),
      });

      const data = await response.json();

      if (data.success) {
        setEditingRequest(null);
        setNewRequest({
          items: [{ name: '', quantity: 1, unit: 'adet', description: '', estimated_cost: 0 }],
          justification: '',
          urgency_level: 'normal',
          department: '',
          estimated_cost: 0
        });
        fetchRequests();
      } else {
        setError(data.error || 'Talep güncellenirken hata oluştu.');
      }
    } catch (error) {
      console.error('Error updating request:', error);
      setError('Talep güncellenirken hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Ofis Malzeme Talepleri</h1>
              <p className="text-slate-400">Ofis malzemesi taleplerini oluşturun ve takip edin</p>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 font-medium"
            >
              <Plus className="w-5 h-5" />
              Yeni Talep
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Requests Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {requests.map((request) => (
            <div key={request.id} className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 hover:border-slate-600/50 transition-all">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Malzeme Talebi</h3>
                    <p className="text-sm text-slate-400">
                      {new Date(request.request_date).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${urgencyColors[request.urgency_level]}`}>
                    {urgencyLabels[request.urgency_level]}
                  </span>
                </div>
              </div>

              {/* Items Summary */}
              <div className="mb-4">
                <p className="text-sm text-slate-400 mb-2">Malzemeler ({request.items.length} adet):</p>
                <div className="space-y-1">
                  {request.items.slice(0, 3).map((item, index) => (
                    <div key={index} className="text-sm text-slate-300">
                      {item.quantity} {item.unit} {item.name}
                    </div>
                  ))}
                  {request.items.length > 3 && (
                    <div className="text-sm text-slate-500">
                      +{request.items.length - 3} daha...
                    </div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between mb-4">
                <span className={`px-3 py-1 rounded-lg text-sm font-medium ${statusColors[request.status]}`}>
                  {statusLabels[request.status]}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewingRequest(request)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Detay
                </button>
                {request.status === 'pending' && (
                  <button
                    onClick={() => handleEdit(request)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {requests.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Package className="w-12 h-12 text-slate-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Henüz talep yok</h3>
            <p className="text-slate-400 mb-6">İlk ofis malzeme talebinizi oluşturun</p>
            <button
              onClick={() => setIsCreating(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 font-medium"
            >
              İlk Talebi Oluştur
            </button>
          </div>
        )}

        {/* Create/Edit Request Modal */}
        {(isCreating || editingRequest) && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">
                    {editingRequest ? 'Talebi Düzenle' : 'Yeni Malzeme Talebi'}
                  </h3>
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setEditingRequest(null);
                      setNewRequest({
                        items: [{ name: '', quantity: 1, unit: 'adet', description: '', estimated_cost: 0 }],
                        justification: '',
                        urgency_level: 'normal',
                        department: '',
                        estimated_cost: 0
                      });
                    }}
                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                <div className="space-y-6">
                  {/* Items Section */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-white">Malzemeler</h4>
                      <button
                        onClick={addItem}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Malzeme Ekle
                      </button>
                    </div>

                    <div className="space-y-4">
                      {newRequest.items.map((item, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-700/30 rounded-xl">
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-300 mb-2">Malzeme Adı *</label>
                            <select
                              value={item.name}
                              onChange={(e) => updateItem(index, 'name', e.target.value)}
                              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            >
                              <option value="">Malzeme seçin</option>
                              {availableItems.map(availableItem => (
                                <option key={availableItem.id} value={availableItem.name}>
                                  {availableItem.name} ({availableItem.category?.name})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Miktar *</label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                          </div>
                          <div className="flex items-end">
                            {newRequest.items.length > 1 && (
                              <button
                                onClick={() => removeItem(index)}
                                className="w-full px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                              >
                                <Trash2 className="w-4 h-4 mx-auto" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Request Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Gerekçe</label>
                      <textarea
                        value={newRequest.justification}
                        onChange={(e) => setNewRequest({ ...newRequest, justification: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                        rows={3}
                        placeholder="Malzeme talebinin gerekçesi..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Aciliyet Durumu</label>
                      <select
                        value={newRequest.urgency_level}
                        onChange={(e) => setNewRequest({ ...newRequest, urgency_level: e.target.value as any })}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      >
                        <option value="low">Düşük</option>
                        <option value="normal">Normal</option>
                        <option value="high">Yüksek</option>
                        <option value="urgent">Acil</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Departman</label>
                      <select
                        value={newRequest.department}
                        onChange={(e) => setNewRequest({ ...newRequest, department: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      >
                        <option value="">Departman seçin</option>
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.name}>{dept.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-700/50">
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setEditingRequest(null);
                      setNewRequest({
                        items: [{ name: '', quantity: 1, unit: 'adet', description: '', estimated_cost: 0 }],
                        justification: '',
                        urgency_level: 'normal',
                        department: '',
                        estimated_cost: 0
                      });
                    }}
                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={editingRequest ? handleUpdate : handleSubmit}
                    disabled={isLoading || newRequest.items.every(item => !item.name.trim())}
                    className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        {editingRequest ? 'Güncelleniyor...' : 'Oluşturuluyor...'}
                      </>
                    ) : (
                      <>
                        <Package className="w-4 h-4" />
                        {editingRequest ? 'Güncelle' : 'Talep Oluştur'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Request Modal */}
        {viewingRequest && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-3xl w-full max-h-[90vh] overflow-hidden">
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
                    {viewingRequest.department && (
                      <div>
                        <h4 className="text-sm font-medium text-slate-400 mb-2">Departman</h4>
                        <p className="text-white">{viewingRequest.department}</p>
                      </div>
                    )}
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
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
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
                  {(viewingRequest.rejection_reason || viewingRequest.delivery_date || viewingRequest.notes) && (
                    <div className="space-y-4">
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
                    <button
                      onClick={() => {
                        setViewingRequest(null);
                        handleEdit(viewingRequest);
                      }}
                      className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 font-medium"
                    >
                      <Edit3 className="w-4 h-4" />
                      Düzenle
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
