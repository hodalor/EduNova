import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_colors.dart';
import '../providers/students_provider.dart';

class ChildrenPage extends ConsumerWidget {
  const ChildrenPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final childrenAsync = ref.watch(childrenProvider);

    return childrenAsync.when(
      data: (payload) {
        final child = payload.data.isNotEmpty ? payload.data.first : const <String, dynamic>{};
        return DefaultTabController(
          length: 4,
          child: Column(
            children: [
              Card(
                margin: const EdgeInsets.all(16),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      const CircleAvatar(radius: 28, child: Icon(Icons.person_outline)),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              child['full_name']?.toString() ?? 'Student',
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 18,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${child['class_name'] ?? ''} · ${child['student_number'] ?? ''}',
                            ),
                            const SizedBox(height: 8),
                            Chip(label: Text(child['level_code']?.toString() ?? '')),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const TabBar(
                isScrollable: true,
                tabs: [
                  Tab(text: 'Academic'),
                  Tab(text: 'Attendance'),
                  Tab(text: 'Finance'),
                  Tab(text: 'Discipline'),
                ],
              ),
              Expanded(
                child: TabBarView(
                  children: [
                    _buildSection(
                      title: 'Academic Overview',
                      bullets: [
                        'Class: ${child['class_name'] ?? 'N/A'}',
                        'Level: ${child['level_code'] ?? 'N/A'}',
                        'Next exam: ${child['next_exam'] ?? 'Not scheduled'}',
                      ],
                    ),
                    _buildSection(
                      title: 'Attendance Summary',
                      bullets: [
                        'Attendance this week: ${child['attendance_percent'] ?? 0}%',
                        'Offline cache remains available when network is down.',
                        'Tap the attendance tab for detailed sessions.',
                      ],
                    ),
                    _buildSection(
                      title: 'Finance',
                      bullets: [
                        'Outstanding balance: GHS ${child['balance_due'] ?? 0}',
                        'Invoices and payments load from the live backend.',
                        'Cached invoice data appears offline.',
                      ],
                    ),
                    _buildSection(
                      title: 'Discipline',
                      bullets: const [
                        'Discipline incidents endpoint can be added next.',
                        'This tab currently keeps the profile structure ready.',
                        'Use the communication tab for parent-teacher follow-up.',
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(child: Text('Failed to load children: $error')),
    );
  }

  Widget _buildSection({
    required String title,
    required List<String> bullets,
  }) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 12),
        ...bullets.map(
          (item) => Card(
            child: ListTile(
              leading: const Icon(Icons.check_circle_outline),
              title: Text(item),
            ),
          ),
        ),
      ],
    );
  }
}
