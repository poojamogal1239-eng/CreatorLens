# CreatorLens - Complete Product Design & UI Specifications

This document defines the complete product design system, user flows, information architecture, and UI layouts for **CreatorLens**. It serves as the single source of truth for the Frontend, UX, and n8n teams.

---

## 1. Information Architecture & Sitemap

### High-Level Information Architecture (IA)
```
CreatorLens IA
├── Public (Pre-Login)
│   ├── Landing Page (Home)
│   ├── Features (Creator Intelligence, Match Sourcing)
│   ├── Pricing (Tiered details)
│   └── Authentication (Login, Register, Forgot Password, OTP, Reset)
├── Creator Portal (Post-Login)
│   ├── Dashboard (Overview, Scores, Requests)
│   ├── Profile Editor (Portfolio, Pricing, Social Links)
│   ├── AI Insights (Detailed Analysis, Strengths, Weaknesses)
│   ├── Suggestions Tracker (Growth Suggestions)
│   └── Collaboration Hub (Negotiations, Collaboration Status)
├── Brand Portal (Post-Login)
│   ├── Dashboard (Campaign analytics, Active briefs)
│   ├── Campaign Manager (Create Campaign, Match Tracker)
│   ├── Creator Discovery (Search, Filter, Comparative view)
│   └── Negotiation Hub (Offers, Collaboration Tracking)
└── Admin Portal (Administrative)
    ├── Dashboard (System health, Active Users, Log telemetry)
    ├── User Management (Activation, Verifications)
    └── Workflow Monitor (n8n Trace logging, API metrics)
```

---

## 2. Design System Tokens & Implementation

These tokens map exactly to [design-system.css](file:///c:/Users/Pooja/OneDrive/Desktop/CreatorLens/css/design-system.css).

### A. Color Palette (Cyber-Dark Glassmorphic Theme)
* **Primary Accents:**
  * `#00F2A6` (Neon Mint) - Used for primary success states, scores, and positive growth indicators.
  * `#00D4FF` (Electric Cyan) - Used for secondary highlights, loading tickers, and actionable links.
  * `#4F46E5` (Indigo Glow) - Used for primary interactive actions and ambient backdrop gradients.
* **Neutrals:**
  * `#0D1B24` (Space Navy) - Core background layer.
  * `rgba(21, 31, 50, 0.65)` (Glass Navy) - Primary card and panel surface.
  * `#F8FAFC` (Text White) - Primary readable typography.
  * `#94A3B8` (Slate Gray) - Secondary descriptions and labels.
  * `rgba(255, 255, 255, 0.05)` - Uniform thin borders.

### B. Typography
* **Headers (H1 - H6):** `Poppins`, sans-serif. Letter spacing: `-0.02em`. Weight: `600` (Semi-bold) or `700` (Bold).
* **Body Text:** `Inter`, sans-serif. Line height: `1.5` or `1.6`. Weights: `300` (Light), `400` (Regular), `500` (Medium).

---

## 3. Screen Inventory

We have focused the scope on **32 highly detailed screens** divided across the four product areas:

### Area A: Public Website (6 Screens)
1. **Screen 01: Landing Page** - Dynamic hero, how it works, core metrics, and testimonials.
2. **Screen 02: Registration Selector** - Selection between Creator and Brand portals.
3. **Screen 03: Creator Onboarding Form** - Personal information, region, and categories.
4. **Screen 04: Brand Onboarding Form** - Company metadata, industry, and budget fields.
5. **Screen 05: Login View** - Unified security authentication entry.
6. **Screen 06: Recover Password / OTP** - Verification validation sequence.

### Area B: Creator Portal (10 Screens)
7. **Screen 07: Creator Dashboard** - Central control hub showing score snapshot and activity metrics.
8. **Screen 08: Profile Editor** - Bio, categories, regions, and pricing setups.
9. **Screen 09: Social accounts Linker** - Integrations connector (Instagram, YouTube).
10. **Screen 10: Profile completeness Ticker** - Checklist highlighting completeness tasks.
11. **Screen 11: AI Insights Panel** - Full profile summaries, strengths, and weaknesses views.
12. **Screen 12: Creator Score Breakdown** - Audience trust, engagement, consistency indicators.
13. **Screen 13: Growth suggestions Center** - Suggestions, impact levels, and score impacts.
14. **Screen 14: Collaboration Requests Feed** - Incoming campaign negotiation requests list.
15. **Screen 15: Negotiation Detail Modal** - Terms negotiation panel (suggested prices, timelines).
16. **Screen 16: Settings & Security** - Password updates and privacy configurations.

### Area C: Brand Portal (10 Screens)
17. **Screen 17: Brand Dashboard** - Sourcing overview, active campaigns, and quick metrics.
18. **Screen 18: Campaign Creator (Brief)** - Objective, budget, region, and languages.
19. **Screen 19: AI Campaign Brief Analyzer** - Gemini-parsed target keywords and profiles.
20. **Screen 20: Creator Discovery Grid** - Comprehensive filter, category, and language search.
21. **Screen 21: Comparative Match Workspace** - Compare side-by-side matches.
22. **Screen 22: Campaign Match details** - Creator score breakdown and valuation details.
23. **Screen 23: Pricing Recommendation Modal** - Valuation, ranges, and justifications.
24. **Screen 24: Sourcing matches list** - Top 10 recommendations from the matching engine.
25. **Screen 25: Negotiation Hub (Offers)** - Outgoing proposals status tracker.
26. **Screen 26: Connected Accounts Manager** - Integrations and brand settings.

### Area D: Admin Portal (6 Screens)
27. **Screen 27: Admin Dashboard** - Performance metrics, active jobs, and system alerts.
28. **Screen 28: User Management List** - Search, verify, or suspend creators/brands.
29. **Screen 29: Campaign Audit View** - Platform-wide marketing campaign details.
30. **Screen 30: AI Jobs Orchestrator** - Active and queued n8n job queues monitor.
31. **Screen 31: System Telemetry Logs** - Real-time execution logs and error parameters.
32. **Screen 32: Platform Configuration** - Model coefficients, weights, and server parameters.

---

## 4. High-Fidelity UI Layout Specifications

Every screen layout incorporates the standard glassmorphism components (`.glass-card`), ambient backdrop glows (`.ambient-glow-1`, `.ambient-glow-2`), and neo-mint typography indicators.

### Screen 01: Landing Page
* **Layout:** Centered single-column layout with sticky navigation header (`height: 72px`).
* **Visual Elements:** Large hero header using text gradient background (`linear-gradient(to right, #ffffff, #00D4FF)`) followed by a neo-mint call-to-action button (`.btn-primary`).
* **Section Mapping:** Focuses on the *"What should the user do next?"* principle:
  ```
  [Navigation Header: Logo | Features | Pricing | Login (Btn-Secondary)]
  [Hero Title: "Regional Creator Sourcing, Driven by Intelligence."]
  [Hero Subtitle: "Bypass manual discovery. Match regional creators using transparent pricing."]
  [Onboarding Call-to-Action: Join as Creator (Btn-Primary) | Hire Creators (Btn-Secondary)]
  [Product Value Grid: Audience Trust Engine | Match Matchmaker | Pricing recommendations]
  ```

### Screen 11: Creator AI Insights Panel
* **Layout:** Sidebar Navigation + 2-Column Grid Layout.
* **Visual Elements:** Displays a floating `.glass-card` highlighting the profile completeness progress bar. Left column displays profile summary; right column shows a checklist of strengths and weaknesses.
* **Copy & Tone:** Friendly and collaborative copy.
  > *"Analyzing your profile to calculate regional influence and highlight profile growth points..."*

### Screen 22: Campaign Match details (Brand Portal)
* **Layout:** 3-Column Profile Card.
* **Visual Elements:** Left panel details creator stats; middle panel details the Gemini compatibility analysis. Right panel contains the Pricing Recommendation Card:
  ```
  ┌────────────────────────────────────────────────────────┐
  │              PRICING RECOMMENDATION                    │
  ├────────────────────────────────────────────────────────┤
  │ Recommended rate: ₹15,000                             │
  │ Price Range: ₹12,000 - ₹19,500                         │
  │ Confidence Score: 95%                                  │
  ├────────────────────────────────────────────────────────┤
  │ AI Justification: "Pricing calculated based on high   │
  │ engagement rate (5.4%) and strong regional presence."  │
  └────────────────────────────────────────────────────────┘
  ```

### Screen 30: AI Jobs Orchestrator (Admin Portal)
* **Layout:** List Table with active status badges.
* **Visual Elements:** Simple table presenting columns `Job Type`, `Status`, `Trace ID`, and `Execution Time (ms)`. Status values utilize distinct indicator colors:
  * **Processing:** Pulsing cyan text.
  * **Completed:** Static neon-mint text.
  * **Failed:** Red alert indicator.

---

## 5. Component Library Specifications

### Buttons
* **`.btn-primary`:** Solid background `#4F46E5`, border-radius `8px`, transition duration `0.2s`. On hover: glow outline with cyan tint.
* **`.btn-secondary`:** Translucent background `rgba(255, 255, 255, 0.05)`, border `1px solid rgba(255, 255, 255, 0.1)`.

### Cards
* **`.glass-card`:** Backdrop blur `16px`, background color `rgba(21, 31, 50, 0.65)`, border `1px solid rgba(255, 255, 255, 0.05)`.

### Forms
* **Input Fields:** Semi-transparent background with gray text. Focus state transitions the border color to cyan `#00D4FF` with a subtle outer glow.
