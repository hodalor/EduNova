import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_colors.dart';
import '../providers/academics_provider.dart';

class ParentResultsPage extends ConsumerWidget {
  const ParentResultsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reportCardsAsync = ref.watch(reportCardsProvider);

    return reportCardsAsync.when(
      data: (payload) {
        final reportCard = payload.data.isNotEmpty ? payload.data.first : const <String, dynamic>{};
        final results = ((reportCard['results'] as List?) ?? const [])
            .whereType<Map>()
            .map((item) => item.cast<String, dynamic>())
            .toList();

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            DropdownButtonFormField<String>(
              value: reportCard['term']?.toString(),
              items: payload.data
                  .map(
                    (item) => DropdownMenuItem(
                      value: item['term']?.toString(),
                      child: Text(item['term']?.toString() ?? 'Term'),
                    ),
                  )
                  .toList(),
              onChanged: (_) {},
              decoration: const InputDecoration(labelText: 'Select Term'),
            ),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _ResultMetric(
                      label: 'Average',
                      value: '${reportCard['overall_average'] ?? 0}%',
                    ),
                    _ResultMetric(
                      label: 'Grade',
                      value: reportCard['overall_grade']?.toString() ?? 'N/A',
                    ),
                    _ResultMetric(
                      label: 'Status',
                      value: reportCard['is_published'] == true ? 'Live' : 'Draft',
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Subject Grades',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
            ),
            const SizedBox(height: 12),
            ...results.map(
              (item) => Card(
                child: ListTile(
                  title: Text(item['subject']?.toString() ?? 'Subject'),
                  subtitle: Text('Score ${item['score'] ?? 0}'),
                  trailing: Chip(
                    label: Text(item['grade']?.toString() ?? 'N/A'),
                    backgroundColor: AppColors.info.withOpacity(0.12),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Comparison Chart',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 120,
                      child: Center(
                        child: Text(
                          payload.isStale
                              ? 'Showing cached report card data.'
                              : 'Live report card comparison can be layered here.',
                          style: const TextStyle(color: AppColors.textMuted),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: () {},
              icon: const Icon(Icons.picture_as_pdf_outlined),
              label: const Text('Download PDF'),
            ),
          ],
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(child: Text('Failed to load report cards: $error')),
    );
  }
}

class _ResultMetric extends StatelessWidget {
  const _ResultMetric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(label, style: const TextStyle(color: AppColors.textMuted)),
        const SizedBox(height: 8),
        Text(
          value,
          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
        ),
      ],
    );
  }
}
