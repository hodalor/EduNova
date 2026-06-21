import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_colors.dart';
import '../providers/attendance_provider.dart';

class ParentAttendancePage extends ConsumerWidget {
  const ParentAttendancePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reportAsync = ref.watch(attendanceReportProvider);

    return reportAsync.when(
      data: (payload) {
        final report = payload.data.isNotEmpty ? payload.data.first : const <String, dynamic>{};
        final rate = report['rate'] ?? 0;
        final days = List.generate(30, (index) => index + 1);

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'This Month Attendance',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                    Text(
                      '$rate%',
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 24,
                        color: AppColors.success,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: days.map((day) {
                final color = day <= (report['present'] ?? 0)
                    ? AppColors.success
                    : day <= ((report['present'] ?? 0) + (report['late'] ?? 0))
                        ? AppColors.warning
                        : AppColors.error;
                return GestureDetector(
                  onTap: () {
                    showModalBottomSheet<void>(
                      context: context,
                      builder: (context) => ListTile(
                        title: Text('Session Day $day'),
                        subtitle: Text(
                          payload.isStale
                              ? 'Cached attendance details'
                              : 'Present ${report['present'] ?? 0} · Late ${report['late'] ?? 0} · Absent ${report['absent'] ?? 0}',
                        ),
                      ),
                    );
                  },
                  child: Container(
                    width: 44,
                    height: 44,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.14),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '$day',
                      style: TextStyle(
                        color: color,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(child: Text('Failed to load attendance: $error')),
    );
  }
}
