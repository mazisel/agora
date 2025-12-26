
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../providers/finance_provider.dart';

class CreateTransactionScreen extends ConsumerStatefulWidget {
  const CreateTransactionScreen({super.key});

  @override
  ConsumerState<CreateTransactionScreen> createState() => _CreateTransactionScreenState();
}

class _CreateTransactionScreenState extends ConsumerState<CreateTransactionScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _descriptionController = TextEditingController(); // Description is required
  String _type = 'expense';
  String _paymentMethod = 'bank_transfer';
  DateTime _selectedDate = DateTime.now();
  String? _selectedCategory;
  bool _isLoading = false;

  final List<String> _incomeCategories = [
    'Proje Geliri', 'Danışmanlık', 'Ürün Satışı', 'Yatırım Geliri', 'Diğer Gelirler'
  ];

  final List<String> _expenseCategories = [
    'Maaşlar', 'Ofis Kirası', 'Teknoloji', 'Pazarlama', 'Seyahat', 
    'Eğitim', 'Hukuki', 'Sigorta', 'Diğer Giderler'
  ];

  @override
  Widget build(BuildContext context) {
    final categories = _type == 'income' ? _incomeCategories : _expenseCategories;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Yeni İşlem'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Transaction Type Segmented Control
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(
                  value: 'income',
                  label: Text('Gelir'),
                  icon: Icon(LucideIcons.trendingUp),
                ),
                ButtonSegment(
                  value: 'expense',
                  label: Text('Gider'),
                  icon: Icon(LucideIcons.trendingDown),
                ),
              ],
              selected: {_type},
              onSelectionChanged: (Set<String> newSelection) {
                setState(() {
                  _type = newSelection.first;
                  _selectedCategory = null;
                });
              },
              style: ButtonStyle(
                backgroundColor: MaterialStateProperty.resolveWith<Color>(
                  (Set<MaterialState> states) {
                    if (states.contains(MaterialState.selected)) {
                      return _type == 'income' 
                          ? Colors.green.withOpacity(0.2) 
                          : Colors.red.withOpacity(0.2);
                    }
                    return Colors.transparent;
                  },
                ),
                foregroundColor: MaterialStateProperty.resolveWith<Color>(
                  (Set<MaterialState> states) {
                    if (states.contains(MaterialState.selected)) {
                       return _type == 'income' ? Colors.green : Colors.red;
                    }
                    return Theme.of(context).textTheme.bodyMedium!.color!;
                  },
                ),
              ),
            ),
            
            const SizedBox(height: 24),

            // Amount Field
            TextFormField(
              controller: _amountController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(
                labelText: 'Tutar (TL)',
                border: OutlineInputBorder(),
                prefixIcon: Icon(LucideIcons.dollarSign),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) return 'Tutar giriniz';
                if (double.tryParse(value) == null) return 'Geçerli bir tutar giriniz';
                return null;
              },
            ),

            const SizedBox(height: 16),

             // Category Dropdown
            DropdownButtonFormField<String>(
              value: _selectedCategory,
              decoration: const InputDecoration(
                labelText: 'Kategori',
                border: OutlineInputBorder(),
                prefixIcon: Icon(LucideIcons.tag),
              ),
              items: categories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
              onChanged: (value) => setState(() => _selectedCategory = value),
              validator: (value) => value == null ? 'Kategori seçiniz' : null,
            ),

            const SizedBox(height: 16),
            
            // Description Field
            TextFormField(
              controller: _descriptionController,
              decoration: const InputDecoration(
                labelText: 'Açıklama',
                border: OutlineInputBorder(),
                prefixIcon: Icon(LucideIcons.fileText),
              ),
              validator: (value) =>
                  value == null || value.isEmpty ? 'Açıklama giriniz' : null,
            ),

            const SizedBox(height: 16),

            // Date Picker
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(LucideIcons.calendar),
              title: Text('Tarih: ${_selectedDate.toLocal().toString().split(' ')[0]}'),
              onTap: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: _selectedDate,
                  firstDate: DateTime(2020),
                  lastDate: DateTime.now().add(const Duration(days: 365)),
                );
                if (picked != null) setState(() => _selectedDate = picked);
              },
            ),

            const SizedBox(height: 16),
            
            // Payment Method
            DropdownButtonFormField<String>(
              value: _paymentMethod,
              decoration: const InputDecoration(
                labelText: 'Ödeme Yöntemi',
                border: OutlineInputBorder(),
                prefixIcon: Icon(LucideIcons.creditCard),
              ),
              items: const [
                DropdownMenuItem(value: 'cash', child: Text('Nakit')),
                DropdownMenuItem(value: 'bank_transfer', child: Text('Havale/EFT')),
                DropdownMenuItem(value: 'credit_card', child: Text('Kredi Kartı')),
                DropdownMenuItem(value: 'check', child: Text('Çek')),
              ],
              onChanged: (value) => setState(() => _paymentMethod = value!),
            ),

            const SizedBox(height: 32),

            // Save Button
            ElevatedButton(
              onPressed: _isLoading ? null : _saveTransaction,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: _type == 'income' ? Colors.green : Colors.red,
                foregroundColor: Colors.white,
              ),
              child: _isLoading 
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text('Kaydet', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _saveTransaction() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isLoading = true);
    
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) throw Exception('No user');

      final transactionData = {
        'type': _type,
        'amount': double.parse(_amountController.text),
        'category': _selectedCategory, // Ensure this matches exactly with DB constraints if any
        'description': _descriptionController.text,
        'date': _selectedDate.toIso8601String(),
        'payment_method': _paymentMethod,
        'created_by': user.id,
      };

      await ref.read(financeRepositoryProvider).createTransaction(transactionData);
      
      // Refresh list
      ref.invalidate(financeTransactionsProvider);

      if (mounted) {
        context.pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('İşlem başarıyla kaydedildi')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Hata: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }
}
