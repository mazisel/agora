'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Receipt,
  Plus,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Edit3,
  Trash2,
  X,
  Upload,
  FileText,
  Paperclip,
  Download,
  ExternalLink
} from 'lucide-react';

interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
}

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
  category?: ExpenseCategory;
  attachments?: any[];
}

export default function ExpenseEntryPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [departments, setDepartments] = useState<{ id: string, name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [viewingExpense, setViewingExpense] = useState<ExpenseEntry | null>(null);
  const [editingExpense, setEditingExpense] = useState<ExpenseEntry | null>(null);
  const [error, setError] = useState('');

  const [newExpense, setNewExpense] = useState({
    category_id: '',
    title: '',
    description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    department: '',
    vendor_name: '',
    payment_method: 'cash',
    currency: 'TRY'
  });
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [viewingAttachment, setViewingAttachment] = useState<any>(null);

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
    if (!user) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/modules/expense-entry?userId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      const data = await response.json();

      if (data.success) {
        console.log('Frontend received expenses:', data.expenses);
        setExpenses(data.expenses);
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
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/expense-categories', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
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

  const fetchDepartments = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/departments', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      const data = await response.json();

      if (data.success) {
        setDepartments(data.departments);
      } else {
        console.error('Error fetching departments:', data.error);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
    fetchDepartments();
  }, [user]);

  const handleSubmit = async () => {
    if (!user) return;

    if (!newExpense.category_id || !newExpense.title || !newExpense.amount || !newExpense.expense_date) {
      setError('Lütfen gerekli alanları doldurun.');
      return;
    }

    setIsLoading(true);
    setError('');
    setUploadError('');

    try {
      // First create the expense
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/modules/expense-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          user_id: user.id,
          ...newExpense,
          amount: parseFloat(newExpense.amount)
        }),
      });

      const data = await response.json();

      if (data.success) {
        const expenseId = data.expense.id;

        // Upload files if any
        if (uploadingFiles.length > 0) {
          setIsUploading(true);

          for (const file of uploadingFiles) {
            try {
              const formData = new FormData();
              formData.append('file', file);
              formData.append('expenseId', expenseId);
              formData.append('userId', user.id);

              const uploadResponse = await fetch('/api/upload-expense-attachment', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${session?.access_token}`
                },
                body: formData,
              });

              const uploadData = await uploadResponse.json();

              if (!uploadData.success) {
                console.error('File upload failed:', uploadData.error);
                setUploadError(`${file.name} yüklenemedi: ${uploadData.error}`);
              }
            } catch (uploadError) {
              console.error('File upload error:', uploadError);
              setUploadError(`${file.name} yüklenirken hata oluştu.`);
            }
          }

          setIsUploading(false);
        }

        // Reset form
        setNewExpense({
          category_id: '',
          title: '',
          description: '',
          amount: '',
          expense_date: new Date().toISOString().split('T')[0],
          department: '',
          vendor_name: '',
          payment_method: 'cash',
          currency: 'TRY'
        });
        setUploadingFiles([]);
        setIsCreating(false);
        fetchExpenses();
      } else {
        setError(data.error || 'Masraf oluşturulurken hata oluştu.');
      }
    } catch (error) {
      console.error('Error creating expense:', error);
      setError('Masraf oluşturulurken hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (expense: ExpenseEntry) => {
    if (expense.status === 'pending') {
      setEditingExpense(expense);
      setNewExpense({
        category_id: expense.category_id,
        title: expense.title,
        description: expense.description || '',
        amount: expense.amount.toString(),
        expense_date: expense.expense_date,
        department: expense.department || '',
        vendor_name: expense.vendor_name || '',
        payment_method: expense.payment_method,
        currency: expense.currency
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingExpense) return;

    setIsLoading(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/modules/expense-entry', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          id: editingExpense.id,
          ...newExpense,
          amount: parseFloat(newExpense.amount)
        }),
      });

      const data = await response.json();

      if (data.success) {
        setEditingExpense(null);
        setNewExpense({
          category_id: '',
          title: '',
          description: '',
          amount: '',
          expense_date: new Date().toISOString().split('T')[0],
          department: '',
          vendor_name: '',
          payment_method: 'cash',
          currency: 'TRY'
        });
        fetchExpenses();
      } else {
        setError(data.error || 'Masraf güncellenirken hata oluştu.');
      }
    } catch (error) {
      console.error('Error updating expense:', error);
      setError('Masraf güncellenirken hata oluştu.');
    } finally {
      setIsLoading(false);
    }
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
              <h1 className="text-3xl font-bold text-white mb-2">Masraf Girişi</h1>
              <p className="text-slate-400">Masraf girişlerinizi oluşturun ve takip edin</p>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-200 font-medium"
            >
              <Plus className="w-5 h-5" />
              Yeni Masraf
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Expenses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {expenses.map((expense) => (
            <div key={expense.id} className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 hover:border-slate-600/50 transition-all">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Receipt className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white truncate">{expense.title}</h3>
                      {expense.attachments && expense.attachments.length > 0 && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Paperclip className="w-3 h-3 text-blue-400" />
                          <span className="text-xs text-blue-400">{expense.attachments.length}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-slate-400">
                      {new Date(expense.expense_date).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-lg text-sm font-medium flex-shrink-0 ${statusColors[expense.status]}`}>
                  {statusLabels[expense.status]}
                </span>
              </div>

              {/* Details */}
              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Kategori:</span>
                  <span className="text-sm text-slate-300">{expense.category?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Tutar:</span>
                  <span className="text-sm font-semibold text-green-400">
                    {expense.amount.toLocaleString('tr-TR')} {expense.currency}
                  </span>
                </div>
                {expense.vendor_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Satıcı:</span>
                    <span className="text-sm text-slate-300">{expense.vendor_name}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewingExpense(expense)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Detay
                </button>
                {expense.status === 'pending' && (
                  <button
                    onClick={() => handleEdit(expense)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {expenses.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Receipt className="w-12 h-12 text-slate-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Henüz masraf yok</h3>
            <p className="text-slate-400 mb-6">İlk masraf girişinizi oluşturun</p>
            <button
              onClick={() => setIsCreating(true)}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-200 font-medium"
            >
              İlk Masrafı Oluştur
            </button>
          </div>
        )}

        {/* Create/Edit Expense Modal */}
        {(isCreating || editingExpense) && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-2xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">
                    {editingExpense ? 'Masrafı Düzenle' : 'Yeni Masraf Girişi'}
                  </h3>
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setEditingExpense(null);
                      setNewExpense({
                        category_id: '',
                        title: '',
                        description: '',
                        amount: '',
                        expense_date: new Date().toISOString().split('T')[0],
                        department: '',
                        vendor_name: '',
                        payment_method: 'cash',
                        currency: 'TRY'
                      });
                      setUploadingFiles([]);
                    }}
                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Kategori *</label>
                      <select
                        value={newExpense.category_id}
                        onChange={(e) => setNewExpense({ ...newExpense, category_id: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
                      >
                        <option value="">Kategori seçin</option>
                        {categories.map(category => (
                          <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Başlık *</label>
                      <input
                        type="text"
                        value={newExpense.title}
                        onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                        placeholder="Masraf başlığı"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Tutar *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newExpense.amount}
                        onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Tarih *</label>
                      <input
                        type="date"
                        value={newExpense.expense_date}
                        onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Departman</label>
                      <select
                        value={newExpense.department}
                        onChange={(e) => setNewExpense({ ...newExpense, department: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
                      >
                        <option value="">Departman seçin</option>
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.name}>{dept.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Ödeme Yöntemi</label>
                      <select
                        value={newExpense.payment_method}
                        onChange={(e) => setNewExpense({ ...newExpense, payment_method: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
                      >
                        {Object.entries(paymentMethods).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Satıcı/Firma</label>
                      <input
                        type="text"
                        value={newExpense.vendor_name}
                        onChange={(e) => setNewExpense({ ...newExpense, vendor_name: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                        placeholder="Satıcı adı"
                      />
                    </div>

                  </div>

                  {/* File Upload Section */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Fatura/Fiş Yükle</label>
                    <div className="border-2 border-dashed border-slate-600 rounded-xl p-6 text-center">
                      <input
                        type="file"
                        multiple
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          if (e.target.files) {
                            setUploadingFiles(Array.from(e.target.files));
                          }
                        }}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <div className="flex flex-col items-center">
                          <Upload className="w-8 h-8 text-slate-400 mb-2" />
                          <p className="text-slate-300 font-medium mb-1">Dosya yüklemek için tıklayın</p>
                          <p className="text-slate-400 text-sm">PNG, JPG, PDF dosyaları desteklenir</p>
                        </div>
                      </label>
                    </div>

                    {/* Uploaded Files */}
                    {uploadingFiles.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {uploadingFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                            <div className="flex items-center gap-3">
                              <FileText className="w-4 h-4 text-slate-400" />
                              <span className="text-slate-300 text-sm">{file.name}</span>
                              <span className="text-slate-400 text-xs">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                            </div>
                            <button
                              onClick={() => {
                                setUploadingFiles(uploadingFiles.filter((_, i) => i !== index));
                              }}
                              className="text-red-400 hover:text-red-300 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {uploadError && (
                      <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-red-400 text-sm">{uploadError}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Açıklama</label>
                    <textarea
                      value={newExpense.description}
                      onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 resize-none"
                      rows={3}
                      placeholder="Masraf açıklaması..."
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-700/50">
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setEditingExpense(null);
                      setNewExpense({
                        category_id: '',
                        title: '',
                        description: '',
                        amount: '',
                        expense_date: new Date().toISOString().split('T')[0],
                        department: '',
                        vendor_name: '',
                        payment_method: 'cash',
                        currency: 'TRY'
                      });
                      setUploadingFiles([]);
                    }}
                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={editingExpense ? handleUpdate : handleSubmit}
                    disabled={isLoading || isUploading || !newExpense.category_id || !newExpense.title || !newExpense.amount}
                    className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading || isUploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        {isUploading ? 'Dosyalar yükleniyor...' : editingExpense ? 'Güncelleniyor...' : 'Oluşturuluyor...'}
                      </>
                    ) : (
                      <>
                        <Receipt className="w-4 h-4" />
                        {editingExpense ? 'Güncelle' : 'Masraf Oluştur'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Expense Modal */}
        {viewingExpense && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-2xl w-full max-h-[90vh] overflow-hidden">
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
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-slate-400 mb-2">Başlık</h4>
                      <p className="text-white font-semibold">{viewingExpense.title}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-slate-400 mb-2">Durum</h4>
                      <span className={`px-3 py-1 rounded-lg text-sm font-medium ${statusColors[viewingExpense.status]}`}>
                        {statusLabels[viewingExpense.status]}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-slate-400 mb-2">Kategori</h4>
                      <p className="text-white">{viewingExpense.category?.name}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-slate-400 mb-2">Tutar</h4>
                      <p className="text-green-400 font-bold text-lg">
                        {viewingExpense.amount.toLocaleString('tr-TR')} {viewingExpense.currency}
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

                  {/* Attachments Section */}
                  {viewingExpense.attachments && viewingExpense.attachments.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-400 mb-3">Yüklenen Belgeler</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {viewingExpense.attachments.map((attachment) => (
                          <div key={attachment.id} className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Paperclip className="w-5 h-5 text-blue-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-medium text-sm truncate">{attachment.file_name}</p>
                                <p className="text-slate-400 text-xs">
                                  {attachment.file_type?.toUpperCase()} • {attachment.file_size ? (attachment.file_size / 1024 / 1024).toFixed(2) : '0'} MB
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setViewingAttachment(attachment)}
                                  className="p-2 rounded-lg hover:bg-slate-600/50 transition-colors"
                                  title="Görüntüle"
                                >
                                  <Eye className="w-4 h-4 text-slate-400 hover:text-blue-400" />
                                </button>
                                <button
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = attachment.file_url;
                                    link.download = attachment.file_name;
                                    link.click();
                                  }}
                                  className="p-2 rounded-lg hover:bg-slate-600/50 transition-colors"
                                  title="İndir"
                                >
                                  <Download className="w-4 h-4 text-slate-400 hover:text-green-400" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                    <button
                      onClick={() => {
                        setViewingExpense(null);
                        handleEdit(viewingExpense);
                      }}
                      className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 font-medium"
                    >
                      <Edit3 className="w-4 h-4" />
                      Düzenle
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* File Viewer Modal */}
        {viewingAttachment && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-slate-800/95 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white">{viewingAttachment.file_name}</h3>
                    <p className="text-slate-400 text-sm">
                      {viewingAttachment.file_type?.toUpperCase()} • {viewingAttachment.file_size ? (viewingAttachment.file_size / 1024 / 1024).toFixed(2) : '0'} MB
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = viewingAttachment.file_url;
                        link.download = viewingAttachment.file_name;
                        link.click();
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                      title="İndir"
                    >
                      <Download className="w-4 h-4" />
                      İndir
                    </button>
                    <button
                      onClick={() => setViewingAttachment(null)}
                      className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-auto max-h-[70vh] flex items-center justify-center">
                {viewingAttachment.file_type?.startsWith('image/') ? (
                  <img
                    src={viewingAttachment.file_url}
                    alt={viewingAttachment.file_name}
                    className="max-w-full max-h-full object-contain rounded-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : viewingAttachment.file_type === 'application/pdf' ? (
                  <iframe
                    src={viewingAttachment.file_url}
                    className="w-full h-[60vh] rounded-lg border border-slate-600"
                    title={viewingAttachment.file_name}
                  />
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-300 font-medium mb-2">Bu dosya türü önizlenemiyor</p>
                    <p className="text-slate-400 text-sm mb-4">Dosyayı indirerek görüntüleyebilirsiniz</p>
                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = viewingAttachment.file_url;
                        link.download = viewingAttachment.file_name;
                        link.click();
                      }}
                      className="flex items-center gap-2 px-6 py-3 bg-green-500/20 text-green-400 rounded-xl hover:bg-green-500/30 transition-colors mx-auto"
                    >
                      <Download className="w-4 h-4" />
                      Dosyayı İndir
                    </button>
                  </div>
                )}

                {/* Error fallback for images */}
                <div className="hidden text-center py-12">
                  <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-300 font-medium mb-2">Dosya yüklenemedi</p>
                  <p className="text-slate-400 text-sm mb-4">Dosyayı indirerek görüntüleyebilirsiniz</p>
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = viewingAttachment.file_url;
                      link.download = viewingAttachment.file_name;
                      link.click();
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-green-500/20 text-green-400 rounded-xl hover:bg-green-500/30 transition-colors mx-auto"
                  >
                    <Download className="w-4 h-4" />
                    Dosyayı İndir
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
