
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/user_profile_model.dart';

class ProfileRepository {
  final SupabaseClient _client;

  ProfileRepository(this._client);

  Future<UserProfileModel> getCurrentUserProfile() async {
    final user = _client.auth.currentUser;
    if (user == null) throw Exception('No logged in user');

    final response = await _client
        .from('user_profiles')
        .select()
        .eq('id', user.id)
        .single();
    
    return UserProfileModel.fromJson(response);
  }

  Future<void> signOut() async {
    await _client.auth.signOut();
  }
}
