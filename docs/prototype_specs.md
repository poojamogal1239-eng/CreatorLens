# CreatorLens - Interactive Prototype Specification

This document contains the user journey specs, sitemaps, and walkthroughs for the interactive prototype of the **CreatorLens MVP**.

---

## 1. Prototype Overview & Running Instructions

The codebase is built with an **Interactive local Demo Mode** that acts as a complete, high-fidelity clickable prototype. It operates entirely client-side using `localStorage` to simulate complex database operations, and displays asynchronous progress loader panels to simulate n8n workflows and Google Gemini processing.

* **Shareable Prototype Links:**
  * [Launch Prototype Server](http://localhost:3000) (Requires dev server to be running)
  * [Open Prototype Static File](file:///c:/Users/Pooja/OneDrive/Desktop/CreatorLens/index.html) (Direct clickable link to run offline)

---

## 2. Interactive User Flow Guides

### Journey 1: Creator Onboarding & Profile Verification
1. **Landing Page:** Open the portal. Click **Get Started** or **Join as Creator** in the header.
2. **Registration:** You are redirected to the auth screen. Select **Register**, enter any credentials, select **Regional Content Creator** as role, and click **Create Account**.
3. **OTP Simulation:** Enter any 6-digit code (e.g. `123456`) and click **Verify Account**.
4. **Onboarding Wizard:** Complete the form (Languages: Marathi/Hindi, Region: Pune, Niche: Lifestyle, pricing: 15,000). Click **Generate AI Profile Insights**.
5. **AI Processing overlay:** Watch the simulated Gemini analysis progression stages:
   * *"Analyzing your profile..."*
   * *"Calculating Creator Intelligence Score..."*
   * *"Generating recommendations..."*
6. **Dashboard Landing:** The dashboard renders containing calculated scores, strengths, weaknesses, and custom growth tips.

### Journey 2: Brand Campaign Matching & Pricing
1. **Landing Page:** Click **Hire Creators** in the hero.
2. **Auth Selection:** Register as a **Brand Manager**.
3. **Brand Dashboard:** Click **+ Create Campaign** to open the wizard modal.
4. **Brief Input:** Fill in objectives, target region (Pune), languages (Marathi), and budget. Click **Create & Run Match Sourcing**.
5. **AI Matching overlay:** The system displays automated steps:
   * *"Analyzing campaign brief..."*
   * *"Running compatibility matchmaker..."*
   * *"Generating pricing recommendations..."*
6. **Results Rendering:** Click on **AI Creator Match** in the sidebar. Select your campaign to view the list of matching profiles, match scores, recommended price ranges, and custom justifications.

---

## 3. High-Fidelity Interaction Inventory

The prototype incorporates these visual micro-interactions and states:
* **Ambient Glows:** Soft pulsing backdrop gradients responsive to viewport scrolling.
* **Loading & Transition Modals:** Floating overlays with loading tickers simulating remote execution delays.
* **Toast Alerts:** Sliding popup banners indicating successful operations (e.g. *"Collaboration invitation sent!"*).
* **Sidebar Active Highlighting:** Dynamic class toggling updating sidebar navigation selections on click.
