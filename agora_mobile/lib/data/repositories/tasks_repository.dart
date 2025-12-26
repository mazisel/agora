import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/task_model.dart';

class TasksRepository {
  final SupabaseClient _client;

  TasksRepository(this._client);

  Future<List<TaskModel>> getTasks({
    String? userId, 
    bool isAdmin = false,
  }) async {
    try {
      debugPrint('TasksRepository: Fetching tasks. UserId: $userId, IsAdmin: $isAdmin');
      
      // Select with joins similar to web:
      // assignee:user_profiles!tasks_assigned_to_fkey(...)
      var query = _client.from('tasks').select('''
        *,
        assignee:user_profiles!tasks_assigned_to_fkey(*),
        project:projects(name)
      ''');

      if (!isAdmin && userId != null) {
        // "Admin kullanıcılar tüm görevleri görebilir, diğer kullanıcılar sadece kendi görevlerini"
        // Web logic: .or(`assigned_to.eq.${user.id},created_by.eq.${user.id},informed_person.eq.${user.id}`)
        query = query.or('assigned_to.eq.$userId,created_by.eq.$userId,informed_person.eq.$userId');
      }

      final response = await query.order('created_at', ascending: false);
      
      final List<dynamic> data = response as List<dynamic>;
      debugPrint('TasksRepository: Fetched ${data.length} tasks');
      
      return data.map((json) => TaskModel.fromJson(json)).toList();
    } catch (e) {
      debugPrint('TasksRepository Error: $e');
      throw Exception('Error fetching tasks: $e');
    }
  }

  Future<TaskModel> createTask(TaskModel task) async {
    try {
      final response = await _client.from('tasks').insert({
        'title': task.title,
        'description': task.description,
        'project_id': task.projectId,
        'status': task.status.name,
        'priority': task.priority.name,
        'assigned_to': task.assignedTo,
        'due_date': task.dueDate?.toIso8601String(),
        // Note: created_by is usually handled by RLS or default value, 
        // but explicit set is safer if RLS allows.
        'created_by': _client.auth.currentUser?.id, 
      }).select().single();

      return TaskModel.fromJson(response);
    } catch (e) {
      throw Exception('Error creating task: $e');
    }
  }

  Future<TaskModel> updateTask(TaskModel task) async {
    try {
      final response = await _client
          .from('tasks')
          .update({
            'title': task.title,
            'description': task.description,
            'status': task.status.name,
            'priority': task.priority.name,
            'assigned_to': task.assignedTo,
            'due_date': task.dueDate?.toIso8601String(),
          })
          .eq('id', task.id)
          .select()
          .single();

      return TaskModel.fromJson(response);
    } catch (e) {
      throw Exception('Error updating task: $e');
    }
  }

  Future<void> deleteTask(String taskId) async {
    try {
      await _client.from('tasks').delete().eq('id', taskId);
    } catch (e) {
      throw Exception('Error deleting task: $e');
    }
  }
}
