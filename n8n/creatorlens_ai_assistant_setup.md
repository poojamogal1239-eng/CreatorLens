# CreatorLens AI Assistant n8n Workflow Setup

This document outlines the workflow details, setup instructions, credential requirements, testing guidelines, and endpoint specifications for the **CreatorLens AI Assistant** n8n workflow.

---

### 1. Workflow Purpose
The CreatorLens AI Assistant is a specialized regional content creator assistant. It exists to answer creators' questions regarding their:
* Creator Intelligence Score (CIS) & Individual Vector Scores (Audience Trust, Engagement, Regional, Consistency, Readiness)
* Profile Completeness & Summary Metrics
* Core Strengths and Weaknesses
* Practical Recommendations to enhance campaign readiness

---

### 2. Import Instructions
1. Open your **n8n Cloud or Local Instance**.
2. Click on **Workflows** in the left sidebar and select **Add Workflow** (or **New**).
3. Click the **three dots** in the top-right corner of the canvas and select **Import from File**.
4. Upload [`creatorlens_ai_assistant.json`](file:///c:/Users/Pooja/OneDrive/Desktop/CreatorLens/n8n/creatorlens_ai_assistant.json).
5. Save the workflow and toggle the active status to **Active** to begin receiving webhook requests.

---

### 3. Required Supabase Credentials
The workflow uses the existing Supabase node integration:
* **Credential ID**: `supabaseApi` (must match the existing account convention configured in the onboarding profile enrichment workflow).
* **Target Schema**: `public`
* **Referenced Tables**:
  * `creators` (Filter condition: `id = creator_id`)
  * `creator_scores` (Filter condition: `creator_id = creator_id`)
  * `creator_ai_analysis` (Filter condition: `creator_id = creator_id`)

---

### 4. Gemini API Configuration
* **Model**: `Gemini 2.5 Flash`
* **API Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`
* **API Key Resolution**: Resolves automatically from the request payload parameter `gemini_api_key` or uses the secure container environment fallback (`YOUR_API_KEY_FALLBACK`).

---

### 5. Webhook Specifications
* **HTTP Method**: `POST`
* **Production Path**: `creatorlens-ai-assistant`
* **Test Path**: `creatorlens-ai-assistant` (for execution runs)
* **Response Mode**: `Response Node` (Sends immediate JSON response)

---

### 6. Webhook Payloads

#### Expected Request JSON
```json
{
  "creator_id": "df8430bc-52ea-41f2-81bf-117afe9d4e32",
  "message": "Why is my Creator Intelligence Score?",
  "gemini_api_key": "AIzaSy..."
}
```

#### Expected Success Response JSON
```json
{
  "success": true,
  "response": "Your Creator Intelligence Score of 85 is backed by strong Regional Influence (90) and Content Consistency (85) indicators...",
  "creator_id": "df8430bc-52ea-41f2-81bf-117afe9d4e32"
}
```

#### Expected Error Response JSON (Profile Not Yet Enriched)
```json
{
  "success": false,
  "response": "Your Creator Intelligence profile hasn't been generated yet. Complete your profile and run Creator Intelligence analysis first.",
  "creator_id": "df8430bc-52ea-41f2-81bf-117afe9d4e32"
}
```

---

### 7. Connection from the Backend Server
The existing backend server connects to the n8n assistant route through:
* **API Route endpoint**: `POST /api/assistant/chat`
* **Internal Action**: Forwards incoming message and creator UUID directly to the active n8n webhook URL.

---

### 8. Testing Scenarios

#### Test Case 1: "Why is my Creator Intelligence Score?"
* **Expected Action**: The workflow fetches the creator's scores and explains their current score metrics (e.g. 85) without fabricating values.

#### Test Case 2: "What are my strongest areas?"
* **Expected Action**: Assistant identifies the highest score vectors (e.g., Regional Influence = 90) and summarizes the creator's key strengths.

#### Test Case 3: "What should I improve?"
* **Expected Action**: Identifies the lowest vector scores, weaknesses list, and missing information fields.

#### Test Case 4: "How can I become more brand-ready?"
* **Expected Action**: Focuses on `brand_readiness` metrics, highlighting gaps and actionable steps.

#### Test Case 5: "What should I improve before applying to campaigns?"
* **Expected Action**: Combines profile completeness and weaknesses to suggest tactical optimizations.

#### Test Case 6: Unrelated Questions (e.g., "What is the capital of France?")
* **Expected Action**: AI respects boundaries, politely explaining that its scope is limited to CreatorLens profile advice.

---

### 9. Assumptions and Limitations
1. **No Real Keys Exposed**: The JSON workflow does not store raw secrets or private credentials.
2. **Read-Only Context**: The Assistant does not write back scores or update the database.
3. **No General Purpose Orchestration**: Built purely on native HTTP Requests and Supabase node lookups for high reliability.
