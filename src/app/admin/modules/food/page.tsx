'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  UtensilsCrossed,
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  Calendar,
  ChefHat
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
  updated_at: string;
}

export default function FoodAdminPage() {
  const [menuData, setMenuData] = useState<MenuData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuData | null>(null);
  const [newMenuData, setNewMenuData] = useState({
    date: new Date().toISOString().split('T')[0],
    soup: '',
    main_course: '',
    side_dish: '',
    extra: '',
    extra_type: 'dessert'
  });
  const { user } = useAuth();

  // Fetch menu data
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
      setError('Menü verileri yüklenirken hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuData();
  }, []);

  const handleSaveMenu = async () => {
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

        if (error) throw error;
      } else {
        // Create new menu
        const { error } = await supabase
          .from('daily_menu')
          .insert([newMenuData]);

        if (error) throw error;
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
      setShowModal(false);
      setError('');
    } catch (error: any) {
      console.error('Error saving menu:', error);
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
    setShowModal(true);
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

  if (isLoading && menuData.length === 0) {
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
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center">
              <UtensilsCrossed className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Yemek Listesi Yönetimi</h2>
              <p className="text-slate-400">Günlük menüleri yönetin</p>
            </div>
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
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Yeni Menü
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

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
                        {menu.extra ? `${menu.extra} (${
                          menu.extra_type === 'dessert' ? 'Tatlı' :
                          menu.extra_type === 'salad' ? 'Salata' : 'İçecek'
                        })` : '-'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditMenu(menu)}
                          className="p-2 text-slate-400 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-all"
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

      {/* Add/Edit Menu Modal */}
      {showModal && (
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
                    setShowModal(false);
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
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Çorba</label>
                  <input
                    type="text"
                    value={newMenuData.soup}
                    onChange={(e) => setNewMenuData({ ...newMenuData, soup: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                    placeholder="Mercimek çorbası"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Ana Yemek *</label>
                  <input
                    type="text"
                    value={newMenuData.main_course}
                    onChange={(e) => setNewMenuData({ ...newMenuData, main_course: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
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
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                    placeholder="Pilav"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Ekstra Tip</label>
                  <select
                    value={newMenuData.extra_type}
                    onChange={(e) => setNewMenuData({ ...newMenuData, extra_type: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
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
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
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
                    setShowModal(false);
                    setEditingMenu(null);
                  }}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleSaveMenu}
                  disabled={isLoading || !newMenuData.date || !newMenuData.main_course}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
}
