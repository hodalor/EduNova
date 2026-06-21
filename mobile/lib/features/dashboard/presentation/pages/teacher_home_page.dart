import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../attendance/presentation/providers/attendance_provider.dart';
import '../../../students/presentation/providers/students_provider.dart';
import '../providers/dashboard_provider.dart';

class TeacherHomePage extends ConsumerWidget {
  const TeacherHomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final timetableAsync = ref.watch(timetableProvider);
    final rosterAsync = ref.watch(rosterProvider('cls-001'));
    final reportAsync = ref.watch(attendanceReportProvider);
    final reportData = reportAsync.valueOrNull?.data ?? const <Map<String, dynamic>>[];
    final averageRate = reportData.isNotEmpty ? reportData.first['rate'] ?? 0 : 0;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          "Today's Timetable",
          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
        ),
        const SizedBox(height: 12),
        timetableAsync.when(
          data: (payload) => SizedBox(
            height: 120,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: payload.data.length,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (context, index) {
                final item = payload.data[index];
                return Container(
                  width: 220,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item['period']?.toString() ?? '',
                        style: const TextStyle(
                          color: AppColors.accent,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '${item['subject'] ?? ''} · ${item['room'] ?? ''}',
                        style: const TextStyle(color: Colors.white),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Text('Failed to load timetable: $error'),
        ),
        const SizedBox(height: 16),
        const Text(
          'Pending Tasks',
          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
        ),
        const SizedBox(height: 12),
        ...const [
          'Mark attendance cls-001',
          'Enter scores',
          'Review homework',
        ].map(
          (task) => Card(
            child: CheckboxListTile(
              value: false,
              onChanged: null,
              title: Text(task),
            ),
          ),
        ),
        const SizedBox(height: 16),
        GridView.count(
          crossAxisCount: 3,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 1.1,
          children: [
            _TeacherStat(
              value: '${timetableAsync.valueOrNull?.data.length ?? 0}',
              label: 'Classes Today',
            ),
            _TeacherStat(
              value: '${rosterAsync.valueOrNull?.length ?? 0}',
              label: 'My Students',
            ),
            _TeacherStat(
              value: '$averageRate%',
              label: 'Avg Attendance',
            ),
          ],
        ),
      ],
    );
  }
}

class _TeacherStat extends StatelessWidget {
  const _TeacherStat({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 22),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.textMuted),
            ),
          ],
        ),
      ),
    );
  }
}
