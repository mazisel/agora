'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Search, 
  Filter,
  Calendar,
  User,
  FileText,
  CreditCard,
  Wallet,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  EyeOff,
  Edit3,
  Trash2,
  X,
  Save
} from 'lucide-react';

interface FinanceTransaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: string;
  employee_id?: string;
  employee_name?: string;
  payment_method: 'cash' | 'bank_transfer' | 'credit_card' | 'check';
  reference_number?: string;
  created_at: string;
  created_by: string;
}

interface FinanceCategory {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
}

interface FinanceEmployee {
  id: string;
  first_name: string;
  last_name: string;
  personnel_number: string;
}

export default function FinancePage() {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [employees, setEmployees] = useState<FinanceEmployee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinanceTransaction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAmounts, setShowAmounts] = useState(false);
  
  const { user, loading } = useAuth();
  const router = useRouter();

  const [newTransaction, setNewTransaction] = useState({
    type: 'expense' as 'income' | 'expense',
    category: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    employee_id: '',
    payment_method: 'bank_transfer' as 'cash' | 'bank_transfer' | 'credit_card' | 'check',
    reference_number: ''
  });

  // Default categories
  const defaultCategories: FinanceCategory[] = [
    // Income categories
    { id: '1', name: 'Proje Geliri', type: 'income', color: 'bg-green-500', icon: '💼' },
    { id: '2', name: 'Danışmanlık', type: 'income', color: 'bg-emerald-500', icon: '🎯' },
    { id: '3', name: 'Ürün Satışı', type: 'income', color: 'bg-teal-500', icon: '📦' },
    { id: '4', name: 'Yatırım Geliri', type: 'income', color: 'bg-cyan-500', icon: '📈' },
    { id: '5', name: 'Diğer Gelirler', type: 'income', color: 'bg-blue-500', icon: '💰' },
    
    // Expense categories
    { id: '6', name: 'Maaşlar', type: 'expense', color: 'bg-red-500', icon: '👥' },
    { id: '7', name: 'Ofis Kirası', type: 'expense', color: 'bg-orange-500', icon: '🏢' },
    { id: '8', name: 'Teknoloji', type: 'expense', color: 'bg-purple-500', icon: '💻' },
    { id: '9', name: 'Pazarlama', type: 'expense', color: 'bg-pink-500', icon: '📢' },
    { id: '10', name: 'Seyahat', type: 'expense', color: 'bg-indigo-500', icon: '✈️' },
    { id: '11', name: 'Eğitim', type: 'expense', color: 'bg-violet-500', icon: '📚' },
    { id: '12', name: 'Hukuki', type: 'expense', color: 'bg-slate-500', icon: '⚖️' },
    { id: '13', name: 'Sigorta', type: 'expense', color: 'bg-amber-500', icon: '🛡️' },
    { id: '14', name: 'Diğer Giderler', type: 'expense', color: 'bg-gray-500', icon: '📋' }
  ];

  // Fetch data from Supabase
  const fetchData = async () => {
    try {
      // Fetch transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('finance_transactions')
        .select('*')
        .order('date', { ascending: false });

      if (transactionsError) throw transactionsError;

      // Fetch employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, personnel_number')
        .eq('status', 'active')
        .order('first_name');

      if (employeesError) throw employeesError;

      setTransactions(transactionsData || []);
      setEmployees(employeesData || []);
      setCategories(defaultCategories);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Veriler yüklenirken hata oluştu.');
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Fetch data on component mount
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  // Filter transactions
  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (transaction.employee_name && transaction.employee_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === 'all' || transaction.type === filterType;
    const matchesCategory = !filterCategory || transaction.category === filterCategory;
    
    const matchesDateFrom = !filterDateFrom || transaction.date >= filterDateFrom;
    const matchesDateTo = !filterDateTo || transaction.date <= filterDateTo;
    
    return matchesSearch && matchesType && matchesCategory && matchesDateFrom && matchesDateTo;
  });

  // Calculate totals
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const balance = totalIncome - totalExpense;

  // Calculate filtered totals
  const filteredIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const filteredExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const getCategoryInfo = (categoryName: string) => {
    return categories.find(c => c.name === categoryName) || { color: 'bg-gray-500', icon: '📋' };
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee ? `${employee.first_name} ${employee.last_name}` : '';
  };

  const formatAmount = (amount: number) => {
    return showAmounts ? `${amount.toLocaleString('tr-TR')} TL` : '••••••• TL';
  };

  const handleCreateTransaction = async () => {
    if (!newTransaction.category || !newTransaction.amount || !newTransaction.description) {
      setError('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const employeeName = newTransaction.employee_id ? getEmployeeName(newTransaction.employee_id) : null;
      
      const { error } = await supabase
        .from('finance_transactions')
        .insert([{
          type: newTransaction.type,
          category: newTransaction.category,
          amount: parseFloat(newTransaction.amount),
          description: newTransaction.description,
          date: newTransaction.date,
          employee_id: newTransaction.employee_id || null,
          employee_name: employeeName,
          payment_method: newTransaction.payment_method,
          reference_number: newTransaction.reference_number || null,
          created_by: user.id
        }]);

      if (error) throw error;

      await fetchData();
      
      setNewTransaction({
        type: 'expense',
        category: '',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        employee_id: '',
        payment_method: 'bank_transfer',
        reference_number: ''
      });
      setIsCreating(false);
      setIsLoading(false);
      
      alert('İşlem başarıyla eklendi!');
    } catch (error) {
      console.error('Error creating transaction:', error);
      setError('İşlem eklenirken hata oluştu.');
      setIsLoading(false);
    }
  };

  const handleUpdateTransaction = async () => {
    if (!editingTransaction) return;

    setIsLoading(true);
    setError('');

    try {
      const employeeName = editingTransaction.employee_id ? getEmployeeName(editingTransaction.employee_id) : null;
      
      const { error } = await supabase
        .from('finance_transactions')
        .update({
          type: editingTransaction.type,
          category: editingTransaction.category,
          amount: editingTransaction.amount,
          description: editingTransaction.description,
          date: editingTransaction.date,
          employee_id: editingTransaction.employee_id || null,
          employee_name: employeeName,
          payment_method: editingTransaction.payment_method,
          reference_number: editingTransaction.reference_number || null
        })
        .eq('id', editingTransaction.id);

      if (error) throw error;

      await fetchData();
      setEditingTransaction(null);
      setIsLoading(false);
      
      alert('İşlem başarıyla güncellendi!');
    } catch (error) {
      console.error('Error updating transaction:', error);
      setError('İşlem güncellenirken hata oluştu.');
      setIsLoading(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Bu işlemi silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('finance_transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchData();
      alert('İşlem başarıyla silindi!');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      setError('İşlem silinirken hata oluştu.');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Finans Yönetimi</h2>
            <p className="text-slate-400">Şirket gelir ve giderlerini yönetin</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowAmounts(!showAmounts)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700/50 text-slate-300 hover:text-white transition-colors"
              title={showAmounts ? 'Tutarları Gizle' : 'Tutarları Göster'}
            >
              {showAmounts ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showAmounts ? 'Gizle' : 'Göster'}
            </button>
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 font-medium"
            >
              <Plus className="w-4 h-4" />
              Yeni İşlem
            </button>
          </div>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Total Balance */}
        <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-sm rounded-2xl border border-blue-500/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-blue-400" />
            </div>
            <span className={`text-2xl font-bold ${balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {balance >= 0 ? '+' : ''}{formatAmount(balance)}
            </span>
          </div>
          <h3 className="text-white font-semibold mb-1">Net Bakiye</h3>
          <p className="text-slate-400 text-sm">Toplam gelir - gider</p>
        </div>

        {/* Total Income */}
        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-2xl border border-green-500/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
            <span className="text-2xl font-bold text-green-400">
              +{formatAmount(totalIncome)}
            </span>
          </div>
          <h3 className="text-white font-semibold mb-1">Toplam Gelir</h3>
          <p className="text-slate-400 text-sm">{transactions.filter(t => t.type === 'income').length} işlem</p>
        </div>

        {/* Total Expense */}
        <div className="bg-gradient-to-r from-red-500/20 to-pink-500/20 backdrop-blur-sm rounded-2xl border border-red-500/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-400" />
            </div>
            <span className="text-2xl font-bold text-red-400">
              -{formatAmount(totalExpense)}
            </span>
          </div>
          <h3 className="text-white font-semibold mb-1">Toplam Gider</h3>
          <p className="text-slate-400 text-sm">{transactions.filter(t => t.type === 'expense').length} işlem</p>
        </div>

        {/* This Month */}
        <div className="bg-gradient-to-r from-purple-500/20 to-violet-500/20 backdrop-blur-sm rounded-2xl border border-purple-500/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-400" />
            </div>
            <span className="text-2xl font-bold text-purple-400">
              {transactions.filter(t => t.date.startsWith(new Date().toISOString().slice(0, 7))).length}
            </span>
          </div>
          <h3 className="text-white font-semibold mb-1">Bu Ay</h3>
          <p className="text-slate-400 text-sm">İşlem sayısı</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="İşlem ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
            >
              <option value="all">Tüm İşlemler</option>
              <option value="income">Gelirler</option>
              <option value="expense">Giderler</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
            >
              <option value="">Tüm Kategoriler</option>
              {categories.map(category => (
                <option key={category.id} value={category.name}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
            />
          </div>

          {/* Date To */}
          <div>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
            />
          </div>
        </div>

        {/* Filtered Results Summary */}
        {(searchTerm || filterType !== 'all' || filterCategory || filterDateFrom || filterDateTo) && (
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-slate-300">
                  Filtrelenmiş: {filteredTransactions.length} işlem
                </span>
                <span className="text-green-400">
                  Gelir: +{formatAmount(filteredIncome)}
                </span>
                <span className="text-red-400">
                  Gider: -{formatAmount(filteredExpense)}
                </span>
              </div>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('all');
                  setFilterCategory('');
                  setFilterDateFrom('');
                  setFilterDateTo('');
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                Filtreleri Temizle
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Tarih</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Kategori</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Açıklama</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Personel</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Ödeme</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Tutar</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => {
                const categoryInfo = getCategoryInfo(transaction.category);
                return (
                  <tr key={transaction.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                    <td className="py-4 px-6">
                      <span className="text-slate-300">{new Date(transaction.date).toLocaleDateString('tr-TR')}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{categoryInfo.icon}</span>
                        <span className="text-white">{transaction.category}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <div className="text-white font-medium">{transaction.description}</div>
                        {transaction.reference_number && (
                          <div className="text-slate-400 text-sm">Ref: {transaction.reference_number}</div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-slate-300">
                        {transaction.employee_name || '-'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2 py-1 rounded-lg text-xs font-medium bg-slate-700/50 text-slate-300">
                        {transaction.payment_method === 'cash' ? 'Nakit' :
                         transaction.payment_method === 'bank_transfer' ? 'Havale' :
                         transaction.payment_method === 'credit_card' ? 'Kredi Kartı' :
                         transaction.payment_method === 'check' ? 'Çek' : transaction.payment_method}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {transaction.type === 'income' ? (
                          <ArrowUpRight className="w-4 h-4 text-green-400" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-red-400" />
                        )}
                        <span className={`font-bold ${transaction.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                          {transaction.type === 'income' ? '+' : '-'}{formatAmount(transaction.amount)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingTransaction(transaction)}
                          className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                          title="Düzenle"
                        >
                          <Edit3 className="w-4 h-4 text-slate-400 hover:text-blue-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {searchTerm || filterType !== 'all' || filterCategory || filterDateFrom || filterDateTo 
                ? 'İşlem Bulunamadı' 
                : 'Henüz İşlem Yok'}
            </h3>
            <p className="text-slate-400 mb-6">
              {searchTerm || filterType !== 'all' || filterCategory || filterDateFrom || filterDateTo
                ? 'Arama kriterlerinize uygun işlem bulunamadı'
                : 'İlk finansal işlemi oluşturun'}
            </p>
            {!(searchTerm || filterType !== 'all' || filterCategory || filterDateFrom || filterDateTo) && (
              <button
                onClick={() => setIsCreating(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 font-medium"
              >
                İlk İşlemi Oluştur
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create Transaction Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Yeni Finansal İşlem</h3>
                <button
                  onClick={() => setIsCreating(false)}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {/* Error Message */}
              {error && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Transaction Type */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">İşlem Tipi *</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        checked={newTransaction.type === 'income'}
                        onChange={() => setNewTransaction({ ...newTransaction, type: 'income', category: '' })}
                        className="w-4 h-4 text-green-500 bg-slate-700 border-slate-600 focus:ring-green-500"
                      />
                      <span className="text-green-400 font-medium">Gelir</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        checked={newTransaction.type === 'expense'}
                        onChange={() => setNewTransaction({ ...newTransaction, type: 'expense', category: '' })}
                        className="w-4 h-4 text-red-500 bg-slate-700 border-slate-600 focus:ring-red-500"
                      />
                      <span className="text-red-400 font-medium">Gider</span>
                    </label>
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Kategori *</label>
                  <select
                    value={newTransaction.category}
                    onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    required
                  >
                    <option value="">Kategori Seçiniz</option>
                    {categories
                      .filter(cat => cat.type === newTransaction.type)
                      .map(category => (
                        <option key={category.id} value={category.name}>
                          {category.icon} {category.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Tutar (TL) *</label>
                  <input
                    type="number"
                    value={newTransaction.amount}
                    onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Tarih *</label>
                  <input
                    type="date"
                    value={newTransaction.date}
                    onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    required
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Ödeme Yöntemi</label>
                  <select
                    value={newTransaction.payment_method}
                    onChange={(e) => setNewTransaction({ ...newTransaction, payment_method: e.target.value as any })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  >
                    <option value="bank_transfer">Havale/EFT</option>
                    <option value="cash">Nakit</option>
                    <option value="credit_card">Kredi Kartı</option>
                    <option value="check">Çek</option>
                  </select>
                </div>

                {/* Employee */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">İlgili Personel</label>
                  <select
                    value={newTransaction.employee_id}
                    onChange={(e) => setNewTransaction({ ...newTransaction, employee_id: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  >
                    <option value="">Personel Seçiniz (Opsiyonel)</option>
                    {employees.map(employee => (
                      <option key={employee.id} value={employee.id}>
                        {employee.first_name} {employee.last_name} ({employee.personnel_number})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reference Number */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Referans No</label>
                  <input
                    type="text"
                    value={newTransaction.reference_number}
                    onChange={(e) => setNewTransaction({ ...newTransaction, reference_number: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="Fatura no, dekont no vb."
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Açıklama *</label>
                  <textarea
                    value={newTransaction.description}
                    onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none"
                    rows={3}
                    placeholder="İşlem detaylarını açıklayın..."
                    required
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-700/50">
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleCreateTransaction}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Ekleniyor...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      İşlem Ekle
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">İşlem Düzenle</h3>
                <button
                  onClick={() => setEditingTransaction(null)}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Transaction Type */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">İşlem Tipi</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="editType"
                        checked={editingTransaction.type === 'income'}
                        onChange={() => setEditingTransaction({ ...editingTransaction, type: 'income' })}
                        className="w-4 h-4 text-green-500 bg-slate-700 border-slate-600 focus:ring-green-500"
                      />
                      <span className="text-green-400 font-medium">Gelir</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="editType"
                        checked={editingTransaction.type === 'expense'}
                        onChange={() => setEditingTransaction({ ...editingTransaction, type: 'expense' })}
                        className="w-4 h-4 text-red-500 bg-slate-700 border-slate-600 focus:ring-red-500"
                      />
                      <span className="text-red-400 font-medium">Gider</span>
                    </label>
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Kategori</label>
                  <select
                    value={editingTransaction.category}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, category: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  >
                    {categories
                      .filter(cat => cat.type === editingTransaction.type)
                      .map(category => (
                        <option key={category.id} value={category.name}>
                          {category.icon} {category.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Tutar (TL)</label>
                  <input
                    type="number"
                    value={editingTransaction.amount}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, amount: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Tarih</label>
                  <input
                    type="date"
                    value={editingTransaction.date}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, date: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Ödeme Yöntemi</label>
                  <select
                    value={editingTransaction.payment_method}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, payment_method: e.target.value as any })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  >
                    <option value="bank_transfer">Havale/EFT</option>
                    <option value="cash">Nakit</option>
                    <option value="credit_card">Kredi Kartı</option>
                    <option value="check">Çek</option>
                  </select>
                </div>

                {/* Employee */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">İlgili Personel</label>
                  <select
                    value={editingTransaction.employee_id || ''}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, employee_id: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  >
                    <option value="">Personel Seçiniz (Opsiyonel)</option>
                    {employees.map(employee => (
                      <option key={employee.id} value={employee.id}>
                        {employee.first_name} {employee.last_name} ({employee.personnel_number})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reference Number */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Referans No</label>
                  <input
                    type="text"
                    value={editingTransaction.reference_number || ''}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, reference_number: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="Fatura no, dekont no vb."
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Açıklama</label>
                  <textarea
                    value={editingTransaction.description}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-700/50">
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setEditingTransaction(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleUpdateTransaction}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Güncelleniyor...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Güncelle
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
