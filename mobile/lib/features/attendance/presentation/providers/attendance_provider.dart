import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive/hive.dart';

import '../../../../core/cache/hive_cache.dart';
import '../../../../features/attendance/data/datasources/attendance_offline_queue.dart';
import '../../../../features/auth/presentation/providers/auth_provider.dart';
import '../../../../shared/models/offline_data.dart';

class AttendanceRepository {
  AttendanceRepository(this._ref, this._queue);

  final Ref _ref;
  final AttendanceOfflineQueue _queue;

  Future<bool> _isOnline() async {
    final results = await Connectivity().checkConnectivity();
    return results.any((item) => item != ConnectivityResult.none);
  }

  Box<dynamic> get _box => Hive.box<dynamic>(HiveCache.attendanceCacheBox);

  Future<OfflineData<List<Map<String, dynamic>>>> getAttendanceReport() async {
    if (await _isOnline()) {
      try {
        final response = await _ref.read(dioClientProvider).dio.get('/v1/attendance/report');
        final data = ((response.data['data'] as List?) ?? const [])
            .whereType<Map>()
            .map((item) => item.cast<String, dynamic>())
            .toList();
        await _box.put('attendance_report', data);
        return OfflineData(data: data);
      } catch (_) {}
    }

    final cached = ((_box.get('attendance_report') as List?) ?? const [])
        .whereType<Map>()
        .map((item) => item.cast<String, dynamic>())
        .toList();
    return OfflineData(data: cached, isStale: true);
  }

  Future<bool> markAttendance({
    required String sessionId,
    required Map<String, dynamic> payload,
  }) async {
    if (!await _isOnline()) {
      await _queue.enqueue(sessionId: sessionId, payload: payload);
      return true;
    }

    await _ref.read(dioClientProvider).dio.post(
      '/v1/attendance/sessions/$sessionId/mark',
      data: payload,
    );
    return false;
  }

  Future<int> syncQueuedMarks() async {
    if (!await _isOnline()) {
      return 0;
    }

    final entries = _queue.readAll();
    var synced = 0;
    for (final entry in entries) {
      final sessionId = entry['session_id'] as String?;
      final payload = entry['payload'];
      if (sessionId == null || payload is! Map) {
        continue;
      }
      final body = payload.cast<String, dynamic>();
      await _ref.read(dioClientProvider).dio.post(
        '/v1/attendance/sessions/$sessionId/mark',
        data: body,
      );
      await _queue.removeBySessionAndStudent(
        sessionId: sessionId,
        studentId: body['student_id']?.toString() ?? '',
      );
      synced += 1;
    }
    return synced;
  }
}

final attendanceOfflineQueueProvider = Provider<AttendanceOfflineQueue>((ref) {
  return AttendanceOfflineQueue();
});

final attendanceRepositoryProvider = Provider<AttendanceRepository>((ref) {
  return AttendanceRepository(
    ref,
    ref.watch(attendanceOfflineQueueProvider),
  );
});

final attendanceReportProvider =
    FutureProvider<OfflineData<List<Map<String, dynamic>>>>((ref) async {
  return ref.watch(attendanceRepositoryProvider).getAttendanceReport();
});
