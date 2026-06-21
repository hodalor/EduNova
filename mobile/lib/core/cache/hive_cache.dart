import 'package:hive_flutter/hive_flutter.dart';

class HiveCache {
  static const String userProfileBox = 'user_profile';
  static const String timetableBox = 'timetable';
  static const String studentsListBox = 'students_list';
  static const String attendanceCacheBox = 'attendance_cache';
  static const String notificationsBox = 'notifications';
  static const String offlineQueueBox = 'offline_queue';

  static Future<void> init() async {
    await Hive.initFlutter();
    await Future.wait([
      Hive.openBox<dynamic>(userProfileBox),
      Hive.openBox<dynamic>(timetableBox),
      Hive.openBox<dynamic>(studentsListBox),
      Hive.openBox<dynamic>(attendanceCacheBox),
      Hive.openBox<dynamic>(notificationsBox),
      Hive.openBox<dynamic>(offlineQueueBox),
    ]);
  }
}
