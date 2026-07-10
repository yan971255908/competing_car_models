# AutoPrism - SQLAlchemy Models
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import (
    String, Boolean, Integer, Float, Text, DateTime, ForeignKey, JSON, Index, Enum
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
import enum


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class SignalType(str, enum.Enum):
    PRICE_WAR = "PRICE_WAR"
    SUPPLY_CHAIN = "SUPPLY_CHAIN"
    POLICY = "POLICY"
    PRODUCT_LAUNCH = "PRODUCT_LAUNCH"
    NEGATIVE_PR = "NEGATIVE_PR"
    OTHER = "OTHER"


class IntelligenceStatus(str, enum.Enum):
    PENDING_AI = "PENDING_AI"
    PROCESSED = "PROCESSED"
    IGNORED_NOISE = "IGNORED_NOISE"




class SourceDocumentType(str, enum.Enum):
    EXCEL = "excel"
    PRESS_RELEASE = "press_release"
    OFFICIAL_SITE = "official_site"
    WEBPAGE = "webpage"
    TRANSCRIPT = "transcript"
    MANUAL = "manual"


class TechnologyCategory(str, enum.Enum):
    POWER = "power"
    CHASSIS = "chassis"
    ADAS = "adas"
    COCKPIT = "cockpit"
    BATTERY = "battery"
    EE_ARCHITECTURE = "ee_architecture"
    BODY = "body"
    OTHER = "other"


class TechnologyMaturityLevel(str, enum.Enum):
    CONCEPT = "concept"
    ANNOUNCED = "announced"
    MASS_PRODUCTION = "mass_production"


class CandidateStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class CandidateOrigin(str, enum.Enum):
    MANUAL = "manual"
    AI = "ai"


class SourceDocument(Base):
    """竞品库来源文档: 发布会、Excel、网页、转写文本等原始资料。"""
    __tablename__ = "source_documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    source_type: Mapped[SourceDocumentType] = mapped_column(Enum(SourceDocumentType), nullable=False, index=True)
    source_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    raw_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    file_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    evidence_items: Mapped[List["Evidence"]] = relationship(back_populates="source_document")
    extraction_candidates: Mapped[List["ExtractionCandidate"]] = relationship(back_populates="source_document")

    __table_args__ = (
        Index("idx_source_document_created", "created_at"),
    )

class RawIntelligence(Base):
    """脏数据接收池: 存放抓取回来的全网未结构化数据"""
    __tablename__ = "raw_intelligence"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_url: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    source_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # e.g., 'Reuters', 'Weibo'
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    raw_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    status: Mapped[IntelligenceStatus] = mapped_column(Enum(IntelligenceStatus), default=IntelligenceStatus.PENDING_AI, index=True)
    target_panel_ids: Mapped[List[str]] = mapped_column(JSONB, default=list) # Tagging which panel this raw data belongs to
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    
    # Relations
    info_records: Mapped[List["IntelligenceInfo"]] = relationship(back_populates="raw_intelligence", cascade="all, delete-orphan")
    structured_signals: Mapped[List["StructuredSignal"]] = relationship(back_populates="raw_intelligence", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_raw_status", "status"),
        Index("idx_raw_published", "published_at"),
        Index("idx_raw_source", "source_name"),
    )


class IntelligenceInfo(Base):
    """
    INFO 数据库: 27 个面板展示信息的专属存储空间。
    AI 按照 UI 数据格式要求提取出的结构化数据存放在这里。
    """
    __tablename__ = "intelligence_info"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    raw_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("raw_intelligence.id", ondelete="CASCADE"), nullable=False)
    
    # UI 展示的核心元数据
    title_brief: Mapped[str] = mapped_column(String(255), nullable=False)
    target_panel_ids: Mapped[List[str]] = mapped_column(JSONB, default=list) # 路由到哪些面板
    
    # 核心指标与解读内容
    impact_score: Mapped[int] = mapped_column(Integer, default=50)
    sentiment: Mapped[float] = mapped_column(Float, default=0.0)
    
    # 动态指标 (根据 27 个面板的需求提取的键值对)
    # 例如: {"brand": "Tesla", "model": "Model 3", "price_change": "-5%"}
    metrics: Mapped[dict] = mapped_column(JSONB, default=dict)
    
    # 地理空间与实体信息
    geolocation: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    involved_entities: Mapped[List[str]] = mapped_column(JSONB, default=list)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    # Relations
    raw_intelligence: Mapped["RawIntelligence"] = relationship(back_populates="info_records")

    __table_args__ = (
        Index("idx_info_panels", "target_panel_ids", postgresql_using="gin"),
        Index("idx_info_created", "created_at"),
    )


class StructuredSignal(Base):
    """[DEPRECATED] 请优先使用 IntelligenceInfo"""
    __tablename__ = "structured_signals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    raw_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("raw_intelligence.id", ondelete="CASCADE"), nullable=False)
    
    title_brief: Mapped[str] = mapped_column(String(255), nullable=False)  # AI condensed title
    summary: Mapped[List[str]] = mapped_column(JSONB, default=list)        # Array of bullet points
    signal_type: Mapped[SignalType] = mapped_column(Enum(SignalType), default=SignalType.OTHER)
    
    impact_score: Mapped[int] = mapped_column(Integer, default=0)          # 0-100 severity/importance
    sentiment: Mapped[float] = mapped_column(Float, default=0.0)           # -1.0 to 1.0
    
    # Spatial data for map engines
    geolocation: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True) # {"lat": 12.3, "lng": 45.6, "name": "Berlin"}
    
    involved_entities: Mapped[List[str]] = mapped_column(JSONB, default=list) # Array of company/product names
    
    # Visualization mappings
    target_panel_ids: Mapped[List[str]] = mapped_column(JSONB, default=list) # Panel IDs this signal belongs to
    metrics: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)    # Extracted numbers for charts
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    # Relations
    raw_intelligence: Mapped["RawIntelligence"] = relationship(back_populates="structured_signals")

    __table_args__ = (
        Index("idx_signal_type", "signal_type"),
        Index("idx_signal_score", "impact_score"),
        Index("idx_signal_created", "created_at"),
        Index("idx_signal_geolocation", "geolocation", postgresql_using="gin"),
        Index("idx_signal_entities", "involved_entities", postgresql_using="gin"),
    )


class VehicleModel(Base):
    """静态结构化资产: 车型动态对标库"""
    __tablename__ = "vehicle_models"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    brand_name: Mapped[str] = mapped_column(String(100), nullable=False)
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    energy_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    market_segment: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    launch_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    base_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # Flexible specs schema to handle rapid industry evolution
    specs: Mapped[dict] = mapped_column(JSONB, default=dict)
    
    last_updated: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    variants: Mapped[List["VehicleVariant"]] = relationship(back_populates="vehicle", cascade="all, delete-orphan")
    evidence_items: Mapped[List["Evidence"]] = relationship(back_populates="vehicle")

    __table_args__ = (
        Index("idx_vehicle_brand", "brand_name"),
        Index("idx_vehicle_specs", "specs", postgresql_using="gin"),
    )




class VehicleVariant(Base):
    """竞品库车型版本/配置款。"""
    __tablename__ = "vehicle_variants"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vehicle_models.id", ondelete="CASCADE"), nullable=False)
    variant_name: Mapped[str] = mapped_column(String(200), nullable=False)
    price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    config: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    vehicle: Mapped["VehicleModel"] = relationship(back_populates="variants")

    __table_args__ = (
        Index("idx_vehicle_variant_vehicle", "vehicle_id"),
    )


class TechnologyPoint(Base):
    """竞品库技术点。"""
    __tablename__ = "technology_points"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    category: Mapped[TechnologyCategory] = mapped_column(Enum(TechnologyCategory), default=TechnologyCategory.OTHER, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    maturity_level: Mapped[TechnologyMaturityLevel] = mapped_column(
        Enum(TechnologyMaturityLevel),
        default=TechnologyMaturityLevel.CONCEPT,
        index=True,
    )
    tags: Mapped[List[str]] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    evidence_items: Mapped[List["Evidence"]] = relationship(back_populates="technology")

    __table_args__ = (
        Index("idx_technology_tags", "tags", postgresql_using="gin"),
    )


class Evidence(Base):
    """竞品库证据链: 绑定来源文档、车型和技术点。"""
    __tablename__ = "evidence"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("source_documents.id", ondelete="CASCADE"),
        nullable=False,
    )
    vehicle_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("vehicle_models.id", ondelete="SET NULL"),
        nullable=True,
    )
    technology_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("technology_points.id", ondelete="SET NULL"),
        nullable=True,
    )
    evidence_text: Mapped[str] = mapped_column(Text, nullable=False)
    page_or_time: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.8)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    source_document: Mapped["SourceDocument"] = relationship(back_populates="evidence_items")
    vehicle: Mapped[Optional["VehicleModel"]] = relationship(back_populates="evidence_items")
    technology: Mapped[Optional["TechnologyPoint"]] = relationship(back_populates="evidence_items")

    __table_args__ = (
        Index("idx_evidence_source", "source_document_id"),
        Index("idx_evidence_vehicle", "vehicle_id"),
        Index("idx_evidence_technology", "technology_id"),
    )


class ExtractionCandidate(Base):
    """竞品库候选审核记录: 从来源文档中识别出的待确认车型-技术-证据三元组。"""
    __tablename__ = "extraction_candidates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("source_documents.id", ondelete="CASCADE"),
        nullable=False,
    )
    origin: Mapped[CandidateOrigin] = mapped_column(Enum(CandidateOrigin), default=CandidateOrigin.MANUAL, index=True)
    status: Mapped[CandidateStatus] = mapped_column(Enum(CandidateStatus), default=CandidateStatus.PENDING, index=True)

    proposed_brand_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    proposed_model_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    matched_vehicle_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("vehicle_models.id", ondelete="SET NULL"),
        nullable=True,
    )

    proposed_technology_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    technology_category: Mapped[TechnologyCategory] = mapped_column(Enum(TechnologyCategory), default=TechnologyCategory.OTHER)
    technology_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    maturity_level: Mapped[TechnologyMaturityLevel] = mapped_column(
        Enum(TechnologyMaturityLevel),
        default=TechnologyMaturityLevel.CONCEPT,
    )
    matched_technology_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("technology_points.id", ondelete="SET NULL"),
        nullable=True,
    )

    evidence_text: Mapped[str] = mapped_column(Text, nullable=False)
    page_or_time: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.8)
    raw_payload: Mapped[dict] = mapped_column(JSONB, default=dict)
    review_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    approved_evidence_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("evidence.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    source_document: Mapped["SourceDocument"] = relationship(back_populates="extraction_candidates")
    matched_vehicle: Mapped[Optional["VehicleModel"]] = relationship(foreign_keys=[matched_vehicle_id])
    matched_technology: Mapped[Optional["TechnologyPoint"]] = relationship(foreign_keys=[matched_technology_id])
    approved_evidence: Mapped[Optional["Evidence"]] = relationship(foreign_keys=[approved_evidence_id])

    __table_args__ = (
        Index("idx_candidate_source", "source_document_id"),
        Index("idx_candidate_status", "status"),
        Index("idx_candidate_origin", "origin"),
        Index("idx_candidate_created", "created_at"),
    )

class MarketTimeSeries(Base):
    """宏观脉搏: 大宗商品、销量等时序数据"""
    __tablename__ = "market_time_series"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    indicator_name: Mapped[str] = mapped_column(String(100), nullable=False) # e.g. 'lithium_carbonate', 'cpca_weekly_sales'
    timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)   # e.g. 'CNY/Ton'
    
    __table_args__ = (
        Index("idx_market_indicator_time", "indicator_name", "timestamp", unique=True),
    )


class StrategicInsight(Base):
    """
    L3 战略洞察合成库 (AI Denoise 产物)
    基于不同角色进行跨面板融合分析的结果，用于地图展示
    """
    __tablename__ = "strategic_insights"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role: Mapped[str] = mapped_column(String(50), index=True) # 所属角色 (Macro, SupplyChain 等)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    summary: Mapped[str] = mapped_column(Text)
    
    # 核心分析包: 现状、影响、时效、规模
    analysis: Mapped[dict] = mapped_column(JSONB, default=dict)
    strategic_advice: Mapped[str] = mapped_column(Text)
    
    # 地图视觉逻辑
    display_type: Mapped[str] = mapped_column(String(50)) # 'HOTSPOT', 'FLOW', 'ZONE', 'RIPPLE', 'COMPARISON', 'SHIELD_UP', 'MARKER'
    geo_coordinates: Mapped[dict] = mapped_column(JSONB, default=dict) # 坐标、目的地、标签等
    
    priority: Mapped[int] = mapped_column(Integer, default=2) # 0-4
    sentiment: Mapped[float] = mapped_column(Float, default=0.0)
    affected_panels: Mapped[List[str]] = mapped_column(JSONB, default=list) # 关联的面板 ID 列表
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    __table_args__ = (
        Index("idx_insight_role", "role"),
        Index("idx_insight_created", "created_at"),
    )


