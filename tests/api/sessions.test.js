const request = require('supertest');

const BASE_URL = (process.env.API_URL || 'http://localhost:8000').trim();

describe('LegendaViva API - Sessões (Testes de Contrato e Integração)', () => {
  let createdSession = null;

  // ==================== POST /v1/sessions ====================
  describe('POST /v1/sessions - Criar sessão', () => {
    it('deve criar uma sessão com dados completos', async () => {
      const payload = {
        title: 'Palestra de Teste Automatizado',
        language_source: 'pt-BR',
        keywords: ['teste', 'automatizado', 'acessibilidade']
      };

      const response = await request(BASE_URL)
        .post('/v1/sessions')
        .send(payload)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('session_id');
      expect(response.body).toHaveProperty('host_token');
      expect(response.body).toHaveProperty('public_token');
      expect(response.body).toHaveProperty('share_url');
      expect(response.body).toHaveProperty('title', payload.title);
      expect(response.body).toHaveProperty('language_source', 'pt-BR');
      expect(response.body).toHaveProperty('status', 'ACTIVE');
      expect(response.body).toHaveProperty('created_at');
      expect(response.body).toHaveProperty('expires_at');

      createdSession = response.body;
    });

    it('deve criar sessão sem título (campo opcional)', async () => {
      const response = await request(BASE_URL)
        .post('/v1/sessions')
        .send({ language_source: 'pt-BR' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('session_id');
      expect(response.body.title).toBeNull();
      expect(response.body.status).toBe('ACTIVE');
    });

    it('deve criar sessão com valores padrão quando body está vazio', async () => {
      const response = await request(BASE_URL)
        .post('/v1/sessions')
        .send({})
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(201);
      expect(response.body.language_source).toBe('pt-BR');
      expect(response.body.status).toBe('ACTIVE');
    });

    it('deve gerar session_id no formato UUID', async () => {
      const response = await request(BASE_URL)
        .post('/v1/sessions')
        .send({ title: 'UUID test' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(201);
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(response.body.session_id).toMatch(uuidRegex);
    });

    it('deve gerar host_token no formato UUID', async () => {
      const response = await request(BASE_URL)
        .post('/v1/sessions')
        .send({ title: 'Host token test' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(201);
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(response.body.host_token).toMatch(uuidRegex);
    });

    it('deve gerar public_token com 6 caracteres hexadecimais', async () => {
      const response = await request(BASE_URL)
        .post('/v1/sessions')
        .send({ title: 'Token test' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(201);
      expect(response.body.public_token).toMatch(/^[0-9a-f]{6}$/);
    });

    it('deve gerar share_url no formato /live/{public_token}', async () => {
      const response = await request(BASE_URL)
        .post('/v1/sessions')
        .send({ title: 'Share URL test' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(201);
      expect(response.body.share_url).toBe(`/live/${response.body.public_token}`);
    });

    it('deve definir expires_at no futuro (TTL de sessão)', async () => {
      const response = await request(BASE_URL)
        .post('/v1/sessions')
        .send({ title: 'Expiry test' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(201);
      const createdAt = new Date(response.body.created_at);
      const expiresAt = new Date(response.body.expires_at);
      expect(expiresAt.getTime()).toBeGreaterThan(createdAt.getTime());
    });

    it('deve rejeitar keywords acima do limite máximo (422)', async () => {
      const manyKeywords = Array.from({ length: 30 }, (_, i) => `keyword${i}`);
      const response = await request(BASE_URL)
        .post('/v1/sessions')
        .send({ title: 'Keywords test', keywords: manyKeywords })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(422);
    });

    it('deve retornar erro 422 para title com mais de 255 caracteres', async () => {
      const longTitle = 'A'.repeat(256);
      const response = await request(BASE_URL)
        .post('/v1/sessions')
        .send({ title: longTitle })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(422);
    });
  });

  // ==================== GET /v1/sessions/{share_token} ====================
  describe('GET /v1/sessions/{share_token} - Buscar sessão pública', () => {
    let sessionToken;

    beforeAll(async () => {
      const res = await request(BASE_URL)
        .post('/v1/sessions')
        .send({
          title: 'Sessão para busca',
          language_source: 'pt-BR',
          keywords: ['teste', 'busca']
        })
        .set('Content-Type', 'application/json');
      sessionToken = res.body.public_token;
    });

    it('deve retornar dados públicos de uma sessão ativa', async () => {
      const response = await request(BASE_URL)
        .get(`/v1/sessions/${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('session_id');
      expect(response.body).toHaveProperty('title', 'Sessão para busca');
      expect(response.body).toHaveProperty('language_source', 'pt-BR');
      expect(response.body).toHaveProperty('status', 'ACTIVE');
      expect(response.body).toHaveProperty('keywords');
      expect(Array.isArray(response.body.keywords)).toBe(true);
    });

    it('deve retornar keywords da sessão', async () => {
      const response = await request(BASE_URL)
        .get(`/v1/sessions/${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.keywords).toContain('teste');
      expect(response.body.keywords).toContain('busca');
    });

    it('deve retornar 404 para token inexistente', async () => {
      const response = await request(BASE_URL)
        .get('/v1/sessions/zzzzzz');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('detail');
    });

    it('deve retornar 404 para token vazio', async () => {
      const response = await request(BASE_URL)
        .get('/v1/sessions/000000');

      expect(response.status).toBe(404);
    });

    it('contrato: não deve expor host_token no endpoint público', async () => {
      const response = await request(BASE_URL)
        .get(`/v1/sessions/${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body).not.toHaveProperty('host_token');
      expect(response.body).not.toHaveProperty('public_token');
      expect(response.body).not.toHaveProperty('share_url');
      expect(response.body).not.toHaveProperty('expires_at');
    });
  });

  // ==================== DELETE /v1/sessions/{session_id} ====================
  describe('DELETE /v1/sessions/{session_id} - Encerrar sessão', () => {
    it('deve encerrar uma sessão ativa', async () => {
      // Cria sessão
      const createRes = await request(BASE_URL)
        .post('/v1/sessions')
        .send({ title: 'Sessão para encerrar' })
        .set('Content-Type', 'application/json');

      const sessionId = createRes.body.session_id;
      const publicToken = createRes.body.public_token;

      // Encerra
      const deleteRes = await request(BASE_URL)
        .delete(`/v1/sessions/${sessionId}`);

      expect(deleteRes.status).toBe(204);

      // Verifica que não é mais acessível via public token
      const getRes = await request(BASE_URL)
        .get(`/v1/sessions/${publicToken}`);

      expect(getRes.status).toBe(404);
    });

    it('deve retornar 404 ao encerrar sessão inexistente', async () => {
      const response = await request(BASE_URL)
        .delete('/v1/sessions/id-que-nao-existe');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('detail');
    });

    it('sessão encerrada não deve mais ser encontrada por token público', async () => {
      const createRes = await request(BASE_URL)
        .post('/v1/sessions')
        .send({ title: 'Verificar encerramento' })
        .set('Content-Type', 'application/json');

      const sessionId = createRes.body.session_id;
      const publicToken = createRes.body.public_token;

      // Confirma que está ativa
      const activeRes = await request(BASE_URL)
        .get(`/v1/sessions/${publicToken}`);
      expect(activeRes.status).toBe(200);
      expect(activeRes.body.status).toBe('ACTIVE');

      // Encerra
      await request(BASE_URL).delete(`/v1/sessions/${sessionId}`);

      // Confirma que não aparece mais
      const finishedRes = await request(BASE_URL)
        .get(`/v1/sessions/${publicToken}`);
      expect(finishedRes.status).toBe(404);
    });
  });

  // ==================== Rotas inexistentes ====================
  describe('Rotas inexistentes', () => {
    it('deve retornar 404 para rota inexistente', async () => {
      const response = await request(BASE_URL)
        .get('/v1/rota-que-nao-existe');

      expect(response.status).toBe(404);
    });

    it('deve retornar 405 para método não permitido', async () => {
      const response = await request(BASE_URL)
        .put('/v1/sessions')
        .send({});

      expect(response.status).toBe(405);
    });
  });
});
