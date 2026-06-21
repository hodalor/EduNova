require('./test-env');

jest.mock('../src/modules/auth/auth.middleware', () => ({
  authenticate: (req, _res, next) => {
    req.user = { id: 'tester-1', role: 'institution_admin', institution_id: 'test-inst' };
    req.auth = { institution_id: 'test-inst' };
    next();
  },
  resolveInstitution: (req, _res, next) => {
    req.institutionId = req.headers['x-institution-id'] || 'test-inst';
    next();
  },
  institutionGuard: (_req, _res, next) => next(),
  authorize: () => (_req, _res, next) => next(),
}));

jest.mock('../src/shared/services/audit-log.service', () => ({
  logAudit: jest.fn(async () => true),
}));

jest.mock('../src/modules/analytics/analytics.service', () => ({
  invalidateAnalyticsCache: jest.fn(async () => true),
}));

const request = require('supertest');
const createApp = require('../src/app');
const { store, resetRuntimeStore } = require('../src/shared/store/runtime-store');

describe('Finance routes', () => {
  beforeEach(() => {
    resetRuntimeStore();
    jest.clearAllMocks();
  });

  it('creates an invoice', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/v1/finance/invoices')
      .set('x-institution-id', 'test-inst')
      .send({
        student_id: 'stu-003',
        student_name: 'Kojo Arthur',
        class_name: 'JH 2 Blue',
        total_amount: 1500,
        due_date: '2026-07-01',
        items: [{ name: 'Tuition', amount: 1500 }],
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.data.student_id).toBe('stu-003');
    expect(store.finance.invoices).toHaveLength(3);
  });

  it('records a payment and recalculates invoice balance', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/v1/finance/payments')
      .set('x-institution-id', 'test-inst')
      .send({
        invoice_id: 'inv-001',
        amount: 600,
        payment_method: 'mobile_money',
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.data.invoice.balance).toBe(0);
    expect(response.body.data.invoice.status).toBe('paid');
    expect(response.body.data.payment.receipt_number).toContain('RCT');
  });

  it('returns overdue invoices based on reference date', async () => {
    const app = createApp();

    store.finance.invoices.push({
      id: 'inv-overdue',
      institution_id: 'test-inst',
      student_id: 'stu-099',
      student_name: 'Late Payer',
      class_name: 'PR 1',
      invoice_number: 'INV-2026-099',
      total_amount: 500,
      paid_amount: 0,
      balance: 500,
      status: 'pending',
      due_date: '2026-01-05',
      items: [],
    });

    const response = await request(app)
      .get('/api/v1/finance/reports/defaulters?reference_date=2026-06-20')
      .set('x-institution-id', 'test-inst');

    expect(response.statusCode).toBe(200);
    expect(response.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'inv-overdue' })])
    );
  });

  it('adds cache headers to fee structures responses', async () => {
    const app = createApp();

    const response = await request(app)
      .get('/api/v1/finance/fee-structures')
      .set('x-institution-id', 'test-inst');

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toContain('max-age=3600');
    expect(response.headers.etag).toBeDefined();
  });
});
