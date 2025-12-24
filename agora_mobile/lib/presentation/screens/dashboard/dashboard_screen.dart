import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../tasks/tasks_screen.dart';
import '../notes/notes_screen.dart';
import '../finance/finance_screen.dart';
import '../customers/customers_screen.dart';
import '../profile/profile_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _currentIndex = 0;
  bool _isAdmin = false;
  bool _loading = true;

  // List of tabs. We will build this dynamically based on role.
  List<Widget> _screens = [];
  List<BottomNavigationBarItem> _navItems = [];

  @override
  void initState() {
    super.initState();
    _checkUserRole();
  }

  Future<void> _checkUserRole() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user != null) {
        final response = await Supabase.instance.client
            .from('user_profiles')
            .select('authority_level')
            .eq('id', user.id)
            .single();

        setState(() {
          _isAdmin = response['authority_level'] == 'admin';
        });
      }
    } catch (e) {
      debugPrint('Error checking user role: $e');
    } finally {
      // Build the tabs now that we know the role
      _buildTabs();
      setState(() {
        _loading = false;
      });
    }
  }

  void _buildTabs() {
    _screens = [
      const TasksScreen(),
      const NotesScreen(),
      if (_isAdmin) const FinanceScreen(),
      const CustomersScreen(),
      const ProfileScreen(),
    ];

    _navItems = [
      const BottomNavigationBarItem(
        icon: Icon(LucideIcons.checkSquare),
        label: 'Görevler',
      ),
      const BottomNavigationBarItem(
        icon: Icon(LucideIcons.stickyNote),
        label: 'Notlarım',
      ),
      if (_isAdmin)
        const BottomNavigationBarItem(
          icon: Icon(LucideIcons.dollarSign),
          label: 'Finans',
        ),
      const BottomNavigationBarItem(
        icon: Icon(LucideIcons.building),
        label: 'Müşteriler',
      ),
      const BottomNavigationBarItem(
        icon: Icon(LucideIcons.user),
        label: 'Profilim',
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(_navItems[_currentIndex].label ?? 'Agora'),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.bell),
            onPressed: () {
              // TODO: Open notifications
            },
          ),
        ],
      ),
      body: _screens[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        type: BottomNavigationBarType.fixed, // Needed for > 3 items
        items: _navItems,
      ),
    );
  }
}
