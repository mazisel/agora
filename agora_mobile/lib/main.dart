import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_core/firebase_core.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'core/services/notification_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await dotenv.load(fileName: ".env");
  
  // Initialize Supabase
  await Supabase.initialize(
    url: dotenv.env['SUPABASE_URL']!,
    anonKey: dotenv.env['SUPABASE_ANON_KEY']!,
  );

  // Initialize Firebase (Safely)
  try {
    await Firebase.initializeApp();
    
    // Initialize Notification Service
    final notificationService = NotificationService(Supabase.instance.client);
    await notificationService.initialize();
  } catch (e) {
    debugPrint('Firebase initialization failed: $e');
    // Continue running app even if Firebase fails (e.g. missing google-services.json)
  }

  runApp(const ProviderScope(child: MyApp()));
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      routerConfig: appRouter,
      title: 'Agora Mobile',
      theme: AppTheme.darkTheme,
      debugShowCheckedModeBanner: false,
    );
  }
}
