
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../data/models/finance_transaction_model.dart';
import '../../data/models/finance_account_model.dart';
import '../../data/repositories/finance_repository.dart';

// Repository Provider
final financeRepositoryProvider = Provider<FinanceRepository>((ref) {
  return FinanceRepository(Supabase.instance.client);
});

// Transactions Provider
final financeTransactionsProvider = FutureProvider<List<FinanceTransactionModel>>((ref) async {
  final repository = ref.watch(financeRepositoryProvider);
  return repository.getTransactions();
});

// Accounts Provider
final financeAccountsProvider = FutureProvider<List<FinanceAccountModel>>((ref) async {
  final repository = ref.watch(financeRepositoryProvider);
  return repository.getAccounts();
});

// Stats Provider (Derived)
final financeStatsProvider = Provider.autoDispose<Map<String, double>>((ref) {
  final transactionsAsync = ref.watch(financeTransactionsProvider);
  
  return transactionsAsync.when(
    data: (transactions) {
      double income = 0;
      double expense = 0;

      for (var t in transactions) {
        if (t.type == 'income') {
          income += t.amount;
        } else {
          expense += t.amount;
        }
      }

      return {
        'income': income,
        'expense': expense,
        'balance': income - expense,
      };
    },
    loading: () => {'income': 0, 'expense': 0, 'balance': 0},
    error: (_, __) => {'income': 0, 'expense': 0, 'balance': 0},
  );
});
