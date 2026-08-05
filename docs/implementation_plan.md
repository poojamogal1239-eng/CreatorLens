# Implementation Plan - n8n Workflows Design and Export

This plan details the design, logic, and structure for the two core n8n workflows powering **CreatorLens**'s vernacular creator intelligence backend:
1. **Creator Profile Enrichment Workflow (WF-01 ➔ WF-02 ➔ WF-03)**
2. **Campaign Sourcing & Matching Workflow (WF-04 ➔ WF-05 ➔ WF-06)**

We will create ready-to-import JSON workflow files under a new `n8n/` directory in the repository root. This allows direct drag-and-drop import into your n8n workspace (self-hosted or Cloud).

---

## User Review Required

> [!IMPORTANT]
> **LLM Provider Setup:** The workflows are designed to use **Google Gemini** (via the Google Gemini node) or **OpenAI** (via the OpenAI node) for content extraction and text generation. You will need to configure your own API credentials inside n8n.
> 
> **Supabase Node Credentials:** n8n will interact with your Supabase DB directly to fetch/update records. You must configure the Supabase credentials in your n8n console (`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` matching your `.env`).

---

## Open Questions

> [!WARNING]
> 1. **Do you prefer Google Gemini (Recommended) or OpenAI (ChatGPT) nodes for the n8n AI components?** (The exported workflow files will default to using Gemini Chat Nodes but can be easily swapped).
> 2. **Would you like to setup automated Slack or Discord notifications** inside the n8n flows for live matching/enrichment updates as suggested in the dashboard subtitles?

---

## Proposed Changes

### Configuration & Workflows

***

#### [NEW] [creator_profile_enrichment.json](file:///c:/Users/Pooja/OneDrive/Desktop/CreatorLens/n8n/creator_profile_enrichment.json)
This JSON file defines the n8n workflow for Creator Profile Enrichment.
- **Trigger:** Webhook node (`POST /webhook-test/creator-profile-analysis` / `/webhook/creator-profile-analysis`) receiving `{ "creator_id": "UUID" }`.
- **Step 1 (Supabase - Fetch Creator):** Fetches the creator profile using the `creator_id` from the `creators` table.
- **Step 2 (AI Node - WF-01 Profile Analysis):** Passes bio, category, language, region details to an LLM. Generates:
  - `profile_summary`
  - `strengths` (array)
  - `weaknesses` (array)
  - `missing_info` (array)
  - `profile_completeness` (calculated completion percentage based on field presence).
- **Step 3 (Supabase - Update Creator):** Updates the `creators` table with the generated analysis and sets `is_enriched = true`.
- **Step 4 (Code Node & AI - WF-02 Score Engine):**
  - **JS Code:** Computes scores for `audience_trust`, `engagement_rate_score`, `regional_influence`, `content_consistency`, and `brand_readiness`. Calculates the final weighted `intelligence_score`.
  - **LLM Node:** Generates a personalized `ai_explanation` for the calculated scores.
- **Step 5 (Supabase - Upsert Scores):** Writes the score breakdown and AI explanation to the `creator_scores` table.
- **Step 6 (AI Node - WF-03 Suggestions):** Generates 2-3 tailored growth suggestions for the creator.
- **Step 7 (Supabase - Insert Suggestions):** Deletes previous suggestions for the creator and inserts new entries into the `creator_ai_suggestions` table.
- **Step 8 (Webhook Response):** Returns the final enriched data package.

***

#### [NEW] [campaign_matching.json](file:///c:/Users/Pooja/OneDrive/Desktop/CreatorLens/n8n/campaign_matching.json)
This JSON file defines the n8n workflow for Campaign Sourcing & Matching.
- **Trigger:** Webhook node (`POST /webhook-test/campaign-matching` / `/webhook/campaign-matching`) receiving `{ "campaign_id": "UUID" }`.
JSON template representing the n8n flow:
1. **Webhook Trigger:** Receives `campaign_id`, `workflow`, and `trace_id`.
2. **Fetch Campaign Brief:** Supabase Node queries `campaigns` table.
3. **Gemini Node (Brief Parsing):** Parses objectives into keywords and matches target tier.
4. **Supabase Node (Fetch Candidates):** Pulls creators profiles and scores.
5. **JavaScript Code Node:** Calculates matching percentages, recommendation tiers, and pricing justifications.
6. **Supabase Node (Update Campaign & Write Matches):** Saves parsed briefs, saves candidate matching rows, updates campaign `ai_status` to `'Completed'`, and marks `workflow_logs` as `'Completed'`.

---

## Verification Plan

### Automated Verification
- Verify backend API compilation and server startup.
- Validate Supabase database migrations on the live database.

### Manual Verification
- Verify switching to "Live Integration Mode" in settings.
- Run profile onboarding and campaign matching flows, checking that `workflow_logs` and `creator_ai_analysis` records are generated correctly.
- Verify status changes in the dashboard console logs.
- Steps to test using n8n's "Test Step" functionality with a sample `creator_id` and `campaign_id` from the database.
