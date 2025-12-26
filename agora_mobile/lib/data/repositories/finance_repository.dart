
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/finance_transaction_model.dart';
import '../models/finance_account_model.dart';

class FinanceRepository {
  final SupabaseClient _client;

  FinanceRepository(this._client);

  Future<List<FinanceTransactionModel>> getTransactions() async {
    final response = await _client
        .from('finance_transactions')
        .select()
        .order('date', ascending: false);
    
    return (response as List).map((e) => FinanceTransactionModel.fromJson(e)).toList();
  }

  Future<List<FinanceAccountModel>> getAccounts() async {
    final response = await _client
        .from('finance_accounts')
        .select()
        .order('code', ascending: true);
    
    return (response as List).map((e) => FinanceAccountModel.fromJson(e)).toList();
  }

  Future<void> createTransaction(Map<String, dynamic> transactionData) async {
    await _client.from('finance_transactions').insert(transactionData);
  }

  Future<void> deleteTransaction(String id) async {
    await _client.from('finance_transactions').delete().eq('id', id);
  }
}
