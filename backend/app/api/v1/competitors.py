import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import Base, async_engine, get_db
from app.models.sql import (
    Evidence,
    SourceDocument,
    SourceDocumentType,
    TechnologyCategory,
    TechnologyMaturityLevel,
    TechnologyPoint,
    VehicleModel,
    VehicleVariant,
)

router = APIRouter()
_schema_ready = False


async def ensure_competitor_schema(db: AsyncSession) -> None:
    """Create new competitor tables and add compatible columns to the legacy vehicle table."""
    global _schema_ready
    if _schema_ready:
        return

    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    await db.execute(text("ALTER TABLE vehicle_models ADD COLUMN IF NOT EXISTS energy_type VARCHAR(50);"))
    await db.execute(text("ALTER TABLE vehicle_models ADD COLUMN IF NOT EXISTS market_segment VARCHAR(100);"))
    await db.execute(text("ALTER TABLE vehicle_models ADD COLUMN IF NOT EXISTS launch_year INTEGER;"))
    await db.commit()
    _schema_ready = True


def dt(value):
    return value.isoformat() if value else None


def enum_value(value: Any) -> Any:
    return value.value if hasattr(value, "value") else value


def vehicle_to_dict(vehicle: VehicleModel, include_relations: bool = False) -> dict:
    data = {
        "id": str(vehicle.id),
        "brand_name": vehicle.brand_name,
        "model_name": vehicle.model_name,
        "energy_type": vehicle.energy_type,
        "market_segment": vehicle.market_segment,
        "launch_year": vehicle.launch_year,
        "base_price": vehicle.base_price,
        "specs": vehicle.specs or {},
        "last_updated": dt(vehicle.last_updated),
    }
    if include_relations:
        data["variants"] = [
            {
                "id": str(v.id),
                "vehicle_id": str(v.vehicle_id),
                "variant_name": v.variant_name,
                "price": v.price,
                "config": v.config or {},
                "created_at": dt(v.created_at),
            }
            for v in (vehicle.variants or [])
        ]
        data["evidence"] = [evidence_to_dict(e) for e in (vehicle.evidence_items or [])]
    return data


def technology_to_dict(item: TechnologyPoint) -> dict:
    return {
        "id": str(item.id),
        "name": item.name,
        "category": enum_value(item.category),
        "description": item.description,
        "maturity_level": enum_value(item.maturity_level),
        "tags": item.tags or [],
        "created_at": dt(item.created_at),
    }


def evidence_to_dict(item: Evidence) -> dict:
    return {
        "id": str(item.id),
        "source_document_id": str(item.source_document_id),
        "vehicle_id": str(item.vehicle_id) if item.vehicle_id else None,
        "technology_id": str(item.technology_id) if item.technology_id else None,
        "evidence_text": item.evidence_text,
        "page_or_time": item.page_or_time,
        "confidence": item.confidence,
        "created_at": dt(item.created_at),
        "source_document": {
            "id": str(item.source_document.id),
            "title": item.source_document.title,
            "source_type": enum_value(item.source_document.source_type),
            "source_url": item.source_document.source_url,
            "file_name": item.source_document.file_name,
            "created_at": dt(item.source_document.created_at),
        } if item.source_document else None,
        "vehicle": {
            "id": str(item.vehicle.id),
            "brand_name": item.vehicle.brand_name,
            "model_name": item.vehicle.model_name,
        } if item.vehicle else None,
        "technology": {
            "id": str(item.technology.id),
            "name": item.technology.name,
            "category": enum_value(item.technology.category),
        } if item.technology else None,
    }


@router.get("/vehicles")
async def list_vehicles(db: AsyncSession = Depends(get_db)):
    await ensure_competitor_schema(db)
    result = await db.execute(select(VehicleModel).order_by(VehicleModel.brand_name, VehicleModel.model_name))
    return [vehicle_to_dict(item) for item in result.scalars().all()]


@router.get("/vehicles/{vehicle_id}")
async def get_vehicle(vehicle_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    await ensure_competitor_schema(db)
    result = await db.execute(
        select(VehicleModel)
        .options(selectinload(VehicleModel.variants), selectinload(VehicleModel.evidence_items).selectinload(Evidence.source_document), selectinload(VehicleModel.evidence_items).selectinload(Evidence.technology))
        .where(VehicleModel.id == vehicle_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle_to_dict(item, include_relations=True)


@router.get("/technologies")
async def list_technologies(db: AsyncSession = Depends(get_db)):
    await ensure_competitor_schema(db)
    result = await db.execute(select(TechnologyPoint).order_by(TechnologyPoint.category, TechnologyPoint.name))
    return [technology_to_dict(item) for item in result.scalars().all()]


@router.get("/evidence")
async def list_evidence(
    vehicle_id: Optional[uuid.UUID] = None,
    technology_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
):
    await ensure_competitor_schema(db)
    stmt = select(Evidence).options(
        selectinload(Evidence.source_document),
        selectinload(Evidence.vehicle),
        selectinload(Evidence.technology),
    ).order_by(Evidence.created_at.desc())
    if vehicle_id:
        stmt = stmt.where(Evidence.vehicle_id == vehicle_id)
    if technology_id:
        stmt = stmt.where(Evidence.technology_id == technology_id)
    result = await db.execute(stmt)
    return [evidence_to_dict(item) for item in result.scalars().all()]


@router.post("/seed")
async def seed_competitors(db: AsyncSession = Depends(get_db)):
    await ensure_competitor_schema(db)

    existing = await db.execute(select(VehicleModel).where(VehicleModel.brand_name == "小米", VehicleModel.model_name == "SU7 Max"))
    su7 = existing.scalar_one_or_none()
    if not su7:
        su7 = VehicleModel(
            brand_name="小米",
            model_name="SU7 Max",
            energy_type="纯电",
            market_segment="中大型纯电轿车",
            launch_year=2024,
            base_price=29.99,
            specs={"range_km": 800, "platform": "Modena", "acceleration_0_100": "2.78s"},
        )
        db.add(su7)
        await db.flush()
        db.add(VehicleVariant(
            vehicle_id=su7.id,
            variant_name="Max 长续航高阶智驾版",
            price=29.99,
            config={"battery": "101kWh", "adas": "Xiaomi Pilot Max", "voltage": "800V"},
        ))

    existing = await db.execute(select(VehicleModel).where(VehicleModel.brand_name == "极氪", VehicleModel.model_name == "007 四驱智驾版"))
    zeekr = existing.scalar_one_or_none()
    if not zeekr:
        zeekr = VehicleModel(
            brand_name="极氪",
            model_name="007 四驱智驾版",
            energy_type="纯电",
            market_segment="中型纯电轿车",
            launch_year=2024,
            base_price=22.99,
            specs={"range_km": 770, "platform": "SEA", "charging": "800V"},
        )
        db.add(zeekr)
        await db.flush()
        db.add(VehicleVariant(
            vehicle_id=zeekr.id,
            variant_name="四驱智驾版 100kWh",
            price=22.99,
            config={"battery": "100kWh", "adas": "NZP", "voltage": "800V"},
        ))

    tech_result = await db.execute(select(TechnologyPoint).where(TechnologyPoint.name == "800V 高压快充平台"))
    fast_charge = tech_result.scalar_one_or_none()
    if not fast_charge:
        fast_charge = TechnologyPoint(
            name="800V 高压快充平台",
            category=TechnologyCategory.BATTERY,
            description="通过高压电气架构提升补能效率，是中高端纯电车型的重要竞争点。",
            maturity_level=TechnologyMaturityLevel.MASS_PRODUCTION,
            tags=["补能", "电池", "高压平台"],
        )
        db.add(fast_charge)
        await db.flush()

    tech_result = await db.execute(select(TechnologyPoint).where(TechnologyPoint.name == "端到端城市 NOA"))
    noa = tech_result.scalar_one_or_none()
    if not noa:
        noa = TechnologyPoint(
            name="端到端城市 NOA",
            category=TechnologyCategory.ADAS,
            description="以端到端模型提升城市领航辅助的泛化能力和复杂场景通过率。",
            maturity_level=TechnologyMaturityLevel.ANNOUNCED,
            tags=["智驾", "NOA", "端到端"],
        )
        db.add(noa)
        await db.flush()

    doc_result = await db.execute(select(SourceDocument).where(SourceDocument.title == "竞品库示例资料 - 车型发布会摘要"))
    source_doc = doc_result.scalar_one_or_none()
    if not source_doc:
        source_doc = SourceDocument(
            title="竞品库示例资料 - 车型发布会摘要",
            source_type=SourceDocumentType.PRESS_RELEASE,
            source_url="https://example.com/autoprism/competitor-seed",
            raw_text="示例资料用于验证车型库、技术点库和证据链的最小闭环。",
            file_name="competitor_seed_press_release.txt",
        )
        db.add(source_doc)
        await db.flush()

    evidence_count = await db.execute(select(Evidence).where(Evidence.source_document_id == source_doc.id))
    if not evidence_count.scalars().first():
        db.add_all([
            Evidence(
                source_document_id=source_doc.id,
                vehicle_id=su7.id,
                technology_id=fast_charge.id,
                evidence_text="SU7 Max 样例资料标注其采用 800V 高压平台，强调快速补能与长续航能力。",
                page_or_time="发布会摘要 P3",
                confidence=0.92,
            ),
            Evidence(
                source_document_id=source_doc.id,
                vehicle_id=zeekr.id,
                technology_id=noa.id,
                evidence_text="极氪 007 样例资料将城市 NOA 作为智驾体验卖点，适合纳入竞品技术点对比。",
                page_or_time="发布会摘要 P5",
                confidence=0.88,
            ),
        ])

    await db.commit()
    return {"status": "ok", "message": "Competitor seed data is ready."}

