import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.services.competitor_ai_service import (
    PROMPT_VERSION,
    extract_source_candidates,
)

router = APIRouter()


class CompetitorAIExtractPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_document_id: uuid.UUID
    max_candidates: int = Field(default=20, ge=1, le=50)


@router.get("/status")
async def competitor_ai_status():
    return {
        "configured": bool(settings.AI_API_KEY.strip()),
        "model": settings.AI_MODEL,
        "prompt_version": PROMPT_VERSION,
    }


@router.post("/extract")
async def competitor_ai_extract(
    payload: CompetitorAIExtractPayload,
    db: AsyncSession = Depends(get_db),
):
    return await extract_source_candidates(
        db,
        source_document_id=payload.source_document_id,
        max_candidates=payload.max_candidates,
    )
