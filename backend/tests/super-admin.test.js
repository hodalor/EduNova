require('./test-env');

jest.mock('../src/modules/auth/auth.middleware', () => ({
  authenticate: (req, _res, next) => {
    req.user = {
      id: 'super-admin-1',
      role: 'super_admin',
      institution_id: 'platform',
      institution: { id: 'platform', subscription_plan: 'enterprise' },
    };
    req.auth = { institution_id: 'platform' };
    next();
  },
  resolveInstitution: (req, _res, next) => {
    req.institutionId = 'platform';
    next();
  },
  institutionGuard: (_req, _res, next) => next(),
  authorize: (roles = []) => (req, res, next) => {
    if (roles.length && !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Insufficient role privileges.' });
      return;
    }
    next();
  },
}));

jest.mock('../src/shared/services/audit-log.service', () => ({
  logAudit: jest.fn(async () => true),
}));

jest.mock('../src/shared/helpers/auth', () => ({
  hashPassword: jest.fn(async (value) => `hashed:${value}`),
}));

const request = require('supertest');
const createApp = require('../src/app');
const { resetRuntimeStore } = require('../src/shared/store/runtime-store');

describe('Super admin routes', () => {
  beforeEach(() => {
    resetRuntimeStore();
    jest.clearAllMocks();
  });

  it('lists institutions with platform stats', async () => {
    const app = createApp();

    const response = await request(app).get('/api/super-admin/institutions');

    expect(response.statusCode).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data[0]).toHaveProperty('stats');
  });

  it('onboards a new institution', async () => {
    const app = createApp();

    const response = await request(app).post('/api/super-admin/institutions').send({
      name: 'Lakeside College',
      code: 'LSC',
      subscription_plan: 'starter',
      admin_first_name: 'Kojo',
      admin_last_name: 'Mensah',
      admin_email: 'admin@lsc.test',
      admin_password: 'Eduova123',
    });

    expect(response.statusCode).toBe(201);
    expect(response.body.data.institution.name).toBe('Lakeside College');
    expect(response.body.data.admin_user.email).toBe('admin@lsc.test');
  });

  it('suspends an institution', async () => {
    const app = createApp();

    const response = await request(app).put('/api/super-admin/institutions/test-inst/suspend');

    expect(response.statusCode).toBe(200);
    expect(response.body.data.status).toBe('suspended');
  });

  it('returns aggregate platform analytics', async () => {
    const app = createApp();

    const response = await request(app).get('/api/super-admin/analytics');

    expect(response.statusCode).toBe(200);
    expect(response.body.data).toHaveProperty('total_schools');
    expect(response.body.data).toHaveProperty('monthly_recurring_revenue');
  });
});
