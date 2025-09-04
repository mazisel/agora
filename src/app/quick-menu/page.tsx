'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Users,
  BarChart3,

  Bell,
  Search,
  Plus,
  Target,
  Shield,
  Sparkles,
  Heart,
  Star,
  UtensilsCrossed,
  Bus,
  Car,
  Package,
  Receipt,
  Building,
  Stethoscope,
  Brain,
  UserCheck,
  Plane,
  FileCheck,

  HandHeart,
  Baby,
  Percent,
  Share2
} from 'lucide-react';

interface QuickMenuItem {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  href?: string;
  onClick?: () => void;
  badge?: number;
}

const quickMenuItems: QuickMenuItem[] = [
  {
    id: 'tasks',
    title: 'Görevler',
    description: 'Görev yönetimi ve takibi',
    icon: Target,
    color: 'bg-blue-500',
    href: '/tasks'
  },

  {
    id: 'projects',
    title: 'Projeler',
    description: 'Proje yönetimi',
    icon: FileText,
    color: 'bg-purple-500',
    href: '/projects'
  },
  {
    id: 'support',
    title: 'Destek',
    description: 'Destek talepleri',
    icon: Bell,
    color: 'bg-yellow-500',
    href: '/support'
  },
  {
    id: 'menu',
    title: 'Yemek Listesi',
    description: 'Günlük yemek menüsü',
    icon: UtensilsCrossed,
    color: 'bg-orange-500',
    href: '/modules/food'
  },
  {
    id: 'service',
    title: 'Servis Saatleri',
    description: 'Servis güzergahları ve saatleri',
    icon: Bus,
    color: 'bg-emerald-500',
    href: '/modules/service'
  },
  {
    id: 'vehicle-requests',
    title: 'Araç Talep',
    description: 'Araç talep ve rezervasyon',
    icon: Car,
    color: 'bg-indigo-500',
    href: '/modules/vehicle-requests'
  },
  {
    id: 'office-supplies',
    title: 'Ofis Malzemeleri',
    description: 'Ofis malzeme talepleri',
    icon: Package,
    color: 'bg-teal-500',
    href: '/modules/office-supplies'
  },
  {
    id: 'expense-entry',
    title: 'Masraf Girişi',
    description: 'Masraf girişi ve takibi',
    icon: Receipt,
    color: 'bg-amber-500',
    href: '/modules/expense-entry'
  },
  {
    id: 'meeting-rooms',
    title: 'Toplantı Odası',
    description: 'Toplantı odası rezervasyonu',
    icon: Users,
    color: 'bg-purple-600',
    href: '/modules/meeting-rooms'
  },
  {
    id: 'profile',
    title: 'Profilim',
    description: 'Profil bilgileri',
    icon: Users,
    color: 'bg-pink-500',
    href: '/profile'
  },
  {
    id: 'settings',
    title: 'Ayarlar',
    description: 'Sistem ayarları',
    icon: Shield,
    color: 'bg-slate-500',
    href: '/settings'
  },
  // Yeni Modüller (Geliştirme Aşamasında)
  {
    id: 'hotel-accommodation',
    title: 'Otel / Lojman Başvuru',
    description: 'Otel ve lojman başvuru takibi',
    icon: Building,
    color: 'bg-rose-500',
    badge: 1, // Dump indicator
    onClick: () => alert('Bu modül henüz geliştirme aşamasındadır.')
  },
  {
    id: 'doctor-appointment',
    title: 'İşyeri Hekimi Randevu',
    description: 'İşyeri hekimi randevu sistemi',
    icon: Stethoscope,
    color: 'bg-red-500',
    badge: 1, // Dump indicator
    onClick: () => alert('Bu modül henüz geliştirme aşamasındadır.')
  },
  {
    id: 'dietitian-appointment',
    title: 'Diyetisyen Randevu',
    description: 'Diyetisyen randevu sistemi',
    icon: Heart,
    color: 'bg-green-600',
    badge: 1, // Dump indicator
    onClick: () => alert('Bu modül henüz geliştirme aşamasındadır.')
  },
  {
    id: 'psychologist-appointment',
    title: 'Psikolog Randevu',
    description: 'Psikolog randevu sistemi',
    icon: Brain,
    color: 'bg-violet-500',
    badge: 1, // Dump indicator
    onClick: () => alert('Bu modül henüz geliştirme aşamasındadır.')
  },
  {
    id: 'visitor-entry',
    title: 'Ziyaretçi Girişi',
    description: 'Ziyaretçi giriş talep sistemi',
    icon: UserCheck,
    color: 'bg-cyan-500',
    badge: 1, // Dump indicator
    onClick: () => alert('Bu modül henüz geliştirme aşamasındadır.')
  },
  {
    id: 'ticket-request',
    title: 'Bilet Talep',
    description: 'Otobüs, uçak vs. bilet talepleri',
    icon: Plane,
    color: 'bg-sky-500',
    badge: 1, // Dump indicator
    onClick: () => alert('Bu modül henüz geliştirme aşamasındadır.')
  },
  {
    id: 'document-request',
    title: 'Belge Talep',
    description: 'SGK, çalışma belgesi vs. talepleri',
    icon: FileCheck,
    color: 'bg-lime-500',
    badge: 1, // Dump indicator
    onClick: () => alert('Bu modül henüz geliştirme aşamasındadır.')
  },
  {
    id: 'meeting-request',
    title: 'Görüşme Talebi',
    description: '1:1 görüşme talep sistemi',
    icon: Users,
    color: 'bg-orange-600',
    badge: 1, // Dump indicator
    onClick: () => alert('Bu modül henüz geliştirme aşamasındadır.')
  },
  {
    id: 'disability-support',
    title: 'Engelli / Sağlık Desteği',
    description: 'Engelli ve sağlık durumu destek talepleri',
    icon: HandHeart,
    color: 'bg-pink-600',
    badge: 1, // Dump indicator
    onClick: () => alert('Bu modül henüz geliştirme aşamasındadır.')
  },
  {
    id: 'childcare-support',
    title: 'Çocuk Bakım / Kreş',
    description: 'Çocuk bakım ve kreş desteği talepleri',
    icon: Baby,
    color: 'bg-yellow-600',
    badge: 1, // Dump indicator
    onClick: () => alert('Bu modül henüz geliştirme aşamasındadır.')
  },
  {
    id: 'employee-discounts',
    title: 'Personel İndirimleri',
    description: 'Personel indirimleri ve kuponlar',
    icon: Percent,
    color: 'bg-emerald-600',
    badge: 1, // Dump indicator
    onClick: () => alert('Bu modül henüz geliştirme aşamasındadır.')
  },
  {
    id: 'shared-items',
    title: 'Paylaşımlı Eşyalar',
    description: 'Şirket paylaşımlı eşyalar rezervasyon',
    icon: Share2,
    color: 'bg-indigo-600',
    badge: 1, // Dump indicator
    onClick: () => alert('Bu modül henüz geliştirme aşamasındadır.')
  }
];

export default function QuickMenuPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const { userProfile } = useAuth();

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('quickMenuFavorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    } else {
      // Default favorites
      setFavorites(['tasks', 'support']);
    }
  }, []);

  // Fetch active modules from database
  useEffect(() => {
    const fetchActiveModules = async () => {
      try {
        const { data, error } = await supabase
          .from('modules')
          .select('name, settings')
          .eq('is_active', true);

        if (error) throw error;

        // Map module names to menu item IDs
        const moduleMap: { [key: string]: string } = {
          'Yemek Listesi': 'menu',
          'Servis Saat ve Güzergah': 'service',
          'Araç Talep ve Rezervasyon': 'vehicle-requests',
          'Ofis Malzemeleri': 'office-supplies',
          'Masraf Girişi': 'expense-entry',
          'Toplantı Odası Rezervasyon': 'meeting-rooms'
        };

        // Also check settings.route for newer modules
        const activeModuleIds = data?.map((module: any) => {
          const mappedId = moduleMap[module.name];
          if (mappedId) return mappedId;
          
          // Check settings.route for newer modules
          if (module.settings && module.settings.route) {
            return module.settings.route;
          }
          
          return module.name.toLowerCase().replace(/\s+/g, '-');
        }).filter(Boolean) || [];

        setActiveModules(activeModuleIds);
      } catch (error) {
        console.error('Error fetching active modules:', error);
        // If error, show all modules
        setActiveModules(['menu']);
      }
    };

    fetchActiveModules();
  }, []);

  // Save favorites to localStorage
  const saveFavorites = (newFavorites: string[]) => {
    setFavorites(newFavorites);
    localStorage.setItem('quickMenuFavorites', JSON.stringify(newFavorites));
  };

  const toggleFavorite = (itemId: string) => {
    const newFavorites = favorites.includes(itemId)
      ? favorites.filter(id => id !== itemId)
      : [...favorites, itemId];
    saveFavorites(newFavorites);
  };

  // Filter items based on search and active modules
  const filteredItems = quickMenuItems.filter(item => {
    // First check if item matches search
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // For module-based items, check if module is active
    const moduleBasedItems = ['menu', 'service', 'vehicle-requests', 'office-supplies', 'expense-entry', 'meeting-rooms']; // Add more module IDs here as needed
    
    // New modules (with badge) should always be visible
    const newModules = [
      'hotel-accommodation', 'doctor-appointment', 'dietitian-appointment', 
      'psychologist-appointment', 'visitor-entry', 'ticket-request', 
      'document-request', 'meeting-request', 'disability-support', 
      'childcare-support', 'employee-discounts', 'shared-items'
    ];
    
    if (newModules.includes(item.id)) {
      return true; // Always show new modules
    }
    
    if (moduleBasedItems.includes(item.id)) {
      return activeModules.includes(item.id);
    }
    
    // For non-module items (core features), always show
    return true;
  });

  const favoriteItems = filteredItems.filter(item => favorites.includes(item.id));
  const otherItems = filteredItems.filter(item => !favorites.includes(item.id));

  const handleItemClick = (item: QuickMenuItem) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.href) {
      window.location.href = item.href;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Hızlı Menü</h1>
            <p className="text-slate-400 text-sm">
              Merhaba {userProfile?.first_name || 'Kullanıcı'}, sık kullanılan araçlara hızlı erişim
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Araç ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm"
          />
        </div>
      </div>

      {/* Favorites Section */}
      {!searchTerm && favoriteItems.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 text-yellow-500" />
            <h2 className="text-lg font-semibold text-white">Favoriler</h2>
            <span className="text-xs text-slate-400">({favoriteItems.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {favoriteItems.map((item) => (
              <QuickMenuCard 
                key={item.id} 
                item={item} 
                isFavorite={true}
                onToggleFavorite={() => toggleFavorite(item.id)}
                onClick={() => handleItemClick(item)} 
              />
            ))}
          </div>
        </div>
      )}

      {/* All Apps Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            {searchTerm ? `Arama Sonuçları (${filteredItems.length})` : 'Tüm Araçlar'}
          </h2>
          {!searchTerm && (
            <span className="text-sm text-slate-400">{quickMenuItems.length} araç</span>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {(searchTerm ? filteredItems : otherItems).map((item) => (
            <QuickMenuCard 
              key={item.id} 
              item={item} 
              isFavorite={favorites.includes(item.id)}
              onToggleFavorite={() => toggleFavorite(item.id)}
              onClick={() => handleItemClick(item)} 
            />
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Araç Bulunamadı</h3>
          <p className="text-slate-400 text-sm mb-4">
            "{searchTerm}" için sonuç bulunamadı.
          </p>
          <button
            onClick={() => setSearchTerm('')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            Aramayı Temizle
          </button>
        </div>
      )}
    </div>
  );
}

interface QuickMenuCardProps {
  item: QuickMenuItem;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClick: () => void;
}

function QuickMenuCard({ item, isFavorite, onToggleFavorite, onClick }: QuickMenuCardProps) {
  const Icon = item.icon;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite();
  };

  return (
    <button
      onClick={onClick}
      className="group relative bg-slate-800/30 backdrop-blur-sm border border-slate-700/30 rounded-xl p-4 hover:bg-slate-700/40 hover:border-slate-600/40 transition-all duration-200 text-left hover:scale-[1.02] hover:shadow-lg hover:shadow-black/10"
    >
      {/* Favorite Button */}
      <div
        onClick={handleFavoriteClick}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-slate-600/50 transition-colors cursor-pointer"
      >
        {isFavorite ? (
          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
        ) : (
          <Star className="w-3 h-3 text-slate-500 hover:text-yellow-500 transition-colors" />
        )}
      </div>

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`w-10 h-10 ${item.color} rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}>
          <Icon className="w-5 h-5 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <h3 className="font-medium text-white text-sm group-hover:text-blue-300 transition-colors">
              {item.title}
            </h3>
            {/* Minik kırmızı nokta */}
            {item.badge && (
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0"></div>
            )}
          </div>
          <p className="text-slate-400 text-xs leading-relaxed">
            {item.description}
          </p>
        </div>
      </div>
    </button>
  );
}
