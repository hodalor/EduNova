require('./test-env');

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
