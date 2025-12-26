
class UserProfileModel {
  final String id;
  final String? firstName;
  final String? lastName;
  final String? email;
  final String? profilePhotoUrl;
  final String? position;
  final String? department;
  final String? authorityLevel;
  final String? fcmToken;

  UserProfileModel({
    required this.id,
    this.firstName,
    this.lastName,
    this.email,
    this.profilePhotoUrl,
    this.position,
    this.department,
    this.authorityLevel,
    this.fcmToken,
  });

  String get fullName => '${firstName ?? ''} ${lastName ?? ''}'.trim();

  factory UserProfileModel.fromJson(Map<String, dynamic> json) {
    return UserProfileModel(
      id: json['id'] as String,
      firstName: json['first_name'] as String?,
      lastName: json['last_name'] as String?,
      email: json['email'] as String?,
      profilePhotoUrl: json['profile_photo_url'] as String?,
      position: json['position'] as String?,
      department: json['department'] as String?,
      authorityLevel: json['authority_level'] as String?,
      fcmToken: json['fcm_token'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'first_name': firstName,
      'last_name': lastName,
      'email': email,
      'profile_photo_url': profilePhotoUrl,
      'position': position,
      'department': department,
      'authority_level': authorityLevel,
      'fcm_token': fcmToken,
    };
  }
}
