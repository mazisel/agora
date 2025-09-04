'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  UtensilsCrossed, 
  Calendar, 
  Clock,
  ChefHat,
  Coffee,
  Cake,
  ArrowLeft,
  ArrowRight,
  Salad,
  Wine
} from 'lucide-react';

interface MenuData {
  id: string;
  date: string;
  soup: string;
  main_course: string;
  side_dish: string;
  extra: string;
  extra_type: string;
  created_at: string;
}

export default function MenuPage() {
  const [menuData, setMenuData] = useState<MenuData[]>([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { userProfile } = useAuth();

  // Fetch menu data
  const fetchMenuData = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('daily_menu')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      setMenuData(data || []);
    } catch (error) {
      console.error('Error fetching menu data:', error);
      setError('Menü verileri yüklenirken hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuData();
  }, []);

  // Get week dates
  const getWeekDates = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startOfWeek);
      currentDate.setDate(startOfWeek.getDate() + i);
      week.push(currentDate);
    }
    return week;
  };

  const weekDates = getWeekDates(currentWeek);

  // Get menu for specific date
  const getMenuForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return menuData.find(menu => menu.date === dateString);
  };

  // Navigate weeks
  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() - 7);
    setCurrentWeek(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() + 7);
    setCurrentWeek(newDate);
  };

  const goToCurrentWeek = () => {
    setCurrentWeek(new Date());
  };

  const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Menü yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
              <UtensilsCrossed className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Yemek Listesi</h1>
              <p className="text-slate-400">
                Merhaba {userProfile?.first_name || 'Kullanıcı'}, haftalık yemek menüsü
              </p>
            </div>
          </div>

          {/* Week Navigation */}
          <div className="flex items-center justify-between bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <button
              onClick={goToPreviousWeek}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-600/50 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Önceki Hafta
            </button>

            <div className="text-center">
              <h2 className="text-xl font-semibold text-white">
                {weekDates[0].toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} - {' '}
                {weekDates[6].toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </h2>
              <button
                onClick={goToCurrentWeek}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors mt-1"
              >
                Bu Haftaya Git
              </button>
            </div>

            <button
              onClick={goToNextWeek}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-600/50 hover:text-white transition-colors"
            >
              Sonraki Hafta
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Today's Menu Highlight */}
        {(() => {
          const todayMenu = getMenuForDate(new Date());
          if (todayMenu) {
            return (
              <div className="mb-8 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl border border-blue-500/20 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Bugünün Menüsü</h3>
                    <p className="text-slate-400 text-sm">
                      {new Date().toLocaleDateString('tr-TR', { 
                        weekday: 'long', 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {todayMenu.soup && (
                    <div className="bg-slate-800/30 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Coffee className="w-4 h-4 text-yellow-400" />
                        <span className="text-yellow-400 text-sm font-medium">Çorba</span>
                      </div>
                      <p className="text-white">{todayMenu.soup}</p>
                    </div>
                  )}

                  <div className="bg-slate-800/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ChefHat className="w-4 h-4 text-red-400" />
                      <span className="text-red-400 text-sm font-medium">Ana Yemek</span>
                    </div>
                    <p className="text-white font-medium">{todayMenu.main_course}</p>
                  </div>

                  {todayMenu.side_dish && (
                    <div className="bg-slate-800/30 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <UtensilsCrossed className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 text-sm font-medium">Garnitür</span>
                      </div>
                      <p className="text-white">{todayMenu.side_dish}</p>
                    </div>
                  )}

                  {todayMenu.extra && (
                    <div className="bg-slate-800/30 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {todayMenu.extra_type === 'dessert' ? (
                          <Cake className="w-4 h-4 text-purple-400" />
                        ) : todayMenu.extra_type === 'salad' ? (
                          <Salad className="w-4 h-4 text-green-400" />
                        ) : (
                          <Wine className="w-4 h-4 text-blue-400" />
                        )}
                        <span className={`text-sm font-medium ${
                          todayMenu.extra_type === 'dessert' ? 'text-purple-400' :
                          todayMenu.extra_type === 'salad' ? 'text-green-400' : 'text-blue-400'
                        }`}>
                          {todayMenu.extra_type === 'dessert' ? 'Tatlı' :
                           todayMenu.extra_type === 'salad' ? 'Salata' : 'İçecek'}
                        </span>
                      </div>
                      <p className="text-white">{todayMenu.extra}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* Weekly Menu Section Header */}
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-white mb-2">Haftalık Menü Planı</h3>
          <p className="text-slate-400 text-sm">Bu haftanın tüm menüleri</p>
        </div>

        {/* Weekly Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {weekDates.map((date, index) => {
            const menu = getMenuForDate(date);
            const isToday = date.toDateString() === new Date().toDateString();
            const isWeekend = index >= 5; // Saturday and Sunday

            return (
              <div
                key={date.toISOString()}
                className={`bg-slate-800/50 backdrop-blur-sm rounded-2xl border p-6 transition-all duration-200 hover:bg-slate-700/50 ${
                  isToday 
                    ? 'border-blue-500/50 bg-blue-500/10' 
                    : 'border-slate-700/50'
                } ${
                  isWeekend ? 'opacity-75' : ''
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className={`font-semibold ${isToday ? 'text-blue-300' : 'text-white'}`}>
                      {dayNames[index]}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  {isToday && (
                    <div className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium">
                      Bugün
                    </div>
                  )}
                </div>

                {/* Menu Content */}
                {menu ? (
                  <div className="space-y-4">
                    {/* Soup */}
                    {menu.soup && (
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Coffee className="w-4 h-4 text-yellow-400" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Çorba</p>
                          <p className="text-white text-sm">{menu.soup}</p>
                        </div>
                      </div>
                    )}

                    {/* Main Course */}
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <ChefHat className="w-4 h-4 text-red-400" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Ana Yemek</p>
                        <p className="text-white text-sm font-medium">{menu.main_course}</p>
                      </div>
                    </div>

                    {/* Side Dish */}
                    {menu.side_dish && (
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <UtensilsCrossed className="w-4 h-4 text-green-400" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Garnitür</p>
                          <p className="text-white text-sm">{menu.side_dish}</p>
                        </div>
                      </div>
                    )}

                    {/* Extra (Dessert/Salad/Drink) */}
                    {menu.extra && (
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          menu.extra_type === 'dessert' ? 'bg-purple-500/20' :
                          menu.extra_type === 'salad' ? 'bg-green-500/20' : 'bg-blue-500/20'
                        }`}>
                          {menu.extra_type === 'dessert' ? (
                            <Cake className="w-4 h-4 text-purple-400" />
                          ) : menu.extra_type === 'salad' ? (
                            <Salad className="w-4 h-4 text-green-400" />
                          ) : (
                            <Wine className="w-4 h-4 text-blue-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-1">
                            {menu.extra_type === 'dessert' ? 'Tatlı' :
                             menu.extra_type === 'salad' ? 'Salata' : 'İçecek'}
                          </p>
                          <p className="text-white text-sm">{menu.extra}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-slate-700/50 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <UtensilsCrossed className="w-6 h-6 text-slate-500" />
                    </div>
                    <p className="text-slate-500 text-sm">
                      {isWeekend ? 'Hafta sonu menüsü yok' : 'Menü henüz belirlenmedi'}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>


        {/* Empty State */}
        {menuData.length === 0 && !isLoading && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <UtensilsCrossed className="w-10 h-10 text-slate-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Henüz Menü Yok</h3>
            <p className="text-slate-400 mb-6">
              Yemek menüleri henüz eklenmemiş. Admin panelinden menü ekleyebilirsiniz.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
