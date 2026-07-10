export interface CompetitorAIStatus {
  configured: boolean;
  model: string;
  prompt_version: string;
}

export interface CompetitorAIExtractPayload {
  source_document_id: string;
  max_candidates?: number;
}

export interface CompetitorAIExtractResult {
  source_document_id: string;
  model: string;
  prompt_version: string;
  chunks_processed: number;
  extracted_count: number;
  created_count: number;
  skipped_duplicates: number;
  skipped_ungrounded: number;
  skipped_invalid: number;
  candidate_ids: string[];
  warnings: string[];
}
