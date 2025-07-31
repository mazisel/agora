'use client';

import { useState, useEffect } from 'react';
import { FolderOpen, Plus, Calendar, Users, DollarSign, Building } from 'lucide-react';
import { Project } from '@/types';
import { supabase } from '@/lib/supabase';

const projectTypes = [
  { value: 'social_media', label: 'Sosyal Medya' },
  { value: 'software', label: 'Yazılım' },
  { value: 'hardware', label: 'Donanım' },
  { value: 'rnd', label: 'Ar-Ge' },
  { value: 'mobile_app', label: 'Mobil Uygulama' },
  { value: 'website', label: 'Web Sitesi' }
];

export default function ProjectCards() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

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
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'ongoing':
        return 'bg-green-500';
      case 'completed':
        return 'bg-blue-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: Project['status']) => {
    switch (status) {
      case 'ongoing':
        return 'Devam Ediyor';
      case 'completed':
        return 'Tamamlandı';
      case 'cancelled':
        return 'İptal Edildi';
      default:
        return 'Bilinmiyor';
    }
  };

  const getProjectTypeLabel = (type: Project['project_type']) => {
    return projectTypes.find(t => t.value === type)?.label || type;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
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
    const today = new Date();
    const endDate = new Date(estimatedEndDate);
    return today > endDate;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Aktif Projeler</h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">{projects.length} proje</span>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-all text-sm"
          >
            <Plus className="w-3 h-3" />
            Yeni
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          // Loading Skeleton
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <div className="animate-pulse">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-4 bg-slate-700 rounded w-32"></div>
                  <div className="h-6 bg-slate-700 rounded w-20"></div>
                </div>
                <div className="h-3 bg-slate-700 rounded w-full mb-4"></div>
                <div className="space-y-2">
                  <div className="h-2 bg-slate-700 rounded w-full"></div>
                  <div className="h-3 bg-slate-700 rounded w-24"></div>
                </div>
              </div>
            </div>
          ))
        ) : (
          projects.map((project) => (
            <div key={project.id} className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-medium text-white text-sm mb-1">{project.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{getProjectTypeLabel(project.project_type)}</span>
                    {project.client && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          <span>{project.client.name}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getStatusColor(project.status)}`}>
                  {getStatusText(project.status)}
                </span>
              </div>

              {project.description && (
                <p className="text-xs text-slate-300 mb-4 leading-relaxed line-clamp-2">
                  {project.description}
                </p>
              )}

              {/* Budget Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400">Bütçe Kullanımı</span>
                  <span className="text-xs text-slate-400">{calculateProgress(project)}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      calculateProgress(project) > 90 ? 'bg-red-500' : 
                      calculateProgress(project) > 70 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(calculateProgress(project), 100)}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-slate-500">
                    {formatCurrency(project.spent_budget)}
                  </span>
                  <span className="text-xs text-slate-500">
                    {formatCurrency(project.total_budget)}
                  </span>
                </div>
              </div>

              {/* Project Info */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <span className="text-xs text-slate-400 block">Başlangıç</span>
                  <span className="text-xs text-slate-300">{formatDate(project.start_date)}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Tahmini Bitiş</span>
                  <span className={`text-xs ${
                    isOverdue(project.estimated_end_date) ? 'text-red-400' : 'text-slate-300'
                  }`}>
                    {formatDate(project.estimated_end_date)}
                    {isOverdue(project.estimated_end_date) && ' (Gecikmiş)'}
                  </span>
                </div>
              </div>

              {/* Project Manager */}
              {project.project_manager && (
                <div className="flex items-center gap-2">
                  <Users className="w-3 h-3 text-slate-400" />
                  <span className="text-xs text-slate-400">Proje Yöneticisi:</span>
                  <span className="text-xs text-slate-300">
                    {project.project_manager.first_name} {project.project_manager.last_name}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {!isLoading && projects.length === 0 && (
        <div className="text-center py-8">
          <FolderOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500 mb-4">Aktif proje bulunmuyor</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm"
          >
            İlk Projeyi Oluştur
          </button>
        </div>
      )}

      {/* Create Project Modal Placeholder */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-white mb-4">Yeni Proje</h3>
            <p className="text-slate-400 mb-6">
              Proje yönetimi sayfası yakında eklenecek. Şimdilik projeler sadece görüntülenebilir.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
