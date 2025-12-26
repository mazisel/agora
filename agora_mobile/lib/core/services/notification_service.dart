
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter/foundation.dart';

class NotificationService {
  final SupabaseClient _supabase;
  final FirebaseMessaging _fcm = FirebaseMessaging.instance;

  NotificationService(this._supabase);

  Future<void> initialize() async {
    // Request permission
    NotificationSettings settings = await _fcm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      debugPrint('User granted permission');
      
      // For iOS, we need to wait for APNS token
      if (defaultTargetPlatform == TargetPlatform.iOS) {
        String? apnsToken = await _fcm.getAPNSToken();
        int attempts = 0;
        while (apnsToken == null && attempts < 10) {
          debugPrint('APNS token not available yet, waiting... (Attempt ${attempts + 1}/10)');
          await Future.delayed(const Duration(seconds: 2));
          apnsToken = await _fcm.getAPNSToken();
          attempts++;
        }
        
        if (apnsToken == null) {
          debugPrint('Failed to get APNS token after 20 seconds. Push notifications may not work on iOS Simulator.');
          return; // Stop here to avoid crashing with the error
        }
        
        debugPrint('APNS Token: $apnsToken');
      }

      // Get token
      String? token = await _fcm.getToken();
      if (token != null) {
        debugPrint('FCM Token: $token');
        await _saveTokenToDatabase(token);
      }

      // Listen for token refresh
      _fcm.onTokenRefresh.listen(_saveTokenToDatabase);

      // Listen for auth state changes to save token when user logs in
      _supabase.auth.onAuthStateChange.listen((data) {
        final event = data.event;
        if (event == AuthChangeEvent.signedIn) {
          _fcm.getToken().then((token) {
            if (token != null) _saveTokenToDatabase(token);
          });
        }
      });

      // Handle foreground messages
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        debugPrint('Got a message whilst in the foreground!');
        debugPrint('Message data: ${message.data}');

        if (message.notification != null) {
          debugPrint('Message also contained a notification: ${message.notification}');
        }
      });

    } else {
      debugPrint('User declined or has not accepted permission');
    }
  }

  Future<void> _saveTokenToDatabase(String token) async {
    final user = _supabase.auth.currentUser;
    if (user == null) {
      debugPrint('User not logged in, cannot save FCM token');
      return;
    }

    try {
      await _supabase.from('user_profiles').update({
        'fcm_token': token,
      }).eq('id', user.id);
      debugPrint('FCM Token saved to database for user: ${user.id}');
    } catch (e) {
      debugPrint('Error saving FCM token: $e');
    }
  }
}
