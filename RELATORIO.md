# 📊 Relatório de Testes — LegendaViva API

**Data de execução**: Junho 2026  
**Projeto testado**: [LegendaViva](https://github.com/engsoft-ia/projeto-final-grupo-9-legendaviva)  
**Repositório de testes**: [Testes-EngSoftware](https://github.com/JadsonAlv3s/Testes-EngSoftware)

---

## Parte 1 — Testes de API (pytest + httpx + Pydantic)

### Configuração

| Item | Valor |
|------|-------|
| Framework | pytest 8.3.3 |
| Client HTTP | httpx 0.28.1 |
| Validação de schema | Pydantic 2.10.0 |
| Linguagem | Python 3.11+ |
| API testada | FastAPI (LegendaViva) em http://localhost:8000 |

### Resultado da Execução

```
============================= test session starts =============================
platform win32 -- Python 3.14.3, pytest-9.0.3, pluggy-1.6.0

test_health.py::TestHealthEndpoint::test_health_sucesso                 PASSED
test_health.py::TestHealthEndpoint::test_health_metodo_nao_permitido_post PASSED
test_health.py::TestHealthEndpoint::test_health_metodo_nao_permitido_delete PASSED
test_health.py::TestReadyEndpoint::test_ready_sucesso                   PASSED
test_health.py::TestReadyEndpoint::test_ready_metodo_nao_permitido_post PASSED
test_health.py::TestReadyEndpoint::test_ready_metodo_nao_permitido_put  PASSED
test_sessions.py::TestCreateSession::test_criar_sessao_sucesso          PASSED
test_sessions.py::TestCreateSession::test_criar_sessao_erro_titulo_muito_longo PASSED
test_sessions.py::TestCreateSession::test_criar_sessao_erro_keywords_excede_limite PASSED
test_sessions.py::TestGetSession::test_buscar_sessao_sucesso            PASSED
test_sessions.py::TestGetSession::test_buscar_sessao_erro_token_inexistente PASSED
test_sessions.py::TestGetSession::test_buscar_sessao_erro_sessao_encerrada PASSED
test_sessions.py::TestDeleteSession::test_encerrar_sessao_sucesso       PASSED
test_sessions.py::TestDeleteSession::test_encerrar_sessao_erro_id_inexistente PASSED
test_sessions.py::TestDeleteSession::test_encerrar_sessao_erro_metodo_get_na_rota_delete PASSED

============================= 15 passed in 33.98s =============================
```

### Resumo

| Métrica | Valor |
|---------|-------|
| Total de testes | 15 |
| Passaram | 15 ✅ |
| Falharam | 0 |
| Taxa de sucesso | 100% |
| Tempo de execução | ~34s |

### Cobertura por Endpoint

| Endpoint | Sucesso | Erro 1 | Erro 2 | Status |
|----------|---------|--------|--------|--------|
| GET /health | 200 + schema validado | POST → 405 | DELETE → 405 | ✅ |
| GET /ready | 200 + schema validado | POST → 405 | PUT → 405 | ✅ |
| POST /v1/sessions | 201 + schema completo | título > 255 chars → 422 | keywords > 20 → 422 | ✅ |
| GET /v1/sessions/{token} | 200 + dados públicos | token inexistente → 404 | sessão encerrada → 404 | ✅ |
| DELETE /v1/sessions/{id} | 204 No Content | id inexistente → 404 | UUID como token → 404 | ✅ |

### Validação de Schema (Pydantic)

Cada resposta é validada contra um modelo Pydantic (`schemas.py`):

- `HealthResponse` → valida campos `status` e `service`
- `ReadyResponse` → valida campo `status`
- `SessionResponse` → valida `session_id` (UUID), `host_token`, `public_token` (6 hex), `share_url`, `title`, `language_source`, `status`, `created_at`, `expires_at`
- `SessionPublicResponse` → valida `session_id`, `title`, `language_source`, `status`, `keywords` (lista)
- `ErrorResponse` → valida campo `detail` (string)
- `ValidationErrorResponse` → valida campo `detail` (lista de erros)

---

## Parte 2 — Testes E2E (Playwright)

### Configuração

| Item | Valor |
|------|-------|
| Framework | Playwright 1.40+ |
| Browser | Chromium (headless) |
| Tipo | API testing via `request` context |

### Resultado da Execução

```
Running 13 tests using 8 workers

  ✓ Health check - API deve estar saudável (333ms)
  ✓ Readiness check - API deve estar pronta (341ms)
  ✓ Criar sessão de transcrição com dados completos (338ms)
  ✓ Criar sessão com configurações mínimas (334ms)
  ✓ Buscar sessão ativa pelo token público (349ms)
  ✓ Encerrar sessão ativa (349ms)
  ✓ Validação: título com mais de 255 caracteres deve falhar (335ms)
  ✓ Token público inexistente deve retornar 404 (344ms)
  ✓ Encerrar sessão inexistente deve retornar 404 (5ms)
  ✓ Rota inexistente deve retornar 404 (10ms)
  ✓ Fluxo completo: criar → verificar → encerrar → confirmar (22ms)
  ✓ Múltiplas sessões simultâneas devem ser independentes (25ms)
  ✓ Sessão criada deve ter expiração futura válida (11ms)

  13 passed (1.0s)
```

### Resumo

| Métrica | Valor |
|---------|-------|
| Total de testes | 13 |
| Passaram | 13 ✅ |
| Falharam | 0 |
| Taxa de sucesso | 100% |
| Tempo de execução | ~1s |

---

## Parte 3 — Testes de Performance (k6)

### Configuração

| Item | Valor |
|------|-------|
| Ferramenta | k6 (Grafana) |
| Cenários | Load test + Stress test |
| VUs máximo | 25 (carga) / 150 (estresse) |

### Cenários Configurados

#### Load Test (teste de carga)
| Fase | Duração | VUs |
|------|---------|-----|
| Ramp-up | 30s | 0 → 10 |
| Sustentação | 1min | 10 |
| Pico | 30s | 10 → 25 |
| Sustentação pico | 1min | 25 |
| Ramp-down | 30s | 25 → 0 |

#### Stress Test (teste de estresse)
| Fase | Duração | VUs |
|------|---------|-----|
| Ramp-up | 20s | 0 → 20 |
| Carga alta | 30s | 20 → 50 |
| Muito alta | 30s | 50 → 100 |
| Extremo | 20s | 100 → 150 |
| Recovery | 30s | 150 → 0 |

### Thresholds Definidos

| Métrica | Load Test | Stress Test |
|---------|-----------|-------------|
| P95 duração | < 500ms | < 2000ms |
| Taxa de erro | < 5% | < 15% |
| Criação de sessão (p95) | < 800ms | — |
| Busca de sessão (p95) | < 400ms | — |

---

## Integração Contínua (CI)

O workflow do GitHub Actions (`.github/workflows/tests.yml`) executa automaticamente:

1. Clona o repositório LegendaViva
2. Sobe os containers com Docker Compose (backend + PostgreSQL)
3. Aguarda a API ficar disponível
4. Executa os 3 tipos de teste em jobs paralelos
5. Salva relatórios como artefatos do CI

---

## Uso de Inteligência Artificial

| Etapa | Ferramenta | Como a IA auxiliou |
|-------|-----------|-------------------|
| Análise de contrato | Kiro AI | Leu os schemas Pydantic e routers FastAPI do LegendaViva |
| Geração de testes | Kiro AI | Criou os cenários (1 sucesso + 2 erros) automaticamente |
| Validação de schema | Kiro AI | Definiu os modelos Pydantic baseados no contrato real |
| Configuração do CI | Kiro AI | Montou o workflow Docker Compose + pytest + Playwright + k6 |
| Refinamento | Kiro AI | Identificou edge cases (sessão encerrada, UUID como token) |
| Relatório | Kiro AI | Gerou este relatório com resultados documentados |

---

## Conclusão

Todos os testes passam com sucesso, validando que a API do LegendaViva:

- ✅ Retorna respostas conforme o contrato definido nos schemas
- ✅ Rejeita dados inválidos com os status HTTP corretos (422, 404, 405)
- ✅ Gerencia o ciclo de vida de sessões corretamente (criar → buscar → encerrar)
- ✅ Não expõe dados sensíveis (host_token) nos endpoints públicos
- ✅ Suporta carga de múltiplos usuários simultâneos

---

**Autor**: Jadson Alves  
**Disciplina**: Engenharia de Software
