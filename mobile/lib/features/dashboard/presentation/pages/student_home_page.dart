import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../finance/presentation/providers/finance_provider.dart';
import '../../../students/presentation/providers/student_portal_provider.dart';

String _formatCurrency(dynamic amount, [String? currencyCode]) {
  final value = num.tryParse(amount?.toString() ?? '0') ?? 0;
  final code = (currencyCode ?? '').trim();
  if (code.isEmpty) {
    return value.toStringAsFixed(2);
  }
  return '$code ${value.toStringAsFixed(2)}';
}

class StudentHomePage extends ConsumerWidget {
  const StudentHomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider).valueOrNull;
    final profileAsync = ref.watch(studentProfileProvider);
    final registrationAsync = ref.watch(studentRegistrationProvider);
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
                  'Welcome, ${auth?.user.firstName.isNotEmpty == true ? auth!.user.firstName : 'Student'}',
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '${auth?.institution.name ?? 'EDUOVA'} tertiary portal for course registration, e-learning, finance, and academic progress.',
                  style: const TextStyle(color: AppColors.textMuted),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        profileAsync.when(
          data: (profilePayload) {
            final profile = profilePayload.data;
            final tertiary = (profile['tertiary'] as Map?)?.cast<String, dynamic>() ?? {};
            final currentLevel =
                (tertiary['current_level'] as Map?)?.cast<String, dynamic>() ?? {};
            final currentPeriod =
                (tertiary['current_period'] as Map?)?.cast<String, dynamic>() ?? {};
            final roadmap =
                (tertiary['roadmap'] as Map?)?.cast<String, dynamic>() ?? {};
            final invoiceRows = invoicesAsync.valueOrNull?.data ?? const <Map<String, dynamic>>[];
            final outstanding = invoiceRows.fold<num>(
              0,
              (sum, item) => sum + (num.tryParse(item['net_balance']?.toString() ?? item['balance']?.toString() ?? '0') ?? 0),
            );
            final currencyCode = invoiceRows.isNotEmpty
                ? (invoiceRows.first['currency_code']?.toString() ?? '')
                : '';

            return Column(
              children: [
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 1.35,
                  children: [
                    _MetricCard(
                      label: 'Program',
                      value: tertiary['program_name']?.toString() ?? 'Not assigned',
                      hint: tertiary['credential']?.toString() ?? 'Tertiary programme',
                    ),
                    _MetricCard(
                      label: 'Current Level',
                      value: currentLevel['name']?.toString() ?? 'Pending',
                      hint: currentPeriod['name']?.toString() ?? 'Current semester',
                    ),
                    _MetricCard(
                      label: 'Outstanding',
                      value: _formatCurrency(outstanding, currencyCode),
                      hint: outstanding > 0 ? 'Payment needed' : 'Account clear',
                    ),
                    _MetricCard(
                      label: 'Road Map',
                      value: '${roadmap['level_count'] ?? 0} levels',
                      hint: '${roadmap['total_courses'] ?? 0} total courses',
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                registrationAsync.when(
                  data: (registrationPayload) {
                    final registration =
                        registrationPayload.data;
                    final feeSummary =
                        (registration['fee_summary'] as Map?)?.cast<String, dynamic>() ?? {};
                    final eligibleCourses =
                        ((registration['eligible_courses'] as List?) ?? const [])
                            .whereType<Map>()
                            .map((item) => item.cast<String, dynamic>())
                            .toList();
                    final blockedCourses =
                        ((registration['blocked_courses'] as List?) ?? const [])
                            .whereType<Map>()
                            .map((item) => item.cast<String, dynamic>())
                            .toList();

                    return Column(
                      children: [
                        Card(
                          child: ListTile(
                            leading: CircleAvatar(
                              backgroundColor: (registration['fee_clearance'] == true
                                      ? AppColors.success
                                      : AppColors.warning)
                                  .withOpacity(0.14),
                              child: Icon(
                                registration['fee_clearance'] == true
                                    ? Icons.check_circle_outline
                                    : Icons.warning_amber_rounded,
                                color: registration['fee_clearance'] == true
                                    ? AppColors.success
                                    : AppColors.warning,
                              ),
                            ),
                            title: Text(
                              registration['fee_clearance'] == true
                                  ? 'Cleared for registration'
                                  : 'Registration clearance pending',
                              style: const TextStyle(fontWeight: FontWeight.w700),
                            ),
                            subtitle: Text(
                              'Minimum required ${_formatCurrency(feeSummary['minimum_required_amount'], feeSummary['currency_code']?.toString())} · Eligible courses ${eligibleCourses.length}',
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Today\'s Focus',
                                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
                                ),
                                const SizedBox(height: 12),
                                _ActionRow(
                                  icon: Icons.menu_book_outlined,
                                  title: 'Eligible Courses',
                                  subtitle: eligibleCourses.isEmpty
                                      ? 'No courses ready for registration yet.'
                                      : '${eligibleCourses.take(3).map((item) => item['code']).join(', ')}',
                                ),
                                _ActionRow(
                                  icon: Icons.account_balance_wallet_outlined,
                                  title: 'Finance Standing',
                                  subtitle:
                                      'Outstanding ${_formatCurrency(feeSummary['outstanding_amount'], feeSummary['currency_code']?.toString())}',
                                ),
                                _ActionRow(
                                  icon: Icons.rule_folder_outlined,
                                  title: 'Blocked Courses',
                                  subtitle: blockedCourses.isEmpty
                                      ? 'No blocked courses right now.'
                                      : '${blockedCourses.length} course(s) blocked by prerequisites or carry-over policy.',
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (error, _) => Text('Unable to load registration status: $error'),
                ),
              ],
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Text('Unable to load student profile: $error'),
        ),
      ],
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

class _ActionRow extends StatelessWidget {
  const _ActionRow({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: AppColors.primary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text(subtitle, style: const TextStyle(color: AppColors.textMuted)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
