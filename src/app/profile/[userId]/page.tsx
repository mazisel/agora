'use client';

import { useState, useEffect, use } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLoading } from '@/contexts/LoadingContext';
import { supabase } from '@/lib/supabase';
import MainLayout from '@/components/layout/MainLayout';
import { useRouter } from 'next/navigation';
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
  Shield,
  Award,
  TrendingUp,
  Target,
  ArrowLeft
} from 'lucide-react';
import { UserProfile } from '@/types';

interface ProfileStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
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

export default function UserProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const resolvedParams = use(params);
  const { user: currentUser, userProfile: currentUserProfile } = useAuth();
  const { withLoading } = useLoading();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (resolvedParams.userId) {
      fetchUserProfile();
    }
  }, [resolvedParams.userId]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);

      // Kullanıcı profilini getir
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select(`
          *,
          departments:department_id(name),
          positions:position_id(name)
        `)
        .eq('id', resolvedParams.userId)
        .eq('status', 'active')
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        router.push('/');
        return;
      }

      setUserProfile(profileData);

      // Paralel olarak diğer verileri yükle
      await Promise.all([
        fetchProfileStats(resolvedParams.userId),
        fetchRecentActivities(resolvedParams.userId),
        fetchTeamData(profileData)
      ]);

    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfileStats = async (userId: string) => {
    try {
      const [projectsResult, tasksResult] = await Promise.all([
        // Proje istatistikleri
        supabase
          .from('projects')
          .select('status, created_at')
          .or(`project_manager_id.eq.${userId},project_members.cs.{${userId}}`),

        // Görev istatistikleri
        supabase
          .from('tasks')
          .select('status, due_date, created_at, completed_at, priority')
          .or(`assigned_to.eq.${userId},created_by.eq.${userId},informed_person.eq.${userId}`)
      ]);

      const projects = projectsResult.data || [];
      const tasks = tasksResult.data || [];

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

      setStats({ ...projectStats, ...taskStats });
    } catch (error) {
      console.error('Error fetching profile stats:', error);
    }
  };

  const fetchRecentActivities = async (userId: string) => {
    try {
      const [projectsResult, tasksResult] = await Promise.all([
        supabase
          .from('projects')
          .select('id, name, status, updated_at, description')
          .or(`project_manager_id.eq.${userId},project_members.cs.{${userId}}`)
          .order('updated_at', { ascending: false })
          .limit(5),

        supabase
          .from('tasks')
          .select('id, title, status, updated_at, description')
          .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
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

  const fetchTeamData = async (profile: UserProfile) => {
    try {
      const [managerResult, colleaguesResult, subordinatesResult] = await Promise.all([
        // Yönetici bilgisi
        profile.manager_id ?
          supabase
            .from('user_profiles')
            .select(`
              id, first_name, last_name, position, authority_level, profile_photo_url, is_leader, manager_id,
              personnel_number, department_id, position_id,
              departments:department_id(name),
              positions:position_id(name)
            `)
            .eq('id', profile.manager_id)
            .eq('status', 'active')
            .single()
          : Promise.resolve({ data: null }),

        // Departman arkadaşları
        profile.department_id ?
          supabase
            .from('user_profiles')
            .select(`
              id, first_name, last_name, position, authority_level, profile_photo_url, is_leader, manager_id,
              personnel_number, department_id, position_id,
              departments:department_id(name),
              positions:position_id(name)
            `)
            .eq('department_id', profile.department_id)
            .eq('status', 'active')
            .neq('id', profile.id)
          : Promise.resolve({ data: [] }),

        // Alt çalışanlar
        supabase
          .from('user_profiles')
          .select(`
            id, first_name, last_name, position, authority_level, profile_photo_url, is_leader, manager_id,
            personnel_number, department_id, position_id,
            departments:department_id(name),
            positions:position_id(name)
          `)
          .eq('manager_id', profile.id)
          .eq('status', 'active')
      ]);

      const manager = managerResult.data;
      const colleagues = colleaguesResult.data || [];
      const subordinates = subordinatesResult.data || [];

      const filteredColleagues = colleagues.filter(c => c.id !== profile.manager_id);

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
    } catch (error) {
      console.error('Error fetching team data:', error);
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

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      </MainLayout>
    );
  }

  if (!userProfile) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-white mb-2">Kullanıcı Bulunamadı</h2>
            <p className="text-slate-400">Bu kullanıcı mevcut değil veya erişim izniniz yok.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {userProfile.first_name} {userProfile.last_name}
              </h1>
              <p className="text-slate-400 mt-1">Kullanıcı Profili</p>
            </div>
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
                {userProfile.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-300 text-sm">{userProfile.phone}</span>
                  </div>
                )}

                {userProfile.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                    <span className="text-slate-300 text-sm">{userProfile.address}</span>
                  </div>
                )}

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

            {/* Takım Bilgileri */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-400" />
                Takım Bilgileri
              </h3>

              <div className="relative flex flex-col items-center space-y-8">
                {/* Yönetici */}
                {teamData.manager && (
                  <div className="relative">
                    <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl p-4 backdrop-blur-sm">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {teamData.manager.profile_photo_url ? (
                            <img
                              src={teamData.manager.profile_photo_url}
                              alt={`${teamData.manager.first_name} ${teamData.manager.last_name}`}
                              className="w-12 h-12 aspect-square rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                              {teamData.manager.first_name?.charAt(0)}{teamData.manager.last_name?.charAt(0)}
                            </div>
                          )}
                          {teamData.manager.is_leader && (
                            <div className="absolute -top-1 -right-1">
                              <div className="w-5 h-5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                                <Shield className="w-2.5 h-2.5 text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h5 className="text-white font-semibold text-sm">
                            {teamData.manager.first_name} {teamData.manager.last_name}
                          </h5>
                          <p className="text-purple-300 text-xs">
                            {getAuthorityLevelText(teamData.manager.authority_level)}
                          </p>
                          <div className="mt-1 px-2 py-0.5 bg-purple-500/20 rounded text-purple-300 text-xs inline-block">
                            Yönetici
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Departman Arkadaşları */}
                {teamData.colleagues.length > 0 && (
                  <div className="relative w-full">
                    <div className="relative bg-slate-900/50 rounded-xl p-4">
                      <h4 className="text-slate-300 text-sm font-medium mb-3 text-center">
                        Takım Arkadaşları ({teamData.colleagues.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {teamData.colleagues.map((colleague) => (
                          <div key={colleague.id} className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-3 hover:border-slate-500/50 transition-colors cursor-pointer"
                            onClick={() => router.push(`/profile/${colleague.id}`)}>
                            <div className="flex items-center gap-2">
                              <div className="relative">
                                {colleague.profile_photo_url ? (
                                  <img
                                    src={colleague.profile_photo_url}
                                    alt={`${colleague.first_name} ${colleague.last_name}`}
                                    className="w-10 h-10 aspect-square rounded-lg object-cover"
                                  />
                                ) : (
                                  <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-slate-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                                    {colleague.first_name?.charAt(0)}{colleague.last_name?.charAt(0)}
                                  </div>
                                )}
                                {colleague.is_leader && (
                                  <div className="absolute -top-1 -right-1">
                                    <div className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                                      <Shield className="w-2 h-2 text-white" />
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h5 className="text-white font-semibold text-xs truncate">
                                  {colleague.first_name} {colleague.last_name}
                                </h5>
                                <p className="text-slate-300 text-xs">
                                  {getAuthorityLevelText(colleague.authority_level)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Alt Çalışanlar */}
                {teamData.subordinates.length > 0 && (
                  <div className="relative w-full">
                    <div className="relative bg-slate-900/50 rounded-xl p-4">
                      <h4 className="text-green-300 text-sm font-medium mb-3 text-center">
                        Ekibi ({teamData.subordinates.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {teamData.subordinates.map((subordinate) => (
                          <div key={subordinate.id} className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-3 hover:border-green-400/30 transition-colors cursor-pointer"
                            onClick={() => router.push(`/profile/${subordinate.id}`)}>
                            <div className="flex items-center gap-2">
                              <div className="relative">
                                {subordinate.profile_photo_url ? (
                                  <img
                                    src={subordinate.profile_photo_url}
                                    alt={`${subordinate.first_name} ${subordinate.last_name}`}
                                    className="w-8 h-8 aspect-square rounded object-cover"
                                  />
                                ) : (
                                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded flex items-center justify-center text-white font-bold text-xs">
                                    {subordinate.first_name?.charAt(0)}{subordinate.last_name?.charAt(0)}
                                  </div>
                                )}
                                {subordinate.is_leader && (
                                  <div className="absolute -top-0.5 -right-0.5">
                                    <div className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                                      <Shield className="w-1.5 h-1.5 text-white" />
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h5 className="text-white font-medium text-xs truncate">
                                  {subordinate.first_name} {subordinate.last_name}
                                </h5>
                                <p className="text-green-300 text-xs">
                                  {getAuthorityLevelText(subordinate.authority_level)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
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
