"""
Configuração do ambiente de testes com pytest e httpx.

Este módulo configura o client HTTP assíncrono que será utilizado
por todos os testes da suíte. A URL base da API é configurável
via variável de ambiente API_URL.
"""

import os
import pytest
import httpx


# URL base da API - configurável via variável de ambiente
API_BASE_URL = os.getenv("API_URL", "http://localhost:8000").strip()


@pytest.fixture(scope="session")
def base_url() -> str:
    """Retorna a URL base da API sendo testada."""
    return API_BASE_URL


@pytest.fixture
def client(base_url: str):
    """
    Fixture que fornece um client HTTP síncrono para os testes.
    O client é criado com a base_url e timeout configurados.
    """
    with httpx.Client(base_url=base_url, timeout=10.0) as c:
        yield c


@pytest.fixture
async def async_client(base_url: str):
    """
    Fixture que fornece um client HTTP assíncrono para testes async.
    """
    async with httpx.AsyncClient(base_url=base_url, timeout=10.0) as c:
        yield c


@pytest.fixture
def create_session(client: httpx.Client):
    """
    Fixture auxiliar que cria uma sessão e retorna os dados.
    Útil para testes que precisam de uma sessão já existente.
    """
    def _create(title: str = "Sessão de Teste", **kwargs):
        payload = {"title": title, "language_source": "pt-BR", **kwargs}
        response = client.post("/v1/sessions", json=payload)
        assert response.status_code == 201
        return response.json()
    return _create
