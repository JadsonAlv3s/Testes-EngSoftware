import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Métricas customizadas
const errorRate = new Rate('errors');
const taskCreationTime = new Trend('task_creation_time');
const taskListTime = new Trend('task_list_time');

// Configuração dos cenários de carga
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp-up: 0 → 10 usuários em 30s
    { duration: '1m', target: 10 },    // Sustentação: 10 usuários por 1 min
    { duration: '30s', target: 25 },   // Pico: sobe para 25 usuários
    { duration: '1m', target: 25 },    // Sustentação do pico
    { duration: '30s', target: 0 },    // Ramp-down: volta a 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],      // 95% das requisições < 500ms
    http_req_failed: ['rate<0.05'],        // Taxa de erro < 5%
    errors: ['rate<0.1'],                  // Erros customizados < 10%
    task_creation_time: ['p(95)<600'],     // Criação de tarefa < 600ms (p95)
    task_list_time: ['p(95)<400'],         // Listagem < 400ms (p95)
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // ==================== Health Check ====================
  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/api/health`);
    check(res, {
      'health status 200': (r) => r.status === 200,
      'health body has status ok': (r) => JSON.parse(r.body).status === 'ok',
    });
    errorRate.add(res.status !== 200);
  });

  sleep(0.5);

  // ==================== Listar Tarefas ====================
  group('Listar Tarefas', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/tasks`);
    taskListTime.add(Date.now() - start);

    check(res, {
      'list status 200': (r) => r.status === 200,
      'list has data array': (r) => {
        const body = JSON.parse(r.body);
        return Array.isArray(body.data);
      },
      'list has total field': (r) => {
        const body = JSON.parse(r.body);
        return typeof body.total === 'number';
      },
    });
    errorRate.add(res.status !== 200);
  });

  sleep(0.5);

  // ==================== Criar Tarefa ====================
  let taskId;
  group('Criar Tarefa', () => {
    const payload = JSON.stringify({
      title: `Tarefa de Carga ${Date.now()}`,
      description: 'Tarefa criada durante teste de performance com k6',
      status: 'pending',
    });

    const params = {
      headers: { 'Content-Type': 'application/json' },
    };

    const start = Date.now();
    const res = http.post(`${BASE_URL}/api/tasks`, payload, params);
    taskCreationTime.add(Date.now() - start);

    const success = check(res, {
      'create status 201': (r) => r.status === 201,
      'create has id': (r) => {
        const body = JSON.parse(r.body);
        return body.data && body.data.id;
      },
      'create has correct title': (r) => {
        const body = JSON.parse(r.body);
        return body.data && body.data.title.startsWith('Tarefa de Carga');
      },
    });

    if (success) {
      taskId = JSON.parse(res.body).data.id;
    }
    errorRate.add(res.status !== 201);
  });

  sleep(0.3);

  // ==================== Buscar Tarefa por ID ====================
  if (taskId) {
    group('Buscar Tarefa por ID', () => {
      const res = http.get(`${BASE_URL}/api/tasks/${taskId}`);
      check(res, {
        'get by id status 200': (r) => r.status === 200,
        'get by id correct task': (r) => {
          const body = JSON.parse(r.body);
          return body.data && body.data.id === taskId;
        },
      });
      errorRate.add(res.status !== 200);
    });

    sleep(0.3);

    // ==================== Atualizar Tarefa ====================
    group('Atualizar Tarefa', () => {
      const payload = JSON.stringify({
        status: 'in_progress',
        title: `Tarefa Atualizada ${Date.now()}`,
      });

      const params = {
        headers: { 'Content-Type': 'application/json' },
      };

      const res = http.put(`${BASE_URL}/api/tasks/${taskId}`, payload, params);
      check(res, {
        'update status 200': (r) => r.status === 200,
        'update status changed': (r) => {
          const body = JSON.parse(r.body);
          return body.data && body.data.status === 'in_progress';
        },
      });
      errorRate.add(res.status !== 200);
    });

    sleep(0.3);

    // ==================== Deletar Tarefa ====================
    group('Deletar Tarefa', () => {
      const res = http.del(`${BASE_URL}/api/tasks/${taskId}`);
      check(res, {
        'delete status 204': (r) => r.status === 204,
      });
      errorRate.add(res.status !== 204);
    });
  }

  sleep(0.5);

  // ==================== Filtrar por Status ====================
  group('Filtrar por Status', () => {
    const res = http.get(`${BASE_URL}/api/tasks?status=pending`);
    check(res, {
      'filter status 200': (r) => r.status === 200,
      'filter returns filtered data': (r) => {
        const body = JSON.parse(r.body);
        return body.data.every((t) => t.status === 'pending');
      },
    });
    errorRate.add(res.status !== 200);
  });

  sleep(0.3);

  // ==================== Estatísticas ====================
  group('Estatísticas', () => {
    const res = http.get(`${BASE_URL}/api/stats/summary`);
    check(res, {
      'stats status 200': (r) => r.status === 200,
      'stats has total': (r) => {
        const body = JSON.parse(r.body);
        return typeof body.data.total === 'number';
      },
    });
    errorRate.add(res.status !== 200);
  });

  sleep(1);
}

// Relatório ao final do teste
export function handleSummary(data) {
  return {
    'tests/performance/summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: '  ', enableColors: true }),
  };
}

function textSummary(data, opts) {
  const metrics = data.metrics;
  let output = '\n========== RELATÓRIO DE PERFORMANCE ==========\n\n';

  output += `Total de requisições: ${metrics.http_reqs ? metrics.http_reqs.values.count : 'N/A'}\n`;
  output += `Taxa de falha: ${metrics.http_req_failed ? (metrics.http_req_failed.values.rate * 100).toFixed(2) : 'N/A'}%\n`;
  output += `Duração média: ${metrics.http_req_duration ? metrics.http_req_duration.values.avg.toFixed(2) : 'N/A'}ms\n`;
  output += `P95: ${metrics.http_req_duration ? metrics.http_req_duration.values['p(95)'].toFixed(2) : 'N/A'}ms\n`;
  output += `P99: ${metrics.http_req_duration ? metrics.http_req_duration.values['p(99)'].toFixed(2) : 'N/A'}ms\n`;

  output += '\n===============================================\n';
  return output;
}
