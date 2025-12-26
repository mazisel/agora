
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../data/models/user_profile_model.dart';
import '../../providers/profile_provider.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(profileProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profilim'),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.logOut),
            onPressed: () => _handleLogout(context, ref),
          ),
        ],
      ),
      body: profileAsync.when(
        data: (profile) => _buildProfileContent(context, ref, profile),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Hata: $err')),
      ),
    );
  }

  Widget _buildProfileContent(BuildContext context, WidgetRef ref, UserProfileModel profile) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const SizedBox(height: 20),
          // Avatar
          Container(
            width: 120,
            height: 120,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.blue.shade100,
              image: profile.profilePhotoUrl != null 
                  ? DecorationImage(image: NetworkImage(profile.profilePhotoUrl!), fit: BoxFit.cover)
                  : null,
            ),
            child: profile.profilePhotoUrl == null
                ? Center(
                    child: Text(
                      (profile.firstName?[0] ?? '') + (profile.lastName?[0] ?? ''),
                      style: TextStyle(fontSize: 40, fontWeight: FontWeight.bold, color: Colors.blue.shade800),
                    ),
                  )
                : null,
          ),
          
          const SizedBox(height: 24),
          
          // Name & Email
          Text(
            profile.fullName,
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            profile.email ?? '',
            style: const TextStyle(fontSize: 16, color: Colors.grey),
            textAlign: TextAlign.center,
          ),

          const SizedBox(height: 40),

          // Details Card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              children: [
                _buildInfoRow(LucideIcons.briefcase, 'Pozisyon', profile.position ?? '-'),
                const Divider(height: 30),
                _buildInfoRow(LucideIcons.building2, 'Departman', profile.department ?? '-'),
                const Divider(height: 30),
                _buildInfoRow(LucideIcons.shield, 'Yetki', _getLocalizedAuthority(profile.authorityLevel)),
              ],
            ),
          ),

          const SizedBox(height: 40),

          // Logout Button (Large)
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => _handleLogout(context, ref),
              icon: const Icon(LucideIcons.logOut),
              label: const Text('Çıkış Yap'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red.shade50,
                foregroundColor: Colors.red,
                padding: const EdgeInsets.symmetric(vertical: 16),
                elevation: 0,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _getLocalizedAuthority(String? authority) {
    if (authority == null) return '-';
    switch (authority.toLowerCase()) {
      case 'admin':
        return 'Yönetici';
      case 'user':
        return 'Kullanıcı';
      case 'manager':
        return 'Yönetici'; // Or explicit manager translation
      default:
        return authority[0].toUpperCase() + authority.substring(1);
    }
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 20, color: Colors.blue),
        const SizedBox(width: 16),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
            Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
          ],
        ),
      ],
    );
  }

  Future<void> _handleLogout(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Çıkış Yap'),
        content: const Text('Hesabınızdan çıkış yapmak istediğinize emin misiniz?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('İptal')),
          TextButton(
            onPressed: () => Navigator.pop(context, true), 
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Çıkış'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await ref.read(profileRepositoryProvider).signOut();
      if (context.mounted) context.go('/login');
    }
  }
}
