import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/project_model.dart';
import '../models/user_profile_model.dart';

class CommonRepository {
  final SupabaseClient _client;

  CommonRepository(this._client);

  Future<List<ProjectModel>> getActiveProjects() async {
    try {
      final response = await _client
          .from('projects')
          .select('id, name, status')
          .eq('status', 'ongoing')
          .order('name');

      final List<dynamic> data = response as List<dynamic>;
      return data.map((json) => ProjectModel.fromJson(json)).toList();
    } catch (e) {
      throw Exception('Error fetching projects: $e');
    }
  }

  Future<List<UserProfileModel>> getUsers() async {
    try {
      final response = await _client
          .from('user_profiles')
          .select()
          .eq('status', 'active')
          .order('first_name');

      final List<dynamic> data = response as List<dynamic>;
      return data.map((json) => UserProfileModel.fromJson(json)).toList();
    } catch (e) {
      throw Exception('Error fetching users: $e');
    }
  }
}
