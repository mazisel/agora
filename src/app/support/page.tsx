'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, MessageCircle, Clock, CheckCircle, AlertCircle, User, FileText, Inbox, Calendar, DollarSign, Lightbulb, Check, X, Search, Filter, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface SupportCategory {
  id: string;
  name: string;
  description: string;
}

interface SupportTicket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category_name: string;
  assigned_to_name?: string;
  assigned_to_email?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

const statusColors = {
  open: 'bg-blue-600/20 text-blue-400',
  in_progress: 'bg-yellow-600/20 text-yellow-400',
  resolved: 'bg-green-600/20 text-green-400',
  closed: 'bg-gray-600/20 text-gray-400'
};

const statusLabels = {
  open: 'Açık',
  in_progress: 'İşlemde',
  resolved: 'Çözüldü',
  closed: 'Kapatıldı'
};

const priorityColors = {
  low: 'bg-gray-600/20 text-gray-400',
  medium: 'bg-blue-600/20 text-blue-400',
  high: 'bg-orange-600/20 text-orange-400',
  urgent: 'bg-red-600/20 text-red-400'
};

const priorityLabels = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
  urgent: 'Acil'
};

export default function SupportPage() {
  const { user, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'my-tickets' | 'all-tickets'>('my-tickets');
  const [categories, setCategories] = useState<SupportCategory[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [advanceRequests, setAdvanceRequests] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [allLeaveRequests, setAllLeaveRequests] = useState<any[]>([]);
  const [allAdvanceRequests, setAllAdvanceRequests] = useState<any[]>([]);
  const [allSuggestions, setAllSuggestions] = useState<any[]>([]);
  const [assignedTickets, setAssignedTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Atama yetkileri
  const [hasAdvanceAssignments, setHasAdvanceAssignments] = useState(false);
  const [hasSuggestionAssignments, setHasSuggestionAssignments] = useState(false);
  const [isSupportAgent, setIsSupportAgent] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRequestTypeModal, setShowRequestTypeModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [selectedRequestType, setSelectedRequestType] = useState<string>('');

  // Arama ve filtreleme state'leri
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    support: true,
    leave: true,
    advance: true,
    suggestion: true,
    'admin-leave': true,
    'admin-advance': true,
    'admin-suggestion': true
  });

  // Form state
  const [ticketForm, setTicketForm] = useState({
    title: '',
    description: '',
    category_id: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent'
  });

  // İzin talebi form state
  const [leaveForm, setLeaveForm] = useState({
    leave_type: 'annual' as 'annual' | 'sick' | 'personal' | 'maternity' | 'other',
    start_date: '',
    end_date: '',
    reason: '',
    emergency_contact: ''
  });

  // Avans talebi form state
  const [advanceForm, setAdvanceForm] = useState({
    amount: '',
    currency: 'TRY' as 'TRY' | 'USD' | 'EUR',
    reason: '',
    repayment_plan: 'salary' as 'salary' | 'installment',
    installment_count: '1'
  });

  // Öneri/Şikayet form state
  const [suggestionForm, setSuggestionForm] = useState({
    type: 'suggestion' as 'suggestion' | 'complaint',
    subject: '',
    description: '',
    department: '',
    anonymous: false
  });

  // Debounce için ref
  const loadDataTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filtreleme fonksiyonları
  const filterRequests = (requests: any[], type: string) => {
    return requests.filter(request => {
      const matchesSearch = searchTerm === '' || 
        request.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.user_profiles?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.user_profiles?.last_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      const matchesType = typeFilter === 'all' || typeFilter === type;

      return matchesSearch && matchesStatus && matchesType;
    });
  };

  // Sayfalama fonksiyonu
  const paginateData = (data: any[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  // Toplam sayfa sayısını hesaplama
  const getTotalPages = (dataLength: number) => {
    return Math.ceil(dataLength / itemsPerPage);
  };

  // Bölüm genişletme/daraltma
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Filtreleri sıfırlama
  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
    setCurrentPage(1);
  };

  useEffect(() => {
    if (userProfile) {
      loadData();
    }
  }, [userProfile]);

  // Force re-render when isSupportAgent changes
  useEffect(() => {
    console.log('🔄 isSupportAgent state changed:', isSupportAgent);
  }, [isSupportAgent]);

  // Compute if user can see all tickets tab
  const canSeeAllTicketsTab = userProfile && (
    userProfile.authority_level === 'admin' || 
    userProfile.authority_level === 'team_lead' || 
    userProfile.authority_level === 'manager' || 
    userProfile.authority_level === 'director' || 
    isSupportAgent
  );

  console.log('🎯 Can see all tickets tab:', {
    userProfile: !!userProfile,
    authority_level: userProfile?.authority_level,
    isSupportAgent: isSupportAgent,
    canSeeAllTicketsTab: canSeeAllTicketsTab
  });

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      const authHeaders: HeadersInit = session?.access_token ? {
        'Authorization': `Bearer ${session.access_token}`
      } : {};
      
      // Check if user is manager
      let isManager = false;
      if (userProfile) {
        console.log('🔍 User Profile Debug:', {
          user_id: userProfile.id,
          authority_level: userProfile.authority_level,
          first_name: userProfile.first_name,
          last_name: userProfile.last_name
        });
        
        isManager = userProfile.authority_level === 'admin' || 
                   userProfile.authority_level === 'team_lead' || 
                   userProfile.authority_level === 'manager' || 
                   userProfile.authority_level === 'director';
        
        console.log('👑 Is Manager Check:', isManager);
      } else {
        console.log('❌ No user profile found');
      }
      
      // Temel API çağrıları - sıralı olarak yap
      try {
        // Önce kategorileri yükle
        const categoriesRes = await fetch('/api/support/categories', { headers: authHeaders });
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(categoriesData);
        }

        // Sonra destek taleplerini yükle
        const ticketsRes = await fetch('/api/support/tickets', { headers: authHeaders });
        if (ticketsRes.ok) {
          const ticketsData = await ticketsRes.json();
          setTickets(ticketsData);
        }

        // İzin taleplerini yükle
        const leaveRes = await fetch('/api/leave-requests/', { headers: authHeaders });
        if (leaveRes.ok) {
          const leaveData = await leaveRes.json();
          setLeaveRequests(leaveData);
        }

        // Avans taleplerini yükle
        const advanceRes = await fetch('/api/advance-requests/', { headers: authHeaders });
        if (advanceRes.ok) {
          const advanceData = await advanceRes.json();
          setAdvanceRequests(advanceData);
        }

        // Öneri/şikayetleri yükle
        const suggestionsRes = await fetch('/api/suggestions/', { headers: authHeaders });
        if (suggestionsRes.ok) {
          const suggestionsData = await suggestionsRes.json();
          setSuggestions(suggestionsData);
        }

        // Destek kişisi kontrolü - support_agents tablosuna bak, ticket sayısına değil
        try {
          console.log('🔍 Support agent kontrolü başlıyor...');
          
          // Önce support_agents tablosundan kontrol et
          const supportAgentResponse = await fetch('/api/admin/suggestion-assignments', { headers: authHeaders });
          console.log('📡 Support agent response status:', supportAgentResponse.status);
          
          if (supportAgentResponse.ok) {
            const supportAgentData = await supportAgentResponse.json();
            console.log('📊 Support agent data:', supportAgentData);
            const isAgent = supportAgentData.hasAssignments;
            setIsSupportAgent(isAgent);
            console.log('👤 Is Support Agent:', isAgent);
            
            // Eğer support agent ise, assigned tickets'ı da getir
            if (isAgent) {
              const assignedTicketsResponse = await fetch('/api/support/tickets?type=assigned', { headers: authHeaders });
              if (assignedTicketsResponse.ok) {
                const assignedTicketsData = await assignedTicketsResponse.json();
                setAssignedTickets(assignedTicketsData);
                console.log('📋 Assigned tickets:', assignedTicketsData.length);
              }
            }
          } else {
            console.log('❌ Support agent response not ok');
            setIsSupportAgent(false);
          }
        } catch (error) {
          console.error('💥 Destek kişisi kontrolü hatası:', error);
          setIsSupportAgent(false);
        }

        // Manager için ek veriler
        if (isManager) {
          try {
            const [advanceAssignRes, suggestionAssignRes, allLeaveRes] = await Promise.all([
              fetch('/api/admin/advance-request-assignments', { headers: authHeaders }),
              fetch('/api/admin/suggestion-assignments', { headers: authHeaders }),
              fetch('/api/leave-requests/?type=all', { headers: authHeaders })
            ]);

            // İzin talepleri
            if (allLeaveRes.ok) {
              const allLeaveData = await allLeaveRes.json();
              setAllLeaveRequests(allLeaveData);
            }

            // Avans yetkisi kontrolü
            if (advanceAssignRes.ok) {
              const advanceAssignmentData = await advanceAssignRes.json();
              setHasAdvanceAssignments(advanceAssignmentData.hasAssignments);
              
              if (advanceAssignmentData.hasAssignments) {
                const allAdvanceResponse = await fetch('/api/advance-requests/?type=all', { headers: authHeaders });
                if (allAdvanceResponse.ok) {
                  const allAdvanceData = await allAdvanceResponse.json();
                  setAllAdvanceRequests(allAdvanceData);
                }
              }
            } else {
              setHasAdvanceAssignments(false);
            }

            // Öneri/şikayet yetkisi kontrolü
            if (suggestionAssignRes.ok) {
              const suggestionAssignmentData = await suggestionAssignRes.json();
              setHasSuggestionAssignments(suggestionAssignmentData.hasAssignments);
              
              if (suggestionAssignmentData.hasAssignments) {
                const allSuggestionsResponse = await fetch('/api/suggestions/?type=all', { headers: authHeaders });
                if (allSuggestionsResponse.ok) {
                  const allSuggestionsData = await allSuggestionsResponse.json();
                  setAllSuggestions(allSuggestionsData);
                }
              }
            } else {
              setHasSuggestionAssignments(false);
            }
          } catch (error) {
            console.error('Manager verileri yüklenirken hata:', error);
            setHasAdvanceAssignments(false);
            setHasSuggestionAssignments(false);
          }
        }

        // Support agent için öneri/şikayet yetkisi kontrolü (manager olmasa bile)
        if (isSupportAgent && !isManager) {
          try {
            console.log('🔍 Support agent için öneri/şikayet yetkisi kontrol ediliyor...');
            const suggestionAssignRes = await fetch('/api/admin/suggestion-assignments', { headers: authHeaders });
            
            if (suggestionAssignRes.ok) {
              const suggestionAssignmentData = await suggestionAssignRes.json();
              console.log('📊 Support agent suggestion assignment data:', suggestionAssignmentData);
              setHasSuggestionAssignments(suggestionAssignmentData.hasAssignments);
              
              if (suggestionAssignmentData.hasAssignments) {
                const allSuggestionsResponse = await fetch('/api/suggestions/?type=all', { headers: authHeaders });
                if (allSuggestionsResponse.ok) {
                  const allSuggestionsData = await allSuggestionsResponse.json();
                  setAllSuggestions(allSuggestionsData);
                  console.log('📋 Support agent suggestions loaded:', allSuggestionsData.length);
                }
              }
            } else {
              console.log('❌ Support agent suggestion assignment response not ok');
              setHasSuggestionAssignments(false);
            }
          } catch (error) {
            console.error('💥 Support agent suggestion assignment error:', error);
            setHasSuggestionAssignments(false);
          }
        }
      } catch (apiError) {
        console.error('API çağrısı hatası:', apiError);
      }
    } catch (error) {
      console.error('Veri yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders: HeadersInit = session?.access_token ? {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      } : {
        'Content-Type': 'application/json',
      };

      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(ticketForm),
      });

      if (response.ok) {
        await loadData();
        setShowCreateModal(false);
        setTicketForm({
          title: '',
          description: '',
          category_id: '',
          priority: 'medium'
        });
      } else {
        const error = await response.json();
        alert(error.error || 'Destek talebi oluşturulamadı');
      }
    } catch (error) {
      console.error('Destek talebi oluşturulurken hata:', error);
      alert('Bir hata oluştu');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Destek</h1>
          <p className="text-slate-400">Destek taleplerini yönetin ve yeni talep oluşturun</p>
        </div>
        <button
          onClick={() => setShowRequestTypeModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Yeni Talep
        </button>
      </div>

      {/* Arama ve Filtre Bölümü */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Arama */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Taleplerde ara..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              />
            </div>
          </div>

          {/* Filtre Butonu */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filtreler
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Filtreleri Sıfırla */}
          {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all') && (
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition-colors text-sm"
            >
              Sıfırla
            </button>
          )}
        </div>

        {/* Genişletilmiş Filtreler */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Durum</label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="all">Tüm Durumlar</option>
                  <option value="pending">Beklemede</option>
                  <option value="open">Açık</option>
                  <option value="in_progress">İşlemde</option>
                  <option value="approved">Onaylandı</option>
                  <option value="resolved">Çözüldü</option>
                  <option value="rejected">Reddedildi</option>
                  <option value="closed">Kapatıldı</option>
                  <option value="reviewed">İncelendi</option>
                  <option value="implemented">Uygulandı</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Talep Türü</label>
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="all">Tüm Türler</option>
                  <option value="support">Destek</option>
                  <option value="leave">İzin</option>
                  <option value="advance">Avans</option>
                  <option value="suggestion">Öneri/Şikayet</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Sayfa Başına</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    // itemsPerPage state'ini güncellemek için yeni bir state eklemek gerekir
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="5">5 Talep</option>
                  <option value="10">10 Talep</option>
                  <option value="20">20 Talep</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'my-tickets' && (
        <div className="space-y-6">
          {/* Kompakt Talep Listesi */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50">
            {/* Header */}
            <div className="p-4 border-b border-slate-700/50">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Inbox className="w-5 h-5 text-blue-400" />
                Tüm Taleplerim
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Toplam {(() => {
                  const allRequests = [...tickets, ...leaveRequests, ...advanceRequests, ...suggestions];
                  return allRequests.filter(item => {
                    const matchesSearch = searchTerm === '' || 
                      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      item.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      item.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      item.description?.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
                    const itemType = item.leave_type ? 'leave' : 
                                   item.amount ? 'advance' : 
                                   item.type === 'suggestion' || item.type === 'complaint' ? 'suggestion' : 'support';
                    const matchesType = typeFilter === 'all' || typeFilter === itemType;
                    return matchesSearch && matchesStatus && matchesType;
                  }).length;
                })()} talep
              </p>
            </div>

            {/* Talep Listesi */}
            <div className="divide-y divide-slate-700/50">
              {(() => {
                // Tüm talepleri birleştir ve sırala
                const allRequests = [
                  ...tickets.map(t => ({ ...t, requestType: 'support', icon: MessageCircle, color: 'blue' })),
                  ...leaveRequests.map(l => ({ ...l, requestType: 'leave', icon: Calendar, color: 'green' })),
                  ...advanceRequests.map(a => ({ ...a, requestType: 'advance', icon: DollarSign, color: 'yellow' })),
                  ...suggestions.map(s => ({ ...s, requestType: 'suggestion', icon: Lightbulb, color: 'purple' }))
                ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                // Filtreleme uygula
                const filteredRequests = allRequests.filter(item => {
                  const matchesSearch = searchTerm === '' || 
                    item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.description?.toLowerCase().includes(searchTerm.toLowerCase());
                  const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
                  const matchesType = typeFilter === 'all' || typeFilter === item.requestType;
                  return matchesSearch && matchesStatus && matchesType;
                });

                // Sayfalama uygula
                const paginatedRequests = paginateData(filteredRequests);

                if (filteredRequests.length === 0) {
                  return (
                    <div className="p-8 text-center">
                      <Inbox className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                      <h3 className="text-lg font-medium text-white mb-2">
                        {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' 
                          ? 'Filtreye uygun talep bulunamadı' 
                          : 'Henüz hiç talebiniz yok'
                        }
                      </h3>
                      <p className="text-slate-400 mb-4">
                        {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                          ? 'Farklı filtreler deneyebilir veya yeni talep oluşturabilirsiniz.'
                          : 'İlk talebinizi oluşturmak için yukarıdaki butonu kullanın.'
                        }
                      </p>
                      <button
                        onClick={() => setShowRequestTypeModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2 mx-auto"
                      >
                        <Plus className="w-4 h-4" />
                        Yeni Talep Oluştur
                      </button>
                    </div>
                  );
                }

                return (
                  <>
                    {paginatedRequests.map((request) => {
                      const IconComponent = request.icon;
                      
                      // Talep türüne göre başlık ve açıklama
                      let title = '';
                      let description = '';
                      let typeLabel = '';
                      let typeColor = '';

                      if (request.requestType === 'support') {
                        title = request.title;
                        description = request.description;
                        typeLabel = 'Destek';
                        typeColor = 'bg-blue-600/20 text-blue-400';
                      } else if (request.requestType === 'leave') {
                        title = request.leave_type === 'annual' ? 'Yıllık İzin' :
                               request.leave_type === 'sick' ? 'Hastalık İzni' :
                               request.leave_type === 'personal' ? 'Kişisel İzin' :
                               request.leave_type === 'maternity' ? 'Doğum İzni' : 'Diğer İzin';
                        description = `${new Date(request.start_date).toLocaleDateString('tr-TR')} - ${new Date(request.end_date).toLocaleDateString('tr-TR')}${request.total_days ? ` (${request.total_days} gün)` : ''}`;
                        typeLabel = 'İzin';
                        typeColor = 'bg-green-600/20 text-green-400';
                      } else if (request.requestType === 'advance') {
                        title = `${request.amount} ${request.currency} Avans Talebi`;
                        description = request.reason;
                        typeLabel = 'Avans';
                        typeColor = 'bg-yellow-600/20 text-yellow-400';
                      } else if (request.requestType === 'suggestion') {
                        title = request.subject;
                        description = request.description;
                        typeLabel = request.type === 'suggestion' ? 'Öneri' : 'Şikayet';
                        typeColor = request.type === 'suggestion' ? 'bg-purple-600/20 text-purple-400' : 'bg-orange-600/20 text-orange-400';
                      }

                      return (
                        <div key={`${request.requestType}-${request.id}`} className="p-3 hover:bg-slate-700/20 transition-colors">
                          <div className="flex items-center gap-3">
                            {/* Icon */}
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-${request.color}-600/20`}>
                              <IconComponent className={`w-4 h-4 text-${request.color}-400`} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-sm font-medium text-white truncate">{title}</h3>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${typeColor}`}>
                                  {typeLabel}
                                </span>
                              </div>
                              <p className="text-xs text-slate-300 line-clamp-1 mb-1">{description}</p>
                              <div className="flex items-center gap-3 text-xs text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(request.created_at).toLocaleDateString('tr-TR')}
                                </span>
                                {request.requestType === 'support' && request.category_name && (
                                  <span className="flex items-center gap-1">
                                    <FileText className="w-3 h-3" />
                                    {request.category_name}
                                  </span>
                                )}
                                {request.requestType === 'advance' && (
                                  <span>
                                    {request.repayment_plan === 'salary' ? 'Maaştan Kesinti' : `${request.installment_count} Taksit`}
                                  </span>
                                )}
                                {request.requestType === 'suggestion' && request.department && (
                                  <span>{request.department}</span>
                                )}
                              </div>
                            </div>

                            {/* Status */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                request.status === 'pending' ? 'bg-yellow-600/20 text-yellow-400' :
                                request.status === 'open' ? 'bg-blue-600/20 text-blue-400' :
                                request.status === 'in_progress' ? 'bg-blue-600/20 text-blue-400' :
                                request.status === 'approved' ? 'bg-green-600/20 text-green-400' :
                                request.status === 'resolved' ? 'bg-green-600/20 text-green-400' :
                                request.status === 'reviewed' ? 'bg-blue-600/20 text-blue-400' :
                                request.status === 'implemented' ? 'bg-green-600/20 text-green-400' :
                                request.status === 'rejected' ? 'bg-red-600/20 text-red-400' :
                                request.status === 'closed' ? 'bg-gray-600/20 text-gray-400' :
                                'bg-gray-600/20 text-gray-400'
                              }`}>
                                {request.status === 'pending' ? 'Beklemede' :
                                 request.status === 'open' ? 'Açık' :
                                 request.status === 'in_progress' ? 'İşlemde' :
                                 request.status === 'approved' ? 'Onaylandı' :
                                 request.status === 'resolved' ? 'Çözüldü' :
                                 request.status === 'reviewed' ? 'İncelendi' :
                                 request.status === 'implemented' ? 'Uygulandı' :
                                 request.status === 'rejected' ? 'Reddedildi' :
                                 request.status === 'closed' ? 'Kapatıldı' : request.status}
                              </span>
                              {request.requestType === 'support' && (
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  request.priority === 'low' ? 'bg-gray-600/20 text-gray-400' :
                                  request.priority === 'medium' ? 'bg-blue-600/20 text-blue-400' :
                                  request.priority === 'high' ? 'bg-orange-600/20 text-orange-400' :
                                  'bg-red-600/20 text-red-400'
                                }`}>
                                  {request.priority === 'low' ? 'Düşük' :
                                   request.priority === 'medium' ? 'Orta' :
                                   request.priority === 'high' ? 'Yüksek' : 'Acil'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Sayfalama */}
                    {getTotalPages(filteredRequests.length) > 1 && (
                      <div className="p-4 border-t border-slate-700/50 flex items-center justify-between">
                        <p className="text-sm text-slate-400">
                          {filteredRequests.length} talepten {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredRequests.length)} arası gösteriliyor
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 bg-slate-700/50 border border-slate-600 rounded text-sm text-slate-300 hover:bg-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Önceki
                          </button>
                          <span className="px-3 py-1 text-sm text-slate-300">
                            {currentPage} / {getTotalPages(filteredRequests.length)}
                          </span>
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, getTotalPages(filteredRequests.length)))}
                            disabled={currentPage === getTotalPages(filteredRequests.length)}
                            className="px-3 py-1 bg-slate-700/50 border border-slate-600 rounded text-sm text-slate-300 hover:bg-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Sonraki
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Arama ve Filtre Bölümü - Admin/Manager Görünümü */}
      {activeTab === 'all-tickets' && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Arama */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tüm taleplerde ara..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                />
              </div>
            </div>

            {/* Filtre Butonu */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filtreler
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {/* Filtreleri Sıfırla */}
            {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all') && (
              <button
                onClick={resetFilters}
                className="px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition-colors text-sm"
              >
                Sıfırla
              </button>
            )}
          </div>

          {/* Genişletilmiş Filtreler */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Durum</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="all">Tüm Durumlar</option>
                    <option value="pending">Beklemede</option>
                    <option value="open">Açık</option>
                    <option value="in_progress">İşlemde</option>
                    <option value="approved">Onaylandı</option>
                    <option value="resolved">Çözüldü</option>
                    <option value="rejected">Reddedildi</option>
                    <option value="closed">Kapatıldı</option>
                    <option value="reviewed">İncelendi</option>
                    <option value="implemented">Uygulandı</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Talep Türü</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => {
                      setTypeFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="all">Tüm Türler</option>
                    <option value="leave">İzin</option>
                    <option value="advance">Avans</option>
                    <option value="suggestion">Öneri/Şikayet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Sayfa Başına</label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setCurrentPage(1);
                    }}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="5">5 Talep</option>
                    <option value="10">10 Talep</option>
                    <option value="20">20 Talep</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'all-tickets' && (
        <div className="space-y-4">
          {/* İzin Talepleri Yönetimi - Sadece admin veya manager'lar görebilir */}
          {(typeFilter === 'all' || typeFilter === 'leave') && userProfile && (userProfile.authority_level === 'admin' || userProfile.authority_level === 'team_lead' || userProfile.authority_level === 'manager' || userProfile.authority_level === 'director') && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div className="p-4 border-b border-slate-700/50">
                <button
                  onClick={() => toggleSection('admin-leave')}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-green-400" />
                    İzin Talepleri Yönetimi ({filterRequests(allLeaveRequests, 'leave').length})
                  </h2>
                  {expandedSections['admin-leave'] ? 
                    <EyeOff className="w-4 h-4 text-slate-400" /> : 
                    <Eye className="w-4 h-4 text-slate-400" />
                  }
                </button>
              </div>
              
              {expandedSections['admin-leave'] && (
                <>
                  {filterRequests(allLeaveRequests, 'leave').length === 0 ? (
                    <div className="p-6 text-center">
                      <Calendar className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">
                        {searchTerm || statusFilter !== 'all' ? 'Filtreye uygun izin talebi bulunamadı' : 'İzin talebi yok'}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="divide-y divide-slate-700/50">
                        {paginateData(filterRequests(allLeaveRequests, 'leave')).map((request) => (
                          <div key={request.id} className="p-4 hover:bg-slate-700/20 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-base font-medium text-white mb-1">
                                  {request.user_profiles?.first_name} {request.user_profiles?.last_name} - {
                                    request.leave_type === 'annual' ? 'Yıllık İzin' :
                                    request.leave_type === 'sick' ? 'Hastalık İzni' :
                                    request.leave_type === 'personal' ? 'Kişisel İzin' :
                                    request.leave_type === 'maternity' ? 'Doğum İzni' : 'Diğer İzin'
                                  }
                                </h3>
                                <p className="text-slate-300 text-sm mb-2">
                                  {new Date(request.start_date).toLocaleDateString('tr-TR')} - {new Date(request.end_date).toLocaleDateString('tr-TR')}
                                  {request.total_days && ` (${request.total_days} gün)`}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-slate-400">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(request.created_at).toLocaleDateString('tr-TR')}
                                  </span>
                                  {request.reason && (
                                    <span className="truncate">Sebep: {request.reason}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 ml-3">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  request.status === 'pending' ? 'bg-yellow-600/20 text-yellow-400' :
                                  request.status === 'approved' ? 'bg-green-600/20 text-green-400' :
                                  'bg-red-600/20 text-red-400'
                                }`}>
                                  {request.status === 'pending' ? 'Beklemede' :
                                   request.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}
                                </span>
                                {request.status === 'pending' && (
                                  <div className="flex gap-1">
                                    <button 
                                      onClick={async () => {
                                        try {
                                          const { data: { session } } = await supabase.auth.getSession();
                                          const response = await fetch('/api/leave-requests/', {
                                            method: 'PUT',
                                            headers: {
                                              'Content-Type': 'application/json',
                                              'Authorization': `Bearer ${session?.access_token}`
                                            },
                                            body: JSON.stringify({
                                              leave_request_id: request.id,
                                              status: 'approved'
                                            })
                                          });

                                          if (response.ok) {
                                            alert('İzin talebi onaylandı!');
                                            loadData();
                                          } else {
                                            const error = await response.json();
                                            alert(error.error || 'Onaylama işlemi başarısız');
                                          }
                                        } catch (error) {
                                          console.error('Approval error:', error);
                                          alert('Bir hata oluştu');
                                        }
                                      }}
                                      className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded hover:bg-green-500/30 transition-all text-xs"
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>
                                    <button 
                                      onClick={async () => {
                                        const reason = prompt('Red sebebini girin (opsiyonel):');
                                        try {
                                          const { data: { session } } = await supabase.auth.getSession();
                                          const response = await fetch('/api/leave-requests/', {
                                            method: 'PUT',
                                            headers: {
                                              'Content-Type': 'application/json',
                                              'Authorization': `Bearer ${session?.access_token}`
                                            },
                                            body: JSON.stringify({
                                              leave_request_id: request.id,
                                              status: 'rejected',
                                              rejection_reason: reason || undefined
                                            })
                                          });

                                          if (response.ok) {
                                            alert('İzin talebi reddedildi!');
                                            loadData();
                                          } else {
                                            const error = await response.json();
                                            alert(error.error || 'Reddetme işlemi başarısız');
                                          }
                                        } catch (error) {
                                          console.error('Rejection error:', error);
                                          alert('Bir hata oluştu');
                                        }
                                      }}
                                      className="flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30 transition-all text-xs"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Sayfalama */}
                      {getTotalPages(filterRequests(allLeaveRequests, 'leave').length) > 1 && (
                        <div className="p-4 border-t border-slate-700/50 flex items-center justify-between">
                          <p className="text-sm text-slate-400">
                            {filterRequests(allLeaveRequests, 'leave').length} talepten {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filterRequests(allLeaveRequests, 'leave').length)} arası gösteriliyor
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={currentPage === 1}
                              className="px-3 py-1 bg-slate-700/50 border border-slate-600 rounded text-sm text-slate-300 hover:bg-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Önceki
                            </button>
                            <span className="px-3 py-1 text-sm text-slate-300">
                              {currentPage} / {getTotalPages(filterRequests(allLeaveRequests, 'leave').length)}
                            </span>
                            <button
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, getTotalPages(filterRequests(allLeaveRequests, 'leave').length)))}
                              disabled={currentPage === getTotalPages(filterRequests(allLeaveRequests, 'leave').length)}
                              className="px-3 py-1 bg-slate-700/50 border border-slate-600 rounded text-sm text-slate-300 hover:bg-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Sonraki
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Avans Talepleri Yönetimi */}
          {(typeFilter === 'all' || typeFilter === 'advance') && hasAdvanceAssignments && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div className="p-4 border-b border-slate-700/50">
                <button
                  onClick={() => toggleSection('admin-advance')}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-yellow-400" />
                    Avans Talepleri Yönetimi ({filterRequests(allAdvanceRequests, 'advance').length})
                  </h2>
                  {expandedSections['admin-advance'] ? 
                    <EyeOff className="w-4 h-4 text-slate-400" /> : 
                    <Eye className="w-4 h-4 text-slate-400" />
                  }
                </button>
              </div>
              
              {expandedSections['admin-advance'] && (
                <>
                  {filterRequests(allAdvanceRequests, 'advance').length === 0 ? (
                    <div className="p-6 text-center">
                      <DollarSign className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">
                        {searchTerm || statusFilter !== 'all' ? 'Filtreye uygun avans talebi bulunamadı' : 'Avans talebi yok'}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="divide-y divide-slate-700/50">
                        {paginateData(filterRequests(allAdvanceRequests, 'advance')).map((request) => (
                          <div key={request.id} className="p-4 hover:bg-slate-700/20 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-base font-medium text-white mb-1">
                                  {request.user?.full_name} - {request.amount} {request.currency} Avans
                                </h3>
                                <p className="text-slate-300 text-sm mb-2 line-clamp-1">{request.reason}</p>
                                <div className="flex items-center gap-3 text-xs text-slate-400">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(request.created_at).toLocaleDateString('tr-TR')}
                                  </span>
                                  <span>
                                    {request.repayment_plan === 'salary' ? 'Maaştan Kesinti' : `${request.installment_count} Taksit`}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 ml-3">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  request.status === 'pending' ? 'bg-yellow-600/20 text-yellow-400' :
                                  request.status === 'approved' ? 'bg-green-600/20 text-green-400' :
                                  'bg-red-600/20 text-red-400'
                                }`}>
                                  {request.status === 'pending' ? 'Beklemede' :
                                   request.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}
                                </span>
                                {request.status === 'pending' && (
                                  <div className="flex gap-1">
                                    <button 
                                      onClick={async () => {
                                        try {
                                          const { data: { session } } = await supabase.auth.getSession();
                                          const response = await fetch('/api/advance-requests/', {
                                            method: 'PUT',
                                            headers: {
                                              'Content-Type': 'application/json',
                                              'Authorization': `Bearer ${session?.access_token}`
                                            },
                                            body: JSON.stringify({
                                              advance_request_id: request.id,
                                              status: 'approved'
                                            })
                                          });

                                          if (response.ok) {
                                            alert('Avans talebi onaylandı!');
                                            loadData();
                                          } else {
                                            const error = await response.json();
                                            alert(error.error || 'Onaylama işlemi başarısız');
                                          }
                                        } catch (error) {
                                          console.error('Approval error:', error);
                                          alert('Bir hata oluştu');
                                        }
                                      }}
                                      className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded hover:bg-green-500/30 transition-all text-xs"
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>
                                    <button 
                                      onClick={async () => {
                                        const reason = prompt('Red sebebini girin (opsiyonel):');
                                        try {
                                          const { data: { session } } = await supabase.auth.getSession();
                                          const response = await fetch('/api/advance-requests/', {
                                            method: 'PUT',
                                            headers: {
                                              'Content-Type': 'application/json',
                                              'Authorization': `Bearer ${session?.access_token}`
                                            },
                                            body: JSON.stringify({
                                              advance_request_id: request.id,
                                              status: 'rejected',
                                              rejection_reason: reason || undefined
                                            })
                                          });

                                          if (response.ok) {
                                            alert('Avans talebi reddedildi!');
                                            loadData();
                                          } else {
                                            const error = await response.json();
                                            alert(error.error || 'Reddetme işlemi başarısız');
                                          }
                                        } catch (error) {
                                          console.error('Rejection error:', error);
                                          alert('Bir hata oluştu');
                                        }
                                      }}
                                      className="flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30 transition-all text-xs"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Sayfalama */}
                      {getTotalPages(filterRequests(allAdvanceRequests, 'advance').length) > 1 && (
                        <div className="p-4 border-t border-slate-700/50 flex items-center justify-between">
                          <p className="text-sm text-slate-400">
                            {filterRequests(allAdvanceRequests, 'advance').length} talepten {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filterRequests(allAdvanceRequests, 'advance').length)} arası gösteriliyor
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={currentPage === 1}
                              className="px-3 py-1 bg-slate-700/50 border border-slate-600 rounded text-sm text-slate-300 hover:bg-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Önceki
                            </button>
                            <span className="px-3 py-1 text-sm text-slate-300">
                              {currentPage} / {getTotalPages(filterRequests(allAdvanceRequests, 'advance').length)}
                            </span>
                            <button
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, getTotalPages(filterRequests(allAdvanceRequests, 'advance').length)))}
                              disabled={currentPage === getTotalPages(filterRequests(allAdvanceRequests, 'advance').length)}
                              className="px-3 py-1 bg-slate-700/50 border border-slate-600 rounded text-sm text-slate-300 hover:bg-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Sonraki
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Öneri/Şikayet Yönetimi */}
          {(typeFilter === 'all' || typeFilter === 'suggestion') && hasSuggestionAssignments && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div className="p-4 border-b border-slate-700/50">
                <button
                  onClick={() => toggleSection('admin-suggestion')}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-purple-400" />
                    Öneri/Şikayet Yönetimi ({filterRequests(allSuggestions, 'suggestion').length})
                  </h2>
                  {expandedSections['admin-suggestion'] ? 
                    <EyeOff className="w-4 h-4 text-slate-400" /> : 
                    <Eye className="w-4 h-4 text-slate-400" />
                  }
                </button>
              </div>
              
              {expandedSections['admin-suggestion'] && (
                <>
                  {filterRequests(allSuggestions, 'suggestion').length === 0 ? (
                    <div className="p-6 text-center">
                      <Lightbulb className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">
                        {searchTerm || statusFilter !== 'all' ? 'Filtreye uygun öneri/şikayet bulunamadı' : 'Öneri/şikayet yok'}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="divide-y divide-slate-700/50">
                        {paginateData(filterRequests(allSuggestions, 'suggestion')).map((suggestion) => (
                          <div key={suggestion.id} className="p-4 hover:bg-slate-700/20 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-base font-medium text-white mb-1 flex items-center gap-2">
                                  <span className="truncate">{suggestion.subject}</span>
                                  <span className={`px-2 py-1 rounded text-xs flex-shrink-0 ${
                                    suggestion.type === 'suggestion' 
                                      ? 'bg-blue-600/20 text-blue-400' 
                                      : 'bg-orange-600/20 text-orange-400'
                                  }`}>
                                    {suggestion.type === 'suggestion' ? 'Öneri' : 'Şikayet'}
                                  </span>
                                  {suggestion.anonymous && (
                                    <span className="px-2 py-1 rounded text-xs bg-gray-600/20 text-gray-400 flex-shrink-0">
                                      Anonim
                                    </span>
                                  )}
                                </h3>
                                <p className="text-slate-300 text-sm mb-2 line-clamp-1">{suggestion.description}</p>
                                <div className="flex items-center gap-3 text-xs text-slate-400">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(suggestion.created_at).toLocaleDateString('tr-TR')}
                                  </span>
                                  {suggestion.department && (
                                    <span>{suggestion.department}</span>
                                  )}
                                  {!suggestion.anonymous && suggestion.user?.full_name && (
                                    <span>Gönderen: {suggestion.user.full_name}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 ml-3">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  suggestion.status === 'pending' ? 'bg-yellow-600/20 text-yellow-400' :
                                  suggestion.status === 'reviewed' ? 'bg-blue-600/20 text-blue-400' :
                                  suggestion.status === 'implemented' ? 'bg-green-600/20 text-green-400' :
                                  'bg-red-600/20 text-red-400'
                                }`}>
                                  {suggestion.status === 'pending' ? 'Beklemede' :
                                   suggestion.status === 'reviewed' ? 'İncelendi' :
                                   suggestion.status === 'implemented' ? 'Uygulandı' : 'Reddedildi'}
                                </span>
                                {suggestion.status === 'pending' && (
                                  <div className="flex gap-1">
                                    <button 
                                      onClick={async () => {
                                        try {
                                          const { data: { session } } = await supabase.auth.getSession();
                                          const response = await fetch('/api/suggestions/', {
                                            method: 'PUT',
                                            headers: {
                                              'Content-Type': 'application/json',
                                              'Authorization': `Bearer ${session?.access_token}`
                                            },
                                            body: JSON.stringify({
                                              suggestion_id: suggestion.id,
                                              status: 'reviewed'
                                            })
                                          });

                                          if (response.ok) {
                                            alert('Öneri/Şikayet incelendi olarak işaretlendi!');
                                            loadData();
                                          } else {
                                            const error = await response.json();
                                            alert(error.error || 'İşlem başarısız');
                                          }
                                        } catch (error) {
                                          console.error('Review error:', error);
                                          alert('Bir hata oluştu');
                                        }
                                      }}
                                      className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded hover:bg-blue-500/30 transition-all text-xs"
                                      title="İncele"
                                    >
                                      👁️
                                    </button>
                                    <button 
                                      onClick={async () => {
                                        try {
                                          const { data: { session } } = await supabase.auth.getSession();
                                          const response = await fetch('/api/suggestions/', {
                                            method: 'PUT',
                                            headers: {
                                              'Content-Type': 'application/json',
                                              'Authorization': `Bearer ${session?.access_token}`
                                            },
                                            body: JSON.stringify({
                                              suggestion_id: suggestion.id,
                                              status: 'implemented'
                                            })
                                          });

                                          if (response.ok) {
                                            alert('Öneri/Şikayet uygulandı olarak işaretlendi!');
                                            loadData();
                                          } else {
                                            const error = await response.json();
                                            alert(error.error || 'İşlem başarısız');
                                          }
                                        } catch (error) {
                                          console.error('Implementation error:', error);
                                          alert('Bir hata oluştu');
                                        }
                                      }}
                                      className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded hover:bg-green-500/30 transition-all text-xs"
                                      title="Uygula"
                                    >
                                      ✅
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Sayfalama */}
                      {getTotalPages(filterRequests(allSuggestions, 'suggestion').length) > 1 && (
                        <div className="p-4 border-t border-slate-700/50 flex items-center justify-between">
                          <p className="text-sm text-slate-400">
                            {filterRequests(allSuggestions, 'suggestion').length} talepten {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filterRequests(allSuggestions, 'suggestion').length)} arası gösteriliyor
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={currentPage === 1}
                              className="px-3 py-1 bg-slate-700/50 border border-slate-600 rounded text-sm text-slate-300 hover:bg-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Önceki
                            </button>
                            <span className="px-3 py-1 text-sm text-slate-300">
                              {currentPage} / {getTotalPages(filterRequests(allSuggestions, 'suggestion').length)}
                            </span>
                            <button
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, getTotalPages(filterRequests(allSuggestions, 'suggestion').length)))}
                              disabled={currentPage === getTotalPages(filterRequests(allSuggestions, 'suggestion').length)}
                              className="px-3 py-1 bg-slate-700/50 border border-slate-600 rounded text-sm text-slate-300 hover:bg-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Sonraki
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Request Type Selection Modal */}
      {showRequestTypeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/95 backdrop-blur-sm rounded-2xl border border-slate-700/50 w-full max-w-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700/50">
              <h3 className="text-xl font-bold text-white">Talep Türü Seçin</h3>
              <p className="text-slate-400 mt-1">Hangi türde talep oluşturmak istiyorsunuz?</p>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Destek Talebi */}
                <button
                  onClick={() => {
                    setSelectedRequestType('support');
                    setShowRequestTypeModal(false);
                    setShowCreateModal(true);
                  }}
                  className="p-6 bg-slate-700/30 border border-slate-600/30 rounded-xl hover:border-blue-500/50 hover:bg-blue-500/10 transition-all text-left group"
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white">Destek Talebi</h4>
                      <p className="text-sm text-slate-400">Teknik destek ve yardım</p>
                    </div>
                  </div>
                  <p className="text-slate-300 text-sm">
                    Teknik sorunlar, sistem hataları veya genel destek için talep oluşturun.
                  </p>
                </button>

                {/* İzin Talebi */}
                <button
                  onClick={() => {
                    setSelectedRequestType('leave');
                    setShowRequestTypeModal(false);
                    setShowLeaveModal(true);
                  }}
                  className="p-6 bg-slate-700/30 border border-slate-600/30 rounded-xl hover:border-green-500/50 hover:bg-green-500/10 transition-all text-left group"
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white">İzin Talebi</h4>
                      <p className="text-sm text-slate-400">Yıllık, hastalık, kişisel izin</p>
                    </div>
                  </div>
                  <p className="text-slate-300 text-sm">
                    Yıllık izin, hastalık izni veya kişisel izin talebinde bulunun.
                  </p>
                </button>

                {/* Avans Talebi */}
                <button
                  onClick={() => {
                    setSelectedRequestType('advance');
                    setShowRequestTypeModal(false);
                    setShowAdvanceModal(true);
                  }}
                  className="p-6 bg-slate-700/30 border border-slate-600/30 rounded-xl hover:border-yellow-500/50 hover:bg-yellow-500/10 transition-all text-left group"
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white">Avans Talebi</h4>
                      <p className="text-sm text-slate-400">Maaş avansı talebi</p>
                    </div>
                  </div>
                  <p className="text-slate-300 text-sm">
                    Acil durumlar için maaş avansı talebinde bulunun.
                  </p>
                </button>

                {/* Öneri/Şikayet */}
                <button
                  onClick={() => {
                    setSelectedRequestType('suggestion');
                    setShowRequestTypeModal(false);
                    setShowSuggestionModal(true);
                  }}
                  className="p-6 bg-slate-700/30 border border-slate-600/30 rounded-xl hover:border-purple-500/50 hover:bg-purple-500/10 transition-all text-left group"
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Lightbulb className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white">Öneri/Şikayet</h4>
                      <p className="text-sm text-slate-400">İyileştirme önerileri</p>
                    </div>
                  </div>
                  <p className="text-slate-300 text-sm">
                    Süreçleri iyileştirmek için öneri veya şikayet bildirin.
                  </p>
                </button>
              </div>
            </div>

            {/* Fixed Modal Footer */}
            <div className="sticky bottom-0 bg-slate-800/95 backdrop-blur-sm border-t border-slate-700/50 p-4">
              <div className="flex justify-center">
                <button
                  onClick={() => setShowRequestTypeModal(false)}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-500/20 text-slate-400 border border-slate-500/30 rounded-xl hover:bg-slate-500/30 transition-all text-sm font-medium min-w-[120px] justify-center"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/95 backdrop-blur-sm rounded-2xl border border-slate-700/50 w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700/50">
              <h3 className="text-xl font-bold text-white">Yeni Destek Talebi</h3>
              <p className="text-slate-400 mt-1">Sorununuzu detaylı bir şekilde açıklayın</p>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Başlık *
                  </label>
                  <input
                    type="text"
                    value={ticketForm.title}
                    onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="Sorununuzun kısa bir özeti"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Kategori *
                  </label>
                  <select
                    value={ticketForm.category_id}
                    onChange={(e) => setTicketForm({ ...ticketForm, category_id: e.target.value })}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    required
                  >
                    <option value="">Kategori seçin...</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Öncelik
                  </label>
                  <select
                    value={ticketForm.priority}
                    onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value as any })}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  >
                    <option value="low">Düşük</option>
                    <option value="medium">Orta</option>
                    <option value="high">Yüksek</option>
                    <option value="urgent">Acil</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Açıklama *
                  </label>
                  <textarea
                    value={ticketForm.description}
                    onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none"
                    rows={6}
                    placeholder="Sorununuzu detaylı bir şekilde açıklayın..."
                    required
                  />
                </div>
              </form>
            </div>

            {/* Fixed Modal Footer */}
            <div className="sticky bottom-0 bg-slate-800/95 backdrop-blur-sm border-t border-slate-700/50 p-4">
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-500/20 text-slate-400 border border-slate-500/30 rounded-xl hover:bg-slate-500/30 transition-all text-sm font-medium min-w-[120px] justify-center"
                >
                  İptal
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl hover:bg-blue-500/30 transition-all text-sm font-medium min-w-[120px] justify-center"
                >
                  <Plus className="w-4 h-4" />
                  Talep Oluştur
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave Request Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/95 backdrop-blur-sm rounded-2xl border border-slate-700/50 w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700/50">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Calendar className="w-6 h-6 text-green-400" />
                İzin Talebi
              </h3>
              <p className="text-slate-400 mt-1">İzin talebinizi detaylı bir şekilde açıklayın</p>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="space-y-4">
                {/* İzin Türü */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    İzin Türü *
                  </label>
                  <select
                    value={leaveForm.leave_type}
                    onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value as any })}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50"
                  >
                    <option value="annual">Yıllık İzin</option>
                    <option value="sick">Hastalık İzni</option>
                    <option value="personal">Kişisel İzin</option>
                    <option value="maternity">Doğum İzni</option>
                    <option value="other">Diğer</option>
                  </select>
                </div>

                {/* Başlangıç Tarihi */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Başlangıç Tarihi *
                  </label>
                  <input
                    type="date"
                    value={leaveForm.start_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                {/* Bitiş Tarihi */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Bitiş Tarihi *
                  </label>
                  <input
                    type="date"
                    value={leaveForm.end_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50"
                    min={leaveForm.start_date || new Date().toISOString().split('T')[0]}
                  />
                </div>

                {/* Sebep */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    İzin Sebebi
                  </label>
                  <textarea
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 resize-none"
                    rows={4}
                    placeholder="İzin almanız için sebep (opsiyonel)"
                  />
                </div>

                {/* Acil Durum İletişim */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Acil Durum İletişim
                  </label>
                  <input
                    type="text"
                    value={leaveForm.emergency_contact}
                    onChange={(e) => setLeaveForm({ ...leaveForm, emergency_contact: e.target.value })}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50"
                    placeholder="Acil durumda ulaşılabilecek telefon numarası"
                  />
                </div>

                {/* Bilgi Notu */}
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-green-400 font-medium mb-1">İzin Talebi Bilgilendirmesi</h4>
                      <p className="text-green-300/80 text-sm">
                        İzin talebiniz takım liderinize iletilecek ve onay sürecine girecektir. 
                        Onay durumu hakkında bilgilendirileceksiniz.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed Modal Footer */}
            <div className="sticky bottom-0 bg-slate-800/95 backdrop-blur-sm border-t border-slate-700/50 p-4">
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={() => setShowLeaveModal(false)}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-500/20 text-slate-400 border border-slate-500/30 rounded-xl hover:bg-slate-500/30 transition-all text-sm font-medium min-w-[120px] justify-center"
                >
                  İptal
                </button>
                <button
                  onClick={async () => {
                    console.log('🚀 İzin talebi oluşturuluyor...', leaveForm);
                    
                    if (!leaveForm.start_date || !leaveForm.end_date) {
                      console.log('❌ Tarihler eksik');
                      alert('Lütfen başlangıç ve bitiş tarihlerini seçin');
                      return;
                    }

                    try {
                      console.log('🔑 Session alınıyor...');
                      const { data: { session } } = await supabase.auth.getSession();
                      console.log('📡 API çağrısı yapılıyor...');
                      
                      const response = await fetch('/api/leave-requests/', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${session?.access_token}`
                        },
                        body: JSON.stringify(leaveForm)
                      });

                      console.log('📊 API yanıtı:', response.status);

                      if (response.ok) {
                        console.log('✅ İzin talebi başarıyla oluşturuldu');
                        alert('İzin talebiniz başarıyla oluşturuldu!');
                        setShowLeaveModal(false);
                        setLeaveForm({
                          leave_type: 'annual',
                          start_date: '',
                          end_date: '',
                          reason: '',
                          emergency_contact: ''
                        });
                        loadData(); // Verileri yeniden yükle
                      } else {
                        const error = await response.json();
                        console.log('❌ API hatası:', error);
                        alert(error.error || 'İzin talebi oluşturulamadı');
                      }
                    } catch (error) {
                      console.error('💥 Leave request error:', error);
                      alert('Bir hata oluştu');
                    }
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-green-500/20 text-green-400 border border-green-500/30 rounded-xl hover:bg-green-500/30 transition-all text-sm font-medium min-w-[120px] justify-center"
                >
                  <Calendar className="w-4 h-4" />
                  İzin Talebi Oluştur
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advance Request Modal */}
      {showAdvanceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/95 backdrop-blur-sm rounded-2xl border border-slate-700/50 w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700/50">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-yellow-400" />
                Avans Talebi
              </h3>
              <p className="text-slate-400 mt-1">Avans talebinizi detaylı bir şekilde açıklayın</p>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="space-y-4">
                {/* Miktar */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Talep Edilen Miktar *
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      value={advanceForm.amount}
                      onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                      className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50"
                      placeholder="0.00"
                      min="1"
                      max="50000"
                      step="0.01"
                    />
                    <select
                      value={advanceForm.currency}
                      onChange={(e) => setAdvanceForm({ ...advanceForm, currency: e.target.value as any })}
                      className="w-24 bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50"
                    >
                      <option value="TRY">TRY</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Maksimum 50,000 TL</p>
                </div>

                {/* Geri Ödeme Planı */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Geri Ödeme Planı
                  </label>
                  <select
                    value={advanceForm.repayment_plan}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, repayment_plan: e.target.value as any })}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50"
                  >
                    <option value="salary">Maaştan Kesinti</option>
                    <option value="installment">Taksitli Ödeme</option>
                  </select>
                </div>

                {/* Taksit Sayısı */}
                {advanceForm.repayment_plan === 'installment' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Taksit Sayısı
                    </label>
                    <select
                      value={advanceForm.installment_count}
                      onChange={(e) => setAdvanceForm({ ...advanceForm, installment_count: e.target.value })}
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50"
                    >
                      {[...Array(12)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1} Taksit
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Sebep */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Avans Sebebi *
                  </label>
                  <textarea
                    value={advanceForm.reason}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, reason: e.target.value })}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 resize-none"
                    rows={4}
                    placeholder="Avans talebinizin sebebini açıklayın..."
                  />
                </div>

                {/* Bilgi Notu */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-yellow-400 font-medium mb-1">Avans Talebi Bilgilendirmesi</h4>
                      <p className="text-yellow-300/80 text-sm">
                        Avans talebiniz admin tarafından değerlendirilecek. Onay durumu hakkında bilgilendirileceksiniz.
                        Aynı anda sadece bir avans talebiniz olabilir.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed Modal Footer */}
            <div className="sticky bottom-0 bg-slate-800/95 backdrop-blur-sm border-t border-slate-700/50 p-4">
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={() => setShowAdvanceModal(false)}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-500/20 text-slate-400 border border-slate-500/30 rounded-xl hover:bg-slate-500/30 transition-all text-sm font-medium min-w-[120px] justify-center"
                >
                  İptal
                </button>
                <button
                  onClick={async () => {
                    if (!advanceForm.amount || !advanceForm.reason.trim()) {
                      alert('Lütfen miktar ve sebep alanlarını doldurun');
                      return;
                    }

                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      const response = await fetch('/api/advance-requests/', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${session?.access_token}`
                        },
                        body: JSON.stringify(advanceForm)
                      });

                      if (response.ok) {
                        alert('Avans talebiniz başarıyla oluşturuldu!');
                        setShowAdvanceModal(false);
                        setAdvanceForm({
                          amount: '',
                          currency: 'TRY',
                          reason: '',
                          repayment_plan: 'salary',
                          installment_count: '1'
                        });
                        loadData(); // Verileri yeniden yükle
                      } else {
                        const error = await response.json();
                        alert(error.error || 'Avans talebi oluşturulamadı');
                      }
                    } catch (error) {
                      console.error('Advance request error:', error);
                      alert('Bir hata oluştu');
                    }
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-xl hover:bg-yellow-500/30 transition-all text-sm font-medium min-w-[120px] justify-center"
                >
                  <DollarSign className="w-4 h-4" />
                  Avans Talebi Oluştur
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Suggestion/Complaint Modal */}
      {showSuggestionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/95 backdrop-blur-sm rounded-2xl border border-slate-700/50 w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700/50">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Lightbulb className="w-6 h-6 text-purple-400" />
                Öneri/Şikayet
              </h3>
              <p className="text-slate-400 mt-1">Önerinizi veya şikayetinizi detaylı bir şekilde açıklayın</p>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="space-y-4">
                {/* Tip Seçimi */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Tip *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setSuggestionForm({ ...suggestionForm, type: 'suggestion' })}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        suggestionForm.type === 'suggestion'
                          ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                          : 'bg-slate-700/30 border-slate-600/30 text-slate-300 hover:border-slate-500/50'
                      }`}
                    >
                      <div className="font-medium text-sm">Öneri</div>
                      <div className="text-xs opacity-75 mt-1">İyileştirme önerisi</div>
                    </button>
                    <button
                      onClick={() => setSuggestionForm({ ...suggestionForm, type: 'complaint' })}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        suggestionForm.type === 'complaint'
                          ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                          : 'bg-slate-700/30 border-slate-600/30 text-slate-300 hover:border-slate-500/50'
                      }`}
                    >
                      <div className="font-medium text-sm">Şikayet</div>
                      <div className="text-xs opacity-75 mt-1">Sorun bildirimi</div>
                    </button>
                  </div>
                </div>

                {/* Konu */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Konu *
                  </label>
                  <input
                    type="text"
                    value={suggestionForm.subject}
                    onChange={(e) => setSuggestionForm({ ...suggestionForm, subject: e.target.value })}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                    placeholder="Kısa bir başlık yazın"
                  />
                </div>

                {/* Departman */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    İlgili Departman
                  </label>
                  <select
                    value={suggestionForm.department}
                    onChange={(e) => setSuggestionForm({ ...suggestionForm, department: e.target.value })}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                  >
                    <option value="">Departman seçin (opsiyonel)</option>
                    <option value="IT">Bilgi İşlem</option>
                    <option value="HR">İnsan Kaynakları</option>
                    <option value="Finance">Finans</option>
                    <option value="Operations">Operasyon</option>
                    <option value="Marketing">Pazarlama</option>
                    <option value="Sales">Satış</option>
                    <option value="General">Genel</option>
                  </select>
                </div>

                {/* Açıklama */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Açıklama *
                  </label>
                  <textarea
                    value={suggestionForm.description}
                    onChange={(e) => setSuggestionForm({ ...suggestionForm, description: e.target.value })}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 resize-none"
                    rows={5}
                    placeholder="Önerinizi veya şikayetinizi detaylı bir şekilde açıklayın..."
                  />
                </div>

                {/* Anonim Seçeneği */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="anonymous"
                    checked={suggestionForm.anonymous}
                    onChange={(e) => setSuggestionForm({ ...suggestionForm, anonymous: e.target.checked })}
                    className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500 focus:ring-2"
                  />
                  <label htmlFor="anonymous" className="text-sm text-slate-300">
                    Anonim olarak gönder
                  </label>
                </div>

                {/* Bilgi Notu */}
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-purple-400 font-medium mb-1">Öneri/Şikayet Bilgilendirmesi</h4>
                      <p className="text-purple-300/80 text-sm">
                        {suggestionForm.type === 'suggestion' 
                          ? 'Öneriniz admin tarafından değerlendirilecek ve uygun görülürse hayata geçirilecektir.'
                          : 'Şikayetiniz admin tarafından incelenecek ve gerekli aksiyonlar alınacaktır.'
                        }
                        {suggestionForm.anonymous && ' Anonim gönderimler kimlik bilgisi içermez.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed Modal Footer */}
            <div className="sticky bottom-0 bg-slate-800/95 backdrop-blur-sm border-t border-slate-700/50 p-4">
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={() => setShowSuggestionModal(false)}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-500/20 text-slate-400 border border-slate-500/30 rounded-xl hover:bg-slate-500/30 transition-all text-sm font-medium min-w-[120px] justify-center"
                >
                  İptal
                </button>
                <button
                  onClick={async () => {
                    if (!suggestionForm.subject.trim() || !suggestionForm.description.trim()) {
                      alert('Lütfen konu ve açıklama alanlarını doldurun');
                      return;
                    }

                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      const response = await fetch('/api/suggestions/', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${session?.access_token}`
                        },
                        body: JSON.stringify(suggestionForm)
                      });

                      if (response.ok) {
                        alert(`${suggestionForm.type === 'suggestion' ? 'Öneriniz' : 'Şikayetiniz'} başarıyla gönderildi!`);
                        setShowSuggestionModal(false);
                        setSuggestionForm({
                          type: 'suggestion',
                          subject: '',
                          description: '',
                          department: '',
                          anonymous: false
                        });
                        loadData(); // Verileri yeniden yükle
                      } else {
                        const error = await response.json();
                        alert(error.error || 'Gönderim başarısız');
                      }
                    } catch (error) {
                      console.error('Suggestion request error:', error);
                      alert('Bir hata oluştu');
                    }
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-xl hover:bg-purple-500/30 transition-all text-sm font-medium min-w-[120px] justify-center"
                >
                  <Lightbulb className="w-4 h-4" />
                  {suggestionForm.type === 'suggestion' ? 'Öneri Gönder' : 'Şikayet Gönder'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
