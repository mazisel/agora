'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Edit3, Trash2, Building, Calendar, DollarSign, User, Eye, X, Clock, CheckCircle, AlertCircle, Users, FileText, Target } from 'lucide-react';
import { Project, Task } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { usePermissions } from '@/hooks/usePermissions';
import { canManageProjects } from '@/types/permissions';

const projectTypes = [
  { value: 'social_media', label: 'Sosyal Medya' },
  { value: 'software', label: 'Yazılım' },
  { value: 'hardware', label: 'Donanım' },
  { value: 'rnd', label: 'Ar-Ge' },
  { value: 'mobile_app', label: 'Mobil Uygulama' },
  { value: 'website', label: 'Web Sitesi' }
];

const statusOptions = [
  { value: 'ongoing', label: 'Devam Ediyor', color: 'bg-green-500' },
  { value: 'completed', label: 'Tamamlandı', color: 'bg-blue-500' },
  { value: 'cancelled', label: 'İptal Edildi', color: 'bg-red-500' }
];

export default function ProjectsPage() {
  const { user, loading } = useAuth();
  const { userProfile } = usePermissions();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [viewingProject, setViewingProject] = useState<Project | null>(null);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    status: 'ongoing' as const,
    project_type: 'website' as const,
    client_id: '',
    start_date: '',
    end_date: '',
    estimated_end_date: '',
    project_manager_id: '',
    project_members: [] as string[],
    total_budget: 0,
    spent_budget: 0,
    notes: ''
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Fetch projects from Supabase
  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          client:companies!projects_client_id_fkey (
            id,
            name
          ),
          project_manager:user_profiles!projects_project_manager_id_fkey (
            id,
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch companies for dropdown
  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  // Fetch users for dropdown
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name')
        .eq('status', 'active')
        .order('first_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchCompanies();
    fetchUsers();
  }, []);

  // Fetch tasks for a specific project
  const fetchProjectTasks = async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          project:projects!tasks_project_id_fkey (
            id,
            name
          ),
          assignee:user_profiles!tasks_assigned_to_fkey (
            id,
            first_name,
            last_name
          ),
          assigner:user_profiles!tasks_assigned_by_fkey (
            id,
            first_name,
            last_name
          ),
          creator:user_profiles!tasks_created_by_fkey (
            id,
            first_name,
            last_name
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjectTasks(data || []);
    } catch (error) {
      console.error('Error fetching project tasks:', error);
      setProjectTasks([]);
    }
  };

  // Handle project view
  const handleViewProject = async (project: Project) => {
    setViewingProject(project);
    await fetchProjectTasks(project.id);
  };

  // Get task status color and text
  const getTaskStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'todo': return 'bg-gray-500';
      case 'in_progress': return 'bg-blue-500';
      case 'review': return 'bg-yellow-500';
      case 'done': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getTaskStatusText = (status: Task['status']) => {
    switch (status) {
      case 'todo': return 'Yapılacak';
      case 'in_progress': return 'Devam Ediyor';
      case 'review': return 'İncelemede';
      case 'done': return 'Tamamlandı';
      case 'cancelled': return 'İptal Edildi';
      default: return status;
    }
  };

  const getTaskPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'low': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-orange-400';
      case 'urgent': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getTaskPriorityText = (priority: Task['priority']) => {
    switch (priority) {
      case 'low': return 'Düşük';
      case 'medium': return 'Orta';
      case 'high': return 'Yüksek';
      case 'urgent': return 'Acil';
      default: return priority;
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.project_manager?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.project_manager?.last_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const createProject = async () => {
    if (!newProject.name.trim() || !newProject.client_id || !newProject.project_manager_id) {
      alert('Proje adı, müşteri ve proje yöneticisi zorunludur.');
      return;
    }

    try {
      const { error } = await supabase
        .from('projects')
        .insert([{
          name: newProject.name.trim(),
          description: newProject.description.trim(),
          status: newProject.status,
          project_type: newProject.project_type,
          client_id: newProject.client_id,
          start_date: newProject.start_date,
          end_date: newProject.end_date || null,
          estimated_end_date: newProject.estimated_end_date,
          project_manager_id: newProject.project_manager_id,
          project_members: newProject.project_members,
          total_budget: newProject.total_budget,
          spent_budget: newProject.spent_budget,
          notes: newProject.notes.trim()
        }]);

      if (error) throw error;

      await fetchProjects();
      setNewProject({
        name: '',
        description: '',
        status: 'ongoing',
        project_type: 'website',
        client_id: '',
        start_date: '',
        end_date: '',
        estimated_end_date: '',
        project_manager_id: '',
        project_members: [],
        total_budget: 0,
        spent_budget: 0,
        notes: ''
      });
      setIsCreating(false);
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Proje oluşturulurken hata oluştu.');
    }
  };

  const updateProject = async () => {
    if (!editingProject) return;

    if (!editingProject.name.trim() || !editingProject.client_id || !editingProject.project_manager_id) {
      alert('Proje adı, müşteri ve proje yöneticisi zorunludur.');
      return;
    }

    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: editingProject.name.trim(),
          description: editingProject.description?.trim(),
          status: editingProject.status,
          project_type: editingProject.project_type,
          client_id: editingProject.client_id,
          start_date: editingProject.start_date,
          end_date: editingProject.end_date || null,
          estimated_end_date: editingProject.estimated_end_date,
          project_manager_id: editingProject.project_manager_id,
          project_members: editingProject.project_members,
          total_budget: editingProject.total_budget,
          spent_budget: editingProject.spent_budget,
          notes: editingProject.notes?.trim()
        })
        .eq('id', editingProject.id);

      if (error) throw error;

      await fetchProjects();
      setEditingProject(null);
      alert('Proje başarıyla güncellendi!');
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Proje güncellenirken hata oluştu.');
    }
  };

  const deleteProject = async (id: string) => {
    if (!confirm('Bu projeyi silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Proje silinirken hata oluştu.');
    }
  };

  const getStatusColor = (status: Project['status']) => {
    return statusOptions.find(s => s.value === status)?.color || 'bg-gray-500';
  };

  const getStatusText = (status: Project['status']) => {
    return statusOptions.find(s => s.value === status)?.label || status;
  };

  const getProjectTypeLabel = (type: Project['project_type']) => {
    return projectTypes.find(t => t.value === type)?.label || type;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calculateProgress = (project: Project) => {
    if (project.total_budget === 0) return 0;
    return Math.round((project.spent_budget / project.total_budget) * 100);
  };

  const isOverdue = (estimatedEndDate: string) => {
    if (!mounted) return false; // Prevent hydration mismatch
    if (!estimatedEndDate) return false;
    const today = new Date();
    const endDate = new Date(estimatedEndDate);
    return today > endDate;
  };

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

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Projeler</h1>
              <p className="text-slate-400 mt-1">Proje yönetimi ve takibi</p>
            </div>
            {userProfile && canManageProjects(userProfile.authority_level) && (
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                Yeni Proje
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Proje, müşteri veya yönetici ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-auto px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
            >
              <option value="all">Tüm Durumlar</option>
              {statusOptions.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* Projects Table for Desktop */}
          <div className="hidden lg:block bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Proje
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Müşteri
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Bütçe
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Tarihler
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Yönetici
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {isLoading ? (
                    // Loading Skeleton
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4">
                          <div className="animate-pulse">
                            <div className="h-4 bg-slate-700 rounded w-32 mb-2"></div>
                            <div className="h-3 bg-slate-700/70 rounded w-20"></div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 bg-slate-700 rounded w-24 animate-pulse"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-6 bg-slate-700 rounded w-20 animate-pulse"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 bg-slate-700 rounded w-16 animate-pulse"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 bg-slate-700 rounded w-20 animate-pulse"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 bg-slate-700 rounded w-24 animate-pulse"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <div className="h-8 w-8 bg-slate-700 rounded animate-pulse"></div>
                            <div className="h-8 w-8 bg-slate-700 rounded animate-pulse"></div>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    filteredProjects.map((project) => (
                      <tr key={project.id} className="hover:bg-slate-700/30 transition-colors cursor-pointer" onClick={() => handleViewProject(project)}>
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-white">{project.name}</div>
                            <div className="text-sm text-slate-400">
                              {getProjectTypeLabel(project.project_type)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-300">
                              {project.client?.name || '-'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getStatusColor(project.status)}`}>
                            {getStatusText(project.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="text-white font-medium">
                              {formatCurrency(project.spent_budget)} / {formatCurrency(project.total_budget)}
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-1.5 mt-1">
                              <div
                                className={`h-1.5 rounded-full transition-all duration-300 ${calculateProgress(project) > 90 ? 'bg-red-500' :
                                    calculateProgress(project) > 70 ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                style={{ width: `${Math.min(calculateProgress(project), 100)}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                              %{calculateProgress(project)} kullanıldı
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="text-slate-300">
                              Başlangıç: {formatDate(project.start_date)}
                            </div>
                            <div className={`${isOverdue(project.estimated_end_date) ? 'text-red-400' : 'text-slate-400'
                              }`}>
                              Tahmini: {formatDate(project.estimated_end_date)}
                              {isOverdue(project.estimated_end_date) && ' (Gecikmiş)'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-300">
                              {project.project_manager ?
                                `${project.project_manager.first_name} ${project.project_manager.last_name}` :
                                '-'
                              }
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {userProfile && canManageProjects(userProfile.authority_level) && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingProject(project);
                                  }}
                                  className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700/50 rounded-lg transition-all"
                                  title="Düzenle"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteProject(project.id);
                                  }}
                                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition-all"
                                  title="Sil"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Projects Cards for Mobile */}
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
              filteredProjects.map((project) => (
                <div key={project.id} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 space-y-3 cursor-pointer hover:bg-slate-700/30 transition-colors" onClick={() => handleViewProject(project)}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-white">{project.name}</h3>
                      <p className="text-sm text-slate-400">{getProjectTypeLabel(project.project_type)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(project.status)}`}>
                      {getStatusText(project.status)}
                    </span>
                  </div>

                  <div>
                    <p className="text-sm text-slate-400">Müşteri</p>
                    <p className="text-white font-medium">{project.client?.name || '-'}</p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-400">Bütçe</p>
                    <div className="text-sm">
                      <div className="text-white font-medium">
                        {formatCurrency(project.spent_budget)} / {formatCurrency(project.total_budget)}
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-1.5 mt-1">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${calculateProgress(project) > 90 ? 'bg-red-500' :
                              calculateProgress(project) > 70 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                          style={{ width: `${Math.min(calculateProgress(project), 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {userProfile && canManageProjects(userProfile.authority_level) && (
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-700/50">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProject(project);
                        }}
                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700/50 rounded-lg transition-all"
                        title="Düzenle"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteProject(project.id);
                        }}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition-all"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Empty State */}
          {!isLoading && filteredProjects.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Building className="w-8 h-8 text-slate-600" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {searchTerm || statusFilter !== 'all' ? 'Proje Bulunamadı' : 'Henüz Proje Yok'}
              </h3>
              <p className="text-slate-400 mb-6">
                {searchTerm || statusFilter !== 'all'
                  ? 'Arama kriterlerinize uygun proje bulunamadı'
                  : 'İlk projenizi oluşturun'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <button
                  onClick={() => setIsCreating(true)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
                >
                  İlk Projeyi Oluştur
                </button>
              )}
            </div>
          )}

          {/* Create Project Modal */}
          {isCreating && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-4xl w-full max-h-[90vh] overflow-hidden">
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-700/50">
                  <h3 className="text-xl font-bold text-white">Yeni Proje Oluştur</h3>
                  <p className="text-slate-400 mt-1">Proje bilgilerini girin</p>
                </div>

                {/* Modal Content */}
                <div className="p-6 overflow-y-auto max-h-[70vh]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Proje Adı *
                        </label>
                        <input
                          type="text"
                          value={newProject.name}
                          onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                          placeholder="Proje adını girin"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Açıklama
                        </label>
                        <textarea
                          value={newProject.description}
                          onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                          className="w-full px-3 py-2 h-20 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                          placeholder="Proje açıklaması"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Proje Tipi
                          </label>
                          <select
                            value={newProject.project_type}
                            onChange={(e) => setNewProject({ ...newProject, project_type: e.target.value as any })}
                            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                          >
                            {projectTypes.map(type => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Durum
                          </label>
                          <select
                            value={newProject.status}
                            onChange={(e) => setNewProject({ ...newProject, status: e.target.value as any })}
                            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                          >
                            {statusOptions.map(status => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Müşteri *
                        </label>
                        <select
                          value={newProject.client_id}
                          onChange={(e) => setNewProject({ ...newProject, client_id: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                        >
                          <option value="">Müşteri seçin</option>
                          {companies.map(company => (
                            <option key={company.id} value={company.id}>
                              {company.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Proje Yöneticisi *
                        </label>
                        <select
                          value={newProject.project_manager_id}
                          onChange={(e) => setNewProject({ ...newProject, project_manager_id: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                        >
                          <option value="">Yönetici seçin</option>
                          {users.map(user => (
                            <option key={user.id} value={user.id}>
                              {user.first_name} {user.last_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Başlangıç Tarihi *
                          </label>
                          <input
                            type="date"
                            value={newProject.start_date}
                            onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Bitiş Tarihi
                          </label>
                          <input
                            type="date"
                            value={newProject.end_date}
                            onChange={(e) => setNewProject({ ...newProject, end_date: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Tahmini Bitiş Tarihi *
                        </label>
                        <input
                          type="date"
                          value={newProject.estimated_end_date}
                          onChange={(e) => setNewProject({ ...newProject, estimated_end_date: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Toplam Bütçe (₺)
                          </label>
                          <input
                            type="number"
                            value={newProject.total_budget}
                            onChange={(e) => setNewProject({ ...newProject, total_budget: Number(e.target.value) })}
                            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                            placeholder="0"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Harcanan Bütçe (₺)
                          </label>
                          <input
                            type="number"
                            value={newProject.spent_budget}
                            onChange={(e) => setNewProject({ ...newProject, spent_budget: Number(e.target.value) })}
                            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Notlar
                        </label>
                        <textarea
                          value={newProject.notes}
                          onChange={(e) => setNewProject({ ...newProject, notes: e.target.value })}
                          className="w-full px-3 py-2 h-32 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                          placeholder="Proje hakkında notlar..."
                        />
                      </div>
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
                      onClick={createProject}
                      className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
                    >
                      Proje Oluştur
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Project Details Modal */}
          {viewingProject && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-6xl w-full max-h-[90vh] overflow-hidden">
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-700/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                        <Target className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{viewingProject.name}</h3>
                        <p className="text-slate-400">{getProjectTypeLabel(viewingProject.project_type)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setViewingProject(null)}
                      className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="p-6 overflow-y-auto max-h-[70vh]">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Project Details - Left Column */}
                    <div className="lg:col-span-2 space-y-6">
                      {/* Project Info */}
                      <div className="bg-slate-700/30 rounded-xl p-6">
                        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          <FileText className="w-5 h-5 text-blue-400" />
                          Proje Bilgileri
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="text-slate-400 text-sm">Müşteri:</span>
                            <p className="text-white font-medium">{viewingProject.client?.name || '-'}</p>
                          </div>
                          <div>
                            <span className="text-slate-400 text-sm">Proje Yöneticisi:</span>
                            <p className="text-white font-medium">
                              {viewingProject.project_manager ?
                                `${viewingProject.project_manager.first_name} ${viewingProject.project_manager.last_name}` :
                                '-'
                              }
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-400 text-sm">Durum:</span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getStatusColor(viewingProject.status)}`}>
                              {getStatusText(viewingProject.status)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-sm">Başlangıç Tarihi:</span>
                            <p className="text-white font-medium">{formatDate(viewingProject.start_date)}</p>
                          </div>
                          <div>
                            <span className="text-slate-400 text-sm">Tahmini Bitiş:</span>
                            <p className={`font-medium ${isOverdue(viewingProject.estimated_end_date) ? 'text-red-400' : 'text-white'
                              }`}>
                              {formatDate(viewingProject.estimated_end_date)}
                              {isOverdue(viewingProject.estimated_end_date) && ' (Gecikmiş)'}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-400 text-sm">Gerçek Bitiş:</span>
                            <p className="text-white font-medium">{formatDate(viewingProject.end_date || '')}</p>
                          </div>
                        </div>

                        {viewingProject.description && (
                          <div className="mt-4">
                            <span className="text-slate-400 text-sm">Açıklama:</span>
                            <p className="text-white mt-1">{viewingProject.description}</p>
                          </div>
                        )}

                        {viewingProject.notes && (
                          <div className="mt-4">
                            <span className="text-slate-400 text-sm">Notlar:</span>
                            <p className="text-white mt-1">{viewingProject.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Budget Info */}
                      <div className="bg-slate-700/30 rounded-xl p-6">
                        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-green-400" />
                          Bütçe Bilgileri
                        </h4>

                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Toplam Bütçe:</span>
                            <span className="text-white font-bold text-lg">{formatCurrency(viewingProject.total_budget)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Harcanan:</span>
                            <span className="text-white font-bold text-lg">{formatCurrency(viewingProject.spent_budget)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Kalan:</span>
                            <span className="text-white font-bold text-lg">{formatCurrency(viewingProject.total_budget - viewingProject.spent_budget)}</span>
                          </div>

                          <div className="w-full bg-slate-700 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all duration-300 ${calculateProgress(viewingProject) > 90 ? 'bg-red-500' :
                                  calculateProgress(viewingProject) > 70 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                              style={{ width: `${Math.min(calculateProgress(viewingProject), 100)}%` }}
                            ></div>
                          </div>
                          <div className="text-center">
                            <span className="text-slate-400 text-sm">%{calculateProgress(viewingProject)} kullanıldı</span>
                          </div>
                        </div>
                      </div>

                      {/* Project Tasks */}
                      <div className="bg-slate-700/30 rounded-xl p-6">
                        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-purple-400" />
                          Proje Görevleri ({projectTasks.length})
                        </h4>

                        {projectTasks.length > 0 ? (
                          <div className="space-y-3 max-h-64 overflow-y-auto">
                            {projectTasks.map((task) => (
                              <div key={task.id} className="bg-slate-800/50 rounded-lg p-4 border border-slate-600/50">
                                <div className="flex items-start justify-between mb-2">
                                  <h5 className="font-medium text-white">{task.title}</h5>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getTaskStatusColor(task.status)}`}>
                                    {getTaskStatusText(task.status)}
                                  </span>
                                </div>

                                {task.description && (
                                  <p className="text-slate-400 text-sm mb-3">{task.description}</p>
                                )}

                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1">
                                      <User className="w-3 h-3 text-slate-400" />
                                      <span className="text-slate-300">
                                        {task.assignee ?
                                          `${task.assignee.first_name} ${task.assignee.last_name}` :
                                          'Atanmamış'
                                        }
                                      </span>
                                    </div>
                                    <div className={`flex items-center gap-1 ${getTaskPriorityColor(task.priority)}`}>
                                      <AlertCircle className="w-3 h-3" />
                                      <span>{getTaskPriorityText(task.priority)}</span>
                                    </div>
                                  </div>

                                  {task.due_date && (
                                    <div className="flex items-center gap-1 text-slate-400">
                                      <Clock className="w-3 h-3" />
                                      <span>{formatDate(task.due_date)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <CheckCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400">Bu projeye henüz görev atanmamış</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Project Stats - Right Column */}
                    <div className="space-y-6">
                      {/* Quick Stats */}
                      <div className="bg-slate-700/30 rounded-xl p-6">
                        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          <Users className="w-5 h-5 text-cyan-400" />
                          Proje İstatistikleri
                        </h4>

                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Toplam Görev:</span>
                            <span className="text-white font-bold">{projectTasks.length}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Tamamlanan:</span>
                            <span className="text-green-400 font-bold">
                              {projectTasks.filter(t => t.status === 'done').length}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Devam Eden:</span>
                            <span className="text-blue-400 font-bold">
                              {projectTasks.filter(t => t.status === 'in_progress').length}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">İncelemede:</span>
                            <span className="text-yellow-400 font-bold">
                              {projectTasks.filter(t => t.status === 'review').length}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Bekleyen:</span>
                            <span className="text-gray-400 font-bold">
                              {projectTasks.filter(t => t.status === 'todo').length}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Task Priority Distribution */}
                      <div className="bg-slate-700/30 rounded-xl p-6">
                        <h4 className="text-lg font-semibold text-white mb-4">Öncelik Dağılımı</h4>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-red-400">Acil:</span>
                            <span className="text-white font-bold">
                              {projectTasks.filter(t => t.priority === 'urgent').length}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-orange-400">Yüksek:</span>
                            <span className="text-white font-bold">
                              {projectTasks.filter(t => t.priority === 'high').length}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-yellow-400">Orta:</span>
                            <span className="text-white font-bold">
                              {projectTasks.filter(t => t.priority === 'medium').length}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-green-400">Düşük:</span>
                            <span className="text-white font-bold">
                              {projectTasks.filter(t => t.priority === 'low').length}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Project Timeline */}
                      <div className="bg-slate-700/30 rounded-xl p-6">
                        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-indigo-400" />
                          Zaman Çizelgesi
                        </h4>

                        <div className="space-y-3">
                          <div>
                            <span className="text-slate-400 text-sm">Oluşturulma:</span>
                            <p className="text-white">{formatDate(viewingProject.created_at)}</p>
                          </div>
                          <div>
                            <span className="text-slate-400 text-sm">Son Güncelleme:</span>
                            <p className="text-white">{formatDate(viewingProject.updated_at)}</p>
                          </div>
                          {viewingProject.start_date && viewingProject.estimated_end_date && (
                            <div>
                              <span className="text-slate-400 text-sm">Süre:</span>
                              <p className="text-white">
                                {Math.ceil((new Date(viewingProject.estimated_end_date).getTime() - new Date(viewingProject.start_date).getTime()) / (1000 * 60 * 60 * 24))} gün
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-slate-700/50">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => setViewingProject(null)}
                      className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                    >
                      Kapat
                    </button>
                    {userProfile && canManageProjects(userProfile.authority_level) && (
                      <button
                        onClick={() => {
                          setViewingProject(null);
                          setEditingProject(viewingProject);
                        }}
                        className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
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

          {/* Edit Project Modal */}
          {editingProject && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-4xl w-full max-h-[90vh] overflow-hidden">
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-700/50">
                  <h3 className="text-xl font-bold text-white">Proje Düzenle</h3>
                  <p className="text-slate-400 mt-1">Proje bilgilerini güncelleyin</p>
                </div>

                {/* Modal Content */}
                <div className="p-6 overflow-y-auto max-h-[70vh]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Proje Adı *
                        </label>
                        <input
                          type="text"
                          value={editingProject.name}
                          onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                          placeholder="Proje adını girin"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Açıklama
                        </label>
                        <textarea
                          value={editingProject.description || ''}
                          onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                          className="w-full px-3 py-2 h-20 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                          placeholder="Proje açıklaması"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Proje Tipi
                          </label>
                          <select
                            value={editingProject.project_type}
                            onChange={(e) => setEditingProject({ ...editingProject, project_type: e.target.value as any })}
                            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                          >
                            {projectTypes.map(type => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Durum
                          </label>
                          <select
                            value={editingProject.status}
                            onChange={(e) => setEditingProject({ ...editingProject, status: e.target.value as any })}
                            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                          >
                            {statusOptions.map(status => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Müşteri *
                        </label>
                        <select
                          value={editingProject.client_id}
                          onChange={(e) => setEditingProject({ ...editingProject, client_id: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                        >
                          <option value="">Müşteri seçin</option>
                          {companies.map(company => (
                            <option key={company.id} value={company.id}>
                              {company.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Proje Yöneticisi *
                        </label>
                        <select
                          value={editingProject.project_manager_id}
                          onChange={(e) => setEditingProject({ ...editingProject, project_manager_id: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                        >
                          <option value="">Yönetici seçin</option>
                          {users.map(user => (
                            <option key={user.id} value={user.id}>
                              {user.first_name} {user.last_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Başlangıç Tarihi *
                          </label>
                          <input
                            type="date"
                            value={editingProject.start_date}
                            onChange={(e) => setEditingProject({ ...editingProject, start_date: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Bitiş Tarihi
                          </label>
                          <input
                            type="date"
                            value={editingProject.end_date || ''}
                            onChange={(e) => setEditingProject({ ...editingProject, end_date: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Tahmini Bitiş Tarihi *
                        </label>
                        <input
                          type="date"
                          value={editingProject.estimated_end_date}
                          onChange={(e) => setEditingProject({ ...editingProject, estimated_end_date: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Toplam Bütçe (₺)
                          </label>
                          <input
                            type="number"
                            value={editingProject.total_budget}
                            onChange={(e) => setEditingProject({ ...editingProject, total_budget: Number(e.target.value) })}
                            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                            placeholder="0"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Harcanan Bütçe (₺)
                          </label>
                          <input
                            type="number"
                            value={editingProject.spent_budget}
                            onChange={(e) => setEditingProject({ ...editingProject, spent_budget: Number(e.target.value) })}
                            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Notlar
                        </label>
                        <textarea
                          value={editingProject.notes || ''}
                          onChange={(e) => setEditingProject({ ...editingProject, notes: e.target.value })}
                          className="w-full px-3 py-2 h-32 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                          placeholder="Proje hakkında notlar..."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-slate-700/50">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => setEditingProject(null)}
                      className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                    >
                      İptal
                    </button>
                    <button
                      onClick={updateProject}
                      className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
                    >
                      Güncelle
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
