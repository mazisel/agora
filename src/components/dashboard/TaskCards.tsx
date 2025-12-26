'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Task, TaskComment, TaskAttachment, TaskExpense, Project } from '@/types';
import { Plus, Clock, User, Play, CheckCircle2, Eye, AlertCircle, X, MessageSquare, FileText, Users, Calendar, Paperclip, Download, Send, Image, Smile, Edit3, Save, XCircle, DollarSign, LayoutGrid } from 'lucide-react';
import TaskDetailView from '@/components/tasks/TaskDetailView';
import CreateTaskView from '@/components/tasks/CreateTaskView';
import KanbanView from './KanbanView';

interface TaskCardsProps {
  selectedStatus?: string;
  onStatusChange?: (status: string) => void;
}

export default function TaskCards({ selectedStatus, onStatusChange }: TaskCardsProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [transferredTasks, setTransferredTasks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'tasks' | 'transferred'>('tasks');
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
  const [showKanban, setShowKanban] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<{
    id: string;
    first_name: string;
    last_name: string;
    personnel_number: string;
    position?: string;
  }[]>([]);

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
  const router = useRouter();

  // Fetch tasks from Supabase and API
  const fetchTasks = async () => {
    if (!user || !userProfile) return;

    try {
      setIsLoading(true);

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();

      const authHeaders: HeadersInit = session?.access_token ? {
        'Authorization': `Bearer ${session.access_token}`
      } : {};

      // Fetch normal tasks from Supabase directly
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
        query = query.or(`assigned_to.eq.${userProfile.id},created_by.eq.${userProfile.id},informed_person.eq.${userProfile.id}`);
      }

      const { data: normalTasks, error: tasksError } = await query
        .order('created_at', { ascending: false })
        .limit(10);

      if (tasksError) {
        console.error('Error fetching normal tasks:', tasksError);
      }

      // Fetch request tasks from API
      let requestTasks = [];
      try {
        const tasksResponse = await fetch('/api/tasks', { headers: authHeaders });
        if (tasksResponse.ok) {
          const allTasks = await tasksResponse.json();
          // Filter only request tasks (not normal tasks)
          requestTasks = allTasks.filter((task: any) =>
            task.id.startsWith('leave_') ||
            task.id.startsWith('advance_') ||
            task.id.startsWith('suggestion_')
          );
        } else {
          console.error('Error fetching request tasks:', await tasksResponse.text());
        }
      } catch (error) {
        console.error('Error fetching request tasks:', error);
      }

      // Combine normal tasks and request tasks
      const allTasks = [
        ...(normalTasks || []),
        ...requestTasks
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10); // Limit to 10 for dashboard

      setTasks(allTasks);

      // Fetch projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .eq('status', 'ongoing')
        .order('name');
      setProjects(projectsData || []);

      // Fetch users
      const { data: usersData } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, personnel_number, position')
        .eq('status', 'active')
        .order('first_name');
      setUsers(usersData || []);

    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle create task from dashboard
  const handleCreateTask = async (taskData: any) => {
    if (!taskData.title || !taskData.project_id) {
      alert('Başlık ve proje seçimi zorunludur.');
      return;
    }

    try {
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !authUser) {
        console.error('User not authenticated');
        alert('Oturum doğrulanamadı. Lütfen tekrar giriş yapın.');
        return;
      }

      const { error } = await supabase
        .from('tasks')
        .insert([{
          title: taskData.title,
          description: taskData.description,
          project_id: taskData.project_id,
          assigned_to: taskData.assigned_to || null,
          informed_person: taskData.informed_person || null,
          priority: taskData.priority,
          due_date: taskData.due_date || null,
          status: taskData.status,
          created_by: authUser.id
        }]);

      if (error) throw error;

      setIsCreating(false);
      await fetchTasks();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Görev oluşturulurken hata oluştu.');
    }
  };

  // Fetch transferred tasks from API
  const fetchTransferredTasks = async () => {
    if (!user || !userProfile) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.log('🔍 No session token available');
        return;
      }

      console.log('🔍 Fetching transferred tasks for user:', user.id);
      console.log('🔍 User profile:', userProfile);

      const response = await fetch('/api/tasks/transferred', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      console.log('🔍 API Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('🔍 API Response data:', result);
        // API direkt array dönüyor, result.data değil
        setTransferredTasks(Array.isArray(result) ? result : []);
      } else {
        console.error('🔍 API Error:', {
          status: response.status,
          statusText: response.statusText
        });
        setTransferredTasks([]);
      }
    } catch (error) {
      console.error('🔍 Error fetching transferred tasks:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error
      });
    }
  };

  useEffect(() => {
    // console.log('🔍 TaskCards useEffect triggered'); // Reduced logging

    if (user?.id && userProfile?.id) {
      loadData();
    }
  }, [user?.id, userProfile?.id]);

  const loadData = async () => {
    try {
      // Önce tasks yükle
      await fetchTasks();

      // 200ms bekle
      await new Promise(resolve => setTimeout(resolve, 200));

      // Sonra transferred tasks yükle
      await fetchTransferredTasks();
    } catch (error) {
      console.error('Error loading task data:', error);
    }
  };

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

      // Eğer görev tamamlandıysa, ilgili destek talebini de güncelle
      if (newStatus === 'done') {
        await updateRelatedSupportTicket(taskId);
      }

      await fetchTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  // Destek talebi ile ilişkili görevi güncelle
  const updateRelatedSupportTicket = async (taskId: string) => {
    try {
      // Görevin başlığından destek talebi ID'sini çıkar
      const task = tasks.find(t => t.id === taskId);
      if (!task || !task.title.startsWith('Destek Talebi:')) {
        return; // Bu bir destek talebi görevi değil
      }

      // Görev açıklamasından destek talebi ID'sini bul
      const descriptionMatch = task.description?.match(/Destek Talebi ID: ([a-f0-9-]+)/);
      if (!descriptionMatch) {
        return; // Destek talebi ID'si bulunamadı
      }

      const supportTicketId = descriptionMatch[1];

      // Session al
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // Önce hangi tür talep olduğunu kontrol et
      // Support tickets tablosunu kontrol et
      let response = await fetch(`/api/support/tickets/${supportTicketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ status: 'resolved' })
      });

      if (response.ok) {
        console.log('Support ticket başarıyla çözüldü olarak işaretlendi');
        return;
      }

      // Eğer support ticket bulunamadıysa, suggestions tablosunu kontrol et
      response = await fetch('/api/suggestions/', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          suggestion_id: supportTicketId,
          status: 'implemented'
        })
      });

      if (response.ok) {
        console.log('Öneri/Şikayet başarıyla uygulandı olarak işaretlendi');
      } else {
        console.error('Talep güncellenemedi:', await response.text());
      }
    } catch (error) {
      console.error('Talep güncellenirken hata:', error);
    }
  };

  const fetchTaskDetails = async (taskId: string) => {
    try {
      // Talep görevleri için detay getirme işlemini atla
      if (taskId.startsWith('leave_') || taskId.startsWith('advance_') || taskId.startsWith('suggestion_')) {
        setTaskComments([]);
        setTaskAttachments([]);
        setTaskExpenses([]);
        return;
      }

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
          <p className="text-xs text-slate-400 mt-1">
            {activeTab === 'tasks' ? `${filteredTasks.length} aktif görev` : `${transferredTasks.length} yönlendirilen görev`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowKanban(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl text-sm"
            title="Kanban Görünümü"
          >
            <LayoutGrid className="w-3 h-3" />
            <span className="font-medium hidden sm:inline">Kanban</span>
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl text-sm"
          >
            <Plus className="w-3 h-3" />
            <span className="font-medium">Yeni</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 mb-4 bg-slate-700/30 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'tasks'
            ? 'bg-blue-500 text-white shadow-lg'
            : 'text-slate-300 hover:text-white hover:bg-slate-600/50'
            }`}
        >
          <div className="flex items-center justify-center gap-2">
            <FileText className="w-4 h-4" />
            <span>Görevlerim</span>
            <span className="px-1.5 py-0.5 bg-blue-600/30 rounded text-xs">{tasks.length}</span>
          </div>
        </button>
        <button
          onClick={() => {
            console.log('🔍 Yönlendirilenler sekmesine tıklandı');
            console.log('🔍 Mevcut transferredTasks:', transferredTasks);
            setActiveTab('transferred');
          }}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'transferred'
            ? 'bg-orange-500 text-white shadow-lg'
            : 'text-slate-300 hover:text-white hover:bg-slate-600/50'
            }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Users className="w-4 h-4" />
            <span>Yönlendirilenler</span>
            {transferredTasks.length > 0 && (
              <span className="px-1.5 py-0.5 bg-orange-600/30 rounded text-xs animate-pulse">{transferredTasks.length}</span>
            )}
          </div>
        </button>
      </div>

      {/* Status Filter Buttons */}
      <div className="flex flex-wrap gap-1 mb-3 justify-center items-center">
        <button
          onClick={() => onStatusChange?.('todo')}
          className={`px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 whitespace-nowrap ${selectedStatus === 'todo'
            ? 'bg-slate-500 text-white shadow-lg'
            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
            }`}
        >
          Yeni
        </button>
        <button
          onClick={() => onStatusChange?.('in_progress')}
          className={`px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 whitespace-nowrap ${selectedStatus === 'in_progress'
            ? 'bg-blue-500 text-white shadow-lg'
            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
            }`}
        >
          Devam Ediyor
        </button>
        <button
          onClick={() => onStatusChange?.('review')}
          className={`px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 whitespace-nowrap ${selectedStatus === 'review'
            ? 'bg-yellow-500 text-white shadow-lg'
            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
            }`}
        >
          İnceleme
        </button>
        <button
          onClick={() => onStatusChange?.('done')}
          className={`px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 whitespace-nowrap ${selectedStatus === 'done'
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
            {activeTab === 'tasks' ? (
              filteredTasks.map((task) => (
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
              ))
            ) : (
              // Yönlendirilen görevler
              transferredTasks.map((transfer) => (
                <div
                  key={transfer.id}
                  className="w-full max-w-sm mx-auto group bg-orange-800/20 backdrop-blur-sm rounded-xl p-4 border border-orange-700/50 hover:border-orange-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-black/10"
                >
                  {/* Transfer Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-orange-400" />
                        <div>
                          <h4 className="font-semibold text-white text-sm group-hover:text-orange-300 transition-colors">
                            {transfer.task?.title}
                          </h4>
                          <span className="text-xs text-orange-400 font-medium">{transfer.task?.project?.name}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-white bg-orange-500 shadow-sm">
                        Yönlendirme
                      </span>
                    </div>
                  </div>

                  {/* Transfer Info */}
                  <div className="bg-orange-900/20 rounded-lg p-3 mb-2">
                    <p className="text-xs text-orange-200 mb-1">
                      <span className="font-medium">{transfer.from_user?.first_name} {transfer.from_user?.last_name}</span> tarafından yönlendirildi
                    </p>
                    <p className="text-xs text-orange-300 leading-relaxed">
                      {transfer.reason}
                    </p>
                  </div>

                  {/* Transfer Footer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-orange-400" />
                        <span className="text-xs text-orange-300">
                          {new Date(transfer.created_at).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          try {
                            const { data: { session } } = await supabase.auth.getSession();
                            if (!session?.access_token) return;

                            const response = await fetch(`/api/task-transfers/${transfer.id}`, {
                              method: 'PATCH',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${session.access_token}`
                              },
                              body: JSON.stringify({ action: 'approve' })
                            });

                            if (response.ok) {
                              alert('Görev başarıyla kabul edildi!');
                              fetchTransferredTasks();
                              fetchTasks();
                            } else {
                              const errorData = await response.json();
                              alert(`Hata: ${errorData.error || 'Bilinmeyen hata'}`);
                            }
                          } catch (error) {
                            console.error('Error accepting transfer:', error);
                            alert('Bir hata oluştu. Lütfen tekrar deneyin.');
                          }
                        }}
                        className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded hover:bg-green-500/30 transition-all text-xs font-medium"
                      >
                        Kabul Et
                      </button>
                      <button
                        onClick={async () => {
                          const reason = prompt('Red nedeni:');
                          if (!reason) return;

                          try {
                            const { data: { session } } = await supabase.auth.getSession();
                            if (!session?.access_token) return;

                            const response = await fetch(`/api/task-transfers/${transfer.id}`, {
                              method: 'PATCH',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${session.access_token}`
                              },
                              body: JSON.stringify({
                                action: 'reject',
                                rejection_reason: reason
                              })
                            });

                            if (response.ok) {
                              alert('Görev yönlendirmesi reddedildi.');
                              fetchTransferredTasks();
                            } else {
                              const errorData = await response.json();
                              alert(`Hata: ${errorData.error || 'Bilinmeyen hata'}`);
                            }
                          } catch (error) {
                            console.error('Error rejecting transfer:', error);
                            alert('Bir hata oluştu. Lütfen tekrar deneyin.');
                          }
                        }}
                        className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30 transition-all text-xs font-medium"
                      >
                        Reddet
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Empty State */}
            {((activeTab === 'tasks' && filteredTasks.length === 0) || (activeTab === 'transferred' && transferredTasks.length === 0)) && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  {activeTab === 'tasks' ? <Plus className="w-8 h-8 text-slate-600" /> : <Users className="w-8 h-8 text-orange-600" />}
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">
                  {activeTab === 'tasks' ? 'Görev Bulunamadı' : 'Yönlendirilen Görev Yok'}
                </h4>
                <p className="text-sm text-slate-400 mb-4">
                  {activeTab === 'tasks'
                    ? (selectedStatus ? `${getStatusText(selectedStatus as any)} durumunda görev bulunmuyor` : 'Henüz görev eklenmemiş')
                    : 'Size yönlendirilen bekleyen görev bulunmuyor'
                  }
                </p>
                {activeTab === 'tasks' && (
                  <button
                    onClick={() => setIsCreating(true)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
                  >
                    İlk Görevi Oluştur
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Use TaskDetailView Component with Portal */}
      {viewingTask && typeof window !== 'undefined' && createPortal(
        <TaskDetailView
          task={viewingTask}
          onClose={() => setViewingTask(null)}
          onUpdateTaskStatus={handleStatusUpdate}
          fetchTaskDetails={fetchTaskDetails}
          taskComments={taskComments}
          taskAttachments={taskAttachments}
          setTaskComments={setTaskComments}
          setTaskAttachments={setTaskAttachments}
        />,
        document.body
      )}

      {/* Kanban View */}
      {showKanban && typeof window !== 'undefined' && createPortal(
        <KanbanView onClose={() => {
          setShowKanban(false);
          // Kanban kapatıldığında görevleri yeniden yükle
          fetchTasks();
        }} />,
        document.body
      )}

      {/* Create Task Modal */}
      {isCreating && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-800/95 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            <CreateTaskView
              onClose={() => setIsCreating(false)}
              onSave={handleCreateTask}
              projects={projects}
              users={users}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
