class ProjectModel {
  final String id;
  final String name;
  final String status;

  ProjectModel({
    required this.id,
    required this.name,
    required this.status,
  });

  factory ProjectModel.fromJson(Map<String, dynamic> json) {
    return ProjectModel(
      id: json['id'] as String,
      name: json['name'] as String,
      status: json['status'] as String,
    );
  }
}
