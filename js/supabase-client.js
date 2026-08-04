// Supabase Database Adapter (Dual-Mode: Local Demo State vs. Live Supabase API)

window.DB = {
  // Check if live config is set
  isLive: function() {
    return localStorage.getItem("cl_use_live") === "true" &&
           !!localStorage.getItem("cl_supabase_url") &&
           !!localStorage.getItem("cl_supabase_key");
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

    // Try loading Supabase live client if active
    if (this.isLive()) {
      this.loadSupabaseScript();
    }
  },

  loadSupabaseScript: function() {
    if (window.supabase) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      script.onload = () => {
        const url = localStorage.getItem("cl_supabase_url");
        const key = localStorage.getItem("cl_supabase_key");
        try {
          window.supabaseClient = window.supabase.createClient(url, key);
          resolve();
        } catch (e) {
          console.error("Failed to init live Supabase Client:", e);
          reject(e);
        }
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  },

  // Auth Operations
  register: async function(email, password, role) {
    if (this.isLive()) {
      await this.loadSupabaseScript();
      const { data, error } = await window.supabaseClient.auth.signUp({ email, password });
      if (error) throw error;
      
      const user = data.user;
      
      // Save role profile into custom users table
      const { error: dbError } = await window.supabaseClient
        .from("users")
        .insert([{ id: user.id, email, role }]);
      
      if (dbError) throw dbError;
      
      // Initialize profile tables
      if (role === "creator") {
        await window.supabaseClient.from("creators").insert([{ id: user.id, full_name: email.split("@")[0] }]);
      } else if (role === "brand") {
        await window.supabaseClient.from("brands").insert([{ id: user.id, company_name: email.split("@")[0] }]);
      }
      
      return { id: user.id, email, role };
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
      await this.loadSupabaseScript();
      const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      const user = data.user;
      
      // Fetch role details
      const { data: userData, error: dbError } = await window.supabaseClient
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
        
      if (dbError) throw dbError;
      
      return { id: user.id, email, role: userData.role };
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
      const table = role === "creator" ? "creators" : "brands";
      const { data, error } = await window.supabaseClient
        .from(table)
        .select("*")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data;
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
      const table = role === "creator" ? "creators" : "brands";
      const { data, error } = await window.supabaseClient
        .from(table)
        .update(profileData)
        .eq("id", userId)
        .select()
        .single();
      if (error) throw error;
      return data;
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
      const { data, error } = await window.supabaseClient
        .from("creator_scores")
        .select("*")
        .eq("creator_id", creatorId)
        .single();
      if (error && error.code !== "PGRST116") throw error; // PGRST116 is empty row
      return data;
    } else {
      const scores = JSON.parse(localStorage.getItem("cl_scores") || "{}");
      return scores[creatorId] || null;
    }
  },

  getSuggestions: async function(creatorId) {
    if (this.isLive()) {
      const { data, error } = await window.supabaseClient
        .from("creator_ai_suggestions")
        .select("*")
        .eq("creator_id", creatorId);
      if (error) throw error;
      return data;
    } else {
      const sugg = JSON.parse(localStorage.getItem("cl_suggestions") || "{}");
      return sugg[creatorId] || [];
    }
  },

  // Campaign management
  createCampaign: async function(campaignData) {
    if (this.isLive()) {
      const { data, error } = await window.supabaseClient
        .from("campaigns")
        .insert([campaignData])
        .select()
        .single();
      if (error) throw error;
      return data;
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
      const { data, error } = await window.supabaseClient
        .from("campaigns")
        .select("*")
        .eq("brand_id", brandId);
      if (error) throw error;
      return data;
    } else {
      const campaigns = JSON.parse(localStorage.getItem("cl_campaigns") || "[]");
      return campaigns.filter(c => c.brand_id === brandId);
    }
  },

  getAllCampaigns: async function() {
    if (this.isLive()) {
      const { data, error } = await window.supabaseClient.from("campaigns").select("*");
      if (error) throw error;
      return data;
    } else {
      return JSON.parse(localStorage.getItem("cl_campaigns") || "[]");
    }
  },

  // Match management
  getCampaignMatches: async function(campaignId) {
    if (this.isLive()) {
      const { data, error } = await window.supabaseClient
        .from("campaign_matches")
        .select("*, creators(*)")
        .eq("campaign_id", campaignId);
      if (error) throw error;
      return data.map(m => ({
        ...m,
        creator: m.creators // map naming
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
      const { data, error } = await window.supabaseClient
        .from("collaboration_requests")
        .insert([request])
        .select()
        .single();
      if (error) throw error;
      return data;
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
      const { data, error } = await window.supabaseClient
        .from("collaboration_requests")
        .select("*, campaigns(*), brands(*)")
        .eq("creator_id", creatorId);
      if (error) throw error;
      return data;
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
      const { data, error } = await window.supabaseClient
        .from("collaboration_requests")
        .update({ status })
        .eq("id", collabId)
        .select()
        .single();
      if (error) throw error;
      return data;
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
