import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Métricas customizadas
const errorRate = new Rate('errors');
const sessionCreationTime = new Trend('session_creation_time');
const sessionGetTime = new Trend('session_get_time');

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
    session_creation_time: ['p(95)<800'],  // Criação de sessão < 800ms (p95)
    session_get_time: ['p(95)<400'],       // Busca de sessão < 400ms (p95)
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export default function () {
  // ==================== Health Check ====================
  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/health`);
    check(res, {
      'health status 200': (r) => r.status === 200,
      'health body has status healthy': (r) => JSON.parse(r.body).status === 'healthy',
      'health body has service name': (r) => JSON.parse(r.body).service === 'legendaviva-api',
    });
    errorRate.add(res.status !== 200);
  });

  sleep(0.5);

  // ==================== Readiness ====================
  group('Readiness Check', () => {
    const res = http.get(`${BASE_URL}/ready`);
    check(res, {
      'ready status 200': (r) => r.status === 200,
      'ready body status': (r) => JSON.parse(r.body).status === 'ready',
    });
    errorRate.add(res.status !== 200);
  });

  sleep(0.5);

  // ==================== Criar Sessão ====================
  let sessionId;
  let publicToken;

  group('Criar Sessão', () => {
    const payload = JSON.stringify({
      title: `Sessão de Carga ${__VU}-${__ITER}`,
      language_source: 'pt-BR',
      keywords: ['performance', 'teste', 'k6'],
    });

    const params = {
      headers: { 'Content-Type': 'application/json' },
    };

    const start = Date.now();
    const res = http.post(`${BASE_URL}/v1/sessions`, payload, params);
    sessionCreationTime.add(Date.now() - start);

    const success = check(res, {
      'create session status 201': (r) => r.status === 201,
      'create session has session_id': (r) => {
        const body = JSON.parse(r.body);
        return body.session_id && body.session_id.length > 0;
      },
      'create session has public_token': (r) => {
        const body = JSON.parse(r.body);
        return body.public_token && body.public_token.length === 6;
      },
      'create session status is ACTIVE': (r) => {
        const body = JSON.parse(r.body);
        return body.status === 'ACTIVE';
      },
    });

    if (success) {
      const body = JSON.parse(res.body);
      sessionId = body.session_id;
      publicToken = body.public_token;
    }
    errorRate.add(res.status !== 201);
  });

  sleep(0.3);

  // ==================== Buscar Sessão por Token Público ====================
  if (publicToken) {
    group('Buscar Sessão por Token', () => {
      const start = Date.now();
      const res = http.get(`${BASE_URL}/v1/sessions/${publicToken}`);
      sessionGetTime.add(Date.now() - start);

      check(res, {
        'get session status 200': (r) => r.status === 200,
        'get session has correct id': (r) => {
          const body = JSON.parse(r.body);
          return body.session_id === sessionId;
        },
        'get session is ACTIVE': (r) => {
          const body = JSON.parse(r.body);
          return body.status === 'ACTIVE';
        },
        'get session has keywords': (r) => {
          const body = JSON.parse(r.body);
          return Array.isArray(body.keywords);
        },
      });
      errorRate.add(res.status !== 200);
    });

    sleep(0.3);

    // ==================== Encerrar Sessão ====================
    group('Encerrar Sessão', () => {
      const res = http.del(`${BASE_URL}/v1/sessions/${sessionId}`);
      check(res, {
        'delete session status 204': (r) => r.status === 204,
      });
      errorRate.add(res.status !== 204);
    });

    sleep(0.3);

    // ==================== Verificar que Sessão Encerrada não é encontrada ====================
    group('Verificar Sessão Encerrada', () => {
      const res = http.get(`${BASE_URL}/v1/sessions/${publicToken}`);
      check(res, {
        'ended session returns 404': (r) => r.status === 404,
      });
      // Não conta como erro - é o comportamento esperado
    });
  }

  sleep(0.5);

  // ==================== Token Inexistente ====================
  group('Token Inexistente (404)', () => {
    const res = http.get(`${BASE_URL}/v1/sessions/xxxxxx`);
    check(res, {
      'invalid token returns 404': (r) => r.status === 404,
    });
    // Esperado — não é erro
  });

  sleep(1);
}

// Relatório ao final do teste
export function handleSummary(data) {
  return {
    'tests/performance/summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data),
  };
}

function textSummary(data) {
  const metrics = data.metrics;
  let output = '\n========== RELATÓRIO DE PERFORMANCE - LegendaViva ==========\n\n';

  output += `Total de requisições: ${metrics.http_reqs ? metrics.http_reqs.values.count : 'N/A'}\n`;
  output += `Taxa de falha: ${metrics.http_req_failed ? (metrics.http_req_failed.values.rate * 100).toFixed(2) : 'N/A'}%\n`;
  output += `Duração média: ${metrics.http_req_duration ? metrics.http_req_duration.values.avg.toFixed(2) : 'N/A'}ms\n`;
  output += `P95: ${metrics.http_req_duration ? metrics.http_req_duration.values['p(95)'].toFixed(2) : 'N/A'}ms\n`;
  output += `P99: ${metrics.http_req_duration ? metrics.http_req_duration.values['p(99)'].toFixed(2) : 'N/A'}ms\n`;

  if (metrics.session_creation_time) {
    output += `\nCriação de Sessão (P95): ${metrics.session_creation_time.values['p(95)'].toFixed(2)}ms\n`;
  }
  if (metrics.session_get_time) {
    output += `Busca de Sessão (P95): ${metrics.session_get_time.values['p(95)'].toFixed(2)}ms\n`;
  }

  output += '\n=============================================================\n';
  return output;
}
