import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../../core/api/dio_client.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {}

class NotificationService {
  NotificationService({
    required this.dioClient,
    FirebaseMessaging? firebaseMessaging,
    FlutterLocalNotificationsPlugin? localNotifications,
  })  : _firebaseMessaging = firebaseMessaging ?? FirebaseMessaging.instance,
        _localNotifications =
            localNotifications ?? FlutterLocalNotificationsPlugin();

  final DioClient dioClient;
  final FirebaseMessaging _firebaseMessaging;
  final FlutterLocalNotificationsPlugin _localNotifications;

  Future<void> initialize() async {
    await _firebaseMessaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

    const androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    const settings = InitializationSettings(android: androidSettings);
    await _localNotifications.initialize(settings);

    FirebaseMessaging.onMessage.listen(_showForegroundNotification);
  }

  Future<void> syncDeviceToken() async {
    final token = await _firebaseMessaging.getToken();
    if (token == null || token.isEmpty) {
      return;
    }

    await dioClient.dio.post('/notifications/device-token', data: {
      'fcm_token': token,
      'platform': 'flutter',
    });
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

    await _localNotifications.show(
      notification.hashCode,
      notification.title,
      notification.body,
      details,
    );
  }
}
