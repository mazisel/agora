
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../providers/companies_provider.dart';
import '../../../data/models/company_model.dart';
import 'create_edit_customer_screen.dart';

class CustomersScreen extends ConsumerStatefulWidget {
  const CustomersScreen({super.key});

  @override
  ConsumerState<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends ConsumerState<CustomersScreen> {
  final _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  Widget build(BuildContext context) {
    final companiesAsync = ref.watch(companiesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Müşteriler'),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.plus),
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const CreateEditCustomerScreen())
            ),
          )
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(60),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Firma ara...',
                prefixIcon: const Icon(LucideIcons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: Theme.of(context).cardColor,
                contentPadding: const EdgeInsets.symmetric(vertical: 0),
              ),
              onChanged: (value) => setState(() => _searchQuery = value),
            ),
          ),
        ),
      ),
      body: companiesAsync.when(
        data: (companies) {
          final filteredCompanies = companies.where((c) {
            final q = _searchQuery.toLowerCase();
            return c.name.toLowerCase().contains(q) || 
                   c.taxNumber.contains(q) ||
                   c.email.toLowerCase().contains(q);
          }).toList();

          if (filteredCompanies.isEmpty) {
            return Center(child: Text(_searchQuery.isEmpty ? 'Firma bulunamadı' : 'Sonuç yok'));
          }

          return RefreshIndicator(
            onRefresh: () => ref.refresh(companiesProvider.future),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: filteredCompanies.length,
              itemBuilder: (context, index) {
                final company = filteredCompanies[index];
                return _buildCompanyCard(company);
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Hata: $err')),
      ),
    );
  }

  Widget _buildCompanyCard(CompanyModel company) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ExpansionTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.blue.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Icon(LucideIcons.building, color: Colors.blue),
        ),
        title: Text(company.name, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(company.companyType.toUpperCase() + (company.city != null ? ' - ${company.city}' : '')),
        childrenPadding: const EdgeInsets.all(16),
        children: [
          _buildInfoRow(LucideIcons.fileText, 'Vergi No', company.taxNumber),
          if(company.phone.isNotEmpty) _buildInfoRow(LucideIcons.phone, 'Telefon', company.phone),
          if(company.email.isNotEmpty) _buildInfoRow(LucideIcons.mail, 'E-posta', company.email),
          
          if(company.contacts.isNotEmpty) ...[
            const Divider(),
            const Align(
              alignment: Alignment.centerLeft,
              child: Text('Yetkili Kişiler', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.grey)),
            ),
            const SizedBox(height: 8),
            ...company.contacts.map((c) => ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(LucideIcons.user, size: 16),
              title: Text('${c.name} ${c.surname}'),
              subtitle: Text([c.position, c.phone].where((e) => e != null && e.isNotEmpty).join(' - ')),
              dense: true,
            )).toList(),
          ]
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 14, color: Colors.grey),
          const SizedBox(width: 8),
          Text('$label: ', style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
          Expanded(child: Text(value, style: const TextStyle(fontSize: 13))),
        ],
      ),
    );
  }
}

extension CompanyCity on CompanyModel {
  String? get city {
    // Basic extraction from address or a placeholder if actual city field exists later
    return null;
  }
}
