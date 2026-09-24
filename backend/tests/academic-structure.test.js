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

jest.mock('../src/shared/middleware/subscription-enforcement', () => ({
  enforceSubscriptionAccess: () => (_req, _res, next) => next(),
  enforceStudentPlanLimit: (_req, _res, next) => next(),
}));

const request = require('supertest');
const createApp = require('../src/app');
const { resetRuntimeStore } = require('../src/shared/store/runtime-store');

describe('Academic structure and tertiary registration', () => {
  beforeEach(() => {
    resetRuntimeStore();
    jest.clearAllMocks();
  });

  it('lists academic structure for the institution', async () => {
    const app = createApp();

    const response = await request(app)
      .get('/api/academics/structure')
      .set('x-institution-id', 'test-inst');

    expect(response.statusCode).toBe(200);
    expect(response.body.data.groups.length).toBeGreaterThan(0);
    expect(response.body.data.periods.length).toBeGreaterThan(0);
    expect(response.body.data.offerings.length).toBeGreaterThan(0);
  });

  it('creates a new academic group', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/academics/groups')
      .set('x-institution-id', 'test-inst')
      .send({
        name: 'Level 300 Computer Science',
        code: 'L300-CS',
        group_type: 'level',
        level_code: 'TR',
        calendar_type: 'semester',
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.data.name).toBe('Level 300 Computer Science');
    expect(response.body.data.level_code).toBe('TR');
  });

  it('updates and deletes academic structure records', async () => {
    const app = createApp();

    const updateGroupResponse = await request(app)
      .put('/api/academics/groups/grp-l100-cs')
      .set('x-institution-id', 'test-inst')
      .send({
        name: 'Level 100 Revised',
        code: 'L100R',
        level_code: 'TR',
        calendar_type: 'semester',
      });

    expect(updateGroupResponse.statusCode).toBe(200);
    expect(updateGroupResponse.body.data.name).toBe('Level 100 Revised');
    expect(updateGroupResponse.body.data.code).toBe('L100R');

    const updatePeriodResponse = await request(app)
      .put('/api/academics/periods/prd-l100-sem1')
      .set('x-institution-id', 'test-inst')
      .send({
        name: 'Semester 1 Updated',
        sequence: 1,
        status: 'active',
        registration_open: true,
      });

    expect(updatePeriodResponse.statusCode).toBe(200);
    expect(updatePeriodResponse.body.data.name).toBe('Semester 1 Updated');
    expect(updatePeriodResponse.body.data.registration_open).toBe(true);

    const updateOfferingResponse = await request(app)
      .put('/api/academics/offerings/off-csc101')
      .set('x-institution-id', 'test-inst')
      .send({
        name: 'Communication Skills I',
        code: 'CSC111',
        credit_hours: 4,
        is_core: false,
        prerequisite_codes: ['GST100'],
        next_offering_codes: ['CSC112'],
      });

    expect(updateOfferingResponse.statusCode).toBe(200);
    expect(updateOfferingResponse.body.data.code).toBe('CSC111');
    expect(updateOfferingResponse.body.data.is_core).toBe(false);

    const deleteOfferingResponse = await request(app)
      .delete('/api/academics/offerings/off-gst102')
      .set('x-institution-id', 'test-inst');

    expect(deleteOfferingResponse.statusCode).toBe(200);
    expect(deleteOfferingResponse.body.data.deleted).toBe(true);

    const deletePeriodResponse = await request(app)
      .delete('/api/academics/periods/prd-l100-sem2')
      .set('x-institution-id', 'test-inst');

    expect(deletePeriodResponse.statusCode).toBe(200);
    expect(deletePeriodResponse.body.data.deleted).toBe(true);
  });

  it('returns student registration state and allows valid current-semester courses', async () => {
    const app = createApp();

    const stateResponse = await request(app)
      .get('/api/v1/tertiary/student-registration/usr-tertiary-student-001')
      .set('x-institution-id', 'test-inst');

    expect(stateResponse.statusCode).toBe(200);
    expect(stateResponse.body.data.eligible_courses.map((item) => item.code)).toContain('CSC102');

    const registrationResponse = await request(app)
      .post('/api/v1/tertiary/course-registration')
      .set('x-institution-id', 'test-inst')
      .send({
        student_id: 'usr-tertiary-student-001',
        course_ids: ['off-csc102', 'off-gst102'],
      });

    expect(registrationResponse.statusCode).toBe(201);
    expect(registrationResponse.body.data.total_credit_hours).toBe(5);
  });

  it('blocks invalid progression registration when the student has a resit hold', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/v1/tertiary/course-registration')
      .set('x-institution-id', 'test-inst')
      .send({
        student_id: 'stu-001',
        course_ids: ['off-csc102'],
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/not allowed/i);
  });
});
