# CreatorLens - Integration Contract & Architecture Specs

This document defines the relational database architecture, mapping flows, and environment configurations for the CreatorLens platform.

---

## 1. Database ER Diagram

The following Mermaid entity relationship diagram represents the final production database schema deployed in Supabase, incorporating orchestration and auditing tables.

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

---

## 2. Screen ➔ API ➔ Database ➔ n8n Mapping

| Screen / Feature | API Endpoint | Database Table(s) | n8n Workflow Trigger |
| :--- | :--- | :--- | :--- |
| **Creator Registration** | `POST /api/auth/register` | `users` | N/A (Onboarding check) |
| **Creator Profile Onboarding** | `POST /api/creators/profile` | `creators` | N/A |
| **Creator AI Enrichment** | `POST /api/creators/enrich` | `ai_jobs` + `workflow_logs` | `creator_profile_enrichment` (WF-01, WF-02, WF-03) |
| **Creator Dashboard** | `GET /api/creators/profile/:id` | `creators` + `creator_ai_analysis` + `creator_scores` | N/A (Fetches merged AI telemetry) |
| **Growth suggestions** | `GET /api/creators/dashboard/:id` | `creator_ai_suggestions` | N/A (Created by WF-03 during enrichment) |
| **Brand Registration** | `POST /api/auth/register` | `users` | N/A |
| **Campaign Brief Setup** | `POST /api/campaigns` | `campaigns` | N/A |
| **Sourcing Match Trigger** | `POST /api/campaigns/:id/match` | `ai_jobs` + `workflow_logs` | `campaign_matching` (WF-04, WF-05, WF-06) |
| **Campaign Matches Grid** | `GET /api/campaigns/:id/matches` | `campaign_matches` + `creators` | N/A (Calculated matches by WF-05/06) |
| **Negotiation Request** | `POST /api/collaborations` | `collaborations` | N/A (Updates status & records) |
| **Admin Analytics Panel** | `GET /api/admin/logs` | `workflow_logs` + `ai_jobs` | N/A (Monitoring dashboard) |

---

## 3. Environment Configuration Spec

| Variable Key | Scope | Short Description / Purpose |
| :--- | :---: | :--- |
| **`PORT`** | Backend | Express server port listener (Defaults to `5000` in dev). |
| **`SUPABASE_URL`** | Both | The API endpoint URL of your Supabase project. |
| **`SUPABASE_SERVICE_ROLE_KEY`** | Backend | Secret key used to bypass RLS policies for administrative operations. |
| **`N8N_WEBHOOK_PROFILE`** | Backend | Webhook target URL for triggering profile enrichment. |
| **`N8N_WEBHOOK_CAMPAIGN`** | Backend | Webhook target URL for triggering campaign match sourcing. |
| **`JWT_SECRET`** | Backend | Salt value used to sign user authentication cookies and headers. |
| **`GEMINI_API_KEY`** | n8n | Google Gemini API key configured inside n8n credential manager. |
| **`STORAGE_BUCKET`** | Supabase | Storage bucket identifier used for hosting profile media files. |
| **`FRONTEND_URL`** | Backend | CORS origin configuration allowed to interact with the backend API. |
| **`BACKEND_URL`** | Frontend | Server REST gateway endpoint. |

---

## 4. Integration Flow Diagram

```
[FRONTEND DASHBOARD] (Initiates Action)
        │
        ▼ (POST /api/creators/enrich)
[EXPRESS BACKEND] (Orchestrator)
        │
        ├─────────► Writes job ('Queued/Processing') to [ai_jobs]
        ├─────────► Writes start trace to [workflow_logs]
        │
        ▼ (Webhook Trigger Payload with job_id)
[n8n WORKFLOW ENGINE]
        │
        ├─────────► Fetch Target Row from [Supabase Tables]
        ├─────────► Dispatch Context Prompt to [Google Gemini API]
        ├─────────► Parse & format Structured AI Insights
        │
        ▼ (Supabase Service Role Nodes)
[SUPABASE DATABASE]
        │
        ├─────────► Writes results to [creator_ai_analysis] / [creator_scores]
        ├─────────► Updates job status to 'Completed' in [ai_jobs]
        ├─────────► Updates logs with execution times in [workflow_logs]
        │
        ▼ (Polling Status Check: Completed!)
[FRONTEND DASHBOARD] (Refreshes & Renders Merged Data)
```
