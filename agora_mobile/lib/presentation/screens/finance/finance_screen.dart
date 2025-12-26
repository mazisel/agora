
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../../providers/finance_provider.dart';
import '../../../data/models/finance_transaction_model.dart';
import '../../../data/models/finance_account_model.dart';
import 'create_transaction_screen.dart';

class FinanceScreen extends ConsumerStatefulWidget {
  const FinanceScreen({super.key});

  @override
  ConsumerState<FinanceScreen> createState() => _FinanceScreenState();
}

class _FinanceScreenState extends ConsumerState<FinanceScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _showAmounts = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Finans Yönetimi'),
        actions: [
          IconButton(
            icon: Icon(_showAmounts ? LucideIcons.eyeOff : LucideIcons.eye),
            onPressed: () => setState(() => _showAmounts = !_showAmounts),
          ),
          IconButton(
            icon: const Icon(LucideIcons.plus),
            onPressed: () => Navigator.of(context).push(
               MaterialPageRoute(builder: (_) => const CreateTransactionScreen()),
            ),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Genel Bakış'),
            Tab(text: 'Hesaplar'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildOverviewTab(),
          _buildAccountsTab(),
        ],
      ),
    );
  }

  Widget _buildOverviewTab() {
    final stats = ref.watch(financeStatsProvider);
    final transactionsAsync = ref.watch(financeTransactionsProvider);

    return RefreshIndicator(
      onRefresh: () => ref.refresh(financeTransactionsProvider.future),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Stat Cards
          Row(
            children: [
              Expanded(
                child: _buildStatCard(
                  'Gelir', 
                  stats['income']!, 
                  Colors.green, 
                  LucideIcons.trendingUp
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _buildStatCard(
                  'Gider', 
                  stats['expense']!, 
                  Colors.red, 
                  LucideIcons.trendingDown
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildStatCard(
            'Net Bakiye', 
            stats['balance']!, 
            stats['balance']! >= 0 ? Colors.blue : Colors.red, 
            LucideIcons.wallet
          ),

          const SizedBox(height: 24),
          const Text('Son İşlemler', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),

          transactionsAsync.when(
            data: (transactions) {
              if (transactions.isEmpty) return const Center(child: Text('İşlem bulunamadı'));
              return Column(
                children: transactions.map((t) => _buildTransactionItem(t)).toList(),
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (err, _) => Center(child: Text('Hata: $err')),
          )
        ],
      ),
    );
  }
  
  Widget _buildStatCard(String title, double amount, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 8),
          Text(title, style: TextStyle(color: color, fontWeight: FontWeight.w500)),
          const SizedBox(height: 4),
          Text(
            _showAmounts ? '${NumberFormat.currency(locale: 'tr_TR', symbol: '₺').format(amount)}' : '•••••',
            style: TextStyle(color: color, fontSize: 18, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  Widget _buildTransactionItem(FinanceTransactionModel transaction) {
    final isIncome = transaction.type == 'income';
    final color = isIncome ? Colors.green : Colors.red;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(
            isIncome ? LucideIcons.arrowUpRight : LucideIcons.arrowDownRight,
            color: color,
            size: 20,
          ),
        ),
        title: Text(transaction.category, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(transaction.description, maxLines: 1, overflow: TextOverflow.ellipsis),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              _showAmounts 
                  ? '${isIncome ? '+' : '-'}${NumberFormat.currency(locale: 'tr_TR', symbol: '₺').format(transaction.amount)}'
                  : '•••••',
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
            Text(
              DateFormat('d MMM').format(transaction.date),
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAccountsTab() {
    final accountsAsync = ref.watch(financeAccountsProvider);

    return accountsAsync.when(
      data: (accounts) {
        if (accounts.isEmpty) return const Center(child: Text('Hesap bulunamadı'));
        
        return RefreshIndicator(
          onRefresh: () => ref.refresh(financeAccountsProvider.future),
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: accounts.length,
            itemBuilder: (context, index) {
              final account = accounts[index];
              return Card(
                child: ListTile(
                  leading: const Icon(LucideIcons.building2),
                  title: Text('${account.code} - ${account.name}'),
                  subtitle: Text(_getLocalizedAccountType(account.accountType)),
                  trailing: account.isActive 
                      ? const Icon(LucideIcons.checkCircle, color: Colors.green, size: 16)
                      : const Icon(LucideIcons.xCircle, color: Colors.red, size: 16),
                ),
              );
            },
          ),
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (err, _) => Center(child: Text('Hata: $err')),
    );
  }

  String _getLocalizedAccountType(String type) {
    switch (type.toLowerCase()) {
      case 'asset':
        return 'VARLIK';
      case 'liability':
        return 'BORÇ';
      case 'equity':
        return 'ÖZKAYNAK';
      case 'income':
        return 'GELİR';
      case 'expense':
        return 'GİDER';
      default:
        return type.toUpperCase();
    }
  }
}
