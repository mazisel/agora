'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  Calendar,
  FileText,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  EyeOff,
  Edit3,
  Trash2,
  X,
  Save,
  Upload,
  Paperclip,
  Download,
  Image,
  File
} from 'lucide-react';
import { formatCurrencySafe } from '@/lib/dateUtils';

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
  updated_at?: string;
  task_id?: string;
  task_title?: string;
  project_id?: string;
  project_name?: string;
  approved_by_id?: string;
  approved_by_name?: string;
  account_id?: string;
}

interface FinanceCategory {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
}

interface FinanceDocument {
  id: string;
  transaction_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
  public_url?: string;
}

export default function FinancePage() {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
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
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState('');
  const [transactionDocuments, setTransactionDocuments] = useState<{ [key: string]: FinanceDocument[] }>({});
  const [viewingDocuments, setViewingDocuments] = useState<string | null>(null);
  const [viewingTransaction, setViewingTransaction] = useState<FinanceTransaction | null>(null);

  const { user, session, loading } = useAuth();
  const router = useRouter();

  const [newTransaction, setNewTransaction] = useState({
    type: 'expense' as 'income' | 'expense',
    category: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
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

      setTransactions(transactionsData || []);
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

  const categoryOptions = Array.from(new Set([
    ...defaultCategories.map(category => category.name),
    ...transactions.map(transaction => transaction.category).filter(Boolean)
  ])).sort((a, b) => a.localeCompare(b, 'tr'));

  const getCategoryInfo = (categoryName: string) => {
    return defaultCategories.find(c => c.name === categoryName) || { color: 'bg-gray-500', icon: '📋' };
  };

  const getCategoryLabel = (type: 'income' | 'expense') =>
    type === 'income' ? 'Nereden Geldi' : 'Nereye Gitti';

  const getCategoryPlaceholder = (type: 'income' | 'expense') =>
    type === 'income'
      ? 'Örn: Müşteri ödemesi, banka...'
      : 'Örn: Kira, tedarikçi, ofis gideri...';

  const formatAmount = (amount: number) =>
    showAmounts ? formatCurrencySafe(amount, '₺') : '••••••• TL';

  const handleCreateTransaction = async () => {
    const trimmedCategory = newTransaction.category.trim();
    const trimmedDescription = newTransaction.description.trim();

    if (!trimmedCategory || !newTransaction.amount || !newTransaction.date) {
      setError('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // İşlemi oluştur
      const { data: transactionData, error: transactionError } = await supabase
        .from('finance_transactions')
        .insert([{
          type: newTransaction.type,
          category: trimmedCategory,
          amount: parseFloat(newTransaction.amount),
          description: trimmedDescription,
          date: newTransaction.date,
          payment_method: 'bank_transfer',
          created_by: user.id
        }])
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Dosyaları yükle
      if (uploadingFiles.length > 0) {
        setUploadError('');

        for (const file of uploadingFiles) {
          try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('transactionId', transactionData.id);

            const response = await fetch('/api/admin/upload-finance-document', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session?.access_token}`
              },
              body: formData,
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Dosya yüklenirken hata oluştu');
            }
          } catch (uploadError: unknown) {
            const message = uploadError instanceof Error ? uploadError.message : 'Bilinmeyen hata';
            console.error('File upload error:', uploadError);
            setUploadError(`${file.name} dosyası yüklenirken hata oluştu: ${message}`);
          }
        }
      }

      await fetchData();

      // Form ve dosyaları temizle
      setNewTransaction({
        type: 'expense',
        category: '',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      setUploadingFiles([]);
      setUploadError('');
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
      const trimmedCategory = editingTransaction.category.trim();
      const trimmedDescription = editingTransaction.description?.trim() || '';
      const amountValue = editingTransaction.amount;

      if (!trimmedCategory || !Number.isFinite(amountValue)) {
        setError('Lütfen tüm zorunlu alanları doldurun.');
        setIsLoading(false);
        return;
      }

      const { error } = await supabase
        .from('finance_transactions')
        .update({
          type: editingTransaction.type,
          category: trimmedCategory,
          amount: amountValue,
          description: trimmedDescription,
          date: editingTransaction.date
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

  // File upload functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadingFiles(files);
    setUploadError('');
  };

  const removeFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="w-4 h-4" />;
    }
    return <File className="w-4 h-4" />;
  };

  // Fetch documents for a transaction
  const fetchTransactionDocuments = async (transactionId: string) => {
    try {
      const response = await fetch(`/api/admin/finance-documents?transactionId=${transactionId}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setTransactionDocuments(prev => ({
          ...prev,
          [transactionId]: data.documents || []
        }));
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  // View documents for a transaction
  const handleViewDocuments = async (transactionId: string) => {
    if (!transactionDocuments[transactionId]) {
      await fetchTransactionDocuments(transactionId);
    }
    setViewingDocuments(transactionId);
  };

  // Delete a document
  const handleDeleteDocument = async (documentId: string, transactionId: string) => {
    if (!confirm('Bu belgeyi silmek istediğinizden emin misiniz?')) return;

    try {
      const response = await fetch(`/api/admin/upload-finance-document?id=${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (response.ok) {
        // Refresh documents for this transaction
        await fetchTransactionDocuments(transactionId);
        alert('Belge başarıyla silindi!');
      } else {
        const errorData = await response.json();
        alert(`Hata: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Belge silinirken hata oluştu.');
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
              onChange={(e) => setFilterType(e.target.value as 'all' | 'income' | 'expense')}
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
              <option value="">Tüm Kaynak/Hedef</option>
              {categoryOptions.map(category => (
                <option key={category} value={category}>
                  {category}
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
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Kaynak/Hedef</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Not</th>
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
                        <div className="text-white font-medium">
                          {transaction.description?.trim() ? transaction.description : 'Not eklenmemiş'}
                        </div>

                        {transaction.category.includes('Görev Harcaması') && (
                          <div className="mt-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-xs">
                                <FileText className="w-3 h-3" />
                                Görev Harcaması
                              </span>
                              {transaction.task_title && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded text-xs">
                                  📋 {transaction.task_title}
                                </span>
                              )}
                            </div>
                            {transaction.project_name && (
                              <div className="text-xs text-slate-400">
                                🏢 Proje: {transaction.project_name}
                              </div>
                            )}
                            {transaction.approved_by_name && (
                              <div className="text-xs text-green-400">
                                ✅ Onaylayan: {transaction.approved_by_name}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
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
                          onClick={() => setViewingTransaction(transaction)}
                          className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                          title="Detayları Görüntüle"
                        >
                          <Eye className="w-4 h-4 text-slate-400 hover:text-cyan-400" />
                        </button>
                        <button
                          onClick={() => handleViewDocuments(transaction.id)}
                          className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                          title="Fiş/Faturaları Görüntüle"
                        >
                          <Paperclip className="w-4 h-4 text-slate-400 hover:text-purple-400" />
                        </button>
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

                {/* Source/Destination */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {getCategoryLabel(newTransaction.type)} *
                  </label>
                  <input
                    type="text"
                    value={newTransaction.category}
                    onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder={getCategoryPlaceholder(newTransaction.type)}
                    list="category-suggestions"
                    required
                  />
                  <datalist id="category-suggestions">
                    {defaultCategories
                      .filter(cat => cat.type === newTransaction.type)
                      .map(category => (
                        <option key={category.id} value={category.name} />
                      ))}
                  </datalist>
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

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Not (Opsiyonel)</label>
                  <textarea
                    value={newTransaction.description}
                    onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none"
                    rows={3}
                    placeholder="Kısa bir not ekleyin..."
                  />
                </div>

                {/* File Upload */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4" />
                      Fiş / Fatura (Opsiyonel)
                    </div>
                  </label>

                  {/* File Input */}
                  <div className="mb-4">
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700/70 transition-all cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      Fiş/Fatura Seç (Resim, PDF, Word, Excel)
                    </label>
                  </div>

                  {/* Upload Error */}
                  {uploadError && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <p className="text-red-400 text-sm">{uploadError}</p>
                    </div>
                  )}

                  {/* Selected Files */}
                  {uploadingFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-slate-400">Seçilen dosyalar:</p>
                      {uploadingFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                          <div className="flex items-center gap-2">
                            {getFileIcon(file.type)}
                            <div>
                              <p className="text-sm text-white font-medium">{file.name}</p>
                              <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeFile(index)}
                            className="p-1 rounded-lg hover:bg-slate-600/50 transition-colors"
                            title="Dosyayı kaldır"
                          >
                            <X className="w-4 h-4 text-slate-400 hover:text-red-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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

                {/* Source/Destination */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {getCategoryLabel(editingTransaction.type)} *
                  </label>
                  <input
                    type="text"
                    value={editingTransaction.category}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, category: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder={getCategoryPlaceholder(editingTransaction.type)}
                    list="category-suggestions-edit"
                    required
                  />
                  <datalist id="category-suggestions-edit">
                    {defaultCategories
                      .filter(cat => cat.type === editingTransaction.type)
                      .map(category => (
                        <option key={category.id} value={category.name} />
                      ))}
                  </datalist>
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

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Not (Opsiyonel)</label>
                  <textarea
                    value={editingTransaction.description}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none"
                    rows={3}
                    placeholder="Kısa bir not ekleyin..."
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

      {/* View Documents Modal */}
      {viewingDocuments && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">
                  Fiş/Faturalar
                </h3>
                <button
                  onClick={() => setViewingDocuments(null)}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {transactionDocuments[viewingDocuments] && transactionDocuments[viewingDocuments].length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {transactionDocuments[viewingDocuments].map((document) => (
                    <div key={document.id} className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/50">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getFileIcon(document.file_type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate" title={document.file_name}>
                              {document.file_name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {formatFileSize(document.file_size)}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteDocument(document.id, viewingDocuments)}
                          className="p-1 rounded-lg hover:bg-slate-600/50 transition-colors"
                          title="Belgeyi sil"
                        >
                          <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
                        </button>
                      </div>

                      {/* Document Preview */}
                      <div className="mb-3">
                        {document.file_type.startsWith('image/') ? (
                          <div className="aspect-video bg-slate-800 rounded-lg overflow-hidden">
                            <img
                              src={document.public_url}
                              alt={document.file_name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                            <div className="hidden w-full h-full flex items-center justify-center">
                              <Image className="w-8 h-8 text-slate-500" />
                            </div>
                          </div>
                        ) : (
                          <div className="aspect-video bg-slate-800 rounded-lg flex items-center justify-center">
                            <div className="text-center">
                              <File className="w-12 h-12 text-slate-500 mx-auto mb-2" />
                              <p className="text-xs text-slate-400">
                                {document.file_type === 'application/pdf' ? 'PDF Belgesi' :
                                  document.file_type.includes('word') ? 'Word Belgesi' :
                                    document.file_type.includes('excel') || document.file_type.includes('sheet') ? 'Excel Belgesi' :
                                      'Belge'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Document Actions */}
                      <div className="flex items-center gap-2">
                        <a
                          href={document.public_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-xs font-medium flex-1 justify-center"
                        >
                          <Eye className="w-3 h-3" />
                          Görüntüle
                        </a>
                        <a
                          href={document.public_url}
                          download={document.file_name}
                          className="flex items-center gap-1 px-3 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-xs font-medium flex-1 justify-center"
                        >
                          <Download className="w-3 h-3" />
                          İndir
                        </a>
                      </div>

                      {/* Upload Date */}
                      <div className="mt-3 pt-3 border-t border-slate-600/50">
                        <p className="text-xs text-slate-400">
                          Yüklenme: {new Date(document.uploaded_at).toLocaleDateString('tr-TR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Paperclip className="w-8 h-8 text-slate-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Fiş/Fatura Bulunamadı
                  </h3>
                  <p className="text-slate-400">
                    Bu işlem için henüz yüklenmiş fiş/fatura bulunmuyor.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-700/50">
              <div className="flex items-center justify-end">
                <button
                  onClick={() => setViewingDocuments(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* View Transaction Details Modal */}
      {viewingTransaction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-3xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${viewingTransaction.type === 'income'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                    }`}>
                    {viewingTransaction.type === 'income' ? (
                      <TrendingUp className="w-6 h-6" />
                    ) : (
                      <TrendingDown className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">İşlem Detayları</h3>
                    <p className="text-slate-400 text-sm">
                      {viewingTransaction.type === 'income' ? 'Gelir' : 'Gider'} • {new Date(viewingTransaction.date).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingTransaction(null)}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Main Details */}
                <div className="space-y-6">
                  {/* Transaction Type & Amount */}
                  <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/50">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-slate-400 text-sm mb-1">İşlem Tipi</p>
                        <div className="flex items-center gap-2">
                          {viewingTransaction.type === 'income' ? (
                            <TrendingUp className="w-5 h-5 text-green-400" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-red-400" />
                          )}
                          <span className={`text-lg font-bold ${viewingTransaction.type === 'income' ? 'text-green-400' : 'text-red-400'
                            }`}>
                            {viewingTransaction.type === 'income' ? 'Gelir' : 'Gider'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-slate-600/50 pt-4">
                      <p className="text-slate-400 text-sm mb-1">Tutar</p>
                      <div className="flex items-center gap-2">
                        {viewingTransaction.type === 'income' ? (
                          <ArrowUpRight className="w-5 h-5 text-green-400" />
                        ) : (
                          <ArrowDownRight className="w-5 h-5 text-red-400" />
                        )}
                        <span className={`text-2xl font-bold ${viewingTransaction.type === 'income' ? 'text-green-400' : 'text-red-400'
                          }`}>
                          {viewingTransaction.type === 'income' ? '+' : '-'}
                          {formatCurrencySafe(viewingTransaction.amount, '₺')} TL
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Source/Destination */}
                  <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/50">
                    <p className="text-slate-400 text-sm mb-2">{getCategoryLabel(viewingTransaction.type)}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getCategoryInfo(viewingTransaction.category).icon}</span>
                      <div>
                        <p className="text-white font-semibold">{viewingTransaction.category}</p>
                      </div>
                    </div>
                  </div>

                  {/* Note */}
                  <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/50">
                    <p className="text-slate-400 text-sm mb-2">Not</p>
                    <p className="text-white leading-relaxed">
                      {viewingTransaction.description?.trim() ? viewingTransaction.description : 'Not eklenmemiş'}
                    </p>
                  </div>
                </div>

                {/* Middle Column - Date & Payment Details */}
                <div className="space-y-6">
                  {/* Date Information */}
                  <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/50">
                    <div className="flex items-center gap-3 mb-3">
                      <Calendar className="w-5 h-5 text-blue-400" />
                      <p className="text-slate-400 text-sm">İşlem Tarihi</p>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-white font-medium text-lg">
                          {new Date(viewingTransaction.date).toLocaleDateString('tr-TR', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                        <p className="text-slate-400 text-sm">
                          {new Date(viewingTransaction.date).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 pt-6 border-t border-slate-700/50">
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => {
                      handleViewDocuments(viewingTransaction.id);
                      setViewingTransaction(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-xl hover:bg-purple-500/30 transition-colors"
                  >
                    <Paperclip className="w-4 h-4" />
                    Fiş/Fatura Görüntüle
                  </button>
                  <button
                    onClick={() => {
                      setEditingTransaction(viewingTransaction);
                      setViewingTransaction(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-500/30 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    Düzenle
                  </button>
                  <button
                    onClick={() => {
                      setViewingTransaction(null);
                      handleDeleteTransaction(viewingTransaction.id);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Sil
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-700/50">
              <div className="flex items-center justify-end">
                <button
                  onClick={() => setViewingTransaction(null)}
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
  );
}
