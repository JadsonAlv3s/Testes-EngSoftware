const { test, expect } = require('@playwright/test');

test.describe('LegendaViva - Testes E2E: Fluxo Completo de Sessões', () => {

  test('Health check - API deve estar saudável', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe('healthy');
    expect(body.service).toBe('legendaviva-api');
  });

  test('Readiness check - API deve estar pronta', async ({ request }) => {
    const response = await request.get('/ready');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe('ready');
  });

  test('Criar sessão de transcrição com dados completos', async ({ request }) => {
    const payload = {
      title: 'Palestra E2E - Teste Completo',
      language_source: 'pt-BR',
      keywords: ['e2e', 'playwright', 'acessibilidade']
    };

    const response = await request.post('/v1/sessions', { data: payload });
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.session_id).toBeTruthy();
    expect(body.host_token).toBeTruthy();
    expect(body.public_token).toBeTruthy();
    expect(body.share_url).toContain('/live/');
    expect(body.status).toBe('ACTIVE');
    expect(body.title).toBe(payload.title);
  });

  test('Criar sessão com configurações mínimas', async ({ request }) => {
    const response = await request.post('/v1/sessions', { data: {} });
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.language_source).toBe('pt-BR');
    expect(body.status).toBe('ACTIVE');
    expect(body.title).toBeNull();
  });

  test('Buscar sessão ativa pelo token público', async ({ request }) => {
    // Cria sessão
    const createRes = await request.post('/v1/sessions', {
      data: { title: 'E2E Busca', keywords: ['busca', 'token'] }
    });
    const created = await createRes.json();

    // Busca pelo public_token
    const getRes = await request.get(`/v1/sessions/${created.public_token}`);
    expect(getRes.ok()).toBeTruthy();

    const session = await getRes.json();
    expect(session.session_id).toBe(created.session_id);
    expect(session.title).toBe('E2E Busca');
    expect(session.status).toBe('ACTIVE');
    expect(session.keywords).toContain('busca');
    expect(session.keywords).toContain('token');
  });

  test('Encerrar sessão ativa', async ({ request }) => {
    // Cria sessão
    const createRes = await request.post('/v1/sessions', {
      data: { title: 'E2E Encerrar' }
    });
    const created = await createRes.json();

    // Encerra
    const deleteRes = await request.delete(`/v1/sessions/${created.session_id}`);
    expect(deleteRes.status()).toBe(204);

    // Verifica que não é mais acessível
    const getRes = await request.get(`/v1/sessions/${created.public_token}`);
    expect(getRes.status()).toBe(404);
  });

  test('Validação: título com mais de 255 caracteres deve falhar', async ({ request }) => {
    const longTitle = 'A'.repeat(256);
    const response = await request.post('/v1/sessions', {
      data: { title: longTitle }
    });
    expect(response.status()).toBe(422);
  });

  test('Token público inexistente deve retornar 404', async ({ request }) => {
    const response = await request.get('/v1/sessions/zzzzzz');
    expect(response.status()).toBe(404);

    const body = await response.json();
    expect(body).toHaveProperty('detail');
  });

  test('Encerrar sessão inexistente deve retornar 404', async ({ request }) => {
    const response = await request.delete('/v1/sessions/uuid-inexistente-123');
    expect(response.status()).toBe(404);
  });

  test('Rota inexistente deve retornar 404', async ({ request }) => {
    const response = await request.get('/v1/endpoint-inexistente');
    expect(response.status()).toBe(404);
  });
});

test.describe('LegendaViva - Testes E2E: Ciclo de Vida Completo', () => {

  test('Fluxo completo: criar → verificar → encerrar → confirmar encerramento', async ({ request }) => {
    // 1. Criar sessão com todas as opções
    const createRes = await request.post('/v1/sessions', {
      data: {
        title: 'Ciclo de Vida E2E',
        language_source: 'pt-BR',
        keywords: ['ciclo', 'vida', 'completo']
      }
    });
    expect(createRes.status()).toBe(201);
    const session = await createRes.json();

    // 2. Verificar que está ativa via token público
    const activeRes = await request.get(`/v1/sessions/${session.public_token}`);
    expect(activeRes.ok()).toBeTruthy();
    const active = await activeRes.json();
    expect(active.status).toBe('ACTIVE');
    expect(active.title).toBe('Ciclo de Vida E2E');
    expect(active.keywords).toEqual(['ciclo', 'vida', 'completo']);

    // 3. Encerrar sessão
    const endRes = await request.delete(`/v1/sessions/${session.session_id}`);
    expect(endRes.status()).toBe(204);

    // 4. Confirmar que não é mais acessível
    const goneRes = await request.get(`/v1/sessions/${session.public_token}`);
    expect(goneRes.status()).toBe(404);
  });

  test('Múltiplas sessões simultâneas devem ser independentes', async ({ request }) => {
    // Criar duas sessões
    const res1 = await request.post('/v1/sessions', {
      data: { title: 'Sessão A', keywords: ['a'] }
    });
    const res2 = await request.post('/v1/sessions', {
      data: { title: 'Sessão B', keywords: ['b'] }
    });

    const session1 = await res1.json();
    const session2 = await res2.json();

    // IDs devem ser diferentes
    expect(session1.session_id).not.toBe(session2.session_id);
    expect(session1.public_token).not.toBe(session2.public_token);

    // Encerrar sessão 1 não deve afetar sessão 2
    await request.delete(`/v1/sessions/${session1.session_id}`);

    const check1 = await request.get(`/v1/sessions/${session1.public_token}`);
    const check2 = await request.get(`/v1/sessions/${session2.public_token}`);

    expect(check1.status()).toBe(404);
    expect(check2.ok()).toBeTruthy();

    // Limpar
    await request.delete(`/v1/sessions/${session2.session_id}`);
  });

  test('Sessão criada deve ter expiração futura válida', async ({ request }) => {
    const createRes = await request.post('/v1/sessions', {
      data: { title: 'Expiração E2E' }
    });
    const session = await createRes.json();

    const createdAt = new Date(session.created_at);
    const expiresAt = new Date(session.expires_at);

    // Expiração deve ser pelo menos 1 hora no futuro
    const diffHours = (expiresAt - createdAt) / (1000 * 60 * 60);
    expect(diffHours).toBeGreaterThanOrEqual(1);
    expect(diffHours).toBeLessThanOrEqual(24);

    // Limpar
    await request.delete(`/v1/sessions/${session.session_id}`);
  });
});
