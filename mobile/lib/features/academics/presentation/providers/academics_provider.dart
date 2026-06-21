import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive/hive.dart';

import '../../../../core/cache/hive_cache.dart';
import '../../../../features/auth/presentation/providers/auth_provider.dart';
import '../../../../shared/models/offline_data.dart';

class AcademicsRepository {
  AcademicsRepository(this._ref);

  final Ref _ref;

  Future<bool> _isOnline() async {
    final results = await Connectivity().checkConnectivity();
    return results.any((item) => item != ConnectivityResult.none);
  }

  Box<dynamic> get _box => Hive.box<dynamic>(HiveCache.userProfileBox);

  Future<OfflineData<List<Map<String, dynamic>>>> getReportCards() async {
    if (await _isOnline()) {
      try {
        final response = await _ref.read(dioClientProvider).dio.get('/v1/academics/report-cards');
        final data = ((response.data['data'] as List?) ?? const [])
            .whereType<Map>()
            .map((item) => item.cast<String, dynamic>())
            .toList();
        await _box.put('academics_report_cards', data);
        return OfflineData(data: data);
      } catch (_) {}
    }

    final cached = ((_box.get('academics_report_cards') as List?) ?? const [])
        .whereType<Map>()
        .map((item) => item.cast<String, dynamic>())
        .toList();
    return OfflineData(data: cached, isStale: true);
  }

  Future<void> saveScores({
    required String classId,
    required String subjectId,
    required String assessmentName,
    required String levelCode,
    required List<Map<String, dynamic>> scores,
  }) async {
    await _ref.read(dioClientProvider).dio.post(
      '/v1/academics/scores',
      data: {
        'class_id': classId,
        'subject_id': subjectId,
        'assessment_name': assessmentName,
        'level_code': levelCode,
        'scores': scores,
      },
    );
  }
}

final academicsRepositoryProvider = Provider<AcademicsRepository>((ref) {
  return AcademicsRepository(ref);
});

final reportCardsProvider =
    FutureProvider<OfflineData<List<Map<String, dynamic>>>>((ref) async {
  return ref.watch(academicsRepositoryProvider).getReportCards();
});
