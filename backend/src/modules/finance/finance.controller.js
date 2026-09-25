const financeService = require('./finance.service');

const wrap = (handler) => async (req, res) =>
  res.status(200).json({
    success: true,
    data: await handler(req),
  });

module.exports = {
  getFinanceSettings: wrap((req) =>
    financeService.getFinanceSettings({
      institutionId: req.institutionId,
    })
  ),
  updateFinanceSettings: async (req, res) => {
    const data = await financeService.updateFinanceSettings({
      institutionId: req.institutionId,
      userId: req.user.id,
      payload: req.body,
      ip: req.ip,
    });
    res.status(200).json({ success: true, data });
  },
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
  listPaymentApprovals: wrap((req) =>
    financeService.listPaymentApprovals({
      institutionId: req.institutionId,
      query: req.query,
    })
  ),
  initiatePaymentApproval: async (req, res) => {
    const data = await financeService.initiatePaymentApproval({
      institutionId: req.institutionId,
      userId: req.user.id,
      payload: req.body,
      ip: req.ip,
    });
    res.status(201).json({ success: true, data });
  },
  approvePaymentApproval: async (req, res) => {
    const data = await financeService.approvePaymentApproval({
      institutionId: req.institutionId,
      approvalId: req.params.id,
      payload: req.body,
      userId: req.user.id,
      ip: req.ip,
    });
    res.status(200).json({ success: true, data });
  },
  listPaymentGatewayRequests: wrap((req) =>
    financeService.listPaymentGatewayRequests({
      institutionId: req.institutionId,
      query: req.query,
    })
  ),
  getPaymentAccountLookup: wrap((req) =>
    financeService.getPaymentAccountLookup({
      institutionId: req.institutionId,
      identifier: req.query.identifier,
      actor: req.user,
    })
  ),
  initiateGatewayPayment: async (req, res) => {
    const data = await financeService.initiateGatewayPayment({
      institutionId: req.institutionId,
      userId: req.user.id,
      payload: req.body,
      actor: req.user,
      ip: req.ip,
    });
    res.status(201).json({ success: true, data });
  },
  handleGatewayCallback: async (req, res) => {
    const data = await financeService.handleGatewayCallback({
      institutionId: req.institutionId,
      payload: req.body,
      userId: req.user.id,
      ip: req.ip,
    });
    res.status(200).json({ success: true, data });
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
