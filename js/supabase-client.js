// Force Live mode to be active for testing
localStorage.setItem("cl_use_live", "true");

window.DB = {
  // Backend URL configuration
  backendUrl: localStorage.getItem("cl_backend_url") || ((window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "http://localhost:5000/api" : (window.location.hostname.includes("vercel.app") ? "https://creatorlens-symr.onrender.com/api" : window.location.origin + "/api")),

  // Check if live config is set
  isLive: function() {
    const val = localStorage.getItem("cl_use_live");
    if (val === null) {
      localStorage.setItem("cl_use_live", "true");
      return true;
    }
    return val === "true";
  },

  // Initialize data stores on load
  init: function() {
    if (!localStorage.getItem("cl_users")) {
      const initialUsers = [
        { id: "creator-anjali-verma", email: "anjali@creator.com", role: "creator" },
        { id: "creator-rahul-kapoor", email: "rahul@creator.com", role: "creator" },
        { id: "creator-priya-sharma", email: "priya@creator.com", role: "creator" },
        { id: "creator-sneha-reddy", email: "sneha@creator.com", role: "creator" },
        { id: "brand-1", email: "brand@swadspices.com", role: "brand" },
        { id: "admin-1", email: "admin@creatorlens.com", role: "admin" }
      ];
      localStorage.setItem("cl_users", JSON.stringify(initialUsers));
    }
    
    if (!localStorage.getItem("cl_creators")) {
      const originalCreators = window.mockData.creators;
      const creators = [];
      const aiAnalysis = {};

      originalCreators.forEach(c => {
        aiAnalysis[c.id] = {
          creator_id: c.id,
          profile_summary: c.profile_summary,
          profile_completeness: c.profile_completeness || 85,
          strengths: c.strengths || [],
          weaknesses: c.weaknesses || [],
          missing_information: c.missing_info || [],
          ai_version: 'Gemini-1.5-pro',
          workflow_version: 'WF-v1.0',
          confidence_score: 1.00,
          analyzed_at: new Date().toISOString()
        };

        creators.push({
          id: c.id,
          creator_code: c.creator_code,
          full_name: c.full_name,
          avatar_url: c.avatar_url,
          bio: c.bio,
          categories: c.categories,
          languages: c.languages,
          regions: c.regions,
          followers_count: c.followers_count,
          average_views: c.average_views,
          pricing_min: c.pricing_min,
          pricing_premium: c.pricing_premium,
          engagement_rate: c.engagement_rate,
          ai_status: c.is_enriched ? 'Completed' : 'Pending'
        });
      });

      localStorage.setItem("cl_creators", JSON.stringify(creators));
      localStorage.setItem("cl_creator_ai_analysis", JSON.stringify(aiAnalysis));
    }

    if (!localStorage.getItem("cl_workflow_logs")) {
      localStorage.setItem("cl_workflow_logs", JSON.stringify([]));
    }

    if (!localStorage.getItem("cl_ai_jobs")) {
      localStorage.setItem("cl_ai_jobs", JSON.stringify([]));
    }

    if (!localStorage.getItem("cl_pricing_recommendations")) {
      localStorage.setItem("cl_pricing_recommendations", JSON.stringify([]));
    }
    
    if (!localStorage.getItem("cl_scores")) {
      localStorage.setItem("cl_scores", JSON.stringify(window.mockData.creatorScores));
    }
    
    if (!localStorage.getItem("cl_suggestions")) {
      localStorage.setItem("cl_suggestions", JSON.stringify(window.mockData.creatorSuggestions));
    }
    
    if (!localStorage.getItem("cl_campaigns")) {
      localStorage.setItem("cl_campaigns", JSON.stringify(window.mockData.campaigns));
    }

    if (!localStorage.getItem("cl_brands")) {
      localStorage.setItem("cl_brands", JSON.stringify(window.mockData.brands));
    }
    
    if (!localStorage.getItem("cl_matches")) {
      localStorage.setItem("cl_matches", JSON.stringify([]));
    }

    if (!localStorage.getItem("cl_collabs")) {
      localStorage.setItem("cl_collabs", JSON.stringify([]));
    }
  },

  // Compatibility placeholder for UI settings verify loader
  loadSupabaseScript: function() {
    return Promise.resolve();
  },

  // Helper method for REST API requests
  request: async function(endpoint, options = {}) {
    const url = `${this.backendUrl}/${endpoint}`;
    
    // Set headers
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };
    
    // Add auth token if available
    const token = localStorage.getItem("cl_auth_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      let errorMessage = "Request failed";
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {}
      throw new Error(errorMessage);
    }

    return await response.json();
  },

  // Auth Operations
  register: async function(email, password, role, full_name) {
    if (this.isLive()) {
      const data = await this.request("auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, role, full_name })
      });
      return data.user;
    } else {
      // Local Registration
      const users = JSON.parse(localStorage.getItem("cl_users") || "[]");
      if (users.find(u => u.email === email)) {
        throw new Error("Email already registered");
      }
      
      const id = "local-" + Math.random().toString(36).substr(2, 9);
      const newUser = { id, email, role };
      users.push(newUser);
      localStorage.setItem("cl_users", JSON.stringify(users));
      
      if (role === "creator") {
        const creators = JSON.parse(localStorage.getItem("cl_creators") || "[]");
        const nextNum = creators.length + 5;
        const creator_code = "CR_" + String(nextNum).padStart(3, "0");
        creators.push({
          id,
          creator_code,
          full_name: full_name || email.split("@")[0],
          avatar_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
          bio: "New Creator Onboard",
          categories: [],
          languages: [],
          regions: [],
          followers_count: 0,
          engagement_rate: 0,
          average_views: 0,
          profile_completeness: 10,
          is_enriched: false
        });
        localStorage.setItem("cl_creators", JSON.stringify(creators));
      } else if (role === "brand") {
        const brands = JSON.parse(localStorage.getItem("cl_brands") || "{}");
        const nextNum = Object.keys(brands).length + 2;
        const brand_code = "BR_" + String(nextNum).padStart(3, "0");
        brands[id] = {
          id,
          brand_code,
          company_name: email.split("@")[0] + " Corp",
          website: "",
          industry: "",
          bio: ""
        };
        localStorage.setItem("cl_brands", JSON.stringify(brands));
      }
      
      return newUser;
    }
  },

  login: async function(email, password) {
    if (this.isLive()) {
      const data = await this.request("auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      if (data.token) {
        localStorage.setItem("cl_auth_token", data.token);
      }
      return data.user;
    } else {
      // Local Auth Match
      const users = JSON.parse(localStorage.getItem("cl_users") || "[]");
      const user = users.find(u => u.email === email);
      if (!user) {
        throw new Error("Invalid credentials or user not found");
      }
      return user;
    }
  },

  // Profile management
  getProfile: async function(userId, role) {
    if (this.isLive()) {
      const route = role === "creator" ? "creators" : "brands";
      return await this.request(`${route}/profile/${userId}`);
    } else {
      if (role === "creator") {
        const creators = JSON.parse(localStorage.getItem("cl_creators") || "[]");
        const creator = creators.find(c => c.id === userId) || null;
        if (creator) {
          const aiAnalysis = JSON.parse(localStorage.getItem("cl_creator_ai_analysis") || "{}");
          if (aiAnalysis[userId]) {
            return { ...creator, ...aiAnalysis[userId] };
          }
        }
        return creator;
      } else {
        const brands = JSON.parse(localStorage.getItem("cl_brands") || "{}");
        return brands[userId] || null;
      }
    }
  },

  saveProfile: async function(userId, role, profileData) {
    if (this.isLive()) {
      const route = role === "creator" ? "creators" : "brands";
      const data = await this.request(`${route}/profile`, {
        method: "POST",
        body: JSON.stringify({ id: userId, ...profileData })
      });
      return data.profile;
    } else {
      if (role === "creator") {
        const creators = JSON.parse(localStorage.getItem("cl_creators") || "[]");
        const idx = creators.findIndex(c => c.id === userId);
        const coreProfile = {
          id: userId,
          creator_code: profileData.creator_code || (creators[idx] && creators[idx].creator_code) || ("CR_" + String(creators.length + 5).padStart(3, "0")),
          full_name: profileData.full_name,
          avatar_url: profileData.avatar_url,
          bio: profileData.bio,
          categories: profileData.categories || [],
          languages: profileData.languages || [],
          regions: profileData.regions || [],
          followers_count: profileData.followers_count || 0,
          average_views: profileData.average_views || 0,
          pricing_min: profileData.pricing_min || 0,
          pricing_premium: profileData.pricing_premium || 0,
          engagement_rate: profileData.engagement_rate || 0,
          ai_status: profileData.ai_status || 'Not Started',
          profile_status: profileData.profile_status || 'Incomplete',
          city: profileData.city || null,
          state: profileData.state || null,
          social_links: profileData.social_links || {},
          audience_metadata: profileData.audience_metadata || {},
          collab_metadata: profileData.collab_metadata || {}
        };

        if (idx !== -1) {
          creators[idx] = coreProfile;
        } else {
          creators.push(coreProfile);
        }
        localStorage.setItem("cl_creators", JSON.stringify(creators));

        // Save simulated AI analysis block if present
        if (profileData.profile_summary || profileData.strengths) {
          const aiAnalysis = JSON.parse(localStorage.getItem("cl_creator_ai_analysis") || "{}");
          aiAnalysis[userId] = {
            creator_id: userId,
            profile_summary: profileData.profile_summary || profileData.bio,
            profile_completeness: profileData.profile_completeness || 100,
            strengths: profileData.strengths || [],
            weaknesses: profileData.weaknesses || [],
            missing_information: profileData.missing_information || profileData.missing_info || [],
            ai_version: 'Gemini-1.5-pro',
            workflow_version: 'WF-v1.0',
            confidence_score: 1.00,
            analyzed_at: new Date().toISOString()
          };
          localStorage.setItem("cl_creator_ai_analysis", JSON.stringify(aiAnalysis));
        }

        return coreProfile;
      } else {
        const brands = JSON.parse(localStorage.getItem("cl_brands") || "{}");
        brands[userId] = { ...brands[userId], ...profileData };
        localStorage.setItem("cl_brands", JSON.stringify(brands));
        return brands[userId];
      }
    }
  },

  // Scoring Operations
  getCreatorScores: async function(creatorId) {
    if (this.isLive()) {
      try {
        const data = await this.request(`creators/dashboard/${creatorId}`);
        return data.scores;
      } catch (err) {
        console.error("Failed to fetch creator scores:", err);
        return null;
      }
    } else {
      const scores = JSON.parse(localStorage.getItem("cl_scores") || "{}");
      return scores[creatorId] || null;
    }
  },

  getSuggestions: async function(creatorId) {
    if (this.isLive()) {
      try {
        const data = await this.request(`creators/dashboard/${creatorId}`);
        return data.suggestions;
      } catch (err) {
        console.error("Failed to fetch creator suggestions:", err);
        return [];
      }
    } else {
      const sugg = JSON.parse(localStorage.getItem("cl_suggestions") || "{}");
      return sugg[creatorId] || [];
    }
  },

  // Campaign management
  createCampaign: async function(campaignData) {
    if (this.isLive()) {
      const data = await this.request("campaigns", {
        method: "POST",
        body: JSON.stringify(campaignData)
      });
      return data.campaign;
    } else {
      const campaigns = JSON.parse(localStorage.getItem("cl_campaigns") || "[]");
      const id = "camp-" + Math.random().toString(36).substr(2, 9);
      const newCamp = { id, ...campaignData, created_at: new Date().toISOString(), status: "active" };
      campaigns.push(newCamp);
      localStorage.setItem("cl_campaigns", JSON.stringify(campaigns));
      return newCamp;
    }
  },

  getCampaigns: async function(brandId) {
    if (this.isLive()) {
      return await this.request(`campaigns?brand_id=${brandId}`);
    } else {
      const campaigns = JSON.parse(localStorage.getItem("cl_campaigns") || "[]");
      return campaigns.filter(c => c.brand_id === brandId);
    }
  },

  deleteCampaign: async function(campId) {
    if (this.isLive()) {
      return await this.request(`campaigns/${campId}`, {
        method: "DELETE"
      });
    } else {
      const campaigns = JSON.parse(localStorage.getItem("cl_campaigns") || "[]");
      const idx = campaigns.findIndex(c => c.id === campId);
      if (idx !== -1) {
        campaigns.splice(idx, 1);
        localStorage.setItem("cl_campaigns", JSON.stringify(campaigns));
        return true;
      }
      return false;
    }
  },

  getAllCampaigns: async function() {
    if (this.isLive()) {
      return await this.request("campaigns");
    } else {
      return JSON.parse(localStorage.getItem("cl_campaigns") || "[]");
    }
  },

  // Match management
  getCampaignMatches: async function(campaignId) {
    if (this.isLive()) {
      const matches = await this.request(`campaigns/${campaignId}/matches`);
      return matches.map(m => ({
        ...m,
        creator: m.creator // structured mapping from join
      }));
    } else {
      const matches = JSON.parse(localStorage.getItem("cl_matches") || "[]");
      const creators = JSON.parse(localStorage.getItem("cl_creators") || "[]");
      const aiAnalysis = JSON.parse(localStorage.getItem("cl_creator_ai_analysis") || "{}");
      
      const filtered = matches.filter(m => m.campaign_id === campaignId);
      return filtered.map(m => {
        const creator = creators.find(c => c.id === m.creator_id);
        const mergedCreator = creator ? { ...creator, ...(aiAnalysis[creator.id] || {}) } : null;
        return {
          ...m,
          creator: mergedCreator
        };
      });
    }
  },

  // Collaboration request trackers
  saveCollabRequest: async function(request) {
    if (this.isLive()) {
      const data = await this.request("collaborations", {
        method: "POST",
        body: JSON.stringify(request)
      });
      return data.collaboration;
    } else {
      const collabs = JSON.parse(localStorage.getItem("cl_collabs") || "[]");
      const id = "collab-" + Math.random().toString(36).substr(2, 9);
      const newCollab = { id, ...request, created_at: new Date().toISOString(), status: "pending" };
      collabs.push(newCollab);
      localStorage.setItem("cl_collabs", JSON.stringify(collabs));
      return newCollab;
    }
  },

  getCollabsForCreator: async function(creatorId) {
    if (this.isLive()) {
      try {
        const data = await this.request(`creators/dashboard/${creatorId}`);
        return data.requests;
      } catch (err) {
        console.error("Failed to fetch creator collabs:", err);
        return [];
      }
    } else {
      const collabs = JSON.parse(localStorage.getItem("cl_collabs") || "[]");
      const campaigns = JSON.parse(localStorage.getItem("cl_campaigns") || "[]");
      const brands = JSON.parse(localStorage.getItem("cl_brands") || "{}");
      
      const filtered = collabs.filter(c => c.creator_id === creatorId);
      return filtered.map(c => ({
        ...c,
        campaign: campaigns.find(camp => camp.id === c.campaign_id),
        brand: brands[c.brand_id]
      }));
    }
  },

  updateCollabStatus: async function(collabId, status, price_justification = undefined) {
    if (this.isLive()) {
      const body = { status };
      if (price_justification !== undefined) body.price_justification = price_justification;
      const data = await this.request(`collaborations/${collabId}`, {
        method: "PATCH",
        body: JSON.stringify(body)
      });
      return data.collaboration;
    } else {
      const collabs = JSON.parse(localStorage.getItem("cl_collabs") || "[]");
      const idx = collabs.findIndex(c => c.id === collabId);
      if (idx !== -1) {
        collabs[idx].status = status;
        if (price_justification !== undefined) collabs[idx].price_justification = price_justification;
        localStorage.setItem("cl_collabs", JSON.stringify(collabs));
        return collabs[idx];
      }
      return null;
    }
  },

  getCollabsForBrand: async function(brandId) {
    if (this.isLive()) {
      return await this.request(`collaborations?brand_id=${brandId}`);
    } else {
      const collabs = JSON.parse(localStorage.getItem("cl_collabs") || "[]");
      const campaigns = JSON.parse(localStorage.getItem("cl_campaigns") || "[]");
      const creators = JSON.parse(localStorage.getItem("cl_creators") || "[]");
      
      const filtered = collabs.filter(c => c.brand_id === brandId);
      return filtered.map(c => ({
        ...c,
        campaign: campaigns.find(camp => camp.id === c.campaign_id),
        creator: creators.find(cr => cr.id === c.creator_id)
      }));
    }
  },

  updateCampaign: async function(campaignId, updateData) {
    if (this.isLive()) {
      const data = await this.request(`campaigns/${campaignId}`, {
        method: "PATCH",
        body: JSON.stringify(updateData)
      });
      return data.campaign;
    } else {
      const campaigns = JSON.parse(localStorage.getItem("cl_campaigns") || "[]");
      const idx = campaigns.findIndex(c => c.id === campaignId);
      if (idx !== -1) {
        campaigns[idx] = { ...campaigns[idx], ...updateData };
        localStorage.setItem("cl_campaigns", JSON.stringify(campaigns));
        return campaigns[idx];
      }
      throw new Error("Campaign not found");
    }
  },

  getAdminDashboard: async function() {
    if (this.isLive()) {
      return await this.request("admin/dashboard");
    } else {
      const creators = JSON.parse(localStorage.getItem("cl_creators") || "[]");
      const brands = JSON.parse(localStorage.getItem("cl_brands") || "[]");
      const campaigns = JSON.parse(localStorage.getItem("cl_campaigns") || "[]");
      const collabs = JSON.parse(localStorage.getItem("cl_collabs") || "[]");
      return {
        stats: {
          totalCreators: creators.length,
          totalBrands: brands.length,
          activeCampaigns: campaigns.filter(c => c.status === "active").length,
          activeCollaborations: collabs.filter(c => c.status === "accepted" || c.status === "completed").length
        },
        recentActivity: [
          { type: 'creator_registration', message: 'New Creator registered: "Rahul Kapoor"', created_at: new Date().toISOString() },
          { type: 'campaign_published', message: 'Campaign published: "Masala Chai Rollout"', created_at: new Date().toISOString() }
        ]
      };
    }
  },

  getAdminCreators: async function() {
    if (this.isLive()) {
      return await this.request("admin/creators");
    } else {
      const creators = JSON.parse(localStorage.getItem("cl_creators") || "[]");
      const scores = JSON.parse(localStorage.getItem("cl_scores") || "{}");
      return creators.map(c => ({
        ...c,
        creator_scores: scores[c.id] ? [scores[c.id]] : []
      }));
    }
  },

  getAdminBrands: async function() {
    if (this.isLive()) {
      return await this.request("admin/brands");
    } else {
      const brands = JSON.parse(localStorage.getItem("cl_brands") || "[]");
      const campaigns = JSON.parse(localStorage.getItem("cl_campaigns") || "[]");
      const collabs = JSON.parse(localStorage.getItem("cl_collabs") || "[]");
      return brands.map(b => {
        const brandCamps = campaigns.filter(c => c.brand_id === b.id);
        const brandCollabs = collabs.filter(c => c.brand_id === b.id);
        return {
          ...b,
          campaigns_count: brandCamps.length,
          active_campaigns_count: brandCamps.filter(c => c.status === "active").length,
          collaborations_count: brandCollabs.length
        };
      });
    }
  },

  getAdminCampaigns: async function() {
    if (this.isLive()) {
      return await this.request("admin/campaigns");
    } else {
      const campaigns = JSON.parse(localStorage.getItem("cl_campaigns") || "[]");
      const brands = JSON.parse(localStorage.getItem("cl_brands") || "[]");
      const collabs = JSON.parse(localStorage.getItem("cl_collabs") || "[]");
      return campaigns.map(c => {
        const brand = brands.find(b => b.id === c.brand_id);
        const campCollabs = collabs.filter(col => col.campaign_id === c.id && col.initiated_by === 'creator');
        return {
          ...c,
          brand_name: brand ? brand.company_name : "A Brand",
          applications_count: campCollabs.length
        };
      });
    }
  },

  getAdminCollaborations: async function() {
    if (this.isLive()) {
      return await this.request("admin/collaborations");
    } else {
      const collabs = JSON.parse(localStorage.getItem("cl_collabs") || "[]");
      const campaigns = JSON.parse(localStorage.getItem("cl_campaigns") || "[]");
      const creators = JSON.parse(localStorage.getItem("cl_creators") || "[]");
      const brands = JSON.parse(localStorage.getItem("cl_brands") || "[]");
      return collabs.map(c => ({
        ...c,
        campaign: campaigns.find(camp => camp.id === c.campaign_id),
        creator: creators.find(cr => cr.id === c.creator_id),
        brand: brands.find(b => b.id === c.brand_id)
      }));
    }
  }
};
