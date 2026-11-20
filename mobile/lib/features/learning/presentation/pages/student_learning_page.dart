import 'package:dio/dio.dart';
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
                                onTap: () => _openMaterial(context, item),
                              ),
                            ),
                          )
                          .toList(),
                    ),
                    _RecordList(
                      emptyTitle: 'No quizzes yet',
                      emptySubtitle: 'Published quizzes for your courses will show here.',
                      children: quizzes
                          .map(
                            (item) => _AssessmentTile(
                              item: item,
                              onOpen: () => _openAssessment(context, ref, item),
                            ),
                          )
                          .toList(),
                    ),
                    _RecordList(
                      emptyTitle: 'No assignments yet',
                      emptySubtitle: 'Published assignments for your courses will show here.',
                      children: assignments
                          .map(
                            (item) => _AssessmentTile(
                              item: item,
                              onOpen: () => _openAssessment(context, ref, item),
                            ),
                          )
                          .toList(),
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

void _openMaterial(BuildContext context, Map<String, dynamic> item) {
  final description = item['description']?.toString().trim() ?? '';
  final attachment = item['attachment_url']?.toString().trim() ?? '';
  showDialog<void>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(item['title']?.toString() ?? 'Library item'),
      content: Text(
        [
          if (description.isNotEmpty) description,
          if (attachment.isNotEmpty) attachment,
          if (description.isEmpty && attachment.isEmpty) 'No file has been attached to this item yet.',
        ].join('\n\n'),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Close')),
      ],
    ),
  );
}

Future<void> _openAssessment(BuildContext context, WidgetRef ref, Map<String, dynamic> item) async {
  final submitted = await Navigator.of(context).push<bool>(
    MaterialPageRoute(builder: (_) => _AssessmentAttemptPage(item: item)),
  );
  if (submitted == true) {
    ref.invalidate(studentLearningHubProvider);
    ref.invalidate(reportCardsProvider);
  }
}

class _AssessmentAttemptPage extends ConsumerStatefulWidget {
  const _AssessmentAttemptPage({required this.item});

  final Map<String, dynamic> item;

  @override
  ConsumerState<_AssessmentAttemptPage> createState() => _AssessmentAttemptPageState();
}

class _AssessmentAttemptPageState extends ConsumerState<_AssessmentAttemptPage> {
  final Map<String, String> _answers = {};
  bool _submitting = false;

  List<Map<String, dynamic>> get _questions => ((widget.item['questions'] as List?) ?? const [])
      .whereType<Map>()
      .map((item) => item.cast<String, dynamic>())
      .toList();

  Future<void> _submit() async {
    final id = widget.item['id']?.toString() ?? '';
    if (id.isEmpty) {
      return;
    }
    setState(() => _submitting = true);
    try {
      await ref.read(studentLearningRepositoryProvider).submitAssessment(
            assessmentId: id,
            answers: _answers,
          );
      if (mounted) {
        Navigator.of(context).pop(true);
      }
    } on DioException catch (error) {
      final payload = error.response?.data;
      final message = payload is Map && payload['message'] is String
          ? payload['message'].toString()
          : 'Unable to submit this assessment.';
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
      }
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final questions = _questions;
    return Scaffold(
      appBar: AppBar(title: Text(widget.item['title']?.toString() ?? 'Assessment')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            '${widget.item['course_code'] ?? ''} ${widget.item['course_name'] ?? ''}'.trim(),
            style: const TextStyle(color: AppColors.textMuted),
          ),
          if ((widget.item['instructions']?.toString() ?? '').isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(widget.item['instructions'].toString()),
          ],
          const SizedBox(height: 16),
          if (questions.isEmpty)
            const Text('This assessment has no questions yet.')
          else
            ...questions.map((question) {
              final questionId = question['id']?.toString() ?? '';
              final options = ((question['options'] as List?) ?? const []).map((item) => item.toString()).toList();
              return Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(question['prompt']?.toString() ?? 'Question', style: const TextStyle(fontWeight: FontWeight.w700)),
                      const SizedBox(height: 12),
                      if (options.isEmpty)
                        TextFormField(
                          minLines: 3,
                          maxLines: 6,
                          decoration: const InputDecoration(labelText: 'Your answer'),
                          onChanged: (value) => _answers[questionId] = value,
                        )
                      else
                        ...options.map(
                          (option) => ListTile(
                            contentPadding: EdgeInsets.zero,
                            leading: Icon(
                              _answers[questionId] == option
                                  ? Icons.radio_button_checked
                                  : Icons.radio_button_off,
                              color: AppColors.primary,
                            ),
                            title: Text(option),
                            onTap: () => setState(() => _answers[questionId] = option),
                          ),
                        ),
                    ],
                  ),
                ),
              );
            }),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _submitting || questions.isEmpty ? null : _submit,
            child: Text(_submitting ? 'Submitting...' : 'Submit'),
          ),
        ],
      ),
    );
  }
}

class _AssessmentTile extends StatelessWidget {
  const _AssessmentTile({required this.item, required this.onOpen});

  final Map<String, dynamic> item;
  final VoidCallback onOpen;

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
        onTap: onOpen,
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
