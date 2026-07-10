import uuid
from datetime import datetime
from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import Base, async_engine
from app.models.sql import (
    CandidateOrigin,
    CandidateStatus,
    Evidence,
    ExtractionCandidate,
    SourceDocument,
    TechnologyCategory,
    TechnologyMaturityLevel,
    TechnologyPoint,
    VehicleModel,
    utcnow,
)

_schema_ready = False


async def ensure_review_schema() -> None:
    global _schema_ready
    if _schema_ready:
        return
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    _schema_ready = True


def dt(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() if value else None


def enum_value(value: Any) -> Any:
    return value.value if hasattr(value, "value") else value


def normalize_confidence(value: float) -> float:
    if value > 1:
        value = value / 100
    return max(0.0, min(1.0, value))


def validate_confidence(value: float) -> float:
    if value < 0 or value > 1:
        raise HTTPException(status_code=400, detail="confidence 必须在 0 到 1 之间")
    return value


def source_to_dict(item: Optional[SourceDocument], include_raw_text: bool = False) -> Optional[dict]:
    if not item:
        return None
    data = {
        "id": str(item.id),
        "title": item.title,
        "source_type": enum_value(item.source_type),
        "source_url": item.source_url,
        "file_name": item.file_name,
        "created_at": dt(item.created_at),
    }
    if include_raw_text:
        data["raw_text"] = item.raw_text or ""
    return data


def vehicle_to_dict(item: Optional[VehicleModel]) -> Optional[dict]:
    if not item:
        return None
    return {
        "id": str(item.id),
        "brand_name": item.brand_name,
        "model_name": item.model_name,
        "energy_type": item.energy_type,
        "market_segment": item.market_segment,
        "launch_year": item.launch_year,
        "base_price": item.base_price,
        "specs": item.specs or {},
    }


def technology_to_dict(item: Optional[TechnologyPoint]) -> Optional[dict]:
    if not item:
        return None
    return {
        "id": str(item.id),
        "name": item.name,
        "category": enum_value(item.category),
        "description": item.description,
        "maturity_level": enum_value(item.maturity_level),
        "tags": item.tags or [],
    }


def evidence_to_dict(item: Optional[Evidence]) -> Optional[dict]:
    if not item:
        return None
    return {
        "id": str(item.id),
        "source_document_id": str(item.source_document_id),
        "vehicle_id": str(item.vehicle_id) if item.vehicle_id else None,
        "technology_id": str(item.technology_id) if item.technology_id else None,
        "evidence_text": item.evidence_text,
        "page_or_time": item.page_or_time,
        "confidence": item.confidence,
        "created_at": dt(item.created_at),
    }


def candidate_to_dict(item: ExtractionCandidate, include_detail: bool = False) -> dict:
    data = {
        "id": str(item.id),
        "source_document_id": str(item.source_document_id),
        "origin": enum_value(item.origin),
        "status": enum_value(item.status),
        "proposed_brand_name": item.proposed_brand_name,
        "proposed_model_name": item.proposed_model_name,
        "matched_vehicle_id": str(item.matched_vehicle_id) if item.matched_vehicle_id else None,
        "proposed_technology_name": item.proposed_technology_name,
        "technology_category": enum_value(item.technology_category),
        "technology_description": item.technology_description,
        "maturity_level": enum_value(item.maturity_level),
        "matched_technology_id": str(item.matched_technology_id) if item.matched_technology_id else None,
        "evidence_text": item.evidence_text,
        "page_or_time": item.page_or_time,
        "confidence": item.confidence,
        "raw_payload": item.raw_payload or {},
        "review_note": item.review_note,
        "approved_evidence_id": str(item.approved_evidence_id) if item.approved_evidence_id else None,
        "created_at": dt(item.created_at),
        "reviewed_at": dt(item.reviewed_at),
        "source_document": source_to_dict(item.source_document, include_raw_text=include_detail),
        "matched_vehicle": vehicle_to_dict(item.matched_vehicle),
        "matched_technology": technology_to_dict(item.matched_technology),
    }
    if include_detail:
        data["approved_evidence"] = evidence_to_dict(item.approved_evidence)
    return data


def candidate_options() -> tuple:
    return (
        selectinload(ExtractionCandidate.source_document),
        selectinload(ExtractionCandidate.matched_vehicle),
        selectinload(ExtractionCandidate.matched_technology),
        selectinload(ExtractionCandidate.approved_evidence),
    )


async def get_summary(db: AsyncSession) -> dict:
    await ensure_review_schema()
    rows = (
        await db.execute(
            select(ExtractionCandidate.status, func.count(ExtractionCandidate.id))
            .group_by(ExtractionCandidate.status)
        )
    ).all()
    counts = {enum_value(status): count for status, count in rows}
    pending = counts.get(CandidateStatus.PENDING.value, 0)
    approved = counts.get(CandidateStatus.APPROVED.value, 0)
    rejected = counts.get(CandidateStatus.REJECTED.value, 0)
    return {"pending": pending, "approved": approved, "rejected": rejected, "total": pending + approved + rejected}


async def list_candidates(
    db: AsyncSession,
    status: Optional[CandidateStatus] = None,
    origin: Optional[CandidateOrigin] = None,
    source_document_id: Optional[uuid.UUID] = None,
    keyword: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    await ensure_review_schema()
    page = max(1, page)
    page_size = min(100, max(1, page_size))
    conditions = []
    if status:
        conditions.append(ExtractionCandidate.status == status)
    if origin:
        conditions.append(ExtractionCandidate.origin == origin)
    if source_document_id:
        conditions.append(ExtractionCandidate.source_document_id == source_document_id)
    if keyword and keyword.strip():
        like = f"%{keyword.strip()}%"
        conditions.append(
            or_(
                ExtractionCandidate.evidence_text.ilike(like),
                ExtractionCandidate.proposed_brand_name.ilike(like),
                ExtractionCandidate.proposed_model_name.ilike(like),
                ExtractionCandidate.proposed_technology_name.ilike(like),
            )
        )
    where_clause = and_(*conditions) if conditions else None
    total_stmt = select(func.count(ExtractionCandidate.id))
    stmt = select(ExtractionCandidate).options(*candidate_options()).order_by(ExtractionCandidate.created_at.desc())
    if where_clause is not None:
        total_stmt = total_stmt.where(where_clause)
        stmt = stmt.where(where_clause)
    total = (await db.execute(total_stmt)).scalar_one()
    rows = (
        await db.execute(stmt.offset((page - 1) * page_size).limit(page_size))
    ).scalars().all()
    return {
        "items": [candidate_to_dict(item) for item in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


async def get_candidate(db: AsyncSession, candidate_id: uuid.UUID) -> ExtractionCandidate:
    await ensure_review_schema()
    result = await db.execute(
        select(ExtractionCandidate)
        .options(*candidate_options())
        .where(ExtractionCandidate.id == candidate_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="候选记录不存在")
    return item


async def validate_candidate_business_fields(db: AsyncSession, payload: Any) -> None:
    if not payload.evidence_text.strip():
        raise HTTPException(status_code=400, detail="证据文本不能为空")
    if not payload.matched_vehicle_id and not (payload.proposed_model_name or "").strip():
        raise HTTPException(status_code=400, detail="必须匹配已有车型或填写候选车型名称")
    if not payload.matched_technology_id and not (payload.proposed_technology_name or "").strip():
        raise HTTPException(status_code=400, detail="必须匹配已有技术点或填写候选技术点名称")
    validate_confidence(payload.confidence)
    if payload.matched_vehicle_id:
        vehicle = (
            await db.execute(select(VehicleModel).where(VehicleModel.id == payload.matched_vehicle_id))
        ).scalar_one_or_none()
        if not vehicle:
            raise HTTPException(status_code=404, detail="匹配车型不存在")
    if payload.matched_technology_id:
        technology = (
            await db.execute(select(TechnologyPoint).where(TechnologyPoint.id == payload.matched_technology_id))
        ).scalar_one_or_none()
        if not technology:
            raise HTTPException(status_code=404, detail="匹配技术点不存在")


async def create_candidate_record(
    db: AsyncSession,
    payload: Any,
    origin: CandidateOrigin,
) -> dict:
    await ensure_review_schema()
    source = (
        await db.execute(select(SourceDocument).where(SourceDocument.id == payload.source_document_id))
    ).scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="来源文档不存在")
    await validate_candidate_business_fields(db, payload)
    item = ExtractionCandidate(
        source_document_id=payload.source_document_id,
        origin=origin,
        status=CandidateStatus.PENDING,
        proposed_brand_name=(payload.proposed_brand_name or "").strip() or None,
        proposed_model_name=(payload.proposed_model_name or "").strip() or None,
        matched_vehicle_id=payload.matched_vehicle_id,
        proposed_technology_name=(payload.proposed_technology_name or "").strip() or None,
        technology_category=payload.technology_category,
        technology_description=(payload.technology_description or "").strip() or None,
        maturity_level=payload.maturity_level,
        matched_technology_id=payload.matched_technology_id,
        evidence_text=payload.evidence_text.strip(),
        page_or_time=(payload.page_or_time or "").strip() or None,
        confidence=payload.confidence,
        raw_payload=payload.raw_payload or {},
    )
    db.add(item)
    await db.commit()
    return candidate_to_dict(await get_candidate(db, item.id), include_detail=True)


async def create_manual_candidate(db: AsyncSession, payload: Any) -> dict:
    return await create_candidate_record(db, payload, CandidateOrigin.MANUAL)


async def update_candidate(db: AsyncSession, candidate_id: uuid.UUID, payload: Any) -> dict:
    item = await get_candidate(db, candidate_id)
    if item.status != CandidateStatus.PENDING:
        raise HTTPException(status_code=409, detail="已审核候选不能再次编辑")
    await validate_candidate_business_fields(db, payload)
    item.proposed_brand_name = (payload.proposed_brand_name or "").strip() or None
    item.proposed_model_name = (payload.proposed_model_name or "").strip() or None
    item.matched_vehicle_id = payload.matched_vehicle_id
    item.proposed_technology_name = (payload.proposed_technology_name or "").strip() or None
    item.technology_category = payload.technology_category
    item.technology_description = (payload.technology_description or "").strip() or None
    item.maturity_level = payload.maturity_level
    item.matched_technology_id = payload.matched_technology_id
    item.evidence_text = payload.evidence_text.strip()
    item.page_or_time = (payload.page_or_time or "").strip() or None
    item.confidence = payload.confidence
    item.review_note = (payload.review_note or "").strip() or None
    await db.commit()
    return candidate_to_dict(await get_candidate(db, item.id), include_detail=True)


async def resolve_vehicle(db: AsyncSession, item: ExtractionCandidate, create_missing: bool) -> VehicleModel:
    if item.matched_vehicle_id:
        vehicle = (
            await db.execute(select(VehicleModel).where(VehicleModel.id == item.matched_vehicle_id))
        ).scalar_one_or_none()
        if vehicle:
            return vehicle
    brand_name = (item.proposed_brand_name or "未填写品牌").strip()
    model_name = (item.proposed_model_name or "").strip()
    if not model_name:
        raise HTTPException(status_code=400, detail="缺少候选车型名称，无法批准入库")
    vehicle = (
        await db.execute(
            select(VehicleModel).where(
                func.lower(VehicleModel.brand_name) == brand_name.casefold(),
                func.lower(VehicleModel.model_name) == model_name.casefold(),
            )
        )
    ).scalar_one_or_none()
    if vehicle:
        return vehicle
    if not create_missing:
        raise HTTPException(status_code=400, detail="未匹配到车型，且未允许创建缺失车型")
    vehicle = VehicleModel(brand_name=brand_name, model_name=model_name, specs={})
    db.add(vehicle)
    await db.flush()
    return vehicle


async def resolve_technology(db: AsyncSession, item: ExtractionCandidate, create_missing: bool) -> TechnologyPoint:
    if item.matched_technology_id:
        technology = (
            await db.execute(select(TechnologyPoint).where(TechnologyPoint.id == item.matched_technology_id))
        ).scalar_one_or_none()
        if technology:
            return technology
    technology_name = (item.proposed_technology_name or "").strip()
    if not technology_name:
        raise HTTPException(status_code=400, detail="缺少候选技术点名称，无法批准入库")
    technology = (
        await db.execute(
            select(TechnologyPoint).where(
                func.lower(TechnologyPoint.name) == technology_name.casefold(),
                TechnologyPoint.category == item.technology_category,
            )
        )
    ).scalar_one_or_none()
    if technology:
        return technology
    if not create_missing:
        raise HTTPException(status_code=400, detail="未匹配到技术点，且未允许创建缺失技术点")
    technology = TechnologyPoint(
        name=technology_name,
        category=item.technology_category,
        description=item.technology_description,
        maturity_level=item.maturity_level,
        tags=[],
    )
    db.add(technology)
    await db.flush()
    return technology


async def approve_candidate(db: AsyncSession, candidate_id: uuid.UUID, payload: Any) -> dict:
    await ensure_review_schema()
    try:
        item = (
            await db.execute(
                select(ExtractionCandidate)
                .where(ExtractionCandidate.id == candidate_id)
                .with_for_update()
            )
        ).scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=404, detail="候选记录不存在")
        if item.status != CandidateStatus.PENDING:
            raise HTTPException(status_code=409, detail="只有 pending 候选可以批准")
        source = (
            await db.execute(select(SourceDocument).where(SourceDocument.id == item.source_document_id))
        ).scalar_one_or_none()
        if not source:
            raise HTTPException(status_code=404, detail="来源文档不存在")
        vehicle = await resolve_vehicle(db, item, payload.create_missing_vehicle)
        technology = await resolve_technology(db, item, payload.create_missing_technology)
        existing = (
            await db.execute(
                select(Evidence).where(
                    Evidence.source_document_id == item.source_document_id,
                    Evidence.vehicle_id == vehicle.id,
                    Evidence.technology_id == technology.id,
                    Evidence.evidence_text == item.evidence_text,
                )
            )
        ).scalar_one_or_none()
        if existing:
            evidence = existing
        else:
            evidence = Evidence(
                source_document_id=item.source_document_id,
                vehicle_id=vehicle.id,
                technology_id=technology.id,
                evidence_text=item.evidence_text,
                page_or_time=item.page_or_time,
                confidence=normalize_confidence(item.confidence),
            )
            db.add(evidence)
            await db.flush()
        item.status = CandidateStatus.APPROVED
        item.matched_vehicle_id = vehicle.id
        item.matched_technology_id = technology.id
        item.approved_evidence_id = evidence.id
        item.reviewed_at = utcnow()
        item.review_note = (payload.review_note or "").strip() or None
        await db.commit()
    except HTTPException:
        await db.rollback()
        raise
    except Exception:
        await db.rollback()
        raise
    return candidate_to_dict(await get_candidate(db, item.id), include_detail=True)


async def reject_candidate(db: AsyncSession, candidate_id: uuid.UUID, review_note: Optional[str]) -> dict:
    await ensure_review_schema()
    try:
        item = (
            await db.execute(
                select(ExtractionCandidate)
                .where(ExtractionCandidate.id == candidate_id)
                .with_for_update()
            )
        ).scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=404, detail="候选记录不存在")
        if item.status != CandidateStatus.PENDING:
            raise HTTPException(status_code=409, detail="只有 pending 候选可以拒绝")
        item.status = CandidateStatus.REJECTED
        item.reviewed_at = utcnow()
        item.review_note = (review_note or "").strip() or None
        await db.commit()
    except HTTPException:
        await db.rollback()
        raise
    except Exception:
        await db.rollback()
        raise
    return candidate_to_dict(await get_candidate(db, item.id), include_detail=True)
