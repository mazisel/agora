
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../providers/companies_provider.dart';

class CreateEditCustomerScreen extends ConsumerStatefulWidget {
  const CreateEditCustomerScreen({super.key});

  @override
  ConsumerState<CreateEditCustomerScreen> createState() => _CreateEditCustomerScreenState();
}

class _CreateEditCustomerScreenState extends ConsumerState<CreateEditCustomerScreen> {
  final _formKey = GlobalKey<FormState>();
  
  // Company Fields
  final _nameController = TextEditingController();
  final _taxNumberController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _addressController = TextEditingController();
  final _invoiceTitleController = TextEditingController();
  final _notesController = TextEditingController();
  String _companyType = 'ltd';
  bool _isEInvoice = false;
  bool _isEArchive = false;

  // Contact Fields (Single Contact for MVP)
  // For a full implementation, this should be a dynamic list, but keeping it simple for now based on typical mobile constraints.
  // The web version allows multiple contacts. Here we'll just add one primary contact during creation.
  final _contactNameController = TextEditingController();
  final _contactSurnameController = TextEditingController();
  final _contactEmailController = TextEditingController();
  final _contactPhoneController = TextEditingController();
  final _contactPositionController = TextEditingController();

  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Yeni Firma'),
        actions: [
          if (_isLoading)
            const Center(child: Padding(
              padding: EdgeInsets.all(16.0),
              child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
            ))
          else
            IconButton(
              icon: const Icon(LucideIcons.check),
              onPressed: _saveCompany,
            )
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _buildSectionHeader('Firma Bilgileri'),
            
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Firma Adı', prefixIcon: Icon(LucideIcons.building)),
              validator: (v) => v?.isEmpty == true ? 'Zorunlu alan' : null,
            ),
             const SizedBox(height: 12),
            TextFormField(
              controller: _taxNumberController,
              decoration: const InputDecoration(labelText: 'Vergi Numarası', prefixIcon: Icon(LucideIcons.fileText)),
              validator: (v) => v?.isEmpty == true ? 'Zorunlu alan' : null,
            ),
             const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _companyType,
              decoration: const InputDecoration(labelText: 'Firma Tipi', prefixIcon: Icon(LucideIcons.briefcase)),
              items: const [
                DropdownMenuItem(value: 'ltd', child: Text('Ltd. Şti.')),
                DropdownMenuItem(value: 'as', child: Text('A.Ş.')),
                DropdownMenuItem(value: 'sahis', child: Text('Şahıs Şirketi')),
              ],
              onChanged: (v) => setState(() => _companyType = v!),
            ),
             const SizedBox(height: 12),
            TextFormField(
              controller: _phoneController,
              decoration: const InputDecoration(labelText: 'Telefon', prefixIcon: Icon(LucideIcons.phone)),
              keyboardType: TextInputType.phone,
            ),
             const SizedBox(height: 12),
            TextFormField(
              controller: _emailController,
              decoration: const InputDecoration(labelText: 'E-posta', prefixIcon: Icon(LucideIcons.mail)),
              keyboardType: TextInputType.emailAddress,
            ),
             const SizedBox(height: 12),
            TextFormField(
              controller: _addressController,
              decoration: const InputDecoration(labelText: 'Fatura Adresi', prefixIcon: Icon(LucideIcons.mapPin)),
              maxLines: 2,
            ),
             const SizedBox(height: 12),
            TextFormField(
              controller: _invoiceTitleController,
              decoration: const InputDecoration(labelText: 'Fatura Ünvanı', prefixIcon: Icon(LucideIcons.file)),
            ),
             const SizedBox(height: 12),
            SwitchListTile(
              title: const Text('E-Fatura Mükellefi'),
              value: _isEInvoice,
              onChanged: (v) => setState(() => _isEInvoice = v),
            ),
            SwitchListTile(
              title: const Text('E-Arşiv Mükellefi'),
              value: _isEArchive,
              onChanged: (v) => setState(() => _isEArchive = v),
            ),

            const SizedBox(height: 24),
            _buildSectionHeader('Notlar'),
            TextFormField(
              controller: _notesController,
              decoration: const InputDecoration(hintText: 'Firma hakkında notlar...'),
              maxLines: 3,
            ),

            const SizedBox(height: 24),
            _buildSectionHeader('Yetkili Kişi (Opsiyonel)'),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _contactNameController,
                    decoration: const InputDecoration(labelText: 'Ad'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _contactSurnameController,
                    decoration: const InputDecoration(labelText: 'Soyad'),
                  ),
                ),
              ],
            ),
             const SizedBox(height: 12),
            TextFormField(
              controller: _contactEmailController,
              decoration: const InputDecoration(labelText: 'Kişisel E-posta', prefixIcon: Icon(LucideIcons.mail)),
            ),
             const SizedBox(height: 12),
            TextFormField(
              controller: _contactPhoneController,
              decoration: const InputDecoration(labelText: 'Kişisel Telefon', prefixIcon: Icon(LucideIcons.phone)),
            ),
             const SizedBox(height: 12),
             TextFormField(
              controller: _contactPositionController,
              decoration: const InputDecoration(labelText: 'Pozisyon', prefixIcon: Icon(LucideIcons.user)),
            ),
             const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.blue)),
        const Divider(),
        const SizedBox(height: 8),
      ],
    );
  }

  Future<void> _saveCompany() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isLoading = true);
    
    try {
      final companyData = {
        'name': _nameController.text,
        'tax_number': _taxNumberController.text,
        'company_type': _companyType,
        'phone': _phoneController.text,
        'email': _emailController.text,
        'invoice_address': _addressController.text,
        'invoice_title': _invoiceTitleController.text,
        'is_e_invoice': _isEInvoice,
        'is_e_archive': _isEArchive,
        'notes': _notesController.text,
      };

      final contactsData = <Map<String, dynamic>>[];
      if(_contactNameController.text.isNotEmpty && _contactSurnameController.text.isNotEmpty) {
        contactsData.add({
          'name': _contactNameController.text,
          'surname': _contactSurnameController.text,
          'email': _contactEmailController.text,
          'phone': _contactPhoneController.text,
          'position': _contactPositionController.text,
        });
      }

      await ref.read(companiesRepositoryProvider).createCompany(companyData, contactsData);

      ref.invalidate(companiesProvider);
      
      if (mounted) {
        context.pop();
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Firma eklendi')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Hata: $e')));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }
}
