// n8n AI Workflow Client adapter (Dual-Mode: Real Webhooks vs. Simulated Client-Side Pipeline)

window.N8N = {
  backendUrl: localStorage.getItem("cl_backend_url") || ((window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "http://localhost:5000/api" : window.location.origin + "/api"),

  isLive: function() {
    return localStorage.getItem("cl_use_live") === "true";
  },

  // 1. Creator Onboarding pipeline (WF-01 ➔ WF-02 ➔ WF-03)
  triggerProfileEnrichment: async function(creatorId, onStepUpdate) {
    if (this.isLive()) {
      if (onStepUpdate) onStepUpdate("trigger", "Triggering Live n8n enrichment via Backend...");
      
      try {
        const response = await fetch(`${this.backendUrl}/creators/enrich`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ creator_id: creatorId })
        });
        
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || response.statusText);
        }
        
        // Start polling for status updates
        const startTime = Date.now();
        const timeout = 60000; // 60 seconds
        let currentStep = "wf01";
        
        if (onStepUpdate) onStepUpdate("wf01", "Running WF-01: Profile Enrichment...");
        
        while (Date.now() - startTime < timeout) {
          await new Promise(r => setTimeout(r, 2000));
          
          const profileResponse = await fetch(`${this.backendUrl}/creators/profile/${creatorId}`);
          if (!profileResponse.ok) {
            throw new Error("Failed to fetch creator profile during status check.");
          }
          const profile = await profileResponse.json();
          
          if (profile.ai_status === "Completed") {
            if (onStepUpdate) onStepUpdate("complete", "Live Profile Enrichment Complete!");
            return profile;
          } else if (profile.ai_status === "Failed") {
            throw new Error("n8n enrichment workflow failed during execution.");
          }
          
          // Update visual progression based on time elapsed to make dashboard progress interactive
          const elapsed = Date.now() - startTime;
          if (elapsed > 10000 && currentStep === "wf02") {
            currentStep = "wf03";
            if (onStepUpdate) onStepUpdate("wf03", "Running WF-03: AI suggestion Builder...");
          } else if (elapsed > 4000 && currentStep === "wf01") {
            currentStep = "wf02";
            if (onStepUpdate) onStepUpdate("wf02", "Running WF-02: Score Engine...");
          } else {
            if (onStepUpdate) onStepUpdate(currentStep, `Running ${currentStep.toUpperCase()}... (${Math.round(elapsed/1000)}s)`);
          }
        }
        
        throw new Error("Enrichment workflow timed out after 60 seconds.");
      } catch (err) {
        console.error("n8n profile enrichment webhook error:", err);
        if (onStepUpdate) onStepUpdate("error", "Enrichment error: " + err.message);
        throw err;
      }
    } else {
      // Local Simulation Mode with dynamic calculation
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const traceId = "sim-" + Math.random().toString(36).substr(2, 9);
      const startTime = Date.now();
      
      // Fetch creator data from DB
      const creators = JSON.parse(localStorage.getItem("cl_creators") || "[]");
      const creatorIdx = creators.findIndex(c => c.id === creatorId);
      if (creatorIdx === -1) throw new Error("Creator not found");
      const creator = creators[creatorIdx];
      
      // Update creator status to Processing
      creators[creatorIdx].ai_status = "Processing";
      localStorage.setItem("cl_creators", JSON.stringify(creators));

      // Create simulated AI Job
      const jobs = JSON.parse(localStorage.getItem("cl_ai_jobs") || "[]");
      const jobId = "job-" + Math.random().toString(36).substr(2, 9);
      const jobEntry = {
        id: jobId,
        job_type: "Creator Analysis",
        workflow_name: "creator_profile_enrichment",
        workflow_version: "v1.0",
        creator_id: creatorId,
        status: "Processing",
        trace_id: traceId,
        queued_at: new Date().toISOString(),
        started_at: new Date().toISOString()
      };
      jobs.push(jobEntry);
      localStorage.setItem("cl_ai_jobs", JSON.stringify(jobs));

      // Log in simulated workflow_logs
      const logs = JSON.parse(localStorage.getItem("cl_workflow_logs") || "[]");
      const logEntry = {
        id: "log-" + Math.random().toString(36).substr(2, 9),
        workflow_name: "creator_profile_enrichment",
        trace_id: traceId,
        creator_id: creatorId,
        status: "Processing",
        started_at: new Date().toISOString(),
        execution_id: jobId,
        workflow_version: "v1.0",
        prompt_version: "v1.0",
        ai_model: "Gemini-1.5-pro (Simulated)",
        execution_time_ms: 0,
        input_payload: { creator_id: creatorId, trace_id: traceId, job_id: jobId }
      };
      logs.push(logEntry);
      localStorage.setItem("cl_workflow_logs", JSON.stringify(logs));
      
      // Step 1: WF-01 Profile Analysis
      if (onStepUpdate) onStepUpdate("wf01", "Running WF-01: Profile Enrichment...");
      await delay(1200);
      
      // Update creator profile enrichment values in cl_creator_ai_analysis
      const aiAnalysis = JSON.parse(localStorage.getItem("cl_creator_ai_analysis") || "{}");
      aiAnalysis[creatorId] = {
        id: "ana-" + Math.random().toString(36).substr(2, 9),
        creator_id: creatorId,
        profile_summary: `${creator.full_name} is a rising regional influencer. Renders high-relevance posts focusing on ${creator.categories.join(" and ")} niches. Shows deep demographic trust and regional affinity within ${creator.regions.join("/")}.`,
        strengths: ["Direct local language communication", "Authentic lifestyle representation"],
        weaknesses: ["Low multi-platform cross-posting"],
        missing_information: ["Detailed monthly click-through ratios"],
        profile_completeness: 85,
        ai_version: 'Gemini-1.5-pro (Simulated)',
        workflow_version: 'WF-v1.0 (Simulated)',
        confidence_score: 0.95,
        analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      localStorage.setItem("cl_creator_ai_analysis", JSON.stringify(aiAnalysis));
      
      // Step 2: WF-02 Score Engine
      if (onStepUpdate) onStepUpdate("wf02", "Running WF-02: Score Engine...");
      await delay(1200);
      
      const social = creator.social_links || {};
      
      // Check if metrics are connected/verified (which is false for MVP manual entries)
      const isIgConnected = social.instagram && social.instagram.is_connected === true;
      const isYtConnected = social.youtube && social.youtube.is_connected === true;
      const hasVerifiedMetrics = isIgConnected || isYtConnected;

      // 1. Engagement Index (Needs verified social metrics connection)
      const engagement = hasVerifiedMetrics 
        ? Math.min(100, Math.round(60 + (creator.engagement_rate || 0) * 4)) 
        : -1;

      // 2. Audience Trust Index (Needs verified metrics + age range)
      const hasAge = creator.audience_metadata && creator.audience_metadata.age_range && creator.audience_metadata.age_range !== 'unavailable';
      const trust = (hasVerifiedMetrics && hasAge)
        ? Math.min(100, Math.round(75 + (creator.engagement_rate || 0) * 2))
        : -1;

      // 3. Regional Influence Index (Needs creator location + audience location)
      const hasLoc = creator.city && creator.state && creator.audience_metadata && creator.audience_metadata.location;
      const regional = hasLoc ? 85 : -1;

      // 4. Content Consistency Index (Needs posting frequency + formats)
      const freq = creator.audience_metadata ? creator.audience_metadata.posting_frequency : null;
      let consistency = -1;
      if (freq && creator.audience_metadata.formats && creator.audience_metadata.formats.length > 0) {
        if (freq === "Daily") consistency = 95;
        else if (freq === "2-3 times a week") consistency = 85;
        else if (freq === "Weekly") consistency = 75;
        else if (freq === "Bi-weekly") consistency = 60;
        else if (freq === "Monthly") consistency = 45;
      }

      // 5. Brand Readiness Index (Needs brand category + rates card + collab email)
      const hasReadyCollab = creator.collab_metadata && 
        creator.collab_metadata.target_brands && creator.collab_metadata.target_brands.length > 0 &&
        creator.pricing_min > 0 && creator.collab_metadata.contact_email;
      const readiness = hasReadyCollab ? 80 : -1;

      // Calculate overall Intelligence Score from valid dimensions only
      const validScores = [engagement, trust, regional, consistency, readiness].filter(s => s >= 0);
      const overallScore = validScores.length > 0 
        ? Math.round(validScores.reduce((sum, s) => sum + s, 0) / validScores.length)
        : -1;

      const scoreObj = {
        creator_id: creatorId,
        intelligence_score: overallScore,
        audience_trust: trust,
        engagement_rate_score: engagement,
        regional_influence: regional,
        content_consistency: consistency,
        brand_readiness: readiness,
        ai_explanation: overallScore >= 0 
          ? `Overall score is ${overallScore}/100. Evaluated from connected regional metrics, frequency of posting, and brand rates.`
          : 'Insufficient data to compute overall Creator Intelligence. Connect and verify platforms to build your score.',
        updated_at: new Date().toISOString()
      };
      
      const scores = JSON.parse(localStorage.getItem("cl_scores") || "{}");
      scores[creatorId] = scoreObj;
      localStorage.setItem("cl_scores", JSON.stringify(scores));
      
      // Step 3: WF-03 Suggestions Generator
      if (onStepUpdate) onStepUpdate("wf03", "Running WF-03: AI suggestion Builder...");
      await delay(1200);
      
      const suggestions = [
        {
          id: "sug-" + Math.random().toString(36).substr(2, 5),
          creator_id: creatorId,
          suggestion_text: `Add more video reels in ${creator.languages[0] || 'regional languages'} to boost your Regional Influence score.`,
          impact_level: "high",
          expected_improvement: 8,
          created_at: new Date().toISOString()
        },
        {
          id: "sug-" + Math.random().toString(36).substr(2, 5),
          creator_id: creatorId,
          suggestion_text: "Fill out missing past collaboration cards to increase your Brand Readiness index.",
          impact_level: "medium",
          expected_improvement: 5,
          created_at: new Date().toISOString()
        }
      ];
      
      const suggStore = JSON.parse(localStorage.getItem("cl_suggestions") || "{}");
      suggStore[creatorId] = suggestions;
      localStorage.setItem("cl_suggestions", JSON.stringify(suggStore));
      
      // Mark as Completed
      const currentCreators = JSON.parse(localStorage.getItem("cl_creators") || "[]");
      const cIdx = currentCreators.findIndex(c => c.id === creatorId);
      if (cIdx !== -1) {
        currentCreators[cIdx].ai_status = "Completed";
        localStorage.setItem("cl_creators", JSON.stringify(currentCreators));
      }

      // Update AI Job status
      const currentJobs = JSON.parse(localStorage.getItem("cl_ai_jobs") || "[]");
      const jobIdx = currentJobs.findIndex(j => j.id === jobId);
      if (jobIdx !== -1) {
        currentJobs[jobIdx].status = "Completed";
        currentJobs[jobIdx].completed_at = new Date().toISOString();
        localStorage.setItem("cl_ai_jobs", JSON.stringify(currentJobs));
      }

      // Update log entry
      const currentLogs = JSON.parse(localStorage.getItem("cl_workflow_logs") || "[]");
      const logIdx = currentLogs.findIndex(l => l.trace_id === traceId);
      if (logIdx !== -1) {
        const executionTime = Date.now() - startTime;
        currentLogs[logIdx].status = "Completed";
        currentLogs[logIdx].completed_at = new Date().toISOString();
        currentLogs[logIdx].execution_time = executionTime;
        currentLogs[logIdx].execution_time_ms = executionTime;
        currentLogs[logIdx].output_payload = { success: true, score: finalScore, suggestions_count: suggestions.length };
        localStorage.setItem("cl_workflow_logs", JSON.stringify(currentLogs));
      }
      
      if (onStepUpdate) onStepUpdate("complete", "Local AI Enrichment Complete!");
      return { creator_id: creatorId, score: finalScore, suggestions };
    }
  },

  // 2. Campaign creation pipeline (WF-04 ➔ WF-05 ➔ WF-06)
  triggerCampaignMatching: async function(campaignId, onStepUpdate) {
    if (this.isLive()) {
      if (onStepUpdate) onStepUpdate("trigger", "Triggering Live n8n matching via Backend...");
      
      try {
        const response = await fetch(`${this.backendUrl}/campaigns/${campaignId}/match`, {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        });
        
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || response.statusText);
        }
        
        // Start polling for campaign matching status
        const startTime = Date.now();
        const timeout = 60000; // 60 seconds
        let currentStep = "wf04";
        
        if (onStepUpdate) onStepUpdate("wf04", "Running WF-04: Campaign Parse...");
        
        while (Date.now() - startTime < timeout) {
          await new Promise(r => setTimeout(r, 2000));
          
          const campaignResponse = await fetch(`${this.backendUrl}/campaigns/${campaignId}`);
          if (!campaignResponse.ok) {
            throw new Error("Failed to fetch campaign details during status check.");
          }
          const campaign = await campaignResponse.json();
          
          if (campaign.ai_status === "Completed") {
            if (onStepUpdate) onStepUpdate("complete", "Live Campaign Sourcing Complete!");
            
            // Return recommendations directly
            const matchesResponse = await fetch(`${this.backendUrl}/campaigns/${campaignId}/matches`);
            if (matchesResponse.ok) {
              return await matchesResponse.json();
            }
            return [];
          } else if (campaign.ai_status === "Failed") {
            throw new Error("n8n campaign matching workflow failed during execution.");
          }
          
          // Visual updates
          const elapsed = Date.now() - startTime;
          if (elapsed > 10000 && currentStep === "wf05") {
            currentStep = "wf06";
            if (onStepUpdate) onStepUpdate("wf06", "Running WF-06: Pricing Recommendation...");
          } else if (elapsed > 4000 && currentStep === "wf04") {
            currentStep = "wf05";
            if (onStepUpdate) onStepUpdate("wf05", "Running WF-05: Brand Match Engine...");
          } else {
            if (onStepUpdate) onStepUpdate(currentStep, `Running ${currentStep.toUpperCase()}... (${Math.round(elapsed/1000)}s)`);
          }
        }
        
        throw new Error("Matching workflow timed out after 60 seconds.");
      } catch (err) {
        console.error("n8n campaign matching webhook error:", err);
        if (onStepUpdate) onStepUpdate("error", "Matching error: " + err.message);
        throw err;
      }
    } else {
      // Local Simulation Mode with dynamic calculation
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const traceId = "sim-" + Math.random().toString(36).substr(2, 9);
      const startTime = Date.now();
      
      // Fetch Campaign data
      const campaigns = JSON.parse(localStorage.getItem("cl_campaigns") || "[]");
      const campaignIdx = campaigns.findIndex(c => c.id === campaignId);
      if (campaignIdx === -1) throw new Error("Campaign not found");
      const campaign = campaigns[campaignIdx];
      
      // Update Campaign Status
      campaigns[campaignIdx].ai_status = "Processing";
      localStorage.setItem("cl_campaigns", JSON.stringify(campaigns));

      // Create simulated AI Job
      const jobs = JSON.parse(localStorage.getItem("cl_ai_jobs") || "[]");
      const jobId = "job-" + Math.random().toString(36).substr(2, 9);
      const jobEntry = {
        id: jobId,
        job_type: "Match Engine",
        workflow_name: "campaign_matching",
        workflow_version: "v1.0",
        campaign_id: campaignId,
        status: "Processing",
        trace_id: traceId,
        queued_at: new Date().toISOString(),
        started_at: new Date().toISOString()
      };
      jobs.push(jobEntry);
      localStorage.setItem("cl_ai_jobs", JSON.stringify(jobs));

      // Log in simulated workflow_logs
      const logs = JSON.parse(localStorage.getItem("cl_workflow_logs") || "[]");
      const logEntry = {
        id: "log-" + Math.random().toString(36).substr(2, 9),
        workflow_name: "campaign_matching",
        trace_id: traceId,
        campaign_id: campaignId,
        status: "Processing",
        started_at: new Date().toISOString(),
        execution_id: jobId,
        workflow_version: "v1.0",
        prompt_version: "v1.0",
        ai_model: "Gemini-1.5-pro (Simulated)",
        execution_time_ms: 0,
        input_payload: { campaign_id: campaignId, trace_id: traceId, job_id: jobId }
      };
      logs.push(logEntry);
      localStorage.setItem("cl_workflow_logs", JSON.stringify(logs));
      
      // Step 1: WF-04 Campaign Brief Parser
      if (onStepUpdate) onStepUpdate("wf04", "Running WF-04: Campaign Parse...");
      await delay(1200);
      
      const parsedKeywords = campaign.objective.toLowerCase().split(/[ ,.]+/).filter(w => w.length > 4);
      campaigns[campaignIdx].ai_keywords = parsedKeywords.slice(0, 5);
      campaigns[campaignIdx].ai_tier = campaign.creator_type === "micro" ? "Micro-Influencer (10K - 100K)" : "Mid-Tier (100K+)";
      localStorage.setItem("cl_campaigns", JSON.stringify(campaigns));
      
      // Step 2: WF-05 Brand Match Engine
      if (onStepUpdate) onStepUpdate("wf05", "Running WF-05: Brand Match Engine...");
      await delay(1200);
      
      // Fetch Creators & Scores
      const creators = JSON.parse(localStorage.getItem("cl_creators") || "[]");
      const scores = JSON.parse(localStorage.getItem("cl_scores") || "{}");
      
      const matchedList = [];
      
      creators.forEach(creator => {
        let matchScore = 50; // Base score
        const explanationLines = [];
        
        // Language matching (+15)
        const campaignLang = campaign.language;
        if (creator.languages.includes(campaignLang)) {
          matchScore += 15;
          explanationLines.push("Language alignment match");
        }
        
        // Region matching (+15)
        const campaignRegion = campaign.region;
        if (creator.regions.includes(campaignRegion)) {
          matchScore += 15;
          explanationLines.push(`Strong regional footprint in ${campaignRegion}`);
        }
        
        // Niche/Category matching (+15)
        const campaignCat = campaign.category;
        if (creator.categories.includes(campaignCat)) {
          matchScore += 15;
          explanationLines.push(`Matches campaign niche: ${campaignCat}`);
        }
        
        // Creator Intelligence Contribution (+15)
        const cScore = scores[creator.id] ? scores[creator.id].intelligence_score : 50;
        const scoreWeight = Math.round(cScore * 0.15);
        matchScore += scoreWeight;
        if (cScore >= 80) {
          explanationLines.push("Exceptional Creator Intelligence profile");
        }
        
        // Budget Check (+10)
        if (campaign.budget >= creator.pricing_min) {
          matchScore += 10;
          explanationLines.push("Pricing fits within campaign budget");
        }
        
        matchScore = Math.min(100, matchScore);
        
        matchedList.push({
          id: "match-" + Math.random().toString(36).substr(2, 5),
          campaign_id: campaignId,
          creator_id: creator.id,
          match_score: matchScore,
          match_explanation: explanationLines.join(", "),
          status: "recommended"
        });
      });
      
      // Sort matches by percentage descending
      matchedList.sort((a, b) => b.match_score - a.match_score);
      
      // Step 3: WF-06 Pricing Recommendation
      if (onStepUpdate) onStepUpdate("wf06", "Running WF-06: Pricing Recommendation...");
      await delay(1200);
      
      const finalMatches = matchedList.map(match => {
        const creator = creators.find(c => c.id === match.creator_id);
        const cScore = scores[creator.id] ? scores[creator.id].intelligence_score : 70;
        
        const recPrice = Math.round((creator.followers_count * 0.15 + creator.average_views * 0.5) * (cScore / 80));
        const roundedRec = Math.max(5000, Math.round(recPrice / 1000) * 1000);
        
        return {
          ...match,
          min_price: Math.round(roundedRec * 0.8),
          recommended_price: roundedRec,
          premium_price: Math.round(roundedRec * 1.3),
          pricing_justification: `Fair valuation calculated at ₹${roundedRec.toLocaleString('en-IN')} based on ${creator.engagement_rate}% engagement rate, ${creator.average_views} average views, and verified ${creator.languages.join("/")} content footprint.`
        };
      });
      
      // Save matches globally
      const allMatches = JSON.parse(localStorage.getItem("cl_matches") || "[]");
      const cleanedMatches = allMatches.filter(m => m.campaign_id !== campaignId);
      localStorage.setItem("cl_matches", JSON.stringify([...cleanedMatches, ...finalMatches]));

      // Save pricing recommendations globally
      const allPricing = JSON.parse(localStorage.getItem("cl_pricing_recommendations") || "[]");
      const cleanedPricing = allPricing.filter(p => p.campaign_id !== campaignId);
      const newPricing = finalMatches.map(m => ({
        id: "prc-" + Math.random().toString(36).substr(2, 5),
        campaign_id: campaignId,
        creator_id: m.creator_id,
        min_price: m.min_price,
        recommended_price: m.recommended_price,
        premium_price: m.premium_price,
        pricing_justification: m.pricing_justification,
        created_at: new Date().toISOString()
      }));
      localStorage.setItem("cl_pricing_recommendations", JSON.stringify([...cleanedPricing, ...newPricing]));
      
      // Mark Campaign status as Completed
      const currentCampaigns = JSON.parse(localStorage.getItem("cl_campaigns") || "[]");
      const campIdx = currentCampaigns.findIndex(c => c.id === campaignId);
      if (campIdx !== -1) {
        currentCampaigns[campIdx].ai_status = "Completed";
        localStorage.setItem("cl_campaigns", JSON.stringify(currentCampaigns));
      }

      // Update AI Job status
      const currentJobs = JSON.parse(localStorage.getItem("cl_ai_jobs") || "[]");
      const jobIdx = currentJobs.findIndex(j => j.id === jobId);
      if (jobIdx !== -1) {
        currentJobs[jobIdx].status = "Completed";
        currentJobs[jobIdx].completed_at = new Date().toISOString();
        localStorage.setItem("cl_ai_jobs", JSON.stringify(currentJobs));
      }

      // Update log entry
      const currentLogs = JSON.parse(localStorage.getItem("cl_workflow_logs") || "[]");
      const logIdx = currentLogs.findIndex(l => l.trace_id === traceId);
      if (logIdx !== -1) {
        const executionTime = Date.now() - startTime;
        currentLogs[logIdx].status = "Completed";
        currentLogs[logIdx].completed_at = new Date().toISOString();
        currentLogs[logIdx].execution_time = executionTime;
        currentLogs[logIdx].execution_time_ms = executionTime;
        currentLogs[logIdx].output_payload = { success: true, matches_count: finalMatches.length };
        localStorage.setItem("cl_workflow_logs", JSON.stringify(currentLogs));
      }
      
      if (onStepUpdate) onStepUpdate("complete", "Local Campaign Matching Complete!");
      return finalMatches;
    }
  }
};
