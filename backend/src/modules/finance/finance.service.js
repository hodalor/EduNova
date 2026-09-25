const { Op } = require('sequelize');

const { createSequence } = require('../../shared/helpers/common');
const { logAudit } = require('../../shared/services/audit-log.service');
const { store } = require('../../shared/store/runtime-store');
const { models, sequelize } = require('../../config/database');
const analyticsService = require('../analytics/analytics.service');

const ensureAdmissionsSettings = (settings) => {
  const next = JSON.parse(JSON.stringify(settings || {}));
  next.admissions = next.admissions || {};
  next.admissions.student_profiles = next.admissions.student_profiles || [];
  return next;
};

const clone = (value) => JSON.parse(JSON.stringify(value || {}));

const ensureFinanceSettings = (settings) => {
  const next = clone(settings);
  next.finance = next.finance || {};
  next.finance.payment_approvals = next.finance.payment_approvals || [];
  next.finance.student_credits = next.finance.student_credits || [];
  next.finance.payment_gateway_requests = next.finance.payment_gateway_requests || [];
  next.finance.currencies = Array.isArray(next.finance.currencies) && next.finance.currencies.length
    ? next.finance.currencies
    : ['GHS', 'ZMW', 'USD'];
  next.finance.default_local_currency =
    next.finance.default_local_currency || next.finance.currencies[0] || 'GHS';
  next.finance.default_international_currency =
    next.finance.default_international_currency ||
    next.finance.currencies.find((item) => item !== next.finance.default_local_currency) ||
    'USD';
  next.access_control = next.access_control || {};
  next.access_control.finance_approval_grants = next.access_control.finance_approval_grants || {};
  return next;
};

const ensureFinanceRuntimeState = () => {
  store.finance.paymentApprovals = store.finance.paymentApprovals || [];
  store.finance.studentCredits = store.finance.studentCredits || [];
  store.finance.paymentGatewayRequests = store.finance.paymentGatewayRequests || [];
  store.users.accessGrants = store.users.accessGrants || {};
};

const normalizePermissionList = (value) =>
  Array.from(
    new Set(
      (Array.isArray(value) ? value : [])
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    )
  );

const getUserFinanceApprovalGrants = ({ settings, userId }) =>
  normalizePermissionList(settings?.access_control?.finance_approval_grants?.[userId]);

const getRuntimeFinanceApprovalGrants = (userId) => {
  ensureFinanceRuntimeState();
  return normalizePermissionList(store.users.accessGrants?.[userId]);
};

const getStudentCreditBalance = ({ settings, studentId }) => {
  const item = (settings?.finance?.student_credits || []).find(
    (entry) => String(entry.student_id) === String(studentId)
  );
  return Number(item?.amount || 0);
};

const setStudentCreditBalance = ({ settings, studentId, amount }) => {
  settings.finance.student_credits = settings.finance.student_credits || [];
  const nextAmount = Number(amount || 0);
  const index = settings.finance.student_credits.findIndex(
    (entry) => String(entry.student_id) === String(studentId)
  );

  if (nextAmount <= 0) {
    if (index >= 0) {
      settings.finance.student_credits.splice(index, 1);
    }
    return 0;
  }

  if (index >= 0) {
    settings.finance.student_credits[index].amount = nextAmount;
  } else {
    settings.finance.student_credits.push({ student_id: studentId, amount: nextAmount });
  }

  return nextAmount;
};

const getRuntimeStudentCreditBalance = (studentId) => {
  ensureFinanceRuntimeState();
  const item = (store.finance.studentCredits || []).find(
    (entry) => String(entry.student_id) === String(studentId)
  );
  return Number(item?.amount || 0);
};

const setRuntimeStudentCreditBalance = (studentId, amount) => {
  ensureFinanceRuntimeState();
  const nextAmount = Number(amount || 0);
  const index = (store.finance.studentCredits || []).findIndex(
    (entry) => String(entry.student_id) === String(studentId)
  );

  if (nextAmount <= 0) {
    if (index >= 0) {
      store.finance.studentCredits.splice(index, 1);
    }
    return 0;
  }

  if (index >= 0) {
    store.finance.studentCredits[index].amount = nextAmount;
  } else {
    store.finance.studentCredits.push({ student_id: studentId, amount: nextAmount });
  }

  return nextAmount;
};

const ensureCurrentAcademicYear = async ({ institutionId, transaction }) => {
  if (!models.AcademicYear) {
    return null;
  }

  const existing = await models.AcademicYear.findOne({
    where: { institution_id: institutionId, is_current: true },
    transaction,
  });
  if (existing) {
    return existing;
  }

  const year = new Date().getFullYear();
  return models.AcademicYear.create(
    {
      institution_id: institutionId,
      name: `${year}/${year + 1}`,
      start_date: `${year}-01-01`,
      end_date: `${year}-12-31`,
      is_current: true,
    },
    { transaction }
  );
};

const resolveInvoiceAcademicContext = async ({ institutionId, payload, transaction }) => {
  const academicYear = payload.academic_year_id
    ? { id: payload.academic_year_id }
    : await ensureCurrentAcademicYear({ institutionId, transaction });

  if (payload.term_id) {
    return {
      academic_year_id: academicYear?.id || null,
      term_id: payload.term_id,
    };
  }

  if (!payload.student_id || !models.Institution) {
    return {
      academic_year_id: academicYear?.id || null,
      term_id: null,
    };
  }

  const institution = await models.Institution.findByPk(institutionId, {
    attributes: ['id', 'settings'],
    transaction,
  }).catch(() => null);
  const settings = ensureFinanceSettings(ensureAdmissionsSettings(institution?.settings));
  const currentProgress = (settings.tertiary?.student_progress || []).find(
    (item) => String(item.student_id) === String(payload.student_id)
  );
  const currentPeriodId = currentProgress?.current_period_id || null;
  const period = (settings.academics?.periods || []).find((item) => item.id === currentPeriodId);

  return {
    academic_year_id: academicYear?.id || null,
    term_id: payload.term_id || period?.term_semester_id || null,
  };
};

const findPaymentAccountInProfiles = ({ settings, identifier }) => {
  const query = String(identifier || '').trim().toLowerCase();
  if (!query) {
    return null;
  }

  const progress = (settings?.tertiary?.student_progress || []).find(
    (item) =>
      String(item.student_id || '').trim().toLowerCase() === query ||
      String(item.student_number || '').trim().toLowerCase() === query
  );
  const profile = (settings?.admissions?.student_profiles || []).find((item) => {
    const fullName = String(item.full_name || '').trim().toLowerCase();
    return (
      String(item.student_id || '').trim().toLowerCase() === query ||
      String(item.student_number || '').trim().toLowerCase() === query ||
      fullName === query
    );
  });

  const programId = progress?.program_id || profile?.tertiary?.program_id || null;
  const program =
    (settings?.tertiary?.programs || []).find((item) => String(item.id) === String(programId)) ||
    null;

  return {
    student_id: progress?.student_id || profile?.student_id || null,
    student_number: progress?.student_number || profile?.student_number || null,
    student_name: profile?.full_name || null,
    class_name:
      profile?.group_name ||
      profile?.class_name ||
      profile?.assigned_class ||
      null,
    level_code: profile?.level_code || null,
    program_id: program?.id || programId || null,
    program_name: program?.name || null,
  };
};

const findStudentPaymentAccount = async ({ institutionId, identifier, actor }) => {
  const query = String(identifier || '').trim();
  if (!query) {
    throw Object.assign(new Error('Student ID is required.'), { statusCode: 400 });
  }

  const institution = models.Institution
    ? await models.Institution.findByPk(institutionId, { attributes: ['id', 'settings'] }).catch(() => null)
    : null;
  const settings = ensureFinanceSettings(ensureAdmissionsSettings(institution?.settings));

  let restrictedStudentId = null;
  if (actor?.role === 'student' && models.Student) {
    const linkedStudent = await models.Student.findOne({
      where: { user_id: actor.id, institution_id: institutionId },
      attributes: ['id', 'student_number'],
    }).catch(() => null);
    if (!linkedStudent) {
      throw Object.assign(new Error('Student finance profile not found.'), { statusCode: 404 });
    }
    restrictedStudentId = linkedStudent.id;
  }

  let account = null;
  if (models.Student && models.User) {
    const dbStudent = await models.Student.findOne({
      where: {
        institution_id: institutionId,
        ...(restrictedStudentId
          ? { id: restrictedStudentId }
          : {
              [Op.or]: [{ id: query }, { student_number: query }],
            }),
      },
      attributes: ['id', 'student_number'],
      include: [
        { model: models.User, as: 'user', required: false, attributes: ['first_name', 'last_name'] },
        { model: models.Class, as: 'class', required: false, attributes: ['name'] },
        { model: models.EducationLevel, as: 'level', required: false, attributes: ['level_code'] },
      ],
    }).catch(() => null);

    if (dbStudent) {
      const profile = (settings.admissions.student_profiles || []).find(
        (item) => String(item.student_id) === String(dbStudent.id)
      );
      const progress = (settings.tertiary.student_progress || []).find(
        (item) => String(item.student_id) === String(dbStudent.id)
      );
      const programId = progress?.program_id || profile?.tertiary?.program_id || null;
      const program =
        (settings.tertiary.programs || []).find((item) => String(item.id) === String(programId)) ||
        null;

      account = {
        student_id: dbStudent.id,
        student_number: dbStudent.student_number || profile?.student_number || null,
        student_name:
          `${dbStudent.user?.first_name || ''} ${dbStudent.user?.last_name || ''}`.trim() ||
          profile?.full_name ||
          null,
        class_name:
          dbStudent.class?.name ||
          profile?.group_name ||
          profile?.class_name ||
          profile?.assigned_class ||
          null,
        level_code: dbStudent.level?.level_code || profile?.level_code || null,
        program_id: program?.id || programId || null,
        program_name: program?.name || null,
      };
    }
  }

  if (!account) {
    account = findPaymentAccountInProfiles({ settings, identifier: restrictedStudentId || query });
  }

  if (!account?.student_id) {
    throw Object.assign(new Error('Student account not found.'), { statusCode: 404 });
  }

  const invoices = (await listInvoices({ institutionId, query: {} })).filter(
    (item) => String(item.student_id) === String(account.student_id)
  );
  const payments = (await listPayments({
    institutionId,
    query: { student_id: account.student_id },
  })).filter((item) => String(item.student_id) === String(account.student_id));
  const creditBalance = models.Institution
    ? getStudentCreditBalance({ settings, studentId: account.student_id })
    : getRuntimeStudentCreditBalance(account.student_id);
  const totalOutstanding = invoices.reduce((sum, item) => sum + Number(item.balance || 0), 0);

  return {
    ...account,
    credit_balance: creditBalance,
    outstanding_amount: totalOutstanding,
    net_outstanding_amount: Math.max(totalOutstanding - creditBalance, 0),
    invoices,
    payments,
  };
};

const applyInvoicePaymentState = ({ invoice, amount }) => {
  const totalAmount = Number(invoice.total_amount || 0);
  const currentPaid = Number(invoice.paid_amount || 0);
  const nextPaidAttempt = currentPaid + Number(amount || 0);
  const appliedAmount = Math.min(nextPaidAttempt, totalAmount) - currentPaid;
  const excessAmount = Math.max(nextPaidAttempt - totalAmount, 0);
  const nextPaid = Math.min(nextPaidAttempt, totalAmount);
  const nextBalance = Math.max(totalAmount - nextPaid, 0);
  const nextStatus = nextBalance === 0 ? 'paid' : nextPaid > 0 ? 'partial' : 'pending';

  invoice.paid_amount = nextPaid;
  invoice.balance = nextBalance;
  invoice.status = nextStatus;

  return {
    invoice,
    applied_amount: Math.max(appliedAmount, 0),
    excess_amount: excessAmount,
  };
};

const listInvoices = async ({ institutionId, query }) => {
  const runtimeItems = (store.finance.invoices || []).filter(
    (invoice) => invoice.institution_id === institutionId
  );

  if (models.StudentInvoice) {
    try {
      const institution = models.Institution
        ? await models.Institution.findByPk(institutionId).catch(() => null)
        : null;
      const settings = ensureFinanceSettings(ensureAdmissionsSettings(institution?.settings));
      const profileMap = new Map(
        settings.admissions.student_profiles.map((item) => [item.student_id, item])
      );
      const where = { institution_id: institutionId };
      if (query.status) where.status = query.status;
      const rows = await models.StudentInvoice.findAll({
        where,
        include: [
          {
            model: models.Student,
            as: 'student',
            required: false,
            attributes: ['id', 'student_number'],
            include: [
              { model: models.User, as: 'user', required: false, attributes: ['first_name', 'last_name'] },
              { model: models.Class, as: 'class', required: false, attributes: ['name'] },
              { model: models.EducationLevel, as: 'level', required: false, attributes: ['level_code'] },
            ],
          },
        ],
        order: [['created_at', 'DESC']],
      });
      const dbItems = rows.map((row) => {
        const invoice = row.toJSON();
        const profile = profileMap.get(invoice.student_id) || {};
        const fullName = `${invoice.student?.user?.first_name || ''} ${invoice.student?.user?.last_name || ''}`.trim();
        const creditBalance = getStudentCreditBalance({ settings, studentId: invoice.student_id });

        return {
          ...invoice,
          student_name: invoice.student_name || fullName || profile.full_name || null,
          class_name:
            invoice.class_name ||
            invoice.student?.class?.name ||
            profile.group_name ||
            profile.class_name ||
            null,
          student_number: invoice.student?.student_number || profile.student_number || null,
          level_code: invoice.student?.level?.level_code || profile.level_code || null,
          credit_balance: creditBalance,
          net_balance: Math.max(Number(invoice.balance || 0) - creditBalance, 0),
        };
      });

      const merged = [...dbItems];
      runtimeItems.forEach((item) => {
        if (!merged.some((entry) => String(entry.id) === String(item.id))) {
          merged.push(item);
        }
      });

      const enriched = merged.map((invoice) => {
        const creditBalance = getStudentCreditBalance({ settings, studentId: invoice.student_id });
        return {
          ...invoice,
          credit_balance: creditBalance,
          net_balance: Math.max(Number(invoice.balance || 0) - creditBalance, 0),
        };
      });

      return query.status ? enriched.filter((invoice) => invoice.status === query.status) : enriched;
    } catch (_error) {
      // fall through to runtime
    }
  }
  const items = runtimeItems.map((invoice) => {
    const creditBalance = getRuntimeStudentCreditBalance(invoice.student_id);
    return {
      ...invoice,
      credit_balance: creditBalance,
      net_balance: Math.max(Number(invoice.balance || 0) - creditBalance, 0),
    };
  });
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
      const transaction = await sequelize.transaction();
      try {
        const academicContext = await resolveInvoiceAcademicContext({
          institutionId,
          payload,
          transaction,
        });
        const row = await models.StudentInvoice.create(
          {
            institution_id: institutionId,
            student_id: payload.student_id,
            academic_year_id: academicContext.academic_year_id,
            term_id: academicContext.term_id,
            invoice_number: baseInvoice.invoice_number,
            total_amount: totalAmount,
            paid_amount: 0,
            balance: totalAmount,
            status: 'pending',
            due_date: payload.due_date || null,
            items: payload.items || [],
          },
          { transaction }
        );
        await transaction.commit();
        const invoice = { ...baseInvoice, id: row.id, ...academicContext };
        await logAudit({
          userId,
          action: 'CREATE',
          resourceType: 'invoice',
          resourceId: row.id,
          newValues: invoice,
          ip,
        });
        return invoice;
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
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
        const institution = models.Institution
          ? await models.Institution.findByPk(institutionId, {
              attributes: ['id', 'settings'],
              transaction: tx,
            }).catch(() => null)
          : null;
        const settings = ensureFinanceSettings(ensureAdmissionsSettings(institution?.settings));
        const paymentState = applyInvoicePaymentState({ invoice: invoiceModel, amount });
        await invoiceModel.save({ transaction: tx });
        if (paymentState.excess_amount > 0) {
          const existingCredit = getStudentCreditBalance({
            settings,
            studentId: invoiceModel.student_id,
          });
          setStudentCreditBalance({
            settings,
            studentId: invoiceModel.student_id,
            amount: existingCredit + paymentState.excess_amount,
          });
          if (institution) {
            await institution.update({ settings }, { transaction: tx });
          }
        }

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
            notes:
              paymentState.excess_amount > 0
                ? [payload.notes || null, `Excess credited: ${paymentState.excess_amount}`]
                    .filter(Boolean)
                    .join(' | ')
                : payload.notes || null,
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

  const paymentState = applyInvoicePaymentState({ invoice, amount });
  if (paymentState.excess_amount > 0) {
    const existingCredit = getRuntimeStudentCreditBalance(invoice.student_id);
    setRuntimeStudentCreditBalance(invoice.student_id, existingCredit + paymentState.excess_amount);
  }

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
    notes:
      paymentState.excess_amount > 0
        ? [payload.notes || null, `Excess credited: ${paymentState.excess_amount}`]
            .filter(Boolean)
            .join(' | ')
        : payload.notes || null,
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

const ensureApprovalGrant = async ({ institutionId, userId, grant }) => {
  if (models.Institution) {
    const institution = await models.Institution.findByPk(institutionId, {
      attributes: ['id', 'settings'],
    }).catch(() => null);
    const settings = ensureFinanceSettings(institution?.settings);
    const grants = getUserFinanceApprovalGrants({ settings, userId });
    if (!grants.includes(grant)) {
      throw Object.assign(new Error('You do not have this finance approval grant.'), {
        statusCode: 403,
      });
    }
    return { institution, settings, grants };
  }

  const grants = getRuntimeFinanceApprovalGrants(userId);
  if (!grants.includes(grant)) {
    throw Object.assign(new Error('You do not have this finance approval grant.'), {
      statusCode: 403,
    });
  }
  return { institution: null, settings: null, grants };
};

const listPaymentApprovals = async ({ institutionId, query = {} }) => {
  if (models.Institution) {
    const institution = await models.Institution.findByPk(institutionId, {
      attributes: ['id', 'settings'],
    }).catch(() => null);
    const settings = ensureFinanceSettings(institution?.settings);
    return (settings.finance.payment_approvals || [])
      .filter((item) => !query.status || item.status === query.status)
      .sort((a, b) => String(b.requested_at || '').localeCompare(String(a.requested_at || '')));
  }

  ensureFinanceRuntimeState();
  return (store.finance.paymentApprovals || [])
    .filter(
      (item) =>
        item.institution_id === institutionId && (!query.status || item.status === query.status)
    )
    .sort((a, b) => String(b.requested_at || '').localeCompare(String(a.requested_at || '')));
};

const listPaymentGatewayRequests = async ({ institutionId, query = {} }) => {
  if (models.Institution) {
    const institution = await models.Institution.findByPk(institutionId, {
      attributes: ['id', 'settings'],
    }).catch(() => null);
    const settings = ensureFinanceSettings(institution?.settings);
    return (settings.finance.payment_gateway_requests || [])
      .filter((item) => !query.status || item.status === query.status)
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  }

  ensureFinanceRuntimeState();
  return (store.finance.paymentGatewayRequests || [])
    .filter(
      (item) =>
        item.institution_id === institutionId && (!query.status || item.status === query.status)
    )
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
};

const getPaymentAccountLookup = async ({ institutionId, identifier, actor }) =>
  findStudentPaymentAccount({ institutionId, identifier, actor });

const initiateGatewayPayment = async ({ institutionId, userId, payload, actor, ip }) => {
  const account = await findStudentPaymentAccount({
    institutionId,
    identifier: payload.student_identifier,
    actor,
  });
  const amount = Number(payload.amount || 0);
  if (amount <= 0) {
    throw Object.assign(new Error('Payment amount must be greater than zero.'), { statusCode: 400 });
  }

  const channel = String(payload.channel || '').trim().toLowerCase();
  if (!['bank', 'card', 'mobile_money', 'ussd'].includes(channel)) {
    throw Object.assign(new Error('Unsupported payment channel.'), { statusCode: 400 });
  }

  const targetInvoice = account.invoices.find(
    (item) => String(item.id) === String(payload.invoice_id)
  );
  if (!targetInvoice) {
    throw Object.assign(new Error('Select an invoice to continue with payment.'), { statusCode: 400 });
  }

  const request = {
    id: `pgr-${Date.now()}`,
    institution_id: institutionId,
    student_id: account.student_id,
    student_number: account.student_number,
    student_name: account.student_name,
    program_name: account.program_name,
    invoice_id: targetInvoice.id,
    invoice_number: targetInvoice.invoice_number,
    amount,
    channel,
    payer_phone: payload.payer_phone || null,
    status: 'pending_gateway',
    gateway_reference: `PGW-${Date.now()}`,
    checkout_url:
      channel === 'card'
        ? `https://gateway.example/checkout/${Date.now()}`
        : null,
    ussd_code:
      channel === 'ussd' ? `*170*555*${String(Date.now()).slice(-4)}#` : null,
    provider_message:
      channel === 'ussd'
        ? 'Dial the generated USSD code to complete this payment on a mobile device.'
        : channel === 'mobile_money'
          ? 'A mobile money prompt will be sent once the live aggregator is connected.'
          : channel === 'bank'
            ? 'Bank transfer verification will use callback confirmation when the aggregator is connected.'
            : 'Card checkout URL is reserved for live gateway handoff.',
    metadata: {
      proof_reference: payload.proof_reference || null,
      payer_name: payload.payer_name || null,
    },
    created_by: userId,
    created_at: new Date().toISOString(),
    callback_status: 'awaiting',
    posted_payment: null,
  };

  if (models.Institution) {
    const institution = await models.Institution.findByPk(institutionId);
    if (!institution) {
      throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
    }
    const settings = ensureFinanceSettings(institution.settings);
    settings.finance.payment_gateway_requests.push(request);
    await institution.update({ settings });
  } else {
    ensureFinanceRuntimeState();
    store.finance.paymentGatewayRequests.push(request);
  }

  await logAudit({
    userId,
    action: 'CREATE',
    resourceType: 'gateway_payment_request',
    resourceId: request.id,
    newValues: request,
    ip,
  });

  return request;
};

const handleGatewayCallback = async ({ institutionId, payload, userId, ip }) => {
  const reference = String(payload.gateway_reference || payload.reference || '').trim();
  if (!reference) {
    throw Object.assign(new Error('Gateway reference is required.'), { statusCode: 400 });
  }
  const outcome = String(payload.status || '').trim().toLowerCase();
  if (!['success', 'failed'].includes(outcome)) {
    throw Object.assign(new Error('Callback status must be success or failed.'), { statusCode: 400 });
  }

  const finalizeRequest = async (request, persist) => {
    if (request.status !== 'pending_gateway') {
      throw Object.assign(new Error('This gateway request is already closed.'), { statusCode: 400 });
    }

    request.callback_status = outcome;
    request.callback_payload = clone(payload);
    request.callback_at = new Date().toISOString();

    if (outcome === 'failed') {
      request.status = 'failed';
      await persist(request);
      return request;
    }

    const result = await recordPayment({
      institutionId,
      userId,
      payload: {
        invoice_id: request.invoice_id,
        amount: request.amount,
        payment_method: request.channel,
        transaction_ref: request.gateway_reference,
        notes: `Gateway callback success (${request.channel})`,
      },
      ip,
    });

    request.status = 'success';
    request.posted_payment = {
      id: result.payment.id,
      receipt_number: result.payment.receipt_number || null,
      amount: result.payment.amount,
    };
    await persist(request);
    return request;
  };

  if (models.Institution) {
    const institution = await models.Institution.findByPk(institutionId);
    if (!institution) {
      throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
    }
    const settings = ensureFinanceSettings(institution.settings);
    const index = settings.finance.payment_gateway_requests.findIndex(
      (item) => String(item.gateway_reference) === reference
    );
    if (index < 0) {
      throw Object.assign(new Error('Gateway payment request not found.'), { statusCode: 404 });
    }
    const request = settings.finance.payment_gateway_requests[index];
    const updated = await finalizeRequest(request, async (nextRequest) => {
      settings.finance.payment_gateway_requests[index] = nextRequest;
      await institution.update({ settings });
    });
    await logAudit({
      userId,
      action: 'UPDATE',
      resourceType: 'gateway_payment_request',
      resourceId: updated.id,
      newValues: updated,
      ip,
    });
    return updated;
  }

  ensureFinanceRuntimeState();
  const index = store.finance.paymentGatewayRequests.findIndex(
    (item) =>
      item.institution_id === institutionId && String(item.gateway_reference) === reference
  );
  if (index < 0) {
    throw Object.assign(new Error('Gateway payment request not found.'), { statusCode: 404 });
  }
  const request = store.finance.paymentGatewayRequests[index];
  const updated = await finalizeRequest(request, async (nextRequest) => {
    store.finance.paymentGatewayRequests[index] = nextRequest;
  });
  await logAudit({
    userId,
    action: 'UPDATE',
    resourceType: 'gateway_payment_request',
    resourceId: updated.id,
    newValues: updated,
    ip,
  });
  return updated;
};

const initiatePaymentApproval = async ({ institutionId, userId, payload, ip }) => {
  const invoiceList = await listInvoices({ institutionId, query: {} });
  const invoice = invoiceList.find((item) => String(item.id) === String(payload.invoice_id));
  if (!invoice) {
    throw Object.assign(new Error('Invoice not found.'), { statusCode: 404 });
  }

  const approval = {
    id: `payapp-${Date.now()}`,
    institution_id: institutionId,
    invoice_id: invoice.id,
    invoice_number: invoice.invoice_number,
    student_id: invoice.student_id,
    student_name: invoice.student_name,
    class_name: invoice.class_name,
    amount: Number(payload.amount || 0),
    payment_method: payload.payment_method || 'bank',
    transaction_ref: payload.transaction_ref || null,
    proof_reference: payload.proof_reference || null,
    notes: payload.notes || null,
    status: 'pending_director',
    requested_by: userId,
    requested_at: new Date().toISOString(),
    director_approval: null,
    accountant_approval: null,
  };

  if (models.Institution) {
    const institution = await models.Institution.findByPk(institutionId);
    if (!institution) {
      throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
    }
    const settings = ensureFinanceSettings(institution.settings);
    settings.finance.payment_approvals.push(approval);
    await institution.update({ settings });
  } else {
    ensureFinanceRuntimeState();
    store.finance.paymentApprovals.push(approval);
  }

  await logAudit({
    userId,
    action: 'CREATE',
    resourceType: 'finance_payment_approval',
    resourceId: approval.id,
    newValues: approval,
    ip,
  });

  return approval;
};

const approvePaymentApproval = async ({ institutionId, approvalId, payload, userId, ip }) => {
  const action = String(payload.action || 'approve').toLowerCase();
  const note = payload.note || null;
  const rejectionReason = payload.rejection_reason || null;

  if (models.Institution) {
    const institution = await models.Institution.findByPk(institutionId);
    if (!institution) {
      throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
    }

    const settings = ensureFinanceSettings(institution.settings);
    const index = settings.finance.payment_approvals.findIndex((item) => item.id === approvalId);
    if (index < 0) {
      throw Object.assign(new Error('Payment approval request not found.'), { statusCode: 404 });
    }

    const current = settings.finance.payment_approvals[index];
    if (current.status === 'pending_director') {
      await ensureApprovalGrant({ institutionId, userId, grant: 'finance_approve_director' });
      if (action === 'reject') {
        current.status = 'rejected';
        current.rejection_reason = rejectionReason;
      } else {
        current.director_approval = { approved_by: userId, approved_at: new Date().toISOString(), note };
        current.status = 'pending_accountant';
      }
    } else if (current.status === 'pending_accountant') {
      await ensureApprovalGrant({ institutionId, userId, grant: 'finance_approve_accountant' });
      if (current.director_approval?.approved_by && String(current.director_approval.approved_by) === String(userId)) {
        throw Object.assign(new Error('Director and accountant approvals must be completed by different users.'), {
          statusCode: 400,
        });
      }
      if (action === 'reject') {
        current.status = 'rejected';
        current.rejection_reason = rejectionReason;
      } else {
        const result = await recordPayment({
          institutionId,
          userId,
          payload: {
            invoice_id: current.invoice_id,
            amount: current.amount,
            payment_method: current.payment_method,
            transaction_ref: current.transaction_ref,
            notes: [current.notes || null, note || null].filter(Boolean).join(' | ') || null,
          },
          ip,
        });
        current.accountant_approval = {
          approved_by: userId,
          approved_at: new Date().toISOString(),
          note,
        };
        current.status = 'approved';
        current.posted_payment = {
          id: result.payment.id,
          receipt_number: result.payment.receipt_number || null,
          amount: result.payment.amount,
        };
      }
    } else {
      throw Object.assign(new Error('This approval request is already closed.'), { statusCode: 400 });
    }

    settings.finance.payment_approvals[index] = current;
    await institution.update({ settings });

    await logAudit({
      userId,
      action: 'UPDATE',
      resourceType: 'finance_payment_approval',
      resourceId: current.id,
      newValues: current,
      ip,
    });

    return current;
  }

  ensureFinanceRuntimeState();
  const index = store.finance.paymentApprovals.findIndex(
    (item) => item.id === approvalId && item.institution_id === institutionId
  );
  if (index < 0) {
    throw Object.assign(new Error('Payment approval request not found.'), { statusCode: 404 });
  }
  const current = store.finance.paymentApprovals[index];
  if (current.status === 'pending_director') {
    await ensureApprovalGrant({ institutionId, userId, grant: 'finance_approve_director' });
    if (action === 'reject') {
      current.status = 'rejected';
      current.rejection_reason = rejectionReason;
    } else {
      current.director_approval = { approved_by: userId, approved_at: new Date().toISOString(), note };
      current.status = 'pending_accountant';
    }
  } else if (current.status === 'pending_accountant') {
    await ensureApprovalGrant({ institutionId, userId, grant: 'finance_approve_accountant' });
    if (current.director_approval?.approved_by && String(current.director_approval.approved_by) === String(userId)) {
      throw Object.assign(new Error('Director and accountant approvals must be completed by different users.'), {
        statusCode: 400,
      });
    }
    if (action === 'reject') {
      current.status = 'rejected';
      current.rejection_reason = rejectionReason;
    } else {
      const result = await recordPayment({
        institutionId,
        userId,
        payload: {
          invoice_id: current.invoice_id,
          amount: current.amount,
          payment_method: current.payment_method,
          transaction_ref: current.transaction_ref,
          notes: [current.notes || null, note || null].filter(Boolean).join(' | ') || null,
        },
        ip,
      });
      current.accountant_approval = {
        approved_by: userId,
        approved_at: new Date().toISOString(),
        note,
      };
      current.status = 'approved';
      current.posted_payment = {
        id: result.payment.id,
        receipt_number: result.payment.receipt_number || null,
        amount: result.payment.amount,
      };
    }
  } else {
    throw Object.assign(new Error('This approval request is already closed.'), { statusCode: 400 });
  }

  store.finance.paymentApprovals[index] = current;
  await logAudit({
    userId,
    action: 'UPDATE',
    resourceType: 'finance_payment_approval',
    resourceId: current.id,
    newValues: current,
    ip,
  });
  return current;
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

const getFinanceSettings = async ({ institutionId }) => {
  if (models.Institution) {
    const institution = await models.Institution.findByPk(institutionId, {
      attributes: ['id', 'settings'],
    });
    if (!institution) {
      throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
    }
    const settings = ensureFinanceSettings(institution.settings);
    return {
      currencies: settings.finance.currencies,
      default_local_currency: settings.finance.default_local_currency,
      default_international_currency: settings.finance.default_international_currency,
    };
  }

  const settings = ensureFinanceSettings(store.settings || {});
  store.settings = settings;
  return {
    currencies: settings.finance.currencies,
    default_local_currency: settings.finance.default_local_currency,
    default_international_currency: settings.finance.default_international_currency,
  };
};

const updateFinanceSettings = async ({ institutionId, userId, payload, ip }) => {
  const normalizeCurrency = (value) => String(value || '').trim().toUpperCase();
  const currencies = Array.from(
    new Set((Array.isArray(payload.currencies) ? payload.currencies : []).map(normalizeCurrency).filter(Boolean))
  );
  const nextCurrencies = currencies.length ? currencies : ['GHS', 'ZMW', 'USD'];
  const defaultLocal = normalizeCurrency(payload.default_local_currency) || nextCurrencies[0] || 'GHS';
  const defaultInternational =
    normalizeCurrency(payload.default_international_currency) ||
    nextCurrencies.find((item) => item !== defaultLocal) ||
    nextCurrencies[0] ||
    'USD';

  if (!nextCurrencies.includes(defaultLocal)) {
    throw Object.assign(new Error('Default local currency must be one of the configured currencies.'), {
      statusCode: 400,
    });
  }

  if (!nextCurrencies.includes(defaultInternational)) {
    throw Object.assign(
      new Error('Default international currency must be one of the configured currencies.'),
      { statusCode: 400 }
    );
  }

  if (models.Institution) {
    const institution = await models.Institution.findByPk(institutionId);
    if (!institution) {
      throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
    }
    const settings = ensureFinanceSettings(institution.settings);
    const oldValues = {
      currencies: settings.finance.currencies,
      default_local_currency: settings.finance.default_local_currency,
      default_international_currency: settings.finance.default_international_currency,
    };
    settings.finance.currencies = nextCurrencies;
    settings.finance.default_local_currency = defaultLocal;
    settings.finance.default_international_currency = defaultInternational;
    await institution.update({ settings });
    const newValues = {
      currencies: settings.finance.currencies,
      default_local_currency: settings.finance.default_local_currency,
      default_international_currency: settings.finance.default_international_currency,
    };
    await logAudit({
      userId,
      action: 'UPDATE',
      resourceType: 'finance_settings',
      resourceId: institutionId,
      oldValues,
      newValues,
      ip,
    });
    return newValues;
  }

  const settings = ensureFinanceSettings(store.settings || {});
  const oldValues = {
    currencies: settings.finance.currencies,
    default_local_currency: settings.finance.default_local_currency,
    default_international_currency: settings.finance.default_international_currency,
  };
  settings.finance.currencies = nextCurrencies;
  settings.finance.default_local_currency = defaultLocal;
  settings.finance.default_international_currency = defaultInternational;
  store.settings = settings;
  const newValues = {
    currencies: settings.finance.currencies,
    default_local_currency: settings.finance.default_local_currency,
    default_international_currency: settings.finance.default_international_currency,
  };
  await logAudit({
    userId,
    action: 'UPDATE',
    resourceType: 'finance_settings',
    resourceId: institutionId,
    oldValues,
    newValues,
    ip,
  });
  return newValues;
};

module.exports = {
  listInvoices,
  createInvoice,
  recordPayment,
  listPaymentApprovals,
  initiatePaymentApproval,
  approvePaymentApproval,
  listPaymentGatewayRequests,
  getPaymentAccountLookup,
  initiateGatewayPayment,
  handleGatewayCallback,
  listFeeStructures,
  getOverdueInvoices,
  listDebtors,
  listPaymentTerms,
  createPaymentTerm,
  updatePaymentTerm,
  deletePaymentTerm,
  listPayments,
  getFinanceSettings,
  updateFinanceSettings,
};
