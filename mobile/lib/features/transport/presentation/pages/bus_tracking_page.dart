import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../../../core/services/socket_service.dart';
import '../providers/transport_provider.dart';

class BusTrackingPage extends ConsumerStatefulWidget {
  const BusTrackingPage({super.key});

  @override
  ConsumerState<BusTrackingPage> createState() => _BusTrackingPageState();
}

class _BusTrackingPageState extends ConsumerState<BusTrackingPage> {
  static const LatLng _school = LatLng(5.6037, -0.1870);
  StreamSubscription<Map<String, dynamic>>? _subscription;
  LatLng _bus = _school;
  String _eta = 'Loading...';
  String _route = 'Transport route';

  @override
  void initState() {
    super.initState();
    Future<void>(() async {
      final socketService = ref.read(socketServiceProvider);
      await socketService.connect();
      _subscription = socketService.busLocationStream.listen((payload) {
        if (!mounted) {
          return;
        }
        setState(() {
          _bus = LatLng(
            (payload['lat'] as num?)?.toDouble() ?? _bus.latitude,
            (payload['lng'] as num?)?.toDouble() ?? _bus.longitude,
          );
          _eta = payload['eta']?.toString() ?? _eta;
        });
      });
    });
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final locationAsync = ref.watch(vehicleLocationProvider('veh-001'));

    return locationAsync.when(
      data: (payload) {
        final location = payload.data;
        final stop = (location['student_stop'] as Map?)?.cast<String, dynamic>() ?? {};
        final stopPoint = LatLng(
          (stop['lat'] as num?)?.toDouble() ?? _school.latitude,
          (stop['lng'] as num?)?.toDouble() ?? _school.longitude,
        );
        _bus = LatLng(
          (location['lat'] as num?)?.toDouble() ?? _bus.latitude,
          (location['lng'] as num?)?.toDouble() ?? _bus.longitude,
        );
        _eta = location['eta']?.toString() ?? _eta;
        _route = location['route']?.toString() ?? _route;

        return Column(
          children: [
            Expanded(
              child: GoogleMap(
                initialCameraPosition: const CameraPosition(
                  target: _school,
                  zoom: 13,
                ),
                markers: {
                  Marker(
                    markerId: const MarkerId('bus'),
                    position: _bus,
                    infoWindow: const InfoWindow(title: 'School Bus'),
                  ),
                  Marker(
                    markerId: const MarkerId('stop'),
                    position: stopPoint,
                    infoWindow: InfoWindow(title: stop['name']?.toString() ?? 'Student Stop'),
                  ),
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Card(
                child: ListTile(
                  title: Text(payload.isStale ? 'Cached transport status' : 'Bus is en route'),
                  subtitle: Text('ETA: $_eta · Route: $_route'),
                  trailing: Chip(label: Text(payload.isStale ? 'Cached' : 'Live')),
                ),
              ),
            ),
          ],
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(child: Text('Failed to load transport: $error')),
    );
  }
}
