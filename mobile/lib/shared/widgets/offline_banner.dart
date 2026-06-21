import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';

class OfflineBanner extends StatelessWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<ConnectivityResult>>(
      stream: Connectivity().onConnectivityChanged,
      builder: (context, snapshot) {
        final connected = snapshot.data?.any((result) => result != ConnectivityResult.none) ?? true;
        if (connected) {
          return const SizedBox.shrink();
        }

        return Container(
          width: double.infinity,
          color: AppColors.warning,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: const SafeArea(
            bottom: false,
            child: Text(
              "You're offline — showing cached data",
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        );
      },
    );
  }
}
