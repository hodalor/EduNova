import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive/hive.dart';

import '../../../../core/cache/hive_cache.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../../shared/models/offline_data.dart';

class StudentLearningRepository {
  StudentLearningRepository(this._ref);

  final Ref _ref;

  Future<bool> _isOnline() async {
    final results = await Connectivity().checkConnectivity();
    return results.any((item) => item != ConnectivityResult.none);
  }

  Box<dynamic> get _box => Hive.box<dynamic>(HiveCache.userProfileBox);

  String _getStudentId() {
    final auth = _ref.read(authProvider).valueOrNull;
    final studentId = auth?.user.studentId ?? '';
    if (studentId.isEmpty) {
      throw Exception('Student profile is not linked to this login yet.');
    }
    return studentId;
  }

  Future<OfflineData<Map<String, dynamic>>> getLearningHub() async {
    _getStudentId();

    if (await _isOnline()) {
      try {
        final dio = _ref.read(dioClientProvider).dio;
        final responses = await Future.wait([
          dio.get('/v1/learning/courses'),
          dio.get('/v1/learning/materials'),
          dio.get('/v1/learning/assessments'),
          dio.get('/v1/learning/results/me'),
        ]);

        final data = <String, dynamic>{
          'courses': ((responses[0].data['data'] as List?) ?? const [])
              .whereType<Map>()
              .map((item) => item.cast<String, dynamic>())
              .toList(),
          'materials': ((responses[1].data['data'] as List?) ?? const [])
              .whereType<Map>()
              .map((item) => item.cast<String, dynamic>())
              .toList(),
          'assessments': ((responses[2].data['data'] as List?) ?? const [])
              .whereType<Map>()
              .map((item) => item.cast<String, dynamic>())
              .toList(),
          'results': ((responses[3].data['data'] as List?) ?? const [])
              .whereType<Map>()
              .map((item) => item.cast<String, dynamic>())
              .toList(),
        };

        await _box.put('student_learning_hub', data);
        return OfflineData(data: data);
      } catch (_) {}
    }

    final cached =
        ((_box.get('student_learning_hub') as Map?) ?? const {}).cast<String, dynamic>();
    return OfflineData(data: cached, isStale: true);
  }
}

final studentLearningRepositoryProvider = Provider<StudentLearningRepository>((ref) {
  return StudentLearningRepository(ref);
});

final studentLearningHubProvider =
    FutureProvider<OfflineData<Map<String, dynamic>>>((ref) async {
  return ref.watch(studentLearningRepositoryProvider).getLearningHub();
});
