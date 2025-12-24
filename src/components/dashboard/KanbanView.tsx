'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Task } from '@/types';
import { Clock, User, Calendar, AlertCircle, CheckCircle2, Eye, X, ArrowLeft } from 'lucide-react';
import TaskDetailView from '@/components/tasks/TaskDetailView';

interface KanbanViewProps {
  onClose: () => void;
}

interface Column {
  id: string;
  title: string;
  color: string;
  tasks: Task[];
}

export default function KanbanView({ onClose }: KanbanViewProps) {
  const [columns, setColumns] = useState<Column[]>([
    { id: 'todo', title: 'Yeni', color: 'bg-slate-500', tasks: [] },
    { id: 'in_progress', title: 'Devam Ediyor', color: 'bg-blue-500', tasks: [] },
    { id: 'review', title: 'İnceleme', color: 'bg-yellow-500', tasks: [] },
    { id: 'done', title: 'Tamamlandı', color: 'bg-green-500', tasks: [] }
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [taskComments, setTaskComments] = useState<any[]>([]);
  const [taskAttachments, setTaskAttachments] = useState<any[]>([]);
  const [isAnimating, setIsAnimating] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  const { user, userProfile } = useAuth();

  // Animation effect
  useEffect(() => {
    // Start animation sequence
    const timer1 = setTimeout(() => {
      setIsAnimating(false);
    }, 100);

    return () => {
      clearTimeout(timer1);
    };
  }, []);

  // Handle close with animation
  const handleClose = () => {
    setIsClosing(true);
    // Wait for closing animation to complete, then call onClose
    setTimeout(() => {
      onClose();
    }, 750); // Total closing animation time
  };

  // Fetch tasks from Supabase and API
  const fetchTasks = async () => {
    if (!user || !userProfile) return;

    try {
      setIsLoading(true);

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();

      const authHeaders: HeadersInit = session?.access_token ? {
        'Authorization': `Bearer ${session.access_token}`
      } : {};

      // Fetch normal tasks from Supabase directly
      let query = supabase
        .from('tasks')
        .select(`
          *,
          project:projects(id, name, project_manager_id),
          assignee:user_profiles!tasks_assigned_to_fkey(id, first_name, last_name, personnel_number),
          assigner:user_profiles!tasks_assigned_by_fkey(id, first_name, last_name, personnel_number),
          informed:user_profiles!tasks_informed_person_fkey(id, first_name, last_name, personnel_number),
          creator:user_profiles!tasks_created_by_fkey(id, first_name, last_name, personnel_number)
        `);

      // Admin kullanıcılar tüm görevleri görebilir, diğer kullanıcılar sadece kendi görevlerini
      if (userProfile.authority_level !== 'admin') {
        query = query.or(`assigned_to.eq.${userProfile.id},created_by.eq.${userProfile.id},informed_person.eq.${userProfile.id}`);
      }

      const { data: normalTasks, error: tasksError } = await query
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

      // Group tasks by status
      const groupedTasks = {
        todo: allTasks.filter(task => task.status === 'todo'),
        in_progress: allTasks.filter(task => task.status === 'in_progress'),
        review: allTasks.filter(task => task.status === 'review'),
        done: allTasks.filter(task => task.status === 'done')
      };

      // Update columns with tasks
      setColumns(prev => prev.map(column => ({
        ...column,
        tasks: groupedTasks[column.id as keyof typeof groupedTasks] || []
      })));

    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id && userProfile?.id) {
      fetchTasks();
    }
  }, [user?.id, userProfile?.id]);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Find the task being moved
    const sourceColumn = columns.find(col => col.id === source.droppableId);
    const destColumn = columns.find(col => col.id === destination.droppableId);

    if (!sourceColumn || !destColumn) return;

    const task = sourceColumn.tasks[source.index];
    if (!task) return;

    // Check if this is a request task (cannot be updated via drag and drop)
    if (task.id.startsWith('leave_') || task.id.startsWith('advance_') || task.id.startsWith('suggestion_')) {
      console.log('Request tasks cannot be updated via drag and drop');
      return;
    }

    // First update local state optimistically
    const newColumns = [...columns];

    // Remove from source
    const sourceColumnIndex = newColumns.findIndex(col => col.id === source.droppableId);
    const newSourceTasks = [...newColumns[sourceColumnIndex].tasks];
    newSourceTasks.splice(source.index, 1);
    newColumns[sourceColumnIndex] = {
      ...newColumns[sourceColumnIndex],
      tasks: newSourceTasks
    };

    // Add to destination
    const destColumnIndex = newColumns.findIndex(col => col.id === destination.droppableId);
    const newDestTasks = [...newColumns[destColumnIndex].tasks];
    const updatedTask = { ...task, status: destination.droppableId as Task['status'] };
    newDestTasks.splice(destination.index, 0, updatedTask);
    newColumns[destColumnIndex] = {
      ...newColumns[destColumnIndex],
      tasks: newDestTasks
    };

    // Update UI immediately
    setColumns(newColumns);

    // Then update database
    try {
      console.log('Updating task:', task.id, 'from', source.droppableId, 'to', destination.droppableId);

      const { data, error } = await supabase
        .from('tasks')
        .update({
          status: destination.droppableId,
          completed_at: destination.droppableId === 'done' ? new Date().toISOString() : null
        })
        .eq('id', task.id)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Task updated successfully:', data);

    } catch (error) {
      console.error('Error updating task status:', error);
      // Revert the change by refetching
      console.log('Reverting changes...');
      await fetchTasks();
    }
  };

  const fetchTaskDetails = async (taskId: string) => {
    try {
      // Talep görevleri için detay getirme işlemini atla
      if (taskId.startsWith('leave_') || taskId.startsWith('advance_') || taskId.startsWith('suggestion_')) {
        setTaskComments([]);
        setTaskAttachments([]);
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

      setTaskComments(commentsData || []);
      setTaskAttachments(attachmentsData || []);
    } catch (error) {
      console.error('Error fetching task details:', error);
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
      await fetchTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short'
    });
  };

  const isOverdue = (dueDateString?: string) => {
    if (!dueDateString) return false;
    const dueDate = new Date(dueDateString);
    const today = new Date();
    return dueDate < today;
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-400';
      case 'high':
        return 'text-orange-400';
      case 'medium':
        return 'text-yellow-400';
      case 'low':
        return 'text-green-400';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex flex-col transition-all"
      style={{
        opacity: isAnimating ? 0 : isClosing ? 0 : 1,
        transitionDuration: isClosing ? '250ms' : '500ms'
      }}
    >
      {/* Header */}
      <div
        className="bg-slate-800/90 backdrop-blur-sm border-b border-slate-700/50 p-4 transition-all"
        style={{
          transform: isAnimating ? 'translateX(-100%)' : isClosing ? 'translateX(-100%)' : 'translateX(0)',
          transitionDuration: isClosing ? '350ms' : '700ms',
          transitionDelay: isClosing ? '0ms' : '250ms'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-white">Görevler - Kanban Görünümü</h2>
              <p className="text-slate-400 text-sm">Görevleri sürükleyip bırakarak durumlarını değiştirin</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div
        className="flex-1 overflow-hidden transition-all"
        style={{
          transform: isAnimating ? 'translateX(-100%)' : isClosing ? 'translateX(-100%)' : 'translateX(0)',
          transitionDuration: isClosing ? '500ms' : '1000ms',
          transitionDelay: isClosing ? '0ms' : '500ms'
        }}
      >
        {isLoading ? (
          /* Skeleton Loading */
          <div className="h-full p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
              {[1, 2, 3, 4].map((columnIndex) => (
                <div key={columnIndex} className="flex flex-col h-full">
                  {/* Column Header Skeleton */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-slate-700 animate-pulse"></div>
                    <div className="h-4 bg-slate-700 rounded w-20 animate-pulse"></div>
                    <div className="px-2 py-1 bg-slate-700 rounded-full w-6 h-6 animate-pulse"></div>
                  </div>

                  {/* Column Content Skeleton */}
                  <div className="flex-1 space-y-3 p-2 rounded-xl bg-slate-800/20 border-2 border-transparent min-h-[200px]">
                    {[1, 2, 3].map((taskIndex) => (
                      <div key={taskIndex} className="bg-slate-800/70 rounded-xl p-4 border border-slate-700/50 animate-pulse">
                        {/* Task Header Skeleton */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                          <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                        </div>

                        {/* Project Skeleton */}
                        <div className="h-3 bg-slate-700/70 rounded w-1/2 mb-2"></div>

                        {/* Description Skeleton */}
                        <div className="space-y-1 mb-3">
                          <div className="h-3 bg-slate-700/50 rounded w-full"></div>
                          <div className="h-3 bg-slate-700/50 rounded w-2/3"></div>
                        </div>

                        {/* Footer Skeleton */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-slate-700/70 rounded"></div>
                            <div className="h-3 bg-slate-700/70 rounded w-12"></div>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-slate-700/70 rounded"></div>
                            <div className="h-3 bg-slate-700/70 rounded w-8"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="h-full p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
                {columns.map((column) => (
                  <div key={column.id} className="flex flex-col h-full">
                    {/* Column Header */}
                    <div className="flex items-center gap-2 mb-4">
                      <div className={`w-3 h-3 rounded-full ${column.color}`}></div>
                      <h3 className="font-semibold text-white">{column.title}</h3>
                      <span className="px-2 py-1 bg-slate-700/50 text-slate-300 rounded-full text-xs">
                        {column.tasks.length}
                      </span>
                    </div>

                    {/* Droppable Area */}
                    <Droppable droppableId={column.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 space-y-3 p-2 rounded-xl transition-colors ${snapshot.isDraggingOver
                              ? 'bg-slate-700/30 border-2 border-slate-600/50'
                              : 'bg-slate-800/20 border-2 border-transparent'
                            } min-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600/50 scrollbar-track-transparent`}
                        >
                          {column.tasks.map((task, index) => {
                            const isRequestTask = task.id.startsWith('leave_') || task.id.startsWith('advance_') || task.id.startsWith('suggestion_');
                            return (
                              <Draggable
                                key={task.id}
                                draggableId={task.id}
                                index={index}
                                isDragDisabled={isRequestTask}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`bg-slate-800/70 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50 cursor-pointer transition-all duration-200 ${snapshot.isDragging
                                        ? 'shadow-2xl shadow-black/50 rotate-2 scale-105'
                                        : 'hover:shadow-lg hover:shadow-black/20 hover:border-slate-600/50'
                                      }`}
                                    onClick={() => {
                                      if (!snapshot.isDragging) {
                                        setViewingTask(task);
                                        fetchTaskDetails(task.id);
                                      }
                                    }}
                                  >
                                    {/* Task Header */}
                                    <div className="flex items-start justify-between mb-2">
                                      <h4 className="font-semibold text-white text-sm line-clamp-2 flex-1">
                                        {task.title}
                                      </h4>
                                      <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)} animate-pulse ml-2 mt-1 flex-shrink-0`}></div>
                                    </div>

                                    {/* Project */}
                                    <p className="text-xs text-slate-400 mb-2">{task.project?.name}</p>

                                    {/* Description */}
                                    {task.description && (
                                      <p className="text-xs text-slate-300 leading-relaxed mb-3 line-clamp-2">
                                        {task.description}
                                      </p>
                                    )}

                                    {/* Task Footer */}
                                    <div className="flex items-center justify-between text-xs">
                                      <div className="flex items-center gap-2">
                                        {task.assignee && (
                                          <div className="flex items-center gap-1">
                                            <User className="w-3 h-3 text-slate-400" />
                                            <span className="text-slate-300 truncate max-w-[80px]">
                                              {task.assignee.first_name}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      {task.due_date && (
                                        <div className="flex items-center gap-1">
                                          <Calendar className={`w-3 h-3 ${isOverdue(task.due_date) ? 'text-red-400' : 'text-slate-400'}`} />
                                          <span className={`${isOverdue(task.due_date) ? 'text-red-400' : 'text-slate-300'}`}>
                                            {formatDate(task.due_date)}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}

                          {/* Empty State */}
                          {column.tasks.length === 0 && (
                            <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
                              Görev bulunmuyor
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                ))}
              </div>
            </div>
          </DragDropContext>
        )}
      </div>

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
