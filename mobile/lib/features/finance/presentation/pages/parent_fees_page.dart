import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_colors.dart';
import '../providers/finance_provider.dart';

class ParentFeesPage extends ConsumerStatefulWidget {
  const ParentFeesPage({super.key});

  @override
  ConsumerState<ParentFeesPage> createState() => _ParentFeesPageState();
}

class _ParentFeesPageState extends ConsumerState<ParentFeesPage> {
  String? _invoiceId;
  String _paymentMethod = 'mobile_money';
  final _amountController = TextEditingController();
  final _phoneController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _amountController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _submitPayment() async {
    if (_invoiceId == null || _amountController.text.trim().isEmpty) {
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final receipt = await ref.read(financeRepositoryProvider).submitPayment(
            invoiceId: _invoiceId!,
            amount: num.tryParse(_amountController.text.trim()) ?? 0,
            paymentMethod: _paymentMethod,
            phone: _phoneController.text.trim(),
          );
      ref.invalidate(invoicesProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Payment recorded. Receipt ${receipt['payment']?['receipt_number'] ?? ''}',
            ),
          ),
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
    final invoicesAsync = ref.watch(invoicesProvider);

    return invoicesAsync.when(
      data: (payload) {
        final invoices = payload.data;
        final receipts = invoices.where((item) => (item['paid_amount'] as num? ?? 0) > 0).toList();
        _invoiceId ??= invoices.isNotEmpty ? invoices.first['id']?.toString() : null;

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text(
              'Invoices',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 12),
            ...invoices.map(
              (invoice) => Card(
                child: ListTile(
                  title: Text(invoice['invoice_number']?.toString() ?? 'Invoice'),
                  subtitle: Text('GHS ${invoice['total_amount'] ?? 0}'),
                  trailing: Chip(
                    label: Text(invoice['status']?.toString() ?? 'pending'),
                    backgroundColor: invoice['status'] == 'paid'
                        ? AppColors.success.withOpacity(0.12)
                        : AppColors.warning.withOpacity(0.12),
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
                      'Payment',
                      style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      value: _invoiceId,
                      items: invoices
                          .map(
                            (invoice) => DropdownMenuItem(
                              value: invoice['id']?.toString(),
                              child: Text(invoice['invoice_number']?.toString() ?? 'Invoice'),
                            ),
                          )
                          .toList(),
                      onChanged: (value) => setState(() => _invoiceId = value),
                      decoration: const InputDecoration(labelText: 'Select Invoice'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _amountController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Amount'),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      value: _paymentMethod,
                      items: const [
                        DropdownMenuItem(value: 'mobile_money', child: Text('Mobile Money')),
                        DropdownMenuItem(value: 'card', child: Text('Card')),
                      ],
                      onChanged: (value) => setState(() => _paymentMethod = value ?? 'mobile_money'),
                      decoration: const InputDecoration(labelText: 'Payment Method'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(labelText: 'Mobile Money Phone'),
                    ),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: _isSubmitting ? null : _submitPayment,
                      child: Text(_isSubmitting ? 'Submitting...' : 'Request Payment Prompt'),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Receipts',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 12),
            ...receipts.map(
              (receipt) => Card(
                child: ListTile(
                  leading: const Icon(Icons.receipt_long_outlined),
                  title: Text(receipt['invoice_number']?.toString() ?? 'Receipt'),
                  subtitle: Text('Paid amount GHS ${receipt['paid_amount'] ?? 0}'),
                  trailing: const Icon(Icons.download_outlined),
                ),
              ),
            ),
          ],
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(child: Text('Failed to load invoices: $error')),
    );
  }
}
