import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.sql import (
    CandidateOrigin,
    CandidateStatus,
    TechnologyCategory,
    TechnologyMaturityLevel,
)
from app.services.candidate_review_service import (
    approve_candidate,
    candidate_to_dict,
    create_candidate,
    get_candidate,
    get_summary,
    list_candidates,
    reject_candidate,
    update_candidate,
)

router = APIRouter()


class CandidateBusinessPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    proposed_brand_name: Optional[str] = None
    proposed_model_name: Optional[str] = None
    matched_vehicle_id: Optional[uuid.UUID] = None
    proposed_technology_name: Optional[str] = None
    technology_category: TechnologyCategory = TechnologyCategory.OTHER
    technology_description: Optional[str] = None
    maturity_level: TechnologyMaturityLevel = TechnologyMaturityLevel.CONCEPT
    matched_technology_id: Optional[uuid.UUID] = None
    evidence_text: str
    page_or_time: Optional[str] = None
    confidence: float = Field(default=0.8, ge=0, le=1)
    raw_payload: dict[str, Any] = Field(default_factory=dict)
    review_note: Optional[str] = None


class CandidateCreatePayload(CandidateBusinessPayload):
    source_document_id: uuid.UUID
    origin: CandidateOrigin = CandidateOrigin.MANUAL


class CandidateUpdatePayload(CandidateBusinessPayload):
    pass


class CandidateApprovePayload(BaseModel):
    create_missing_vehicle: bool = True
    create_missing_technology: bool = True
    review_note: Optional[str] = None


class CandidateRejectPayload(BaseModel):
    review_note: Optional[str] = None


@router.get("/summary")
async def review_summary(db: AsyncSession = Depends(get_db)):
    return await get_summary(db)


@router.get("/candidates")
async def review_candidates(
    status: Optional[CandidateStatus] = None,
    origin: Optional[CandidateOrigin] = None,
    source_document_id: Optional[uuid.UUID] = None,
    keyword: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
):
    return await list_candidates(
        db,
        status=status,
        origin=origin,
        source_document_id=source_document_id,
        keyword=keyword,
        page=page,
        page_size=page_size,
    )


@router.post("/candidates")
async def create_review_candidate(payload: CandidateCreatePayload, db: AsyncSession = Depends(get_db)):
    return await create_candidate(db, payload)


@router.get("/candidates/{candidate_id}")
async def review_candidate_detail(candidate_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return candidate_to_dict(await get_candidate(db, candidate_id), include_detail=True)


@router.put("/candidates/{candidate_id}")
async def update_review_candidate(
    candidate_id: uuid.UUID,
    payload: CandidateUpdatePayload,
    db: AsyncSession = Depends(get_db),
):
    return await update_candidate(db, candidate_id, payload)


@router.post("/candidates/{candidate_id}/approve")
async def approve_review_candidate(
    candidate_id: uuid.UUID,
    payload: CandidateApprovePayload,
    db: AsyncSession = Depends(get_db),
):
    return await approve_candidate(db, candidate_id, payload)


@router.post("/candidates/{candidate_id}/reject")
async def reject_review_candidate(
    candidate_id: uuid.UUID,
    payload: CandidateRejectPayload,
    db: AsyncSession = Depends(get_db),
):
    return await reject_candidate(db, candidate_id, payload.review_note)
