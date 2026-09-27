import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_colors.dart';
import '../providers/student_learning_provider.dart';

String _formatDateTime(dynamic value) {
  final raw = value?.toString() ?? '';
  if (raw.isEmpty) {
    return 'Pending';
  }
  final parsed = DateTime.tryParse(raw);
  if (parsed == null) {
    return raw;
  }
  return '${parsed.year}-${parsed.month.toString().padLeft(2, '0')}-${parsed.day.toString().padLeft(2, '0')} ${parsed.hour.toString().padLeft(2, '0')}:${parsed.minute.toString().padLeft(2, '0')}';
}

class StudentLearningPage extends ConsumerWidget {
  const StudentLearningPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final learningAsync = ref.watch(studentLearningHubProvider);

    return learningAsync.when(
      data: (payload) {
        final data = payload.data;
        final courses = ((data['courses'] as List?) ?? const [])
            .whereType<Map>()
            .map((item) => item.cast<String, dynamic>())
            .toList();
        final materials = ((data['materials'] as List?) ?? const [])
            .whereType<Map>()
            .map((item) => item.cast<String, dynamic>())
            .toList();
        final assessments = ((data['assessments'] as List?) ?? const [])
            .whereType<Map>()
            .map((item) => item.cast<String, dynamic>())
            .toList();
        final results = ((data['results'] as List?) ?? const [])
            .whereType<Map>()
            .map((item) => item.cast<String, dynamic>())
            .toList();

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'E-Learning',
                      style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'View course materials, active assessments, and your latest results in one place.',
                      style: TextStyle(color: AppColors.textMuted),
                    ),
                    if (payload.isStale) ...[
                      const SizedBox(height: 12),
                      const Text(
                        'Showing the last cached learning data.',
                        style: TextStyle(color: AppColors.warning, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.35,
              children: [
                _MetricCard(
                  label: 'Courses',
                  value: '${courses.length}',
                  hint: 'Accessible tertiary courses',
                ),
                _MetricCard(
                  label: 'Library',
                  value: '${materials.length}',
                  hint: 'Published notes and slides',
                ),
                _MetricCard(
                  label: 'Assessments',
                  value: '${assessments.length}',
                  hint: 'Active quizzes and tests',
                ),
                _MetricCard(
                  label: 'Results',
                  value: '${results.length}',
                  hint: 'Submitted learning records',
                ),
              ],
            ),
            const SizedBox(height: 24),
            const Text(
              'Course Materials',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 12),
            if (materials.isEmpty)
              const Card(
                child: ListTile(
                  title: Text('No learning files yet'),
                  subtitle: Text('Lecture notes and slides will appear here when published.'),
                ),
              )
            else
              ...materials.take(8).map(
                (item) => Card(
                  child: ListTile(
                    leading: const Icon(Icons.menu_book_outlined, color: AppColors.primary),
                    title: Text(item['title']?.toString() ?? 'Course material'),
                    subtitle: Text(
                      '${item['course_code'] ?? ''} ${item['course_name'] ?? ''}\n${item['material_type'] ?? 'Material'} · ${_formatDateTime(item['created_at'])}',
                    ),
                    isThreeLine: true,
                  ),
                ),
              ),
            const SizedBox(height: 24),
            const Text(
              'Active Assessments',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 12),
            if (assessments.isEmpty)
              const Card(
                child: ListTile(
                  title: Text('No active assessments'),
                  subtitle: Text('Quizzes and tests assigned to your courses will show here.'),
                ),
              )
            else
              ...assessments.take(8).map(
                (item) => Card(
                  child: ListTile(
                    leading: const Icon(Icons.assignment_outlined, color: AppColors.info),
                    title: Text(item['title']?.toString() ?? 'Assessment'),
                    subtitle: Text(
                      '${item['course_code'] ?? ''} ${item['course_name'] ?? ''}\nDue ${_formatDateTime(item['due_at'])} · ${item['assessment_type'] ?? 'Assessment'}',
                    ),
                    isThreeLine: true,
                    trailing: Chip(
                      label: Text('${item['total_score'] ?? 0} marks'),
                      backgroundColor: AppColors.info.withOpacity(0.12),
                    ),
                  ),
                ),
              ),
            const SizedBox(height: 24),
            const Text(
              'My Results',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 12),
            if (results.isEmpty)
              const Card(
                child: ListTile(
                  title: Text('No results yet'),
                  subtitle: Text('Marked assessments and lecturer feedback will appear here.'),
                ),
              )
            else
              ...results.take(8).map(
                (item) {
                  final finalScore = num.tryParse(
                        item['final_score']?.toString() ?? item['auto_score']?.toString() ?? '0',
                      ) ??
                      0;
                  final maxScore =
                      num.tryParse(item['max_score']?.toString() ?? '0') ?? 0;
                  final isGraded = item['status']?.toString() == 'graded';
                  return Card(
                    child: ListTile(
                      leading: Icon(
                        isGraded ? Icons.verified_outlined : Icons.hourglass_bottom_outlined,
                        color: isGraded ? AppColors.success : AppColors.warning,
                      ),
                      title: Text(item['assessment_title']?.toString() ?? 'Result'),
                      subtitle: Text(
                        '${item['course_code'] ?? ''} ${item['course_name'] ?? ''}\nScore ${finalScore.toStringAsFixed(0)}/${maxScore.toStringAsFixed(0)} · ${item['feedback'] ?? 'No feedback yet'}',
                      ),
                      isThreeLine: true,
                    ),
                  );
                },
              ),
          ],
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(child: Text('Failed to load e-learning access: $error')),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
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
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
            ),
            const SizedBox(height: 6),
            Text(hint, style: const TextStyle(color: AppColors.textMuted)),
          ],
        ),
      ),
    );
  }
}
