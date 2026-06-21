import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../students/presentation/providers/students_provider.dart';
import '../providers/attendance_provider.dart';

class TeacherAttendancePage extends ConsumerStatefulWidget {
  const TeacherAttendancePage({super.key});

  @override
  ConsumerState<TeacherAttendancePage> createState() => _TeacherAttendancePageState();
}

class _TeacherAttendancePageState extends ConsumerState<TeacherAttendancePage> {
  final Map<String, String> _statuses = {};
  bool _isSubmitting = false;

  void _setAllPresent(List<Map<String, dynamic>> students) {
    setState(() {
      for (final student in students) {
        _statuses[student['id']?.toString() ?? ''] = 'present';
      }
    });
  }

  Future<void> _submit(List<Map<String, dynamic>> students) async {
    setState(() => _isSubmitting = true);
    var queuedCount = 0;
    for (final student in students) {
      final studentId = student['id']?.toString() ?? '';
      final queued = await ref.read(attendanceRepositoryProvider).markAttendance(
            sessionId: 'ses-001',
            payload: {
              'student_id': studentId,
              'student_name': student['student_name'] ?? student['full_name'],
              'status': _statuses[studentId] ?? 'present',
            },
          );
      if (queued) {
        queuedCount += 1;
      }
    }
    final synced = await ref.read(attendanceRepositoryProvider).syncQueuedMarks();
    ref.invalidate(attendanceReportProvider);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            queuedCount > 0
                ? '$queuedCount marks queued offline. $synced synced now.'
                : 'Attendance submitted successfully.',
          ),
        ),
      );
      setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final rosterAsync = ref.watch(rosterProvider('cls-001'));

    return rosterAsync.when(
      data: (students) => ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              Expanded(
                child: FilledButton(
                  onPressed: () => _setAllPresent(students),
                  child: const Text('Mark All Present'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton(
                  onPressed: () => ref.read(attendanceRepositoryProvider).syncQueuedMarks(),
                  child: const Text('Sync Queue'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ...students.map(
            (student) {
              final studentId = student['id']?.toString() ?? '';
              final status = _statuses[studentId] ?? 'present';
              return Card(
                child: ListTile(
                  leading: const CircleAvatar(child: Icon(Icons.person_outline)),
                  title: Text(student['student_name']?.toString() ?? 'Student'),
                  subtitle: Text('Status: $status'),
                  trailing: DropdownButton<String>(
                    value: status,
                    items: const [
                      DropdownMenuItem(value: 'present', child: Text('Present')),
                      DropdownMenuItem(value: 'late', child: Text('Late')),
                      DropdownMenuItem(value: 'absent', child: Text('Absent')),
                    ],
                    onChanged: (value) {
                      setState(() {
                        _statuses[studentId] = value ?? 'present';
                      });
                    },
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _isSubmitting ? null : () => _submit(students),
            child: Text(_isSubmitting ? 'Submitting...' : 'Submit Attendance'),
          ),
        ],
      ),
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(child: Text('Failed to load class roster: $error')),
    );
  }
}
