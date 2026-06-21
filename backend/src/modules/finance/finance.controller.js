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
};
