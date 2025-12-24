'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Save,
  X,
  UtensilsCrossed,
  Bus,
  Settings,
  Calendar,
  Clock,
  Edit3,
  Trash2,
  MapPin,
  Phone,
  Receipt,
  Users,
  Monitor,
  Coffee
} from 'lucide-react';
import ExpenseEntriesManagement from '@/components/admin/ExpenseEntriesManagement';

interface Module {
  id: string;
  name: string;
  description: string;
  icon: string;
  is_active: boolean;
  settings: any;
  created_at: string;
  updated_at: string;
}

interface MenuData {
  id: string;
  date: string;
  soup: string;
  main_course: string;
  side_dish: string;
  extra: string;
  extra_type: string;
  created_at: string;
  updated_at: string;
}

interface ServiceRoute {
  id: string;
  route_name: string;
  description: string;
  departure_time: string;
  arrival_time: string;
  departure_location: string;
  arrival_location: string;
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

interface MeetingRoom {
  id: string;
  name: string;
  location: string;
  capacity: number;
  description: string;
  equipment: string[];
  is_available: boolean;
  is_active: boolean;
  image_url: string;
  created_at: string;
  updated_at: string;
}

interface MeetingRoomRequest {
  id: string;
  user_id: string;
  room_id: string;
  title: string;
  description: string;
  meeting_date: string;
  start_time: string;
  end_time: string;
  participant_count: number;
  equipment_needed: string[];
  catering_needed: boolean;
  catering_details: string;
  status: string;
  admin_notes: string;
  reviewed_by: string;
  reviewed_at: string;
  created_at: string;
  updated_at: string;
  user_profiles?: {
    first_name: string;
    last_name: string;
  };
  meeting_rooms?: {
    name: string;
    location: string;
  };
}

export default function ModuleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const moduleId = params.moduleId as string;

  const [module, setModule] = useState<Module | null>(null);
  const [menuData, setMenuData] = useState<MenuData[]>([]);
  const [serviceRoutes, setServiceRoutes] = useState<ServiceRoute[]>([]);
  const [meetingRooms, setMeetingRooms] = useState<MeetingRoom[]>([]);
  const [meetingRoomRequests, setMeetingRoomRequests] = useState<MeetingRoomRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuData | null>(null);
  const [editingRoute, setEditingRoute] = useState<ServiceRoute | null>(null);
  const [editingRoom, setEditingRoom] = useState<MeetingRoom | null>(null);
  const [newMenuData, setNewMenuData] = useState({
    date: new Date().toISOString().split('T')[0],
    soup: '',
    main_course: '',
    side_dish: '',
    extra: '',
    extra_type: 'dessert'
  });
  const [newRouteData, setNewRouteData] = useState({
    route_name: '',
    description: '',
    departure_time: '',
    arrival_time: '',
    departure_location: '',
    arrival_location: '',
    capacity: 20,
    driver_name: '',
    driver_phone: '',
    vehicle_plate: '',
    is_active: true,
    days_of_week: [] as string[],
    notes: ''
  });
  const [newRoomData, setNewRoomData] = useState({
    name: '',
    location: '',
    capacity: 8,
    description: '',
    equipment: [] as string[],
    is_available: true,
    is_active: true,
    image_url: ''
  });
  const { user, session } = useAuth();

  // Fetch module details
  const fetchModule = async () => {
    try {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq('id', moduleId)
        .single();

      if (error) throw error;
      setModule(data);
      // Don't set loading to false here, wait for second effect
    } catch (error) {
      console.error('Error fetching module:', error);
      setError('Modül bilgileri yüklenirken hata oluştu.');
      setIsLoading(false);
    }
  };

  // Fetch menu data (only for food module)
  const fetchMenuData = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_menu')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setMenuData(data || []);
    } catch (error) {
      console.error('Error fetching menu data:', error);
    }
  };

  // Fetch service routes data (only for service module)
  const fetchServiceRoutes = async () => {
    try {
      const response = await fetch('/api/service-routes');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch service routes');
      }

      setServiceRoutes(result.routes || []);
    } catch (error) {
      console.error('Error fetching service routes:', error);
    }
  };

  // Fetch meeting rooms data (only for meeting rooms module)
  const fetchMeetingRooms = async () => {
    try {
      const response = await fetch('/api/modules/meeting-rooms');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch meeting rooms');
      }

      setMeetingRooms(result.rooms || []);
    } catch (error) {
      console.error('Error fetching meeting rooms:', error);
    }
  };

  // Fetch meeting room requests data (only for meeting rooms module)
  const fetchMeetingRoomRequests = async () => {
    if (!session?.access_token) return;

    try {
      const response = await fetch('/api/admin/meeting-room-requests', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch meeting room requests');
      }

      setMeetingRoomRequests(result.requests || []);
    } catch (error) {
      console.error('Error fetching meeting room requests:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchModule();
    };
    loadData();
  }, [moduleId, session]);

  // Effect to load module-specific data once module is loaded
  useEffect(() => {
    const loadModuleData = async () => {
      if (!module) return;

      if (module.name === 'Yemek Listesi') {
        await fetchMenuData();
      } else if (module.name === 'Personel Servisleri') {
        await fetchServiceRoutes();
      } else if (module.name === 'Toplantı Odaları') {
        await fetchMeetingRooms();
        if (session?.access_token) {
          await fetchMeetingRoomRequests();
        }
      }
      setIsLoading(false);
    };

    loadModuleData();
  }, [module, session]); // Dependency on module ensures this runs after fetchModule succeeds

  const handleSaveMenuData = async () => {
    try {
      setIsLoading(true);

      // Validate required fields
      if (!newMenuData.main_course.trim()) {
        setError('Ana yemek alanı zorunludur.');
        return;
      }

      if (editingMenu) {
        // Update existing menu
        const { error } = await supabase
          .from('daily_menu')
          .update(newMenuData)
          .eq('id', editingMenu.id);

        if (error) {
          console.error('Supabase update error:', error);
          throw new Error(`Güncelleme hatası: ${error.message}`);
        }
      } else {
        // Create new menu
        const { error } = await supabase
          .from('daily_menu')
          .insert([newMenuData]);

        if (error) {
          console.error('Supabase insert error:', error);
          throw new Error(`Ekleme hatası: ${error.message}`);
        }
      }

      await fetchMenuData();
      setNewMenuData({
        date: new Date().toISOString().split('T')[0],
        soup: '',
        main_course: '',
        side_dish: '',
        extra: '',
        extra_type: 'dessert'
      });
      setEditingMenu(null);
      setShowMenuModal(false);
      setError(''); // Clear any previous errors
    } catch (error: any) {
      console.error('Error saving menu data:', error);
      setError(error.message || 'Menü kaydedilirken hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditMenu = (menu: MenuData) => {
    setEditingMenu(menu);
    setNewMenuData({
      date: menu.date,
      soup: menu.soup || '',
      main_course: menu.main_course,
      side_dish: menu.side_dish || '',
      extra: menu.extra || '',
      extra_type: menu.extra_type || 'dessert'
    });
    setShowMenuModal(true);
  };

  const handleDeleteMenu = async (menuId: string) => {
    if (!confirm('Bu menüyü silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('daily_menu')
        .delete()
        .eq('id', menuId);

      if (error) throw error;
      await fetchMenuData();
    } catch (error) {
      console.error('Error deleting menu:', error);
      setError('Menü silinirken hata oluştu.');
    }
  };

  // Service route functions
  const handleSaveRouteData = async () => {
    try {
      setIsLoading(true);

      // Validate required fields
      if (!newRouteData.route_name.trim() || !newRouteData.departure_time || !newRouteData.departure_location.trim() || !newRouteData.arrival_location.trim()) {
        setError('Güzergah adı, kalkış saati, kalkış ve varış noktaları zorunludur.');
        return;
      }

      const routeData = {
        ...newRouteData,
        days_of_week: newRouteData.days_of_week.length > 0 ? newRouteData.days_of_week : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      };

      if (editingRoute) {
        // Update existing route
        const response = await fetch(`/api/service-routes/${editingRoute.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(routeData)
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Güzergah güncellenemedi');
        }
      } else {
        // Create new route
        const response = await fetch('/api/service-routes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(routeData)
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Güzergah oluşturulamadı');
        }
      }

      await fetchServiceRoutes();
      setNewRouteData({
        route_name: '',
        description: '',
        departure_time: '',
        arrival_time: '',
        departure_location: '',
        arrival_location: '',
        capacity: 20,
        driver_name: '',
        driver_phone: '',
        vehicle_plate: '',
        is_active: true,
        days_of_week: [],
        notes: ''
      });
      setEditingRoute(null);
      setShowServiceModal(false);
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
      capacity: route.capacity,
      driver_name: route.driver_name || '',
      driver_phone: route.driver_phone || '',
      vehicle_plate: route.vehicle_plate || '',
      is_active: route.is_active,
      days_of_week: route.days_of_week || [],
      notes: route.notes || ''
    });
    setShowServiceModal(true);
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!confirm('Bu güzergahı silmek istediğinizden emin misiniz?')) return;

    try {
      const response = await fetch(`/api/service-routes/${routeId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Güzergah silinemedi');
      }

      await fetchServiceRoutes();
    } catch (error: any) {
      console.error('Error deleting route:', error);
      setError(error.message || 'Güzergah silinirken hata oluştu.');
    }
  };

  const toggleDay = (day: string) => {
    setNewRouteData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day]
    }));
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

  // Meeting room functions
  const handleSaveRoomData = async () => {
    try {
      setIsLoading(true);

      // Validate required fields
      if (!newRoomData.name.trim() || !newRoomData.location.trim()) {
        setError('Oda adı ve konum alanları zorunludur.');
        return;
      }

      if (editingRoom) {
        // Update existing room
        const response = await fetch(`/api/modules/meeting-rooms`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...newRoomData, id: editingRoom.id })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Toplantı odası güncellenemedi');
        }
      } else {
        // Create new room
        const response = await fetch('/api/modules/meeting-rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newRoomData)
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Toplantı odası oluşturulamadı');
        }
      }

      await fetchMeetingRooms();
      setNewRoomData({
        name: '',
        location: '',
        capacity: 8,
        description: '',
        equipment: [],
        is_available: true,
        is_active: true,
        image_url: ''
      });
      setEditingRoom(null);
      setShowRoomModal(false);
      setError('');
    } catch (error: any) {
      console.error('Error saving room data:', error);
      setError(error.message || 'Toplantı odası kaydedilirken hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditRoom = (room: MeetingRoom) => {
    setEditingRoom(room);
    setNewRoomData({
      name: room.name,
      location: room.location,
      capacity: room.capacity,
      description: room.description || '',
      equipment: room.equipment || [],
      is_available: room.is_available,
      is_active: room.is_active,
      image_url: room.image_url || ''
    });
    setShowRoomModal(true);
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('Bu toplantı odasını silmek istediğinizden emin misiniz?')) return;

    try {
      const response = await fetch(`/api/modules/meeting-rooms`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: roomId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Toplantı odası silinemedi');
      }

      await fetchMeetingRooms();
    } catch (error: any) {
      console.error('Error deleting room:', error);
      setError(error.message || 'Toplantı odası silinirken hata oluştu.');
    }
  };

  const toggleEquipment = (equipment: string) => {
    setNewRoomData(prev => ({
      ...prev,
      equipment: prev.equipment.includes(equipment)
        ? prev.equipment.filter(e => e !== equipment)
        : [...prev.equipment, equipment]
    }));
  };

  const getStatusLabel = (status: string) => {
    const statuses = {
      pending: 'Beklemede',
      approved: 'Onaylandı',
      rejected: 'Reddedildi',
      cancelled: 'İptal Edildi'
    };
    return statuses[status as keyof typeof statuses] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/20 text-green-400';
      case 'rejected':
        return 'bg-red-500/20 text-red-400';
      case 'cancelled':
        return 'bg-gray-500/20 text-gray-400';
      default:
        return 'bg-yellow-500/20 text-yellow-400';
    }
  };

  const handleRequestStatusUpdate = async (requestId: string, status: string, adminNotes?: string) => {
    try {
      const response = await fetch(`/api/admin/meeting-room-requests`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: requestId,
          status,
          admin_notes: adminNotes || '',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Talep durumu güncellenemedi');
      }

      await fetchMeetingRoomRequests();
    } catch (error: any) {
      console.error('Error updating request status:', error);
      setError(error.message || 'Talep durumu güncellenirken hata oluştu.');
    }
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'UtensilsCrossed':
        return UtensilsCrossed;
      case 'Bus':
        return Bus;
      case 'Receipt':
        return Receipt;
      default:
        return Settings;
    }
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

  if (!module) {
    return (
      <div className="text-center py-16">
        <h3 className="text-xl font-semibold text-white mb-2">Modül Bulunamadı</h3>
        <p className="text-slate-400 mb-6">Aradığınız modül bulunamadı.</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Geri Dön
        </button>
      </div>
    );
  }

  const IconComponent = getIconComponent(module.icon);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 bg-slate-800/50 border border-slate-700/50 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${module.is_active ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700/50 text-slate-500'
              }`}>
              <IconComponent className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{module.name}</h2>
              <p className="text-slate-400">{module.description}</p>
            </div>
          </div>

          <div className="ml-auto">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${module.is_active
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
              }`}>
              {module.is_active ? 'Aktif' : 'Pasif'}
            </span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Module Content */}
      {module.name === 'Yemek Listesi' && (
        <div>
          {/* Menu Management Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Günlük Menüler</h3>
              <p className="text-slate-400">Yemek menülerini yönetin</p>
            </div>
            <button
              onClick={() => {
                setEditingMenu(null);
                setNewMenuData({
                  date: new Date().toISOString().split('T')[0],
                  soup: '',
                  main_course: '',
                  side_dish: '',
                  extra: '',
                  extra_type: 'dessert'
                });
                setShowMenuModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Yeni Menü
            </button>
          </div>

          {/* Menu List */}
          {menuData.length > 0 ? (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Tarih</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Çorba</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Ana Yemek</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Garnitür</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Ekstra</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menuData.map((menu) => (
                      <tr key={menu.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                        <td className="py-4 px-6">
                          <span className="text-white font-medium">
                            {new Date(menu.date).toLocaleDateString('tr-TR')}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-slate-300">{menu.soup || '-'}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-slate-300">{menu.main_course}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-slate-300">{menu.side_dish || '-'}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-slate-300">
                            {menu.extra ? `${menu.extra} (${menu.extra_type === 'dessert' ? 'Tatlı' :
                              menu.extra_type === 'salad' ? 'Salata' : 'İçecek'
                              })` : '-'}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditMenu(menu)}
                              className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                              title="Düzenle"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteMenu(menu.id)}
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
                <UtensilsCrossed className="w-8 h-8 text-slate-600" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Henüz Menü Yok</h3>
              <p className="text-slate-400 mb-6">İlk menünüzü oluşturmak için "Yeni Menü" butonuna tıklayın.</p>
            </div>
          )}
        </div>
      )}

      {/* Service Routes Management */}
      {module.name === 'Servis Saat ve Güzergah' && (
        <div>
          {/* Service Management Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Servis Güzergahları</h3>
              <p className="text-slate-400">Servis güzergahlarını yönetin</p>
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
                  capacity: 20,
                  driver_name: '',
                  driver_phone: '',
                  vehicle_plate: '',
                  is_active: true,
                  days_of_week: [],
                  notes: ''
                });
                setShowServiceModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Yeni Güzergah
            </button>
          </div>

          {/* Service Routes List */}
          {serviceRoutes.length > 0 ? (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Güzergah</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Saat</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Güzergah</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Şoför</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Durum</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceRoutes.map((route) => (
                      <tr key={route.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                        <td className="py-4 px-6">
                          <div>
                            <span className="text-white font-medium">{route.route_name}</span>
                            {route.description && (
                              <p className="text-slate-400 text-xs mt-1">{route.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-slate-300 text-sm">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {route.departure_time.slice(0, 5)}
                              {route.arrival_time && ` - ${route.arrival_time.slice(0, 5)}`}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-slate-300 text-sm">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {route.departure_location} → {route.arrival_location}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-slate-300 text-sm">
                            {route.driver_name ? (
                              <div>
                                <div className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {route.driver_name}
                                </div>
                                {route.driver_phone && (
                                  <div className="text-slate-400 text-xs">{route.driver_phone}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${route.is_active
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                            }`}>
                            {route.is_active ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditRoute(route)}
                              className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
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
              <h3 className="text-lg font-semibold text-white mb-2">Henüz Güzergah Yok</h3>
              <p className="text-slate-400 mb-6">İlk güzergahınızı oluşturmak için "Yeni Güzergah" butonuna tıklayın.</p>
            </div>
          )}
        </div>
      )}

      {/* Expense Entry Management */}
      {module.name === 'Masraf Girişi' && (
        <div>
          {/* Expense Management Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Masraf Girişi Yönetimi</h3>
              <p className="text-slate-400">Personel masraf girişlerini yönetin ve onaylayın</p>
            </div>
          </div>

          {/* Expense Management Component */}
          <ExpenseEntriesManagement />
        </div>
      )}

      {/* Meeting Rooms Management */}
      {module.name === 'Toplantı Odası Rezervasyon' && (
        <div className="space-y-8">
          {/* Meeting Rooms Section */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Toplantı Odaları</h3>
                <p className="text-slate-400">Toplantı odalarını yönetin</p>
              </div>
              <button
                onClick={() => {
                  setEditingRoom(null);
                  setNewRoomData({
                    name: '',
                    location: '',
                    capacity: 8,
                    description: '',
                    equipment: [],
                    is_available: true,
                    is_active: true,
                    image_url: ''
                  });
                  setShowRoomModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Yeni Oda
              </button>
            </div>

            {/* Meeting Rooms List */}
            {meetingRooms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {meetingRooms.map((room) => (
                  <div key={room.id} className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-semibold text-white mb-1">{room.name}</h4>
                          <div className="flex items-center gap-1 text-slate-400 text-sm">
                            <MapPin className="w-3 h-3" />
                            {room.location}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${room.is_available && room.is_active
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                            }`}>
                            {room.is_available && room.is_active ? 'Müsait' : 'Müsait Değil'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3 mb-4">
                        <div className="flex items-center gap-2 text-slate-300 text-sm">
                          <Users className="w-4 h-4" />
                          <span>{room.capacity} kişi kapasiteli</span>
                        </div>


                        {room.equipment && room.equipment.length > 0 && (
                          <div className="flex items-start gap-2 text-slate-300 text-sm">
                            <Monitor className="w-4 h-4 mt-0.5" />
                            <div className="flex flex-wrap gap-1">
                              {room.equipment.map((eq, index) => (
                                <span key={index} className="px-2 py-1 bg-slate-700/50 rounded text-xs">
                                  {eq}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {room.description && (
                          <p className="text-slate-400 text-sm">{room.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditRoom(room)}
                          className="flex-1 px-3 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-all text-sm font-medium"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(room.id)}
                          className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all text-sm font-medium"
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-slate-800/30 rounded-2xl border border-slate-700/50 mb-8">
                <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-slate-600" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Henüz Toplantı Odası Yok</h3>
                <p className="text-slate-400 mb-6">İlk toplantı odanızı oluşturmak için "Yeni Oda" butonuna tıklayın.</p>
              </div>
            )}
          </div>

          {/* Meeting Room Requests Section */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Rezervasyon Talepleri</h3>
                <p className="text-slate-400">Toplantı odası rezervasyon taleplerini yönetin</p>
              </div>
            </div>

            {/* Meeting Room Requests List */}
            {meetingRoomRequests.length > 0 ? (
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700/50">
                        <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Talep Eden</th>
                        <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Oda</th>
                        <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Toplantı</th>
                        <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Tarih & Saat</th>
                        <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Durum</th>
                        <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meetingRoomRequests.map((request) => (
                        <tr key={request.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                          <td className="py-4 px-6">
                            <div>
                              <span className="text-white font-medium">
                                {request.user_profiles?.first_name} {request.user_profiles?.last_name}
                              </span>
                              <div className="text-slate-400 text-xs">
                                {new Date(request.created_at).toLocaleDateString('tr-TR')}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div>
                              <span className="text-slate-300 font-medium">{request.meeting_rooms?.name}</span>
                              <div className="text-slate-400 text-xs">{request.meeting_rooms?.location}</div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div>
                              <span className="text-slate-300 font-medium">{request.title}</span>
                              <div className="text-slate-400 text-xs flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {request.participant_count} kişi
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="text-slate-300 text-sm">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(request.meeting_date).toLocaleDateString('tr-TR')}
                              </div>
                              <div className="flex items-center gap-1 text-slate-400 text-xs">
                                <Clock className="w-3 h-3" />
                                {request.start_time.slice(0, 5)} - {request.end_time.slice(0, 5)}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(request.status)}`}>
                              {getStatusLabel(request.status)}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            {request.status === 'pending' && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleRequestStatusUpdate(request.id, 'approved')}
                                  className="px-3 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium hover:bg-green-500/30 transition-all"
                                >
                                  Onayla
                                </button>
                                <button
                                  onClick={() => {
                                    const reason = prompt('Ret nedeni (opsiyonel):');
                                    handleRequestStatusUpdate(request.id, 'rejected', reason || '');
                                  }}
                                  className="px-3 py-1 bg-red-500/20 text-red-400 rounded text-xs font-medium hover:bg-red-500/30 transition-all"
                                >
                                  Reddet
                                </button>
                              </div>
                            )}
                            {request.status !== 'pending' && (
                              <span className="text-slate-500 text-xs">
                                {request.reviewed_at && new Date(request.reviewed_at).toLocaleDateString('tr-TR')}
                              </span>
                            )}
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
                  <Calendar className="w-8 h-8 text-slate-600" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Henüz Rezervasyon Talebi Yok</h3>
                <p className="text-slate-400">Toplantı odası rezervasyon talepleri burada görünecek.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Default Module Content */}
      {module.name !== 'Yemek Listesi' &&
        module.name !== 'Servis Saat ve Güzergah' &&
        module.name !== 'Masraf Girişi' &&
        module.name !== 'Toplantı Odası Rezervasyon' && (
          <div className="text-center py-16 bg-slate-800/30 rounded-2xl border border-slate-700/50">
            <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <IconComponent className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Modül Yönetimi</h3>
            <p className="text-slate-400 mb-6">Bu modül için henüz özel yönetim arayüzü bulunmuyor.</p>
            <div className="text-sm text-slate-500">
              Modül ID: {module.id}
            </div>
          </div>
        )}

      {/* Add/Edit Menu Modal */}
      {showMenuModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-md w-full">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">
                  {editingMenu ? 'Menü Düzenle' : 'Yeni Menü Ekle'}
                </h3>
                <button
                  onClick={() => {
                    setShowMenuModal(false);
                    setEditingMenu(null);
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
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Tarih</label>
                  <input
                    type="date"
                    value={newMenuData.date}
                    onChange={(e) => setNewMenuData({ ...newMenuData, date: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Çorba</label>
                  <input
                    type="text"
                    value={newMenuData.soup}
                    onChange={(e) => setNewMenuData({ ...newMenuData, soup: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="Mercimek çorbası"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Ana Yemek *</label>
                  <input
                    type="text"
                    value={newMenuData.main_course}
                    onChange={(e) => setNewMenuData({ ...newMenuData, main_course: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="Tavuk şiş"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Garnitür</label>
                  <input
                    type="text"
                    value={newMenuData.side_dish}
                    onChange={(e) => setNewMenuData({ ...newMenuData, side_dish: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="Pilav"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Ekstra Tip</label>
                  <select
                    value={newMenuData.extra_type}
                    onChange={(e) => setNewMenuData({ ...newMenuData, extra_type: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  >
                    <option value="dessert">Tatlı</option>
                    <option value="salad">Salata</option>
                    <option value="drink">İçecek</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {newMenuData.extra_type === 'dessert' ? 'Tatlı' :
                      newMenuData.extra_type === 'salad' ? 'Salata' : 'İçecek'}
                  </label>
                  <input
                    type="text"
                    value={newMenuData.extra}
                    onChange={(e) => setNewMenuData({ ...newMenuData, extra: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder={
                      newMenuData.extra_type === 'dessert' ? 'Sütlaç' :
                        newMenuData.extra_type === 'salad' ? 'Çoban salatası' : 'Ayran'
                    }
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-700/50">
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowMenuModal(false);
                    setEditingMenu(null);
                  }}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleSaveMenuData}
                  disabled={isLoading || !newMenuData.date || !newMenuData.main_course}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingMenu ? 'Güncelle' : 'Kaydet'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Service Route Modal */}
      {showServiceModal && (
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
                    setShowServiceModal(false);
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
                {/* Route Name */}
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

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Açıklama</label>
                  <input
                    type="text"
                    value={newRouteData.description}
                    onChange={(e) => setNewRouteData({ ...newRouteData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                    placeholder="Güzergah hakkında kısa açıklama"
                  />
                </div>

                {/* Times */}
                <div className="grid grid-cols-2 gap-4">
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

                {/* Locations */}
                <div className="grid grid-cols-2 gap-4">
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

                {/* Driver Info */}
                <div className="grid grid-cols-2 gap-4">
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
                      placeholder="0555 123 45 67"
                    />
                  </div>
                </div>

                {/* Vehicle Plate */}
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

                {/* Working Days */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Çalışma Günleri</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${newRouteData.days_of_week.includes(day)
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-700/50 text-slate-400 border border-slate-600/30 hover:border-slate-500/50'
                          }`}
                      >
                        {getDayLabel(day).slice(0, 3)}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Hiç seçilmezse hafta içi (Pazartesi-Cuma) otomatik seçilir
                  </p>
                </div>

                {/* Status */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={newRouteData.is_active}
                    onChange={(e) => setNewRouteData({ ...newRouteData, is_active: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500 focus:ring-2"
                  />
                  <label htmlFor="is_active" className="text-sm text-slate-300">
                    Aktif güzergah
                  </label>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Notlar</label>
                  <textarea
                    value={newRouteData.notes}
                    onChange={(e) => setNewRouteData({ ...newRouteData, notes: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none"
                    rows={3}
                    placeholder="Ek bilgiler, duraklar, özel notlar..."
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-700/50">
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowServiceModal(false);
                    setEditingRoute(null);
                  }}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleSaveRouteData}
                  disabled={isLoading || !newRouteData.route_name || !newRouteData.departure_time || !newRouteData.departure_location || !newRouteData.arrival_location}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Add/Edit Meeting Room Modal */}
      {showRoomModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">
                  {editingRoom ? 'Toplantı Odası Düzenle' : 'Yeni Toplantı Odası Ekle'}
                </h3>
                <button
                  onClick={() => {
                    setShowRoomModal(false);
                    setEditingRoom(null);
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
                {/* Room Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Oda Adı *</label>
                  <input
                    type="text"
                    value={newRoomData.name}
                    onChange={(e) => setNewRoomData({ ...newRoomData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                    placeholder="Toplantı Odası A"
                    required
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Konum *</label>
                  <input
                    type="text"
                    value={newRoomData.location}
                    onChange={(e) => setNewRoomData({ ...newRoomData, location: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                    placeholder="1. Kat, Sol Koridor"
                    required
                  />
                </div>

                {/* Capacity */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Kapasite</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newRoomData.capacity}
                    onChange={(e) => setNewRoomData({ ...newRoomData, capacity: parseInt(e.target.value) || 8 })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Açıklama</label>
                  <textarea
                    value={newRoomData.description}
                    onChange={(e) => setNewRoomData({ ...newRoomData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 resize-none"
                    rows={3}
                    placeholder="Oda hakkında açıklama..."
                  />
                </div>

                {/* Equipment */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Ekipmanlar</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Projeksiyon', 'Beyaz Tahta', 'Flipchart', 'Ses Sistemi', 'Video Konferans', 'WiFi', 'Klima', 'Kahve Makinesi'].map((equipment) => (
                      <button
                        key={equipment}
                        type="button"
                        onClick={() => toggleEquipment(equipment)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${newRoomData.equipment.includes(equipment)
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          : 'bg-slate-700/50 text-slate-400 border border-slate-600/30 hover:border-slate-500/50'
                          }`}
                      >
                        {equipment}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Image URL */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Resim URL'si</label>
                  <input
                    type="url"
                    value={newRoomData.image_url}
                    onChange={(e) => setNewRoomData({ ...newRoomData, image_url: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                    placeholder="https://example.com/room-image.jpg"
                  />
                </div>

                {/* Status Checkboxes */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="is_available"
                      checked={newRoomData.is_available}
                      onChange={(e) => setNewRoomData({ ...newRoomData, is_available: e.target.checked })}
                      className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500 focus:ring-2"
                    />
                    <label htmlFor="is_available" className="text-sm text-slate-300">
                      Rezervasyona açık
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="is_active_room"
                      checked={newRoomData.is_active}
                      onChange={(e) => setNewRoomData({ ...newRoomData, is_active: e.target.checked })}
                      className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500 focus:ring-2"
                    />
                    <label htmlFor="is_active_room" className="text-sm text-slate-300">
                      Aktif oda
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-700/50">
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowRoomModal(false);
                    setEditingRoom(null);
                  }}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleSaveRoomData}
                  disabled={isLoading || !newRoomData.name || !newRoomData.location}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingRoom ? 'Güncelle' : 'Kaydet'}
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
