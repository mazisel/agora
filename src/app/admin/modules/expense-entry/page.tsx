'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrencySafe, formatDateSafe, formatDateTimeSafe } from '@/lib/dateUtils';
import {
  Receipt,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Filter,
  Calendar,
  DollarSign,
  User,
  FileText,
  X,
  Check,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Settings,
  Users,
  Plus
} from 'lucide-react';

interface ExpenseEntry {
  id: string;
  user_id: string;
  category_id: string;
  title: string;
  description?: string;
  amount: number;
  expense_date: string;
  department?: string;
  project_code?: string;
  vendor_name?: string;
  payment_method: string;
  currency: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  admin_notes?: string;
  receipt_url?: string;
  category?: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    email: string;
    raw_user_meta_data: {
      first_name?: string;
      last_name?: string;
    };
  };
}

interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
}

export default function AdminExpenseEntryPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [viewingExpense, setViewingExpense] = useState<ExpenseEntry | null>(null);
  const [processingExpense, setProcessingExpense] = useState<string | null>(null);
  const [actionData, setActionData] = useState({
    action: '' as 'approve' | 'reject',
    expenseId: '',
    rejectionReason: '',
    adminNotes: ''
  });
  const [managingCategories, setManagingCategories] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: ''
  });

  const statusColors = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    approved: 'bg-green-500/20 text-green-400',
    rejected: 'bg-red-500/20 text-red-400'
  };

  const statusLabels = {
    pending: 'Beklemede',
    approved: 'Onaylandı',
    rejected: 'Reddedildi'
  };

  const paymentMethods = {
    cash: 'Nakit',
    credit_card: 'Kredi Kartı',
    debit_card: 'Banka Kartı',
    bank_transfer: 'Havale',
    check: 'Çek',
    other: 'Diğer'
  };

  const fetchExpenses = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterDateFrom) params.append('startDate', filterDateFrom);
      if (filterDateTo) params.append('endDate', filterDateTo);

      const response = await fetch(`/api/admin/expense-entries?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        // Kullanıcı bilgilerini ayrı olarak al
        const expensesWithUsers = await Promise.all(
          data.expenses.map(async (expense: any) => {
            try {
              const userResponse = await fetch(`/api/admin/users/${expense.user_id}`);
              const userData = await userResponse.json();
              return {
                ...expense,
                user: userData.success ? userData.user : null
              };
            } catch (error) {
              console.error('Error fetching user:', error);
              return {
                ...expense,
                user: null
              };
            }
          })
        );
        setExpenses(expensesWithUsers);
      } else {
        setError('Masraflar yüklenirken hata oluştu.');
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setError('Masraflar yüklenirken hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/expense-categories');
      const data = await response.json();

      if (data.success) {
        setCategories(data.categories);
      } else {
        console.error('Error fetching categories:', data.error);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
  }, [filterStatus, filterDateFrom, filterDateTo]);

  const handleExpenseAction = async (action: 'approve' | 'reject') => {
    if (!actionData.expenseId || !user) return;

    if (action === 'reject' && !actionData.rejectionReason.trim()) {
      setError('Red gerekçesi zorunludur.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/expense-entries', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: actionData.expenseId,
          status: action === 'approve' ? 'approved' : 'rejected',
          approved_by: action === 'approve' ? user.id : null,
          rejection_reason: action === 'reject' ? actionData.rejectionReason : null,
          admin_notes: actionData.adminNotes || null
        }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchExpenses();
        setProcessingExpense(null);
        setActionData({
          action: '' as any,
          expenseId: '',
          rejectionReason: '',
          adminNotes: ''
        });
      } else {
        setError(data.error || 'İşlem sırasında hata oluştu.');
      }
    } catch (error) {
      console.error('Error processing expense:', error);
      setError('İşlem sırasında hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const openActionModal = (expense: ExpenseEntry, action: 'approve' | 'reject') => {
    setActionData({
      action,
      expenseId: expense.id,
      rejectionReason: '',
      adminNotes: ''
    });
    setProcessingExpense(expense.id);
  };

  const getUserName = (expense: ExpenseEntry) => {
    if (expense.user?.raw_user_meta_data?.first_name && expense.user?.raw_user_meta_data?.last_name) {
      return `${expense.user.raw_user_meta_data.first_name} ${expense.user.raw_user_meta_data.last_name}`;
    }
    return expense.user?.email || 'Bilinmeyen Kullanıcı';
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) {
      setError('Kategori adı zorunludur.');
      return;
    }

    try {
      // Bu endpoint'i oluşturmamız gerekecek
      const response = await fetch('/api/admin/expense-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCategory),
      });

      const data = await response.json();

      if (data.success) {
        await fetchCategories();
        setNewCategory({ name: '', description: '' });
        setError('');
      } else {
        setError(data.error || 'Kategori oluşturulurken hata oluştu.');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      setError('Kategori oluşturulurken hata oluştu.');
    }
  };

  // Calculate statistics
  const stats = {
    total: expenses.length,
    pending: expenses.filter(e => e.status === 'pending').length,
    approved: expenses.filter(e => e.status === 'approved').length,
    rejected: expenses.filter(e => e.status === 'rejected').length,
    totalAmount: expenses.reduce((sum, e) => sum + e.amount, 0),
    pendingAmount: expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0),
    approvedAmount: expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0),
    rejectedAmount: expenses.filter(e => e.status === 'rejected').reduce((sum, e) => sum + e.amount, 0)
  };

  // Calculate monthly statistics
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyExpenses = expenses.filter(e => e.expense_date.startsWith(currentMonth));
  const monthlyStats = {
    total: monthlyExpenses.length,
    amount: monthlyExpenses.reduce((sum, e) => sum + e.amount, 0)
  };

  if (isLoading && expenses.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Masraf Girişi Yönetimi</h1>
              <p className="text-slate-400">Personel masraf girişlerini yönetin ve onaylayın</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setManagingCategories(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700/50 text-slate-300 hover:text-white transition-colors"
              >
                <Settings className="w-4 h-4" />
                Kategoriler
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Expenses */}
          <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-sm rounded-2xl border border-blue-500/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Receipt className="w-6 h-6 text-blue-400" />
              </div>
              <span className="text-2xl font-bold text-blue-400">{stats.total}</span>
            </div>
            <h3 className="text-white font-semibold mb-1">Toplam Masraf</h3>
            <p className="text-slate-400 text-sm">{formatCurrencySafe(stats.totalAmount, '₺')} TL</p>
          </div>

          {/* Pending */}
          <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-sm rounded-2xl border border-yellow-500/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-400" />
              </div>
              <span className="text-2xl font-bold text-yellow-400">{stats.pending}</span>
            </div>
            <h3 className="text-white font-semibold mb-1">Beklemede</h3>
            <p className="text-slate-400 text-sm">{formatCurrencySafe(stats.pendingAmount, '₺')} TL</p>
          </div>

          {/* Approved */}
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-2xl border border-green-500/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <span className="text-2xl font-bold text-green-400">{stats.approved}</span>
            </div>
            <h3 className="text-white font-semibold mb-1">Onaylanan</h3>
            <p className="text-slate-400 text-sm">{formatCurrencySafe(stats.approvedAmount, '₺')} TL</p>
          </div>

          {/* Monthly */}
          <div className="bg-gradient-to-r from-purple-500/20 to-violet-500/20 backdrop-blur-sm rounded-2xl border border-purple-500/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-400" />
              </div>
              <span className="text-2xl font-bold text-purple-400">{monthlyStats.total}</span>
            </div>
            <h3 className="text-white font-semibold mb-1">Bu Ay</h3>
            <p className="text-slate-400 text-sm">{formatCurrencySafe(monthlyStats.amount, '₺')} TL</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Durum</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="all">Tümü</option>
                <option value="pending">Beklemede</option>
                <option value="approved">Onaylanan</option>
                <option value="rejected">Reddedilen</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Başlangıç Tarihi</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Bitiş Tarihi</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterStatus('all');
                  setFilterDateFrom('');
                  setFilterDateTo('');
                }}
                className="w-full px-4 py-3 bg-slate-700/50 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors"
              >
                Filtreleri Temizle
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Expenses Table */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Kullanıcı</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Başlık</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Kategori</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Tutar</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Tarih</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Durum</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{getUserName(expense)}</p>
                          <p className="text-slate-400 text-sm">{expense.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <p className="text-white font-medium">{expense.title}</p>
                        {expense.vendor_name && (
                          <p className="text-slate-400 text-sm">{expense.vendor_name}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-slate-300">{expense.category?.name}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-green-400 font-semibold">
                        {formatCurrencySafe(expense.amount, expense.currency)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-slate-300">
                        {new Date(expense.expense_date).toLocaleDateString('tr-TR')}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-lg text-sm font-medium ${statusColors[expense.status]}`}>
                        {statusLabels[expense.status]}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setViewingExpense(expense)}
                          className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                          title="Detayları Görüntüle"
                        >
                          <Eye className="w-4 h-4 text-slate-400 hover:text-cyan-400" />
                        </button>
                        {expense.status === 'pending' && (
                          <>
                            <button
                              onClick={() => openActionModal(expense, 'approve')}
                              className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                              title="Onayla"
                            >
                              <CheckCircle className="w-4 h-4 text-slate-400 hover:text-green-400" />
                            </button>
                            <button
                              onClick={() => openActionModal(expense, 'reject')}
                              className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                              title="Reddet"
                            >
                              <XCircle className="w-4 h-4 text-slate-400 hover:text-red-400" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {expenses.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Receipt className="w-8 h-8 text-slate-600" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Masraf Bulunamadı</h3>
              <p className="text-slate-400">Henüz onaylanacak masraf girişi bulunmuyor.</p>
            </div>
          )}
        </div>

        {/* View Expense Modal */}
        {viewingExpense && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-3xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Masraf Detayları</h3>
                  <button
                    onClick={() => setViewingExpense(null)}
                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                <div className="space-y-6">
                  {/* User and Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-slate-400 mb-2">Kullanıcı</h4>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-semibold">{getUserName(viewingExpense)}</p>
                          <p className="text-slate-400 text-sm">{viewingExpense.user?.email}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-slate-400 mb-2">Durum</h4>
                      <span className={`px-3 py-1 rounded-lg text-sm font-medium ${statusColors[viewingExpense.status]}`}>
                        {statusLabels[viewingExpense.status]}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-slate-400 mb-2">Başlık</h4>
                      <p className="text-white font-semibold">{viewingExpense.title}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-slate-400 mb-2">Kategori</h4>
                      <p className="text-white">{viewingExpense.category?.name}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-slate-400 mb-2">Tutar</h4>
                      <p className="text-green-400 font-bold text-lg">
                        {formatCurrencySafe(viewingExpense.amount, viewingExpense.currency)}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-slate-400 mb-2">Tarih</h4>
                      <p className="text-white">{new Date(viewingExpense.expense_date).toLocaleDateString('tr-TR')}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-slate-400 mb-2">Ödeme Yöntemi</h4>
                      <p className="text-white">{paymentMethods[viewingExpense.payment_method as keyof typeof paymentMethods]}</p>
                    </div>
                    {viewingExpense.vendor_name && (
                      <div>
                        <h4 className="text-sm font-medium text-slate-400 mb-2">Satıcı</h4>
                        <p className="text-white">{viewingExpense.vendor_name}</p>
                      </div>
                    )}
                    {viewingExpense.department && (
                      <div>
                        <h4 className="text-sm font-medium text-slate-400 mb-2">Departman</h4>
                        <p className="text-white">{viewingExpense.department}</p>
                      </div>
                    )}
                  </div>

                  {viewingExpense.description && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-400 mb-2">Açıklama</h4>
                      <p className="text-white">{viewingExpense.description}</p>
                    </div>
                  )}

                  {viewingExpense.rejection_reason && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-400 mb-2">Red Gerekçesi</h4>
                      <p className="text-red-400">{viewingExpense.rejection_reason}</p>
                    </div>
                  )}

                  {viewingExpense.admin_notes && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-400 mb-2">Admin Notları</h4>
                      <p className="text-white">{viewingExpense.admin_notes}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-slate-400 mb-2">Gönderilme Tarihi</h4>
                      <p className="text-white">{new Date(viewingExpense.submitted_at).toLocaleDateString('tr-TR')}</p>
                    </div>
                    {viewingExpense.approved_at && (
                      <div>
                        <h4 className="text-sm font-medium text-slate-400 mb-2">Onaylanma Tarihi</h4>
                        <p className="text-white">{new Date(viewingExpense.approved_at).toLocaleDateString('tr-TR')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-700/50">
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setViewingExpense(null)}
                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                  >
                    Kapat
                  </button>
                  {viewingExpense.status === 'pending' && (
                    <>
                      <button
                        onClick={() => {
                          setViewingExpense(null);
                          openActionModal(viewingExpense, 'approve');
                        }}
                        className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-200 font-medium"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Onayla
                      </button>
                      <button
                        onClick={() => {
                          setViewingExpense(null);
                          openActionModal(viewingExpense, 'reject');
                        }}
                        className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 transition-all duration-200 font-medium"
                      >
                        <XCircle className="w-4 h-4" />
                        Reddet
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Modal (Approve/Reject) */}
        {processingExpense && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-md w-full">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">
                    {actionData.action === 'approve' ? 'Masrafı Onayla' : 'Masrafı Reddet'}
                  </h3>
                  <button
                    onClick={() => {
                      setProcessingExpense(null);
                      setActionData({
                        action: '' as any,
                        expenseId: '',
                        rejectionReason: '',
                        adminNotes: ''
                      });
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
                  {actionData.action === 'reject' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Red Gerekçesi *
                      </label>
                      <textarea
                        value={actionData.rejectionReason}
                        onChange={(e) => setActionData({ ...actionData, rejectionReason: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
                        rows={3}
                        placeholder="Masrafın neden reddedildiğini açıklayın..."
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Admin Notları (Opsiyonel)
                    </label>
                    <textarea
                      value={actionData.adminNotes}
                      onChange={(e) => setActionData({ ...actionData, adminNotes: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                      rows={2}
                      placeholder="Ek notlarınız..."
                    />
                  </div>

                  {actionData.action === 'approve' && (
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <p className="text-green-400 font-medium">Bu masraf onaylanacak</p>
                      </div>
                      <p className="text-slate-400 text-sm mt-1">
                        Onayladıktan sonra bu işlem geri alınamaz.
                      </p>
                    </div>
                  )}

                  {actionData.action === 'reject' && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        <p className="text-red-400 font-medium">Bu masraf reddedilecek</p>
                      </div>
                      <p className="text-slate-400 text-sm mt-1">
                        Kullanıcı red gerekçesini görebilecek.
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
                      setProcessingExpense(null);
                      setActionData({
                        action: '' as any,
                        expenseId: '',
                        rejectionReason: '',
                        adminNotes: ''
                      });
                    }}
                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={() => handleExpenseAction(actionData.action)}
                    disabled={isLoading || (actionData.action === 'reject' && !actionData.rejectionReason.trim())}
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed ${actionData.action === 'approve'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                      : 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600'
                      } text-white`}
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        İşleniyor...
                      </>
                    ) : (
                      <>
                        {actionData.action === 'approve' ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        {actionData.action === 'approve' ? 'Onayla' : 'Reddet'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Category Management Modal */}
        {managingCategories && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-2xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Kategori Yönetimi</h3>
                  <button
                    onClick={() => setManagingCategories(false)}
                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                {/* Add New Category */}
                <div className="mb-6 p-4 bg-slate-700/30 rounded-xl border border-slate-600/50">
                  <h4 className="text-lg font-semibold text-white mb-4">Yeni Kategori Ekle</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Kategori Adı *</label>
                      <input
                        type="text"
                        value={newCategory.name}
                        onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                        placeholder="Kategori adı"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Açıklama</label>
                      <input
                        type="text"
                        value={newCategory.description}
                        onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                        placeholder="Kategori açıklaması"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={handleCreateCategory}
                      disabled={!newCategory.name.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                      Kategori Ekle
                    </button>
                  </div>
                </div>

                {/* Existing Categories */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">Mevcut Kategoriler</h4>
                  <div className="space-y-3">
                    {categories.map((category) => (
                      <div key={category.id} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl border border-slate-600/50">
                        <div>
                          <h5 className="text-white font-medium">{category.name}</h5>
                          {category.description && (
                            <p className="text-slate-400 text-sm">{category.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${category.is_active
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                            }`}>
                            {category.is_active ? 'Aktif' : 'Pasif'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-700/50">
                <div className="flex items-center justify-end">
                  <button
                    onClick={() => setManagingCategories(false)}
                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
