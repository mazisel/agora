'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Puzzle, 
  Search, 
  Power,
  PowerOff,
  Save,
  X,
  UtensilsCrossed,
  Settings,
  Eye,
  ChevronRight,
  UserPlus,
  User,
  Bus,
  Car,
  Package
} from 'lucide-react';

interface Module {
  id: string;
  name: string;
  description: string;
  icon: string;
  is_active: boolean;
  settings: any;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  personnel_number: string;
}

export default function ModulesPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningModule, setAssigningModule] = useState<Module | null>(null);
  const { user, userProfile } = useAuth();
  const { canAccess } = usePermissions();
  const router = useRouter();

  // Fetch modules from database
  const fetchModules = async () => {
    try {
      if (canAccess.manager()) {
        // Admin/Manager: Tüm modülleri görebilir
        const { data, error } = await supabase
          .from('modules')
          .select(`
            *,
            assigned_user:user_profiles!modules_assigned_to_fkey(
              id,
              first_name,
              last_name,
              personnel_number
            )
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setModules(data || []);
      } else {
        // Modül sorumlusu: Sadece kendi modüllerini görebilir
        const response = await fetch(`/api/modules/user?userId=${user?.id}`);
        const data = await response.json();

        if (data.success) {
          setModules(data.modules || []);
        } else {
          throw new Error(data.error || 'Failed to fetch modules');
        }
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
      setError('Modüller yüklenirken hata oluştu.');
    }
  };

  // Fetch users for assignment
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, personnel_number')
        .order('first_name', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  // Initialize default modules if none exist
  useEffect(() => {
    const initializeModules = async () => {
      if (modules.length === 0) {
        // Check if modules already exist in database
        const { data: existingModules, error: checkError } = await supabase
          .from('modules')
          .select('id')
          .limit(1);

        if (checkError) {
          console.error('Error checking existing modules:', checkError);
          return;
        }

        // Only create default modules if none exist in database
        if (!existingModules || existingModules.length === 0) {
          const defaultModules = [
            {
              name: 'Yemek Listesi',
              description: 'Günlük yemek menüsünü gösterir',
              icon: 'UtensilsCrossed',
              is_active: true,
              settings: {
                show_week_view: true,
                show_nutrition_info: false,
                allow_feedback: true
              }
            }
          ];

          for (const moduleData of defaultModules) {
            try {
              const { error } = await supabase
                .from('modules')
                .insert([moduleData]);

              if (error) throw error;
            } catch (error) {
              console.error('Error creating default module:', error);
            }
          }

          fetchModules();
        }
      }
    };

    // Only run if modules array is empty and we haven't loaded data yet
    if (modules.length === 0) {
      initializeModules();
    }
  }, []); // Remove modules.length dependency to prevent infinite loop

  const filteredModules = modules.filter(module =>
    module.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    module.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleModuleStatus = async (moduleId: string, currentStatus: boolean) => {
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('modules')
        .update({ is_active: !currentStatus })
        .eq('id', moduleId);

      if (error) throw error;

      await fetchModules();
      setIsLoading(false);
    } catch (error) {
      console.error('Error toggling module status:', error);
      setError('Modül durumu güncellenirken hata oluştu.');
      setIsLoading(false);
    }
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'UtensilsCrossed':
        return UtensilsCrossed;
      case 'Bus':
        return Bus;
      case 'Car':
        return Car;
      case 'Package':
        return Package;
      default:
        return Puzzle;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Modül Yönetimi</h2>
            <p className="text-slate-400">Sistem modüllerini yönetin ve yapılandırın</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <span className="text-sm text-slate-300 font-medium">
                Toplam: {modules.length} modül
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Modül ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredModules.map((module) => {
          const IconComponent = getIconComponent(module.icon);
          return (
            <div
              key={module.id}
              className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 hover:bg-slate-700/50 transition-all duration-200"
            >
              {/* Module Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    module.is_active ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700/50 text-slate-500'
                  }`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{module.name}</h3>
                    <p className="text-sm text-slate-400">{module.description}</p>
                  </div>
                </div>
                
                {/* Status Toggle */}
                <button
                  onClick={() => toggleModuleStatus(module.id, module.is_active)}
                  disabled={isLoading}
                  className={`p-2 rounded-lg transition-colors ${
                    module.is_active
                      ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  }`}
                  title={module.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                >
                  {module.is_active ? (
                    <Power className="w-4 h-4" />
                  ) : (
                    <PowerOff className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Module Status & Assignment */}
              <div className="mb-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    module.is_active
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {module.is_active ? 'Aktif' : 'Pasif'}
                  </span>
                  
                  {canAccess.manager() && (
                    <button
                      onClick={() => {
                        setAssigningModule(module);
                        setShowAssignModal(true);
                        fetchUsers();
                      }}
                      className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs hover:bg-purple-500/30 transition-colors"
                      title="Sorumlu Ata"
                    >
                      <UserPlus className="w-3 h-3" />
                      Sorumlu
                    </button>
                  )}
                </div>
                
                {(module as any).assigned_user && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <User className="w-3 h-3" />
                    <span>
                      {(module as any).assigned_user.first_name} {(module as any).assigned_user.last_name}
                    </span>
                  </div>
                )}
              </div>

              {/* Module Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push(`/admin/modules/${module.id}`)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm font-medium"
                >
                  <Eye className="w-4 h-4" />
                  Yönet
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredModules.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Puzzle className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {searchTerm ? 'Modül Bulunamadı' : 'Henüz Modül Yok'}
          </h3>
          <p className="text-slate-400">
            {searchTerm ? 'Arama kriterlerinize uygun modül bulunamadı' : 'Sistem modülleri yükleniyor...'}
          </p>
        </div>
      )}

      {/* Assign User Modal */}
      {showAssignModal && assigningModule && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-md w-full">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Sorumlu Ata - {assigningModule.name}</h3>
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setAssigningModule(null);
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
                  <label className="block text-sm font-medium text-slate-300 mb-2">Kullanıcı Seç</label>
                  <select
                    value={assigningModule.assigned_to || ''}
                    onChange={(e) => setAssigningModule({
                      ...assigningModule,
                      assigned_to: e.target.value || null
                    })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  >
                    <option value="">Sorumlu seçin...</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.first_name} {user.last_name} ({user.personnel_number})
                      </option>
                    ))}
                  </select>
                </div>
                
                {assigningModule.assigned_to && (
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <p className="text-blue-400 text-sm">
                      Bu kullanıcı modülün sorumlusu olacak ve modülü yönetebilecek.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-700/50">
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setAssigningModule(null);
                  }}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={async () => {
                    try {
                      setIsLoading(true);
                      
                      const { error } = await supabase
                        .from('modules')
                        .update({ assigned_to: assigningModule.assigned_to })
                        .eq('id', assigningModule.id);

                      if (error) throw error;
                      
                      await fetchModules();
                      setShowAssignModal(false);
                      setAssigningModule(null);
                      setIsLoading(false);
                    } catch (error) {
                      console.error('Error assigning user to module:', error);
                      setError('Sorumlu atanırken hata oluştu.');
                      setIsLoading(false);
                    }
                  }}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-medium disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Atanıyor...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Ata
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
