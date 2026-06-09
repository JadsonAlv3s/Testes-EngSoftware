"""
Schemas de validação das respostas da API LegendaViva.

Utiliza Pydantic para validar que as respostas da API
seguem o contrato esperado (estrutura, tipos, formatos).
Gerados com auxílio de IA a partir do código-fonte dos
schemas do projeto LegendaViva (backend/app/modules/sessions/schemas.py).
"""

from pydantic import BaseModel, Field
from typing import Optional


class HealthResponse(BaseModel):
    """Schema esperado para GET /health"""
    status: str
    service: str


class ReadyResponse(BaseModel):
    """Schema esperado para GET /ready"""
    status: str


class SessionResponse(BaseModel):
    """
    Schema esperado para POST /v1/sessions (201 Created).
    Contrato baseado no SessionResponse do projeto LegendaViva.
    """
    session_id: str
    host_token: str
    public_token: str = Field(min_length=6, max_length=6)
    share_url: str
    title: Optional[str]
    language_source: str
    status: str
    created_at: str
    expires_at: str


class SessionPublicResponse(BaseModel):
    """
    Schema esperado para GET /v1/sessions/{share_token} (200 OK).
    Contrato baseado no SessionPublicResponse do projeto LegendaViva.
    Não deve conter host_token, public_token, share_url ou expires_at.
    """
    session_id: str
    title: Optional[str]
    language_source: str
    status: str
    keywords: list[str]


class ErrorResponse(BaseModel):
    """Schema esperado para respostas de erro do FastAPI."""
    detail: str


class ValidationErrorResponse(BaseModel):
    """Schema esperado para erros de validação (422) do FastAPI."""
    detail: list
