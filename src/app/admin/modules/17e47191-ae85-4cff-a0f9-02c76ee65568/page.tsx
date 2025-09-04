'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/lib/supabase';
import { 
  Package, 
  Search, 
  Plus,
  Edit3,
  Trash2,
  Eye,
  X,
  Save,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  AlertCircle,
  Filter,
  Download,
  Calendar,
  User,
  Building2,
  DollarSign
} from 'lucide-react';

interface OfficeSupplyRequest {
  id: string;
  user_id: string;
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    description?: string;
    estimated_cost?: number;
  }>;
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
  };
}

interface Category {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
}

interface Item {
  id: string;
  category_id?: string;
  name: string;
  description?: string;
  unit: string;
  estimated_unit_cost?: number;
  supplier?: string;
  is_active: boolean;
  category?: {
    id: string;
    name: string;
  };
}

export default function OfficeSuppliesAdminPage() {
  const [activeTab, setActiveTab] = useState<'requests' | 'categories' | 'items'>('requests');
  const [requests, setRequests] = useState<OfficeSupplyRequest[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewingRequest, setViewingRequest] = useState<OfficeSupplyRequest | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const { user } = useAuth();
  const { canAccess } = usePermissions();

  const [newCategory, setNewCategory] = useState({
    name: '',
    description: ''
  });

  const [newItem, setNewItem] = useState({
    category_id: '',
    name: '',
    description: '',
    unit: 'adet',
    estimated_unit_cost: 0,
    supplier: ''
  });

  const urgencyLabels = {
    low: 'Düşük',
    normal: 'Normal',
    high: 'Yüksek',
    urgent: 'Acil'
  };

  const statusLabels = {
    pending: 'Beklemede',
    approved: 'Onaylandı',
    rejected: 'Reddedildi',
    ordered: 'Sipariş Verildi',
    delivered: 'Teslim Edildi',
    cancelled: 'İptal Edildi'
  };

  const statusColors = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    approved: 'bg-green-500/20 text-green-400',
    rejected: 'bg-red-500/20 text-red-400',
    ordered: 'bg-blue-500/20 text-blue-400',
    delivered: 'bg-purple-500/20 text-purple-400',
    cancelled: 'bg-gray-500/20 text-gray-400'
  };

  const urgencyColors = {
    low: 'bg-gray-500/20 text-gray-400',
    normal: 'bg-blue-500/20 text-blue-400',
    high: 'bg-orange-500/20 text-orange-400',
    urgent: 'bg-red-500/20 text-red-400'
  };

  // Fetch requests
  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      setError(''); // Clear previous errors
      
      const response = await fetch('/api/admin/office-supplies-requests');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'API request failed');
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch requests');
      }
      
      console.log('Fetched requests:', result.requests);
      setRequests(result.requests || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      setError(`Talepler yüklenirken hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('office_supplies_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('Kategoriler yüklenirken hata oluştu.');
    }
  };

  // Fetch items
  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('office_supplies_items')
        .select(`
          *,
          category:office_supplies_categories(id, name)
        `)
        .order('name');

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      setError('Malzemeler yüklenirken hata oluştu.');
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchCategories();
    fetchItems();
  }, []);

  // Update request status
  const updateRequestStatus = async (requestId: string, status: string, additionalData?: any) => {
    try {
      setIsLoading(true);
      
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'approved' && user) {
        updateData.approved_by = user.id;
        updateData.approved_at = new Date().toISOString();
      }

      if (additionalData) {
        Object.assign(updateData, additionalData);
      }

      const { error } = await supabase
        .from('office_supplies_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      await fetchRequests();
      setIsLoading(false);
    } catch (error) {
      console.error('Error updating request status:', error);
      setError('Talep durumu güncellenirken hata oluştu.');
      setIsLoading(false);
    }
  };

  // Create category
  const createCategory = async () => {
    if (!newCategory.name.trim()) {
      setError('Kategori adı gereklidir.');
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('office_supplies_categories')
        .insert([{
          name: newCategory.name,
          description: newCategory.description,
          is_active: true
        }]);

      if (error) throw error;

      setNewCategory({ name: '', description: '' });
      setIsCreatingCategory(false);
      await fetchCategories();
      setIsLoading(false);
    } catch (error) {
      console.error('Error creating category:', error);
      setError('Kategori oluşturulurken hata oluştu.');
      setIsLoading(false);
    }
  };

  // Create item
  const createItem = async () => {
    if (!newItem.name.trim()) {
      setError('Malzeme adı gereklidir.');
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('office_supplies_items')
        .insert([{
          category_id: newItem.category_id || null,
          name: newItem.name,
          description: newItem.description,
          unit: newItem.unit,
          estimated_unit_cost: newItem.estimated_unit_cost,
          supplier: newItem.supplier,
          is_active: true
        }]);

      if (error) throw error;

      setNewItem({
        category_id: '',
        name: '',
        description: '',
        unit: 'adet',
        estimated_unit_cost: 0,
        supplier: ''
      });
      setIsCreatingItem(false);
      await fetchItems();
      setIsLoading(false);
    } catch (error) {
      console.error('Error creating item:', error);
      setError('Malzeme oluşturulurken hata oluştu.');
      setIsLoading(false);
    }
  };

  // Filter requests
  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.user_profiles?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.user_profiles?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.user_profiles?.personnel_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesUrgency = urgencyFilter === 'all' || request.urgency_level === urgencyFilter;

    return matchesSearch && matchesStatus && matchesUrgency;
  });

  // Filter categories
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter items
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Ofis Malzemeleri Yönetimi</h2>
            <p className="text-slate-400">Ofis malzeme taleplerini, kategorileri ve malzemeleri yönetin</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <span className="text-sm text-slate-300 font-medium">
                Toplam: {requests.length} talep
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex items-center gap-1 p-1 bg-slate-800/50 rounded-xl border border-slate-700/50 w-fit">
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'requests'
                ? 'bg-blue-500 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            Talepler ({requests.length})
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'categories'
                ? 'bg-blue-500 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            Kategoriler ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('items')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'items'
                ? 'bg-blue-500 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            Malzemeler ({items.length})
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={
              activeTab === 'requests' ? 'Talep ara...' :
              activeTab === 'categories' ? 'Kategori ara...' :
              'Malzeme ara...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
          />
        </div>

        {activeTab === 'requests' && (
          <>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
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
              className="px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
            >
              <option value="all">Tüm Aciliyet</option>
              <option value="low">Düşük</option>
              <option value="normal">Normal</option>
              <option value="high">Yüksek</option>
              <option value="urgent">Acil</option>
            </select>
          </>
        )}

        {(activeTab === 'categories' || activeTab === 'items') && (
          <button
            onClick={() => {
              if (activeTab === 'categories') {
                setIsCreatingCategory(true);
              } else {
                setIsCreatingItem(true);
              }
            }}
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-200 font-medium"
          >
            <Plus className="w-4 h-4" />
            {activeTab === 'categories' ? 'Kategori Ekle' : 'Malzeme Ekle'}
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Content based on active tab */}
      {activeTab === 'requests' && (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Talep Eden</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Malzemeler</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Aciliyet</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Maliyet</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Durum</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Tarih</th>
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
                          {request.user_profiles?.personnel_number}
                        </div>
                        {request.department && (
                          <div className="text-xs text-slate-500">{request.department}</div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm">
                        {request.items.slice(0, 2).map((item, index) => (
                          <div key={index} className="text-slate-300">
                            {item.quantity} {item.unit} {item.name}
                          </div>
                        ))}
                        {request.items.length > 2 && (
                          <div className="text-xs text-slate-500">
                            +{request.items.length - 2} daha...
                          </div>
                        )}
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
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${statusColors[request.status]}`}>
                        {statusLabels[request.status]}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-slate-300">
                        {new Date(request.created_at).toLocaleDateString('tr-TR')}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setViewingRequest(request)}
                          className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                          title="Detay"
                        >
                          <Eye className="w-4 h-4 text-slate-400 hover:text-blue-400" />
                        </button>
                        {request.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateRequestStatus(request.id, 'approved')}
                              className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                              title="Onayla"
                            >
                              <CheckCircle className="w-4 h-4 text-slate-400 hover:text-green-400" />
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt('Red gerekçesi:');
                                if (reason) {
                                  updateRequestStatus(request.id, 'rejected', { rejection_reason: reason });
                                }
                              }}
                              className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                              title="Reddet"
                            >
                              <XCircle className="w-4 h-4 text-slate-400 hover:text-red-400" />
                            </button>
                          </>
                        )}
                        {request.status === 'approved' && (
                          <button
                            onClick={() => updateRequestStatus(request.id, 'ordered')}
                            className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                            title="Sipariş Ver"
                          >
                            <Truck className="w-4 h-4 text-slate-400 hover:text-blue-400" />
                          </button>
                        )}
                        {request.status === 'ordered' && (
                          <button
                            onClick={() => {
                              const deliveryDate = prompt('Teslim tarihi (YYYY-MM-DD):');
                              if (deliveryDate) {
                                updateRequestStatus(request.id, 'delivered', { delivery_date: deliveryDate });
                              }
                            }}
                            className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                            title="Teslim Et"
                          >
                            <Package className="w-4 h-4 text-slate-400 hover:text-purple-400" />
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
          {filteredRequests.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-slate-600" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Talep Bulunamadı</h3>
              <p className="text-slate-400">Henüz ofis malzeme talebi bulunmuyor.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((category) => (
            <div key={category.id} className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{category.name}</h3>
                  {category.description && (
                    <p className="text-sm text-slate-400 mt-1">{category.description}</p>
                  )}
                </div>
                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                  category.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {category.is_active ? 'Aktif' : 'Pasif'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingCategory(category)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
                >
                  <Edit3 className="w-4 h-4" />
                  Düzenle
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'items' && (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Malzeme</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Kategori</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Birim</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Birim Fiyat</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Tedarikçi</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Durum</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <div className="font-medium text-white">{item.name}</div>
                        {item.description && (
                          <div className="text-sm text-slate-400">{item.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-slate-300">{item.category?.name || '-'}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-slate-300">{item.unit}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-slate-300">
                        {item.estimated_unit_cost ? `${item.estimated_unit_cost.toLocaleString('tr-TR')} ₺` : '-'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-slate-300">{item.supplier || '-'}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        item.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {item.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => setEditingItem(item)}
                        className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                        title="Düzenle"
                      >
                        <Edit3 className="w-4 h-4 text-slate-400 hover:text-blue-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Request Modal */}
      {viewingRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-3xl w-full max-h-[90vh] overflow-hidden">
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

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="space-y-6">
                {/* Request Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-slate-400 mb-2">Talep Eden</h4>
                    <p className="text-white">
                      {viewingRequest.user_profiles?.first_name} {viewingRequest.user_profiles?.last_name}
                    </p>
                    <p className="text-slate-400 text-sm">{viewingRequest.user_profiles?.personnel_number}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-400 mb-2">Talep Tarihi</h4>
                    <p className="text-white">{new Date(viewingRequest.created_at).toLocaleDateString('tr-TR')}</p>
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
                        updateRequestStatus(viewingRequest.id, 'approved');
                        setViewingRequest(null);
                      }}
                      className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-200 font-medium"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Onayla
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Red gerekçesi:');
                        if (reason) {
                          updateRequestStatus(viewingRequest.id, 'rejected', { rejection_reason: reason });
                          setViewingRequest(null);
                        }
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

      {/* Create Category Modal */}
      {isCreatingCategory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-md w-full">
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Yeni Kategori</h3>
                <button
                  onClick={() => setIsCreatingCategory(false)}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Kategori Adı *</label>
                  <input
                    type="text"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="Kategori adı"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Açıklama</label>
                  <textarea
                    value={newCategory.description}
                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none"
                    rows={3}
                    placeholder="Kategori açıklaması"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-700/50">
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsCreatingCategory(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={createCategory}
                  disabled={isLoading || !newCategory.name.trim()}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  Oluştur
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Item Modal */}
      {isCreatingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-md w-full">
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Yeni Malzeme</h3>
                <button
                  onClick={() => setIsCreatingItem(false)}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Kategori</label>
                  <select
                    value={newItem.category_id}
                    onChange={(e) => setNewItem({ ...newItem, category_id: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  >
                    <option value="">Kategori seçin</option>
                    {categories.filter(c => c.is_active).map(category => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Malzeme Adı *</label>
                  <input
                    type="text"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="Malzeme adı"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Açıklama</label>
                  <textarea
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none"
                    rows={2}
                    placeholder="Malzeme açıklaması"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Birim</label>
                    <select
                      value={newItem.unit}
                      onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    >
                      <option value="adet">Adet</option>
                      <option value="paket">Paket</option>
                      <option value="kutu">Kutu</option>
                      <option value="şişe">Şişe</option>
                      <option value="kg">Kg</option>
                      <option value="litre">Litre</option>
                      <option value="metre">Metre</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Birim Fiyat (₺)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newItem.estimated_unit_cost}
                      onChange={(e) => setNewItem({ ...newItem, estimated_unit_cost: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Tedarikçi</label>
                  <input
                    type="text"
                    value={newItem.supplier}
                    onChange={(e) => setNewItem({ ...newItem, supplier: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="Tedarikçi adı"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-700/50">
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsCreatingItem(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={createItem}
                  disabled={isLoading || !newItem.name.trim()}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  Oluştur
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
