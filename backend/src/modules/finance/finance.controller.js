const financeService = require('./finance.service');

const wrap = (handler) => async (req, res) =>
  res.status(200).json({
    success: true,
    data: await handler(req),
  });

module.exports = {
  listInvoices: wrap((req) =>
    financeService.listInvoices({
      institutionId: req.institutionId,
      query: req.query,
    })
  ),
  createInvoice: async (req, res) => {
    const data = await financeService.createInvoice({
      institutionId: req.institutionId,
      userId: req.user.id,
      payload: req.body,
      ip: req.ip,
    });
    res.status(201).json({ success: true, data });
  },
  recordPayment: async (req, res) => {
    const data = await financeService.recordPayment({
      institutionId: req.institutionId,
      userId: req.user.id,
      payload: req.body,
      ip: req.ip,
    });
    res.status(201).json({ success: true, data });
  },
  listPayments: wrap((req) =>
    financeService.listPayments({
      institutionId: req.institutionId,
      query: req.query,
    })
  ),
  listFeeStructures: wrap((req) =>
    financeService.listFeeStructures({
      institutionId: req.institutionId,
    })
  ),
  getOverdueInvoices: wrap((req) =>
    financeService.getOverdueInvoices({
      institutionId: req.institutionId,
      referenceDate: req.query.reference_date,
    })
  ),
  listDebtors: wrap((req) =>
    financeService.listDebtors({
      institutionId: req.institutionId,
    })
  ),
  listPaymentTerms: wrap((req) =>
    financeService.listPaymentTerms({
      institutionId: req.institutionId,
    })
  ),
  createPaymentTerm: async (req, res) => {
    const data = await financeService.createPaymentTerm({
      institutionId: req.institutionId,
      userId: req.user.id,
      payload: req.body,
      ip: req.ip,
    });
    res.status(201).json({ success: true, data });
  },
  updatePaymentTerm: async (req, res) => {
    const data = await financeService.updatePaymentTerm({
      institutionId: req.institutionId,
      userId: req.user.id,
      termId: req.params.id,
      payload: req.body,
      ip: req.ip,
    });
    res.status(200).json({ success: true, data });
  },
  deletePaymentTerm: async (req, res) => {
    const data = await financeService.deletePaymentTerm({
      institutionId: req.institutionId,
      userId: req.user.id,
      termId: req.params.id,
      ip: req.ip,
    });
    res.status(200).json({ success: true, data });
  },
};
