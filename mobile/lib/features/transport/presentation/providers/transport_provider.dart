import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive/hive.dart';

import '../../../../core/cache/hive_cache.dart';
import '../../../../features/auth/presentation/providers/auth_provider.dart';
import '../../../../shared/models/offline_data.dart';

class TransportRepository {
  TransportRepository(this._ref);

  final Ref _ref;

  Future<bool> _isOnline() async {
    final results = await Connectivity().checkConnectivity();
    return results.any((item) => item != ConnectivityResult.none);
  }

  Box<dynamic> get _box => Hive.box<dynamic>(HiveCache.userProfileBox);

  Future<OfflineData<Map<String, dynamic>>> getVehicleLocation(String vehicleId) async {
    if (await _isOnline()) {
      try {
        final response = await _ref.read(dioClientProvider).dio.get(
          '/v1/transport/vehicles/$vehicleId/location',
        );
        final data = ((response.data['data'] as Map?) ?? const {}).cast<String, dynamic>();
        await _box.put('transport_$vehicleId', data);
        return OfflineData(data: data);
      } catch (_) {}
    }

    final cached = ((_box.get('transport_$vehicleId') as Map?) ?? const {}).cast<String, dynamic>();
    return OfflineData(data: cached, isStale: true);
  }
}

final transportRepositoryProvider = Provider<TransportRepository>((ref) {
  return TransportRepository(ref);
});

final vehicleLocationProvider =
    FutureProvider.family<OfflineData<Map<String, dynamic>>, String>((ref, vehicleId) async {
  return ref.watch(transportRepositoryProvider).getVehicleLocation(vehicleId);
});
