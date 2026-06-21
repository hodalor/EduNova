const { createSequence } = require('../../shared/helpers/common');
const { logAudit } = require('../../shared/services/audit-log.service');
const { store } = require('../../shared/store/runtime-store');
const analyticsService = require('../analytics/analytics.service');

const listInvoices = async ({ institutionId, query }) => {
  const items = store.finance.invoices.filter((invoice) => invoice.institution_id === institutionId);
  if (query.status) {
    return items.filter((invoice) => invoice.status === query.status);
  }
  return items;
};

const createInvoice = async ({ institutionId, userId, payload, ip }) => {
  const invoice = {
    id: `inv-${store.finance.invoices.length + 1}`,
    institution_id: institutionId,
    student_id: payload.student_id,
    student_name: payload.student_name,
    class_name: payload.class_name,
    invoice_number: payload.invoice_number || createSequence('INV', new Date(), store.finance.invoices.length + 1, 3),
    total_amount: Number(payload.total_amount),
    paid_amount: 0,
    balance: Number(payload.total_amount),
    status: 'pending',
    due_date: payload.due_date,
    items: payload.items || [],
  };
  store.finance.invoices.push(invoice);

  await logAudit({
    userId,
    action: 'CREATE',
    resourceType: 'invoice',
    resourceId: invoice.id,
    newValues: invoice,
    ip,
  });

  return invoice;
};

const recordPayment = async ({ institutionId, userId, payload, ip }) => {
  const invoice = store.finance.invoices.find(
    (item) => item.id === payload.invoice_id && item.institution_id === institutionId
  );
  if (!invoice) {
    throw Object.assign(new Error('Invoice not found.'), { statusCode: 404 });
  }

  const amount = Number(payload.amount);
  invoice.paid_amount += amount;
  invoice.balance = Math.max(invoice.total_amount - invoice.paid_amount, 0);
  invoice.status =
    invoice.balance === 0 ? 'paid' : invoice.paid_amount > 0 ? 'partial' : 'pending';

  const payment = {
    id: `pay-${store.finance.payments.length + 1}`,
    invoice_id: invoice.id,
    student_id: invoice.student_id,
    amount,
    payment_method: payload.payment_method,
    transaction_ref: payload.transaction_ref || null,
    receipt_number: createSequence('RCT', new Date(), store.finance.payments.length + 1, 3),
    paid_at: payload.paid_at || new Date().toISOString(),
  };
  store.finance.payments.push(payment);

  await logAudit({
    userId,
    action: 'UPDATE',
    resourceType: 'invoice_payment',
    resourceId: payment.id,
    newValues: payment,
    ip,
  });

  await analyticsService.invalidateAnalyticsCache(institutionId);
  return { invoice, payment };
};

const listFeeStructures = async ({ institutionId }) =>
  store.finance.feeStructures.filter((item) => item.institution_id === institutionId);

const getOverdueInvoices = async ({ institutionId, referenceDate = new Date().toISOString().slice(0, 10) }) =>
  store.finance.invoices.filter(
    (invoice) =>
      invoice.institution_id === institutionId &&
      invoice.balance > 0 &&
      invoice.due_date &&
      invoice.due_date < referenceDate
  );

module.exports = {
  listInvoices,
  createInvoice,
  recordPayment,
  listFeeStructures,
  getOverdueInvoices,
};
