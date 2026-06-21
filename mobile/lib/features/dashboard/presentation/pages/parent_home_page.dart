import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../communication/presentation/providers/communication_provider.dart';
import '../../../finance/presentation/providers/finance_provider.dart';
import '../../../students/presentation/providers/students_provider.dart';

class ParentHomePage extends ConsumerWidget {
  const ParentHomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider).valueOrNull;
    final firstName = auth?.user.firstName;
    final childrenAsync = ref.watch(childrenProvider);
    final notificationsAsync = ref.watch(notificationsProvider);
    final invoicesAsync = ref.watch(invoicesProvider);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Good morning, ${firstName != null && firstName.isNotEmpty ? firstName : 'Parent'}',
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Track your child\'s attendance, fees, exams, and communication from one place.',
                  style: TextStyle(color: AppColors.textMuted),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        const Text(
          'Your Children',
          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
        ),
        const SizedBox(height: 12),
        childrenAsync.when(
          data: (payload) {
            final children = payload.data;
            final selected = children.isNotEmpty ? children.first : const <String, dynamic>{};
            final balanceDue = invoicesAsync.valueOrNull?.data
                    .fold<num>(0, (sum, item) => sum + ((item['balance'] as num?) ?? 0)) ??
                0;
            final notificationsCount = notificationsAsync.valueOrNull?.data.length ?? 0;

            return Column(
              children: [
                SizedBox(
                  height: 110,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: children.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 12),
                    itemBuilder: (context, index) {
                      final child = children[index];
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
                              child['full_name']?.toString() ?? 'Student',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w700,
                                fontSize: 16,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              child['class_name']?.toString() ?? '',
                              style: const TextStyle(color: Colors.white70),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 16),
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 1.3,
                  children: [
                    _StatCard(
                      label: 'Attendance',
                      value: '${selected['attendance_percent'] ?? 0}%',
                      hint: 'This week',
                    ),
                    _StatCard(
                      label: 'Balance Due',
                      value: 'GHS $balanceDue',
                      hint: 'Current term',
                    ),
                    _StatCard(
                      label: 'Next Exam',
                      value: selected['next_exam']?.toString() ?? 'No exam',
                      hint: 'Upcoming',
                    ),
                    _StatCard(
                      label: 'Notifications',
                      value: '$notificationsCount',
                      hint: payload.isStale ? 'Cached data' : 'Unread updates',
                    ),
                  ],
                ),
              ],
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Text('Failed to load home data: $error'),
        ),
        const SizedBox(height: 16),
        const Text(
          'Quick Actions',
          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: const [
            _ActionChip(label: 'Pay Fees'),
            _ActionChip(label: 'View Results'),
            _ActionChip(label: 'Contact Teacher'),
            _ActionChip(label: 'Report Absence'),
          ],
        ),
        const SizedBox(height: 16),
        const Text(
          'Recent Notifications',
          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
        ),
        const SizedBox(height: 12),
        notificationsAsync.when(
          data: (payload) => Column(
            children: payload.data.take(5).map((notification) {
              return Card(
                child: ListTile(
                  leading: const CircleAvatar(
                    backgroundColor: AppColors.info,
                    child: Icon(Icons.notifications_outlined, color: Colors.white),
                  ),
                  title: Text(notification['title']?.toString() ?? 'Notification'),
                  subtitle: Text(notification['body']?.toString() ?? 'No details available'),
                ),
              );
            }).toList(),
          ),
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (_, __) => const Text('Unable to load notifications.'),
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    required this.hint,
  });

  final String label;
  final String value;
  final String hint;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(color: AppColors.textMuted)),
            const Spacer(),
            Text(
              value,
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 20,
              ),
            ),
            const SizedBox(height: 4),
            Text(hint, style: const TextStyle(color: AppColors.textMuted)),
          ],
        ),
      ),
    );
  }
}

class _ActionChip extends StatelessWidget {
  const _ActionChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return ActionChip(
      label: Text(label),
      onPressed: () {},
      backgroundColor: AppColors.surface,
      side: const BorderSide(color: Color(0xFFE2E8F0)),
      labelStyle: const TextStyle(fontWeight: FontWeight.w600),
    );
  }
}
