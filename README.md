# 🧪 Suíte de Testes - LegendaViva API

Repositório contendo uma suíte de testes completa para a API do projeto [LegendaViva](https://github.com/engsoft-ia/projeto-final-grupo-9-legendaviva), contemplando **testes de API/contrato**, **testes E2E com Playwright** e **testes de performance com k6**.

## 📋 Sobre o Projeto Testado

O **LegendaViva** é um web app que transforma fala em texto em tempo real para eventos acessíveis. A API é construída com **FastAPI (Python)** e gerencia sessões de transcrição ao vivo com WebSockets.

### Endpoints Testados

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Health check |
| GET | `/ready` | Readiness check |
| POST | `/v1/sessions` | Criar sessão de transcrição |
| GET | `/v1/sessions/{share_token}` | Buscar sessão pelo token público |
| DELETE | `/v1/sessions/{session_id}` | Encerrar sessão |

## 🏗️ Estrutura do Repositório

```
├── tests/
│   ├── api/                    # Testes de API/Contrato (Jest + Supertest)
│   │   ├── health.test.js      # Health e readiness
│   │   └── sessions.test.js    # CRUD de sessões + validação de contrato
│   ├── e2e/                    # Testes E2E (Playwright)
│   │   └── legendaviva-e2e.spec.js
│   └── performance/            # Testes de Performance (k6)
│       ├── load-test.js        # Teste de carga (até 25 VUs)
│       └── stress-test.js      # Teste de estresse (até 150 VUs)
├── .github/
│   └── workflows/
│       └── tests.yml           # CI/CD - GitHub Actions
├── playwright.config.js
├── jest.config.js
└── package.json
```

## 🚀 Como Executar

### Pré-requisitos

- Node.js >= 18
- Docker e Docker Compose (para subir o LegendaViva)
- k6 (para testes de performance)

### 1. Subir o LegendaViva

```bash
# Clonar o projeto alvo
git clone https://github.com/engsoft-ia/projeto-final-grupo-9-legendaviva.git legendaviva
cd legendaviva
cp .env.example .env
docker compose up -d backend db

# Verificar se está rodando
curl http://localhost:8000/health
# Deve retornar: {"status":"healthy","service":"legendaviva-api"}
```

### 2. Instalar dependências dos testes

```bash
cd ..  # volta para este repositório
npm install
```

### 3. Executar os testes

```bash
# Testes de API (Jest + Supertest)
API_URL=http://localhost:8000 npm run test:api

# Testes E2E (Playwright)
npx playwright install chromium
API_URL=http://localhost:8000 npx playwright test

# Testes de Performance (k6) - requer k6 instalado
k6 run -e BASE_URL=http://localhost:8000 tests/performance/load-test.js

# Teste de estresse
k6 run -e BASE_URL=http://localhost:8000 tests/performance/stress-test.js
```

### No Windows (PowerShell)

```powershell
$env:API_URL="http://localhost:8000"; npm run test:api
$env:API_URL="http://localhost:8000"; npx playwright test
```

## 📊 Tipos de Testes

### 1. Testes de API / Contrato (Jest + Supertest)

Validam o contrato da API conforme a especificação:

- **Estrutura de resposta**: campos obrigatórios, tipos, formatos (UUID, hex tokens)
- **Códigos HTTP**: 200, 201, 204, 404, 422
- **Validações de negócio**: TTL de sessão, limite de keywords, segurança (host_token não exposto)
- **Ciclo de vida**: criar → buscar → encerrar → verificar encerramento
- **Casos de erro**: token inexistente, título inválido, métodos não permitidos

**Total: 22+ cenários de teste**

### 2. Testes E2E (Playwright)

Simulam fluxos reais de uso ponta a ponta:

- **Ciclo completo**: criar sessão → verificar acesso público → encerrar → confirmar
- **Sessões simultâneas**: independência entre sessões
- **Validações end-to-end**: dados persistem entre operações
- **Edge cases**: tokens inválidos, títulos longos

**Total: 12+ cenários E2E**

### 3. Testes de Performance (k6)

Avaliam o comportamento da API sob carga:

#### Teste de Carga (`load-test.js`)
- Ramp-up gradual até 25 usuários simultâneos
- Métricas customizadas: tempo de criação e busca de sessão
- Thresholds: P95 < 500ms, erro < 5%

#### Teste de Estresse (`stress-test.js`)
- Sobe até 150 usuários virtuais
- Distribuição ponderada de operações (simula tráfego real)
- Identifica ponto de ruptura

**Métricas monitoradas:**
- Tempo de resposta (avg, p95, p99)
- Taxa de erro
- Throughput (req/s)
- Tempo de criação de sessão
- Tempo de busca de sessão

## ⚙️ CI/CD (GitHub Actions)

O workflow `.github/workflows/tests.yml` executa automaticamente:

1. Faz checkout do projeto LegendaViva
2. Sobe os containers (backend + PostgreSQL) com Docker Compose
3. Executa os 3 tipos de teste
4. Salva relatórios como artefatos

## 🤖 Uso de Inteligência Artificial

Este projeto demonstra o uso consciente de IA (Kiro AI) para:

1. **Análise do projeto alvo**: IA leu e interpretou o código-fonte do LegendaViva para mapear endpoints, schemas e comportamentos
2. **Geração de testes**: Cenários criados automaticamente baseados no contrato real da API (schemas Pydantic, routers FastAPI)
3. **Refinamento**: Validações de segurança (não expor host_token), edge cases e verificações de contrato
4. **Configuração de CI**: Workflow montado para integrar com repositório externo via Docker
5. **Testes de performance**: Cenários de carga modelados para o padrão de uso real (palestrantes + audiência)

### Processo de Desenvolvimento com IA

| Etapa | Como a IA auxiliou |
|-------|-------------------|
| Análise | Leu o código do LegendaViva (routers, schemas, services) para entender a API |
| Mapeamento | Identificou endpoints, formatos de resposta e regras de negócio |
| Geração | Criou testes cobrindo contratos, fluxos E2E e cenários de carga |
| Integração | Configurou CI para clonar e subir o projeto alvo automaticamente |
| Documentação | Gerou README explicando como reproduzir os testes |

## 📈 Resultados Esperados

### Testes de API
- ✅ 22+ testes passando
- ✅ Validação de contrato completa
- ✅ Todos os endpoints cobertos

### Testes E2E
- ✅ 12+ fluxos E2E validados
- ✅ Ciclo de vida completo testado
- ✅ Relatório HTML disponível

### Testes de Performance
- ✅ P95 < 500ms sob carga normal
- ✅ Taxa de erro < 5% em carga normal
- ✅ API estável com 25 usuários simultâneos
- ✅ Ponto de ruptura identificado em teste de stress

## 📝 Licença

Este projeto foi desenvolvido para fins acadêmicos - Disciplina de Engenharia de Software.

---

**Autor**: Jadson Alves  
**Repositório dos Testes**: [GitHub](https://github.com/JadsonAlv3s/Testes-EngSoftware)  
**Projeto Testado**: [LegendaViva](https://github.com/engsoft-ia/projeto-final-grupo-9-legendaviva)
