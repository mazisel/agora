'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, User, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface SupportCategory {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
  created_at: string;
}

interface SupportAgent {
  id: string;
  user_id: string;
  category_id: string;
  user_name: string;
  user_email: string;
  category_name: string;
  created_at: string;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export default function SupportPage() {
  const [categories, setCategories] = useState<SupportCategory[]>([]);
  const [agents, setAgents] = useState<SupportAgent[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<SupportCategory | null>(null);
  const [editingAgent, setEditingAgent] = useState<SupportAgent | null>(null);

  // Form states
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: ''
  });
  const [agentForm, setAgentForm] = useState({
    user_id: '',
    category_id: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders: HeadersInit = session?.access_token ? {
        'Authorization': `Bearer ${session.access_token}`
      } : {};
      
      // Önce kategorileri yükle
      try {
        const categoriesResponse = await fetch('/api/admin/support/categories', { headers: authHeaders });
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          setCategories(categoriesData || []);
        } else {
          console.error('Kategoriler yüklenirken hata:', categoriesResponse.status);
          setCategories([]);
        }
      } catch (error) {
        console.error('Kategoriler yüklenirken hata:', error);
        setCategories([]);
      }
      
      // Sonra destek kişilerini yükle
      try {
        const agentsResponse = await fetch('/api/admin/support/agents', { headers: authHeaders });
        if (agentsResponse.ok) {
          const agentsData = await agentsResponse.json();
          setAgents(agentsData || []);
        } else {
          console.error('Destek kişileri yüklenirken hata:', agentsResponse.status);
          setAgents([]);
        }
      } catch (error) {
        console.error('Destek kişileri yüklenirken hata:', error);
        setAgents([]);
      }
      
      // Son olarak kullanıcıları yükle
      try {
        const usersResponse = await fetch('/api/admin/users', { headers: authHeaders });
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData || []);
        } else {
          console.error('Kullanıcılar yüklenirken hata:', usersResponse.status);
          setUsers([]);
        }
      } catch (error) {
        console.error('Kullanıcılar yüklenirken hata:', error);
        setUsers([]);
      }

      setError(null);

    } catch (error) {
      console.error('Veri yüklenirken genel hata:', error);
      setError('Veriler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.');
      setCategories([]);
      setAgents([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders: HeadersInit = session?.access_token ? {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      } : {
        'Content-Type': 'application/json',
      };

      const url = editingCategory 
        ? `/api/admin/support/categories/${editingCategory.id}`
        : '/api/admin/support/categories';
      
      const method = editingCategory ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(categoryForm),
      });

      if (response.ok) {
        await loadData();
        setShowCategoryModal(false);
        setCategoryForm({ name: '', description: '' });
        setEditingCategory(null);
      }
    } catch (error) {
      console.error('Kategori kaydedilirken hata:', error);
    }
  };

  const handleAgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders: HeadersInit = session?.access_token ? {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      } : {
        'Content-Type': 'application/json',
      };

      const url = editingAgent 
        ? `/api/admin/support/agents/${editingAgent.id}`
        : '/api/admin/support/agents';
      
      const method = editingAgent ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(agentForm),
      });

      if (response.ok) {
        await loadData();
        setShowAgentModal(false);
        setAgentForm({ user_id: '', category_id: '' });
        setEditingAgent(null);
      }
    } catch (error) {
      console.error('Destek kişisi kaydedilirken hata:', error);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Bu kategoriyi silmek istediğinizden emin misiniz?')) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders: HeadersInit = session?.access_token ? {
        'Authorization': `Bearer ${session.access_token}`
      } : {};

      const response = await fetch(`/api/admin/support/categories/${id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });

      if (response.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Kategori silinirken hata:', error);
    }
  };

  const deleteAgent = async (id: string) => {
    if (!confirm('Bu destek kişisini silmek istediğinizden emin misiniz?')) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders: HeadersInit = session?.access_token ? {
        'Authorization': `Bearer ${session.access_token}`
      } : {};

      const response = await fetch(`/api/admin/support/agents/${id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });

      if (response.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Destek kişisi silinirken hata:', error);
    }
  };

  const openCategoryModal = (category?: SupportCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        description: category.description
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '' });
    }
    setShowCategoryModal(true);
  };

  const openAgentModal = (agent?: SupportAgent) => {
    if (agent) {
      setEditingAgent(agent);
      setAgentForm({
        user_id: agent.user_id,
        category_id: agent.category_id
      });
    } else {
      setEditingAgent(null);
      setAgentForm({ user_id: '', category_id: '' });
    }
    setShowAgentModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs">!</span>
            </div>
            <div>
              <p className="text-red-400 font-medium">Hata</p>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
            <button
              onClick={() => {
                setError(null);
                loadData();
              }}
              className="ml-auto bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
            >
              Yeniden Dene
            </button>
          </div>
        </div>
      )}

      {/* Categories Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Destek Kategorileri</h2>
            <p className="text-slate-400">Destek kategorilerini yönetin</p>
          </div>
          <button
            onClick={() => openCategoryModal()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Yeni Kategori
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <div 
              key={category.id} 
              className={`rounded-lg p-6 border ${
                category.is_system 
                  ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30' 
                  : 'bg-slate-800 border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    category.is_system 
                      ? 'bg-gradient-to-br from-amber-500 to-orange-500' 
                      : 'bg-blue-600'
                  }`}>
                    <Tag className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">{category.name}</h3>
                      {category.is_system && (
                        <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full border border-amber-500/30">
                          Sistem
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400">{category.description}</p>
                  </div>
                </div>
                {!category.is_system && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => openCategoryModal(category)}
                      className="text-slate-400 hover:text-blue-400 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteCategory(category.id)}
                      className="text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  {agents.filter(agent => agent.category_id === category.id).length} destek kişisi
                </div>
                {category.is_system && (
                  <div className="text-xs text-amber-400/70">
                    Sabit kategori
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Agents Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Destek Kişileri</h2>
            <p className="text-slate-400">Kategorilere destek kişilerini atayın</p>
          </div>
          <button
            onClick={() => openAgentModal()}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Destek Kişisi Ekle
          </button>
        </div>

        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-slate-300">Destek Kişisi</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-300">E-posta</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-300">Kategori</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-300">Eklenme Tarihi</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-300">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {agents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-slate-700/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-white">{agent.user_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{agent.user_email}</td>
                    <td className="py-3 px-4">
                      <span className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded text-sm">
                        {agent.category_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(agent.created_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openAgentModal(agent)}
                          className="text-slate-400 hover:text-blue-400 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteAgent(agent.id)}
                          className="text-slate-400 hover:text-red-400 transition-colors"
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
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingCategory ? 'Kategori Düzenle' : 'Yeni Kategori'}
            </h3>
            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Kategori Adı
                </label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Açıklama
                </label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  rows={3}
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
                >
                  {editingCategory ? 'Güncelle' : 'Kaydet'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-2 rounded-lg transition-colors"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Agent Modal */}
      {showAgentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingAgent ? 'Destek Kişisi Düzenle' : 'Yeni Destek Kişisi'}
            </h3>
            <form onSubmit={handleAgentSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Kullanıcı
                </label>
                <select
                  value={agentForm.user_id}
                  onChange={(e) => setAgentForm({ ...agentForm, user_id: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="">Kullanıcı seçin</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Kategori
                </label>
                <select
                  value={agentForm.category_id}
                  onChange={(e) => setAgentForm({ ...agentForm, category_id: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="">Kategori seçin</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition-colors"
                >
                  {editingAgent ? 'Güncelle' : 'Kaydet'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAgentModal(false)}
                  className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-2 rounded-lg transition-colors"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
