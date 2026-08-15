-- Migration Script: Production AI Workflow Telemetry & Costs
-- Appends telemetry, cost tracking, caching status, raw responses, and idempotency to workflow_logs.

ALTER TABLE public.workflow_logs
    ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER,
    ADD COLUMN IF NOT EXISTS completion_tokens INTEGER,
    ADD COLUMN IF NOT EXISTS total_tokens INTEGER,
    ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC(10, 6) DEFAULT 0.000000,
    ADD COLUMN IF NOT EXISTS raw_ai_response JSONB DEFAULT '{}'::JSONB,
    ADD COLUMN IF NOT EXISTS prompt_hash VARCHAR(64),
    ADD COLUMN IF NOT EXISTS cache_status VARCHAR(20) DEFAULT 'miss' CHECK (cache_status IN ('hit', 'miss', 'bypass')),
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100) UNIQUE;

-- Performance indexes for new telemetry fields
CREATE INDEX IF NOT EXISTS idx_workflow_logs_idempotency ON public.workflow_logs (idempotency_key);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_cache ON public.workflow_logs (cache_status);
