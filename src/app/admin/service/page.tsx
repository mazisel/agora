'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Plus, 
  Save,
  X,
  Bus,
  MapPin,
  Users,
  Phone,
  Clock,
  Edit3,
  Trash2,
  Search,
  Filter
} from 'lucide-react';

interface ServiceRoute {
  id: string;
  route_name: string;
  description: string;
  departure_time: string;
  arrival_time: string;
  departure_location: string;
  arrival_location: string;
  stops: any[];
  capacity: number;
  driver_name: string;
  driver_phone: string;
  vehicle_plate: string;
  is_active: boolean;
  days_of_week: string[];
  notes: string;
  created_at: string;
  updated_at: string;
}

export default function AdminServicePage() {
  const [serviceRoutes, setServiceRoutes] = useState<ServiceRoute[]>([]);
  const [filteredRoutes, setFilteredRoutes] = useState<ServiceRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<ServiceRoute | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [newRouteData, setNewRouteData] = useState({
    route_name: '',
    description: '',
    departure_time: '',
    arrival_time: '',
    departure_location: '',
    arrival_location: '',
    stops: [] as any[],
    capacity: 50,
    driver_name: '',
    driver_phone: '',
    vehicle_plate: '',
    days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    notes: '',
    is_active: true
  });
  const { user } = useAuth();

  // Fetch service routes data
  const fetchServiceRoutes = async () => {
    try {
      const response = await fetch('/api/service-routes');
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch service routes');
      }
      
      setServiceRoutes(result.routes || []);
      setFilteredRoutes(result.routes || []);
    } catch (error) {
      console.error('Error fetching service routes:', error);
      setError('Servis güzergahları yüklenirken hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceRoutes();
  }, []);

  // Filter routes based on search and active status
  useEffect(() => {
    let filtered = serviceRoutes;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(route =>
        route.route_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        route.departure_location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        route.arrival_location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        route.driver_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        route.vehicle_plate?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Active status filter
    if (filterActive !== null) {
      filtered = filtered.filter(route => route.is_active === filterActive);
    }

    setFilteredRoutes(filtered);
  }, [serviceRoutes, searchTerm, filterActive]);

  const handleSaveRouteData = async () => {
    try {
      setIsLoading(true);

      // Validate required fields
      if (!newRouteData.route_name.trim() || !newRouteData.departure_time || !newRouteData.departure_location.trim() || !newRouteData.arrival_location.trim()) {
        setError('Güzergah adı, kalkış saati, kalkış ve varış noktaları zorunludur.');
        return;
      }

      let response;
      if (editingRoute) {
        // Update existing route
        response = await fetch(`/api/service-routes/${editingRoute.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newRouteData),
        });
      } else {
        // Create new route
        response = await fetch('/api/service-routes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newRouteData),
        });
      }

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Güzergah kaydedilirken hata oluştu.');
      }

      await fetchServiceRoutes();
      setNewRouteData({
        route_name: '',
        description: '',
        departure_time: '',
        arrival_time: '',
        departure_location: '',
        arrival_location: '',
        stops: [],
        capacity: 50,
        driver_name: '',
        driver_phone: '',
        vehicle_plate: '',
        days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        notes: '',
        is_active: true
      });
      setEditingRoute(null);
      setShowRouteModal(false);
      setError('');
    } catch (error: any) {
      console.error('Error saving route data:', error);
      setError(error.message || 'Güzergah kaydedilirken hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditRoute = (route: ServiceRoute) => {
    setEditingRoute(route);
    setNewRouteData({
      route_name: route.route_name,
      description: route.description || '',
      departure_time: route.departure_time,
      arrival_time: route.arrival_time || '',
      departure_location: route.departure_location,
      arrival_location: route.arrival_location,
      stops: route.stops || [],
      capacity: route.capacity,
      driver_name: route.driver_name || '',
      driver_phone: route.driver_phone || '',
      vehicle_plate: route.vehicle_plate || '',
      days_of_week: route.days_of_week || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      notes: route.notes || '',
      is_active: route.is_active
    });
    setShowRouteModal(true);
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!confirm('Bu güzergahı silmek istediğinizden emin misiniz?')) return;

    try {
      const response = await fetch(`/api/service-routes/${routeId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Güzergah silinirken hata oluştu.');
      }

      await fetchServiceRoutes();
    } catch (error: any) {
      console.error('Error deleting route:', error);
      setError(error.message || 'Güzergah silinirken hata oluştu.');
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '-';
    return timeString.slice(0, 5); // HH:MM format
  };

  const getDayLabel = (day: string) => {
    const days = {
      monday: 'Pazartesi',
      tuesday: 'Salı',
      wednesday: 'Çarşamba',
      thursday: 'Perşembe',
      friday: 'Cuma',
      saturday: 'Cumartesi',
      sunday: 'Pazar'
    };
    return days[day as keyof typeof days] || day;
  };

  if (isLoading && serviceRoutes.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 flex items-center justify-center shadow-lg">
              <Bus className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Servis Güzergahları Yönetimi</h1>
              <p className="text-slate-400">Tüm servis güzergahlarını yönetin</p>
            </div>
          </div>

          <button
            onClick={() => {
              setEditingRoute(null);
              setNewRouteData({
                route_name: '',
                description: '',
                departure_time: '',
                arrival_time: '',
                departure_location: '',
                arrival_location: '',
                stops: [],
                capacity: 50,
                driver_name: '',
                driver_phone: '',
                vehicle_plate: '',
                days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
                notes: '',
                is_active: true
              });
              setShowRouteModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl hover:from-emerald-600 hover:to-green-600 transition-all duration-200 font-medium shadow-lg shadow-emerald-500/25"
          >
            <Plus className="w-4 h-4" />
            Yeni Güzergah
          </button>
        </div>

        {/* Search and Filter */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Güzergah, lokasyon, şoför ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterActive === null ? 'all' : filterActive ? 'active' : 'inactive'}
              onChange={(e) => {
                const value = e.target.value;
                setFilterActive(value === 'all' ? null : value === 'active');
              }}
              className="px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
            >
              <option value="all">Tümü</option>
              <option value="active">Aktif</option>
              <option value="inactive">Pasif</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Bus className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Toplam Güzergah</p>
              <p className="text-white text-xl font-bold">{serviceRoutes.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Aktif Güzergah</p>
              <p className="text-white text-xl font-bold">{serviceRoutes.filter(r => r.is_active).length}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Toplam Kapasite</p>
              <p className="text-white text-xl font-bold">{serviceRoutes.reduce((sum, r) => sum + r.capacity, 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Search className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Filtrelenen</p>
              <p className="text-white text-xl font-bold">{filteredRoutes.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Service Routes List */}
      {filteredRoutes.length > 0 ? (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Güzergah</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Saat</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Lokasyonlar</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Şoför</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Kapasite</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Durum</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoutes.map((route) => (
                  <tr key={route.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <span className="text-white font-medium">{route.route_name}</span>
                        {route.description && (
                          <p className="text-slate-400 text-sm mt-1">{route.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Clock className="w-4 h-4 text-blue-400" />
                        <span>{formatTime(route.departure_time)}</span>
                        {route.arrival_time && <span>- {formatTime(route.arrival_time)}</span>}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-slate-300">
                        <MapPin className="w-4 h-4 text-green-400" />
                        <span className="text-sm">{route.departure_location} → {route.arrival_location}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {route.driver_name ? (
                        <div>
                          <span className="text-slate-300">{route.driver_name}</span>
                          {route.driver_phone && (
                            <p className="text-slate-400 text-sm">{route.driver_phone}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Users className="w-4 h-4 text-purple-400" />
                        <span>{route.capacity}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        route.is_active 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {route.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditRoute(route)}
                          className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                          title="Düzenle"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRoute(route.id)}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-800/30 rounded-2xl border border-slate-700/50">
          <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bus className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {searchTerm || filterActive !== null ? 'Sonuç Bulunamadı' : 'Henüz Güzergah Yok'}
          </h3>
          <p className="text-slate-400 mb-6">
            {searchTerm || filterActive !== null 
              ? 'Arama kriterlerinize uygun güzergah bulunamadı.'
              : 'İlk servis güzergahınızı oluşturmak için "Yeni Güzergah" butonuna tıklayın.'
            }
          </p>
          {(searchTerm || filterActive !== null) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterActive(null);
              }}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
            >
              Filtreleri Temizle
            </button>
          )}
        </div>
      )}

      {/* Add/Edit Route Modal */}
      {showRouteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">
                  {editingRoute ? 'Güzergah Düzenle' : 'Yeni Güzergah Ekle'}
                </h3>
                <button
                  onClick={() => {
                    setShowRouteModal(false);
                    setEditingRoute(null);
                  }}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Güzergah Adı *</label>
                    <input
                      type="text"
                      value={newRouteData.route_name}
                      onChange={(e) => setNewRouteData({ ...newRouteData, route_name: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                      placeholder="Merkez - Fabrika"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Kapasite</label>
                    <input
                      type="number"
                      value={newRouteData.capacity}
                      onChange={(e) => setNewRouteData({ ...newRouteData, capacity: parseInt(e.target.value) || 50 })}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                      placeholder="50"
                      min="1"
                      max="100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Açıklama</label>
                  <input
                    type="text"
                    value={newRouteData.description}
                    onChange={(e) => setNewRouteData({ ...newRouteData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                    placeholder="Ana merkez ofisten fabrikaya servis"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Kalkış Saati *</label>
                    <input
                      type="time"
                      value={newRouteData.departure_time}
                      onChange={(e) => setNewRouteData({ ...newRouteData, departure_time: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Varış Saati</label>
                    <input
                      type="time"
                      value={newRouteData.arrival_time}
                      onChange={(e) => setNewRouteData({ ...newRouteData, arrival_time: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Kalkış Noktası *</label>
                    <input
                      type="text"
                      value={newRouteData.departure_location}
                      onChange={(e) => setNewRouteData({ ...newRouteData, departure_location: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                      placeholder="Merkez Ofis"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Varış Noktası *</label>
                    <input
                      type="text"
                      value={newRouteData.arrival_location}
                      onChange={(e) => setNewRouteData({ ...newRouteData, arrival_location: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                      placeholder="Fabrika"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Şoför Adı</label>
                    <input
                      type="text"
                      value={newRouteData.driver_name}
                      onChange={(e) => setNewRouteData({ ...newRouteData, driver_name: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                      placeholder="Ahmet Yılmaz"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Şoför Telefonu</label>
                    <input
                      type="tel"
                      value={newRouteData.driver_phone}
                      onChange={(e) => setNewRouteData({ ...newRouteData, driver_phone: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                      placeholder="+90 555 123 4567"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Araç Plakası</label>
                  <input
                    type="text"
                    value={newRouteData.vehicle_plate}
                    onChange={(e) => setNewRouteData({ ...newRouteData, vehicle_plate: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                    placeholder="34 ABC 123"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Çalışma Günleri</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { key: 'monday', label: 'Pazartesi' },
                      { key: 'tuesday', label: 'Salı' },
                      { key: 'wednesday', label: 'Çarşamba' },
                      { key: 'thursday', label: 'Perşembe' },
                      { key: 'friday', label: 'Cuma' },
                      { key: 'saturday', label: 'Cumartesi' },
                      { key: 'sunday', label: 'Pazar' }
                    ].map((day) => (
                      <label key={day.key} className="flex items-center gap-2 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={newRouteData.days_of_week.includes(day.key)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewRouteData({
                                ...newRouteData,
                                days_of_week: [...newRouteData.days_of_week, day.key]
                              });
                            } else {
                              setNewRouteData({
                                ...newRouteData,
                                days_of_week: newRouteData.days_of_week.filter(d => d !== day.key)
                              });
                            }
                          }}
                          className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500 focus:ring-2"
                        />
                        {day.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Durum</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="radio"
                        name="is_active"
                        checked={newRouteData.is_active === true}
                        onChange={() => setNewRouteData({ ...newRouteData, is_active: true })}
                        className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 focus:ring-emerald-500 focus:ring-2"
                      />
                      Aktif
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="radio"
                        name="is_active"
                        checked={newRouteData.is_active === false}
                        onChange={() => setNewRouteData({ ...newRouteData, is_active: false })}
                        className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 focus:ring-emerald-500 focus:ring-2"
                      />
                      Pasif
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Notlar</label>
                  <textarea
                    value={newRouteData.notes}
                    onChange={(e) => setNewRouteData({ ...newRouteData, notes: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none"
                    rows={3}
                    placeholder="Ek bilgiler ve notlar..."
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-700/50">
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowRouteModal(false);
                    setEditingRoute(null);
                  }}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleSaveRouteData}
                  disabled={isLoading || !newRouteData.route_name || !newRouteData.departure_time || !newRouteData.departure_location || !newRouteData.arrival_location}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl hover:from-emerald-600 hover:to-green-600 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingRoute ? 'Güncelle' : 'Kaydet'}
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
