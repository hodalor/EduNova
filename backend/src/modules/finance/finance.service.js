const { createSequence } = require('../../shared/helpers/common');
const { logAudit } = require('../../shared/services/audit-log.service');
const { store } = require('../../shared/store/runtime-store');
const { models, sequelize } = require('../../config/database');
const analyticsService = require('../analytics/analytics.service');

const listInvoices = async ({ institutionId, query }) => {
  if (models.StudentInvoice) {
    try {
      const where = { institution_id: institutionId };
      if (query.status) where.status = query.status;
      const rows = await models.StudentInvoice.findAll({
        where,
        include: [{ model: models.Student, as: 'student', required: false, attributes: ['id', 'student_number'] }],
        order: [['created_at', 'DESC']],
      });
      return rows.map((r) => r.toJSON());
    } catch (_error) {
      // fall through to runtime
    }
  }
  const items = store.finance.invoices.filter((invoice) => invoice.institution_id === institutionId);
  if (query.status) {
    return items.filter((invoice) => invoice.status === query.status);
  }
  return items;
};

const createInvoice = async ({ institutionId, userId, payload, ip }) => {
  const totalAmount = Number(payload.total_amount || 0);
  const baseInvoice = {
    institution_id: institutionId,
    student_id: payload.student_id,
    student_name: payload.student_name,
    class_name: payload.class_name,
    invoice_number: payload.invoice_number || createSequence('INV', new Date(), (store.finance.invoices.length || 0) + 1, 3),
    total_amount: totalAmount,
    paid_amount: 0,
    balance: totalAmount,
    status: 'pending',
    due_date: payload.due_date,
    items: payload.items || [],
    payment_term_id: payload.payment_term_id || null,
  };

  if (models.StudentInvoice && sequelize?.transaction) {
    try {
      const row = await models.StudentInvoice.create({
        institution_id: institutionId,
        student_id: payload.student_id,
        academic_year_id: payload.academic_year_id || null,
        term_id: payload.term_id || null,
        invoice_number: baseInvoice.invoice_number,
        total_amount: totalAmount,
        paid_amount: 0,
        balance: totalAmount,
        status: 'pending',
        due_date: payload.due_date || null,
        items: payload.items || [],
      });
      const invoice = { ...baseInvoice, id: row.id };
      await logAudit({
        userId,
        action: 'CREATE',
        resourceType: 'invoice',
        resourceId: row.id,
        newValues: invoice,
        ip,
      });
      return invoice;
    } catch (_error) {
      // fall through to runtime
    }
  }

  const invoice = {
    id: `inv-${(store.finance.invoices.length || 0) + 1}`,
    ...baseInvoice,
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
  const amount = Number(payload.amount || 0);
  let invoice;
  let invoiceModel;

  if (models.StudentInvoice && models.Payment && sequelize?.transaction) {
    try {
      const tx = await sequelize.transaction();
      try {
        invoiceModel = await models.StudentInvoice.findOne({
          where: { id: payload.invoice_id, institution_id: institutionId },
          transaction: tx,
        });
        if (!invoiceModel) {
          await tx.rollback();
          throw Object.assign(new Error('Invoice not found.'), { statusCode: 404 });
        }
        invoiceModel.paid_amount = Number(invoiceModel.paid_amount || 0) + amount;
        invoiceModel.balance = Math.max(Number(invoiceModel.total_amount || 0) - Number(invoiceModel.paid_amount || 0), 0);
        invoiceModel.status =
          invoiceModel.balance === 0 ? 'paid' : Number(invoiceModel.paid_amount) > 0 ? 'partial' : 'pending';
        await invoiceModel.save({ transaction: tx });

        const payment = await models.Payment.create(
          {
            invoice_id: invoiceModel.id,
            student_id: invoiceModel.student_id,
            amount,
            payment_method: payload.payment_method || 'cash',
            transaction_ref: payload.transaction_ref || null,
            receipt_number: payload.receipt_number || createSequence('RCT', new Date(), (store.finance.payments.length || 0) + 1, 3),
            paid_at: payload.paid_at || new Date().toISOString(),
            received_by: userId,
            notes: payload.notes || null,
            is_verified: true,
          },
          { transaction: tx }
        );
        await tx.commit();
        invoice = invoiceModel.toJSON();
        const paymentJson = payment.toJSON();

        await logAudit({
          userId,
          action: 'UPDATE',
          resourceType: 'invoice_payment',
          resourceId: payment.id,
          newValues: paymentJson,
          ip,
        });
        await analyticsService.invalidateAnalyticsCache(institutionId);
        return { invoice, payment: paymentJson };
      } catch (error) {
        await tx.rollback();
        throw error;
      }
    } catch (_error) {
      if (_error.statusCode === 404) throw _error;
      // fall through to runtime
    }
  }

  invoice = store.finance.invoices.find(
    (item) => item.id === payload.invoice_id && item.institution_id === institutionId
  );
  if (!invoice) {
    throw Object.assign(new Error('Invoice not found.'), { statusCode: 404 });
  }

  invoice.paid_amount = Number(invoice.paid_amount || 0) + amount;
  invoice.balance = Math.max(Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0), 0);
  invoice.status =
    invoice.balance === 0 ? 'paid' : Number(invoice.paid_amount) > 0 ? 'partial' : 'pending';

  const payment = {
    id: `pay-${(store.finance.payments.length || 0) + 1}`,
    invoice_id: invoice.id,
    student_id: invoice.student_id,
    amount,
    payment_method: payload.payment_method || 'cash',
    transaction_ref: payload.transaction_ref || null,
    receipt_number: createSequence('RCT', new Date(), (store.finance.payments.length || 0) + 1, 3),
    paid_at: payload.paid_at || new Date().toISOString(),
    received_by: userId,
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

const listFeeStructures = async ({ institutionId }) => {
  if (models.FeeStructure) {
    try {
      const rows = await models.FeeStructure.findAll({ where: { institution_id: institutionId } });
      if (rows.length) return rows.map((r) => r.toJSON());
    } catch (_error) {
      // fall through
    }
  }
  return store.finance.feeStructures.filter((item) => item.institution_id === institutionId);
};

const getOverdueInvoices = async ({ institutionId, referenceDate = new Date().toISOString().slice(0, 10) }) => {
  const all = await listInvoices({ institutionId, query: {} });
  return all.filter(
    (invoice) =>
      Number(invoice.balance || 0) > 0 &&
      invoice.due_date &&
      String(invoice.due_date).slice(0, 10) < String(referenceDate).slice(0, 10)
  );
};

const listDebtors = async ({ institutionId }) => {
  const invoices = await listInvoices({ institutionId, query: {} });
  const outstanding = invoices.filter((inv) => Number(inv.balance || 0) > 0);
  const byStudent = new Map();
  for (const inv of outstanding) {
    const studentId = inv.student_id;
    if (!byStudent.has(studentId)) {
      byStudent.set(studentId, {
        student_id: studentId,
        student_name: inv.student_name,
        class_name: inv.class_name,
        total_owing: 0,
        invoice_count: 0,
        invoices: [],
      });
    }
    const entry = byStudent.get(studentId);
    entry.total_owing = Number(entry.total_owing) + Number(inv.balance || 0);
    entry.invoice_count += 1;
    entry.invoices.push({
      id: inv.id,
      invoice_number: inv.invoice_number,
      due_date: inv.due_date,
      balance: inv.balance,
      status: inv.status,
    });
  }
  return Array.from(byStudent.values()).sort((a, b) => Number(b.total_owing) - Number(a.total_owing));
};

const listPaymentTerms = async ({ institutionId }) => {
  if (models.PaymentTerm) {
    try {
      const rows = await models.PaymentTerm.findAll({
        where: { institution_id: institutionId },
        order: [['created_at', 'ASC']],
      });
      return rows.map((r) => r.toJSON());
    } catch (_error) {
      // fall through
    }
  }
  const items = (store.finance.paymentTerms || []).filter((item) => item.institution_id === institutionId);
  return JSON.parse(JSON.stringify(items));
};

const createPaymentTerm = async ({ institutionId, userId, payload, ip }) => {
  const code = String(payload.code || '').trim().toUpperCase();
  if (!code) throw Object.assign(new Error('Payment term code is required.'), { statusCode: 400 });

  const installmentPercentages = Array.isArray(payload.installment_percentages)
    ? payload.installment_percentages.map(Number)
    : [100];
  const installmentCount = Number(payload.installment_count || installmentPercentages.length || 1);

  if (models.PaymentTerm) {
    try {
      const existing = await models.PaymentTerm.findOne({ where: { institution_id: institutionId, code } });
      if (existing) throw Object.assign(new Error('Payment term with this code already exists.'), { statusCode: 409 });
      const row = await models.PaymentTerm.create({
        institution_id: institutionId,
        name: payload.name,
        code,
        description: payload.description || null,
        due_days: Number(payload.due_days || 0),
        is_active: payload.is_active !== false,
        installment_count: installmentCount,
        installment_percentages: installmentPercentages,
      });
      await logAudit({
        userId,
        action: 'CREATE',
        resourceType: 'payment_term',
        resourceId: row.id,
        newValues: row.toJSON(),
        ip,
      });
      return row.toJSON();
    } catch (error) {
      if (error.statusCode === 409 || error.statusCode === 400) throw error;
      // fall through to runtime
    }
  }

  const existing = (store.finance.paymentTerms || []).find(
    (item) => item.institution_id === institutionId && item.code === code
  );
  if (existing) throw Object.assign(new Error('Payment term with this code already exists.'), { statusCode: 409 });

  const term = {
    id: `pt-${(store.finance.paymentTerms || []).length + 1}`,
    institution_id: institutionId,
    name: payload.name,
    code,
    description: payload.description || null,
    due_days: Number(payload.due_days || 0),
    is_active: payload.is_active !== false,
    installment_count: installmentCount,
    installment_percentages: installmentPercentages,
  };
  if (!store.finance.paymentTerms) store.finance.paymentTerms = [];
  store.finance.paymentTerms.push(term);

  await logAudit({
    userId,
    action: 'CREATE',
    resourceType: 'payment_term',
    resourceId: term.id,
    newValues: term,
    ip,
  });

  return term;
};

const updatePaymentTerm = async ({ institutionId, userId, termId, payload, ip }) => {
  let term;
  let oldValues;

  if (models.PaymentTerm) {
    try {
      const row = await models.PaymentTerm.findOne({
        where: { id: termId, institution_id: institutionId },
      });
      if (!row) throw Object.assign(new Error('Payment term not found.'), { statusCode: 404 });
      oldValues = row.toJSON();
      if (payload.code) {
        const normalized = String(payload.code).trim().toUpperCase();
        const duplicate = await models.PaymentTerm.findOne({
          where: { institution_id: institutionId, code: normalized },
        });
        if (duplicate && String(duplicate.id) !== String(termId)) {
          throw Object.assign(new Error('Payment term with this code already exists.'), { statusCode: 409 });
        }
      }
      const updates = {
        ...(payload.name ? { name: payload.name } : {}),
        ...(payload.code ? { code: String(payload.code).trim().toUpperCase() } : {}),
        ...(payload.description !== undefined ? { description: payload.description || null } : {}),
        ...(payload.due_days !== undefined ? { due_days: Number(payload.due_days || 0) } : {}),
        ...(payload.is_active !== undefined ? { is_active: Boolean(payload.is_active) } : {}),
        ...(payload.installment_count !== undefined ? { installment_count: Number(payload.installment_count || 1) } : {}),
        ...(payload.installment_percentages !== undefined
          ? { installment_percentages: payload.installment_percentages.map(Number) }
          : {}),
      };
      await row.update(updates);
      term = row.toJSON();
      await logAudit({
        userId,
        action: 'UPDATE',
        resourceType: 'payment_term',
        resourceId: term.id,
        oldValues,
        newValues: term,
        ip,
      });
      return term;
    } catch (error) {
      if (error.statusCode === 409 || error.statusCode === 404 || error.statusCode === 400) throw error;
      // fall through to runtime
    }
  }

  term = (store.finance.paymentTerms || []).find(
    (item) => item.id === termId && item.institution_id === institutionId
  );
  if (!term) throw Object.assign(new Error('Payment term not found.'), { statusCode: 404 });
  oldValues = JSON.parse(JSON.stringify(term));

  if (payload.code) {
    const normalized = String(payload.code).trim().toUpperCase();
    const duplicate = (store.finance.paymentTerms || []).find(
      (item) => item.institution_id === institutionId && item.code === normalized && String(item.id) !== String(termId)
    );
    if (duplicate) {
      throw Object.assign(new Error('Payment term with this code already exists.'), { statusCode: 409 });
    }
    term.code = normalized;
  }
  if (payload.name !== undefined) term.name = payload.name;
  if (payload.description !== undefined) term.description = payload.description || null;
  if (payload.due_days !== undefined) term.due_days = Number(payload.due_days || 0);
  if (payload.is_active !== undefined) term.is_active = Boolean(payload.is_active);
  if (payload.installment_count !== undefined) term.installment_count = Number(payload.installment_count || 1);
  if (payload.installment_percentages !== undefined) {
    term.installment_percentages = payload.installment_percentages.map(Number);
  }

  await logAudit({
    userId,
    action: 'UPDATE',
    resourceType: 'payment_term',
    resourceId: term.id,
    oldValues,
    newValues: JSON.parse(JSON.stringify(term)),
    ip,
  });
  return JSON.parse(JSON.stringify(term));
};

const deletePaymentTerm = async ({ institutionId, userId, termId, ip }) => {
  if (models.PaymentTerm) {
    try {
      const row = await models.PaymentTerm.findOne({
        where: { id: termId, institution_id: institutionId },
      });
      if (!row) throw Object.assign(new Error('Payment term not found.'), { statusCode: 404 });
      const oldValues = row.toJSON();
      await row.destroy();
      await logAudit({
        userId,
        action: 'DELETE',
        resourceType: 'payment_term',
        resourceId: termId,
        oldValues,
        ip,
      });
      return { success: true, id: termId };
    } catch (error) {
      if (error.statusCode === 404) throw error;
      // fall through
    }
  }
  const idx = (store.finance.paymentTerms || []).findIndex(
    (item) => item.id === termId && item.institution_id === institutionId
  );
  if (idx === -1) throw Object.assign(new Error('Payment term not found.'), { statusCode: 404 });
  const oldValues = (store.finance.paymentTerms || [])[idx];
  store.finance.paymentTerms.splice(idx, 1);
  await logAudit({
    userId,
    action: 'DELETE',
    resourceType: 'payment_term',
    resourceId: termId,
    oldValues,
    ip,
  });
  return { success: true, id: termId };
};

const listPayments = async ({ institutionId, query = {} }) => {
  if (models.Payment) {
    try {
      const where = {};
      if (query.invoice_id) where.invoice_id = query.invoice_id;
      if (query.student_id) where.student_id = query.student_id;
      const rows = await models.Payment.findAll({
        where,
        include: [{ model: models.StudentInvoice, as: 'invoice', required: false, attributes: ['id', 'invoice_number', 'institution_id'] }],
        order: [['paid_at', 'DESC']],
        limit: 100,
      });
      const filtered = rows.filter(
        (r) => !r.invoice || String(r.invoice.institution_id) === String(institutionId) || String(institutionId) === 'platform'
      );
      // Filter by institution_id on invoice join
      return filtered.map((r) => {
        const json = r.toJSON();
        if (json.invoice && String(json.invoice.institution_id) !== String(institutionId)) return null;
        delete json.invoice;
        return json;
      }).filter(Boolean);
    } catch (_error) {
      // fall through
    }
  }
  const all = (store.finance.payments || []).slice().sort((a, b) => String(b.paid_at || '').localeCompare(String(a.paid_at || '')));
  // filter by invoice -> institution_id via store.finance.invoices
  return all.filter((payment) => {
    if (query.student_id && String(payment.student_id) !== String(query.student_id)) return false;
    if (query.invoice_id && String(payment.invoice_id) !== String(query.invoice_id)) return false;
    const inv = (store.finance.invoices || []).find((i) => i.id === payment.invoice_id);
    if (inv && String(inv.institution_id) !== String(institutionId)) return false;
    return true;
  }).slice(0, 100);
};

module.exports = {
  listInvoices,
  createInvoice,
  recordPayment,
  listFeeStructures,
  getOverdueInvoices,
  listDebtors,
  listPaymentTerms,
  createPaymentTerm,
  updatePaymentTerm,
  deletePaymentTerm,
  listPayments,
};
