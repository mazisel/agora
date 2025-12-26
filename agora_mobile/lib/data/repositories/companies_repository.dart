
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/company_model.dart';

class CompaniesRepository {
  final SupabaseClient _client;

  CompaniesRepository(this._client);

  Future<List<CompanyModel>> getCompanies() async {
    final response = await _client
        .from('companies')
        .select('*, company_contacts(*)')
        .order('created_at', ascending: false);
    
    return (response as List).map((e) => CompanyModel.fromJson(e)).toList();
  }

  Future<void> createCompany(Map<String, dynamic> companyData, List<Map<String, dynamic>> contactsData) async {
    // 1. Create Company
    final companyResponse = await _client
        .from('companies')
        .insert(companyData)
        .select()
        .single();
    
    final companyId = companyResponse['id'];

    // 2. Create Contacts
    if (contactsData.isNotEmpty) {
      final contactsWithId = contactsData.map((c) => {
        ...c,
        'company_id': companyId,
      }).toList();

      await _client.from('company_contacts').insert(contactsWithId);
    }
  }

  Future<void> updateCompany(String companyId, Map<String, dynamic> companyData) async {
    await _client.from('companies').update(companyData).eq('id', companyId);
  }

  Future<void> deleteCompany(String companyId) async {
    await _client.from('companies').delete().eq('id', companyId);
  }
}
