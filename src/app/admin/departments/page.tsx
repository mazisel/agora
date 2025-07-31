'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Department, Position } from '@/types';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Users,
  Briefcase,
  Save,
  X,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface DepartmentWithPositions extends Department {
  positions: Position[];
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<DepartmentWithPositions[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingDepartment, setIsCreatingDepartment] = useState(false);
  const [isCreatingPosition, setIsCreatingPosition] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [selectedDepartmentForPosition, setSelectedDepartmentForPosition] = useState<string>('');
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, loading } = useAuth();
  const router = useRouter();

  const [newDepartment, setNewDepartment] = useState({
    name: '',
    description: '',
    color: 'blue'
  });

  const [newPosition, setNewPosition] = useState({
    name: '',
    description: '',
    department_id: ''
  });

  // Fetch data from Supabase
  const fetchData = async () => {
    try {
      setIsLoading(true);
      
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

      // Combine departments with their positions
      const departmentsWithPositions: DepartmentWithPositions[] = (departmentsData || []).map(dept => ({
        ...dept,
        positions: (positionsData || []).filter(pos => pos.department_id === dept.id)
      }));

      setDepartments(departmentsWithPositions);
      setPositions(positionsData || []);
      
      // Expand all departments by default
      setExpandedDepartments(new Set(departmentsData?.map(d => d.id) || []));
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Veriler yüklenirken hata oluştu.');
      setIsLoading(false);
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Fetch data on component mount
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const colorOptions = [
    { value: 'blue', label: 'Mavi', class: 'bg-blue-500' },
    { value: 'purple', label: 'Mor', class: 'bg-purple-500' },
    { value: 'green', label: 'Yeşil', class: 'bg-green-500' },
    { value: 'red', label: 'Kırmızı', class: 'bg-red-500' },
    { value: 'yellow', label: 'Sarı', class: 'bg-yellow-500' },
    { value: 'pink', label: 'Pembe', class: 'bg-pink-500' },
    { value: 'indigo', label: 'İndigo', class: 'bg-indigo-500' },
    { value: 'cyan', label: 'Cyan', class: 'bg-cyan-500' }
  ];

  const getColorClass = (color: string) => {
    const colorMap: { [key: string]: string } = {
      blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      green: 'bg-green-500/20 text-green-400 border-green-500/30',
      red: 'bg-red-500/20 text-red-400 border-red-500/30',
      yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      pink: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      indigo: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
    };
    return colorMap[color] || colorMap.blue;
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (dept.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.positions.some(pos => 
      pos.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pos.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const toggleDepartment = (departmentId: string) => {
    const newExpanded = new Set(expandedDepartments);
    if (newExpanded.has(departmentId)) {
      newExpanded.delete(departmentId);
    } else {
      newExpanded.add(departmentId);
    }
    setExpandedDepartments(newExpanded);
  };

  const handleCreateDepartment = async () => {
    if (!newDepartment.name) return;

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('departments')
        .insert([{
          name: newDepartment.name,
          description: newDepartment.description,
          color: newDepartment.color
        }])
        .select()
        .single();

      if (error) throw error;

      // Refresh data to get the new department
      await fetchData();
      
      setNewDepartment({ name: '', description: '', color: 'blue' });
      setIsCreatingDepartment(false);
      setIsLoading(false);
    } catch (error) {
      console.error('Error creating department:', error);
      setError('Departman oluşturulurken hata oluştu.');
      setIsLoading(false);
    }
  };

  const handleCreatePosition = async () => {
    if (!newPosition.name || !newPosition.department_id) return;

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('positions')
        .insert([{
          name: newPosition.name,
          description: newPosition.description,
          department_id: newPosition.department_id
        }])
        .select()
        .single();

      if (error) throw error;

      // Refresh data to get the new position
      await fetchData();
      
      setNewPosition({ name: '', description: '', department_id: '' });
      setIsCreatingPosition(false);
      setSelectedDepartmentForPosition('');
      setIsLoading(false);
    } catch (error) {
      console.error('Error creating position:', error);
      setError('Pozisyon oluşturulurken hata oluştu.');
      setIsLoading(false);
    }
  };

  const handleDeleteDepartment = (id: string) => {
    setDepartments(departments.filter(dept => dept.id !== id));
  };

  const handleDeletePosition = (departmentId: string, positionId: string) => {
    setDepartments(departments.map(dept => 
      dept.id === departmentId 
        ? { ...dept, positions: dept.positions.filter(pos => pos.id !== positionId) }
        : dept
    ));
  };

  const handleEditDepartment = (department: Department) => {
    setEditingDepartment(department);
  };

  const handleUpdateDepartment = async () => {
    if (!editingDepartment) return;

    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('departments')
        .update({
          name: editingDepartment.name,
          description: editingDepartment.description,
          color: editingDepartment.color
        })
        .eq('id', editingDepartment.id);

      if (error) throw error;

      // Refresh data to get the updated department
      await fetchData();
      
      setEditingDepartment(null);
      setIsLoading(false);
    } catch (error) {
      console.error('Error updating department:', error);
      setError('Departman güncellenirken hata oluştu.');
      setIsLoading(false);
    }
  };

  const handleEditPosition = (position: Position) => {
    setEditingPosition(position);
  };

  const handleUpdatePosition = () => {
    if (!editingPosition) return;

    setDepartments(departments.map(dept => 
      dept.id === editingPosition.department_id 
        ? { 
            ...dept, 
            positions: dept.positions.map(pos => 
              pos.id === editingPosition.id ? editingPosition : pos
            )
          }
        : dept
    ));
    setEditingPosition(null);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Departman Yönetimi</h2>
            <p className="text-slate-400">Departmanları ve pozisyonları yönetin</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <span className="text-sm text-slate-300 font-medium">
                {departments.length} departman, {departments.reduce((acc, dept) => acc + dept.positions.length, 0)} pozisyon
              </span>
            </div>
            <button
              onClick={() => setIsCreatingPosition(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-medium"
            >
              <Briefcase className="w-4 h-4" />
              Yeni Pozisyon
            </button>
            <button
              onClick={() => setIsCreatingDepartment(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 font-medium"
            >
              <Plus className="w-4 h-4" />
              Yeni Departman
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
              placeholder="Departman veya pozisyon ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
            />
          </div>
        </div>

        {/* Departments List */}
        <div className="space-y-4">
          {filteredDepartments.map((department) => (
            <div
              key={department.id}
              className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden"
            >
              {/* Department Header */}
              <div className="p-6 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleDepartment(department.id)}
                      className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                    >
                      {expandedDepartments.has(department.id) ? (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      )}
                    </button>
                    <div className={`w-4 h-4 rounded-full ${colorOptions.find(c => c.value === department.color)?.class}`}></div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{department.name}</h3>
                      <p className="text-slate-400">{department.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`px-3 py-1 rounded-lg border ${getColorClass(department.color)}`}>
                      <span className="text-sm font-medium">{department.positions.length} pozisyon</span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedDepartmentForPosition(department.id);
                        setNewPosition({ ...newPosition, department_id: department.id });
                        setIsCreatingPosition(true);
                      }}
                      className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                    >
                      <Plus className="w-4 h-4 text-slate-400 hover:text-blue-400" />
                    </button>
                    <button
                      onClick={() => handleEditDepartment(department)}
                      className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                    >
                      <Edit3 className="w-4 h-4 text-slate-400 hover:text-blue-400" />
                    </button>
                    <button
                      onClick={() => handleDeleteDepartment(department.id)}
                      className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Positions */}
              {expandedDepartments.has(department.id) && (
                <div className="p-6">
                  {department.positions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {department.positions.map((position) => (
                        <div
                          key={position.id}
                          className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30 hover:border-slate-500/50 transition-all group"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Briefcase className="w-4 h-4 text-slate-400" />
                              <h4 className="font-semibold text-white">{position.name}</h4>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEditPosition(position)}
                                className="p-1 rounded hover:bg-slate-600/50 transition-colors"
                              >
                                <Edit3 className="w-3 h-3 text-slate-400 hover:text-blue-400" />
                              </button>
                              <button
                                onClick={() => handleDeletePosition(department.id, position.id)}
                                className="p-1 rounded hover:bg-slate-600/50 transition-colors"
                              >
                                <Trash2 className="w-3 h-3 text-slate-400 hover:text-red-400" />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-slate-400">{position.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">Bu departmanda henüz pozisyon yok</p>
                      <button
                        onClick={() => {
                          setSelectedDepartmentForPosition(department.id);
                          setNewPosition({ ...newPosition, department_id: department.id });
                          setIsCreatingPosition(true);
                        }}
                        className="mt-3 px-4 py-2 bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-600/50 transition-colors"
                      >
                        İlk pozisyonu ekle
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredDepartments.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {searchTerm ? 'Departman Bulunamadı' : 'Henüz Departman Yok'}
            </h3>
            <p className="text-slate-400 mb-6">
              {searchTerm ? 'Arama kriterlerinize uygun departman bulunamadı' : 'İlk departmanı oluşturun'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setIsCreatingDepartment(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 font-medium"
              >
                İlk Departmanı Oluştur
              </button>
            )}
          </div>
        )}

      {/* Create Department Modal */}
      {isCreatingDepartment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-md w-full">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Yeni Departman</h3>
                <button
                  onClick={() => setIsCreatingDepartment(false)}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="space-y-4">
                {/* Department Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Departman Adı *</label>
                  <input
                    type="text"
                    value={newDepartment.name}
                    onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="Bilgi Teknolojileri"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Açıklama</label>
                  <textarea
                    value={newDepartment.description}
                    onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none"
                    rows={3}
                    placeholder="Departman açıklaması..."
                  />
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Renk</label>
                  <div className="grid grid-cols-4 gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setNewDepartment({ ...newDepartment, color: color.value })}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          newDepartment.color === color.value 
                            ? 'border-white' 
                            : 'border-transparent hover:border-slate-500'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full ${color.class} mx-auto`}></div>
                        <span className="text-xs text-slate-400 mt-1 block">{color.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-700/50">
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsCreatingDepartment(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleCreateDepartment}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 font-medium"
                >
                  <Save className="w-4 h-4" />
                  Departman Oluştur
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Position Modal */}
      {isCreatingPosition && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-md w-full">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Yeni Pozisyon</h3>
                <button
                  onClick={() => setIsCreatingPosition(false)}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="space-y-4">
                {/* Department Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Departman *</label>
                  <select
                    value={newPosition.department_id}
                    onChange={(e) => setNewPosition({ ...newPosition, department_id: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    required
                  >
                    <option value="">Departman seçin</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                {/* Position Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Pozisyon Adı *</label>
                  <input
                    type="text"
                    value={newPosition.name}
                    onChange={(e) => setNewPosition({ ...newPosition, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="Software Developer"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Açıklama</label>
                  <textarea
                    value={newPosition.description}
                    onChange={(e) => setNewPosition({ ...newPosition, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none"
                    rows={3}
                    placeholder="Pozisyon açıklaması..."
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-700/50">
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsCreatingPosition(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleCreatePosition}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-medium"
                >
                  <Save className="w-4 h-4" />
                  Pozisyon Oluştur
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {editingDepartment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-md w-full">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Departman Düzenle</h3>
                <button
                  onClick={() => setEditingDepartment(null)}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="space-y-4">
                {/* Department Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Departman Adı</label>
                  <input
                    type="text"
                    value={editingDepartment.name}
                    onChange={(e) => setEditingDepartment({ ...editingDepartment, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Açıklama</label>
                  <textarea
                    value={editingDepartment.description}
                    onChange={(e) => setEditingDepartment({ ...editingDepartment, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none"
                    rows={3}
                  />
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Renk</label>
                  <div className="grid grid-cols-4 gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setEditingDepartment({ ...editingDepartment, color: color.value })}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          editingDepartment.color === color.value 
                            ? 'border-white' 
                            : 'border-transparent hover:border-slate-500'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full ${color.class} mx-auto`}></div>
                        <span className="text-xs text-slate-400 mt-1 block">{color.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-700/50">
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setEditingDepartment(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleUpdateDepartment}
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

      {/* Edit Position Modal */}
      {editingPosition && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-md w-full">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Pozisyon Düzenle</h3>
                <button
                  onClick={() => setEditingPosition(null)}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="space-y-4">
                {/* Position Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Pozisyon Adı</label>
                  <input
                    type="text"
                    value={editingPosition.name}
                    onChange={(e) => setEditingPosition({ ...editingPosition, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Açıklama</label>
                  <textarea
                    value={editingPosition.description}
                    onChange={(e) => setEditingPosition({ ...editingPosition, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-700/50">
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setEditingPosition(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleUpdatePosition}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-medium"
                >
                  <Save className="w-4 h-4" />
                  Güncelle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
