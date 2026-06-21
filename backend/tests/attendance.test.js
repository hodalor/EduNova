require('./test-env');

jest.mock('../src/modules/auth/auth.middleware', () => ({
  authenticate: (req, _res, next) => {
    req.user = { id: 'teacher-1', role: 'teacher', institution_id: 'test-inst' };
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

const mockSaveAndDispatch = jest.fn(async () => true);
const mockEmitAttendanceMarked = jest.fn();
const mockInvalidateAnalyticsCache = jest.fn(async () => true);

jest.mock('../src/modules/communication/communication.service', () => ({
  saveAndDispatch: (...args) => mockSaveAndDispatch(...args),
}));

jest.mock('../src/modules/notifications/socket.service', () => ({
  emitAttendanceMarked: (...args) => mockEmitAttendanceMarked(...args),
}));

jest.mock('../src/modules/analytics/analytics.service', () => ({
  invalidateAnalyticsCache: (...args) => mockInvalidateAnalyticsCache(...args),
}));

jest.mock('../src/shared/services/audit-log.service', () => ({
  logAudit: jest.fn(async () => true),
}));

const request = require('supertest');
const createApp = require('../src/app');
const { resetRuntimeStore } = require('../src/shared/store/runtime-store');

describe('Attendance routes', () => {
  beforeEach(() => {
    resetRuntimeStore();
    jest.clearAllMocks();
  });

  it('marks attendance and emits realtime updates', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/v1/attendance/sessions/ses-001/mark')
      .set('x-institution-id', 'test-inst')
      .send({
        student_id: 'stu-001',
        student_name: 'Elikem Mensah',
        status: 'present',
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.data.status).toBe('present');
    expect(mockEmitAttendanceMarked).toHaveBeenCalledWith({
      sessionId: 'ses-001',
      payload: {
        student_id: 'stu-001',
        status: 'present',
      },
    });
  });

  it('triggers a parent alert when a student is absent', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/v1/attendance/sessions/ses-001/mark')
      .set('x-institution-id', 'test-inst')
      .send({
        student_id: 'stu-001',
        student_name: 'Elikem Mensah',
        status: 'absent',
        parent_ids: ['parent-001'],
      });

    expect(response.statusCode).toBe(201);
    expect(mockSaveAndDispatch).toHaveBeenCalled();
  });

  it('closes a session and invalidates analytics cache', async () => {
    const app = createApp();

    const response = await request(app)
      .put('/api/v1/attendance/sessions/ses-001/close')
      .set('x-institution-id', 'test-inst');

    expect(response.statusCode).toBe(200);
    expect(response.body.data.status).toBe('closed');
    expect(mockInvalidateAnalyticsCache).toHaveBeenCalledWith('test-inst');
  });

  it('calculates attendance rates in the report', async () => {
    const app = createApp();

    await request(app)
      .post('/api/v1/attendance/sessions/ses-001/mark')
      .set('x-institution-id', 'test-inst')
      .send({
        student_id: 'stu-001',
        student_name: 'Elikem Mensah',
        status: 'present',
      });

    await request(app)
      .post('/api/v1/attendance/sessions/ses-001/mark')
      .set('x-institution-id', 'test-inst')
      .send({
        student_id: 'stu-001',
        student_name: 'Elikem Mensah',
        status: 'late',
      });

    const response = await request(app)
      .get('/api/v1/attendance/report')
      .set('x-institution-id', 'test-inst');

    expect(response.statusCode).toBe(200);
    expect(response.body.data[0].rate).toBe(100);
  });
});
