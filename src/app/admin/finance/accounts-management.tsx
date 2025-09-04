'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ChevronRight, ChevronDown, Building2, TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';

interface FinanceAccount {
  id: string;
  code: string;
  name: string;
  description?: string;
  account_type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  parent_account_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FinanceAccountWithChildren extends FinanceAccount {
  children: FinanceAccountWithChildren[];
}

interface AccountFormData {
  code: string;
  name: string;
  description: string;
  account_type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  parent_account_id: string;
}

const AccountsManagement: React.FC = () => {
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinanceAccount | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedType, setSelectedType] = useState<string>('all');

  const [formData, setFormData] = useState<AccountFormData>({
    code: '',
    name: '',
    description: '',
    account_type: 'asset',
    parent_account_id: ''
  });

  const accountTypes = [
    { value: 'asset', label: 'Varlık', icon: Building2, color: 'text-blue-600' },
    { value: 'liability', label: 'Borç', icon: TrendingDown, color: 'text-red-600' },
    { value: 'equity', label: 'Özkaynak', icon: Wallet, color: 'text-purple-600' },
    { value: 'income', label: 'Gelir', icon: TrendingUp, color: 'text-green-600' },
    { value: 'expense', label: 'Gider', icon: DollarSign, color: 'text-orange-600' }
  ];

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/finance-accounts/');
      
      if (!response.ok) {
        throw new Error('Hesaplar yüklenemedi');
      }

      const data = await response.json();
      setAccounts(data.accounts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = '/api/admin/finance-accounts/';
      const method = editingAccount ? 'PUT' : 'POST';
      
      const payload = editingAccount 
        ? { ...formData, id: editingAccount.id }
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...payload,
          parent_account_id: payload.parent_account_id || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'İşlem başarısız');
      }

      await fetchAccounts();
      setShowModal(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    }
  };

  const handleEdit = (account: FinanceAccount) => {
    setEditingAccount(account);
    setFormData({
      code: account.code,
      name: account.name,
      description: account.description || '',
      account_type: account.account_type,
      parent_account_id: account.parent_account_id || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (account: FinanceAccount) => {
    if (!confirm(`"${account.name}" hesabını silmek istediğinizden emin misiniz?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/finance-accounts/?id=${account.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Silme işlemi başarısız');
      }

      await fetchAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      account_type: 'asset',
      parent_account_id: ''
    });
    setEditingAccount(null);
  };

  const toggleNode = (accountId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedNodes(newExpanded);
  };

  const buildAccountTree = (accounts: FinanceAccount[]): FinanceAccountWithChildren[] => {
    const accountMap = new Map<string, FinanceAccountWithChildren>();
    
    // Initialize all accounts with empty children array
    accounts.forEach(account => {
      accountMap.set(account.id, { ...account, children: [] });
    });

    const rootAccounts: FinanceAccountWithChildren[] = [];

    // Build the tree structure
    accounts.forEach(account => {
      const accountWithChildren = accountMap.get(account.id)!;
      
      if (account.parent_account_id && accountMap.has(account.parent_account_id)) {
        const parent = accountMap.get(account.parent_account_id)!;
        parent.children.push(accountWithChildren);
      } else {
        rootAccounts.push(accountWithChildren);
      }
    });

    return rootAccounts;
  };

  const getFilteredAccounts = () => {
    if (selectedType === 'all') {
      return accounts;
    }
    return accounts.filter(account => account.account_type === selectedType);
  };

  const renderAccountNode = (account: FinanceAccountWithChildren, level = 0) => {
    const hasChildren = account.children.length > 0;
    const isExpanded = expandedNodes.has(account.id);
    const accountTypeInfo = accountTypes.find(type => type.value === account.account_type);
    const Icon = accountTypeInfo?.icon || Building2;

    return (
      <div key={account.id} className="border-b border-slate-700/30">
        <div 
          className={`flex items-center justify-between p-3 hover:bg-slate-700/20 transition-colors ${
            level > 0 ? `ml-${level * 6}` : ''
          }`}
          style={{ paddingLeft: `${level * 24 + 12}px` }}
        >
          <div className="flex items-center space-x-3 flex-1">
            {hasChildren ? (
              <button
                onClick={() => toggleNode(account.id)}
                className="p-1 hover:bg-slate-600/50 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
              </button>
            ) : (
              <div className="w-6" />
            )}
            
            <Icon className={`h-5 w-5 ${accountTypeInfo?.color || 'text-slate-400'}`} />
            
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-sm text-slate-300 bg-slate-700/50 px-2 py-1 rounded">
                  {account.code}
                </span>
                <span className="font-medium text-white">{account.name}</span>
                {!account.is_active && (
                  <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">
                    Pasif
                  </span>
                )}
              </div>
              {account.description && (
                <p className="text-sm text-slate-400 mt-1">{account.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`text-xs px-2 py-1 rounded-full ${accountTypeInfo?.color || 'text-slate-400'} bg-slate-700/30`}>
              {accountTypeInfo?.label || account.account_type}
            </span>
            
            <button
              onClick={() => handleEdit(account)}
              className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
              title="Düzenle"
            >
              <Edit className="h-4 w-4" />
            </button>
            
            <button
              onClick={() => handleDelete(account)}
              className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
              title="Sil"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {account.children.map(child => renderAccountNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const getParentAccountOptions = (currentAccountId?: string) => {
    return accounts.filter(account => 
      account.id !== currentAccountId && 
      account.account_type === formData.account_type
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const filteredAccounts = getFilteredAccounts();
  const accountTree = buildAccountTree(filteredAccounts);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Hesap Planı Yönetimi</h2>
          <p className="text-slate-400 mt-1">Finans hesaplarını yönetin ve düzenleyin</p>
        </div>
        
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 flex items-center space-x-2 font-medium"
        >
          <Plus className="h-5 w-5" />
          <span>Yeni Hesap</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-4">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-slate-300">Hesap Türü:</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
          >
            <option value="all">Tümü</option>
            {accountTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-300 text-sm mt-2"
          >
            Kapat
          </button>
        </div>
      )}

      {/* Accounts Tree */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50">
        <div className="p-4 border-b border-slate-700/50">
          <h3 className="text-lg font-semibold text-white">
            Hesap Listesi ({filteredAccounts.length})
          </h3>
        </div>
        
        <div className="divide-y divide-slate-700/30">
          {accountTree.length > 0 ? (
            accountTree.map(account => renderAccountNode(account, 0))
          ) : (
            <div className="p-8 text-center text-slate-400">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-slate-600" />
              <p>Henüz hesap bulunmuyor</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingAccount ? 'Hesap Düzenle' : 'Yeni Hesap Ekle'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Hesap Kodu *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  required
                  placeholder="örn: 100, 110.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Hesap Adı *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  required
                  placeholder="Hesap adını girin"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Açıklama
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none"
                  rows={3}
                  placeholder="Hesap açıklaması (opsiyonel)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Hesap Türü *
                </label>
                <select
                  value={formData.account_type}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    account_type: e.target.value as any,
                    parent_account_id: '' // Reset parent when type changes
                  })}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  required
                >
                  {accountTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Üst Hesap
                </label>
                <select
                  value={formData.parent_account_id}
                  onChange={(e) => setFormData({ ...formData, parent_account_id: e.target.value })}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                >
                  <option value="">Ana hesap (üst hesap yok)</option>
                  {getParentAccountOptions(editingAccount?.id).map(account => (
                    <option key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 font-medium"
                >
                  {editingAccount ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsManagement;
