import 'user_profile_model.dart';

enum TaskStatus {
  todo,
  in_progress,
  review,
  done,
  cancelled;

  String get label {
    switch (this) {
      case TaskStatus.todo:
        return 'Yapılacak';
      case TaskStatus.in_progress:
        return 'Devam Ediyor';
      case TaskStatus.review:
        return 'İncelemede';
      case TaskStatus.done:
        return 'Tamamlandı';
      case TaskStatus.cancelled:
        return 'İptal Edildi';
    }
  }

  static TaskStatus fromString(String status) {
    return TaskStatus.values.firstWhere(
      (e) => e.name == status,
      orElse: () => TaskStatus.todo,
    );
  }
}

enum TaskPriority {
  low,
  medium,
  high,
  urgent;

  String get label {
    switch (this) {
      case TaskPriority.low:
        return 'Düşük';
      case TaskPriority.medium:
        return 'Orta';
      case TaskPriority.high:
        return 'Yüksek';
      case TaskPriority.urgent:
        return 'Acil';
    }
  }

  static TaskPriority fromString(String priority) {
    return TaskPriority.values.firstWhere(
      (e) => e.name == priority,
      orElse: () => TaskPriority.medium,
    );
  }
}

class TaskModel {
  final String id;
  final String title;
  final String? description;
  final String projectId;
  final TaskStatus status;
  final TaskPriority priority;
  final DateTime createdAt;
  final DateTime? dueDate;
  final String? assignedTo;
  final UserProfileModel? assignee;
  final String? projectName;

  TaskModel({
    required this.id,
    required this.title,
    this.description,
    required this.projectId,
    required this.status,
    required this.priority,
    required this.createdAt,
    this.dueDate,
    this.assignedTo,
    this.assignee,
    this.projectName,
  });

  factory TaskModel.fromJson(Map<String, dynamic> json) {
    return TaskModel(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      projectId: json['project_id'] as String,
      status: TaskStatus.fromString(json['status'] as String),
      priority: TaskPriority.fromString(json['priority'] as String),
      createdAt: DateTime.parse(json['created_at'] as String),
      dueDate: json['due_date'] != null
          ? DateTime.parse(json['due_date'] as String)
          : null,
      assignedTo: json['assigned_to'] as String?,
      assignee: json['assignee'] != null
          ? UserProfileModel.fromJson(json['assignee'] as Map<String, dynamic>)
          : null,
      projectName: json['project'] != null ? json['project']['name'] as String? : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'project_id': projectId,
      'status': status.name,
      'priority': priority.name,
      'created_at': createdAt.toIso8601String(),
      'due_date': dueDate?.toIso8601String(),
      'assigned_to': assignedTo,
      'assignee': assignee?.toJson(),
    }; // We don't need to serialize projectName back to DB as it's read-only
  }

  TaskModel copyWith({
    String? title,
    String? description,
    TaskStatus? status,
    TaskPriority? priority,
    DateTime? dueDate,
    String? assignedTo,
  }) {
    return TaskModel(
      id: id,
      title: title ?? this.title,
      description: description ?? this.description,
      projectId: projectId,
      status: status ?? this.status,
      priority: priority ?? this.priority,
      createdAt: createdAt,
      dueDate: dueDate ?? this.dueDate,
      assignedTo: assignedTo ?? this.assignedTo,
      assignee: assignee,
      projectName: projectName, // Preserve existing project name
    );
  }
}
