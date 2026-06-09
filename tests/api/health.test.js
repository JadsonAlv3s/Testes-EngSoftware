const request = require('supertest');

const BASE_URL = (process.env.API_URL || 'http://localhost:8000').trim();

describe('LegendaViva API - Health Check', () => {
  it('GET /health - deve retornar status healthy', async () => {
    const response = await request(BASE_URL).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'healthy');
    expect(response.body).toHaveProperty('service', 'legendaviva-api');
  });

  it('GET /ready - deve retornar status ready', async () => {
    const response = await request(BASE_URL).get('/ready');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ready');
  });

  it('GET /health - deve retornar content-type application/json', async () => {
    const response = await request(BASE_URL).get('/health');

    expect(response.headers['content-type']).toContain('application/json');
  });

  it('GET /ready - deve responder em tempo aceitável (< 2s)', async () => {
    const start = Date.now();
    const response = await request(BASE_URL).get('/ready');
    const duration = Date.now() - start;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(2000);
  });
});
