require('./test-env');

const request = require('supertest');

const mockInstitution = {
  id: '11111111-1111-1111-1111-111111111111',
  code: 'EDUOVA',
  name: 'EDUOVA Academy',
};

const mockUsers = [
  {
    id: 'usr-001',
    institution_id: mockInstitution.id,
    email: 'parent@eduova.test',
    phone: '+233200000001',
    role: 'parent',
    first_name: 'Test',
    last_name: 'Parent',
    profile_photo: null,
    email_verified: true,
    phone_verified: true,
    password_hash: 'correct-password',
    is_active: true,
    last_login: null,
    institution: mockInstitution,
    update: jest.fn(async function update(values) {
      Object.assign(this, values);
      return this;
    }),
  },
];

const mockFailedAttempts = new Map();
const mockRefreshSessions = new Map([['auth:refresh:sess-1', JSON.stringify({ user_id: 'usr-001' })]]);

jest.mock('../src/config/database', () => ({
  models: {
    Institution: {
      findByPk: jest.fn(async (id) => (id === mockInstitution.id ? mockInstitution : null)),
      findOne: jest.fn(async ({ where }) =>
        where.code === mockInstitution.code ? mockInstitution : null
      ),
    },
    User: {
      findOne: jest.fn(async ({ where }) =>
        mockUsers.find(
          (user) =>
            user.institution_id === where.institution_id &&
            ((where.email && user.email === where.email) || (where.phone && user.phone === where.phone))
        ) || null
      ),
      findByPk: jest.fn(async (id) => mockUsers.find((user) => user.id === id) || null),
    },
  },
}));

jest.mock('../src/config/redis', () => ({
  redisClient: {
    get: jest.fn(async (key) => mockRefreshSessions.get(key) || null),
    set: jest.fn(async () => 'OK'),
    del: jest.fn(async () => 1),
    sadd: jest.fn(async () => 1),
    srem: jest.fn(async () => 1),
    expire: jest.fn(async () => 1),
    incr: jest.fn(async () => 1),
    ttl: jest.fn(async () => 300),
  },
}));

jest.mock('../src/shared/helpers/auth', () => ({
  comparePassword: jest.fn(async (plainText, hash) => plainText === hash),
  hashPassword: jest.fn(async (value) => `hashed:${value}`),
  signAccessToken: jest.fn((user) => `access-${user.id}`),
  signRefreshToken: jest.fn(async (user) => `refresh-${user.id}`),
  verifyRefreshToken: jest.fn(() => ({ sub: 'usr-001', jti: 'sess-1' })),
  blacklistToken: jest.fn(async () => true),
  isTokenBlacklisted: jest.fn(async () => false),
  verifyAccessToken: jest.fn(() => ({
    sub: 'usr-001',
    institution_id: mockInstitution.id,
    role: 'parent',
  })),
  isLocked: jest.fn(async (identity, institutionId) => {
    const attempts = mockFailedAttempts.get(`${institutionId}:${identity}`) || 0;
    return {
      locked: attempts >= 5,
      attempts,
      retryIn: attempts >= 5 ? 300 : 0,
    };
  }),
  recordFailedLogin: jest.fn(async (identity, institutionId) => {
    const key = `${institutionId}:${identity}`;
    mockFailedAttempts.set(key, (mockFailedAttempts.get(key) || 0) + 1);
    return mockFailedAttempts.get(key);
  }),
  clearLoginLock: jest.fn(async (identity, institutionId) => {
    mockFailedAttempts.delete(`${institutionId}:${identity}`);
    return 1;
  }),
  sendEmail: jest.fn(async () => true),
  sendSMS: jest.fn(async () => true),
  storeOtp: jest.fn(async () => 'otp-token'),
  getOtpRecord: jest.fn(async () => null),
  deleteOtpRecord: jest.fn(async () => 1),
  rotateRefreshToken: jest.fn(async () => 'refresh-rotated'),
  revokeRefreshToken: jest.fn(async () => true),
}));

jest.mock('../src/shared/middleware/rateLimits', () => ({
  authRateLimiter: (_req, _res, next) => next(),
  generalApiRateLimiter: (_req, _res, next) => next(),
  reportGenerationRateLimiter: (_req, _res, next) => next(),
}));

const createApp = require('../src/app');

describe('Auth routes', () => {
  beforeEach(() => {
    mockFailedAttempts.clear();
    mockRefreshSessions.set('auth:refresh:sess-1', JSON.stringify({ user_id: 'usr-001' }));
    mockUsers[0].last_login = null;
    jest.clearAllMocks();
  });

  it('logs in successfully with institution code and identity', async () => {
    const app = createApp();

    const response = await request(app).post('/api/auth/login').send({
      institution_code: 'EDUOVA',
      identity: 'parent@eduova.test',
      password: 'correct-password',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe('parent@eduova.test');
    expect(response.body.data.tokens.access_token).toBe('access-usr-001');
  });

  it('rejects a wrong password', async () => {
    const app = createApp();

    const response = await request(app).post('/api/auth/login').send({
      institution_code: 'EDUOVA',
      identity: 'parent@eduova.test',
      password: 'wrong-password',
    });

    expect(response.statusCode).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Invalid email or password.');
  });

  it('locks login after repeated failures', async () => {
    const app = createApp();

    for (let index = 0; index < 5; index += 1) {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          institution_code: 'EDUOVA',
          identity: 'parent@eduova.test',
          password: 'wrong-password',
        });
      expect(response.statusCode).toBe(401);
    }

    const lockedResponse = await request(app)
      .post('/api/auth/login')
      .send({
        institution_code: 'EDUOVA',
        identity: 'parent@eduova.test',
        password: 'wrong-password',
      });

    expect(lockedResponse.statusCode).toBe(429);
    expect(lockedResponse.body.message).toContain('Account locked.');
  });

  it('refreshes a token session', async () => {
    const app = createApp();

    const response = await request(app).post('/api/auth/refresh').send({
      refresh_token: 'refresh-usr-001',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.tokens.refresh_token).toBe('refresh-rotated');
  });
});
