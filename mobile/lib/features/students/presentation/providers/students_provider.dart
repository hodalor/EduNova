import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive/hive.dart';

import '../../../../core/cache/hive_cache.dart';
import '../../../../features/auth/presentation/providers/auth_provider.dart';
import '../../../../shared/models/offline_data.dart';

class StudentsRepository {
  StudentsRepository(this._ref);

  final Ref _ref;

  Future<bool> _isOnline() async {
    final results = await Connectivity().checkConnectivity();
    return results.any((item) => item != ConnectivityResult.none);
  }

  Box<dynamic> get _box => Hive.box<dynamic>(HiveCache.studentsListBox);

  Future<OfflineData<List<Map<String, dynamic>>>> listChildren() async {
    final auth = _ref.read(authProvider).valueOrNull;
    final parentId = auth?.user.id ?? 'parent-001';

    if (await _isOnline()) {
      try {
        final response = await _ref.read(dioClientProvider).dio.get(
          '/v1/students',
          queryParameters: {'parent_id': parentId},
        );
        final data = ((response.data['data'] as List?) ?? const [])
            .whereType<Map>()
            .map((item) => item.cast<String, dynamic>())
            .toList();
        await _box.put('children', data);
        return OfflineData(data: data);
      } catch (_) {}
    }

    final cached = ((_box.get('children') as List?) ?? const [])
        .whereType<Map>()
        .map((item) => item.cast<String, dynamic>())
        .toList();
    return OfflineData(data: cached, isStale: true);
  }

  Future<List<Map<String, dynamic>>> getRoster(String classId) async {
    if (await _isOnline()) {
      try {
        final response = await _ref.read(dioClientProvider).dio.get(
          '/v1/students/roster',
          queryParameters: {'class_id': classId},
        );
        return ((response.data['data'] as List?) ?? const [])
            .whereType<Map>()
            .map((item) => item.cast<String, dynamic>())
            .toList();
      } catch (_) {}
    }

    final cached = ((_box.get('children') as List?) ?? const [])
        .whereType<Map>()
        .map((item) => item.cast<String, dynamic>())
        .where((student) => student['class_id'] == classId)
        .toList();
    return cached;
  }
}

final studentsRepositoryProvider = Provider<StudentsRepository>((ref) {
  return StudentsRepository(ref);
});

final childrenProvider =
    FutureProvider<OfflineData<List<Map<String, dynamic>>>>((ref) async {
  return ref.watch(studentsRepositoryProvider).listChildren();
});

final rosterProvider =
    FutureProvider.family<List<Map<String, dynamic>>, String>((ref, classId) async {
  return ref.watch(studentsRepositoryProvider).getRoster(classId);
});
