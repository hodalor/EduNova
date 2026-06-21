require('./test-env');

jest.mock('../src/modules/auth/auth.middleware', () => ({
  authenticate: (req, _res, next) => {
    req.user = { id: 'admin-1', role: 'institution_admin', institution_id: 'test-inst' };
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

const request = require('supertest');
const createApp = require('../src/app');
const { store, resetRuntimeStore } = require('../src/shared/store/runtime-store');

describe('Users routes', () => {
  beforeEach(() => {
    resetRuntimeStore();
    jest.clearAllMocks();
  });

  it('lists institution admin and teacher accounts for the school', async () => {
    const app = createApp();

    const response = await request(app)
      .get('/api/v1/users')
      .set('x-institution-id', 'test-inst');

    expect(response.statusCode).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data.every((item) => item.institution_id === 'test-inst')).toBe(true);
  });

  it('creates a teacher account for the institution', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/v1/users')
      .set('x-institution-id', 'test-inst')
      .send({
        role: 'teacher',
        first_name: 'Mavis',
        last_name: 'Arthur',
        email: 'mavis.arthur@eduova.test',
        phone: '+233200000055',
        staff_number: 'TCH-099',
        department: 'Mathematics',
        designation: 'Mathematics Teacher',
        qualification: 'BEd Mathematics',
        specialization: 'Algebra',
        employment_type: 'full_time',
        date_joined: '2026-06-21',
        temporary_password: 'Eduova123',
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.data.role).toBe('teacher');
    expect(response.body.data.email).toBe('mavis.arthur@eduova.test');
    expect(response.body.data.staff_number).toBe('TCH-099');
    expect(store.users.accounts.some((item) => item.email === 'mavis.arthur@eduova.test')).toBe(true);
  });
});
