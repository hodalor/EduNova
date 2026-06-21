import 'package:hive/hive.dart';

import '../../../../core/cache/hive_cache.dart';

class AttendanceOfflineQueue {
  Box<dynamic> get _box => Hive.box<dynamic>(HiveCache.offlineQueueBox);

  Future<void> enqueue({
    required String sessionId,
    required Map<String, dynamic> payload,
  }) async {
    final key = '${sessionId}_${payload['student_id']}_${DateTime.now().millisecondsSinceEpoch}';
    await _box.put(key, {
      'session_id': sessionId,
      'payload': payload,
      'queued_at': DateTime.now().toIso8601String(),
    });
  }

  List<Map<String, dynamic>> readAll() {
    return _box.keys
        .map((key) => _box.get(key))
        .whereType<Map>()
        .map((item) => item.cast<String, dynamic>())
        .toList();
  }

  Future<void> removeBySessionAndStudent({
    required String sessionId,
    required String studentId,
  }) async {
    final key = _box.keys.cast<dynamic>().firstWhere(
      (entry) {
        final value = _box.get(entry);
        return value is Map &&
            value['session_id'] == sessionId &&
            value['payload'] is Map &&
            value['payload']['student_id'] == studentId;
      },
      orElse: () => null,
    );

    if (key != null) {
      await _box.delete(key);
    }
  }
}
