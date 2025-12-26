import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../data/models/project_model.dart';
import '../../data/models/user_profile_model.dart';
import '../../data/repositories/common_repository.dart';

final commonRepositoryProvider = Provider<CommonRepository>((ref) {
  return CommonRepository(Supabase.instance.client);
});

final activeProjectsProvider = FutureProvider<List<ProjectModel>>((ref) async {
  final repository = ref.read(commonRepositoryProvider);
  return repository.getActiveProjects();
});

final usersProvider = FutureProvider<List<UserProfileModel>>((ref) async {
  final repository = ref.read(commonRepositoryProvider);
  return repository.getUsers();
});
