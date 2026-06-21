import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive/hive.dart';

import '../../../../core/cache/hive_cache.dart';
import '../../../../features/auth/presentation/providers/auth_provider.dart';
import '../../../../shared/models/offline_data.dart';

class CommunicationRepository {
  CommunicationRepository(this._ref);

  final Ref _ref;

  Future<bool> _isOnline() async {
    final results = await Connectivity().checkConnectivity();
    return results.any((item) => item != ConnectivityResult.none);
  }

  Box<dynamic> get _box => Hive.box<dynamic>(HiveCache.notificationsBox);

  Future<OfflineData<List<Map<String, dynamic>>>> getNotifications() async {
    if (await _isOnline()) {
      try {
        final response = await _ref.read(dioClientProvider).dio.get('/notifications/my');
        final data = ((response.data['data'] as List?) ?? const [])
            .whereType<Map>()
            .map((item) => item.cast<String, dynamic>())
            .toList();
        await _box.put('notifications', data);
        return OfflineData(data: data);
      } catch (_) {}
    }

    final cached = ((_box.get('notifications') as List?) ?? const [])
        .whereType<Map>()
        .map((item) => item.cast<String, dynamic>())
        .toList();
    return OfflineData(data: cached, isStale: true);
  }

  Future<OfflineData<List<Map<String, dynamic>>>> getThreadMessages(String threadId) async {
    if (await _isOnline()) {
      try {
        final response = await _ref.read(dioClientProvider).dio.get('/messages/threads/$threadId');
        final data = ((response.data['data'] as List?) ?? const [])
            .whereType<Map>()
            .map((item) => item.cast<String, dynamic>())
            .toList();
        await _box.put('thread_$threadId', data);
        return OfflineData(data: data);
      } catch (_) {}
    }

    final cached = ((_box.get('thread_$threadId') as List?) ?? const [])
        .whereType<Map>()
        .map((item) => item.cast<String, dynamic>())
        .toList();
    return OfflineData(data: cached, isStale: true);
  }

  Future<void> sendMessage({
    required String recipientId,
    required String body,
  }) async {
    await _ref.read(dioClientProvider).dio.post(
      '/messages',
      data: {
        'recipient_id': recipientId,
        'body': body,
      },
    );
  }
}

final communicationRepositoryProvider = Provider<CommunicationRepository>((ref) {
  return CommunicationRepository(ref);
});

final notificationsProvider =
    FutureProvider<OfflineData<List<Map<String, dynamic>>>>((ref) async {
  return ref.watch(communicationRepositoryProvider).getNotifications();
});

final threadMessagesProvider =
    FutureProvider.family<OfflineData<List<Map<String, dynamic>>>, String>((ref, threadId) async {
  return ref.watch(communicationRepositoryProvider).getThreadMessages(threadId);
});
