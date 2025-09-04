'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Car, Plus, Settings, Users, BarChart3, Calendar, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface VehicleRequest {
  id: string;
  request_date: string;
  start_time: string;
  end_time: string;
  destination: string;
  purpose: string;
  passenger_count: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  created_at: string;
  user_profiles: {
    first_name: string;
    last_name: string;
    department?: string;
  };
  vehicles?: {
    plate_number: string;
    brand: string;
    model: string;
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
  is_active: boolean;
}

interface Stats {
  totalRequests: number;
  pendingRequests: number;
  totalVehicles: number;
  availableVehicles: number;
}

export default function VehicleRequestsModulePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalRequests: 0,
    pendingRequests: 0,
    totalVehicles: 0,
    availableVehicles: 0
  });
  const [recentRequests, setRecentRequests] = useState<VehicleRequest[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [vehicleFormData, setVehicleFormData] = useState({
    plate_number: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    fuel_type: 'benzin',
    capacity: 5,
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch requests
      const requestsResponse = await fetch('/api/admin/vehicle-requests');
      const requestsData = await requestsResponse.json();
      
      if (requestsData.success) {
        const requests = requestsData.requests;
        setRecentRequests(requests.slice(0, 5)); // Son 5 talep
        
        setStats(prev => ({
          ...prev,
          totalRequests: requests.length,
          pendingRequests: requests.filter((r: VehicleRequest) => r.status === 'pending').length
        }));
      }

      // Fetch vehicles
      const vehiclesResponse = await fetch('/api/modules/vehicles');
      const vehiclesData = await vehiclesResponse.json();
      
      if (vehiclesData.success) {
        const vehicleList = vehiclesData.vehicles;
        setVehicles(vehicleList.slice(0, 4)); // İlk 4 araç
        
        setStats(prev => ({
          ...prev,
          totalVehicles: vehicleList.length,
          availableVehicles: vehicleList.filter((v: Vehicle) => v.is_available && v.is_active).length
        }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-500/20';
      case 'approved': return 'text-green-400 bg-green-500/20';
      case 'rejected': return 'text-red-400 bg-red-500/20';
      case 'completed': return 'text-blue-400 bg-blue-500/20';
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

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/modules/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vehicleFormData),
      });

      const data = await response.json();

      if (data.success) {
        setShowAddVehicleModal(false);
        setVehicleFormData({
          plate_number: '',
          brand: '',
          model: '',
          year: new Date().getFullYear(),
          color: '',
          fuel_type: 'benzin',
          capacity: 5,
          notes: ''
        });
        fetchData(); // Verileri yenile
      } else {
        alert(data.error || 'Araç eklenirken hata oluştu');
      }
    } catch (error) {
      console.error('Error adding vehicle:', error);
      alert('Araç eklenirken hata oluştu');
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link 
            href="/admin/modules"
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Car className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Araç Talep ve Rezervasyon</h1>
              <p className="text-slate-400">Modül yönetimi ve istatistikler</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Link
            href="/admin/modules/vehicle-requests"
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Talepleri Yönet</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Toplam Talep</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.totalRequests}</p>
            </div>
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Bekleyen Talep</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.pendingRequests}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Toplam Araç</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.totalVehicles}</p>
            </div>
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
              <Car className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Müsait Araç</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.availableVehicles}</p>
            </div>
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Requests */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Son Talepler</h2>
          <Link
            href="/admin/modules/vehicle-requests"
            className="text-blue-400 hover:text-blue-300 text-sm font-medium"
          >
            Tümünü Gör →
          </Link>
        </div>

        {recentRequests.length === 0 ? (
          <div className="text-center py-8">
            <Car className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Henüz araç talebi yok</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Car className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {request.user_profiles.first_name} {request.user_profiles.last_name}
                    </p>
                    <p className="text-slate-400 text-sm">
                      {request.destination} • {new Date(request.request_date).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {request.vehicles && (
                    <span className="text-slate-300 text-sm">
                      {request.vehicles.brand} {request.vehicles.model}
                    </span>
                  )}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                    {getStatusText(request.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Vehicle Fleet */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Araç Filosu</h2>
          <button 
            onClick={() => setShowAddVehicleModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Araç Ekle</span>
          </button>
        </div>

        {vehicles.length === 0 ? (
          <div className="text-center py-8">
            <Car className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Henüz araç eklenmemiş</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="p-4 bg-slate-700/30 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Car className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    vehicle.is_available && vehicle.is_active 
                      ? 'text-green-400 bg-green-500/20' 
                      : 'text-red-400 bg-red-500/20'
                  }`}>
                    {vehicle.is_available && vehicle.is_active ? 'Müsait' : 'Meşgul'}
                  </span>
                </div>
                
                <h3 className="text-white font-medium">{vehicle.brand} {vehicle.model}</h3>
                <p className="text-slate-400 text-sm">{vehicle.plate_number}</p>
                <p className="text-slate-500 text-xs mt-1">
                  {vehicle.color} • {vehicle.capacity} kişilik • {vehicle.fuel_type}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/admin/modules/vehicle-requests"
          className="p-6 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 hover:bg-slate-700/50 transition-all group"
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
              <Settings className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-medium">Talepleri Yönet</h3>
              <p className="text-slate-400 text-sm">Araç taleplerini incele ve onayla</p>
            </div>
          </div>
        </Link>

        <div className="p-6 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 hover:bg-slate-700/50 transition-all group cursor-pointer">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
              <Car className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-white font-medium">Araç Yönetimi</h3>
              <p className="text-slate-400 text-sm">Araç filosunu yönet</p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 hover:bg-slate-700/50 transition-all group cursor-pointer">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
              <BarChart3 className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-white font-medium">Raporlar</h3>
              <p className="text-slate-400 text-sm">Kullanım istatistikleri</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Vehicle Modal */}
      {showAddVehicleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-md w-full mx-4">
            <div className="p-6 border-b border-slate-700/50">
              <h3 className="text-xl font-bold text-white">Yeni Araç Ekle</h3>
            </div>

            <form onSubmit={handleAddVehicle} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Plaka
                  </label>
                  <input
                    type="text"
                    value={vehicleFormData.plate_number}
                    onChange={(e) => setVehicleFormData({ ...vehicleFormData, plate_number: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="34 ABC 123"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Marka
                  </label>
                  <input
                    type="text"
                    value={vehicleFormData.brand}
                    onChange={(e) => setVehicleFormData({ ...vehicleFormData, brand: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="Toyota"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Model
                  </label>
                  <input
                    type="text"
                    value={vehicleFormData.model}
                    onChange={(e) => setVehicleFormData({ ...vehicleFormData, model: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="Corolla"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Yıl
                  </label>
                  <input
                    type="number"
                    value={vehicleFormData.year}
                    onChange={(e) => setVehicleFormData({ ...vehicleFormData, year: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    min="1990"
                    max={new Date().getFullYear() + 1}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Renk
                  </label>
                  <input
                    type="text"
                    value={vehicleFormData.color}
                    onChange={(e) => setVehicleFormData({ ...vehicleFormData, color: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="Beyaz"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Yakıt Türü
                  </label>
                  <select
                    value={vehicleFormData.fuel_type}
                    onChange={(e) => setVehicleFormData({ ...vehicleFormData, fuel_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="benzin">Benzin</option>
                    <option value="dizel">Dizel</option>
                    <option value="elektrik">Elektrik</option>
                    <option value="hibrit">Hibrit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Kapasite
                </label>
                <input
                  type="number"
                  value={vehicleFormData.capacity}
                  onChange={(e) => setVehicleFormData({ ...vehicleFormData, capacity: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  min="1"
                  max="50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Notlar
                </label>
                <textarea
                  value={vehicleFormData.notes}
                  onChange={(e) => setVehicleFormData({ ...vehicleFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  rows={3}
                  placeholder="İsteğe bağlı notlar..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddVehicleModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Araç Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
