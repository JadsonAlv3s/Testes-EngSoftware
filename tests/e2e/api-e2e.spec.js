const { test, expect } = require('@playwright/test');

test.describe('Testes E2E - Fluxo Completo da API de Tarefas', () => {
  let taskId;

  test('Health check - API deve estar funcionando', async ({ request }) => {
    const response = await request.get('/api/health');

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('uptime');
  });

  test('Listar tarefas iniciais - deve ter tarefas de seed', async ({ request }) => {
    const response = await request.get('/api/tasks');

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.total).toBeGreaterThan(0);
  });

  test('Criar nova tarefa - fluxo completo', async ({ request }) => {
    const newTask = {
      title: 'Tarefa E2E - Criada pelo Playwright',
      description: 'Esta tarefa foi criada durante o teste E2E',
      status: 'pending'
    };

    const response = await request.post('/api/tasks', { data: newTask });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.data.title).toBe(newTask.title);
    expect(body.data.description).toBe(newTask.description);
    expect(body.data.status).toBe('pending');
    expect(body.data).toHaveProperty('id');

    // Salva o ID para os próximos testes
    taskId = body.data.id;
  });

  test('Buscar tarefa criada por ID', async ({ request }) => {
    // Primeiro cria para ter um ID válido
    const createRes = await request.post('/api/tasks', {
      data: { title: 'Tarefa para busca E2E' }
    });
    const created = await createRes.json();
    const id = created.data.id;

    const response = await request.get(`/api/tasks/${id}`);

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.data.id).toBe(id);
    expect(body.data.title).toBe('Tarefa para busca E2E');
  });

  test('Atualizar tarefa - mudar status para in_progress', async ({ request }) => {
    // Cria tarefa
    const createRes = await request.post('/api/tasks', {
      data: { title: 'Tarefa para atualizar E2E' }
    });
    const created = await createRes.json();
    const id = created.data.id;

    // Atualiza
    const response = await request.put(`/api/tasks/${id}`, {
      data: { status: 'in_progress', title: 'Tarefa atualizada E2E' }
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.data.status).toBe('in_progress');
    expect(body.data.title).toBe('Tarefa atualizada E2E');
  });

  test('Completar tarefa - mudar status para done', async ({ request }) => {
    // Cria tarefa
    const createRes = await request.post('/api/tasks', {
      data: { title: 'Tarefa para completar' }
    });
    const created = await createRes.json();
    const id = created.data.id;

    // Marca como done
    const response = await request.put(`/api/tasks/${id}`, {
      data: { status: 'done' }
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.data.status).toBe('done');
  });

  test('Deletar tarefa', async ({ request }) => {
    // Cria tarefa para deletar
    const createRes = await request.post('/api/tasks', {
      data: { title: 'Tarefa para deletar E2E' }
    });
    const created = await createRes.json();
    const id = created.data.id;

    // Deleta
    const deleteRes = await request.delete(`/api/tasks/${id}`);
    expect(deleteRes.status()).toBe(204);

    // Confirma que não existe mais
    const getRes = await request.get(`/api/tasks/${id}`);
    expect(getRes.status()).toBe(404);
  });

  test('Filtrar tarefas por status', async ({ request }) => {
    // Cria tarefas com status diferentes
    await request.post('/api/tasks', {
      data: { title: 'Filtro E2E - pending', status: 'pending' }
    });
    await request.post('/api/tasks', {
      data: { title: 'Filtro E2E - done', status: 'done' }
    });

    // Filtra por pending
    const response = await request.get('/api/tasks?status=pending');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    body.data.forEach(task => {
      expect(task.status).toBe('pending');
    });
  });

  test('Buscar tarefas por texto', async ({ request }) => {
    await request.post('/api/tasks', {
      data: { title: 'Playwright busca especifica xyz123' }
    });

    const response = await request.get('/api/tasks?search=xyz123');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0].title).toContain('xyz123');
  });

  test('Verificar estatísticas', async ({ request }) => {
    const response = await request.get('/api/stats/summary');

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.data.total).toBeGreaterThan(0);
    expect(typeof body.data.pending).toBe('number');
    expect(typeof body.data.in_progress).toBe('number');
    expect(typeof body.data.done).toBe('number');

    // Soma deve bater com total
    const sum = body.data.pending + body.data.in_progress + body.data.done;
    expect(sum).toBe(body.data.total);
  });

  test('Validação - criar tarefa sem título deve falhar', async ({ request }) => {
    const response = await request.post('/api/tasks', {
      data: { description: 'Sem título' }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Validation failed');
  });

  test('Validação - status inválido deve falhar', async ({ request }) => {
    const response = await request.post('/api/tasks', {
      data: { title: 'Tarefa', status: 'invalido' }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Validation failed');
  });

  test('Rota inexistente deve retornar 404', async ({ request }) => {
    const response = await request.get('/api/rota-inexistente');

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('Route not found');
  });
});

test.describe('Testes E2E - Fluxo de Ciclo de Vida Completo', () => {
  test('Ciclo completo: criar → atualizar → completar → deletar', async ({ request }) => {
    // 1. Criar
    const createRes = await request.post('/api/tasks', {
      data: {
        title: 'Ciclo de vida completo',
        description: 'Tarefa que passará por todos os estados',
        status: 'pending'
      }
    });
    expect(createRes.status()).toBe(201);
    const created = await createRes.json();
    const id = created.data.id;
    expect(created.data.status).toBe('pending');

    // 2. Mover para in_progress
    const progressRes = await request.put(`/api/tasks/${id}`, {
      data: { status: 'in_progress' }
    });
    expect(progressRes.ok()).toBeTruthy();
    const inProgress = await progressRes.json();
    expect(inProgress.data.status).toBe('in_progress');

    // 3. Completar
    const doneRes = await request.put(`/api/tasks/${id}`, {
      data: { status: 'done' }
    });
    expect(doneRes.ok()).toBeTruthy();
    const done = await doneRes.json();
    expect(done.data.status).toBe('done');

    // 4. Deletar
    const deleteRes = await request.delete(`/api/tasks/${id}`);
    expect(deleteRes.status()).toBe(204);

    // 5. Confirmar deleção
    const verifyRes = await request.get(`/api/tasks/${id}`);
    expect(verifyRes.status()).toBe(404);
  });
});
