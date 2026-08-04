// n8n AI Workflow Client adapter (Dual-Mode: Real Webhooks vs. Simulated Client-Side Pipeline)

window.N8N = {
  backendUrl: "http://localhost:5000/api",

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
        
        const data = await response.json();
        if (onStepUpdate) onStepUpdate("success", "Live Profile Enrichment Complete!");
        return data;
      } catch (err) {
        console.error("n8n profile enrichment webhook error:", err);
        if (onStepUpdate) onStepUpdate("error", "Enrichment error: " + err.message);
        throw err;
      }
    } else {
      // Local Simulation Mode with dynamic calculation
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      
      // Fetch creator data from DB
      const creators = JSON.parse(localStorage.getItem("cl_creators") || "[]");
      const creatorIdx = creators.findIndex(c => c.id === creatorId);
      if (creatorIdx === -1) throw new Error("Creator not found");
      const creator = creators[creatorIdx];
      
      // Step 1: WF-01 Profile Analysis
      if (onStepUpdate) onStepUpdate("wf01", "Running WF-01: Profile Enrichment...");
      await delay(1200);
      
      // Update creator profile enrichment values
      const updatedProfile = {
        is_enriched: true,
        profile_summary: `${creator.full_name} is a rising regional influencer. Renders high-relevance posts focusing on ${creator.categories.join(" and ")} niches. Shows deep demographic trust and regional affinity within ${creator.regions.join("/")}.`,
        strengths: creator.strengths && creator.strengths.length ? creator.strengths : ["Direct local language communication", "Authentic lifestyle representation"],
        weaknesses: creator.weaknesses && creator.weaknesses.length ? creator.weaknesses : ["Low multi-platform cross-posting"],
        missing_info: creator.missing_info && creator.missing_info.length ? creator.missing_info : ["Detailed monthly click-through ratios"],
        profile_completeness: Math.min(100, (creator.profile_completeness || 10) + 15)
      };
      
      creators[creatorIdx] = { ...creator, ...updatedProfile };
      localStorage.setItem("cl_creators", JSON.stringify(creators));
      
      // Step 2: WF-02 Score Engine
      if (onStepUpdate) onStepUpdate("wf02", "Running WF-02: Score Engine...");
      await delay(1200);
      
      // Calculate scores dynamically based on stats
      const baseEngagement = creator.engagement_rate || 5.0;
      
      const trust = Math.min(100, Math.round(75 + baseEngagement * 2));
      const engagement = Math.min(100, Math.round(60 + baseEngagement * 4));
      const regional = creator.regions.includes("Pune") || creator.regions.includes("Indore") ? 92 : 75;
      const consistency = Math.min(100, Math.round(70 + Math.random() * 20));
      const readiness = Math.min(100, Math.round(80 + (creator.pricing_min ? 10 : 0)));
      const completeness = updatedProfile.profile_completeness;
      
      // Weighted Formula
      const finalScore = Math.round(
        trust * 0.25 +
        engagement * 0.20 +
        regional * 0.20 +
        consistency * 0.15 +
        readiness * 0.10 +
        completeness * 0.10
      );
      
      const scoreObj = {
        intelligence_score: finalScore,
        audience_trust: trust,
        engagement_rate: engagement,
        regional_influence: regional,
        content_consistency: consistency,
        brand_readiness: readiness,
        ai_explanation: `Overall profile rating is ${finalScore}/100. Excellent performance on audience trust (${trust}) and regional influence (${regional}) based on local ${creator.languages.join("/")} engagement indicators.`
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
          suggestion_text: `Add more video reels in ${creator.languages[0] || 'regional languages'} to boost your Regional Influence score.`,
          impact_level: "high",
          expected_improvement: 8
        },
        {
          id: "sug-" + Math.random().toString(36).substr(2, 5),
          suggestion_text: "Fill out missing past collaboration cards to increase your Brand Readiness index.",
          impact_level: "medium",
          expected_improvement: 5
        }
      ];
      
      const suggStore = JSON.parse(localStorage.getItem("cl_suggestions") || "{}");
      suggStore[creatorId] = suggestions;
      localStorage.setItem("cl_suggestions", JSON.stringify(suggStore));
      
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
        
        const data = await response.json();
        if (onStepUpdate) onStepUpdate("success", "Live Campaign Sourcing Complete!");
        return data;
      } catch (err) {
        console.error("n8n campaign matching webhook error:", err);
        if (onStepUpdate) onStepUpdate("error", "Matching error: " + err.message);
        throw err;
      }
    } else {
      // Local Simulation Mode with dynamic calculation
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      
      // Fetch Campaign data
      const campaigns = JSON.parse(localStorage.getItem("cl_campaigns") || "[]");
      const campaignIdx = campaigns.findIndex(c => c.id === campaignId);
      if (campaignIdx === -1) throw new Error("Campaign not found");
      const campaign = campaigns[campaignIdx];
      
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
        
        // Save matched properties
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
        
        // Base formulation
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
      // Remove previous matches for this campaign to avoid duplication
      const cleanedMatches = allMatches.filter(m => m.campaign_id !== campaignId);
      localStorage.setItem("cl_matches", JSON.stringify([...cleanedMatches, ...finalMatches]));
      
      if (onStepUpdate) onStepUpdate("complete", "Local Campaign Matching Complete!");
      return finalMatches;
    }
  }
};
