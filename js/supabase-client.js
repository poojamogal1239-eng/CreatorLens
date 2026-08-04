// Supabase Database Adapter (Dual-Mode: Local Demo State vs. REST API Backend)

window.DB = {
  // Backend URL configuration
  backendUrl: "http://localhost:5000/api",

  // Check if live config is set
  isLive: function() {
    return localStorage.getItem("cl_use_live") === "true";
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
      localStorage.setItem("cl_creators", JSON.stringify(window.mockData.creators));
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
  register: async function(email, password, role) {
    if (this.isLive()) {
      const data = await this.request("auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, role })
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
        creators.push({
          id,
          full_name: email.split("@")[0],
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
        brands[id] = {
          id,
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
        return creators.find(c => c.id === userId) || null;
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
        if (idx !== -1) {
          creators[idx] = { ...creators[idx], ...profileData };
          localStorage.setItem("cl_creators", JSON.stringify(creators));
          return creators[idx];
        }
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
      
      const filtered = matches.filter(m => m.campaign_id === campaignId);
      return filtered.map(m => ({
        ...m,
        creator: creators.find(c => c.id === m.creator_id)
      }));
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

  updateCollabStatus: async function(collabId, status) {
    if (this.isLive()) {
      const data = await this.request(`collaborations/${collabId}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      return data.collaboration;
    } else {
      const collabs = JSON.parse(localStorage.getItem("cl_collabs") || "[]");
      const idx = collabs.findIndex(c => c.id === collabId);
      if (idx !== -1) {
        collabs[idx].status = status;
        localStorage.setItem("cl_collabs", JSON.stringify(collabs));
        return collabs[idx];
      }
      return null;
    }
  }
};
