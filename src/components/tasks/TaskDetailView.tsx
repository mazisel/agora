'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, User, Calendar, MessageSquare, Paperclip, CheckCircle2, Eye, X, Send, Download, AlertCircle, FileText, Users, Image, Smile, Save, XCircle, Edit3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Task, UserProfile, TaskComment, TaskAttachment } from '@/types';

interface TaskDetailViewProps {
  task: Task;
  onClose: () => void;
  onUpdateTaskStatus: (taskId: string, newStatus: string) => Promise<void>;
  fetchTaskDetails: (taskId: string) => Promise<void>;
  taskComments: TaskComment[];
  taskAttachments: TaskAttachment[];
  setTaskComments: React.Dispatch<React.SetStateAction<TaskComment[]>>;
  setTaskAttachments: React.Dispatch<React.SetStateAction<TaskAttachment[]>>;
}

export default function TaskDetailView({
  task,
  onClose,
  onUpdateTaskStatus,
  fetchTaskDetails,
  taskComments,
  taskAttachments,
  setTaskComments,
  setTaskAttachments,
}: TaskDetailViewProps) {
  const { userProfile } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingTask, setEditingTask] = useState<{
    status: string;
  }>({ status: task.status });

  useEffect(() => {
    fetchTaskDetails(task.id);
  }, [task.id]);

  const handleAddComment = async (taskId: string) => {
    if (!newComment.trim()) return;

    try {
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
    setIsEditing(true);
    setEditingTask({ status: task.status });
  };

  const handleSaveEdit = async () => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: editingTask.status,
          completed_at: editingTask.status === 'done' ? new Date().toISOString() : null
        })
        .eq('id', task.id);

      if (error) throw error;

      // Re-fetch details to update the view with fresh data including completed_at
      await fetchTaskDetails(task.id);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingTask({ status: task.status });
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && task.status !== 'done';
  };

  return (
    <div className="absolute inset-0 bg-slate-900 z-40 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 bg-slate-800/50 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h3 className="text-lg font-bold text-white">{task.title}</h3>
            <p className="text-sm text-slate-400">{task.project?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              onClick={handleEditTask}
              className="p-2 text-slate-300 hover:text-white"
            >
              <Edit3 className="w-5 h-5" />
            </button>
          ) : (
            <>
              <button
                onClick={handleSaveEdit}
                className="p-2 text-green-400 hover:text-green-300"
              >
                <Save className="w-5 h-5" />
              </button>
              <button
                onClick={handleCancelEdit}
                className="p-2 text-red-400 hover:text-red-300"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto flex-1 pb-24">
        <div className="space-y-6">
          {/* Status and Priority */}
          <div className="flex items-center gap-3">
            {isEditing ? (
              <select
                value={editingTask.status}
                onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}
                className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              >
                <option value="todo">Yeni</option>
                <option value="in_progress">Devam Ediyor</option>
                <option value="review">İnceleme</option>
                <option value="done">Tamamlandı</option>
                <option value="cancelled">İptal</option>
              </select>
            ) : (
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-sm font-medium ${getStatusColor(task.status)}`}>
                {getStatusIcon(task.status)}
                {getStatusLabel(task.status)}
              </span>
            )}
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-sm font-medium ${getPriorityColor(task.priority)}`}>
              {getPriorityLabel(task.priority)}
            </span>
            {!isEditing && task.status !== 'done' && task.status !== 'cancelled' && (
              <button
                onClick={async () => {
                  await onUpdateTaskStatus(task.id, 'done');
                  // No need to update viewingTask here, parent will re-render with fresh data
                }}
                className="flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-sm font-medium"
              >
                <CheckCircle2 className="w-4 h-4" />
                Tamamla
              </button>
            )}
          </div>

          {/* Description */}
          <div className="bg-slate-700/20 rounded-xl p-4 border border-slate-600/30">
            <h4 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              Açıklama
            </h4>
            <p className="text-slate-300 whitespace-pre-wrap leading-relaxed text-sm">
              {task.description || 'Bu görev için henüz açıklama eklenmemiş.'}
            </p>
          </div>

          {/* People */}
          <div className="bg-slate-700/20 rounded-xl p-4 border border-slate-600/30">
            <h4 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              Kişiler
            </h4>
            <div className="space-y-3">
              {task.assignee && (
                <div className="flex items-center gap-3 p-2 bg-slate-800/40 rounded-lg">
                  <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                    {task.assignee.first_name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Sorumlu</p>
                    <p className="text-white text-sm font-medium">
                      {task.assignee.first_name} {task.assignee.last_name}
                    </p>
                  </div>
                </div>
              )}
              {task.assigner && (
                <div className="flex items-center gap-3 p-2 bg-slate-800/40 rounded-lg">
                  <div className="w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                    {task.assigner.first_name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Atayan</p>
                    <p className="text-white text-sm font-medium">
                      {task.assigner.first_name} {task.assigner.last_name}
                    </p>
                  </div>
                </div>
              )}
              {task.informed && (
                <div className="flex items-center gap-3 p-2 bg-slate-800/40 rounded-lg">
                  <div className="w-7 h-7 bg-yellow-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                    {task.informed.first_name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Bilgi</p>
                    <p className="text-white text-sm font-medium">
                      {task.informed.first_name} {task.informed.last_name}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-slate-700/20 rounded-xl p-4 border border-slate-600/30">
            <h4 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-400" />
              Zaman Çizelgesi
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-2 bg-slate-800/40 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Oluşturulma</p>
                  <p className="text-white text-sm">
                    {new Date(task.created_at).toLocaleString('tr-TR')}
                  </p>
                </div>
              </div>
              {task.due_date && (
                <div className="flex items-center gap-3 p-2 bg-slate-800/40 rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${isOverdue(task.due_date) ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Son Teslim</p>
                    <p className={`text-sm ${isOverdue(task.due_date) ? 'text-red-400' : 'text-white'}`}>
                      {new Date(task.due_date).toLocaleString('tr-TR')}
                    </p>
                  </div>
                </div>
              )}
              {task.completed_at && (
                <div className="flex items-center gap-3 p-2 bg-slate-800/40 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Tamamlanma</p>
                    <p className="text-white text-sm">
                      {new Date(task.completed_at).toLocaleString('tr-TR')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Attachments */}
          <div className="bg-slate-700/20 rounded-xl p-4 border border-slate-600/30">
            <h4 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-cyan-400" />
              Dosyalar ({taskAttachments.length})
            </h4>
            <div className="space-y-3">
              {taskAttachments.length === 0 ? (
                <div className="text-center py-4">
                  <Paperclip className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">Dosya eklenmemiş</p>
                </div>
              ) : (
                taskAttachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center justify-between p-2 bg-slate-800/40 rounded-lg border border-slate-600/20">
                    <div className="flex items-center gap-3 min-w-0">
                      <Paperclip className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-white text-sm truncate">{attachment.file_name}</p>
                        <p className="text-xs text-slate-400">
                          {attachment.uploader?.first_name} {attachment.uploader?.last_name}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => window.open(attachment.file_url, '_blank')}
                      className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-600/50 rounded-lg transition-all flex-shrink-0"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Comments Section */}
          <div className="bg-gradient-to-br from-slate-700/30 to-slate-800/30 rounded-2xl p-4 md:p-6 border border-slate-600/40 shadow-xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4">
              <h4 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                Yorumlar
              </h4>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-xs font-medium">
                  {taskComments.length} Yorum
                </span>
              </div>
            </div>
            
            {/* Add Comment */}
            <div className="mb-6 bg-slate-800/50 rounded-xl p-3 md:p-4 border border-slate-600/30">
              <div className="flex flex-col sm:flex-row items-start gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0">
                  {userProfile?.profile_photo_url ? (
                    <img
                      src={userProfile.profile_photo_url}
                      alt={`${userProfile.first_name} ${userProfile.last_name}`}
                      className="w-10 h-10 md:w-12 md:h-12 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-md md:text-lg">
                      {userProfile?.first_name?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>
                <div className="flex-1 w-full">
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Yorum Ekle
                    </label>
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 resize-none transition-all text-sm"
                      rows={3}
                      placeholder="Görüşlerinizi, güncellemelerinizi veya sorularınızı paylaşın..."
                    />
                  </div>
                  <div className="flex items-center justify-end">
                    <button
                      onClick={() => handleAddComment(task.id)}
                      disabled={!newComment.trim()}
                      className="px-3 py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 text-xs font-medium"
                    >
                      <Send className="w-3 h-3" />
                      Yorum Yap
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-4">
              {taskComments.length === 0 ? (
                <div className="text-center py-8 bg-slate-800/30 rounded-xl border border-slate-600/20">
                  <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="w-8 h-8 text-slate-500" />
                  </div>
                  <h5 className="text-md font-semibold text-white mb-1">Henüz Yorum Yok</h5>
                  <p className="text-slate-400 text-sm">Bu görev hakkında ilk yorumu siz yapın</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {taskComments.map((comment, index) => (
                    <div key={comment.id} className="bg-slate-800/60 rounded-xl p-3 md:p-4 border border-slate-600/30">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          {comment.user?.profile_photo_url ? (
                            <img
                              src={comment.user.profile_photo_url}
                              alt={`${comment.user.first_name} ${comment.user.last_name}`}
                              className="w-9 h-9 md:w-10 md:h-10 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-sm md:text-md">
                              {comment.user?.first_name?.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2">
                            <h6 className="font-semibold text-white text-sm md:text-md">
                              {comment.user?.first_name} {comment.user?.last_name}
                            </h6>
                            <div className="text-xs text-slate-400 mt-0.5 sm:mt-0">
                              {new Date(comment.created_at).toLocaleString('tr-TR')}
                            </div>
                          </div>
                          <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/20">
                            <p className="text-slate-200 whitespace-pre-wrap leading-relaxed text-sm">
                              {comment.comment}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
