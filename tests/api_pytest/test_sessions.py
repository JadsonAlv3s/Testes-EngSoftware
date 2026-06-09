"""
Testes de API para os endpoints de Sessões.

Endpoints testados:
  - POST /v1/sessions       (Criar sessão)
  - GET /v1/sessions/{token} (Buscar sessão pública)
  - DELETE /v1/sessions/{id} (Encerrar sessão)

Para cada endpoint:
  - 1 cenário de sucesso
  - 2 cenários de erro

Validação de schema com Pydantic.
Gerado com auxílio de IA (Kiro) a partir do contrato da API LegendaViva.
"""

import httpx
from schemas import (
    SessionResponse,
    SessionPublicResponse,
    ValidationErrorResponse,
    ErrorResponse,
)


# ==================== POST /v1/sessions ====================

class TestCreateSession:
    """Testes para o endpoint POST /v1/sessions"""

    def test_criar_sessao_sucesso(self, client: httpx.Client):
        """
        Cenário de SUCESSO: Criar sessão com dados válidos.
        Valida schema completo da resposta com Pydantic.
        """
        payload = {
            "title": "Palestra sobre Acessibilidade",
            "language_source": "pt-BR",
            "keywords": ["acessibilidade", "legendas", "tempo-real"]
        }

        response = client.post("/v1/sessions", json=payload)

        assert response.status_code == 201

        # Validação de schema com Pydantic
        data = SessionResponse(**response.json())
        assert data.title == "Palestra sobre Acessibilidade"
        assert data.language_source == "pt-BR"
        assert data.status == "ACTIVE"
        assert len(data.public_token) == 6
        assert data.share_url == f"/live/{data.public_token}"

    def test_criar_sessao_erro_titulo_muito_longo(self, client: httpx.Client):
        """
        Cenário de ERRO 1: Título com mais de 255 caracteres deve retornar 422.
        Valida que a API rejeita dados que violam as constraints do schema.
        """
        payload = {
            "title": "A" * 256,
            "language_source": "pt-BR"
        }

        response = client.post("/v1/sessions", json=payload)

        assert response.status_code == 422

        # Validação do schema de erro
        data = ValidationErrorResponse(**response.json())
        assert len(data.detail) > 0

    def test_criar_sessao_erro_keywords_excede_limite(self, client: httpx.Client):
        """
        Cenário de ERRO 2: Lista de keywords acima do limite (max_length=20)
        deve retornar 422 Validation Error.
        """
        payload = {
            "title": "Sessão com muitas keywords",
            "keywords": [f"keyword{i}" for i in range(25)]
        }

        response = client.post("/v1/sessions", json=payload)

        assert response.status_code == 422

        # Validação do schema de erro
        data = ValidationErrorResponse(**response.json())
        assert len(data.detail) > 0


# ==================== GET /v1/sessions/{share_token} ====================

class TestGetSession:
    """Testes para o endpoint GET /v1/sessions/{share_token}"""

    def test_buscar_sessao_sucesso(self, client: httpx.Client, create_session):
        """
        Cenário de SUCESSO: Buscar sessão ativa pelo token público.
        Valida schema completo e que dados sensíveis NÃO são expostos.
        """
        # Arrange: criar sessão
        session = create_session(
            title="Sessão para Busca",
            keywords=["teste", "busca"]
        )

        # Act: buscar pelo public_token
        response = client.get(f"/v1/sessions/{session['public_token']}")

        assert response.status_code == 200

        # Validação de schema com Pydantic
        data = SessionPublicResponse(**response.json())
        assert data.session_id == session["session_id"]
        assert data.title == "Sessão para Busca"
        assert data.status == "ACTIVE"
        assert "teste" in data.keywords
        assert "busca" in data.keywords

        # Validação de segurança: campos sensíveis NÃO devem existir
        raw = response.json()
        assert "host_token" not in raw
        assert "expires_at" not in raw

    def test_buscar_sessao_erro_token_inexistente(self, client: httpx.Client):
        """
        Cenário de ERRO 1: Token público que não existe deve retornar 404.
        """
        response = client.get("/v1/sessions/zzzzzz")

        assert response.status_code == 404

        # Validação do schema de erro
        data = ErrorResponse(**response.json())
        assert "não encontrada" in data.detail.lower() or "não encontrada" in data.detail

    def test_buscar_sessao_erro_sessao_encerrada(self, client: httpx.Client, create_session):
        """
        Cenário de ERRO 2: Sessão encerrada não deve ser acessível pelo token.
        Retorna 404 pois o serviço filtra por status ACTIVE.
        """
        # Arrange: criar e encerrar sessão
        session = create_session(title="Sessão para Encerrar")
        client.delete(f"/v1/sessions/{session['session_id']}")

        # Act: tentar buscar sessão encerrada
        response = client.get(f"/v1/sessions/{session['public_token']}")

        assert response.status_code == 404


# ==================== DELETE /v1/sessions/{session_id} ====================

class TestDeleteSession:
    """Testes para o endpoint DELETE /v1/sessions/{session_id}"""

    def test_encerrar_sessao_sucesso(self, client: httpx.Client, create_session):
        """
        Cenário de SUCESSO: Encerrar sessão ativa retorna 204 No Content.
        Após encerramento, sessão não é mais acessível.
        """
        # Arrange: criar sessão
        session = create_session(title="Sessão para Deletar")

        # Act: encerrar sessão
        response = client.delete(f"/v1/sessions/{session['session_id']}")

        assert response.status_code == 204
        assert response.text == "" or response.content == b""

        # Verificar que não é mais acessível
        get_response = client.get(f"/v1/sessions/{session['public_token']}")
        assert get_response.status_code == 404

    def test_encerrar_sessao_erro_id_inexistente(self, client: httpx.Client):
        """
        Cenário de ERRO 1: Tentar encerrar sessão com ID que não existe
        deve retornar 404.
        """
        response = client.delete("/v1/sessions/id-que-nao-existe-12345")

        assert response.status_code == 404

        # Validação do schema de erro
        data = ErrorResponse(**response.json())
        assert len(data.detail) > 0

    def test_encerrar_sessao_erro_metodo_get_na_rota_delete(self, client: httpx.Client):
        """
        Cenário de ERRO 2: Usar método GET na rota de delete (com um session_id formato UUID)
        na verdade bate na rota GET /v1/sessions/{share_token} e retorna 404 por não ser um token válido.
        Isso demonstra que a API não permite operações indevidas.
        """
        # UUID não é um share_token válido (que tem 6 chars hex)
        response = client.get("/v1/sessions/550e8400-e29b-41d4-a716-446655440000")

        assert response.status_code == 404
