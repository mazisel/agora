'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLoading } from '@/contexts/LoadingContext';
import { supabase } from '@/lib/supabase';
import MainLayout from '@/components/layout/MainLayout';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Users,
  FolderOpen,
  CheckCircle2,
  Clock,
  AlertCircle,
  Edit3,
  Save,
  X,
  Camera,
  Shield,
  Award,
  TrendingUp,
  Target
} from 'lucide-react';

interface ProfileStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  monthlyCompletedTasks?: number;
  totalBudget?: number;
  spentBudget?: number;
  urgentTasks?: number;
  thisMonthNotes?: number;
}

interface RecentActivity {
  id: string;
  type: 'project' | 'task';
  title: string;
  status: string;
  date: string;
  description?: string;
}

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  position?: string;
  authority_level: string;
  profile_photo_url?: string;
  is_leader: boolean;
  manager_id?: string;
}

interface TeamData {
  manager?: TeamMember;
  colleagues: TeamMember[];
  subordinates: TeamMember[];
}

export default function ProfilePage() {
  const { user, userProfile } = useAuth();
  const { withLoading } = useLoading();
  const [isEditing, setIsEditing] = useState(false);
  const [stats, setStats] = useState<ProfileStats>({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [teamData, setTeamData] = useState<TeamData>({
    colleagues: [],
    subordinates: []
  });
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    bio: ''
  });

  useEffect(() => {
    if (userProfile) {
      setEditForm({
        first_name: userProfile.first_name || '',
        last_name: userProfile.last_name || '',
        phone: userProfile.phone || '',
        address: userProfile.address || '',
        bio: userProfile.bio || ''
      });
      fetchProfileStats();
      fetchRecentActivities();
      fetchTeamData();
    }
  }, [userProfile]);

  const fetchProfileStats = async () => {
    if (!user || !userProfile) return;

    try {
      await withLoading(
        Promise.all([
          // Proje istatistikleri - daha detaylı
          supabase
            .from('projects')
            .select('status, total_budget, spent_budget, created_at')
            .or(`project_manager_id.eq.${user.id},project_members.cs.{${user.id}}`),

          // Görev istatistikleri - daha detaylı
          supabase
            .from('tasks')
            .select('status, due_date, created_at, completed_at, priority')
            .or(`assigned_to.eq.${user.id},created_by.eq.${user.id},informed_person.eq.${user.id}`),

          // Bu ayki görevler
          supabase
            .from('tasks')
            .select('status, completed_at')
            .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
            .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
            .lte('created_at', new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString()),

          // Günlük notlar
          supabase
            .from('daily_notes')
            .select('id, created_at')
            .eq('user_id', user.id)
            .gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
        ]).then(([projectsResult, tasksResult, monthlyTasksResult, notesResult]) => {
          const projects = projectsResult.data || [];
          const tasks = tasksResult.data || [];
          const monthlyTasks = monthlyTasksResult.data || [];
          const notes = notesResult.data || [];

          const projectStats = {
            totalProjects: projects.length,
            activeProjects: projects.filter(p => p.status === 'ongoing').length,
            completedProjects: projects.filter(p => p.status === 'completed').length
          };

          const now = new Date();
          const taskStats = {
            totalTasks: tasks.length,
            completedTasks: tasks.filter(t => t.status === 'done').length,
            pendingTasks: tasks.filter(t => ['todo', 'in_progress', 'review'].includes(t.status)).length,
            overdueTasks: tasks.filter(t =>
              t.due_date &&
              new Date(t.due_date) < now &&
              t.status !== 'done'
            ).length
          };

          // Ek istatistikler
          const monthlyCompletedTasks = monthlyTasks.filter(t => t.status === 'done').length;
          const totalBudget = projects.reduce((sum, p) => sum + (p.total_budget || 0), 0);
          const spentBudget = projects.reduce((sum, p) => sum + (p.spent_budget || 0), 0);
          const urgentTasks = tasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length;
          const thisMonthNotes = notes.length;

          setStats({
            ...projectStats,
            ...taskStats,
            monthlyCompletedTasks,
            totalBudget,
            spentBudget,
            urgentTasks,
            thisMonthNotes
          });
        }),
        'İstatistikler yükleniyor...'
      );
    } catch (error) {
      console.error('Error fetching profile stats:', error);
    }
  };

  const fetchRecentActivities = async () => {
    if (!user) return;

    try {
      const [projectsResult, tasksResult] = await Promise.all([
        supabase
          .from('projects')
          .select('id, name, status, updated_at, description')
          .or(`project_manager_id.eq.${user.id},project_members.cs.{${user.id}}`)
          .order('updated_at', { ascending: false })
          .limit(5),

        supabase
          .from('tasks')
          .select('id, title, status, updated_at, description')
          .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
          .order('updated_at', { ascending: false })
          .limit(5)
      ]);

      const activities: RecentActivity[] = [
        ...(projectsResult.data || []).map(p => ({
          id: p.id,
          type: 'project' as const,
          title: p.name,
          status: p.status,
          date: p.updated_at,
          description: p.description
        })),
        ...(tasksResult.data || []).map(t => ({
          id: t.id,
          type: 'task' as const,
          title: t.title,
          status: t.status,
          date: t.updated_at,
          description: t.description
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

      setRecentActivities(activities);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
    }
  };

  const fetchTeamData = async () => {
    if (!user || !userProfile) return;

    try {
      await withLoading(
        Promise.all([
          // Yönetici bilgisi (eğer varsa)
          userProfile.manager_id ?
            supabase
              .from('user_profiles')
              .select(`
                id, first_name, last_name, position, authority_level, profile_photo_url, is_leader, manager_id,
                personnel_number, department_id, position_id,
                departments:department_id(name),
                positions:position_id(name)
              `)
              .eq('id', userProfile.manager_id)
              .eq('status', 'active')
              .single()
            : Promise.resolve({ data: null }),

          // Departman arkadaşları (aynı departmanda olanlar, kendisi hariç)
          userProfile.department_id ?
            supabase
              .from('user_profiles')
              .select(`
                id, first_name, last_name, position, authority_level, profile_photo_url, is_leader, manager_id,
                personnel_number, department_id, position_id,
                departments:department_id(name),
                positions:position_id(name)
              `)
              .eq('department_id', userProfile.department_id)
              .eq('status', 'active')
              .neq('id', user.id)
            : Promise.resolve({ data: [] }),

          // Alt çalışanlar (kendisini yönetici olarak görenler)
          supabase
            .from('user_profiles')
            .select(`
              id, first_name, last_name, position, authority_level, profile_photo_url, is_leader, manager_id,
              personnel_number, department_id, position_id,
              departments:department_id(name),
              positions:position_id(name)
            `)
            .eq('manager_id', user.id)
            .eq('status', 'active')
        ]).then(([managerResult, colleaguesResult, subordinatesResult]) => {
          const manager = managerResult.data;
          const colleagues = colleaguesResult.data || [];
          const subordinates = subordinatesResult.data || [];

          // Arkadaşları yönetici ve diğerleri olarak ayır
          const filteredColleagues = colleagues.filter(c => c.id !== userProfile.manager_id);

          setTeamData({
            manager: manager ? {
              ...manager,
              is_leader: manager.is_leader || false
            } : undefined,
            colleagues: filteredColleagues.map(c => ({
              ...c,
              is_leader: c.is_leader || false
            })),
            subordinates: subordinates.map(s => ({
              ...s,
              is_leader: s.is_leader || false
            }))
          });
        }),
        'Takım bilgileri yükleniyor...'
      );
    } catch (error) {
      console.error('Error fetching team data:', error);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      await withLoading(
        (async () => {
          const { error } = await supabase
            .from('user_profiles')
            .update({
              first_name: editForm.first_name,
              last_name: editForm.last_name,
              phone: editForm.phone,
              address: editForm.address,
              bio: editForm.bio,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

          if (error) throw error;

          setIsEditing(false);
          // Refresh user profile
          window.location.reload();
        })(),
        'Profil güncelleniyor...'
      );
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const getStatusColor = (status: string, type: 'project' | 'task') => {
    if (type === 'project') {
      switch (status) {
        case 'ongoing': return 'bg-green-500/20 text-green-400 border-green-500/30';
        case 'completed': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
        default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      }
    } else {
      switch (status) {
        case 'todo': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
        case 'in_progress': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        case 'review': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        case 'done': return 'bg-green-500/20 text-green-400 border-green-500/30';
        case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
        default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      }
    }
  };

  const getStatusText = (status: string, type: 'project' | 'task') => {
    if (type === 'project') {
      switch (status) {
        case 'ongoing': return 'Devam Ediyor';
        case 'completed': return 'Tamamlandı';
        case 'cancelled': return 'İptal Edildi';
        default: return status;
      }
    } else {
      switch (status) {
        case 'todo': return 'Yeni';
        case 'in_progress': return 'Devam Ediyor';
        case 'review': return 'İnceleme';
        case 'done': return 'Tamamlandı';
        case 'cancelled': return 'İptal';
        default: return status;
      }
    }
  };

  const getAuthorityLevelText = (level: string) => {
    switch (level) {
      case 'admin': return 'Yönetici';
      case 'manager': return 'Müdür';
      case 'team_leader': return 'Takım Lideri';
      case 'employee': return 'Personel';
      default: return level;
    }
  };

  const getWorkTypeText = (type: string) => {
    switch (type) {
      case 'full_time': return 'Tam Zamanlı';
      case 'part_time': return 'Yarı Zamanlı';
      case 'contract': return 'Sözleşmeli';
      case 'intern': return 'Stajyer';
      default: return type;
    }
  };

  const getDepartmentName = (departmentId?: string) => {
    if (!departmentId) return '';
    // Bu fonksiyon departments state'inden departman adını alır
    // Şimdilik userProfile'dan alıyoruz
    return userProfile?.department || '';
  };

  const getPositionName = (positionId?: string) => {
    if (!positionId) return '';
    // Bu fonksiyon positions state'inden pozisyon adını alır
    // Şimdilik userProfile'dan alıyoruz
    return userProfile?.position || '';
  };

  if (!userProfile) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Profil</h1>
            <p className="text-slate-400 mt-1">Kişisel bilgileriniz ve aktivite özetiniz</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sol Kolon - Profil Bilgileri */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profil Kartı */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
              <div className="text-center">
                {/* Profil Fotoğrafı */}
                <div className="relative inline-block mb-4">
                  {userProfile.profile_photo_url ? (
                    <img
                      src={userProfile.profile_photo_url}
                      alt={`${userProfile.first_name} ${userProfile.last_name}`}
                      className="w-24 h-24 aspect-square rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center text-white font-bold text-2xl">
                      {userProfile.first_name?.charAt(0)}{userProfile.last_name?.charAt(0)}
                    </div>
                  )}
                </div>

                {/* İsim ve Pozisyon */}
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-white">
                    {userProfile.first_name} {userProfile.last_name}
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">
                    {getAuthorityLevelText(userProfile.authority_level)}
                  </p>
                </div>

                {/* Durum Rozetleri */}
                <div className="flex flex-wrap gap-2 justify-center mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${userProfile.status === 'active'
                      ? 'bg-green-500/20 text-green-400 border-green-500/30'
                      : 'bg-red-500/20 text-red-400 border-red-500/30'
                    }`}>
                    {userProfile.status === 'active' ? 'Aktif' : 'Pasif'}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {getWorkTypeText(userProfile.work_type)}
                  </span>
                  {userProfile.is_leader && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      <Shield className="w-3 h-3 inline mr-1" />
                      Lider
                    </span>
                  )}
                </div>

                {/* Biyografi */}
                {userProfile.bio && (
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {userProfile.bio}
                  </p>
                )}
              </div>
            </div>

            {/* İletişim Bilgileri */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-400" />
                İletişim Bilgileri
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300 text-sm">{user?.email}</span>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300 text-sm">
                    {userProfile.phone || 'Belirtilmemiş'}
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                  <span className="text-slate-300 text-sm">
                    {userProfile.address || 'Belirtilmemiş'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <Briefcase className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300 text-sm">
                    Personel No: {userProfile.personnel_number}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300 text-sm">
                    Katılım: {new Date(userProfile.created_at).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              </div>

            </div>

            {/* Son Aktiviteler */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-400" />
                Son Aktiviteler
              </h3>
              <div className="space-y-4">
                {recentActivities.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Henüz aktivite bulunmuyor</p>
                  </div>
                ) : (
                  recentActivities.slice(0, 5).map((activity) => (
                    <div key={`${activity.type}-${activity.id}`} className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-xl border border-slate-600/30 hover:border-slate-500/50 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activity.type === 'project' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                        }`}>
                        {activity.type === 'project' ? <FolderOpen className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-white font-medium text-sm truncate">{activity.title}</h4>
                          <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getStatusColor(activity.status, activity.type)}`}>
                            {getStatusText(activity.status, activity.type)}
                          </span>
                        </div>
                        <p className="text-slate-400 text-xs">
                          {activity.type === 'project' ? 'Proje' : 'Görev'} • {new Date(activity.date).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sağ Kolon - İstatistikler ve Takım */}
          <div className="lg:col-span-2 space-y-6">
            {/* İstatistik Kartları */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl border border-blue-500/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <FolderOpen className="w-6 h-6 text-blue-400" />
                  <span className="text-2xl font-bold text-white">{stats.totalProjects}</span>
                </div>
                <p className="text-blue-300 text-sm font-medium">Toplam Proje</p>
                <p className="text-blue-400/70 text-xs mt-1">
                  {stats.activeProjects} aktif, {stats.completedProjects} tamamlandı
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl border border-green-500/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                  <span className="text-2xl font-bold text-white">{stats.completedTasks}</span>
                </div>
                <p className="text-green-300 text-sm font-medium">Tamamlanan Görev</p>
                <p className="text-green-400/70 text-xs mt-1">
                  {stats.totalTasks} toplam görevden
                </p>
              </div>

              <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 rounded-xl border border-yellow-500/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-6 h-6 text-yellow-400" />
                  <span className="text-2xl font-bold text-white">{stats.pendingTasks}</span>
                </div>
                <p className="text-yellow-300 text-sm font-medium">Bekleyen Görev</p>
                <p className="text-yellow-400/70 text-xs mt-1">
                  Devam eden işler
                </p>
              </div>

              <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-xl border border-red-500/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                  <span className="text-2xl font-bold text-white">{stats.overdueTasks}</span>
                </div>
                <p className="text-red-300 text-sm font-medium">Geciken Görev</p>
                <p className="text-red-400/70 text-xs mt-1">
                  Acil müdahale gerekli
                </p>
              </div>
            </div>

            {/* Performans Özeti */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                Performans Özeti
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Target className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="text-white font-semibold mb-1">Görev Tamamlama</h4>
                  <p className="text-2xl font-bold text-blue-400 mb-1">
                    {stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%
                  </p>
                  <p className="text-slate-400 text-sm">Başarı oranı</p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Award className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="text-white font-semibold mb-1">Proje Başarısı</h4>
                  <p className="text-2xl font-bold text-green-400 mb-1">
                    {stats.totalProjects > 0 ? Math.round((stats.completedProjects / stats.totalProjects) * 100) : 0}%
                  </p>
                  <p className="text-slate-400 text-sm">Tamamlama oranı</p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="text-white font-semibold mb-1">Zamanında Teslimat</h4>
                  <p className="text-2xl font-bold text-yellow-400 mb-1">
                    {stats.totalTasks > 0 ? Math.round(((stats.totalTasks - stats.overdueTasks) / stats.totalTasks) * 100) : 0}%
                  </p>
                  <p className="text-slate-400 text-sm">Dakiklik oranı</p>
                </div>
              </div>
            </div>

            {/* Takımım */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-400" />
                Takımım
              </h3>

              <div className="space-y-6">
                {/* Yönetici */}
                {teamData.manager && (
                  <div className="space-y-3">
                    <h4 className="text-purple-300 text-sm font-medium flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Yöneticim
                    </h4>
                    <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl p-4 backdrop-blur-sm hover:border-purple-400/50 transition-all duration-300">
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          {teamData.manager.profile_photo_url && !teamData.manager.profile_photo_url.startsWith('blob:') ? (
                            <img
                              src={teamData.manager.profile_photo_url}
                              alt={`${teamData.manager.first_name} ${teamData.manager.last_name}`}
                              className="w-12 h-12 aspect-square rounded-lg object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm ${teamData.manager.profile_photo_url && !teamData.manager.profile_photo_url.startsWith('blob:') ? 'hidden' : ''}`}>
                            {teamData.manager.first_name?.charAt(0)}{teamData.manager.last_name?.charAt(0)}
                          </div>
                          {teamData.manager.is_leader && (
                            <div className="absolute -top-1 -right-1">
                              <div className="w-5 h-5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                                <Shield className="w-2.5 h-2.5 text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-white font-semibold text-sm">
                            {teamData.manager.first_name} {teamData.manager.last_name}
                          </h5>
                          <p className="text-purple-300 text-xs">
                            {getAuthorityLevelText(teamData.manager.authority_level)} • {(teamData.manager as any).personnel_number}
                          </p>
                          <p className="text-purple-200 text-xs">
                            {(teamData.manager as any).positions?.name || teamData.manager.position || 'Pozisyon belirtilmemiş'}
                          </p>
                          <div className="mt-1 px-2 py-0.5 bg-purple-500/20 rounded text-purple-300 text-xs inline-block">
                            Yönetici
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Takım Arkadaşları */}
                {teamData.colleagues.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-slate-300 text-sm font-medium flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Takım Arkadaşları ({teamData.colleagues.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
                      {teamData.colleagues.map((colleague) => (
                        <div key={colleague.id} className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-3 hover:border-slate-500/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="relative flex-shrink-0">
                              {colleague.profile_photo_url && !colleague.profile_photo_url.startsWith('blob:') ? (
                                <img
                                  src={colleague.profile_photo_url}
                                  alt={`${colleague.first_name} ${colleague.last_name}`}
                                  className="w-10 h-10 aspect-square rounded-lg object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <div className={`w-10 h-10 bg-gradient-to-br from-slate-500 to-slate-600 rounded-lg flex items-center justify-center text-white font-bold text-xs ${colleague.profile_photo_url && !colleague.profile_photo_url.startsWith('blob:') ? 'hidden' : ''}`}>
                                {colleague.first_name?.charAt(0)}{colleague.last_name?.charAt(0)}
                              </div>
                              {colleague.is_leader && (
                                <div className="absolute -top-1 -right-1">
                                  <div className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                                    <Shield className="w-2 h-2 text-white" />
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-white font-semibold text-sm truncate">
                                {colleague.first_name} {colleague.last_name}
                              </h5>
                              <p className="text-slate-300 text-xs">
                                {(colleague as any).personnel_number} • {getAuthorityLevelText(colleague.authority_level)}
                              </p>
                              <p className="text-slate-400 text-xs truncate">
                                {(colleague as any).positions?.name || colleague.position || 'Pozisyon belirtilmemiş'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ekibim */}
                {teamData.subordinates.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-green-300 text-sm font-medium flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Ekibim ({teamData.subordinates.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
                      {teamData.subordinates.map((subordinate) => (
                        <div key={subordinate.id} className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-3 hover:border-green-400/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="relative flex-shrink-0">
                              {subordinate.profile_photo_url && !subordinate.profile_photo_url.startsWith('blob:') ? (
                                <img
                                  src={subordinate.profile_photo_url}
                                  alt={`${subordinate.first_name} ${subordinate.last_name}`}
                                  className="w-10 h-10 aspect-square rounded-lg object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <div className={`w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-xs ${subordinate.profile_photo_url && !subordinate.profile_photo_url.startsWith('blob:') ? 'hidden' : ''}`}>
                                {subordinate.first_name?.charAt(0)}{subordinate.last_name?.charAt(0)}
                              </div>
                              {subordinate.is_leader && (
                                <div className="absolute -top-1 -right-1">
                                  <div className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                                    <Shield className="w-2 h-2 text-white" />
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-white font-semibold text-sm truncate">
                                {subordinate.first_name} {subordinate.last_name}
                              </h5>
                              <p className="text-green-300 text-xs">
                                {(subordinate as any).personnel_number} • {getAuthorityLevelText(subordinate.authority_level)}
                              </p>
                              <p className="text-green-200 text-xs truncate">
                                {(subordinate as any).positions?.name || subordinate.position || 'Pozisyon belirtilmemiş'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Takım Bulunamadı */}
                {!teamData.manager && teamData.colleagues.length === 0 && teamData.subordinates.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-slate-700/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Users className="w-8 h-8 text-slate-500" />
                    </div>
                    <h4 className="text-white font-semibold mb-1">Takım bilgisi bulunamadı</h4>
                    <p className="text-slate-400 text-sm">
                      Departman veya yönetici ataması yapılmamış olabilir
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
