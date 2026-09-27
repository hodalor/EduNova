import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../students/presentation/providers/student_portal_provider.dart';
import '../providers/finance_provider.dart';

String _formatCurrency(dynamic amount, [String? currencyCode]) {
  final value = num.tryParse(amount?.toString() ?? '0') ?? 0;
  final code = (currencyCode ?? '').trim();
  if (code.isEmpty) {
    return value.toStringAsFixed(2);
  }
  return '$code ${value.toStringAsFixed(2)}';
}

class StudentFinancePage extends ConsumerStatefulWidget {
  const StudentFinancePage({super.key});

  @override
  ConsumerState<StudentFinancePage> createState() => _StudentFinancePageState();
}

class _StudentFinancePageState extends ConsumerState<StudentFinancePage> {
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
      ref.invalidate(studentRegistrationProvider);
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
    final registrationAsync = ref.watch(studentRegistrationProvider);

    return invoicesAsync.when(
      data: (payload) {
        final invoices = payload.data;
        final currencyCode = invoices.isNotEmpty
            ? invoices.first['currency_code']?.toString() ?? ''
            : '';
        final outstanding = invoices.fold<num>(
          0,
          (sum, item) => sum + (num.tryParse(item['net_balance']?.toString() ?? item['balance']?.toString() ?? '0') ?? 0),
        );
        final credit = invoices.fold<num>(
          0,
          (maxValue, item) {
            final current = num.tryParse(item['credit_balance']?.toString() ?? '0') ?? 0;
            return current > maxValue ? current : maxValue;
          },
        );
        _invoiceId ??= invoices.isNotEmpty ? invoices.first['id']?.toString() : null;

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Row(
              children: [
                Expanded(
                  child: Card(
                    child: ListTile(
                      title: const Text('Outstanding'),
                      subtitle: Text(
                        _formatCurrency(outstanding, currencyCode),
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: outstanding > 0 ? AppColors.error : AppColors.success,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Card(
                    child: ListTile(
                      title: const Text('Credit'),
                      subtitle: Text(
                        _formatCurrency(credit, currencyCode),
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          color: AppColors.success,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            registrationAsync.when(
              data: (registrationPayload) {
                final feeSummary =
                    (registrationPayload.data['fee_summary'] as Map?)?.cast<String, dynamic>() ??
                        {};
                return Card(
                  child: ListTile(
                    leading: const Icon(Icons.fact_check_outlined),
                    title: Text(
                      registrationPayload.data['fee_clearance'] == true
                          ? 'Cleared for course registration'
                          : 'Not yet cleared for course registration',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    subtitle: Text(
                      'Minimum required ${_formatCurrency(feeSummary['minimum_required_amount'], feeSummary['currency_code']?.toString())}',
                    ),
                  ),
                );
              },
              loading: () => const SizedBox.shrink(),
              error: (_, __) => const SizedBox.shrink(),
            ),
            const SizedBox(height: 16),
            const Text(
              'Invoices',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 12),
            ...invoices.map(
              (invoice) => Card(
                child: ListTile(
                  title: Text(invoice['invoice_number']?.toString() ?? 'Invoice'),
                  subtitle: Text(
                    'Total ${_formatCurrency(invoice['total_amount'], invoice['currency_code']?.toString())} · Balance ${_formatCurrency(invoice['net_balance'] ?? invoice['balance'], invoice['currency_code']?.toString())}',
                  ),
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
                      'Make Payment',
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
                        DropdownMenuItem(value: 'bank', child: Text('Bank')),
                        DropdownMenuItem(value: 'ussd', child: Text('USSD')),
                      ],
                      onChanged: (value) =>
                          setState(() => _paymentMethod = value ?? 'mobile_money'),
                      decoration: const InputDecoration(labelText: 'Payment Method'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        labelText: 'Phone / Reference',
                      ),
                    ),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: _isSubmitting ? null : _submitPayment,
                      child: Text(_isSubmitting ? 'Submitting...' : 'Start Payment'),
                    ),
                  ],
                ),
              ),
            ),
          ],
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(child: Text('Failed to load finance: $error')),
    );
  }
}
