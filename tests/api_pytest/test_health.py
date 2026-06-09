"""
Testes de API para os endpoints de Health Check.

Endpoints testados:
  - GET /health
  - GET /ready

Para cada endpoint:
  - 1 cenário de sucesso
  - 2 cenários de erro

Validação de schema com Pydantic.
Gerado com auxílio de IA (Kiro) a partir do contrato da API LegendaViva.
"""

import httpx
from schemas import HealthResponse, ReadyResponse


# ==================== GET /health ====================

class TestHealthEndpoint:
    """Testes para o endpoint GET /health"""

    def test_health_sucesso(self, client: httpx.Client):
        """
        Cenário de SUCESSO: Health check retorna status healthy.
        Valida schema completo da resposta.
        """
        response = client.get("/health")

        assert response.status_code == 200

        # Validação de schema com Pydantic
        data = HealthResponse(**response.json())
        assert data.status == "healthy"
        assert data.service == "legendaviva-api"

    def test_health_metodo_nao_permitido_post(self, client: httpx.Client):
        """
        Cenário de ERRO 1: POST em /health deve retornar 405 Method Not Allowed.
        O endpoint aceita apenas GET.
        """
        response = client.post("/health")

        assert response.status_code == 405

    def test_health_metodo_nao_permitido_delete(self, client: httpx.Client):
        """
        Cenário de ERRO 2: DELETE em /health deve retornar 405 Method Not Allowed.
        O endpoint aceita apenas GET.
        """
        response = client.delete("/health")

        assert response.status_code == 405


# ==================== GET /ready ====================

class TestReadyEndpoint:
    """Testes para o endpoint GET /ready"""

    def test_ready_sucesso(self, client: httpx.Client):
        """
        Cenário de SUCESSO: Readiness check retorna status ready.
        Valida schema completo da resposta.
        """
        response = client.get("/ready")

        assert response.status_code == 200

        # Validação de schema com Pydantic
        data = ReadyResponse(**response.json())
        assert data.status == "ready"

    def test_ready_metodo_nao_permitido_post(self, client: httpx.Client):
        """
        Cenário de ERRO 1: POST em /ready deve retornar 405.
        """
        response = client.post("/ready")

        assert response.status_code == 405

    def test_ready_metodo_nao_permitido_put(self, client: httpx.Client):
        """
        Cenário de ERRO 2: PUT em /ready deve retornar 405.
        """
        response = client.put("/ready")

        assert response.status_code == 405
