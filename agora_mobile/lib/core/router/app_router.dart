import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../data/models/task_model.dart';
import '../../presentation/screens/auth/login_screen.dart';
import '../../presentation/screens/dashboard/dashboard_screen.dart';
import '../../presentation/screens/tasks/create_edit_task_screen.dart';

final appRouter = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      redirect: (context, state) {
        final session = Supabase.instance.client.auth.currentSession;
        if (session == null) {
          return '/login';
        }
        return '/dashboard';
      },
    ),
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/dashboard',
      builder: (context, state) => const DashboardScreen(),
    ),
    GoRoute(
      path: '/tasks/create',
      builder: (context, state) => const CreateEditTaskScreen(),
    ),
    GoRoute(
      path: '/tasks/edit',
      builder: (context, state) {
        final task = state.extra as TaskModel;
        return CreateEditTaskScreen(task: task);
      },
    ),
  ],
  redirect: (context, state) {
    final session = Supabase.instance.client.auth.currentSession;
    final isLoggingIn = state.uri.toString() == '/login';

    if (session == null && !isLoggingIn) return '/login';
    if (session != null && isLoggingIn) return '/dashboard';

    return null;
  },
);
