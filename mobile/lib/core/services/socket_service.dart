import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../../features/auth/presentation/providers/auth_provider.dart';
import '../../shared/services/storage_service.dart';

class SocketService with WidgetsBindingObserver {
  SocketService({
    required this.baseUrl,
    required this.storageService,
  });

  final String baseUrl;
  final StorageService storageService;

  io.Socket? _notificationsSocket;
  io.Socket? _transportSocket;
  io.Socket? _chatSocket;

  final StreamController<Map<String, dynamic>> _notificationsController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _busLocationController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _chatMessagesController =
      StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get notificationsStream =>
      _notificationsController.stream;
  Stream<Map<String, dynamic>> get busLocationStream =>
      _busLocationController.stream;
  Stream<Map<String, dynamic>> get chatMessagesStream =>
      _chatMessagesController.stream;

  Future<void> connect() async {
    final token = await storageService.getAccessToken();
    if (token == null || token.isEmpty) {
      return;
    }

    WidgetsBinding.instance.addObserver(this);
    _notificationsSocket ??= _buildNamespace('/notifications', token)
      ..on('notification:new', _emitMap(_notificationsController))
      ..on('notification:badge_update', _emitMap(_notificationsController));

    _transportSocket ??= _buildNamespace('/transport', token)
      ..on('bus:location_update', _emitMap(_busLocationController));

    _chatSocket ??= _buildNamespace('/chat', token)
      ..on('message:new', _emitMap(_chatMessagesController))
      ..on('message:read', _emitMap(_chatMessagesController));
  }

  io.Socket _buildNamespace(String namespace, String token) {
    return io.io(
      '$baseUrl$namespace',
      io.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .enableReconnection()
          .setQuery({'token': token})
          .build(),
    )..connect();
  }

  void Function(dynamic) _emitMap(StreamController<Map<String, dynamic>> target) {
    return (dynamic payload) {
      if (payload is Map<String, dynamic>) {
        target.add(payload);
      } else if (payload is Map) {
        target.add(payload.cast<String, dynamic>());
      }
    };
  }

  @override
  Future<void> didChangeAppLifecycleState(AppLifecycleState state) async {
    if (state == AppLifecycleState.resumed) {
      await reconnect();
    }
  }

  Future<void> reconnect() async {
    disconnect();
    await connect();
  }

  void disconnect() {
    _notificationsSocket?.disconnect();
    _transportSocket?.disconnect();
    _chatSocket?.disconnect();
    _notificationsSocket = null;
    _transportSocket = null;
    _chatSocket = null;
  }

  Future<void> dispose() async {
    WidgetsBinding.instance.removeObserver(this);
    disconnect();
    await _notificationsController.close();
    await _busLocationController.close();
    await _chatMessagesController.close();
  }
}

String _normalizeSocketBaseUrl(String value) {
  final normalized = value.endsWith('/api') ? value.substring(0, value.length - 4) : value;
  return normalized.endsWith('/') ? normalized.substring(0, normalized.length - 1) : normalized;
}

final socketServiceProvider = Provider<SocketService>((ref) {
  final service = SocketService(
    baseUrl: _normalizeSocketBaseUrl(
      const String.fromEnvironment(
        'EDUOVA_API_BASE_URL',
        defaultValue: 'http://localhost:5000/api',
      ),
    ),
    storageService: ref.watch(storageServiceProvider),
  );
  ref.onDispose(service.dispose);
  return service;
});
