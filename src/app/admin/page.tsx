'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/lib/supabase';
import { UserProfile, Department, Position } from '@/types';
import { 
  Users, 
  Plus, 
  Search, 
  Edit3, 
  Phone, 
  Briefcase,
  Hash,
  User,
  Save,
  X,
  Eye,
  EyeOff,
  Building2
} from 'lucide-react';

export default function AdminPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [deactivatingUser, setDeactivatingUser] = useState<UserProfile | null>(null);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewingUser, setViewingUser] = useState<UserProfile | null>(null);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [visibleSensitiveFields, setVisibleSensitiveFields] = useState<Set<string>>(new Set());
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const { user, loading } = useAuth();
  const { canAccess } = usePermissions();
  const router = useRouter();

  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    position: '',
    department: '',
    address: '',
    startDate: new Date().toISOString().split('T')[0],
    departmentId: '',
    positionId: '',
    gender: '',
    birthDate: '',
    birthPlace: '',
    nationalId: '',
    maritalStatus: '',
    bloodType: '',
    profilePhotoUrl: '',
    fullAddress: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    educationLevel: '',
    educationSchool: '',
    educationField: '',
    educationYear: '',
    referenceName: '',
    referencePhone: '',
    referenceCompany: '',
    workType: 'full_time' as 'full_time' | 'part_time' | 'intern' | 'contract',
    salary: '',
    iban: '',
    bankName: '',
    managerId: '',
    isLeader: false,
    authorityLevel: 'employee' as 'employee' | 'team_lead' | 'manager' | 'director' | 'admin'
  });

  // Fetch data from Supabase
  const fetchData = async () => {
    try {
      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Fetch departments
      const { data: departmentsData, error: departmentsError } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (departmentsError) throw departmentsError;

      // Fetch positions
      const { data: positionsData, error: positionsError } = await supabase
        .from('positions')
        .select('*')
        .order('name');

      if (positionsError) throw positionsError;

      setUsers(usersData || []);
      setDepartments(departmentsData || []);
      setPositions(positionsData || []);
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

  // Check if user has modules and redirect if not manager
  useEffect(() => {
    const checkModulesAndRedirect = async () => {
      if (!user || !canAccess) return;

      try {
        // If not manager, check if user has modules
        if (!canAccess.manager()) {
          const response = await fetch(`/api/modules/user?userId=${user.id}`);
          const data = await response.json();

          if (data.success && data.modules && data.modules.length > 0) {
            // User has modules, redirect to modules page
            router.push('/admin/modules');
            return; // Don't set isCheckingAccess to false, let redirect happen
          } else {
            // User has no modules and is not manager, redirect to dashboard
            router.push('/');
            return; // Don't set isCheckingAccess to false, let redirect happen
          }
        } else {
          // User is manager, can stay on this page
          setIsCheckingAccess(false);
        }
      } catch (error) {
        console.error('Error checking modules:', error);
        router.push('/');
      }
    };

    checkModulesAndRedirect();
  }, [user, canAccess, router]);

  // Fetch data on component mount
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Show loading while checking authentication or access
  if (loading || isCheckingAccess) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">
            {loading ? 'Yükleniyor...' : 'Erişim kontrol ediliyor...'}
          </p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  const generatePersonnelNumber = () => {
    const maxNumber = users.reduce((max, user) => {
      const num = parseInt(user.personnel_number.replace('P', ''));
      return num > max ? num : max;
    }, 0);
    return `P${String(maxNumber + 1).padStart(4, '0')}`;
  };

  const filteredUsers = users.filter(user =>
    user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.position || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.personnel_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get department and position names
  const getDepartmentName = (departmentId?: string) => {
    if (!departmentId) return '';
    const dept = departments.find(d => d.id === departmentId);
    return dept?.name || '';
  };

  const getPositionName = (positionId?: string) => {
    if (!positionId) return '';
    const pos = positions.find(p => p.id === positionId);
    return pos?.name || '';
  };

  const handleCreateUser = async () => {
    if (!newUser.firstName || !newUser.lastName || !newUser.email || !newUser.password) {
      setError('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // API route'u kullanarak kullanıcı oluştur (mevcut oturumu etkilemez)
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newUser.email,
          password: newUser.password,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          profileData: {
            personnel_number: generatePersonnelNumber(),
            first_name: newUser.firstName,
            last_name: newUser.lastName,
            email: newUser.email,
            phone: newUser.phone,
            position: newUser.position,
            department: newUser.department,
            address: newUser.address,
            start_date: newUser.startDate,
            status: 'active',
            gender: newUser.gender || null,
            birth_date: newUser.birthDate || null,
            birth_place: newUser.birthPlace || null,
            national_id: newUser.nationalId || null,
            marital_status: newUser.maritalStatus || null,
            blood_type: newUser.bloodType || null,
            profile_photo_url: newUser.profilePhotoUrl || null,
            full_address: newUser.fullAddress || null,
            emergency_contact_name: newUser.emergencyContactName || null,
            emergency_contact_phone: newUser.emergencyContactPhone || null,
            emergency_contact_relation: newUser.emergencyContactRelation || null,
            education_level: newUser.educationLevel || null,
            education_school: newUser.educationSchool || null,
            education_field: newUser.educationField || null,
            education_year: newUser.educationYear ? parseInt(newUser.educationYear) : null,
            reference_name: newUser.referenceName || null,
            reference_phone: newUser.referencePhone || null,
            reference_company: newUser.referenceCompany || null,
            work_type: newUser.workType,
            salary: newUser.salary ? parseFloat(newUser.salary) : null,
            iban: newUser.iban || null,
            bank_name: newUser.bankName || null,
            manager_id: newUser.managerId || null,
            is_leader: newUser.isLeader,
            authority_level: newUser.authorityLevel,
            department_id: newUser.departmentId || null,
            position_id: newUser.positionId || null
          }
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Kullanıcı oluşturulurken hata oluştu.');
        setIsLoading(false);
        return;
      }

      if (!result.success) {
        setError('Kullanıcı oluşturulamadı.');
        setIsLoading(false);
        return;
      }

      // Refresh data to get the new user
      await fetchData();
      
      setNewUser({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        position: '',
        department: '',
        address: '',
        startDate: new Date().toISOString().split('T')[0],
        departmentId: '',
        positionId: '',
        gender: '',
        birthDate: '',
        birthPlace: '',
        nationalId: '',
        maritalStatus: '',
        bloodType: '',
        profilePhotoUrl: '',
        fullAddress: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactRelation: '',
        educationLevel: '',
        educationSchool: '',
        educationField: '',
        educationYear: '',
        referenceName: '',
        referencePhone: '',
        referenceCompany: '',
        workType: 'full_time',
        salary: '',
        iban: '',
        bankName: '',
        managerId: '',
        isLeader: false,
        authorityLevel: 'employee'
      });
      setIsCreating(false);
      setIsLoading(false);
      
      // Success notification
      alert('Kullanıcı başarıyla oluşturuldu ve Supabase\'e kaydedildi!');
    } catch (error) {
      console.error('Error creating user:', error);
      setError('Kullanıcı oluşturulurken beklenmeyen bir hata oluştu.');
      setIsLoading(false);
    }
  };


  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      setIsLoading(true);
      
      console.log('🔄 Kullanıcı güncelleniyor:', editingUser.id, editingUser.first_name, editingUser.last_name);
      
      const updateData = {
        first_name: editingUser.first_name,
        last_name: editingUser.last_name,
        email: editingUser.email,
        phone: editingUser.phone,
        position: editingUser.position,
        department: editingUser.department,
        address: editingUser.address,
        start_date: editingUser.start_date,
        status: editingUser.status,
        end_date: editingUser.end_date,
        gender: editingUser.gender,
        birth_date: editingUser.birth_date,
        birth_place: editingUser.birth_place,
        national_id: editingUser.national_id,
        marital_status: editingUser.marital_status,
        blood_type: editingUser.blood_type,
        profile_photo_url: editingUser.profile_photo_url,
        full_address: editingUser.full_address,
        emergency_contact_name: editingUser.emergency_contact_name,
        emergency_contact_phone: editingUser.emergency_contact_phone,
        emergency_contact_relation: editingUser.emergency_contact_relation,
        education_level: editingUser.education_level,
        education_school: editingUser.education_school,
        education_field: editingUser.education_field,
        education_year: editingUser.education_year,
        reference_name: editingUser.reference_name,
        reference_phone: editingUser.reference_phone,
        reference_company: editingUser.reference_company,
        work_type: editingUser.work_type,
        salary: editingUser.salary,
        iban: editingUser.iban,
        bank_name: editingUser.bank_name,
        manager_id: editingUser.manager_id,
        is_leader: editingUser.is_leader,
        authority_level: editingUser.authority_level,
        department_id: editingUser.department_id,
        position_id: editingUser.position_id
      };

      console.log('📝 Güncelleme verisi:', updateData);

      // API endpoint'ini kullanarak güncelleme yap (Service role key ile)
      const response = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: editingUser.id,
          updateData: updateData
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('❌ API güncelleme hatası:', result.error);
        throw new Error(result.error || 'Kullanıcı güncellenirken hata oluştu.');
      }

      if (!result.success) {
        throw new Error('Kullanıcı güncellenemedi.');
      }

      console.log('✅ API güncelleme başarılı:', result.data);

      // Refresh data to get the updated user
      await fetchData();
      
      setEditingUser(null);
      setShowUpdateConfirm(false);
      setIsLoading(false);
      
      alert('Kullanıcı başarıyla güncellendi ve Supabase\'e kaydedildi!');
    } catch (error) {
      console.error('💥 Kullanıcı güncelleme hatası:', error);
      setError(`Kullanıcı güncellenirken hata oluştu: ${error instanceof Error ? error.message : String(error)}`);
      setIsLoading(false);
    }
  };

  const handleViewUser = (user: UserProfile) => {
    setViewingUser(user);
    setVisibleSensitiveFields(new Set()); // Reset visible fields when opening modal
  };

  const toggleSensitiveField = (fieldId: string) => {
    const newVisibleFields = new Set(visibleSensitiveFields);
    if (newVisibleFields.has(fieldId)) {
      newVisibleFields.delete(fieldId);
    } else {
      newVisibleFields.add(fieldId);
    }
    setVisibleSensitiveFields(newVisibleFields);
  };

  const renderSensitiveField = (value: string | number | null | undefined, fieldId: string, placeholder: string = '••••••••') => {
    if (!value) return '-';
    
    const isVisible = visibleSensitiveFields.has(fieldId);
    
    return (
      <div className="flex items-center gap-2">
        <span className={`${isVisible ? 'text-white' : 'text-white filter blur-sm select-none'} transition-all duration-200`}>
          {isVisible ? value : placeholder}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleSensitiveField(fieldId);
          }}
          className="p-1 rounded-lg hover:bg-slate-600/50 transition-colors"
          title={isVisible ? 'Gizle' : 'Göster'}
        >
          {isVisible ? <EyeOff className="w-3 h-3 text-slate-400" /> : <Eye className="w-3 h-3 text-slate-400" />}
        </button>
      </div>
    );
  };

  const handleDeactivateUser = async () => {
    if (!deactivatingUser) return;

    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('user_profiles')
        .update({
          status: 'inactive',
          end_date: endDate
        })
        .eq('id', deactivatingUser.id);

      if (error) throw error;

      // Refresh data to get the updated user
      await fetchData();
      
      // Update editing user if it's the same user
      if (editingUser && editingUser.id === deactivatingUser.id) {
        setEditingUser({ ...editingUser, status: 'inactive', end_date: endDate });
      }
      
      setDeactivatingUser(null);
      setIsLoading(false);
      
      alert(`${deactivatingUser.first_name} ${deactivatingUser.last_name} başarıyla pasife alındı.`);
    } catch (error) {
      console.error('Error deactivating user:', error);
      setError('Kullanıcı pasife alınırken hata oluştu.');
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Kullanıcı Yönetimi</h2>
            <p className="text-slate-400">Personel bilgilerini yönetin ve yeni kullanıcılar ekleyin</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <span className="text-sm text-slate-300 font-medium">Toplam: {users.length} kullanıcı</span>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 font-medium"
            >
              <Plus className="w-4 h-4" />
              Yeni Kullanıcı
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Kullanıcı ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Kullanıcı</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Personel No</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Pozisyon</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Departman</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">İletişim</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Durum</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((userData) => (
                <tr 
                  key={userData.id} 
                  className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors cursor-pointer"
                  onClick={() => handleViewUser(userData)}
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center">
                        {userData.profile_photo_url ? (
                          <img 
                            src={userData.profile_photo_url} 
                            alt={`${userData.first_name} ${userData.last_name}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fotoğraf yüklenemezse baş harfleri göster
                              const target = e.currentTarget;
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `
                                  <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                                    ${userData.first_name[0]}${userData.last_name[0]}
                                  </div>
                                `;
                              }
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                            {userData.first_name[0]}{userData.last_name[0]}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-white">{userData.first_name} {userData.last_name}</div>
                        <div className="text-sm text-slate-400">{userData.email || 'Email bilgisi mevcut değil'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-slate-300 font-mono">{userData.personnel_number}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-slate-300">{getPositionName(userData.position_id) || userData.position || '-'}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-slate-300">{getDepartmentName(userData.department_id) || userData.department || '-'}</span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-sm">
                      <div className="text-slate-300">{userData.phone}</div>
                      <div className="text-slate-500">{userData.address}</div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      userData.status === 'active' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {userData.status === 'active' ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditUser(userData)}
                        className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                        title="Düzenle"
                      >
                        <Edit3 className="w-4 h-4 text-slate-400 hover:text-blue-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {searchTerm ? 'Kullanıcı Bulunamadı' : 'Henüz Kullanıcı Yok'}
            </h3>
            <p className="text-slate-400 mb-6">
              {searchTerm ? 'Arama kriterlerinize uygun kullanıcı bulunamadı' : 'İlk kullanıcıyı oluşturun'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setIsCreating(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 font-medium"
              >
                İlk Kullanıcıyı Oluştur
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Yeni Kullanıcı Oluştur</h3>
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
                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Ad *</label>
                  <input
                    type="text"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="Ad"
                    required
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Soyad *</label>
                  <input
                    type="text"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="Soyad"
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">E-posta *</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="email@company.com"
                    required
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Şifre *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="w-full px-4 py-3 pr-12 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-blue-400 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Telefon</label>
                  <input
                    type="tel"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="+90 555 123 4567"
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Departman</label>
                  <select
                    value={newUser.departmentId}
                    onChange={(e) => {
                      const selectedDept = departments.find(d => d.id === e.target.value);
                      setNewUser({ 
                        ...newUser, 
                        departmentId: e.target.value,
                        department: selectedDept?.name || '',
                        positionId: '', // Reset position when department changes
                        position: ''
                      });
                    }}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  >
                    <option value="">Departman Seçiniz</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                {/* Position */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Pozisyon</label>
                  <select
                    value={newUser.positionId}
                    onChange={(e) => {
                      const selectedPos = positions.find(p => p.id === e.target.value);
                      setNewUser({ 
                        ...newUser, 
                        positionId: e.target.value,
                        position: selectedPos?.name || ''
                      });
                    }}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    disabled={!newUser.departmentId}
                  >
                    <option value="">Pozisyon Seçiniz</option>
                    {positions
                      .filter(pos => pos.department_id === newUser.departmentId)
                      .map(pos => (
                        <option key={pos.id} value={pos.id}>{pos.name}</option>
                      ))}
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Başlangıç Tarihi</label>
                  <input
                    type="date"
                    value={newUser.startDate}
                    onChange={(e) => setNewUser({ ...newUser, startDate: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Cinsiyet</label>
                  <select
                    value={newUser.gender}
                    onChange={(e) => setNewUser({ ...newUser, gender: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  >
                    <option value="">Seçiniz</option>
                    <option value="male">Erkek</option>
                    <option value="female">Kadın</option>
                    <option value="other">Diğer</option>
                  </select>
                </div>

                {/* Birth Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Doğum Tarihi</label>
                  <input
                    type="date"
                    value={newUser.birthDate}
                    onChange={(e) => setNewUser({ ...newUser, birthDate: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>

                {/* Birth Place */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Doğum Yeri</label>
                  <input
                    type="text"
                    value={newUser.birthPlace}
                    onChange={(e) => setNewUser({ ...newUser, birthPlace: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="İstanbul"
                  />
                </div>

                {/* National ID */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">TC Kimlik No</label>
                  <input
                    type="text"
                    value={newUser.nationalId}
                    onChange={(e) => setNewUser({ ...newUser, nationalId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="12345678901"
                    maxLength={11}
                  />
                </div>

                {/* Marital Status */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Medeni Durum</label>
                  <select
                    value={newUser.maritalStatus}
                    onChange={(e) => setNewUser({ ...newUser, maritalStatus: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  >
                    <option value="">Seçiniz</option>
                    <option value="single">Bekar</option>
                    <option value="married">Evli</option>
                    <option value="divorced">Boşanmış</option>
                    <option value="widowed">Dul</option>
                  </select>
                </div>

                {/* Blood Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Kan Grubu</label>
                  <select
                    value={newUser.bloodType}
                    onChange={(e) => setNewUser({ ...newUser, bloodType: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  >
                    <option value="">Seçiniz</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                {/* Profile Photo */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Profil Fotoğrafı</label>
                  <div className="flex items-center gap-4">
                    {/* Photo Preview */}
                    <div className="w-20 h-20 bg-slate-700/50 rounded-xl border border-slate-600 flex items-center justify-center overflow-hidden">
                      {newUser.profilePhotoUrl ? (
                        <img 
                          src={newUser.profilePhotoUrl} 
                          alt="Profil" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                            if (nextElement) {
                              nextElement.style.display = 'flex';
                            }
                          }}
                        />
                      ) : (
                        <User className="w-8 h-8 text-slate-400" />
                      )}
                      {newUser.profilePhotoUrl && (
                        <div className="w-full h-full bg-slate-700/50 items-center justify-center hidden">
                          <User className="w-8 h-8 text-slate-400" />
                        </div>
                      )}
                    </div>
                    
                    {/* File Input */}
                    <div className="flex-1 space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              // Create temporary preview URL
                              const previewUrl = URL.createObjectURL(file);
                              setNewUser({ ...newUser, profilePhotoUrl: previewUrl });
                              
                              // Upload to Supabase Storage
                              const fileExt = file.name.split('.').pop();
                              const fileName = `temp-${Date.now()}.${fileExt}`;
                              
                              const { error } = await supabase.storage
                                .from('profile-photos')
                                .upload(fileName, file, {
                                  cacheControl: '3600',
                                  upsert: false
                                });

                              if (error) {
                                console.error('Upload error:', error);
                                alert('Fotoğraf yüklenirken hata oluştu: ' + error.message);
                                return;
                              }

                              // Get public URL
                              const { data: { publicUrl } } = supabase.storage
                                .from('profile-photos')
                                .getPublicUrl(fileName);

                              // Update with Supabase URL
                              setNewUser({ ...newUser, profilePhotoUrl: publicUrl });
                              
                              // Clean up preview URL
                              URL.revokeObjectURL(previewUrl);
                            } catch (error) {
                              console.error('Error uploading file:', error);
                              alert('Fotoğraf yüklenirken hata oluştu.');
                            }
                          }
                        }}
                        className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-500 file:text-white hover:file:bg-blue-600 file:cursor-pointer"
                      />
                      <p className="text-xs text-slate-500">
                        Fotoğraf Supabase Storage'a yüklenecek. Maksimum 5MB.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Acil Durum Kişisi</label>
                  <input
                    type="text"
                    value={newUser.emergencyContactName}
                    onChange={(e) => setNewUser({ ...newUser, emergencyContactName: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="Ahmet Yılmaz"
                  />
                </div>

                {/* Emergency Contact Phone */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Acil Durum Telefonu</label>
                  <input
                    type="tel"
                    value={newUser.emergencyContactPhone}
                    onChange={(e) => setNewUser({ ...newUser, emergencyContactPhone: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="+90 555 123 4567"
                  />
                </div>

                {/* Emergency Contact Relation */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Yakınlık Derecesi</label>
                  <input
                    type="text"
                    value={newUser.emergencyContactRelation}
                    onChange={(e) => setNewUser({ ...newUser, emergencyContactRelation: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="Eş, Kardeş, Anne, Baba"
                  />
                </div>

                {/* Education Level */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Eğitim Seviyesi</label>
                  <select
                    value={newUser.educationLevel}
                    onChange={(e) => setNewUser({ ...newUser, educationLevel: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  >
                    <option value="">Seçiniz</option>
                    <option value="İlkokul">İlkokul</option>
                    <option value="Ortaokul">Ortaokul</option>
                    <option value="Lise">Lise</option>
                    <option value="Ön Lisans">Ön Lisans</option>
                    <option value="Lisans">Lisans</option>
                    <option value="Yüksek Lisans">Yüksek Lisans</option>
                    <option value="Doktora">Doktora</option>
                  </select>
                </div>

                {/* Education School */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Okul Adı</label>
                  <input
                    type="text"
                    value={newUser.educationSchool}
                    onChange={(e) => setNewUser({ ...newUser, educationSchool: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="İstanbul Üniversitesi"
                  />
                </div>

                {/* Education Field */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Eğitim Alanı</label>
                  <input
                    type="text"
                    value={newUser.educationField}
                    onChange={(e) => setNewUser({ ...newUser, educationField: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="Bilgisayar Mühendisliği"
                  />
                </div>

                {/* Education Year */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Mezuniyet Yılı</label>
                  <input
                    type="number"
                    value={newUser.educationYear}
                    onChange={(e) => setNewUser({ ...newUser, educationYear: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="2020"
                    min="1950"
                    max="2030"
                  />
                </div>

                {/* Reference Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Referans Kişi</label>
                  <input
                    type="text"
                    value={newUser.referenceName}
                    onChange={(e) => setNewUser({ ...newUser, referenceName: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="Mehmet Demir"
                  />
                </div>

                {/* Reference Phone */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Referans Telefon</label>
                  <input
                    type="tel"
                    value={newUser.referencePhone}
                    onChange={(e) => setNewUser({ ...newUser, referencePhone: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="+90 555 987 6543"
                  />
                </div>

                {/* Reference Company */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Referans Şirket</label>
                  <input
                    type="text"
                    value={newUser.referenceCompany}
                    onChange={(e) => setNewUser({ ...newUser, referenceCompany: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="ABC Teknoloji"
                  />
                </div>

                {/* Work Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Çalışma Tipi</label>
                  <select
                    value={newUser.workType}
                    onChange={(e) => setNewUser({ ...newUser, workType: e.target.value as any })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  >
                    <option value="full_time">Tam Zamanlı</option>
                    <option value="part_time">Yarı Zamanlı</option>
                    <option value="intern">Stajyer</option>
                    <option value="contract">Sözleşmeli</option>
                  </select>
                </div>

                {/* Salary */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Maaş (TL)</label>
                  <input
                    type="number"
                    value={newUser.salary}
                    onChange={(e) => setNewUser({ ...newUser, salary: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="15000"
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* IBAN */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">IBAN</label>
                  <input
                    type="text"
                    value={newUser.iban}
                    onChange={(e) => setNewUser({ ...newUser, iban: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="TR33 0006 1005 1978 6457 8413 26"
                    maxLength={34}
                  />
                </div>

                {/* Bank Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Banka Adı</label>
                  <input
                    type="text"
                    value={newUser.bankName}
                    onChange={(e) => setNewUser({ ...newUser, bankName: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="Türkiye İş Bankası"
                  />
                </div>

                {/* Manager */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Yöneticisi</label>
                  <select
                    value={newUser.managerId}
                    onChange={(e) => setNewUser({ ...newUser, managerId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  >
                    <option value="">Yönetici Seçiniz</option>
                    {users.filter(u => u.status === 'active' && u.is_leader === true).map(manager => (
                      <option key={manager.id} value={manager.id}>
                        {manager.first_name} {manager.last_name} ({manager.personnel_number})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Authority Level */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Yetki Seviyesi</label>
                  <select
                    value={newUser.authorityLevel}
                      onChange={(e) => setNewUser({ ...newUser, authorityLevel: e.target.value as 'employee' | 'team_lead' | 'manager' | 'director' | 'admin' })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  >
                    <option value="employee">Çalışan</option>
                    <option value="team_lead">Takım Lideri</option>
                    <option value="manager">Yönetici</option>
                    <option value="director">Direktör</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {/* Is Leader */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Lider mi?</label>
                  <div className="flex items-center gap-4 mt-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="isLeader"
                        checked={newUser.isLeader === true}
                        onChange={() => setNewUser({ ...newUser, isLeader: true })}
                        className="w-4 h-4 text-blue-500 bg-slate-700 border-slate-600 focus:ring-blue-500"
                      />
                      <span className="text-slate-300">Evet</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="isLeader"
                        checked={newUser.isLeader === false}
                        onChange={() => setNewUser({ ...newUser, isLeader: false })}
                        className="w-4 h-4 text-blue-500 bg-slate-700 border-slate-600 focus:ring-blue-500"
                      />
                      <span className="text-slate-300">Hayır</span>
                    </label>
                  </div>
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Kısa Adres</label>
                  <textarea
                    value={newUser.address}
                    onChange={(e) => setNewUser({ ...newUser, address: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none"
                    rows={2}
                    placeholder="İstanbul, Türkiye"
                  />
                </div>

                {/* Full Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Açık Adres</label>
                  <textarea
                    value={newUser.fullAddress}
                    onChange={(e) => setNewUser({ ...newUser, fullAddress: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none"
                    rows={3}
                    placeholder="Atatürk Mahallesi, Cumhuriyet Caddesi No:123 Daire:5, Kadıköy/İstanbul"
                  />
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
                  onClick={handleCreateUser}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Kullanıcı Oluştur
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Kullanıcı Düzenle</h3>
                <button
                  onClick={() => setEditingUser(null)}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Personnel Number */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Personel No</label>
                  <input
                    type="text"
                    value={editingUser.personnel_number}
                    disabled
                    className="w-full px-4 py-3 bg-slate-700/30 border border-slate-600/50 rounded-xl text-slate-400 cursor-not-allowed"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Durum</label>
                  <select
                    value={editingUser.status}
                    onChange={(e) => {
                      const newStatus = e.target.value as 'active' | 'inactive';
                      if (newStatus === 'inactive' && editingUser.status === 'active') {
                        // Pasife çevirme onayı iste
                        setDeactivatingUser(editingUser);
                        setEndDate(new Date().toISOString().split('T')[0]);
                      } else {
                        setEditingUser({ ...editingUser, status: newStatus });
                      }
                    }}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Pasif</option>
                  </select>
                </div>

                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Ad</label>
                  <input
                    type="text"
                    value={editingUser.first_name}
                    onChange={(e) => setEditingUser({ ...editingUser, first_name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Soyad</label>
                  <input
                    type="text"
                    value={editingUser.last_name}
                    onChange={(e) => setEditingUser({ ...editingUser, last_name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">E-posta</label>
                  <input
                    type="email"
                    value={editingUser.email || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Telefon</label>
                  <input
                    type="tel"
                    value={editingUser.phone || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Departman</label>
                  <select
                    value={editingUser.department_id || ''}
                    onChange={(e) => {
                      const selectedDept = departments.find(d => d.id === e.target.value);
                      setEditingUser({ 
                        ...editingUser, 
                        department_id: e.target.value,
                        department: selectedDept?.name || '',
                        position_id: '', // Reset position when department changes
                        position: ''
                      });
                    }}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  >
                    <option value="">Departman Seçiniz</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                {/* Position */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Pozisyon</label>
                  <select
                    value={editingUser.position_id || ''}
                    onChange={(e) => {
                      const selectedPos = positions.find(p => p.id === e.target.value);
                      setEditingUser({ 
                        ...editingUser, 
                        position_id: e.target.value,
                        position: selectedPos?.name || ''
                      });
                    }}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    disabled={!editingUser.department_id}
                  >
                    <option value="">Pozisyon Seçiniz</option>
                    {positions
                      .filter(pos => pos.department_id === editingUser.department_id)
                      .map(pos => (
                        <option key={pos.id} value={pos.id}>{pos.name}</option>
                      ))}
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Başlangıç Tarihi</label>
                  <input
                    type="date"
                    value={editingUser.start_date || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, start_date: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Cinsiyet</label>
                  <select
                    value={editingUser.gender || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, gender: (e.target.value as 'male' | 'female' | 'other') || undefined })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  >
                    <option value="">Seçiniz</option>
                    <option value="male">Erkek</option>
                    <option value="female">Kadın</option>
                    <option value="other">Diğer</option>
                  </select>
                </div>

                {/* Birth Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Doğum Tarihi</label>
                  <input
                    type="date"
                    value={editingUser.birth_date || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, birth_date: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>

                {/* Birth Place */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Doğum Yeri</label>
                  <input
                    type="text"
                    value={editingUser.birth_place || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, birth_place: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>

                {/* National ID */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">TC Kimlik No</label>
                  <input
                    type="text"
                    value={editingUser.national_id || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, national_id: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    maxLength={11}
                  />
                </div>

                {/* Marital Status */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Medeni Durum</label>
                  <select
                    value={editingUser.marital_status || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, marital_status: (e.target.value as 'single' | 'married' | 'divorced' | 'widowed') || undefined })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  >
                    <option value="">Seçiniz</option>
                    <option value="single">Bekar</option>
                    <option value="married">Evli</option>
                    <option value="divorced">Boşanmış</option>
                    <option value="widowed">Dul</option>
                  </select>
                </div>

                {/* Blood Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Kan Grubu</label>
                  <select
                    value={editingUser.blood_type || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, blood_type: (e.target.value as 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-') || undefined })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  >
                    <option value="">Seçiniz</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                {/* Work Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Çalışma Tipi</label>
                  <select
                    value={editingUser.work_type || 'full_time'}
                    onChange={(e) => setEditingUser({ ...editingUser, work_type: e.target.value as 'full_time' | 'part_time' | 'intern' | 'contract' })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  >
                    <option value="full_time">Tam Zamanlı</option>
                    <option value="part_time">Yarı Zamanlı</option>
                    <option value="intern">Stajyer</option>
                    <option value="contract">Sözleşmeli</option>
                  </select>
                </div>

                {/* Manager */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Yöneticisi</label>
                  <select
                    value={editingUser.manager_id || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, manager_id: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  >
                    <option value="">Yönetici Seçiniz</option>
                    {users.filter(u => u.status === 'active' && u.is_leader === true && u.id !== editingUser.id).map(manager => (
                      <option key={manager.id} value={manager.id}>
                        {manager.first_name} {manager.last_name} ({manager.personnel_number})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Authority Level */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Yetki Seviyesi</label>
                  <select
                    value={editingUser.authority_level || 'employee'}
                    onChange={(e) => setEditingUser({ ...editingUser, authority_level: e.target.value as 'employee' | 'team_lead' | 'manager' | 'director' | 'admin' })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  >
                    <option value="employee">Çalışan</option>
                    <option value="team_lead">Takım Lideri</option>
                    <option value="manager">Yönetici</option>
                    <option value="director">Direktör</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {/* Is Leader */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Lider mi?</label>
                  <div className="flex items-center gap-4 mt-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="editIsLeader"
                        checked={editingUser.is_leader === true}
                        onChange={() => setEditingUser({ ...editingUser, is_leader: true })}
                        className="w-4 h-4 text-blue-500 bg-slate-700 border-slate-600 focus:ring-blue-500"
                      />
                      <span className="text-slate-300">Evet</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="editIsLeader"
                        checked={editingUser.is_leader === false}
                        onChange={() => setEditingUser({ ...editingUser, is_leader: false })}
                        className="w-4 h-4 text-blue-500 bg-slate-700 border-slate-600 focus:ring-blue-500"
                      />
                      <span className="text-slate-300">Hayır</span>
                    </label>
                  </div>
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Kısa Adres</label>
                  <textarea
                    value={editingUser.address || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, address: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none"
                    rows={2}
                  />
                </div>

                {/* Profile Photo */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Profil Fotoğrafı</label>
                  <div className="flex items-center gap-4">
                    {/* Photo Preview */}
                    <div className="w-20 h-20 bg-slate-700/50 rounded-xl border border-slate-600 flex items-center justify-center overflow-hidden">
                      {editingUser.profile_photo_url ? (
                        <img 
                          src={editingUser.profile_photo_url} 
                          alt="Profil" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                            if (nextElement) {
                              nextElement.style.display = 'flex';
                            }
                          }}
                        />
                      ) : (
                        <User className="w-8 h-8 text-slate-400" />
                      )}
                      {editingUser.profile_photo_url && (
                        <div className="w-full h-full bg-slate-700/50 items-center justify-center hidden">
                          <User className="w-8 h-8 text-slate-400" />
                        </div>
                      )}
                    </div>
                    
                    {/* File Input */}
                    <div className="flex-1 space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              // Create temporary preview URL
                              const previewUrl = URL.createObjectURL(file);
                              setEditingUser({ ...editingUser, profile_photo_url: previewUrl });
                              
                              // Upload to Supabase Storage
                              const fileExt = file.name.split('.').pop();
                              const fileName = `${editingUser.id}/profile.${fileExt}`;
                              
                              // Remove old file if exists
                              await supabase.storage
                                .from('profile-photos')
                                .remove([fileName]);
                              
                              const { error } = await supabase.storage
                                .from('profile-photos')
                                .upload(fileName, file, {
                                  cacheControl: '3600',
                                  upsert: true
                                });

                              if (error) {
                                console.error('Upload error:', error);
                                alert('Fotoğraf yüklenirken hata oluştu: ' + error.message);
                                return;
                              }

                              // Get public URL
                              const { data: { publicUrl } } = supabase.storage
                                .from('profile-photos')
                                .getPublicUrl(fileName);

                              // Update with Supabase URL
                              setEditingUser({ ...editingUser, profile_photo_url: publicUrl });
                              
                              // Clean up preview URL
                              URL.revokeObjectURL(previewUrl);
                            } catch (error) {
                              console.error('Error uploading file:', error);
                              alert('Fotoğraf yüklenirken hata oluştu.');
                            }
                          }
                        }}
                        className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-500 file:text-white hover:file:bg-blue-600 file:cursor-pointer"
                      />
                      <p className="text-xs text-slate-500">
                        Fotoğraf Supabase Storage'a yüklenecek. Maksimum 5MB.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Acil Durum Kişisi</label>
                  <input
                    type="text"
                    value={editingUser.emergency_contact_name || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, emergency_contact_name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="Ahmet Yılmaz"
                  />
                </div>

                {/* Emergency Contact Phone */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Acil Durum Telefonu</label>
                  <input
                    type="tel"
                    value={editingUser.emergency_contact_phone || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, emergency_contact_phone: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="+90 555 123 4567"
                  />
                </div>

                {/* Emergency Contact Relation */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Yakınlık Derecesi</label>
                  <input
                    type="text"
                    value={editingUser.emergency_contact_relation || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, emergency_contact_relation: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="Eş, Kardeş, Anne, Baba"
                  />
                </div>

                {/* Education Level */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Eğitim Seviyesi</label>
                  <select
                    value={editingUser.education_level || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, education_level: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  >
                    <option value="">Seçiniz</option>
                    <option value="İlkokul">İlkokul</option>
                    <option value="Ortaokul">Ortaokul</option>
                    <option value="Lise">Lise</option>
                    <option value="Ön Lisans">Ön Lisans</option>
                    <option value="Lisans">Lisans</option>
                    <option value="Yüksek Lisans">Yüksek Lisans</option>
                    <option value="Doktora">Doktora</option>
                  </select>
                </div>

                {/* Education School */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Okul Adı</label>
                  <input
                    type="text"
                    value={editingUser.education_school || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, education_school: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="İstanbul Üniversitesi"
                  />
                </div>

                {/* Education Field */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Eğitim Alanı</label>
                  <input
                    type="text"
                    value={editingUser.education_field || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, education_field: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="Bilgisayar Mühendisliği"
                  />
                </div>

                {/* Education Year */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Mezuniyet Yılı</label>
                  <input
                    type="number"
                    value={editingUser.education_year || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, education_year: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="2020"
                    min="1950"
                    max="2030"
                  />
                </div>

                {/* Reference Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Referans Kişi</label>
                  <input
                    type="text"
                    value={editingUser.reference_name || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, reference_name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="Mehmet Demir"
                  />
                </div>

                {/* Reference Phone */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Referans Telefon</label>
                  <input
                    type="tel"
                    value={editingUser.reference_phone || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, reference_phone: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="+90 555 987 6543"
                  />
                </div>

                {/* Reference Company */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Referans Şirket</label>
                  <input
                    type="text"
                    value={editingUser.reference_company || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, reference_company: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="ABC Teknoloji"
                  />
                </div>

                {/* Salary */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Maaş (TL)</label>
                  <input
                    type="number"
                    value={editingUser.salary || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, salary: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="15000"
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* IBAN */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">IBAN</label>
                  <input
                    type="text"
                    value={editingUser.iban || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, iban: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="TR33 0006 1005 1978 6457 8413 26"
                    maxLength={34}
                  />
                </div>

                {/* Bank Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Banka Adı</label>
                  <input
                    type="text"
                    value={editingUser.bank_name || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, bank_name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="Türkiye İş Bankası"
                  />
                </div>

                {/* Full Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Açık Adres</label>
                  <textarea
                    value={editingUser.full_address || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, full_address: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none"
                    rows={3}
                    placeholder="Atatürk Mahallesi, Cumhuriyet Caddesi No:123 Daire:5, Kadıköy/İstanbul"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-700/50">
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={() => setShowUpdateConfirm(true)}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 font-medium"
                >
                  <Save className="w-4 h-4" />
                  Güncelle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Confirmation Modal */}
      {showUpdateConfirm && editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-md w-full">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Güncelleme Onayı</h3>
                <button
                  onClick={() => setShowUpdateConfirm(false)}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="mb-6">
                <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Save className="w-8 h-8 text-blue-400" />
                </div>
                <h4 className="text-lg font-semibold text-white text-center mb-2">
                  {editingUser.first_name} {editingUser.last_name}
                </h4>
                <p className="text-slate-400 text-center mb-4">
                  Bu personelin bilgilerini güncellemek istediğinizden emin misiniz? Yapılan değişiklikler kaydedilecektir.
                </p>
              </div>

              {/* Info */}
              <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <p className="text-blue-400 text-sm">
                  ℹ️ Güncelleme işlemi tamamlandıktan sonra değişiklikler anında yansıyacaktır.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-700/50">
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowUpdateConfirm(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleUpdateUser}
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
                      Onayla ve Güncelle
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate User Confirmation Modal */}
      {deactivatingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-md w-full">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Personeli Pasife Al</h3>
                <button
                  onClick={() => setDeactivatingUser(null)}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="mb-6">
                <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-red-400" />
                </div>
                <h4 className="text-lg font-semibold text-white text-center mb-2">
                  {deactivatingUser.first_name} {deactivatingUser.last_name}
                </h4>
                <p className="text-slate-400 text-center mb-4">
                  Bu personeli pasife almak istediğinizden emin misiniz? Bu işlem personelin işten çıktığı anlamına gelir.
                </p>
                
                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">İşten Çıkış Tarihi *</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
                    required
                  />
                </div>
              </div>

              {/* Warning */}
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 text-sm">
                  ⚠️ Bu işlem geri alınamaz. Personel pasife alındıktan sonra sisteme giriş yapamayacaktır.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-700/50">
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeactivatingUser(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleDeactivateUser}
                  disabled={isLoading || !endDate}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      İşleniyor...
                    </>
                  ) : (
                    <>
                      <User className="w-4 h-4" />
                      Pasife Al
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View User Details Modal */}
      {viewingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center">
                    {viewingUser.profile_photo_url ? (
                      <img 
                        src={viewingUser.profile_photo_url} 
                        alt={`${viewingUser.first_name} ${viewingUser.last_name}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fotoğraf yüklenemezse baş harfleri göster
                          const target = e.currentTarget;
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `
                              <div class="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                                ${viewingUser.first_name[0]}${viewingUser.last_name[0]}
                              </div>
                            `;
                          }
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                        {viewingUser.first_name[0]}{viewingUser.last_name[0]}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{viewingUser.first_name} {viewingUser.last_name}</h3>
                    <p className="text-slate-400">{viewingUser.personnel_number} • {getPositionName(viewingUser.position_id) || viewingUser.position}</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingUser(null)}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Kişisel Bilgiler */}
                <div className="bg-slate-700/30 rounded-xl p-4">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-400" />
                    Kişisel Bilgiler
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-slate-400 text-sm">TC Kimlik No:</span>
                      {renderSensitiveField(viewingUser.national_id, `tc-${viewingUser.id}`, '••••••••••')}
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Cinsiyet:</span>
                      <p className="text-white">
                        {viewingUser.gender === 'male' ? 'Erkek' : 
                         viewingUser.gender === 'female' ? 'Kadın' : 
                         viewingUser.gender === 'other' ? 'Diğer' : '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Doğum Tarihi:</span>
                      <p className="text-white">{viewingUser.birth_date || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Doğum Yeri:</span>
                      <p className="text-white">{viewingUser.birth_place || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Medeni Durum:</span>
                      <p className="text-white">
                        {viewingUser.marital_status === 'single' ? 'Bekar' :
                         viewingUser.marital_status === 'married' ? 'Evli' :
                         viewingUser.marital_status === 'divorced' ? 'Boşanmış' :
                         viewingUser.marital_status === 'widowed' ? 'Dul' : '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Kan Grubu:</span>
                      <p className="text-white">{viewingUser.blood_type || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* İletişim Bilgileri */}
                <div className="bg-slate-700/30 rounded-xl p-4">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Phone className="w-5 h-5 text-green-400" />
                    İletişim Bilgileri
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-slate-400 text-sm">E-posta:</span>
                      <p className="text-white">{viewingUser.email || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Telefon:</span>
                      <p className="text-white">{viewingUser.phone || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Kısa Adres:</span>
                      <p className="text-white">{viewingUser.address || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Açık Adres:</span>
                      <p className="text-white">{viewingUser.full_address || '-'}</p>
                    </div>
                  </div>

                  <h5 className="text-md font-semibold text-white mt-6 mb-3">Acil Durum</h5>
                  <div className="space-y-3">
                    <div>
                      <span className="text-slate-400 text-sm">Kişi:</span>
                      <p className="text-white">{viewingUser.emergency_contact_name || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Telefon:</span>
                      <p className="text-white">{viewingUser.emergency_contact_phone || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Yakınlık:</span>
                      <p className="text-white">{viewingUser.emergency_contact_relation || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* İş Bilgileri */}
                <div className="bg-slate-700/30 rounded-xl p-4">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-purple-400" />
                    İş Bilgileri
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-slate-400 text-sm">Departman:</span>
                      <p className="text-white">{getDepartmentName(viewingUser.department_id) || viewingUser.department || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Pozisyon:</span>
                      <p className="text-white">{getPositionName(viewingUser.position_id) || viewingUser.position || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Başlangıç Tarihi:</span>
                      <p className="text-white">{viewingUser.start_date || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Çalışma Tipi:</span>
                      <p className="text-white">
                        {viewingUser.work_type === 'full_time' ? 'Tam Zamanlı' :
                         viewingUser.work_type === 'part_time' ? 'Yarı Zamanlı' :
                         viewingUser.work_type === 'intern' ? 'Stajyer' :
                         viewingUser.work_type === 'contract' ? 'Sözleşmeli' : '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Yetki Seviyesi:</span>
                      <p className="text-white">
                        {viewingUser.authority_level === 'employee' ? 'Çalışan' :
                         viewingUser.authority_level === 'team_lead' ? 'Takım Lideri' :
                         viewingUser.authority_level === 'manager' ? 'Yönetici' :
                         viewingUser.authority_level === 'director' ? 'Direktör' :
                         viewingUser.authority_level === 'admin' ? 'Admin' : '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Lider mi?:</span>
                      <p className="text-white">{viewingUser.is_leader ? 'Evet' : 'Hayır'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Yöneticisi:</span>
                      <p className="text-white">
                        {viewingUser.manager_id ? 
                          users.find(u => u.id === viewingUser.manager_id)?.first_name + ' ' + 
                          users.find(u => u.id === viewingUser.manager_id)?.last_name || '-' : '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Durum:</span>
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        viewingUser.status === 'active' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {viewingUser.status === 'active' ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Eğitim Bilgileri */}
                <div className="bg-slate-700/30 rounded-xl p-4">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-yellow-400" />
                    Eğitim Bilgileri
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-slate-400 text-sm">Seviye:</span>
                      <p className="text-white">{viewingUser.education_level || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Okul:</span>
                      <p className="text-white">{viewingUser.education_school || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Alan:</span>
                      <p className="text-white">{viewingUser.education_field || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Mezuniyet Yılı:</span>
                      <p className="text-white">{viewingUser.education_year || '-'}</p>
                    </div>
                  </div>

                  <h5 className="text-md font-semibold text-white mt-6 mb-3">Referans</h5>
                  <div className="space-y-3">
                    <div>
                      <span className="text-slate-400 text-sm">Kişi:</span>
                      <p className="text-white">{viewingUser.reference_name || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Telefon:</span>
                      <p className="text-white">{viewingUser.reference_phone || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Şirket:</span>
                      <p className="text-white">{viewingUser.reference_company || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Finansal Bilgiler */}
                <div className="bg-slate-700/30 rounded-xl p-4">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Hash className="w-5 h-5 text-green-400" />
                    Finansal Bilgiler
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-slate-400 text-sm">Maaş:</span>
                      {renderSensitiveField(
                        viewingUser.salary ? `${viewingUser.salary.toLocaleString('tr-TR')} TL` : null, 
                        `salary-${viewingUser.id}`, 
                        '••••••• TL'
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">IBAN:</span>
                      {renderSensitiveField(viewingUser.iban, `iban-${viewingUser.id}`, 'TR•• •••• •••• •••• •••• ••')}
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Banka:</span>
                      <p className="text-white">{viewingUser.bank_name || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Profil Fotoğrafı */}
                <div className="bg-slate-700/30 rounded-xl p-4">
                  <h4 className="text-lg font-semibold text-white mb-4">Profil Fotoğrafı</h4>
                  <div className="flex justify-center">
                    <div className="w-32 h-32 bg-slate-700/50 rounded-xl border border-slate-600 flex items-center justify-center overflow-hidden">
                      {viewingUser.profile_photo_url ? (
                        <img 
                          src={viewingUser.profile_photo_url} 
                          alt="Profil" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                            if (nextElement) {
                              nextElement.style.display = 'flex';
                            }
                          }}
                        />
                      ) : (
                        <User className="w-16 h-16 text-slate-400" />
                      )}
                      {viewingUser.profile_photo_url && (
                        <div className="w-full h-full bg-slate-700/50 items-center justify-center hidden">
                          <User className="w-16 h-16 text-slate-400" />
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
                  onClick={() => setViewingUser(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  Kapat
                </button>
                <button
                  onClick={() => {
                    setViewingUser(null);
                    handleEditUser(viewingUser);
                  }}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 font-medium"
                >
                  <Edit3 className="w-4 h-4" />
                  Düzenle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
