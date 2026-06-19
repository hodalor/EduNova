process.env.NODE_ENV = 'test';
process.env.PORT = '5001';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'eduova_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';
process.env.REDIS_URL = 'redis://127.0.0.1:6379';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_EXPIRES_IN = '15m';
process.env.SMTP_HOST = 'smtp.example.com';
process.env.SMTP_USER = 'mailer@example.com';
process.env.SMTP_PASS = 'secret';
process.env.TWILIO_SID = 'sid';
process.env.TWILIO_TOKEN = 'token';
process.env.TWILIO_PHONE = '+10000000000';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.MOBILE_API_KEY = 'mobile-key';
process.env.MAX_FILE_SIZE = '5242880';

const request = require('supertest');
const createApp = require('../src/app');

describe('GET /api/v1/health', () => {
  it('returns a healthy response payload', async () => {
    const app = createApp();

    const response = await request(app).get('/api/v1/health');

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('EDUOVA backend is healthy.');
  });
});
