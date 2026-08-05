# CreatorLens Database ERD & Schema v1.0 Specifications

This document contains the Entity Relationship Diagram (ERD), a brief data dictionary, and mapping specs for the **CreatorLens Schema v1.0**.

---

## 1. Entity Relationship Diagram (12 Tables)

```mermaid
erDiagram
    users {
        uuid id PK
        text email UK
        varchar role
        timestamptz created_at
        timestamptz updated_at
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
        timestamptz created_at
        timestamptz updated_at
    }

    brands {
        uuid id PK, FK
        brand_code UK
        text company_name
        text website
        text industry
        text bio
        timestamptz created_at
        timestamptz updated_at
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
        timestamptz created_at
        timestamptz updated_at
    }

    creator_ai_suggestions {
        uuid id PK
        uuid creator_id FK
        text suggestion_text
        varchar impact_level
        integer expected_improvement
        timestamptz created_at
        timestamptz updated_at
    }

    campaigns {
        uuid id PK
        uuid brand_id FK
        uuid created_by FK
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
        timestamptz updated_at
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
        timestamptz updated_at
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
        timestamptz updated_at
    }

    notifications {
        uuid id PK
        uuid user_id FK
        text title
        text message
        varchar type
        boolean read
        timestamptz created_at
        timestamptz updated_at
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
        timestamptz updated_at
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
        error_message TEXT
        uuid execution_id
        varchar workflow_version
        varchar prompt_version
        varchar ai_model
        integer execution_time_ms
        jsonb input_payload
        jsonb output_payload
        timestamptz created_at
        timestamptz updated_at
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

## 2. Brief Data Dictionary

### 1. `users`
* **Purpose:** Core table representing all user accounts. Maps identity credentials to roles (Creator, Brand, Admin) dynamically.

### 2. `creators`
* **Purpose:** Stores core profile variables entered manually by Content Creators (categories, languages, views count, followers count).

### 3. `brands`
* **Purpose:** Stores core properties for brand manager organizations (company name, industry, website).

### 4. `creator_scores`
* **Purpose:** Stores calculated numerical score components representing overall Audience Trust, Consistency, and Brand Readiness.

### 5. `creator_ai_suggestions`
* **Purpose:** Contains AI-generated actionable recommendations for creators (e.g. expected metrics enhancements).

### 6. `campaigns`
* **Purpose:** Holds sponsorship details and brief parameters entered by Brand Managers, alongside target keywords and tier parameters classified by n8n.

### 7. `campaign_matches`
* **Purpose:** Tracks matchmaker compatibility scores between campaign briefs and creator profiles, listing price recommendation boundaries and justifications.

### 8. `collaborations`
* **Purpose:** Represents active sponsorships, accepted agreements, negotiated rates, and fulfillment tracking statuses.

### 9. `notifications`
* **Purpose:** Real-time information, success, and payment notifications dispatched to users.

### 10. `creator_ai_analysis`
* **Purpose:** Stores detailed AI-parsed descriptions, profile summaries, strengths checks, and missing details checklist.

### 11. `workflow_logs`
* **Purpose:** Telemetry storage for auditing n8n execution timing metrics, model types, payloads, and error records.

### 12. `ai_jobs`
* **Purpose:** Orchestration layer handling queuing, prioritizing, retrying, and state monitoring for asynchronous AI processing jobs.

---

## 3. Table Relationship Specs

* **creators / brands ➔ users (1:1):** Sub-profiles join back using `id` referencing `users(id)` with cascading deletes.
* **creator_scores / creator_ai_analysis ➔ creators (1:1):** Relational AI outputs tied directly to creator records.
* **campaigns ➔ brands (N:1):** Campaigns reference campaigns' brand manager `brand_id`. Contains a `created_by` field to identify the specific team member creating the campaign brief.
* **campaign_matches ➔ campaigns & creators (N:M):** Many-to-Many resolver table mapping campaign-to-creator matches.
