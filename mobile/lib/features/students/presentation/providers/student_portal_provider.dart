import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive/hive.dart';

import '../../../../core/cache/hive_cache.dart';
import '../../../../features/auth/presentation/providers/auth_provider.dart';
import '../../../../shared/models/offline_data.dart';

class StudentPortalRepository {
  StudentPortalRepository(this._ref);

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

  Future<OfflineData<Map<String, dynamic>>> getStudentProfile() async {
    final studentId = _getStudentId();

    if (await _isOnline()) {
      try {
        final response = await _ref.read(dioClientProvider).dio.get('/v1/students/$studentId');
        final data = ((response.data['data'] as Map?) ?? const {}).cast<String, dynamic>();
        await _box.put('student_profile', data);
        return OfflineData(data: data);
      } catch (_) {}
    }

    final cached = ((_box.get('student_profile') as Map?) ?? const {}).cast<String, dynamic>();
    return OfflineData(data: cached, isStale: true);
  }

  Future<OfflineData<Map<String, dynamic>>> getRegistrationState() async {
    final studentId = _getStudentId();

    if (await _isOnline()) {
      try {
        final response =
            await _ref.read(dioClientProvider).dio.get('/v1/tertiary/student-registration/$studentId');
        final data = ((response.data['data'] as Map?) ?? const {}).cast<String, dynamic>();
        await _box.put('student_registration', data);
        return OfflineData(data: data);
      } catch (_) {}
    }

    final cached =
        ((_box.get('student_registration') as Map?) ?? const {}).cast<String, dynamic>();
    return OfflineData(data: cached, isStale: true);
  }

  Future<Map<String, dynamic>> registerCourses(List<String> courseIds) async {
    final studentId = _getStudentId();
    final response = await _ref.read(dioClientProvider).dio.post(
      '/v1/tertiary/course-registration',
      data: {
        'student_id': studentId,
        'course_ids': courseIds,
      },
    );
    final data = ((response.data['data'] as Map?) ?? const {}).cast<String, dynamic>();
    await _box.delete('student_registration');
    return data;
  }
}

final studentPortalRepositoryProvider = Provider<StudentPortalRepository>((ref) {
  return StudentPortalRepository(ref);
});

final studentProfileProvider =
    FutureProvider<OfflineData<Map<String, dynamic>>>((ref) async {
  return ref.watch(studentPortalRepositoryProvider).getStudentProfile();
});

final studentRegistrationProvider =
    FutureProvider<OfflineData<Map<String, dynamic>>>((ref) async {
  return ref.watch(studentPortalRepositoryProvider).getRegistrationState();
});
