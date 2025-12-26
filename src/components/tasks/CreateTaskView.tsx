'use client';

import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { Project, UserProfile } from '@/types';

interface CreateTaskViewProps {
  onClose: () => void;
  onSave: (newTask: any) => Promise<void>;
  projects: Project[];
  users: {
    id: string;
    first_name: string;
    last_name: string;
    personnel_number: string;
    position?: string;
  }[];
}

export default function CreateTaskView({ onClose, onSave, projects, users }: CreateTaskViewProps) {
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

  const handleSave = () => {
    const hasTitle = Boolean(newTask.title?.toString().trim());
    const hasProject = Boolean((newTask.project_id ?? '').toString().trim());

    if (!hasTitle || !hasProject) {
      console.warn('Görev oluşturma validasyonu başarısız (mobile view)', {
        title: newTask.title,
        project_id: newTask.project_id,
      });
      alert('Başlık ve proje seçimi zorunludur.');
      return;
    }
    onSave(newTask);
  };

  return (
    <div className="w-full h-full bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 bg-slate-800/50 border-b border-slate-700/50 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Yeni Görev Oluştur</h3>
          <p className="text-sm text-slate-400">Görev bilgilerini girin</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-white">
            <X className="w-5 h-5" />
          </button>
          <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">
            <Save className="w-4 h-4" />
            Kaydet
          </button>
        </div>
      </div>

      {/* Form Content */}
      <div className="p-4 overflow-y-auto flex-1 pb-24">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Başlık *</label>
            <input
              type="text"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              placeholder="Görev başlığını girin"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Açıklama</label>
            <textarea
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              className="w-full px-3 py-2 h-24 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              placeholder="Görev açıklamasını girin"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Proje *</label>
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

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Sorumlu Kişiler</label>

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

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Bilgi Kişileri</label>

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

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Öncelik</label>
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

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Son Teslim Tarihi</label>
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
  );
}
