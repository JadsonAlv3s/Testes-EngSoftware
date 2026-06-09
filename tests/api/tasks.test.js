const request = require('supertest');
const app = require('../../src/app');

describe('API de Tarefas - Testes de Contrato e Integração', () => {
  let createdTaskId;

  // ==================== GET /api/tasks ====================
  describe('GET /api/tasks', () => {
    it('deve retornar lista de tarefas com estrutura correta', async () => {
      const response = await request(app).get('/api/tasks');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(typeof response.body.total).toBe('number');
    });

    it('deve retornar tarefas com todos os campos obrigatórios (contrato)', async () => {
      const response = await request(app).get('/api/tasks');

      expect(response.status).toBe(200);
      response.body.data.forEach(task => {
        expect(task).toHaveProperty('id');
        expect(task).toHaveProperty('title');
        expect(task).toHaveProperty('description');
        expect(task).toHaveProperty('status');
        expect(task).toHaveProperty('createdAt');
        expect(['pending', 'in_progress', 'done']).toContain(task.status);
      });
    });

    it('deve filtrar tarefas por status', async () => {
      const response = await request(app).get('/api/tasks?status=pending');

      expect(response.status).toBe(200);
      response.body.data.forEach(task => {
        expect(task.status).toBe('pending');
      });
    });

    it('deve filtrar tarefas por busca textual', async () => {
      const response = await request(app).get('/api/tasks?search=playwright');

      expect(response.status).toBe(200);
      response.body.data.forEach(task => {
        const combined = (task.title + task.description).toLowerCase();
        expect(combined).toContain('playwright');
      });
    });

    it('deve retornar array vazio para filtros sem resultado', async () => {
      const response = await request(app).get('/api/tasks?status=nonexistent');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });
  });

  // ==================== POST /api/tasks ====================
  describe('POST /api/tasks', () => {
    it('deve criar uma nova tarefa com dados válidos', async () => {
      const newTask = {
        title: 'Nova tarefa de teste',
        description: 'Descrição da tarefa criada pelo teste automatizado',
        status: 'pending'
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(newTask);

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe(newTask.title);
      expect(response.body.data.description).toBe(newTask.description);
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data).toHaveProperty('createdAt');
      expect(response.body.data).toHaveProperty('updatedAt');

      createdTaskId = response.body.data.id;
    });

    it('deve criar tarefa com status padrão "pending" quando não informado', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({ title: 'Tarefa sem status' });

      expect(response.status).toBe(201);
      expect(response.body.data.status).toBe('pending');
    });

    it('deve retornar erro 400 quando título está ausente', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({ description: 'Sem título' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body).toHaveProperty('details');
    });

    it('deve retornar erro 400 quando título está vazio', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({ title: '' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('deve retornar erro 400 para status inválido', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({ title: 'Tarefa', status: 'invalid_status' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('deve gerar ID no formato UUID', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({ title: 'Tarefa UUID' });

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(response.body.data.id).toMatch(uuidRegex);
    });
  });

  // ==================== GET /api/tasks/:id ====================
  describe('GET /api/tasks/:id', () => {
    it('deve retornar uma tarefa existente por ID', async () => {
      // Primeiro cria uma tarefa
      const createRes = await request(app)
        .post('/api/tasks')
        .send({ title: 'Tarefa para busca' });

      const taskId = createRes.body.data.id;

      const response = await request(app).get(`/api/tasks/${taskId}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(taskId);
      expect(response.body.data.title).toBe('Tarefa para busca');
    });

    it('deve retornar 404 para ID inexistente', async () => {
      const response = await request(app).get('/api/tasks/id-inexistente-123');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Task not found');
    });
  });

  // ==================== PUT /api/tasks/:id ====================
  describe('PUT /api/tasks/:id', () => {
    it('deve atualizar título de uma tarefa existente', async () => {
      const createRes = await request(app)
        .post('/api/tasks')
        .send({ title: 'Título original' });

      const taskId = createRes.body.data.id;

      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send({ title: 'Título atualizado' });

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('Título atualizado');
      expect(response.body.data.id).toBe(taskId);
    });

    it('deve atualizar status de uma tarefa', async () => {
      const createRes = await request(app)
        .post('/api/tasks')
        .send({ title: 'Tarefa para mudar status' });

      const taskId = createRes.body.data.id;

      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send({ status: 'done' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('done');
    });

    it('deve manter campos não alterados', async () => {
      const createRes = await request(app)
        .post('/api/tasks')
        .send({ title: 'Título fixo', description: 'Descrição fixa' });

      const taskId = createRes.body.data.id;

      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send({ status: 'in_progress' });

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('Título fixo');
      expect(response.body.data.description).toBe('Descrição fixa');
    });

    it('deve retornar 404 para atualização de tarefa inexistente', async () => {
      const response = await request(app)
        .put('/api/tasks/id-inexistente')
        .send({ title: 'Nada' });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Task not found');
    });

    it('deve atualizar o campo updatedAt', async () => {
      const createRes = await request(app)
        .post('/api/tasks')
        .send({ title: 'Tarefa timestamp' });

      const taskId = createRes.body.data.id;
      const originalUpdatedAt = createRes.body.data.updatedAt;

      // Pequeno delay para garantir timestamp diferente
      await new Promise(resolve => setTimeout(resolve, 10));

      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send({ title: 'Atualizado' });

      expect(response.body.data.updatedAt).not.toBe(originalUpdatedAt);
    });
  });

  // ==================== DELETE /api/tasks/:id ====================
  describe('DELETE /api/tasks/:id', () => {
    it('deve remover uma tarefa existente', async () => {
      const createRes = await request(app)
        .post('/api/tasks')
        .send({ title: 'Tarefa para deletar' });

      const taskId = createRes.body.data.id;

      const deleteRes = await request(app).delete(`/api/tasks/${taskId}`);
      expect(deleteRes.status).toBe(204);

      // Verifica que não existe mais
      const getRes = await request(app).get(`/api/tasks/${taskId}`);
      expect(getRes.status).toBe(404);
    });

    it('deve retornar 404 ao tentar deletar tarefa inexistente', async () => {
      const response = await request(app).delete('/api/tasks/id-inexistente');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Task not found');
    });
  });

  // ==================== GET /api/stats/summary ====================
  describe('GET /api/stats/summary', () => {
    it('deve retornar estatísticas com estrutura correta', async () => {
      const response = await request(app).get('/api/stats/summary');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('pending');
      expect(response.body.data).toHaveProperty('in_progress');
      expect(response.body.data).toHaveProperty('done');
    });

    it('deve retornar valores numéricos nas estatísticas', async () => {
      const response = await request(app).get('/api/stats/summary');

      expect(typeof response.body.data.total).toBe('number');
      expect(typeof response.body.data.pending).toBe('number');
      expect(typeof response.body.data.in_progress).toBe('number');
      expect(typeof response.body.data.done).toBe('number');
    });

    it('soma dos status deve ser igual ao total', async () => {
      const response = await request(app).get('/api/stats/summary');
      const { total, pending, in_progress, done } = response.body.data;

      expect(pending + in_progress + done).toBe(total);
    });
  });

  // ==================== Rota inexistente ====================
  describe('Rotas inexistentes', () => {
    it('deve retornar 404 para rotas não definidas', async () => {
      const response = await request(app).get('/api/rota-que-nao-existe');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Route not found');
    });
  });
});
