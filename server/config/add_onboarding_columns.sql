-- 1. Add the new onboarding columns with default values
ALTER TABLE public.creators 
    ADD COLUMN IF NOT EXISTS profile_status VARCHAR(20) DEFAULT 'Incomplete' NOT NULL,
    ADD COLUMN IF NOT EXISTS city TEXT,
    ADD COLUMN IF NOT EXISTS state TEXT,
    ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::JSONB NOT NULL,
    ADD COLUMN IF NOT EXISTS audience_metadata JSONB DEFAULT '{}'::JSONB NOT NULL,
    ADD COLUMN IF NOT EXISTS collab_metadata JSONB DEFAULT '{}'::JSONB NOT NULL;

-- 2. Convert existing Pending -> Not Started, and Completed -> Ready
UPDATE public.creators SET ai_status = 'Not Started' WHERE ai_status = 'Pending';
UPDATE public.creators SET profile_status = 'Ready' WHERE ai_status = 'Completed';

-- 3. Drop the old creators_ai_status_check constraint
ALTER TABLE public.creators DROP CONSTRAINT IF EXISTS creators_ai_status_check;

-- 4. Add the new check constraint for ai_status (allowing Not Started, Processing, Completed, Failed)
ALTER TABLE public.creators ADD CONSTRAINT creators_ai_status_check CHECK (ai_status IN ('Not Started', 'Processing', 'Completed', 'Failed'));

-- 5. Add the check constraint for profile_status
ALTER TABLE public.creators DROP CONSTRAINT IF EXISTS creators_profile_status_check;
ALTER TABLE public.creators ADD CONSTRAINT creators_profile_status_check CHECK (profile_status IN ('Incomplete', 'Ready'));

-- 6. Set default for ai_status to 'Not Started'
ALTER TABLE public.creators ALTER COLUMN ai_status SET DEFAULT 'Not Started';
