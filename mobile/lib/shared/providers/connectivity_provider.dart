import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final connectivityProvider =
    StreamProvider<List<ConnectivityResult>>((ref) {
  return Connectivity().onConnectivityChanged;
});

final isOnlineProvider = Provider<bool>((ref) {
  final state = ref.watch(connectivityProvider);
  return state.maybeWhen(
    data: (results) => results.any((result) => result != ConnectivityResult.none),
    orElse: () => true,
  );
});
