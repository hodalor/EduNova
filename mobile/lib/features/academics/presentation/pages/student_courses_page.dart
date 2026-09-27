import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../students/presentation/providers/student_portal_provider.dart';

String _formatCurrency(dynamic amount, [String? currencyCode]) {
  final value = num.tryParse(amount?.toString() ?? '0') ?? 0;
  final code = (currencyCode ?? '').trim();
  if (code.isEmpty) {
    return value.toStringAsFixed(2);
  }
  return '$code ${value.toStringAsFixed(2)}';
}

class StudentCoursesPage extends ConsumerStatefulWidget {
  const StudentCoursesPage({super.key});

  @override
  ConsumerState<StudentCoursesPage> createState() => _StudentCoursesPageState();
}

class _StudentCoursesPageState extends ConsumerState<StudentCoursesPage> {
  final Set<String> _selectedCourseIds = <String>{};
  bool _isSubmitting = false;

  Future<void> _submitRegistration() async {
    if (_selectedCourseIds.isEmpty) {
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      await ref
          .read(studentPortalRepositoryProvider)
          .registerCourses(_selectedCourseIds.toList());
      ref.invalidate(studentRegistrationProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Courses registered successfully.')),
        );
      }
      setState(() => _selectedCourseIds.clear());
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Unable to register courses: $error')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final registrationAsync = ref.watch(studentRegistrationProvider);

    return registrationAsync.when(
      data: (payload) {
        final registration = payload.data;
        final currentGroup =
            (registration['current_group'] as Map?)?.cast<String, dynamic>() ?? {};
        final currentPeriod =
            (registration['current_period'] as Map?)?.cast<String, dynamic>() ?? {};
        final feeSummary =
            (registration['fee_summary'] as Map?)?.cast<String, dynamic>() ?? {};
        final eligibleCourses = ((registration['eligible_courses'] as List?) ?? const [])
            .whereType<Map>()
            .map((item) => item.cast<String, dynamic>())
            .toList();
        final blockedCourses = ((registration['blocked_courses'] as List?) ?? const [])
            .whereType<Map>()
            .map((item) => item.cast<String, dynamic>())
            .toList();
        final registeredCourses = ((registration['already_registered'] as List?) ?? const [])
            .whereType<Map>()
            .expand(
              (row) => ((row['courses'] as List?) ?? const [])
                  .whereType<Map>()
                  .map((item) => item.cast<String, dynamic>()),
            )
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
                    Text(
                      currentGroup['name']?.toString() ?? 'Current level pending',
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      currentPeriod['name']?.toString() ?? 'Current semester pending',
                      style: const TextStyle(color: AppColors.textMuted),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        Chip(
                          label: Text(
                            registration['fee_clearance'] == true
                                ? 'Fee cleared'
                                : 'Fee clearance pending',
                          ),
                          backgroundColor: (registration['fee_clearance'] == true
                                  ? AppColors.success
                                  : AppColors.warning)
                              .withOpacity(0.12),
                        ),
                        Chip(
                          label: Text(
                            registration['can_progress'] == true
                                ? 'Can progress'
                                : 'Carry-over hold',
                          ),
                          backgroundColor: (registration['can_progress'] == true
                                  ? AppColors.info
                                  : AppColors.error)
                              .withOpacity(0.12),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Minimum required ${_formatCurrency(feeSummary['minimum_required_amount'], feeSummary['currency_code']?.toString())} · Outstanding ${_formatCurrency(feeSummary['outstanding_amount'], feeSummary['currency_code']?.toString())}',
                      style: const TextStyle(color: AppColors.textMuted),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Eligible Courses',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 12),
            if (eligibleCourses.isEmpty)
              const Card(
                child: ListTile(
                  title: Text('No courses ready'),
                  subtitle: Text('There are no eligible courses available for registration right now.'),
                ),
              )
            else
              ...eligibleCourses.map(
                (course) {
                  final courseId = course['id']?.toString() ?? '';
                  final selected = _selectedCourseIds.contains(courseId);
                  final prerequisites = ((course['prerequisite_codes'] as List?) ?? const [])
                      .map((item) => item.toString())
                      .join(', ');
                  return Card(
                    child: CheckboxListTile(
                      value: selected,
                      onChanged: registration['fee_clearance'] == true
                          ? (value) {
                              setState(() {
                                if (value == true) {
                                  _selectedCourseIds.add(courseId);
                                } else {
                                  _selectedCourseIds.remove(courseId);
                                }
                              });
                            }
                          : null,
                      title: Text(
                        '${course['code'] ?? ''} ${course['name'] ?? 'Course'}',
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                      subtitle: Text(
                        [
                          'Credits ${course['credit_hours'] ?? 0}',
                          if (prerequisites.isNotEmpty) 'Prerequisites $prerequisites',
                          _formatCurrency(course['fee_amount'], course['currency_code']?.toString()),
                        ].join(' · '),
                      ),
                      controlAffinity: ListTileControlAffinity.leading,
                    ),
                  );
                },
              ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: registration['fee_clearance'] == true && !_isSubmitting
                  ? _submitRegistration
                  : null,
              icon: const Icon(Icons.check_circle_outline),
              label: Text(
                _isSubmitting
                    ? 'Submitting...'
                    : 'Register ${_selectedCourseIds.length} selected course(s)',
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Already Registered',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 12),
            if (registeredCourses.isEmpty)
              const Card(
                child: ListTile(
                  title: Text('No submitted registration yet'),
                  subtitle: Text('Your registered courses will appear here once submitted.'),
                ),
              )
            else
              ...registeredCourses.map(
                (course) => Card(
                  child: ListTile(
                    leading: const Icon(Icons.verified_outlined, color: AppColors.success),
                    title: Text('${course['code'] ?? ''} ${course['name'] ?? 'Course'}'),
                    subtitle: Text('Credits ${course['credit_hours'] ?? 0}'),
                  ),
                ),
              ),
            const SizedBox(height: 24),
            const Text(
              'Blocked Courses',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 12),
            if (blockedCourses.isEmpty)
              const Card(
                child: ListTile(
                  title: Text('No blocked courses'),
                  subtitle: Text('There are no blocked courses for this semester.'),
                ),
              )
            else
              ...blockedCourses.map(
                (course) => Card(
                  child: ListTile(
                    leading: const Icon(Icons.block_outlined, color: AppColors.error),
                    title: Text('${course['code'] ?? ''} ${course['name'] ?? 'Course'}'),
                    subtitle: Text(course['reason']?.toString() ?? 'Not available for registration.'),
                  ),
                ),
              ),
          ],
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(child: Text('Failed to load course registration: $error')),
    );
  }
}
