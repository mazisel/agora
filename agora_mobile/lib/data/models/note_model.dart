
class NoteModel {
  final String id;
  final String title;
  final String content;
  final String color;
  final DateTime createdAt;
  final DateTime updatedAt;
  final bool pinned;
  final String userId;

  NoteModel({
    required this.id,
    required this.title,
    required this.content,
    required this.color,
    required this.createdAt,
    required this.updatedAt,
    this.pinned = false,
    required this.userId,
  });

  factory NoteModel.fromJson(Map<String, dynamic> json) {
    return NoteModel(
      id: json['id'] as String,
      title: json['title'] as String,
      content: json['content'] as String,
      color: json['color'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
      pinned: json['pinned'] as bool? ?? false,
      userId: json['user_id'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'content': content,
      'color': color,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'pinned': pinned,
      'user_id': userId,
    };
  }

  NoteModel copyWith({
    String? title,
    String? content,
    String? color,
    DateTime? updatedAt,
    bool? pinned,
  }) {
    return NoteModel(
      id: id,
      title: title ?? this.title,
      content: content ?? this.content,
      color: color ?? this.color,
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      pinned: pinned ?? this.pinned,
      userId: userId,
    );
  }
}
