import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../providers/student_portal_provider.dart';

class StudentProfilePage extends ConsumerWidget {
  const StudentProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider).valueOrNull;
    final profileAsync = ref.watch(studentProfileProvider);

    return profileAsync.when(
      data: (payload) {
        final profile = payload.data;
        final tertiary = (profile['tertiary'] as Map?)?.cast<String, dynamic>() ?? {};
        final personal = (profile['personal'] as Map?)?.cast<String, dynamic>() ?? {};
        final sponsorship =
            (profile['sponsorship'] as Map?)?.cast<String, dynamic>() ?? {};
        final guardian = (profile['guardian'] as Map?)?.cast<String, dynamic>() ?? {};
        final currentLevel =
            (tertiary['current_level'] as Map?)?.cast<String, dynamic>() ?? {};
        final currentPeriod =
            (tertiary['current_period'] as Map?)?.cast<String, dynamic>() ?? {};
        final roadmap = (tertiary['roadmap'] as Map?)?.cast<String, dynamic>() ?? {};

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
                      profile['name']?.toString() ?? auth?.user.fullName ?? 'Student',
                      style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${profile['student_number'] ?? auth?.user.studentNumber ?? ''} · ${tertiary['program_name'] ?? 'Programme pending'}',
                      style: const TextStyle(color: AppColors.textMuted),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        Chip(label: Text(tertiary['faculty_name']?.toString() ?? 'Faculty pending')),
                        Chip(label: Text(tertiary['department_name']?.toString() ?? 'Department pending')),
                        Chip(label: Text(tertiary['credential']?.toString() ?? 'Credential pending')),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            _SectionCard(
              title: 'Identity',
              rows: [
                _ProfileRow('Email', profile['email']?.toString() ?? auth?.user.email ?? ''),
                _ProfileRow('Nationality', personal['nationality']?.toString() ?? 'Not set'),
                _ProfileRow('ID Type', personal['id_type']?.toString() ?? 'Not set'),
                _ProfileRow('ID Number', personal['id_number']?.toString() ?? 'Not set'),
                _ProfileRow('Marital Status', personal['marital_status']?.toString() ?? 'Not set'),
              ],
            ),
            const SizedBox(height: 16),
            _SectionCard(
              title: 'Addresses',
              rows: [
                _ProfileRow(
                  'Residential Address',
                  personal['residential_address']?.toString() ?? 'Not set',
                ),
                _ProfileRow(
                  'Postal Address',
                  personal['postal_address']?.toString() ?? 'Not set',
                ),
              ],
            ),
            const SizedBox(height: 16),
            _SectionCard(
              title: 'Sponsorship',
              rows: [
                _ProfileRow('Sponsor Type', sponsorship['sponsor_type']?.toString() ?? 'self'),
                _ProfileRow('Sponsor Name', sponsorship['sponsor_name']?.toString() ?? 'Not set'),
                _ProfileRow('Guardian', guardian['name']?.toString() ?? 'Not set'),
                _ProfileRow('Guardian Phone', guardian['phone']?.toString() ?? 'Not set'),
              ],
            ),
            const SizedBox(height: 16),
            _SectionCard(
              title: 'Academic Placement',
              rows: [
                _ProfileRow('Current Level', currentLevel['name']?.toString() ?? 'Pending'),
                _ProfileRow('Current Semester', currentPeriod['name']?.toString() ?? 'Pending'),
                _ProfileRow('Road Map Levels', '${roadmap['level_count'] ?? 0}'),
                _ProfileRow('Road Map Courses', '${roadmap['total_courses'] ?? 0}'),
              ],
            ),
          ],
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(child: Text('Failed to load profile: $error')),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.title,
    required this.rows,
  });

  final String title;
  final List<_ProfileRow> rows;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 12),
            ...rows.map(
              (row) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      width: 140,
                      child: Text(
                        row.label,
                        style: const TextStyle(color: AppColors.textMuted),
                      ),
                    ),
                    Expanded(
                      child: Text(
                        row.value,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileRow {
  const _ProfileRow(this.label, this.value);

  final String label;
  final String value;
}
