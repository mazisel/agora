'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Task, TaskComment, TaskAttachment, TaskExpense } from '@/types';
import { Plus, Clock, User, Play, CheckCircle2, Eye, AlertCircle, X, MessageSquare, FileText, Users, Calendar, Paperclip, Download, Send, Image, Smile, Edit3, Save, XCircle, DollarSign } from 'lucide-react';

interface TaskCardsProps {
  selectedStatus?: string;
  onStatusChange?: (status: string) => void;
}

export default function TaskCards({ selectedStatus, onStatusChange }: TaskCardsProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [taskComments, setTaskComments] = useState<TaskComment[]>([]);
  const [taskAttachments, setTaskAttachments] = useState<TaskAttachment[]>([]);
  const [taskExpenses, setTaskExpenses] = useState<TaskExpense[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingTask, setEditingTask] = useState<{
    status: string;
  }>({ status: '' });
  const [commentsSubscription, setCommentsSubscription] = useState<any>(null);
  
  // Expense states
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({
    title: '',
    description: '',
    amount: '',
    currency: 'TRY' as const,
    category: 'material' as const,
    vendor: '',
    receipt_number: '',
    expense_date: new Date().toISOString().split('T')[0]
  });
  
  const { user, userProfile } = useAuth();

  // Fetch tasks from Supabase
  const fetchTasks = async () => {
    if (!user || !userProfile) return;

    try {
      setIsLoading(true);
      
      let query = supabase
        .from('tasks')
        .select(`
          *,
          project:projects(id, name, project_manager_id),
          assignee:user_profiles!tasks_assigned_to_fkey(id, first_name, last_name, personnel_number),
          assigner:user_profiles!tasks_assigned_by_fkey(id, first_name, last_name, personnel_number),
          informed:user_profiles!tasks_informed_person_fkey(id, first_name, last_name, personnel_number),
          creator:user_profiles!tasks_created_by_fkey(id, first_name, last_name, personnel_number)
        `);

      // Admin kullanıcılar tüm görevleri görebilir, diğer kullanıcılar sadece kendi görevlerini
      if (userProfile.authority_level !== 'admin') {
        query = query.or(`assigned_to.eq.${user.id},created_by.eq.${user.id},informed_person.eq.${user.id}`);
      }

      const { data: tasksData, error } = await query
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setTasks(tasksData || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user, userProfile]);

  const getStatusText = (status: Task['status']) => {
    switch (status) {
      case 'todo':
        return 'Yeni';
      case 'in_progress':
        return 'Devam Ediyor';
      case 'review':
        return 'İnceleme';
      case 'done':
        return 'Tamamlandı';
      case 'cancelled':
        return 'İptal';
      default:
        return 'Bilinmiyor';
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'todo':
        return 'bg-slate-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'review':
        return 'bg-yellow-500';
      case 'done':
        return 'bg-green-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-slate-500';
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-400';
      case 'high':
        return 'text-orange-400';
      case 'medium':
        return 'text-yellow-400';
      case 'low':
        return 'text-green-400';
      default:
        return 'text-slate-400';
    }
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'todo':
        return <Clock className="w-3 h-3" />;
      case 'in_progress':
        return <Clock className="w-3 h-3" />;
      case 'review':
        return <Eye className="w-3 h-3" />;
      case 'done':
        return <CheckCircle2 className="w-3 h-3" />;
      case 'cancelled':
        return <AlertCircle className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const handleStatusUpdate = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus,
          completed_at: newStatus === 'done' ? new Date().toISOString() : null
        })
        .eq('id', taskId);

      if (error) throw error;
      await fetchTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const fetchTaskDetails = async (taskId: string) => {
    try {
      // Fetch comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('task_comments')
        .select(`
          *,
          user:user_profiles(id, first_name, last_name, profile_photo_url)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (commentsError) {
        console.error('Comments error:', commentsError);
        throw commentsError;
      }

      console.log('Comments data:', commentsData);

      // Fetch attachments
      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from('task_attachments')
        .select(`
          *,
          uploader:user_profiles!task_attachments_uploaded_by_fkey(id, first_name, last_name)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (attachmentsError) throw attachmentsError;

      // Fetch expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('task_expenses')
        .select(`
          *,
          creator:user_profiles!task_expenses_created_by_fkey(id, first_name, last_name),
          approver:user_profiles!task_expenses_approved_by_fkey(id, first_name, last_name)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (expensesError) throw expensesError;

      setTaskComments(commentsData || []);
      setTaskAttachments(attachmentsData || []);
      setTaskExpenses(expensesData || []);

      // Setup realtime subscription for comments
      const subscription = supabase
        .channel(`task_comments:${taskId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'task_comments',
            filter: `task_id=eq.${taskId}`
          },
          async (payload) => {
            console.log('New comment received:', payload);
            // Fetch user info for the new comment
            const { data: userData } = await supabase
              .from('user_profiles')
              .select('id, first_name, last_name, profile_photo_url')
              .eq('id', payload.new.user_id)
              .single();

            const newComment = {
              ...payload.new,
              user: userData
            } as TaskComment;

            setTaskComments(prev => [...prev, newComment]);
          }
        )
        .subscribe();

      // Store subscription for cleanup
      setCommentsSubscription(subscription);
    } catch (error) {
      console.error('Error fetching task details:', error);
    }
  };

  // Cleanup subscription when modal closes
  useEffect(() => {
    return () => {
      if (commentsSubscription) {
        commentsSubscription.unsubscribe();
        setCommentsSubscription(null);
      }
    };
  }, [commentsSubscription]);

  // Cleanup when viewing task changes
  useEffect(() => {
    if (!viewingTask && commentsSubscription) {
      commentsSubscription.unsubscribe();
      setCommentsSubscription(null);
    }
  }, [viewingTask, commentsSubscription]);

  const handleAddComment = async (taskId: string) => {
    if (!newComment.trim() || !user) return;

    try {
      const { error } = await supabase
        .from('task_comments')
        .insert([{
          task_id: taskId,
          comment: newComment.trim(),
          user_id: user.id
        }]);

      if (error) throw error;

      setNewComment('');
      await fetchTaskDetails(taskId);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleEditTask = () => {
    if (viewingTask) {
      setEditingTask({
        status: viewingTask.status
      });
      setIsEditing(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!viewingTask) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: editingTask.status,
          completed_at: editingTask.status === 'done' ? new Date().toISOString() : null
        })
        .eq('id', viewingTask.id);

      if (error) throw error;

      // Update the viewing task
      setViewingTask({
        ...viewingTask,
        status: editingTask.status as Task['status'],
        completed_at: editingTask.status === 'done' ? new Date().toISOString() : viewingTask.completed_at
      });

      setIsEditing(false);
      await fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (viewingTask) {
      setEditingTask({
        status: viewingTask.status
      });
    }
  };

  // Expense functions
  const handleAddExpense = async () => {
    if (!viewingTask || !user || !newExpense.title.trim() || !newExpense.amount) return;

    try {
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      const response = await fetch(`/api/tasks/${viewingTask.id}/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          title: newExpense.title.trim(),
          description: newExpense.description.trim() || null,
          amount: parseFloat(newExpense.amount),
          currency: newExpense.currency,
          category: newExpense.category,
          vendor: newExpense.vendor.trim() || null,
          receipt_number: newExpense.receipt_number.trim() || null,
          expense_date: newExpense.expense_date
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add expense');
      }

      const result = await response.json();
      console.log('Expense added successfully:', result.data);

      // Reset form
      setNewExpense({
        title: '',
        description: '',
        amount: '',
        currency: 'TRY',
        category: 'material',
        vendor: '',
        receipt_number: '',
        expense_date: new Date().toISOString().split('T')[0]
      });
      setIsAddingExpense(false);

      // Refresh expenses
      await fetchTaskDetails(viewingTask.id);
    } catch (error: any) {
      console.error('Error adding expense:', error);
      alert(`Harcama eklenirken hata oluştu: ${error?.message || 'Bilinmeyen hata'}`);
    }
  };

  const handleApproveExpense = async (expenseId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('task_expenses')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', expenseId);

      if (error) throw error;

      // Refresh expenses
      if (viewingTask) {
        await fetchTaskDetails(viewingTask.id);
      }
    } catch (error) {
      console.error('Error approving expense:', error);
    }
  };

  const handleRejectExpense = async (expenseId: string, reason: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('task_expenses')
        .update({
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: reason
        })
        .eq('id', expenseId);

      if (error) throw error;

      // Refresh expenses
      if (viewingTask) {
        await fetchTaskDetails(viewingTask.id);
      }
    } catch (error) {
      console.error('Error rejecting expense:', error);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      material: 'Malzeme',
      service: 'Hizmet',
      travel: 'Seyahat',
      equipment: 'Ekipman',
      software: 'Yazılım',
      other: 'Diğer'
    };
    return labels[category] || category;
  };

  const getExpenseStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'approved': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'rejected': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const getExpenseStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Bekliyor';
      case 'approved': return 'Onaylandı';
      case 'rejected': return 'Reddedildi';
      default: return status;
    }
  };

  const getStatusColorForModal = (status: string) => {
    switch (status) {
      case 'todo': return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
      case 'in_progress': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'review': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'done': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const getPriorityColorForModal = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'urgent': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'low': return 'Düşük';
      case 'medium': return 'Orta';
      case 'high': return 'Yüksek';
      case 'urgent': return 'Acil';
      default: return priority;
    }
  };

  const isOverdueForModal = (dueDate: string) => {
    return new Date(dueDate) < new Date() && viewingTask?.status !== 'done';
  };

  // Filtreleme
  const filteredTasks = selectedStatus 
    ? tasks.filter(task => {
        switch (selectedStatus.toLowerCase()) {
          case 'yapılacak':
          case 'todo':
            return task.status === 'todo';
          case 'devam ediyor':
          case 'in_progress':
            return task.status === 'in_progress';
          case 'inceleme':
          case 'review':
            return task.status === 'review';
          case 'tamamlandı':
          case 'done':
            return task.status === 'done';
          case 'iptal':
          case 'cancelled':
            return task.status === 'cancelled';
          default:
            return true;
        }
      })
    : tasks;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { 
      day: 'numeric', 
      month: 'short' 
    });
  };

  const isOverdue = (dueDateString?: string) => {
    if (!dueDateString) return false;
    const dueDate = new Date(dueDateString);
    const today = new Date();
    return dueDate < today;
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">Görevler</h3>
            <p className="text-xs text-slate-400 mt-1">Yükleniyor...</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">Görevler</h3>
          <p className="text-xs text-slate-400 mt-1">{filteredTasks.length} aktif görev</p>
        </div>
        <button 
          onClick={() => window.location.href = '/tasks'}
          className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl text-sm"
        >
          <Plus className="w-3 h-3" />
          <span className="font-medium">Yeni</span>
        </button>
      </div>

      {/* Status Filter Buttons */}
      <div className="flex flex-wrap gap-1 mb-3 justify-center items-center">
        <button 
          onClick={() => onStatusChange?.('todo')}
          className={`px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 whitespace-nowrap ${
            selectedStatus === 'todo' 
              ? 'bg-slate-500 text-white shadow-lg' 
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
          }`}
        >
          Yeni
        </button>
        <button 
          onClick={() => onStatusChange?.('in_progress')}
          className={`px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 whitespace-nowrap ${
            selectedStatus === 'in_progress' 
              ? 'bg-blue-500 text-white shadow-lg' 
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
          }`}
        >
          Devam Ediyor
        </button>
        <button 
          onClick={() => onStatusChange?.('review')}
          className={`px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 whitespace-nowrap ${
            selectedStatus === 'review' 
              ? 'bg-yellow-500 text-white shadow-lg' 
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
          }`}
        >
          İnceleme
        </button>
        <button 
          onClick={() => onStatusChange?.('done')}
          className={`px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 whitespace-nowrap ${
            selectedStatus === 'done' 
              ? 'bg-green-500 text-white shadow-lg' 
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
          }`}
        >
          Tamamlandı
        </button>
        {selectedStatus && (
          <button 
            onClick={() => onStatusChange?.('')}
            className="px-2 py-1 rounded-md text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all duration-200 border border-slate-500 whitespace-nowrap"
          >
            Tümü
          </button>
        )}
      </div>

      {/* Task Cards */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600/50 scrollbar-track-transparent hover:scrollbar-thumb-slate-500/70">
          <div className="space-y-4 px-2">
            {filteredTasks.map((task) => (
              <div 
                key={task.id} 
                onClick={() => {
                  console.log('Task clicked:', task.id);
                  setViewingTask(task);
                  fetchTaskDetails(task.id);
                }}
                className="w-full max-w-sm mx-auto group bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-black/10 cursor-pointer"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {getStatusIcon(task.status)}
                      <div>
                        <h4 className="font-semibold text-white text-sm group-hover:text-blue-300 transition-colors">
                          {task.title}
                        </h4>
                        <span className="text-xs text-slate-400 font-medium">{task.project?.name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold text-white ${getStatusColor(task.status)} shadow-sm`}>
                      {getStatusText(task.status)}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 leading-relaxed mb-2 line-clamp-2">
                  {task.description || 'Açıklama bulunmuyor'}
                </p>

                {/* Card Footer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {task.assignee && (
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-300 font-medium">
                          {task.assignee.first_name} {task.assignee.last_name}
                        </span>
                      </div>
                    )}
                    {task.due_date && (
                      <div className="flex items-center gap-1">
                        <Clock className={`w-3 h-3 ${isOverdue(task.due_date) ? 'text-red-400' : 'text-slate-400'}`} />
                        <span className={`text-xs ${isOverdue(task.due_date) ? 'text-red-400' : 'text-slate-300'}`}>
                          {formatDate(task.due_date)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${getPriorityColor(task.priority)} animate-pulse`}></div>
                    
                  </div>
                </div>
              </div>
            ))}

            {/* Empty State */}
            {filteredTasks.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-slate-600" />
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">Görev Bulunamadı</h4>
                <p className="text-sm text-slate-400 mb-4">
                  {selectedStatus ? `${getStatusText(selectedStatus as any)} durumunda görev bulunmuyor` : 'Henüz görev eklenmemiş'}
                </p>
                <button 
                  onClick={() => window.location.href = '/tasks'}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
                >
                  İlk Görevi Oluştur
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Task Detail Modal */}
      {viewingTask && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-slate-800/95 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Enhanced Modal Header */}
            <div className="relative p-6 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-700/50">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${getStatusColorForModal(viewingTask.status).replace('text-', 'bg-').replace('/20', '/10')} border ${getStatusColorForModal(viewingTask.status).split(' ')[2]}`}>
                    {getStatusIcon(viewingTask.status)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">{viewingTask.title}</h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-slate-300">
                        <FileText className="w-4 h-4" />
                        <span>{viewingTask.project?.name}</span>
                      </div>
                      {viewingTask.due_date && (
                        <div className={`flex items-center gap-2 ${isOverdueForModal(viewingTask.due_date) ? 'text-red-400' : 'text-slate-300'}`}>
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(viewingTask.due_date).toLocaleDateString('tr-TR')}</span>
                          {isOverdueForModal(viewingTask.due_date) && <span className="text-xs font-medium">(Gecikmiş)</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditing ? (
                    <button
                      onClick={handleEditTask}
                      className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all"
                      title="Görevi Düzenle"
                    >
                      <Edit3 className="w-5 h-5" />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleSaveEdit}
                        className="w-10 h-10 flex items-center justify-center text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-xl transition-all"
                        title="Değişiklikleri Kaydet"
                      >
                        <Save className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="w-10 h-10 flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all"
                        title="Düzenlemeyi İptal Et"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setViewingTask(null)}
                    className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Status and Priority Row */}
              <div className="flex items-center gap-3 mt-4">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-300">Durum:</label>
                    <select
                      value={editingTask.status}
                      onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}
                      className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    >
                      <option value="todo">Yeni</option>
                      <option value="in_progress">Devam Ediyor</option>
                      <option value="review">İnceleme</option>
                      <option value="done">Tamamlandı</option>
                      <option value="cancelled">İptal</option>
                    </select>
                  </div>
                ) : (
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium ${getStatusColorForModal(viewingTask.status)}`}>
                    {getStatusIcon(viewingTask.status)}
                    {getStatusText(viewingTask.status)}
                  </span>
                )}
                <span className={`inline-flex items-center px-4 py-2 rounded-xl border text-sm font-medium ${getPriorityColorForModal(viewingTask.priority)}`}>
                  {getPriorityLabel(viewingTask.priority)}
                </span>
                {!isEditing && viewingTask.status !== 'done' && viewingTask.status !== 'cancelled' && (
                  <button
                    onClick={async () => {
                      await handleStatusUpdate(viewingTask.id, 'done');
                      // Update the viewing task immediately
                      setViewingTask({
                        ...viewingTask,
                        status: 'done',
                        completed_at: new Date().toISOString()
                      });
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-xl hover:bg-green-500/30 transition-all text-sm font-medium"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Tamamla
                  </button>
                )}
              </div>
            </div>

            {/* Enhanced Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Description */}
                  <div className="bg-slate-700/20 rounded-xl p-6 border border-slate-600/30">
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-400" />
                      Açıklama
                    </h4>
                    <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {viewingTask.description || 'Bu görev için henüz açıklama eklenmemiş.'}
                    </p>
                  </div>

                  {/* Enhanced Comments Section */}
                  <div className="bg-gradient-to-br from-slate-700/30 to-slate-800/30 rounded-2xl p-8 border border-slate-600/40 shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                          <MessageSquare className="w-5 h-5 text-white" />
                        </div>
                        Yorumlar & Tartışma
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-sm font-medium">
                          {taskComments.length} Yorum
                        </span>
                      </div>
                    </div>
                    
                    {/* Enhanced Add Comment */}
                    <div className="mb-8 bg-slate-800/50 rounded-xl p-6 border border-slate-600/30">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 flex-shrink-0">
                          {userProfile?.profile_photo_url ? (
                            <img
                              src={userProfile.profile_photo_url}
                              alt={`${userProfile.first_name} ${userProfile.last_name}`}
                              className="w-12 h-12 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                              {userProfile?.first_name?.charAt(0) || 'U'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Yorum Ekle
                            </label>
                            <div className="relative">
                              <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 resize-none transition-all"
                                rows={4}
                                placeholder="Görüşlerinizi, güncellemelerinizi veya sorularınızı paylaşın..."
                              />
                              
                              {/* Comment Toolbar */}
                              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  id="comment-image-upload"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      // Handle image upload here
                                      console.log('Image selected:', file);
                                    }
                                  }}
                                />
                                <label
                                  htmlFor="comment-image-upload"
                                  className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-600/50 rounded-lg transition-all cursor-pointer"
                                  title="Görsel ekle"
                                >
                                  <Image className="w-4 h-4" />
                                </label>
                                <button
                                  type="button"
                                  className="p-2 text-slate-400 hover:text-yellow-400 hover:bg-slate-600/50 rounded-lg transition-all"
                                  title="Emoji ekle"
                                >
                                  <Smile className="w-4 h-4" />
                                </button>
                                <input
                                  type="file"
                                  accept="*/*"
                                  className="hidden"
                                  id="comment-file-upload"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      // Handle file upload here
                                      console.log('File selected:', file);
                                      alert(`Dosya seçildi: ${file.name}`);
                                    }
                                  }}
                                />
                                <label
                                  htmlFor="comment-file-upload"
                                  className="p-2 text-slate-400 hover:text-green-400 hover:bg-slate-600/50 rounded-lg transition-all cursor-pointer"
                                  title="Dosya ekle"
                                >
                                  <Paperclip className="w-4 h-4" />
                                </label>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-sm text-slate-400">
                              <span>Markdown desteklenir</span>
                              <span>•</span>
                              <span>Görsel ve dosya ekleyebilirsiniz</span>
                              <span>•</span>
                              <span>{newComment.length}/1000 karakter</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setNewComment('')}
                                className="px-3 py-1.5 text-slate-400 hover:text-white transition-colors text-xs"
                                disabled={!newComment.trim()}
                              >
                                Temizle
                              </button>
                              <button
                                onClick={() => {
                                  if (viewingTask) {
                                    handleAddComment(viewingTask.id);
                                  }
                                }}
                                disabled={!newComment.trim()}
                                className="px-3 py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 text-xs font-medium"
                              >
                                <Send className="w-3 h-3" />
                                Yorum
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Comments List */}
                    <div className="space-y-6">
                      {taskComments.length === 0 ? (
                        <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-600/20">
                          <div className="w-20 h-20 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <MessageSquare className="w-10 h-10 text-slate-500" />
                          </div>
                          <h5 className="text-lg font-semibold text-white mb-2">Henüz Yorum Yok</h5>
                          <p className="text-slate-400 mb-4">Bu görev hakkında ilk yorumu siz yapın</p>
                          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                            <MessageSquare className="w-4 h-4" />
                            <span>Yorumlar gerçek zamanlı olarak güncellenir</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {taskComments.map((comment, index) => (
                            <div key={comment.id} className="group relative">
                              {/* Comment Thread Line */}
                              {index < taskComments.length - 1 && (
                                <div className="absolute left-6 top-16 w-0.5 h-full bg-gradient-to-b from-slate-600/50 to-transparent"></div>
                              )}
                              
                              <div className="bg-slate-800/60 rounded-xl p-6 border border-slate-600/30 hover:border-slate-500/50 transition-all duration-300 hover:shadow-lg">
                                <div className="flex items-start gap-4">
                                  {/* Enhanced Avatar */}
                                  <div className="relative flex-shrink-0">
                                    {comment.user?.profile_photo_url ? (
                                      <img
                                        src={comment.user.profile_photo_url}
                                        alt={`${comment.user.first_name} ${comment.user.last_name}`}
                                        className="w-12 h-12 rounded-xl object-cover shadow-lg"
                                      />
                                    ) : (
                                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                        {comment.user?.first_name?.charAt(0)}
                                      </div>
                                    )}
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-800"></div>
                                  </div>
                                  
                                  <div className="flex-1 min-w-0">
                                    {/* Comment Header */}
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-3">
                                        <h6 className="font-semibold text-white">
                                          {comment.user?.first_name} {comment.user?.last_name}
                                        </h6>
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <Clock className="w-3 h-3" />
                                        <span>{new Date(comment.created_at).toLocaleString('tr-TR')}</span>
                                      </div>
                                    </div>
                                    
                                    {/* Comment Content */}
                                    <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/20">
                                      <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">
                                        {comment.comment}
                                      </p>
                                    </div>
                                    
                                    {/* Comment Actions */}
                                    <div className="flex items-center gap-4 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-400 transition-colors">
                                        <MessageSquare className="w-3 h-3" />
                                        Yanıtla
                                      </button>
                                      <button className="flex items-center gap-1 text-xs text-slate-400 hover:text-green-400 transition-colors">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Beğen
                                      </button>
                                      <button className="flex items-center gap-1 text-xs text-slate-400 hover:text-yellow-400 transition-colors">
                                        <AlertCircle className="w-3 h-3" />
                                        Bildir
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Comments Footer */}
                    {taskComments.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-slate-600/30">
                        <div className="flex items-center justify-between text-sm text-slate-400">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span>{taskComments.length} kişi bu görevi tartışıyor</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>Son güncelleme: {new Date(taskComments[taskComments.length - 1]?.created_at).toLocaleString('tr-TR')}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Enhanced Expenses Section */}
                  <div className="bg-gradient-to-br from-slate-700/30 to-slate-800/30 rounded-2xl p-8 border border-slate-600/40 shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-white" />
                        </div>
                        Harcamalar & Giderler
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg text-sm font-medium">
                          {taskExpenses.length} Harcama
                        </span>
                        <button
                          onClick={() => setIsAddingExpense(true)}
                          className="px-3 py-1 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all text-sm font-medium flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Ekle
                        </button>
                      </div>
                    </div>

                    {/* Add Expense Form */}
                    {isAddingExpense && (
                      <div className="mb-8 bg-slate-800/50 rounded-xl p-6 border border-slate-600/30">
                        <h5 className="text-lg font-semibold text-white mb-4">Yeni Harcama Ekle</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Başlık *
                            </label>
                            <input
                              type="text"
                              value={newExpense.title}
                              onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                              placeholder="Harcama başlığı"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Tutar *
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                step="0.01"
                                value={newExpense.amount}
                                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                                className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                                placeholder="0.00"
                              />
                              <select
                                value={newExpense.currency}
                                onChange={(e) => setNewExpense({ ...newExpense, currency: e.target.value as any })}
                                className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                              >
                                <option value="TRY">TRY</option>
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Kategori
                            </label>
                            <select
                              value={newExpense.category}
                              onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value as any })}
                              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                            >
                              <option value="material">Malzeme</option>
                              <option value="service">Hizmet</option>
                              <option value="travel">Seyahat</option>
                              <option value="equipment">Ekipman</option>
                              <option value="software">Yazılım</option>
                              <option value="other">Diğer</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Tarih
                            </label>
                            <input
                              type="date"
                              value={newExpense.expense_date}
                              onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Satıcı/Firma
                            </label>
                            <input
                              type="text"
                              value={newExpense.vendor}
                              onChange={(e) => setNewExpense({ ...newExpense, vendor: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                              placeholder="Satıcı adı"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Fiş/Fatura No
                            </label>
                            <input
                              type="text"
                              value={newExpense.receipt_number}
                              onChange={(e) => setNewExpense({ ...newExpense, receipt_number: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                              placeholder="Fiş numarası"
                            />
                          </div>
                        </div>
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Açıklama
                          </label>
                          <textarea
                            value={newExpense.description}
                            onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 resize-none"
                            rows={3}
                            placeholder="Harcama detayları..."
                          />
                        </div>
                        <div className="flex items-center justify-end gap-3 mt-6">
                          <button
                            onClick={() => {
                              setIsAddingExpense(false);
                              setNewExpense({
                                title: '',
                                description: '',
                                amount: '',
                                currency: 'TRY',
                                category: 'material',
                                vendor: '',
                                receipt_number: '',
                                expense_date: new Date().toISOString().split('T')[0]
                              });
                            }}
                            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                          >
                            İptal
                          </button>
                          <button
                            onClick={handleAddExpense}
                            disabled={!newExpense.title.trim() || !newExpense.amount}
                            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            <DollarSign className="w-4 h-4" />
                            Harcama Ekle
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Expenses List */}
                    <div className="space-y-4">
                      {taskExpenses.length === 0 ? (
                        <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-600/20">
                          <div className="w-20 h-20 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <DollarSign className="w-10 h-10 text-slate-500" />
                          </div>
                          <h5 className="text-lg font-semibold text-white mb-2">Henüz Harcama Yok</h5>
                          <p className="text-slate-400 mb-4">Bu görev için ilk harcamayı ekleyin</p>
                          <button
                            onClick={() => setIsAddingExpense(true)}
                            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all flex items-center gap-2 mx-auto"
                          >
                            <Plus className="w-4 h-4" />
                            Harcama Ekle
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {taskExpenses.map((expense) => (
                            <div key={expense.id} className="bg-slate-800/60 rounded-xl p-6 border border-slate-600/30 hover:border-slate-500/50 transition-all duration-300">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h6 className="font-semibold text-white text-lg">{expense.title}</h6>
                                    <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getExpenseStatusColor(expense.status)}`}>
                                      {getExpenseStatusLabel(expense.status)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-slate-300 mb-3">
                                    <span className="font-medium text-orange-400">
                                      {formatCurrency(expense.amount, expense.currency)}
                                    </span>
                                    <span className="px-2 py-1 bg-slate-700/50 rounded text-xs">
                                      {getCategoryLabel(expense.category)}
                                    </span>
                                    <span className="text-slate-400">
                                      {new Date(expense.expense_date).toLocaleDateString('tr-TR')}
                                    </span>
                                  </div>
                                  {expense.description && (
                                    <p className="text-slate-300 text-sm mb-3">{expense.description}</p>
                                  )}
                                  <div className="flex items-center gap-4 text-xs text-slate-400">
                                    <span>
                                      Ekleyen: {expense.creator?.first_name} {expense.creator?.last_name}
                                    </span>
                                    {expense.vendor && <span>Satıcı: {expense.vendor}</span>}
                                    {expense.receipt_number && <span>Fiş: {expense.receipt_number}</span>}
                                  </div>
                                </div>
                        {expense.status === 'pending' && viewingTask?.project?.project_manager_id === user?.id && (
                          <div className="flex items-center gap-1 ml-3">
                            <button
                              onClick={() => handleApproveExpense(expense.id)}
                              className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded hover:bg-green-500/30 transition-all text-xs font-medium"
                            >
                              Onayla
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt('Red nedeni:');
                                if (reason) {
                                  handleRejectExpense(expense.id, reason);
                                }
                              }}
                              className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30 transition-all text-xs font-medium"
                            >
                              Reddet
                            </button>
                          </div>
                        )}
                              </div>
                              {expense.status === 'approved' && expense.approver && (
                                <div className="pt-3 border-t border-slate-600/30">
                                  <p className="text-xs text-green-400">
                                    ✓ {expense.approver.first_name} {expense.approver.last_name} tarafından onaylandı
                                    {expense.approved_at && ` - ${new Date(expense.approved_at).toLocaleString('tr-TR')}`}
                                  </p>
                                </div>
                              )}
                              {expense.status === 'rejected' && (
                                <div className="pt-3 border-t border-slate-600/30">
                                  <p className="text-xs text-red-400 mb-1">
                                    ✗ {expense.approver?.first_name} {expense.approver?.last_name} tarafından reddedildi
                                    {expense.approved_at && ` - ${new Date(expense.approved_at).toLocaleString('tr-TR')}`}
                                  </p>
                                  {expense.rejection_reason && (
                                    <p className="text-xs text-slate-400">Neden: {expense.rejection_reason}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Expenses Summary */}
                    {taskExpenses.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-slate-600/30">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-slate-800/40 rounded-lg p-4">
                            <p className="text-xs text-slate-400 mb-1">Toplam Harcama</p>
                            <p className="text-lg font-semibold text-white">
                              {formatCurrency(
                                taskExpenses.reduce((sum, expense) => sum + expense.amount, 0),
                                'TRY'
                              )}
                            </p>
                          </div>
                          <div className="bg-slate-800/40 rounded-lg p-4">
                            <p className="text-xs text-slate-400 mb-1">Onaylanan</p>
                            <p className="text-lg font-semibold text-green-400">
                              {formatCurrency(
                                taskExpenses.filter(e => e.status === 'approved').reduce((sum, expense) => sum + expense.amount, 0),
                                'TRY'
                              )}
                            </p>
                          </div>
                          <div className="bg-slate-800/40 rounded-lg p-4">
                            <p className="text-xs text-slate-400 mb-1">Bekleyen</p>
                            <p className="text-lg font-semibold text-yellow-400">
                              {formatCurrency(
                                taskExpenses.filter(e => e.status === 'pending').reduce((sum, expense) => sum + expense.amount, 0),
                                'TRY'
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* People */}
                  <div className="bg-slate-700/20 rounded-xl p-6 border border-slate-600/30">
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-400" />
                      Kişiler
                    </h4>
                    <div className="space-y-4">
                      {viewingTask.assignee && (
                        <div className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-lg">
                          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                            {viewingTask.assignee.first_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Sorumlu</p>
                            <p className="text-white font-medium">
                              {viewingTask.assignee.first_name} {viewingTask.assignee.last_name}
                            </p>
                          </div>
                        </div>
                      )}
                      {viewingTask.assigner && (
                        <div className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-lg">
                          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                            {viewingTask.assigner.first_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Atayan</p>
                            <p className="text-white font-medium">
                              {viewingTask.assigner.first_name} {viewingTask.assigner.last_name}
                            </p>
                          </div>
                        </div>
                      )}
                      {viewingTask.informed && (
                        <div className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-lg">
                          <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                            {viewingTask.informed.first_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Bilgi</p>
                            <p className="text-white font-medium">
                              {viewingTask.informed.first_name} {viewingTask.informed.last_name}
                            </p>
                          </div>
                        </div>
                      )}
                      {viewingTask.creator && (
                        <div className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-lg">
                          <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                            {viewingTask.creator.first_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Oluşturan</p>
                            <p className="text-white font-medium">
                              {viewingTask.creator.first_name} {viewingTask.creator.last_name}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="bg-slate-700/20 rounded-xl p-6 border border-slate-600/30">
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-orange-400" />
                      Zaman Çizelgesi
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-lg">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Oluşturulma</p>
                          <p className="text-white text-sm">
                            {new Date(viewingTask.created_at).toLocaleString('tr-TR')}
                          </p>
                        </div>
                      </div>
                      {viewingTask.due_date && (
                        <div className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-lg">
                          <div className={`w-2 h-2 rounded-full ${isOverdueForModal(viewingTask.due_date) ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Son Teslim</p>
                            <p className={`text-sm ${isOverdueForModal(viewingTask.due_date) ? 'text-red-400' : 'text-white'}`}>
                              {new Date(viewingTask.due_date).toLocaleString('tr-TR')}
                            </p>
                          </div>
                        </div>
                      )}
                      {viewingTask.completed_at && (
                        <div className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-lg">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Tamamlanma</p>
                            <p className="text-white text-sm">
                              {new Date(viewingTask.completed_at).toLocaleString('tr-TR')}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Attachments */}
                  <div className="bg-slate-700/20 rounded-xl p-6 border border-slate-600/30">
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Paperclip className="w-5 h-5 text-cyan-400" />
                      Dosyalar ({taskAttachments.length})
                    </h4>
                    <div className="space-y-3">
                      {taskAttachments.length === 0 ? (
                        <div className="text-center py-6">
                          <Paperclip className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                          <p className="text-slate-400 text-sm">Dosya eklenmemiş</p>
                        </div>
                      ) : (
                        taskAttachments.map((attachment) => (
                          <div key={attachment.id} className="flex items-center justify-between p-3 bg-slate-800/40 rounded-lg border border-slate-600/20">
                            <div className="flex items-center gap-3 min-w-0">
                              <Paperclip className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-white text-sm truncate">{attachment.file_name}</p>
                                <p className="text-xs text-slate-400">
                                  {attachment.uploader?.first_name} {attachment.uploader?.last_name}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => window.open(attachment.file_url, '_blank')}
                              className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-600/50 rounded-lg transition-all flex-shrink-0"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
