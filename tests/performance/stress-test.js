import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

// Teste de estresse - identifica o ponto de ruptura
export const options = {
  stages: [
    { duration: '20s', target: 20 },   // Ramp-up moderado
    { duration: '30s', target: 50 },   // Carga alta
    { duration: '30s', target: 100 },  // Carga muito alta
    { duration: '20s', target: 150 },  // Estresse extremo
    { duration: '30s', target: 0 },    // Recovery
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],   // Mais tolerante para stress test
    http_req_failed: ['rate<0.15'],      // Até 15% de erro aceitável em stress
    errors: ['rate<0.2'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Simula operações mistas como em produção
  const actions = [
    () => {
      // 40% - Leitura (GET list)
      const res = http.get(`${BASE_URL}/api/tasks`);
      check(res, { 'list ok': (r) => r.status === 200 });
      errorRate.add(res.status !== 200);
    },
    () => {
      // 20% - Criação (POST)
      const payload = JSON.stringify({
        title: `Stress ${__VU}-${__ITER}`,
        description: 'Teste de estresse',
        status: 'pending',
      });
      const res = http.post(`${BASE_URL}/api/tasks`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      check(res, { 'create ok': (r) => r.status === 201 });
      errorRate.add(res.status !== 201);
    },
    () => {
      // 20% - Stats
      const res = http.get(`${BASE_URL}/api/stats/summary`);
      check(res, { 'stats ok': (r) => r.status === 200 });
      errorRate.add(res.status !== 200);
    },
    () => {
      // 10% - Health
      const res = http.get(`${BASE_URL}/api/health`);
      check(res, { 'health ok': (r) => r.status === 200 });
      errorRate.add(res.status !== 200);
    },
    () => {
      // 10% - Filter
      const res = http.get(`${BASE_URL}/api/tasks?status=pending`);
      check(res, { 'filter ok': (r) => r.status === 200 });
      errorRate.add(res.status !== 200);
    },
  ];

  // Distribuição ponderada: 40% list, 20% create, 20% stats, 10% health, 10% filter
  const weights = [0.4, 0.6, 0.8, 0.9, 1.0];
  const rand = Math.random();
  const actionIndex = weights.findIndex((w) => rand < w);
  actions[actionIndex]();

  sleep(0.1 + Math.random() * 0.3);
}

export function handleSummary(data) {
  return {
    'tests/performance/stress-summary.json': JSON.stringify(data, null, 2),
  };
}
