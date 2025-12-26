import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../data/models/task_model.dart';
import '../../data/repositories/tasks_repository.dart';

// Repository Provider
final tasksRepositoryProvider = Provider<TasksRepository>((ref) {
  return TasksRepository(Supabase.instance.client);
});

// Tasks List Provider
final tasksProvider = AsyncNotifierProvider<TasksNotifier, List<TaskModel>>(() {
  return TasksNotifier();
});

class TasksNotifier extends AsyncNotifier<List<TaskModel>> {
  @override
  Future<List<TaskModel>> build() async {
    return _fetchTasks();
  }

  Future<List<TaskModel>> _fetchTasks() async {
    try {
      final repository = ref.read(tasksRepositoryProvider);
      final user = Supabase.instance.client.auth.currentUser;
      
      if (user == null) {
         debugPrint('TasksNotifier: No user logged in');
         return [];
      }
      
      // Admin users should also only see their related tasks in the mobile app view
      const isAdmin = false; 
      
      debugPrint('TasksNotifier: Fetching for user ${user.id}, IsAdmin: $isAdmin (Forced false)');

      return repository.getTasks(userId: user.id, isAdmin: isAdmin);
    } catch (e, st) {
      debugPrint('TasksNotifier Error: $e');
      debugPrintStack(stackTrace: st);
      throw e;
    }
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => _fetchTasks());
  }

  Future<void> addTask(TaskModel task) async {
    final repository = ref.read(tasksRepositoryProvider);
    await repository.createTask(task);
    ref.invalidateSelf();
  }

  Future<void> updateTaskStatus(TaskModel task, TaskStatus newStatus) async {
    final repository = ref.read(tasksRepositoryProvider);
    final updatedTask = task.copyWith(status: newStatus);
    await repository.updateTask(updatedTask);
    ref.invalidateSelf();
  }

  // Alias/Generic update method
  Future<void> updateTask(TaskModel task) async {
    final repository = ref.read(tasksRepositoryProvider);
    await repository.updateTask(task);
    ref.invalidateSelf();
  }

  Future<void> deleteTask(String taskId) async {
     final repository = ref.read(tasksRepositoryProvider);
     await repository.deleteTask(taskId);
     ref.invalidateSelf();
  }
}
