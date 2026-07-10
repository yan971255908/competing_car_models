import hashlib
import unittest
from types import SimpleNamespace

from fastapi import HTTPException
from sqlalchemy import delete, event, func, select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.sql import (
    CandidateOrigin,
    CandidateStatus,
    Evidence,
    ExtractionCandidate,
    SourceDocument,
    SourceDocumentType,
    TechnologyCategory,
    TechnologyMaturityLevel,
    TechnologyPoint,
    VehicleModel,
)
from app.services.competitor_ai_service import extract_source_candidates
from app.services.candidate_review_service import approve_candidate


PREFIX = "V06_STABILITY_TEST_"


def ai_item(model_name: str, technology_name: str, evidence_text: str) -> dict:
    return {
        "proposed_brand_name": f"{PREFIX}Brand",
        "proposed_model_name": model_name,
        "proposed_technology_name": technology_name,
        "technology_category": "power",
        "technology_description": "test",
        "maturity_level": "announced",
        "evidence_text": evidence_text,
        "page_or_time": None,
        "confidence": 0.9,
    }


class CompetitorAIStabilityTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.original_api_key = settings.AI_API_KEY
        settings.AI_API_KEY = "mock-key"
        async with AsyncSessionLocal() as db:
            await self.cleanup(db)

    async def asyncTearDown(self):
        async with AsyncSessionLocal() as db:
            await self.cleanup(db)
        settings.AI_API_KEY = self.original_api_key

    async def cleanup(self, db):
        source_ids = select(SourceDocument.id).where(SourceDocument.title.like(f"{PREFIX}%"))
        await db.execute(
            delete(ExtractionCandidate).where(
                ExtractionCandidate.source_document_id.in_(source_ids)
            )
        )
        await db.execute(delete(Evidence).where(Evidence.source_document_id.in_(source_ids)))
        await db.execute(delete(VehicleModel).where(VehicleModel.brand_name.like(f"{PREFIX}%")))
        await db.execute(delete(TechnologyPoint).where(TechnologyPoint.name.like(f"{PREFIX}%")))
        await db.execute(delete(SourceDocument).where(SourceDocument.title.like(f"{PREFIX}%")))
        await db.commit()

    async def test_stability_regressions(self):
        await self.check_matched_only_candidate_is_eager_loaded_and_deduplicated()
        await self.check_ai_phase_has_no_transaction_or_flush_and_writes_once()
        await self.check_source_change_during_ai_returns_409_without_candidates()
        await self.check_unchanged_ai_source_can_be_approved()
        await self.check_ai_candidate_without_audit_hash_is_rejected()
        await self.check_changed_ai_source_is_rejected_without_formal_data()
        await self.check_ungrounded_ai_evidence_is_rejected()
        await self.check_manual_candidate_approval_is_unchanged()

    def approval_payload(self):
        return SimpleNamespace(
            create_missing_vehicle=True,
            create_missing_technology=True,
            review_note="approved in test",
        )

    def make_candidate(
        self,
        source_id,
        suffix: str,
        evidence_text: str,
        origin: CandidateOrigin,
        raw_payload: dict,
    ) -> ExtractionCandidate:
        return ExtractionCandidate(
            source_document_id=source_id,
            origin=origin,
            status=CandidateStatus.PENDING,
            proposed_brand_name=f"{PREFIX}Brand{suffix}",
            proposed_model_name=f"{PREFIX}Model{suffix}",
            proposed_technology_name=f"{PREFIX}Tech{suffix}",
            technology_category=TechnologyCategory.POWER,
            maturity_level=TechnologyMaturityLevel.ANNOUNCED,
            evidence_text=evidence_text,
            confidence=0.9,
            raw_payload=raw_payload,
        )

    async def check_matched_only_candidate_is_eager_loaded_and_deduplicated(self):
        evidence = "Matched Model includes Matched Tech."
        async with AsyncSessionLocal() as db:
            source = SourceDocument(
                title=f"{PREFIX}Matched",
                source_type=SourceDocumentType.MANUAL,
                raw_text=evidence,
            )
            vehicle = VehicleModel(
                brand_name=f"{PREFIX}Brand",
                model_name="Matched Model",
                specs={},
            )
            technology = TechnologyPoint(
                name=f"{PREFIX}Matched Tech",
                category=TechnologyCategory.POWER,
                maturity_level=TechnologyMaturityLevel.ANNOUNCED,
                tags=[],
            )
            db.add_all([source, vehicle, technology])
            await db.flush()
            db.add(
                ExtractionCandidate(
                    source_document_id=source.id,
                    origin=CandidateOrigin.MANUAL,
                    status=CandidateStatus.PENDING,
                    proposed_brand_name=None,
                    proposed_model_name=None,
                    matched_vehicle_id=vehicle.id,
                    proposed_technology_name=None,
                    technology_category=TechnologyCategory.POWER,
                    maturity_level=TechnologyMaturityLevel.ANNOUNCED,
                    matched_technology_id=technology.id,
                    evidence_text=evidence,
                    confidence=0.8,
                    raw_payload={},
                )
            )
            await db.commit()

            async def mock_ai(_messages):
                self.assertFalse(db.in_transaction())
                return {
                    "data": {
                        "candidates": [
                            ai_item("Matched Model", f"{PREFIX}Matched Tech", evidence)
                        ]
                    },
                    "response_id": "matched-only",
                    "usage": {},
                }

            result = await extract_source_candidates(db, source.id, ai_caller=mock_ai)
            self.assertEqual(result["skipped_duplicates"], 1)
            self.assertEqual(result["created_count"], 0)

    async def check_ai_phase_has_no_transaction_or_flush_and_writes_once(self):
        source_text = "Model A has Tech A. Model B has Tech B."
        async with AsyncSessionLocal() as db:
            source = SourceDocument(
                title=f"{PREFIX}Batch",
                source_type=SourceDocumentType.MANUAL,
                raw_text=source_text,
            )
            db.add(source)
            await db.commit()

            flushes = []
            commits = []

            def before_flush(*_args):
                flushes.append(True)

            def after_commit(*_args):
                commits.append(True)

            event.listen(db.sync_session, "before_flush", before_flush)
            event.listen(db.sync_session, "after_commit", after_commit)
            try:
                async def mock_ai(_messages):
                    self.assertFalse(db.in_transaction())
                    self.assertEqual(flushes, [])
                    self.assertIn("本次最多返回 2 条候选", _messages[1]["content"])
                    return {
                        "data": {
                            "candidates": [
                                ai_item("Model A", f"{PREFIX}Tech A", "Model A has Tech A."),
                                ai_item("Model B", f"{PREFIX}Tech B", "Model B has Tech B."),
                            ]
                        },
                        "response_id": "batch",
                        "usage": {},
                    }

                result = await extract_source_candidates(
                    db, source.id, max_candidates=2, ai_caller=mock_ai
                )
                self.assertEqual(result["created_count"], 2)
                self.assertEqual(len(flushes), 2)
                self.assertEqual(len(commits), 1)
            finally:
                event.remove(db.sync_session, "before_flush", before_flush)
                event.remove(db.sync_session, "after_commit", after_commit)

    async def check_source_change_during_ai_returns_409_without_candidates(self):
        async with AsyncSessionLocal() as db:
            source = SourceDocument(
                title=f"{PREFIX}Changed",
                source_type=SourceDocumentType.MANUAL,
                raw_text="Original source sentence.",
            )
            db.add(source)
            await db.commit()
            source_id = source.id

            async def mock_ai(_messages):
                self.assertFalse(db.in_transaction())
                async with AsyncSessionLocal() as other:
                    current = (
                        await other.execute(
                            select(SourceDocument).where(SourceDocument.id == source_id)
                        )
                    ).scalar_one()
                    current.raw_text = "Changed while AI was running."
                    await other.commit()
                return {
                    "data": {
                        "candidates": [
                            ai_item(
                                "Changed Model",
                                f"{PREFIX}Changed Tech",
                                "Original source sentence.",
                            )
                        ]
                    },
                    "response_id": "changed",
                    "usage": {},
                }

            with self.assertRaises(HTTPException) as raised:
                await extract_source_candidates(db, source_id, ai_caller=mock_ai)
            self.assertEqual(raised.exception.status_code, 409)
            count = (
                await db.execute(
                    select(func.count(ExtractionCandidate.id)).where(
                        ExtractionCandidate.source_document_id == source_id
                    )
                )
            ).scalar_one()
            self.assertEqual(count, 0)

    async def check_unchanged_ai_source_can_be_approved(self):
        source_text = "Audit Model\ncontains\tAudit Tech in this evidence."
        source_hash = hashlib.sha256(source_text.encode("utf-8")).hexdigest()
        async with AsyncSessionLocal() as db:
            source = SourceDocument(
                title=f"{PREFIX}ApproveValid",
                source_type=SourceDocumentType.MANUAL,
                raw_text=source_text,
            )
            db.add(source)
            await db.flush()
            candidate = self.make_candidate(
                source.id,
                "ApproveValid",
                "Audit Model contains Audit Tech in this evidence.",
                CandidateOrigin.AI,
                {
                    "generator": "competitor_ai_extraction",
                    "source_sha256": source_hash,
                },
            )
            db.add(candidate)
            await db.commit()

            result = await approve_candidate(db, candidate.id, self.approval_payload())
            self.assertEqual(result["status"], CandidateStatus.APPROVED.value)
            self.assertIsNotNone(result["approved_evidence_id"])
            evidence_count = (
                await db.execute(
                    select(func.count(Evidence.id)).where(
                        Evidence.source_document_id == source.id
                    )
                )
            ).scalar_one()
            self.assertEqual(evidence_count, 1)

    async def check_ai_candidate_without_audit_hash_is_rejected(self):
        source_text = "Evidence with missing audit hash."
        async with AsyncSessionLocal() as db:
            source = SourceDocument(
                title=f"{PREFIX}ApproveMissingHash",
                source_type=SourceDocumentType.MANUAL,
                raw_text=source_text,
            )
            db.add(source)
            await db.flush()
            candidate = self.make_candidate(
                source.id,
                "ApproveMissingHash",
                source_text,
                CandidateOrigin.AI,
                {"generator": "competitor_ai_extraction"},
            )
            db.add(candidate)
            await db.commit()
            candidate_id = candidate.id

            with self.assertRaises(HTTPException) as raised:
                await approve_candidate(db, candidate_id, self.approval_payload())
            self.assertEqual(raised.exception.status_code, 409)

    async def check_changed_ai_source_is_rejected_without_formal_data(self):
        original_text = "Original audited evidence."
        original_hash = hashlib.sha256(original_text.encode("utf-8")).hexdigest()
        async with AsyncSessionLocal() as db:
            source = SourceDocument(
                title=f"{PREFIX}ApproveChanged",
                source_type=SourceDocumentType.MANUAL,
                raw_text=original_text,
            )
            db.add(source)
            await db.flush()
            candidate = self.make_candidate(
                source.id,
                "ApproveChanged",
                original_text,
                CandidateOrigin.AI,
                {
                    "generator": "competitor_ai_extraction",
                    "source_sha256": original_hash,
                },
            )
            db.add(candidate)
            await db.commit()
            candidate_id = candidate.id
            source_id = source.id
            source.raw_text = "Source changed after candidate creation."
            await db.commit()

            with self.assertRaises(HTTPException) as raised:
                await approve_candidate(db, candidate_id, self.approval_payload())
            self.assertEqual(raised.exception.status_code, 409)
            current = (
                await db.execute(
                    select(ExtractionCandidate).where(
                        ExtractionCandidate.id == candidate_id
                    )
                )
            ).scalar_one()
            self.assertEqual(current.status, CandidateStatus.PENDING)
            evidence_count = (
                await db.execute(
                    select(func.count(Evidence.id)).where(
                        Evidence.source_document_id == source_id
                    )
                )
            ).scalar_one()
            vehicle_count = (
                await db.execute(
                    select(func.count(VehicleModel.id)).where(
                        VehicleModel.model_name == f"{PREFIX}ModelApproveChanged"
                    )
                )
            ).scalar_one()
            technology_count = (
                await db.execute(
                    select(func.count(TechnologyPoint.id)).where(
                        TechnologyPoint.name == f"{PREFIX}TechApproveChanged"
                    )
                )
            ).scalar_one()
            self.assertEqual((evidence_count, vehicle_count, technology_count), (0, 0, 0))

    async def check_ungrounded_ai_evidence_is_rejected(self):
        source_text = "Current source text without the candidate quote."
        source_hash = hashlib.sha256(source_text.encode("utf-8")).hexdigest()
        async with AsyncSessionLocal() as db:
            source = SourceDocument(
                title=f"{PREFIX}ApproveUngrounded",
                source_type=SourceDocumentType.MANUAL,
                raw_text=source_text,
            )
            db.add(source)
            await db.flush()
            candidate = self.make_candidate(
                source.id,
                "ApproveUngrounded",
                "Candidate evidence is absent.",
                CandidateOrigin.AI,
                {
                    "generator": "competitor_ai_extraction",
                    "source_sha256": source_hash,
                },
            )
            db.add(candidate)
            await db.commit()
            source_id = source.id
            candidate_id = candidate.id

            with self.assertRaises(HTTPException) as raised:
                await approve_candidate(db, candidate_id, self.approval_payload())
            self.assertEqual(raised.exception.status_code, 409)
            evidence_count = (
                await db.execute(
                    select(func.count(Evidence.id)).where(
                        Evidence.source_document_id == source_id
                    )
                )
            ).scalar_one()
            current = (
                await db.execute(
                    select(ExtractionCandidate).where(
                        ExtractionCandidate.id == candidate_id
                    )
                )
            ).scalar_one()
            vehicle_count = (
                await db.execute(
                    select(func.count(VehicleModel.id)).where(
                        VehicleModel.model_name == f"{PREFIX}ModelApproveUngrounded"
                    )
                )
            ).scalar_one()
            technology_count = (
                await db.execute(
                    select(func.count(TechnologyPoint.id)).where(
                        TechnologyPoint.name == f"{PREFIX}TechApproveUngrounded"
                    )
                )
            ).scalar_one()
            self.assertEqual(current.status, CandidateStatus.PENDING)
            self.assertEqual((evidence_count, vehicle_count, technology_count), (0, 0, 0))

    async def check_manual_candidate_approval_is_unchanged(self):
        source_text = "Manual evidence remains approvable."
        async with AsyncSessionLocal() as db:
            source = SourceDocument(
                title=f"{PREFIX}ApproveManual",
                source_type=SourceDocumentType.MANUAL,
                raw_text=source_text,
            )
            db.add(source)
            await db.flush()
            candidate = self.make_candidate(
                source.id,
                "ApproveManual",
                source_text,
                CandidateOrigin.MANUAL,
                {},
            )
            db.add(candidate)
            await db.commit()

            result = await approve_candidate(db, candidate.id, self.approval_payload())
            self.assertEqual(result["status"], CandidateStatus.APPROVED.value)


if __name__ == "__main__":
    unittest.main()
