import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive/hive.dart';

import '../../../../core/cache/hive_cache.dart';
import '../../../../features/auth/presentation/providers/auth_provider.dart';
import '../../../../shared/models/offline_data.dart';

class FinanceRepository {
  FinanceRepository(this._ref);

  final Ref _ref;

  Future<bool> _isOnline() async {
    final results = await Connectivity().checkConnectivity();
    return results.any((item) => item != ConnectivityResult.none);
  }

  Box<dynamic> get _box => Hive.box<dynamic>(HiveCache.userProfileBox);

  Future<OfflineData<List<Map<String, dynamic>>>> getInvoices() async {
    if (await _isOnline()) {
      try {
        final response = await _ref.read(dioClientProvider).dio.get('/v1/finance/invoices');
        final data = ((response.data['data'] as List?) ?? const [])
            .whereType<Map>()
            .map((item) => item.cast<String, dynamic>())
            .toList();
        await _box.put('finance_invoices', data);
        return OfflineData(data: data);
      } catch (_) {}
    }

    final cached = ((_box.get('finance_invoices') as List?) ?? const [])
        .whereType<Map>()
        .map((item) => item.cast<String, dynamic>())
        .toList();
    return OfflineData(data: cached, isStale: true);
  }

  Future<Map<String, dynamic>> submitPayment({
    required String invoiceId,
    required num amount,
    required String paymentMethod,
    String? phone,
  }) async {
    final response = await _ref.read(dioClientProvider).dio.post(
      '/v1/finance/payments',
      data: {
        'invoice_id': invoiceId,
        'amount': amount,
        'payment_method': paymentMethod,
        'transaction_ref': phone,
      },
    );
    return (response.data['data'] as Map).cast<String, dynamic>();
  }
}

final financeRepositoryProvider = Provider<FinanceRepository>((ref) {
  return FinanceRepository(ref);
});

final invoicesProvider =
    FutureProvider<OfflineData<List<Map<String, dynamic>>>>((ref) async {
  return ref.watch(financeRepositoryProvider).getInvoices();
});
