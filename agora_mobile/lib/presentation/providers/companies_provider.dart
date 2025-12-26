
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../data/models/company_model.dart';
import '../../data/repositories/companies_repository.dart';

// Repository Provider
final companiesRepositoryProvider = Provider<CompaniesRepository>((ref) {
  return CompaniesRepository(Supabase.instance.client);
});

// Companies List Provider
final companiesProvider = FutureProvider<List<CompanyModel>>((ref) async {
  final repository = ref.watch(companiesRepositoryProvider);
  return repository.getCompanies();
});
