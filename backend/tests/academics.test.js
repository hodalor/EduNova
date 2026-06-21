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

jest.mock('../src/shared/services/audit-log.service', () => ({
  logAudit: jest.fn(async () => true),
}));

jest.mock('../src/modules/analytics/analytics.service', () => ({
  invalidateAnalyticsCache: jest.fn(async () => true),
}));

const request = require('supertest');
const createApp = require('../src/app');
const { store, resetRuntimeStore } = require('../src/shared/store/runtime-store');

describe('Academics routes', () => {
  beforeEach(() => {
    resetRuntimeStore();
    jest.clearAllMocks();
  });

  it('saves scores and calculates grades for the selected level', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/v1/academics/scores')
      .set('x-institution-id', 'test-inst')
      .send({
        class_id: 'cls-002',
        subject_id: 'sub-001',
        assessment_name: 'Midterm',
        level_code: 'PR',
        scores: [
          { student_id: 'stu-002', student_name: 'Ama Tetteh', score: 86 },
          { student_id: 'stu-003', student_name: 'Kojo Arthur', score: 54 },
        ],
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.data[0].grade).toBe('A');
    expect(response.body.data[1].grade).toBe('D');
  });

  it('publishes a report card', async () => {
    const app = createApp();

    const response = await request(app)
      .put('/api/v1/academics/report-cards/rc-001/publish')
      .set('x-institution-id', 'test-inst');

    expect(response.statusCode).toBe(200);
    expect(response.body.data.is_published).toBe(true);
  });

  it('returns ranked report cards by class', async () => {
    const app = createApp();

    store.academics.reportCards.push({
      id: 'rc-003',
      institution_id: 'test-inst',
      student_id: 'stu-010',
      student_name: 'Top Student',
      class_name: 'SH 2 Science',
      level: 'SH',
      term: 'Term 2',
      overall_average: 91,
      overall_grade: 'A1',
      is_published: true,
    });

    const response = await request(app)
      .get('/api/v1/academics/ranking?class_name=SH%202%20Science')
      .set('x-institution-id', 'test-inst');

    expect(response.statusCode).toBe(200);
    expect(response.body.data[0].student_name).toBe('Top Student');
    expect(response.body.data[0].rank).toBe(1);
  });

  it('supports ETag validation on report cards', async () => {
    const app = createApp();

    const firstResponse = await request(app)
      .get('/api/v1/academics/report-cards')
      .set('x-institution-id', 'test-inst');

    const secondResponse = await request(app)
      .get('/api/v1/academics/report-cards')
      .set('x-institution-id', 'test-inst')
      .set('If-None-Match', firstResponse.headers.etag);

    expect(firstResponse.statusCode).toBe(200);
    expect(secondResponse.statusCode).toBe(304);
  });
});
