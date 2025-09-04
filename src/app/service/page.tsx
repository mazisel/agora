'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Bus,
  MapPin,
  Users,
  Phone,
  Clock,
  Calendar,
  Info
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

export default function ServicePage() {
  const [serviceRoutes, setServiceRoutes] = useState<ServiceRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  // Fetch service routes data
  const fetchServiceRoutes = async () => {
    try {
      const response = await fetch('/api/service-routes');
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch service routes');
      }
      
      // Only show active routes for regular users
      const activeRoutes = (result.routes || []).filter((route: ServiceRoute) => route.is_active);
      setServiceRoutes(activeRoutes);
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


  if (isLoading) {
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
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-500 flex items-center justify-center">
            <Bus className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Servis Saatleri ve Güzergahları</h1>
            <p className="text-slate-400">Güncel servis bilgileri ve güzergahlar</p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* All Service Routes */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50">
        <div className="p-6 border-b border-slate-700/50">
          <h2 className="text-lg font-semibold text-white">Tüm Servis Güzergahları</h2>
          <p className="text-slate-400 text-sm mt-1">Mevcut tüm aktif servis güzergahları</p>
        </div>

        {serviceRoutes.length > 0 ? (
          <div className="divide-y divide-slate-700/50">
            {serviceRoutes.map((route) => (
              <div key={route.id} className="p-6 hover:bg-slate-700/20 transition-colors">
                {/* Route Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
                      <Bus className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{route.route_name}</h3>
                      {route.description && (
                        <p className="text-slate-400 text-sm">{route.description}</p>
                      )}
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium border border-green-500/30">
                    Aktif
                  </span>
                </div>

                {/* Route Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Time and Locations */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <span className="font-medium">Saat:</span>
                      <span>{formatTime(route.departure_time)}</span>
                      {route.arrival_time && <span>- {formatTime(route.arrival_time)}</span>}
                    </div>

                    <div className="flex items-start gap-2 text-slate-300">
                      <MapPin className="w-4 h-4 text-green-400 mt-0.5" />
                      <div>
                        <div className="font-medium">Güzergah:</div>
                        <div className="text-sm">{route.departure_location} → {route.arrival_location}</div>
                      </div>
                    </div>
                  </div>

                  {/* Driver Info */}
                  <div className="space-y-3">
                    {route.driver_name && (
                      <div className="flex items-start gap-2 text-slate-300">
                        <Phone className="w-4 h-4 text-yellow-400 mt-0.5" />
                        <div>
                          <div className="font-medium">Şoför:</div>
                          <div className="text-sm">{route.driver_name}</div>
                          {route.driver_phone && (
                            <div className="text-sm text-slate-400">{route.driver_phone}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Working Days and Vehicle */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center gap-2 text-slate-300 mb-2">
                        <Calendar className="w-4 h-4 text-indigo-400" />
                        <span className="font-medium">Çalışma Günleri:</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {route.days_of_week.map((day) => (
                          <span key={day} className="px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded text-xs border border-indigo-500/30">
                            {getDayLabel(day)}
                          </span>
                        ))}
                      </div>
                    </div>

                    {route.vehicle_plate && (
                      <div className="text-sm text-slate-400">
                        <span className="font-medium">Araç Plakası:</span> {route.vehicle_plate}
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {route.notes && (
                  <div className="mt-4 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-slate-400 mt-0.5" />
                      <div>
                        <div className="font-medium text-slate-300 text-sm">Notlar:</div>
                        <div className="text-slate-400 text-sm">{route.notes}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Bus className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Henüz Aktif Güzergah Yok</h3>
            <p className="text-slate-400">Şu anda aktif servis güzergahı bulunmamaktadır.</p>
          </div>
        )}
      </div>
    </div>
  );
}
