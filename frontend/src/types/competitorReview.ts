export type CandidateStatus = 'pending' | 'approved' | 'rejected';
export type CandidateOrigin = 'manual' | 'ai';

export interface CandidateSummary {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

export interface ExtractionCandidate {
  id: string;
  source_document_id: string;
  origin: CandidateOrigin;
  status: CandidateStatus;
  proposed_brand_name?: string | null;
  proposed_model_name?: string | null;
  matched_vehicle_id?: string | null;
  proposed_technology_name?: string | null;
  technology_category: string;
  technology_description?: string | null;
  maturity_level: string;
  matched_technology_id?: string | null;
  evidence_text: string;
  page_or_time?: string | null;
  confidence: number;
  raw_payload?: Record<string, unknown>;
  review_note?: string | null;
  approved_evidence_id?: string | null;
  created_at?: string | null;
  reviewed_at?: string | null;
  source_document?: {
    id: string;
    title: string;
    source_type: string;
    source_url?: string | null;
    file_name?: string | null;
    raw_text?: string;
  } | null;
  matched_vehicle?: {
    id: string;
    brand_name: string;
    model_name: string;
  } | null;
  matched_technology?: {
    id: string;
    name: string;
    category: string;
  } | null;
  approved_evidence?: {
    id: string;
    evidence_text: string;
  } | null;
}

export interface CandidateListResponse {
  items: ExtractionCandidate[];
  total: number;
  page: number;
  page_size: number;
}

export interface CandidateApprovePayload {
  create_missing_vehicle: boolean;
  create_missing_technology: boolean;
  review_note?: string;
}

export interface CandidateUpdatePayload {
  proposed_brand_name?: string | null;
  proposed_model_name?: string | null;
  matched_vehicle_id?: string | null;
  proposed_technology_name?: string | null;
  technology_category: string;
  technology_description?: string | null;
  maturity_level: string;
  matched_technology_id?: string | null;
  evidence_text: string;
  page_or_time?: string | null;
  confidence: number;
  raw_payload?: Record<string, unknown>;
  review_note?: string | null;
}

export interface CandidateCreatePayload extends CandidateUpdatePayload {
  source_document_id: string;
  origin?: CandidateOrigin;
}
