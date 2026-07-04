from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.core.database import get_db
from app.models.sql import IntelligenceInfo, RawIntelligence

router = APIRouter()

@router.get("/")
async def get_all_signals(db: AsyncSession = Depends(get_db)):
    """
    获取所有 INFO 数据库中的结构化情报信息，带来源信息。
    """
    # 27 个核心面板 ID 集合
    PANELS = [
        "p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9",
        "p13", "p14", "p15", "p16", "p17", "p18", "p21", "p22",
        "p23", "p24", "p25", "p26", "p27", "p28", "p29", "p30",
        "p31", "p32"
    ]
    
    output = []
    seen_ids = set()

    for pid in PANELS:
        stmt = (
            select(IntelligenceInfo, RawIntelligence.source_name, RawIntelligence.source_url, RawIntelligence.raw_content)
            .join(RawIntelligence, IntelligenceInfo.raw_id == RawIntelligence.id)
            .where(IntelligenceInfo.target_panel_ids.contains([pid]))
            .order_by(IntelligenceInfo.created_at.desc())
            .limit(15)  # 每个面板独立取最新 15 条
        )
        result = await db.execute(stmt)
        rows = result.all()
        
        for info, source_name, source_url, raw_content in rows:
            if info.id not in seen_ids:
                seen_ids.add(info.id)
                output.append({
                    "id": str(info.id),
                    "title": info.title_brief,
                    "source_name": source_name, 
                    "source_url": source_url,
                    "content": raw_content,
                    "summary": [], # Info 表暂不存冗余 summary
                    "geolocation": info.geolocation, 
                    "impact_score": info.impact_score,
                    "sentiment": info.sentiment,
                    "target_panel_ids": info.target_panel_ids,
                    "metrics": info.metrics,
                    "created_at": info.created_at.isoformat() if info.created_at else None
                })
                
    # 按照时间整体重新倒序，确保前台看到的是最新的
    output.sort(key=lambda x: x["created_at"] or "", reverse=True)
    return output
