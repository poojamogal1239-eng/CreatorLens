# CreatorLens - API Specifications

This document defines the complete API contract between the Frontend, Backend, and DB Client systems. All backend responses are formatted as standard JSON.

---

## 1. Authentication Module

### POST /api/auth/register
* **Description:** Registers a new user account (Brand or Creator).
* **Authentication:** None (Public)
* **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword123",
    "role": "creator" // or 'brand'
  }
  ```
* **Validation Rules:**
  * `email` must be a valid email string.
  * `password` must be at least 6 characters.
  * `role` must be either `'creator'` or `'brand'`.
* **Success Response (200 OK):**
  ```json
  {
    "user": {
      "id": "d3b07384-d113-4956-a5db-e1c305c423ba",
      "email": "user@example.com",
      "role": "creator"
    },
    "token": "eyJhbGciOiJIUzI1..."
  }
  ```
* **Error Responses:**
  * `400 Bad Request` if payload parameters are missing or invalid.
  * `409 Conflict` if the email is already registered.
* **Related Tables:** `users`

### POST /api/auth/login
* **Description:** Logs in an existing user and returns a token.
* **Authentication:** None (Public)
* **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword123"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "user": {
      "id": "d3b07384-d113-4956-a5db-e1c305c423ba",
      "email": "user@example.com",
      "role": "creator"
    },
    "token": "eyJhbGciOiJIUzI1..."
  }
  ```
* **Error Responses:**
  * `401 Unauthorized` for invalid email or password.
* **Related Tables:** `users`

---

## 2. Creator Module

### GET /api/creators/profile/:id
* **Description:** Fetches a creator's core profile, flat-merged with their AI analysis and intelligence scores.
* **Authentication:** JWT Bearer (User must be logged in)
* **Success Response (200 OK):**
  ```json
  {
    "id": "d3b07384-d113-4956-a5db-e1c305c423ba",
    "creator_code": "CR_000001",
    "full_name": "Pooja Mogal",
    "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
    "bio": "Lifestyle and tech content creator based in Pune.",
    "categories": ["Tech", "Lifestyle"],
    "languages": ["Hindi", "English"],
    "regions": ["Pune", "Mumbai"],
    "followers_count": 125000,
    "average_views": 45000,
    "engagement_rate": 5.4,
    "pricing_min": 15000,
    "pricing_premium": 45000,
    "ai_status": "Completed",
    "profile_summary": "Pooja is a dominant tech-lifestyle creator in Maharashtra...",
    "profile_completeness": 90,
    "strengths": ["Strong regional trust", "High video retention"],
    "weaknesses": ["Low cross-platform consistency"],
    "missing_information": ["TikTok presence metrics"],
    "confidence_score": 0.95,
    "intelligence_score": 84,
    "audience_trust": 88
  }
  ```
* **Related Tables:** `creators`, `creator_ai_analysis`, `creator_scores`

### POST /api/creators/profile
* **Description:** Creates or updates a creator profile.
* **Authentication:** JWT Bearer (Self creator only)
* **Request Body:**
  ```json
  {
    "full_name": "Pooja Mogal",
    "avatar_url": "https://example.com/avatar.jpg",
    "bio": "Creator bio...",
    "categories": ["Fashion"],
    "languages": ["Hindi"],
    "regions": ["Indore"],
    "followers_count": 50000,
    "average_views": 15000,
    "engagement_rate": 4.5,
    "pricing_min": 10000,
    "pricing_premium": 25000
  }
  ```
* **Related Tables:** `creators`

### POST /api/creators/enrich
* **Description:** Initiates asynchronous profile enrichment via n8n. Launches an orchestration job.
* **Authentication:** JWT Bearer (Self creator only)
* **Request Body:**
  ```json
  {
    "creator_id": "d3b07384-d113-4956-a5db-e1c305c423ba"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Profile enrichment trigger sent to n8n successfully",
    "data": {
      "job_id": "job-872ab672-bdfa-4993-8b74-1234abcd7890",
      "trace_id": "trace-9182371a-289b-4b2a-a9a3-98213abcd123"
    }
  }
  ```
* **Related Tables:** `creators`, `ai_jobs`, `workflow_logs`

---

## 3. Brand Module

### GET /api/brands/profile/:id
* **Description:** Fetches brand details.
* **Authentication:** JWT Bearer
* **Related Tables:** `brands`

### POST /api/brands/profile
* **Description:** Creates or updates a brand profile.
* **Authentication:** JWT Bearer (Self brand only)
* **Related Tables:** `brands`

---

## 4. Campaign Module

### POST /api/campaigns
* **Description:** Creates a new marketing campaign brief.
* **Authentication:** JWT Bearer (Brand only)
* **Request Body:**
  ```json
  {
    "title": "Summer tech Launch",
    "objective": "Promote our new gadget to micro-influencers in Pune",
    "category": "Tech",
    "target_audience": "Tech enthusiasts, 18-35",
    "region": "Pune",
    "language": "Hindi",
    "budget": 50000,
    "creator_type": "micro"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "id": "camp-98ab4521-827b-49da-9c8f-2873abdf1234",
    "title": "Summer Tech Launch",
    "ai_status": "Pending"
  }
  ```
* **Related Tables:** `campaigns`

### POST /api/campaigns/:id/match
* **Description:** Triggers the campaign match-sourcing engine in n8n.
* **Authentication:** JWT Bearer (Brand only)
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Campaign sourcing trigger sent to n8n successfully",
    "data": {
      "job_id": "job-872ab672-bdfa-4993-8b74-5555abcd6666",
      "trace_id": "trace-9182371a-289b-4b2a-a9a3-9999abcd8888"
    }
  }
  ```
* **Related Tables:** `campaigns`, `ai_jobs`, `workflow_logs`

### GET /api/campaigns/:id/matches
* **Description:** Fetches all recommended matches and calculated valuation pricing for a campaign.
* **Authentication:** JWT Bearer (Sponsoring brand only)
* **Success Response (200 OK):**
  ```json
  [
    {
      "id": "match-7832abcd-1823-49ca-bb23-9988ff442233",
      "match_score": 88,
      "min_price": 12000,
      "recommended_price": 15000,
      "premium_price": 19500,
      "pricing_justification": "Calculated based on engagement...",
      "match_explanation": "Strong niche and regional footprint in Pune",
      "creator": {
        "id": "creator-uuid",
        "full_name": "Pooja Mogal",
        "followers_count": 125000
      }
    }
  ]
  ```
* **Related Tables:** `campaign_matches`, `creators`

---

## 5. Collaboration Module

### POST /api/collaborations
* **Description:** Creates a collaboration negotiation request.
* **Authentication:** JWT Bearer (Brand only)
* **Request Body:**
  ```json
  {
    "campaign_id": "camp-uuid",
    "creator_id": "creator-uuid",
    "suggested_price": 15000,
    "price_justification": "Recommended match rate"
  }
  ```
* **Related Tables:** `collaborations`

### GET /api/collaborations/creator/:id
* **Description:** Lists all collaborations targeting a specific creator.
* **Authentication:** JWT Bearer (Target creator only)
* **Related Tables:** `collaborations`, `campaigns`

---

## 6. Notifications Module

### GET /api/notifications
* **Description:** Retrieves recent notifications for the logged-in user.
* **Authentication:** JWT Bearer
* **Related Tables:** `notifications`

### PUT /api/notifications/:id/read
* **Description:** Marks a specific notification as read.
* **Authentication:** JWT Bearer
* **Related Tables:** `notifications`

---

## 7. Admin & Job Telemetry Module

### GET /api/ai/jobs/:id
* **Description:** Returns the real-time execution status of an orchestration job.
* **Authentication:** JWT Bearer
* **Success Response (200 OK):**
  ```json
  {
    "id": "job-uuid",
    "job_type": "Creator Analysis",
    "status": "Completed", -- Queued, Processing, Completed, Failed
    "started_at": "2026-08-05T08:00:00Z",
    "completed_at": "2026-08-05T08:00:15Z"
  }
  ```
* **Related Tables:** `ai_jobs`

### GET /api/admin/logs
* **Description:** Fetches historical workflow execution logs.
* **Authentication:** JWT Bearer (Admin only)
* **Related Tables:** `workflow_logs`
