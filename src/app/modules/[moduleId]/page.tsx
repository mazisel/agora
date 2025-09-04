'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  UtensilsCrossed,
  Settings,
  Bus,
  Car,
  ExternalLink
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

export default function UserModuleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const moduleId = params.moduleId as string;
  
  const [module, setModule] = useState<Module | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  // Check if user has access to this module
  const checkModuleAccess = async () => {
    if (!user?.id) return false;

    try {
      const response = await fetch(`/api/modules/user?userId=${user.id}`);
      const data = await response.json();

      if (data.success) {
        const userModule = data.modules.find((m: Module) => m.id === moduleId);
        if (userModule) {
          setModule(userModule);
          return true;
        } else {
          setError('Bu modüle erişim yetkiniz yok.');
          return false;
        }
      } else {
        throw new Error(data.error || 'Failed to fetch modules');
      }
    } catch (error) {
      console.error('Error checking module access:', error);
      setError('Modül erişimi kontrol edilirken hata oluştu.');
      return false;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await checkModuleAccess();
      setIsLoading(false);
    };

    loadData();
  }, [moduleId, user?.id]);

  // Auto redirect when module is loaded
  useEffect(() => {
    if (module) {
      const timer = setTimeout(() => {
        redirectToModulePage();
      }, 2000); // 2 second delay for user to see the page

      return () => clearTimeout(timer);
    }
  }, [module]);

  // Redirect to appropriate module page
  const redirectToModulePage = () => {
    if (!module) return;

    switch (module.name) {
      case 'Yemek Listesi':
        router.push('/modules/food');
        break;
      case 'Servis Saat ve Güzergah':
        router.push('/modules/service');
        break;
      case 'Araç Talep ve Rezervasyon':
        router.push('/modules/vehicle-requests');
        break;
      case 'Toplantı Odası Rezervasyon':
        router.push('/modules/meeting-rooms');
        break;
      default:
        router.push('/modules');
        break;
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
        <h3 className="text-xl font-semibold text-white mb-2">Erişim Reddedildi</h3>
        <p className="text-slate-400 mb-6">{error || 'Bu modüle erişim yetkiniz yok.'}</p>
        <button
          onClick={() => router.push('/modules')}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Modüllerime Dön
        </button>
      </div>
    );
  }

  const IconComponent = getIconComponent(module.icon);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => router.push('/modules')}
            className="w-10 h-10 bg-slate-700/50 border border-slate-600/50 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600/50 hover:border-slate-500/50 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-4 flex-1">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <IconComponent className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">{module.name}</h1>
              <p className="text-slate-400">{module.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
              Aktif
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
              Sorumlu
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

      {/* Module Redirect Card */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-8 text-center">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
          <IconComponent className="w-8 h-8 text-white" />
        </div>
        
        <h3 className="text-xl font-bold text-white mb-2">Modül Sayfasına Yönlendiriliyor</h3>
        <p className="text-slate-400 mb-6">
          {module.name} modülünün ana sayfasına yönlendiriliyorsunuz...
        </p>
        
        <button
          onClick={redirectToModulePage}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 font-medium shadow-lg shadow-blue-500/25 mx-auto"
        >
          <ExternalLink className="w-4 h-4" />
          Modül Sayfasına Git
        </button>
      </div>
    </div>
  );
}
