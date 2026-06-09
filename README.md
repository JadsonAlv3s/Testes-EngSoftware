# 🧪 Suíte de Testes - Engenharia de Software

Repositório contendo uma suíte de testes completa para uma API REST de gerenciamento de tarefas, contemplando **testes de API/contrato**, **testes E2E com Playwright** e **testes de performance com k6**.

## 📋 Descrição do Projeto

A aplicação é uma API REST construída com **Node.js + Express** que gerencia tarefas (CRUD completo) com funcionalidades de filtragem, busca e estatísticas.

### Endpoints da API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/health` | Health check |
| GET | `/api/tasks` | Listar tarefas (com filtros) |
| GET | `/api/tasks/:id` | Buscar tarefa por ID |
| POST | `/api/tasks` | Criar nova tarefa |
| PUT | `/api/tasks/:id` | Atualizar tarefa |
| DELETE | `/api/tasks/:id` | Remover tarefa |
| GET | `/api/stats/summary` | Estatísticas |

## 🏗️ Estrutura do Projeto

```
├── src/
│   ├── app.js              # Aplicação Express (rotas, middlewares)
│   └── server.js           # Inicialização do servidor
├── tests/
│   ├── api/                # Testes de API/Contrato (Jest + Supertest)
│   │   ├── health.test.js
│   │   └── tasks.test.js
│   ├── e2e/                # Testes E2E (Playwright)
│   │   └── api-e2e.spec.js
│   └── performance/        # Testes de Performance (k6)
│       ├── load-test.js    # Teste de carga
│       └── stress-test.js  # Teste de estresse
├── .github/
│   └── workflows/
│       └── tests.yml       # CI/CD - GitHub Actions
├── playwright.config.js
├── jest.config.js
└── package.json
```

## 🚀 Como Executar

### Pré-requisitos

- Node.js >= 18
- k6 (para testes de performance)

### Instalação

```bash
git clone https://github.com/JadsonAlv3s/Testes-EngSoftware.git
cd Testes-EngSoftware
npm install
```

### Executar a API

```bash
npm start
```

### Executar Testes

```bash
# Testes de API (Jest + Supertest)
npm run test:api

# Testes E2E (Playwright)
npx playwright install chromium
npx playwright test

# Testes de Performance (k6) - requer servidor rodando
npm start &
k6 run tests/performance/load-test.js

# Teste de estresse
k6 run tests/performance/stress-test.js
```

## 📊 Tipos de Testes

### 1. Testes de API / Contrato (Jest + Supertest)

Validam a interface da API conforme o contrato esperado:

- **Estrutura de resposta**: campos obrigatórios, tipos de dados
- **Códigos HTTP**: status corretos para cada cenário
- **Validações**: rejeição de dados inválidos
- **CRUD completo**: criar, ler, atualizar, deletar
- **Filtros e busca**: parâmetros de query string
- **Casos de erro**: 404, 400, rotas inexistentes

**Total: 25+ cenários de teste**

### 2. Testes E2E (Playwright)

Simulam fluxos reais de uso da API de ponta a ponta:

- **Ciclo de vida completo**: criar → atualizar → completar → deletar
- **Fluxos de negócio**: gestão de tarefas com estados
- **Integrações**: filtros, busca e estatísticas em conjunto
- **Validações end-to-end**: dados persistem entre operações

**Total: 14+ cenários E2E**

### 3. Testes de Performance (k6)

Avaliam o comportamento da API sob carga:

#### Teste de Carga (`load-test.js`)
- Ramp-up gradual até 25 usuários simultâneos
- Métricas customizadas por operação
- Thresholds: P95 < 500ms, erro < 5%

#### Teste de Estresse (`stress-test.js`)
- Sobe até 150 usuários virtuais
- Distribuição ponderada de operações (simula tráfego real)
- Identifica ponto de ruptura

**Métricas monitoradas:**
- Tempo de resposta (avg, p95, p99)
- Taxa de erro
- Throughput (req/s)
- Tempo de criação de tarefa
- Tempo de listagem

## ⚙️ CI/CD (GitHub Actions)

O workflow `.github/workflows/tests.yml` executa automaticamente:

1. **Testes de API** - Com cobertura de código
2. **Testes E2E** - Com relatório HTML do Playwright
3. **Testes de Performance** - Com relatório JSON do k6

Os relatórios são salvos como artefatos no GitHub Actions.

## 🤖 Uso de Inteligência Artificial

Este projeto demonstra o uso consciente de IA (Kiro AI) para:

1. **Geração de código**: Estrutura da API e esqueleto dos testes gerados com auxílio de IA
2. **Revisão e refinamento**: Cenários de teste revisados para cobrir edge cases
3. **Análise de cobertura**: IA auxiliou na identificação de cenários não testados
4. **Otimização de performance**: Configuração de thresholds e cenários de carga baseados em boas práticas sugeridas pela IA
5. **CI/CD**: Workflow configurado com auxílio de IA para integração dos três tipos de teste

### Processo de Desenvolvimento com IA

| Etapa | Como a IA auxiliou |
|-------|-------------------|
| Planejamento | Definição dos cenários de teste e estrutura do projeto |
| Geração | Código inicial da API e testes |
| Refinamento | Adição de validações, edge cases e métricas customizadas |
| Revisão | Verificação de contratos, thresholds adequados |
| Documentação | Geração do README e comentários no código |

## 📈 Resultados Esperados

### Testes de API
- ✅ 25+ testes passando
- ✅ Cobertura > 90%
- ✅ Validação de contrato completa

### Testes E2E
- ✅ 14+ fluxos E2E validados
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
**Repositório**: [GitHub](https://github.com/JadsonAlv3s/Testes-EngSoftware)
