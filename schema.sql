-- Supabase Database Schema for CreatorLens MVP

-- Enable extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist to allow clean recreations
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.collaborations CASCADE;
DROP TABLE IF EXISTS public.pricing_recommendations CASCADE;
DROP TABLE IF EXISTS public.campaign_matches CASCADE;
DROP TABLE IF EXISTS public.campaigns CASCADE;
DROP TABLE IF EXISTS public.creator_ai_suggestions CASCADE;
DROP TABLE IF EXISTS public.creator_scores CASCADE;
DROP TABLE IF EXISTS public.creator_ai_analysis CASCADE;
DROP TABLE IF EXISTS public.workflow_logs CASCADE;
DROP TABLE IF EXISTS public.ai_jobs CASCADE;
DROP TABLE IF EXISTS public.creators CASCADE;
DROP TABLE IF EXISTS public.brands CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 1. Users Table (Role-based identity mapper)
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    role VARCHAR(20) CHECK (role IN ('creator', 'brand', 'admin')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Sequence generators for user-friendly serial codes
CREATE SEQUENCE IF NOT EXISTS creator_code_seq START WITH 5;
CREATE SEQUENCE IF NOT EXISTS brand_code_seq START WITH 2;

-- 2. Creators Profile Table
CREATE TABLE public.creators (
    id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    creator_code VARCHAR(20) UNIQUE DEFAULT 'CR_' || LPAD(nextval('creator_code_seq')::TEXT, 3, '0'),
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    categories TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    languages TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    regions TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    followers_count INTEGER DEFAULT 0,
    average_views INTEGER DEFAULT 0,
    engagement_rate NUMERIC(5,2) DEFAULT 0.00,
    pricing_min INTEGER DEFAULT 0,
    pricing_premium INTEGER DEFAULT 0,
    ai_status VARCHAR(20) DEFAULT 'Pending' CHECK (ai_status IN ('Pending', 'Processing', 'Completed', 'Failed')) NOT NULL
);

-- 3. Brands Profile Table
CREATE TABLE public.brands (
    id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    brand_code VARCHAR(20) UNIQUE DEFAULT 'BR_' || LPAD(nextval('brand_code_seq')::TEXT, 3, '0'),
    company_name TEXT NOT NULL,
    website TEXT,
    industry TEXT,
    bio TEXT
);

-- 4. Creator Intelligence Scores Table
CREATE TABLE public.creator_scores (
    creator_id UUID PRIMARY KEY REFERENCES public.creators(id) ON DELETE CASCADE,
    intelligence_score INTEGER NOT NULL,
    audience_trust INTEGER NOT NULL,
    engagement_rate_score INTEGER NOT NULL,
    regional_influence INTEGER NOT NULL,
    content_consistency INTEGER NOT NULL,
    brand_readiness INTEGER NOT NULL,
    ai_explanation TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Creator AI Improvement Suggestions Table
CREATE TABLE public.creator_ai_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE NOT NULL,
    suggestion_text TEXT NOT NULL,
    impact_level VARCHAR(20) CHECK (impact_level IN ('high', 'medium', 'low')) NOT NULL,
    expected_improvement INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Brand Campaigns Table
CREATE TABLE public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    objective TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    target_audience TEXT,
    region TEXT NOT NULL,
    language TEXT NOT NULL,
    budget INTEGER NOT NULL,
    creator_type VARCHAR(20) CHECK (creator_type IN ('micro', 'mid')) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    ai_keywords TEXT[] DEFAULT '{}'::TEXT[],
    ai_tier TEXT,
    ai_status VARCHAR(20) DEFAULT 'Pending' CHECK (ai_status IN ('Pending', 'Processing', 'Completed', 'Failed')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Campaign Creator Matches Table
CREATE TABLE public.campaign_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
    creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE NOT NULL,
    match_score INTEGER NOT NULL,
    min_price INTEGER DEFAULT 0,
    recommended_price INTEGER NOT NULL,
    premium_price INTEGER DEFAULT 0,
    pricing_justification TEXT,
    match_explanation TEXT,
    status VARCHAR(20) DEFAULT 'recommended' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_campaign_creator UNIQUE (campaign_id, creator_id)
);

-- 8. Collaboration Requests Table
CREATE TABLE public.collaborations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
    creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE NOT NULL,
    brand_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    suggested_price INTEGER NOT NULL,
    price_justification TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Notifications Table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) CHECK (type IN ('info', 'success', 'warning', 'payment')),
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Creator AI Analysis Table
CREATE TABLE public.creator_ai_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE UNIQUE NOT NULL,
    profile_summary TEXT,
    profile_completeness INTEGER DEFAULT 0,
    strengths TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    weaknesses TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    missing_information TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    ai_version VARCHAR(50) DEFAULT 'Gemini-1.5-pro',
    workflow_version VARCHAR(50) DEFAULT 'WF-v1.0',
    confidence_score NUMERIC(5,2) DEFAULT 1.00,
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Workflow Execution Logs Table
CREATE TABLE public.workflow_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_name VARCHAR(100) NOT NULL,
    trace_id UUID NOT NULL,
    creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    status VARCHAR(20) CHECK (status IN ('Pending', 'Processing', 'Completed', 'Failed')) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    execution_time INTEGER, -- legacy in ms
    error_message TEXT,
    execution_id UUID,
    workflow_version VARCHAR(50) DEFAULT 'v1.0',
    prompt_version VARCHAR(50) DEFAULT 'v1.0',
    ai_model VARCHAR(100) DEFAULT 'Gemini-1.5-pro',
    execution_time_ms INTEGER,
    input_payload JSONB DEFAULT '{}'::JSONB,
    output_payload JSONB DEFAULT '{}'::JSONB
);

-- 12. AI Jobs Table (Orchestration Layer)
CREATE TABLE public.ai_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type VARCHAR(50) NOT NULL, -- e.g., 'Creator Analysis', 'Campaign Analysis', 'Match Engine', 'Pricing'
    workflow_name VARCHAR(100) NOT NULL,
    workflow_version VARCHAR(50) DEFAULT 'v1.0',
    creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'Queued' CHECK (status IN ('Queued', 'Processing', 'Completed', 'Failed')) NOT NULL,
    retry_count INTEGER DEFAULT 0 NOT NULL,
    priority INTEGER DEFAULT 0 NOT NULL,
    trace_id UUID NOT NULL,
    queued_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 13. Pricing Recommendations Table
CREATE TABLE public.pricing_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE,
    min_price INTEGER NOT NULL,
    recommended_price INTEGER NOT NULL,
    premium_price INTEGER NOT NULL,
    pricing_justification TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Performance Indexes
CREATE INDEX idx_creators_categories ON public.creators USING gin (categories);
CREATE INDEX idx_creators_regions ON public.creators USING gin (regions);
CREATE INDEX idx_creators_languages ON public.creators USING gin (languages);
CREATE INDEX idx_campaigns_brand ON public.campaigns (brand_id);
CREATE INDEX idx_campaign_matches_camp ON public.campaign_matches (campaign_id);
CREATE INDEX idx_collaborations_creator ON public.collaborations (creator_id);
CREATE INDEX idx_notifications_user ON public.notifications (user_id, read);
CREATE INDEX idx_pricing_rec_campaign ON public.pricing_recommendations (campaign_id);

-- Enable Row Level Security (RLS) on tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_ai_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_recommendations ENABLE ROW LEVEL SECURITY;

-- Setup RLS Policies (Allow server role bypass, and simple select access for users)
CREATE POLICY "Allow all public reads for demo" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow all public reads for creators" ON public.creators FOR SELECT USING (true);
CREATE POLICY "Allow all public reads for brands" ON public.brands FOR SELECT USING (true);
CREATE POLICY "Allow all public reads for creator_scores" ON public.creator_scores FOR SELECT USING (true);
CREATE POLICY "Allow all public reads for creator_ai_suggestions" ON public.creator_ai_suggestions FOR SELECT USING (true);
CREATE POLICY "Allow all public reads for campaigns" ON public.campaigns FOR SELECT USING (true);
CREATE POLICY "Allow all public reads for campaign_matches" ON public.campaign_matches FOR SELECT USING (true);
CREATE POLICY "Allow all public reads for collaborations" ON public.collaborations FOR SELECT USING (true);
CREATE POLICY "Allow all public reads for notifications" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Allow all public reads for creator_ai_analysis" ON public.creator_ai_analysis FOR SELECT USING (true);
CREATE POLICY "Allow all public reads for workflow_logs" ON public.workflow_logs FOR SELECT USING (true);
CREATE POLICY "Allow all public reads for ai_jobs" ON public.ai_jobs FOR SELECT USING (true);
CREATE POLICY "Allow all public reads for pricing_recs" ON public.pricing_recommendations FOR SELECT USING (true);

-- Allow all writes since the backend server uses service-role API credentials with bypass RLS enabled.
