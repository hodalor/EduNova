import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../students/presentation/providers/students_provider.dart';
import '../providers/academics_provider.dart';

class TeacherGradebookPage extends ConsumerStatefulWidget {
  const TeacherGradebookPage({super.key});

  @override
  ConsumerState<TeacherGradebookPage> createState() => _TeacherGradebookPageState();
}

class _TeacherGradebookPageState extends ConsumerState<TeacherGradebookPage> {
  final Map<String, TextEditingController> _controllers = {};
  String _subject = 'sub-001';
  String _assessment = 'Midterm';
  bool _isSaving = false;

  Future<void> _saveScores(List<Map<String, dynamic>> students) async {
    setState(() => _isSaving = true);
    try {
      await ref.read(academicsRepositoryProvider).saveScores(
            classId: 'cls-001',
            subjectId: _subject,
            assessmentName: _assessment,
            levelCode: 'SH',
            scores: students
                .map(
                  (student) => {
                    'student_id': student['id'],
                    'student_name': student['student_name'],
                    'score': num.tryParse(
                          _controllers[student['id']]?.text.trim() ?? '0',
                        ) ??
                        0,
                  },
                )
                .toList(),
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Scores saved to backend.')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final rosterAsync = ref.watch(rosterProvider('cls-001'));

    return rosterAsync.when(
      data: (students) => ListView(
        padding: const EdgeInsets.all(16),
        children: [
          DropdownButtonFormField<String>(
            value: _subject,
            items: const [
              DropdownMenuItem(value: 'sub-001', child: Text('Mathematics')),
              DropdownMenuItem(value: 'sub-002', child: Text('Science')),
            ],
            onChanged: (value) => setState(() => _subject = value ?? 'sub-001'),
            decoration: const InputDecoration(labelText: 'Subject'),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: _assessment,
            items: const [
              DropdownMenuItem(value: 'Midterm', child: Text('Midterm')),
              DropdownMenuItem(value: 'Quiz', child: Text('Quiz')),
            ],
            onChanged: (value) => setState(() => _assessment = value ?? 'Midterm'),
            decoration: const InputDecoration(labelText: 'Assessment'),
          ),
          const SizedBox(height: 16),
          ...students.map(
            (student) {
              final key = student['id']?.toString() ?? '';
              final controller = _controllers.putIfAbsent(key, () => TextEditingController());
              return Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Expanded(child: Text(student['student_name']?.toString() ?? 'Student')),
                      const SizedBox(width: 16),
                      SizedBox(
                        width: 96,
                        child: TextField(
                          controller: controller,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'Score',
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              FilledButton(
                onPressed: _isSaving ? null : () => _saveScores(students),
                child: Text(_isSaving ? 'Saving...' : 'Save All'),
              ),
              OutlinedButton(
                onPressed: () {},
                child: const Text('Import CSV'),
              ),
            ],
          ),
        ],
      ),
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(child: Text('Failed to load roster: $error')),
    );
  }
}
