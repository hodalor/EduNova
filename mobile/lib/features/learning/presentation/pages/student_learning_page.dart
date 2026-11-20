import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../academics/presentation/providers/academics_provider.dart';
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

bool _isQuiz(Map<String, dynamic> item) {
  final type = (item['assessment_type'] ?? 'quiz').toString().toLowerCase();
  return type.contains('quiz') || type.contains('test') || type.contains('exam');
}

class StudentLearningPage extends ConsumerWidget {
  const StudentLearningPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final learningAsync = ref.watch(studentLearningHubProvider);
    final reportCardsAsync = ref.watch(reportCardsProvider);

    return learningAsync.when(
      data: (payload) {
        final data = payload.data;
        final materials = ((data['materials'] as List?) ?? const [])
            .whereType<Map>()
            .map((item) => item.cast<String, dynamic>())
            .toList();
        final assessments = ((data['assessments'] as List?) ?? const [])
            .whereType<Map>()
            .map((item) => item.cast<String, dynamic>())
            .toList();
        final quizzes = assessments.where(_isQuiz).toList();
        final assignments = assessments.where((item) => !_isQuiz(item)).toList();
        final results = ((data['results'] as List?) ?? const [])
            .whereType<Map>()
            .map((item) => item.cast<String, dynamic>())
            .toList();
        final reportCards = reportCardsAsync.valueOrNull?.data ?? const <Map<String, dynamic>>[];

        return DefaultTabController(
          length: 4,
          child: Column(
            children: [
              const Material(
                color: AppColors.surface,
                child: TabBar(
                  isScrollable: true,
                  labelColor: AppColors.primary,
                  unselectedLabelColor: AppColors.textMuted,
                  tabs: [
                    Tab(text: 'Library'),
                    Tab(text: 'Quizzes'),
                    Tab(text: 'Assignments'),
                    Tab(text: 'Results'),
                  ],
                ),
              ),
              if (payload.isStale)
                const Padding(
                  padding: EdgeInsets.fromLTRB(16, 12, 16, 0),
                  child: Text(
                    'Showing the last cached learning data.',
                    style: TextStyle(color: AppColors.warning, fontWeight: FontWeight.w600),
                  ),
                ),
              Expanded(
                child: TabBarView(
                  children: [
                    _RecordList(
                      emptyTitle: 'No library files yet',
                      emptySubtitle: 'Lecture notes and slides will appear here when published.',
                      children: materials
                          .map(
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
                          )
                          .toList(),
                    ),
                    _RecordList(
                      emptyTitle: 'No quizzes yet',
                      emptySubtitle: 'Published quizzes for your courses will show here.',
                      children: quizzes.map((item) => _AssessmentTile(item: item)).toList(),
                    ),
                    _RecordList(
                      emptyTitle: 'No assignments yet',
                      emptySubtitle: 'Published assignments for your courses will show here.',
                      children: assignments.map((item) => _AssessmentTile(item: item)).toList(),
                    ),
                    _RecordList(
                      emptyTitle: 'No results yet',
                      emptySubtitle: 'Published report cards and marked work will appear here.',
                      children: [
                        ...reportCards.map((card) {
                          final subjects = ((card['results'] as List?) ?? const [])
                              .whereType<Map>()
                              .map((item) => item.cast<String, dynamic>())
                              .toList();
                          return Card(
                            child: ExpansionTile(
                              leading: const Icon(Icons.school_outlined, color: AppColors.primary),
                              title: Text(card['term_name']?.toString() ?? card['term']?.toString() ?? 'Report card'),
                              subtitle: Text(
                                'Average ${card['overall_average'] ?? 0}% · Grade ${card['overall_grade'] ?? 'N/A'}',
                              ),
                              children: subjects
                                  .map(
                                    (subject) => ListTile(
                                      title: Text(subject['subject']?.toString() ?? 'Subject'),
                                      trailing: Text(subject['grade']?.toString() ?? '${subject['score'] ?? ''}'),
                                    ),
                                  )
                                  .toList(),
                            ),
                          );
                        }),
                        ...results.map((item) {
                          final finalScore = num.tryParse(
                                item['final_score']?.toString() ?? item['auto_score']?.toString() ?? '0',
                              ) ??
                              0;
                          final maxScore = num.tryParse(item['max_score']?.toString() ?? '0') ?? 0;
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
                        }),
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
      error: (error, _) => Center(child: Text('Failed to load e-learning access: $error')),
    );
  }
}

class _AssessmentTile extends StatelessWidget {
  const _AssessmentTile({required this.item});

  final Map<String, dynamic> item;

  @override
  Widget build(BuildContext context) {
    return Card(
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
    );
  }
}

class _RecordList extends StatelessWidget {
  const _RecordList({
    required this.emptyTitle,
    required this.emptySubtitle,
    required this.children,
  });

  final String emptyTitle;
  final String emptySubtitle;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    if (children.isEmpty) {
      return ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: ListTile(
              title: Text(emptyTitle),
              subtitle: Text(emptySubtitle),
            ),
          ),
        ],
      );
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: children,
    );
  }
}
