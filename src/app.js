const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { body, param, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory database
const tasks = new Map();

// Seed com dados iniciais
const seedTasks = [
  { id: uuidv4(), title: 'Estudar testes de API', description: 'Aprender sobre testes de contrato e integração', status: 'pending', createdAt: new Date().toISOString() },
  { id: uuidv4(), title: 'Configurar Playwright', description: 'Instalar e configurar o Playwright para testes E2E', status: 'in_progress', createdAt: new Date().toISOString() },
  { id: uuidv4(), title: 'Testes de performance', description: 'Criar scripts k6 para testes de carga', status: 'done', createdAt: new Date().toISOString() }
];

seedTasks.forEach(task => tasks.set(task.id, task));

// Middleware de validação
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// ==================== ROTAS ====================

// GET /api/health - Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// GET /api/tasks - Listar todas as tarefas
app.get('/api/tasks', (req, res) => {
  const { status, search } = req.query;
  let result = Array.from(tasks.values());

  if (status) {
    result = result.filter(t => t.status === status);
  }

  if (search) {
    const searchLower = search.toLowerCase();
    result = result.filter(t =>
      t.title.toLowerCase().includes(searchLower) ||
      t.description.toLowerCase().includes(searchLower)
    );
  }

  res.json({
    data: result,
    total: result.length
  });
});

// GET /api/tasks/:id - Buscar tarefa por ID
app.get('/api/tasks/:id', (req, res) => {
  const task = tasks.get(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json({ data: task });
});

// POST /api/tasks - Criar nova tarefa
app.post('/api/tasks',
  [
    body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
    body('description').optional().trim().isLength({ max: 1000 }),
    body('status').optional().isIn(['pending', 'in_progress', 'done'])
  ],
  handleValidationErrors,
  (req, res) => {
    const task = {
      id: uuidv4(),
      title: req.body.title,
      description: req.body.description || '',
      status: req.body.status || 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    tasks.set(task.id, task);
    res.status(201).json({ data: task });
  }
);

// PUT /api/tasks/:id - Atualizar tarefa
app.put('/api/tasks/:id',
  [
    body('title').optional().trim().notEmpty().isLength({ max: 200 }),
    body('description').optional().trim().isLength({ max: 1000 }),
    body('status').optional().isIn(['pending', 'in_progress', 'done'])
  ],
  handleValidationErrors,
  (req, res) => {
    const task = tasks.get(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const updated = {
      ...task,
      ...req.body,
      id: task.id,
      createdAt: task.createdAt,
      updatedAt: new Date().toISOString()
    };

    tasks.set(task.id, updated);
    res.json({ data: updated });
  }
);

// DELETE /api/tasks/:id - Remover tarefa
app.delete('/api/tasks/:id', (req, res) => {
  const task = tasks.get(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  tasks.delete(req.params.id);
  res.status(204).send();
});

// GET /api/tasks/stats/summary - Estatísticas
app.get('/api/stats/summary', (req, res) => {
  const allTasks = Array.from(tasks.values());
  res.json({
    data: {
      total: allTasks.length,
      pending: allTasks.filter(t => t.status === 'pending').length,
      in_progress: allTasks.filter(t => t.status === 'in_progress').length,
      done: allTasks.filter(t => t.status === 'done').length
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
