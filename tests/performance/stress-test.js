import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

// Teste de estresse - identifica o ponto de ruptura da API LegendaViva
export const options = {
  stages: [
    { duration: '20s', target: 20 },   // Ramp-up moderado
    { duration: '30s', target: 50 },   // Carga alta
    { duration: '30s', target: 100 },  // Carga muito alta
    { duration: '20s', target: 150 },  // Estresse extremo
    { duration: '30s', target: 0 },    // Recovery
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],   // Mais tolerante em stress test
    http_req_failed: ['rate<0.15'],      // Até 15% de erro aceitável em stress
    errors: ['rate<0.2'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export default function () {
  // Distribuição ponderada simulando tráfego real:
  // 40% - health/ready (monitoramento)
  // 30% - criar sessão (palestrantes iniciando)
  // 20% - buscar sessão por token (audiência acessando)
  // 10% - encerrar sessão

  const actions = [
    () => {
      // Health check (monitoramento)
      const res = http.get(`${BASE_URL}/health`);
      check(res, { 'health ok': (r) => r.status === 200 });
      errorRate.add(res.status !== 200);
    },
    () => {
      // Ready check
      const res = http.get(`${BASE_URL}/ready`);
      check(res, { 'ready ok': (r) => r.status === 200 });
      errorRate.add(res.status !== 200);
    },
    () => {
      // Criar sessão
      const payload = JSON.stringify({
        title: `Stress ${__VU}-${__ITER}`,
        language_source: 'pt-BR',
        keywords: ['stress'],
      });
      const res = http.post(`${BASE_URL}/v1/sessions`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      check(res, { 'create ok': (r) => r.status === 201 });
      errorRate.add(res.status !== 201);

      // Se criou, tenta buscar e encerrar
      if (res.status === 201) {
        const body = JSON.parse(res.body);

        // Buscar
        const getRes = http.get(`${BASE_URL}/v1/sessions/${body.public_token}`);
        check(getRes, { 'get ok': (r) => r.status === 200 });

        // Encerrar
        const delRes = http.del(`${BASE_URL}/v1/sessions/${body.session_id}`);
        check(delRes, { 'delete ok': (r) => r.status === 204 });
      }
    },
    () => {
      // Buscar token inexistente (simula audiência com link errado)
      const res = http.get(`${BASE_URL}/v1/sessions/abc123`);
      check(res, { '404 expected': (r) => r.status === 404 });
      // 404 é esperado, não conta como erro
    },
  ];

  // Distribuição: 20% health, 20% ready, 40% criar+buscar+encerrar, 20% 404
  const weights = [0.2, 0.4, 0.8, 1.0];
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
