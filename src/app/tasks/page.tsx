'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit3, Trash2, Clock, User, Calendar, MessageSquare, Paperclip, CheckCircle2, Eye, X, Send, Download, AlertCircle, FileText, Users, Image, Smile, Save, XCircle, DollarSign, Receipt, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Task, Project, UserProfile, TaskComment, TaskAttachment, TaskExpense } from '@/types';

import CreateTaskView from '@/components/tasks/CreateTaskView';
import TaskDetailView from '@/components/tasks/TaskDetailView';

export default function TasksPage() {
  const { userProfile, loading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<{
    id: string;
    first_name: string;
    last_name: string;
    personnel_number: string;
    position?: string;
  }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    project_id: '',
    assigned_to: '',
    informed_person: '',
    priority: 'medium' as const,
    status: 'todo' as const,
    due_date: ''
  });
  
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedInformed, setSelectedInformed] = useState<string[]>([]);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [informedSearch, setInformedSearch] = useState('');
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showInformedDropdown, setShowInformedDropdown] = useState(false);

  const [newComment, setNewComment] = useState('');
  const [taskComments, setTaskComments] = useState<TaskComment[]>([]);
  const [taskAttachments, setTaskAttachments] = useState<TaskAttachment[]>([]);
  const [taskExpenses, setTaskExpenses] = useState<TaskExpense[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTask, setEditingTask] = useState<{
    status: string;
  }>({ status: '' });

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

  // Fetch data from Supabase and API
  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      const authHeaders: HeadersInit = session?.access_token ? {
        'Authorization': `Bearer ${session.access_token}`
      } : {};

      // Fetch normal tasks from Supabase directly
      let tasksQuery = supabase
        .from('tasks')
        .select(`
          *,
          project:projects(id, name),
          assignee:user_profiles!tasks_assigned_to_fkey(id, first_name, last_name, personnel_number),
          assigner:user_profiles!tasks_assigned_by_fkey(id, first_name, last_name, personnel_number),
          informed:user_profiles!tasks_informed_person_fkey(id, first_name, last_name, personnel_number),
          creator:user_profiles!tasks_created_by_fkey(id, first_name, last_name, personnel_number)
        `);

      // Admin kullanıcılar tüm görevleri görebilir, diğer kullanıcılar sadece kendi görevlerini
      if (userProfile && userProfile.authority_level !== 'admin') {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.error('User not authenticated');
          return;
        }
        tasksQuery = tasksQuery.or(`assigned_to.eq.${user.id},created_by.eq.${user.id},informed_person.eq.${user.id}`);
      }

      const { data: normalTasks, error: tasksError } = await tasksQuery
        .order('created_at', { ascending: false });

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
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setTasks(allTasks);

      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('status', 'ongoing')
        .order('name');

      if (projectsError) throw projectsError;

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, personnel_number, position')
        .eq('status', 'active')
        .order('first_name');

      if (usersError) throw usersError;

      setProjects(projectsData || []);
      setUsers(usersData || []);
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile) {
      fetchData();
    }
  }, [userProfile]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Kimlik doğrulanıyor...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center">
          <p className="text-slate-400">Giriş sayfasına yönlendiriliyor...</p>
        </div>
      </div>
    );
  }

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.project?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleCreateTask = async () => {
    if (!newTask.title || !newTask.project_id) {
      alert('Başlık ve proje seçimi zorunludur.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          title: newTask.title,
          description: newTask.description,
          project_id: newTask.project_id,
          assigned_to: newTask.assigned_to || null,
          informed_person: newTask.informed_person || null,
          priority: newTask.priority,
          due_date: newTask.due_date || null,
          status: newTask.status
        }])
        .select()
        .single();

      if (error) throw error;

      await fetchData();
      
      setNewTask({
        title: '',
        description: '',
        project_id: '',
        assigned_to: '',
        informed_person: '',
        priority: 'medium',
        status: 'todo',
        due_date: ''
      });
      setSelectedAssignees([]);
      setSelectedInformed([]);
      setIsCreating(false);
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Görev oluşturulurken hata oluştu.');
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus,
          completed_at: newStatus === 'done' ? new Date().toISOString() : null
        })
        .eq('id', taskId);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error updating task status:', error);
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

      if (commentsError) throw commentsError;

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
    } catch (error) {
      console.error('Error fetching task details:', error);
    }
  };

  const handleAddComment = async (taskId: string) => {
    if (!newComment.trim()) return;

    try {
      // Get current user from Supabase auth
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('User not authenticated');
        return;
      }

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

  const deleteTask = async (id: string) => {
    if (!confirm('Bu görevi silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Görev silinirken hata oluştu.');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'todo': return <Clock className="w-4 h-4" />;
      case 'in_progress': return <AlertCircle className="w-4 h-4" />;
      case 'review': return <Eye className="w-4 h-4" />;
      case 'done': return <CheckCircle2 className="w-4 h-4" />;
      case 'cancelled': return <X className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
      case 'in_progress': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'review': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'done': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'urgent': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'todo': return 'Yeni';
      case 'in_progress': return 'Devam Ediyor';
      case 'review': return 'İnceleme';
      case 'done': return 'Tamamlandı';
      case 'cancelled': return 'İptal Edildi';
      default: return status;
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
      await fetchData();
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

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && viewingTask?.status !== 'done';
  };

  // Expense functions
  const handleAddExpense = async (taskId: string) => {
    if (!newExpense.title || !newExpense.amount) {
      alert('Başlık ve tutar zorunludur.');
      return;
    }

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('User not authenticated');
        return;
      }

      const { error } = await supabase
        .from('task_expenses')
        .insert([{
          task_id: taskId,
          title: newExpense.title,
          description: newExpense.description || null,
          amount: parseFloat(newExpense.amount),
          currency: newExpense.currency,
          category: newExpense.category,
          vendor: newExpense.vendor || null,
          receipt_number: newExpense.receipt_number || null,
          expense_date: newExpense.expense_date,
          status: 'pending',
          created_by: user.id
        }]);

      if (error) throw error;

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
      await fetchTaskDetails(taskId);
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('Harcama eklenirken hata oluştu.');
    }
  };

  const handleApproveExpense = async (expenseId: string) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('User not authenticated');
        return;
      }

      const { error } = await supabase
        .from('task_expenses')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', expenseId);

      if (error) throw error;

      if (viewingTask) {
        await fetchTaskDetails(viewingTask.id);
      }
    } catch (error) {
      console.error('Error approving expense:', error);
      alert('Harcama onaylanırken hata oluştu.');
    }
  };

  const handleRejectExpense = async (expenseId: string, reason: string) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('User not authenticated');
        return;
      }

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

      if (viewingTask) {
        await fetchTaskDetails(viewingTask.id);
      }
    } catch (error) {
      console.error('Error rejecting expense:', error);
      alert('Harcama reddedilirken hata oluştu.');
    }
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
      case 'pending': return 'Beklemede';
      case 'approved': return 'Onaylandı';
      case 'rejected': return 'Reddedildi';
      default: return status;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'material': return 'Malzeme';
      case 'service': return 'Hizmet';
      case 'travel': return 'Seyahat';
      case 'equipment': return 'Ekipman';
      case 'software': return 'Yazılım';
      case 'other': return 'Diğer';
      default: return category;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    const formatter = new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    });
    return formatter.format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Görevler</h1>
          <p className="text-slate-400 mt-1">Proje görevlerini yönetin ve takip edin</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-3 py-2 md:px-4 text-sm md:text-base bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Görev</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Görev ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
        >
          <option value="all">Tüm Durumlar</option>
          <option value="todo">Yeni</option>
          <option value="in_progress">Devam Ediyor</option>
          <option value="review">İnceleme</option>
          <option value="done">Tamamlandı</option>
          <option value="cancelled">İptal Edildi</option>
        </select>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="w-full sm:w-auto px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
        >
          <option value="all">Tüm Öncelikler</option>
          <option value="low">Düşük</option>
          <option value="medium">Orta</option>
          <option value="high">Yüksek</option>
          <option value="urgent">Acil</option>
        </select>
      </div>

      {/* Tasks Cards for Mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
        {isLoading ? (
          // Loading Skeleton
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-slate-800/50 p-4 rounded-xl animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-slate-700/70 rounded w-1/2 mb-4"></div>
              <div className="h-3 bg-slate-700/70 rounded w-full mb-2"></div>
              <div className="h-3 bg-slate-700/70 rounded w-full"></div>
            </div>
          ))
        ) : (
          filteredTasks.map((task) => (
            <div key={task.id} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-white">{task.title}</h3>
                  <p className="text-sm text-slate-400">{task.project?.name}</p>
                </div>
                <button
                  onClick={() => {
                    setViewingTask(task);
                    fetchTaskDetails(task.id);
                  }}
                  className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700/50 rounded-lg transition-all"
                  title="Detayları Görüntüle"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${getStatusColor(task.status)}`}>
                  {getStatusLabel(task.status)}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${getPriorityColor(task.priority)}`}>
                  {getPriorityLabel(task.priority)}
                </span>
              </div>

              {task.assignee && (
                <div>
                  <p className="text-sm text-slate-400">Sorumlu</p>
                  <p className="text-white font-medium">{task.assignee.first_name} {task.assignee.last_name}</p>
                </div>
              )}

              {task.due_date && (
                <div>
                  <p className="text-sm text-slate-400">Son Teslim</p>
                  <p className={`text-white font-medium ${isOverdue(task.due_date) ? 'text-red-400' : ''}`}>
                    {new Date(task.due_date).toLocaleDateString('tr-TR')}
                    {isOverdue(task.due_date) && <span className="text-xs"> (Gecikmiş)</span>}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Desktop Tasks Table */}
      <div className="hidden lg:block">
        {isLoading ? (
          <div className="bg-slate-800/50 rounded-xl p-6">
            <div className="animate-pulse space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="h-4 bg-slate-700 rounded w-1/4"></div>
                  <div className="h-4 bg-slate-700 rounded w-1/6"></div>
                  <div className="h-4 bg-slate-700 rounded w-1/6"></div>
                  <div className="h-4 bg-slate-700 rounded w-1/4"></div>
                  <div className="h-4 bg-slate-700 rounded w-1/6"></div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-slate-800/50 rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Görev Bulunamadı</h3>
            <p className="text-slate-400 mb-6">
              {statusFilter !== 'all' || priorityFilter !== 'all' || searchTerm 
                ? 'Arama kriterlerinize uygun görev bulunamadı.' 
                : 'Henüz görev eklenmemiş.'}
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
            >
              İlk Görevi Oluştur
            </button>
          </div>
        ) : (
          <div className="bg-slate-800/50 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Görev
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Proje
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Öncelik
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Sorumlu
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Son Teslim
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {filteredTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-white">{task.title}</div>
                          {task.description && (
                            <div className="text-sm text-slate-400 truncate max-w-xs">
                              {task.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-300">{task.project?.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium ${getStatusColor(task.status)}`}>
                          {getStatusIcon(task.status)}
                          {getStatusLabel(task.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full border text-xs font-medium ${getPriorityColor(task.priority)}`}>
                          {getPriorityLabel(task.priority)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {task.assignee ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {task.assignee.first_name?.charAt(0)}
                            </div>
                            <span className="text-sm text-slate-300">
                              {task.assignee.first_name} {task.assignee.last_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-500">Atanmamış</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {task.due_date ? (
                          <div className={`text-sm ${isOverdue(task.due_date) ? 'text-red-400' : 'text-slate-300'}`}>
                            {new Date(task.due_date).toLocaleDateString('tr-TR')}
                            {isOverdue(task.due_date) && (
                              <div className="text-xs text-red-400">Gecikmiş</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-500">Belirsiz</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setViewingTask(task);
                              fetchTaskDetails(task.id);
                            }}
                            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700/50 rounded-lg transition-all"
                            title="Detayları Görüntüle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {task.status !== 'done' && task.status !== 'cancelled' && (
                            <button
                              onClick={() => handleUpdateTaskStatus(task.id, 'done')}
                              className="p-2 text-slate-400 hover:text-green-400 hover:bg-slate-700/50 rounded-lg transition-all"
                              title="Tamamla"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Task View for Mobile */}
      <div className="lg:hidden">
        {isCreating && (
          <CreateTaskView 
            onClose={() => setIsCreating(false)}
            onSave={handleCreateTask}
            projects={projects}
            users={users}
          />
        )}
      </div>

      {/* Create Task Modal for Desktop */}
      {isCreating && (
        <div className="hidden lg:flex fixed inset-0 bg-black/50 backdrop-blur-sm items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700/50">
              <h3 className="text-xl font-bold text-white">Yeni Görev Oluştur</h3>
              <p className="text-slate-400 mt-1">Görev bilgilerini girin</p>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] pb-24 md:pb-6">
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Başlık *
                  </label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="Görev başlığını girin"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Açıklama
                  </label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full px-3 py-2 h-20 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="Görev açıklamasını girin"
                  />
                </div>

                {/* Project */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Proje *
                  </label>
                  <select
                    value={newTask.project_id}
                    onChange={(e) => setNewTask({ ...newTask, project_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  >
                    <option value="">Proje seçin</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Assigned To */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Sorumlu Kişiler
                    </label>
                    
                    {/* Seçilen kişiler */}
                    {selectedAssignees.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {selectedAssignees.map(userId => {
                          const user = users.find(u => u.id === userId);
                          if (!user) return null;
                          return (
                            <div key={userId} className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg text-sm">
                              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                {user.first_name?.charAt(0)}
                              </div>
                              <span>{user.first_name} {user.last_name}</span>
                              <button
                                onClick={() => {
                                  const newAssignees = selectedAssignees.filter(id => id !== userId);
                                  setSelectedAssignees(newAssignees);
                                  setNewTask({ ...newTask, assigned_to: newAssignees[0] || '' });
                                }}
                                className="text-blue-300 hover:text-white"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Arama kutusu */}
                    <div className="relative">
                      <input
                        type="text"
                        value={assigneeSearch}
                        onChange={(e) => {
                          setAssigneeSearch(e.target.value);
                          setShowAssigneeDropdown(e.target.value.length > 0);
                        }}
                        onFocus={() => setShowAssigneeDropdown(assigneeSearch.length > 0)}
                        className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                        placeholder="Kişi ara ve ekle..."
                      />
                      
                      {/* Dropdown */}
                      {showAssigneeDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                          {users
                            .filter(user => 
                              !selectedAssignees.includes(user.id) &&
                              (user.first_name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
                               user.last_name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
                               user.position?.toLowerCase().includes(assigneeSearch.toLowerCase()))
                            )
                            .map(user => (
                              <button
                                key={user.id}
                                onClick={() => {
                                  const newAssignees = [...selectedAssignees, user.id];
                                  setSelectedAssignees(newAssignees);
                                  setNewTask({ ...newTask, assigned_to: newAssignees[0] || '' });
                                  setAssigneeSearch('');
                                  setShowAssigneeDropdown(false);
                                }}
                                className="w-full flex items-center gap-3 p-3 hover:bg-slate-600/50 text-left"
                              >
                                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                  {user.first_name?.charAt(0)}
                                </div>
                                <div>
                                  <div className="text-white text-sm">{user.first_name} {user.last_name}</div>
                                  {user.position && <div className="text-slate-400 text-xs">{user.position}</div>}
                                </div>
                              </button>
                            ))}
                          {users.filter(user => 
                            !selectedAssignees.includes(user.id) &&
                            (user.first_name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
                             user.last_name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
                             user.position?.toLowerCase().includes(assigneeSearch.toLowerCase()))
                          ).length === 0 && (
                            <div className="p-3 text-slate-400 text-sm">Kişi bulunamadı</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Informed Person */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Bilgi Kişileri
                    </label>
                    
                    {/* Seçilen kişiler */}
                    {selectedInformed.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {selectedInformed.map(userId => {
                          const user = users.find(u => u.id === userId);
                          if (!user) return null;
                          return (
                            <div key={userId} className="flex items-center gap-2 px-3 py-1 bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 rounded-lg text-sm">
                              <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                {user.first_name?.charAt(0)}
                              </div>
                              <span>{user.first_name} {user.last_name}</span>
                              <button
                                onClick={() => {
                                  const newInformed = selectedInformed.filter(id => id !== userId);
                                  setSelectedInformed(newInformed);
                                  setNewTask({ ...newTask, informed_person: newInformed[0] || '' });
                                }}
                                className="text-yellow-300 hover:text-white"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Arama kutusu */}
                    <div className="relative">
                      <input
                        type="text"
                        value={informedSearch}
                        onChange={(e) => {
                          setInformedSearch(e.target.value);
                          setShowInformedDropdown(e.target.value.length > 0);
                        }}
                        onFocus={() => setShowInformedDropdown(informedSearch.length > 0)}
                        className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50"
                        placeholder="Bilgi kişisi ara ve ekle..."
                      />
                      
                      {/* Dropdown */}
                      {showInformedDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                          {users
                            .filter(user => 
                              !selectedInformed.includes(user.id) &&
                              (user.first_name.toLowerCase().includes(informedSearch.toLowerCase()) ||
                               user.last_name.toLowerCase().includes(informedSearch.toLowerCase()) ||
                               user.position?.toLowerCase().includes(informedSearch.toLowerCase()))
                            )
                            .map(user => (
                              <button
                                key={user.id}
                                onClick={() => {
                                  const newInformed = [...selectedInformed, user.id];
                                  setSelectedInformed(newInformed);
                                  setNewTask({ ...newTask, informed_person: newInformed[0] || '' });
                                  setInformedSearch('');
                                  setShowInformedDropdown(false);
                                }}
                                className="w-full flex items-center gap-3 p-3 hover:bg-slate-600/50 text-left"
                              >
                                <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                  {user.first_name?.charAt(0)}
                                </div>
                                <div>
                                  <div className="text-white text-sm">{user.first_name} {user.last_name}</div>
                                  {user.position && <div className="text-slate-400 text-xs">{user.position}</div>}
                                </div>
                              </button>
                            ))}
                          {users.filter(user => 
                            !selectedInformed.includes(user.id) &&
                            (user.first_name.toLowerCase().includes(informedSearch.toLowerCase()) ||
                             user.last_name.toLowerCase().includes(informedSearch.toLowerCase()) ||
                             user.position?.toLowerCase().includes(informedSearch.toLowerCase()))
                          ).length === 0 && (
                            <div className="p-3 text-slate-400 text-sm">Kişi bulunamadı</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Öncelik
                    </label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    >
                      <option value="low">Düşük</option>
                      <option value="medium">Orta</option>
                      <option value="high">Yüksek</option>
                      <option value="urgent">Acil</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Durum
                    </label>
                    <select
                      value={newTask.status}
                      onChange={(e) => setNewTask({ ...newTask, status: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    >
                      <option value="todo">Yeni</option>
                      <option value="in_progress">Devam Ediyor</option>
                      <option value="review">İnceleme</option>
                      <option value="done">Tamamlandı</option>
                      <option value="cancelled">İptal Edildi</option>
                    </select>
                  </div>

                  {/* Due Date */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Son Teslim Tarihi
                    </label>
                    <input
                      type="datetime-local"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed Modal Footer */}
            <div className="sticky bottom-0 bg-slate-800/95 backdrop-blur-sm border-t border-slate-700/50 p-4">
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={() => setIsCreating(false)}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-500/20 text-slate-400 border border-slate-500/30 rounded-xl hover:bg-slate-500/30 transition-all text-sm font-medium min-w-[120px] justify-center"
                >
                  <X className="w-4 h-4" />
                  İptal
                </button>
                <button
                  onClick={handleCreateTask}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl hover:bg-blue-500/30 transition-all text-sm font-medium min-w-[120px] justify-center"
                >
                  <Plus className="w-4 h-4" />
                  Görev Oluştur
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {viewingTask && (
        <TaskDetailView
          task={viewingTask}
          onClose={() => setViewingTask(null)}
          onUpdateTaskStatus={handleUpdateTaskStatus}
          fetchTaskDetails={fetchTaskDetails}
          taskComments={taskComments}
          taskAttachments={taskAttachments}
          setTaskComments={setTaskComments}
          setTaskAttachments={setTaskAttachments}
        />
      )}
    </div>
  );
}
