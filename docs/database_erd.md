# CreatorLens Database ERD

This document contains the Entity Relationship Diagram (ERD) and description of the relational database schema deployed in Supabase.

## Entity Relationship Diagram

```mermaid
erDiagram
    users {
        uuid id PK
        text email UK
        varchar role
        timestamptz created_at
    }

    creators {
        uuid id PK, FK
        varchar creator_code UK
        text full_name
        text avatar_url
        text bio
        text_array categories
        text_array languages
        text_array regions
        integer followers_count
        integer average_views
        numeric engagement_rate
        integer pricing_min
        integer pricing_premium
        varchar ai_status
    }

    brands {
        uuid id PK, FK
        varchar brand_code UK
        text company_name
        text website
        text industry
        text bio
    }

    creator_ai_analysis {
        uuid id PK
        uuid creator_id FK, UK
        text profile_summary
        integer profile_completeness
        text_array strengths
        text_array weaknesses
        text_array missing_information
        varchar ai_version
        varchar workflow_version
        numeric confidence_score
        timestamptz analyzed_at
        timestamptz updated_at
    }

    creator_scores {
        uuid creator_id PK, FK
        integer intelligence_score
        integer audience_trust
        integer engagement_rate_score
        integer regional_influence
        integer content_consistency
        integer brand_readiness
        text ai_explanation
        timestamptz updated_at
    }

    creator_ai_suggestions {
        uuid id PK
        uuid creator_id FK
        text suggestion_text
        varchar impact_level
        integer expected_improvement
        timestamptz created_at
    }

    campaigns {
        uuid id PK
        uuid brand_id FK
        text title
        text objective
        varchar category
        text target_audience
        text region
        text language
        integer budget
        varchar creator_type
        varchar status
        text_array ai_keywords
        text ai_tier
        varchar ai_status
        timestamptz created_at
    }

    campaign_matches {
        uuid id PK
        uuid campaign_id FK
        uuid creator_id FK
        integer match_score
        integer min_price
        integer recommended_price
        integer premium_price
        text pricing_justification
        text match_explanation
        varchar status
        timestamptz created_at
    }

    collaborations {
        uuid id PK
        uuid campaign_id FK
        uuid creator_id FK
        uuid brand_id FK
        integer suggested_price
        text price_justification
        varchar status
        timestamptz created_at
    }

    notifications {
        uuid id PK
        uuid user_id FK
        text title
        text message
        varchar type
        boolean read
        timestamptz created_at
    }

    ai_jobs {
        uuid id PK
        varchar job_type
        varchar workflow_name
        varchar workflow_version
        uuid creator_id FK
        uuid campaign_id FK
        varchar status
        integer retry_count
        integer priority
        uuid trace_id
        timestamptz queued_at
        timestamptz started_at
        timestamptz completed_at
    }

    workflow_logs {
        uuid id PK
        varchar workflow_name
        uuid trace_id
        uuid creator_id FK
        uuid campaign_id FK
        varchar status
        timestamptz started_at
        timestamptz completed_at
        integer execution_time
        text error_message
        uuid execution_id
        varchar workflow_version
        varchar prompt_version
        varchar ai_model
        integer execution_time_ms
        jsonb input_payload
        jsonb output_payload
    }

    users ||--o| creators : "has profile (1:0..1)"
    users ||--o| brands : "has profile (1:0..1)"
    users ||--o{ notifications : "receives (1:N)"
    
    creators ||--o| creator_ai_analysis : "analyzed as (1:0..1)"
    creators ||--o| creator_scores : "has score details (1:0..1)"
    creators ||--o{ creator_ai_suggestions : "gets (1:N)"
    creators ||--o{ campaign_matches : "matches (1:N)"
    creators ||--o{ collaborations : "participates (1:N)"
    creators ||--o{ workflow_logs : "audited via (1:N)"
    creators ||--o{ ai_jobs : "scheduled under (1:N)"

    brands ||--o{ campaigns : "sponsors (1:N)"
    users ||--o{ collaborations : "oversees (1:N)"

    campaigns ||--o{ campaign_matches : "recommends (1:N)"
    campaigns ||--o{ collaborations : "spawns (1:N)"
    campaigns ||--o{ workflow_logs : "audited via (1:N)"
    campaigns ||--o{ ai_jobs : "scheduled under (1:N)"
```

## Key Relationships Breakdown

1. **User Identity Profile mapping:**
   - A single row in `users` maps 1-to-1 with either `creators` or `brands` based on the user's portal role. Their foreign key `id` references `users(id)`.
2. **Creator AI Intelligence separation:**
   - `creators` connects 1-to-1 with `creator_ai_analysis` (storing AI-parsed profiles) and `creator_scores` (calculated intelligence indicators) using `creator_id`.
   - `creator_ai_suggestions` holds 1-to-N growth recommendations for each creator.
3. **Orchestration Layer (`ai_jobs`):**
   - Schedules and tracks asynchronous executing runs of workflows like `'Creator Analysis'` or `'Match Engine'`. Bridges state tracking to help scale processing and retry items.
4. **Workflow Logging Telemetry:**
   - Tracks audit configurations (`prompt_version`, `workflow_version`, `ai_model`), processing timings (`execution_time_ms`), and sanitised input/output payloads mapping back to logs.
5. **Brand Campaigns & Sourcing:**
   - A brand (`users` profile) creates multiple campaigns (`campaigns`).
   - Sourcing calculations output matches into `campaign_matches` mapping `campaign_id` ➔ `creator_id` with recommendations and custom valuation pricing tiers.
