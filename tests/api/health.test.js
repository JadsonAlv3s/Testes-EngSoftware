const request = require('supertest');
const app = require('../../src/app');

describe('GET /api/health', () => {
  it('deve retornar status 200 com informações de saúde', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
  });

  it('deve retornar timestamp no formato ISO 8601', async () => {
    const response = await request(app).get('/api/health');

    const timestamp = new Date(response.body.timestamp);
    expect(timestamp.toISOString()).toBe(response.body.timestamp);
  });

  it('deve retornar uptime como número positivo', async () => {
    const response = await request(app).get('/api/health');

    expect(typeof response.body.uptime).toBe('number');
    expect(response.body.uptime).toBeGreaterThanOrEqual(0);
  });
});
