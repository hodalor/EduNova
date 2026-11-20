import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../../core/api/dio_client.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {}

class NotificationService {
  NotificationService({
    required this.dioClient,
    FirebaseMessaging? firebaseMessaging,
    FlutterLocalNotificationsPlugin? localNotifications,
  })  : _firebaseMessaging = firebaseMessaging,
        _localNotifications = localNotifications;

  final DioClient dioClient;
  final FirebaseMessaging? _firebaseMessaging;
  final FlutterLocalNotificationsPlugin? _localNotifications;

  FirebaseMessaging get _messaging =>
      _firebaseMessaging ?? FirebaseMessaging.instance;

  FlutterLocalNotificationsPlugin get _notifications =>
      _localNotifications ?? FlutterLocalNotificationsPlugin();

  Future<void> initialize() async {
    try {
      await _messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );

      FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

      const androidSettings =
          AndroidInitializationSettings('@mipmap/ic_launcher');
      const settings = InitializationSettings(android: androidSettings);
      await _notifications.initialize(settings);

      FirebaseMessaging.onMessage.listen(_showForegroundNotification);
    } catch (error) {
      debugPrint('Notification setup skipped: $error');
    }
  }

  Future<void> syncDeviceToken() async {
    try {
      final token = await _messaging.getToken();
      if (token == null || token.isEmpty) {
        return;
      }

      await dioClient.dio.post('/notifications/device-token', data: {
        'fcm_token': token,
        'platform': 'flutter',
      });
    } catch (error) {
      debugPrint('Device token sync skipped: $error');
    }
  }

  Future<void> _showForegroundNotification(RemoteMessage message) async {
    final notification = message.notification;
    if (notification == null) {
      return;
    }

    const details = NotificationDetails(
      android: AndroidNotificationDetails(
        'eduova_general',
        'General Notifications',
        importance: Importance.high,
        priority: Priority.high,
      ),
    );

    await _notifications.show(
      notification.hashCode,
      notification.title,
      notification.body,
      details,
    );
  }
}
