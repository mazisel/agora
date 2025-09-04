'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  UtensilsCrossed,
  Settings,
  Eye,
  ChevronRight,
  User,
  Clock,
  Bus,
  Car
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

export default function UserModulesPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const router = useRouter();

  // Fetch user's assigned modules
  const fetchUserModules = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/modules/user?userId=${user.id}`);
      const data = await response.json();

      if (data.success) {
        setModules(data.modules || []);
      } else {
        throw new Error(data.error || 'Failed to fetch modules');
      }
    } catch (error) {
      console.error('Error fetching user modules:', error);
      setError('Modüller yüklenirken hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserModules();
  }, [user?.id]);

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'UtensilsCrossed':
        return UtensilsCrossed;
      case 'Bus':
        return Bus;
      case 'Car':
        return Car;
      default:
        return Settings;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Modüller yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Modüllerim</h1>
              <p className="text-slate-400">Size atanan modülleri yönetin ve içeriklerini düzenleyin</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <span className="text-sm text-slate-300 font-medium">
                {modules.length} modül
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Modules Grid */}
      {modules.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => {
            const IconComponent = getIconComponent(module.icon);
            return (
              <div
                key={module.id}
                className="group bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 hover:bg-slate-700/50 hover:border-slate-600/50 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/10"
              >
                {/* Module Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors">{module.name}</h3>
                      <p className="text-sm text-slate-400">{module.description}</p>
                    </div>
                  </div>
                </div>

                {/* Module Status */}
                <div className="mb-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                      Aktif
                    </span>
                    <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs border border-purple-500/30">
                      <User className="w-3 h-3" />
                      <span>Sorumlu</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>
                      Son güncelleme: {new Date(module.updated_at).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>

                {/* Module Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/modules/${module.id}`)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 text-sm flex-1 justify-center font-medium shadow-lg shadow-blue-500/25"
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
      ) : (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-gradient-to-r from-slate-700 to-slate-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Settings className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-3">Henüz Modül Atanmamış</h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Size henüz bir modül atanmamış. Modül sorumluluğu almak için yöneticinizle iletişime geçin.
          </p>
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl max-w-md mx-auto">
            <p className="text-blue-400 text-sm">
              💡 Modül sorumlusu olduğunuzda burada modüllerinizi yönetebileceksiniz.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
