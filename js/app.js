// CreatorLens Platform MVP Coordinator & State Controller

window.App = {
  currentUser: null,
  activeSubview: "",
  selectedCampaignId: null,
  activeSearchTags: [],

  pendingRole: null,

  // Bootstrapping
  init: function() {
    // Init Database Adapters
    window.DB.init();
    
    // Check existing session
    const savedUser = localStorage.getItem("cl_session_user");
    if (savedUser) {
      this.currentUser = JSON.parse(savedUser);
    }

    // Set up theme on load
    const savedTheme = localStorage.getItem("cl_active_theme") || "glass";
    this.setTheme(savedTheme);
    
    // Listen for click events outside to close custom selects
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".custom-select")) {
        document.querySelectorAll(".custom-select").forEach(el => el.classList.remove("active"));
      }
    });
    
    // Listen for route changes (enables native back buttons!)
    window.addEventListener("hashchange", () => this.handleRouting());
    
    // Initial route parse
    this.handleRouting();
    
    // Start hero storytelling rotation animation
    this.startHeroStorytellingCycle();
  },

  // Hash-based Router
  handleRouting: function() {
    const hash = window.location.hash || "#/";
    const path = hash.substring(2); // remove #/
    
    // Reset window/document scroll positions to top on layout transitions
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    this.adminLog(`Routing change: ${hash}`);
    
    if (path === "" || path === "/") {
      this.showLandingLayout();
      return;
    }
    
    if (path === "login" || path === "register") {
      // Ensure layout
      document.getElementById("view-landing").style.display = "none";
      document.getElementById("view-auth").style.display = "flex";
      document.getElementById("view-main").style.display = "none";
      
      const isLogin = path === "login";
      this.setAuthTab(isLogin ? "login" : "register");
      
      if (!isLogin && this.pendingRole) {
        const val = this.pendingRole;
        document.getElementById("auth-role").value = val;
        
        // Sync custom select trigger text and option active status
        const text = val === "creator" ? "Regional Content Creator" : "Brand Marketing Manager";
        document.getElementById("custom-role-selected-text").textContent = text;
        
        const opts = document.querySelectorAll("#custom-role-select .custom-select-option");
        opts.forEach(o => {
          o.classList.toggle("active", o.getAttribute("data-value") === val);
        });
        
        this.pendingRole = null; // consume
      }
      return;
    }
    
    // Check session for dashboard views
    if (!this.currentUser) {
      window.location.hash = "#/";
      return;
    }
    
    // Ensure dashboard layout is visible
    document.getElementById("view-landing").style.display = "none";
    document.getElementById("view-auth").style.display = "none";
    document.getElementById("view-main").style.display = "flex";
    
    // Refresh sidebar details
    document.getElementById("nav-user-name").textContent = this.currentUser.email.split("@")[0];
    document.getElementById("nav-user-role").textContent = this.currentUser.role;
    document.getElementById("nav-user-avatar").textContent = this.currentUser.email.charAt(0).toUpperCase();
    this.renderNavigation();
    
    // Render the specific subview content
    this.renderSubviewElements(path);
  },

  // Auth Layout handlers
  showAuthLayout: function(registerMode = null, role = null) {
    if (role) {
      this.pendingRole = role;
    }
    if (registerMode === "register") {
      window.location.hash = "#/register";
    } else {
      window.location.hash = "#/login";
    }
  },

  showLandingLayout: function() {
    document.getElementById("view-landing").style.display = "block";
    document.getElementById("view-auth").style.display = "none";
    document.getElementById("view-main").style.display = "none";
    
    // Load initial sandbox content
    setTimeout(() => {
      this.selectSandboxTag("Marathi");
    }, 100);
  },

  showMainLayout: function() {
    // Redirect to dashboard hash depending on role
    if (this.currentUser.role === "creator") {
      window.location.hash = "#/creator-dashboard";
    } else if (this.currentUser.role === "brand") {
      window.location.hash = "#/brand-dashboard";
    } else {
      window.location.hash = "#/admin-dashboard";
    }
  },

  setAuthTab: function(tab) {
    const isLogin = tab === "login";
    
    // Sync hash if different to support browser navigation correctly
    const targetHash = isLogin ? "#/login" : "#/register";
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
    
    document.getElementById("tab-login").classList.toggle("active", isLogin);
    document.getElementById("tab-register").classList.toggle("active", !isLogin);
    
    document.getElementById("reg-role-group").style.display = isLogin ? "none" : "block";
    document.getElementById("auth-submit-btn").textContent = isLogin ? "Login Account →" : "Create New Account →";
    document.getElementById("auth-form").dataset.mode = tab;
    
    // Reset password toggle and error message when switching tabs
    const errBox = document.getElementById("auth-error-message");
    if (errBox) errBox.style.display = "none";
    const pwdInput = document.getElementById("auth-password");
    if (pwdInput) pwdInput.type = "password";
    const eye = document.getElementById("toggle-password-eye");
    if (eye) eye.textContent = "👁️";
    
    // Reset page scrolls to top of viewport
    window.scrollTo({ top: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  },

  handleAuthSubmit: async function(e) {
    e.preventDefault();
    const email = document.getElementById("auth-email").value;
    const mode = document.getElementById("auth-form").dataset.mode;
    const submitBtn = document.getElementById("auth-submit-btn");
    const isOtp = document.getElementById("otp-input-group").style.display === "block";
    
    submitBtn.disabled = true;
    
    const errBox = document.getElementById("auth-error-message");
    if (errBox) errBox.style.display = "none";
    
    if (isOtp) {
      this.otpEmailTarget = email;
      document.getElementById("otp-sent-target-email").textContent = email;
      document.getElementById("auth-main-panel").style.display = "none";
      document.getElementById("auth-otp-verify-panel").style.display = "block";
      
      // Start the countdown timer
      this.startOtpTimer();
      submitBtn.disabled = false;
      return;
    }
    
    const password = document.getElementById("auth-password").value;
    submitBtn.textContent = "Processing details...";
    
    try {
      if (mode === "login") {
        this.currentUser = await window.DB.login(email, password);
      } else {
        const role = document.getElementById("auth-role").value;
        this.currentUser = await window.DB.register(email, password, role);
      }
      
      localStorage.setItem("cl_session_user", JSON.stringify(this.currentUser));
      this.showMainLayout();
    } catch (err) {
      this.showToast(err.message, "error");
      const errBox = document.getElementById("auth-error-message");
      if (errBox) {
        errBox.textContent = err.message;
        errBox.style.display = "block";
      }
      submitBtn.disabled = false;
      submitBtn.textContent = mode === "login" ? "Login Account →" : "Create New Account →";
    }
  },

  handleSocialLogin: function(provider) {
    this.showToast(`Simulating secure redirect to ${provider} OAuth...`, "info");
    setTimeout(() => {
      this.currentUser = {
        id: "creator-priya-sharma",
        email: "priya.sharma@creatorlens.ai",
        role: "creator",
        session: "google-oauth-mock-session-991823"
      };
      localStorage.setItem("cl_session_user", JSON.stringify(this.currentUser));
      this.showToast(`Authenticated successfully via Google!`, "success");
      this.showMainLayout();
    }, 1200);
  },

  toggleOtpLogin: function() {
    const isOtp = document.getElementById("otp-input-group").style.display === "block";
    const otpInputGroup = document.getElementById("otp-input-group");
    const passInputGroup = document.getElementById("password-input-group");
    const otpToggleText = document.getElementById("otp-toggle-btn-text");
    const submitBtn = document.getElementById("auth-submit-btn");
    
    if (isOtp) {
      otpInputGroup.style.display = "none";
      document.getElementById("auth-otp").required = false;
      passInputGroup.style.display = "block";
      document.getElementById("auth-password").required = true;
      otpToggleText.textContent = "Use OTP Login";
      submitBtn.textContent = document.getElementById("auth-form").dataset.mode === "login" ? "Login Account →" : "Create New Account →";
    } else {
      otpInputGroup.style.display = "block";
      document.getElementById("auth-otp").required = true;
      passInputGroup.style.display = "none";
      document.getElementById("auth-password").required = false;
      otpToggleText.textContent = "Use Password Login";
      submitBtn.textContent = "Request & Verify OTP →";
    }
  },

  showDemoVideo: function() {
    // Render simple modal window showing project overview details
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay active";
    overlay.id = "demo-video-modal";
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    };
    
    overlay.innerHTML = `
      <div class="modal-content glass-card" style="max-width: 500px; padding: 30px; text-align: center;">
        <h3 style="font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 12px;">Welcome to CreatorLens</h3>
        <p class="view-subtitle" style="font-size: 13px; line-height: 1.6; margin-bottom: 20px; color: #94A3B8;">
          CreatorLens is India's smartest AI operating system for creator intelligence. Watch the tour below to see how our n8n parsing chains compute real-time scores, map affinities, and recommend transparent pricing.
        </p>
        <div style="background: rgba(0,0,0,0.3); border-radius: 12px; border: 1px solid var(--color-border); padding: 40px 20px; margin-bottom: 24px; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px;">
          <svg viewBox="0 0 24 24" width="48" height="48" stroke="var(--color-primary-cyan)" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:12px;"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
          <div style="font-weight: 600; color: #fff; font-size: 14px;">Demo Tour Sandbox</div>
          <div style="font-size: 11px; color: var(--color-text-gray); margin-top: 4px;">Click tags in the sandbox below the hero area to see Live Match Engine outputs!</div>
        </div>
        <button class="btn btn-primary" onclick="document.getElementById('demo-video-modal').remove()">Close Tour</button>
      </div>
    `;
    document.body.appendChild(overlay);
  },

  handleLogout: function() {
    localStorage.removeItem("cl_session_user");
    this.adminLog(`User ${this.currentUser.email} logged out.`);
    this.currentUser = null;
    this.showAuthLayout();
  },

  toggleUserDropdown: function() {
    const drop = document.getElementById("top-nav-user-dropdown");
    if (drop) {
      drop.style.display = drop.style.display === "none" ? "block" : "none";
    }
  },

  toggleAiAssistant: function() {
    this.showToast("AI Assistant activated. Ask anything or search recommendations!", "info");
    const search = document.getElementById("global-ai-search");
    if (search) search.focus();
  },

  togglePasswordVisibility: function() {
    const pwdInput = document.getElementById("auth-password");
    const eye = document.getElementById("toggle-password-eye");
    if (pwdInput && eye) {
      if (pwdInput.type === "password") {
        pwdInput.type = "text";
        eye.textContent = "👁️‍🗨️";
      } else {
        pwdInput.type = "password";
        eye.textContent = "👁️";
      }
    }
  },

  handleProfileMenuClick: function() {
    if (this.currentUser.role === "creator") {
      this.switchSubview("creator-profile-mgmt");
    } else if (this.currentUser.role === "brand") {
      this.switchSubview("brand-settings");
    }
  },

  handleSettingsMenuClick: function() {
    if (this.currentUser.role === "creator") {
      this.switchSubview("creator-settings");
    } else if (this.currentUser.role === "brand") {
      this.switchSubview("brand-settings");
    }
  },

  // Sidebar Layout rendering
  renderNavigation: function() {
    const menuContainer = document.getElementById("sidebar-menu-list");
    menuContainer.innerHTML = "";
    
    const role = this.currentUser.role;
    
    const icons = {
      dashboard: `<svg class="sidebar-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>`,
      profile: `<svg class="sidebar-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
      campaigns: `<svg class="sidebar-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>`,
      search: `<svg class="sidebar-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
      admin: `<svg class="sidebar-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`,
      notifications: `<svg class="sidebar-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`,
      settings: `<svg class="sidebar-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
      intelligence: `<svg class="sidebar-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path><circle cx="12" cy="12" r="4"></circle></svg>`
    };
    
    let menuItems = [];
    if (role === "creator") {
      menuItems = [
        { id: "creator-dashboard", label: "Dashboard", svg: icons.dashboard },
        { id: "creator-intelligence", label: "Creator Intelligence", svg: icons.intelligence },
        { id: "creator-campaign-discovery", label: "Campaign Marketplace", svg: icons.search },
        { id: "creator-my-campaigns", label: "My Campaigns", svg: icons.campaigns },
        { id: "creator-profile-mgmt", label: "My Profile", svg: icons.profile },
        { id: "notifications", label: "Inbox Alerts", svg: icons.notifications },
        { id: "creator-settings", label: "Settings", svg: icons.settings }
      ];
    } else if (role === "brand") {
      menuItems = [
        { id: "brand-dashboard", label: "Dashboard", svg: icons.dashboard },
        { id: "brand-campaigns", label: "Campaigns", svg: icons.campaigns },
        { id: "brand-ai-match", label: "AI Creator Match", svg: icons.intelligence },
        { id: "brand-search", label: "Creators", svg: icons.profile },
        { id: "brand-insights", label: "Campaign Insights", svg: icons.dashboard },
        { id: "notifications", label: "Notifications", svg: icons.notifications },
        { id: "brand-settings", label: "Settings", svg: icons.settings }
      ];
    } else if (role === "admin") {
      menuItems = [
        { id: "admin-dashboard", label: "Admin Panel", svg: icons.admin },
        { id: "settings", label: "Settings", svg: icons.settings }
      ];
    }
    
    menuItems.forEach(item => {
      const a = document.createElement("a");
      a.className = "menu-item";
      a.id = `nav-link-${item.id}`;
      a.innerHTML = `<span style="display:inline-flex; align-items:center; justify-content:center; margin-right:8px; width:16px; height:16px;">${item.svg}</span> ${item.label}`;
      a.onclick = () => this.switchSubview(item.id);
      menuContainer.appendChild(a);
    });
  },

  // View Switcher & Routes (Hash updates)
  switchSubview: function(subviewId) {
    window.location.hash = "#/" + subviewId;
  },

  renderSubviewElements: function(subviewId) {
    this.activeSubview = subviewId;
    
    // Toggle active link class
    document.querySelectorAll(".menu-item").forEach(el => {
      el.classList.remove("active");
    });
    const activeLink = document.getElementById(`nav-link-${subviewId}`);
    if (activeLink) activeLink.classList.add("active");

    // Close user dropdown if open
    const drop = document.getElementById("top-nav-user-dropdown");
    if (drop) drop.style.display = "none";

    // Update persistent top nav breadcrumbs & title
    const breadcrumb = document.getElementById("top-nav-breadcrumb");
    const title = document.getElementById("top-nav-page-title");
    
    if (breadcrumb && title) {
      let path = "Portal";
      let label = "Dashboard";
      
      if (subviewId === "creator-dashboard") {
        path = "Portal / Dashboard";
        label = "Dashboard Overview";
      } else if (subviewId === "creator-profile") {
        path = "Portal / Onboarding";
        label = "Creator Portal Onboarding";
      } else if (subviewId === "creator-intelligence") {
        path = "Portal / Creator Intelligence";
        label = "Overall Intelligence & Score Vectors";
      } else if (subviewId === "creator-campaign-discovery") {
        path = "Portal / Campaign Marketplace";
        label = "Sponsorship & Campaign Sourcing";
      } else if (subviewId === "creator-my-campaigns") {
        path = "Portal / My Campaigns";
        label = "Active Partnerships & Collaborations";
      } else if (subviewId === "creator-profile-mgmt") {
        path = "Portal / My Profile";
        label = "Creator Profile Details";
      } else if (subviewId === "notifications") {
        path = "Portal / Inbox Alerts";
        label = "Notifications & AI Alerts";
      } else if (subviewId === "creator-settings") {
        path = "Portal / Settings";
        label = "Account Preferences & Security";
      } else if (subviewId === "brand-campaigns") {
        path = "Portal / Campaigns";
        label = "Brand Campaigns Manager";
      } else if (subviewId === "brand-search") {
        path = "Portal / Creator Sourcing";
        label = "Discover Top Talent";
      } else if (subviewId === "brand-settings") {
        path = "Portal / Settings";
        label = "Brand Connection Preferences";
      }
      
      breadcrumb.textContent = path;
      title.textContent = label;
    }
    
    // Hide all subviews
    document.querySelectorAll(".subview").forEach(el => {
      el.style.display = "none";
    });
    
    // Show selected subview
    const target = document.getElementById(`subview-${subviewId}`);
    if (target) {
      target.style.display = "block";
      
      // Execute view-specific loaders
      if (subviewId === "creator-dashboard") {
        this.loadCreatorDashboard();
      } else if (subviewId === "creator-profile") {
        this.initOnboardingWizard();
      } else if (subviewId === "creator-intelligence") {
        this.loadCreatorIntelligence();
      } else if (subviewId === "creator-campaign-discovery") {
        this.loadCampaignDiscoveryList();
      } else if (subviewId === "creator-my-campaigns") {
        this.loadMyCampaigns();
      } else if (subviewId === "creator-profile-mgmt") {
        this.loadProfileMgmtDetails();
      } else if (subviewId === "creator-settings") {
        // Renders creator details locally
      } else if (subviewId === "notifications") {
        this.loadNotifications();
      } else if (subviewId === "brand-dashboard") {
        this.loadBrandDashboard();
      } else if (subviewId === "brand-campaigns") {
        this.loadBrandCampaigns();
      } else if (subviewId === "brand-ai-match") {
        this.loadBrandAiMatch();
      } else if (subviewId === "brand-search") {
        this.loadBrandSearch();
      } else if (subviewId === "brand-insights") {
        this.loadBrandInsights();
      } else if (subviewId === "brand-settings") {
        this.loadBrandSettings();
      } else if (subviewId === "admin-dashboard") {
        this.loadAdminDashboard();
      } else if (subviewId === "settings") {
        this.loadSettings();
      }
    }
  },

  // ==================== CREATOR SUB-VIEWS ====================
  loadCreatorDashboard: async function() {
    try {
      const creator = await window.DB.getProfile(this.currentUser.id, "creator");
      if (!creator) return;

      document.getElementById("creator-dashboard-subtitle").textContent = 
        `Welcome back, ${creator.full_name}! Monitor your AI score & inbound sponsorships.`;

      document.getElementById("stat-followers").textContent = creator.followers_count.toLocaleString('en-IN');
      document.getElementById("stat-engagement").textContent = `${creator.engagement_rate}%`;
      document.getElementById("stat-views").textContent = creator.average_views.toLocaleString('en-IN');

      const scores = await window.DB.getCreatorScores(creator.id);
      
      if (scores) {
        // Draw Radar Chart
        window.UI.renderRadarChart("radar-chart-container", scores);
        
        // Update Score Circular Badge
        document.getElementById("badge-score-value").textContent = scores.intelligence_score;
        let rating = "Needs Improvement";
        if (scores.intelligence_score >= 90) rating = "Excellent";
        else if (scores.intelligence_score >= 80) rating = "Strong";
        else if (scores.intelligence_score >= 60) rating = "Average";
        document.getElementById("badge-score-label").textContent = rating;
        
        // Animate circular score badge ring
        const scoreCircle = document.getElementById("score-circle-ring");
        const circumference = 276.4; // 2 * PI * 44
        const offset = circumference - (scores.intelligence_score / 100) * circumference;
        setTimeout(() => {
          scoreCircle.style.strokeDashoffset = offset;
        }, 100);
      } else {
        document.getElementById("radar-chart-container").innerHTML = `
          <div style="text-align: center; color: var(--color-text-gray); padding: 40px 0;">
            <p>Score details not generated yet.</p>
            <button class="btn btn-primary" style="margin-top: 12px;" onclick="App.switchSubview('creator-profile')">
              Complete Profile to Calculate Score
            </button>
          </div>
        `;
        document.getElementById("badge-score-value").textContent = "--";
        document.getElementById("badge-score-label").textContent = "Unenriched";
      }

      // Load AI suggestions
      const suggestions = await window.DB.getSuggestions(creator.id);
      const suggList = document.getElementById("dashboard-suggestions-list");
      suggList.innerHTML = "";
      if (suggestions && suggestions.length > 0) {
        suggestions.forEach(s => {
          suggList.innerHTML += `
            <div class="suggestion-item" style="display:flex; gap:12px; align-items:flex-start; margin-bottom:16px;">
              <div class="suggestion-icon" style="margin-top:2px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-cyan)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .3 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path><line x1="9" y1="18" x2="15" y2="18"></line><line x1="10" y1="22" x2="14" y2="22"></line></svg>
              </div>
              <div class="suggestion-content" style="flex:1;">
                <div class="suggestion-title" style="font-weight:600; font-size:13px; color:#fff;">${s.suggestion_text}</div>
                <div class="suggestion-desc" style="font-size:11px; color:var(--color-text-gray); margin-top:2px;">Calculated impact on score: +${s.expected_improvement} points.</div>
              </div>
              <span class="suggestion-impact impact-${s.impact_level}" style="font-size:9px; padding:2px 6px;">${s.impact_level.toUpperCase()}</span>
            </div>
          `;
        });
      } else {
        suggList.innerHTML = `<p class="view-subtitle" style="font-size:12px;">Your next collaboration starts here. Completed profile calculations will output suggestions here.</p>`;
      }

      // Load incoming sponsorships (collaboration requests)
      const collabs = await window.DB.getCollabsForCreator(creator.id);
      const collabList = document.getElementById("dashboard-collabs-list");
      collabList.innerHTML = "";
      if (collabs && collabs.length > 0) {
        collabs.forEach(c => {
          const badgeClass = c.status === "accepted" ? "tag-green" : c.status === "rejected" ? "tag-indigo" : "tag-cyan";
          collabList.innerHTML += `
            <div class="suggestion-item" style="display:flex; gap:12px; align-items:flex-start; margin-bottom:16px;">
              <div class="suggestion-icon" style="margin-top:2px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-indigo)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
              </div>
              <div class="suggestion-content" style="flex:1;">
                <div class="suggestion-title" style="font-weight:600; font-size:13px; color:#fff;">${c.campaign ? c.campaign.title : 'Campaign Offer'}</div>
                <div class="suggestion-desc" style="font-size:11px; color:var(--color-text-gray); margin-top:2px; line-height:1.5;">
                  Company: ${c.brand ? c.brand.company_name : 'Sponsor'}<br>
                  Offered Price: <strong>₹${c.suggested_price.toLocaleString('en-IN')}</strong><br>
                  Match Percentage: <strong style="color: #00F2A6;">${c.match_score}%</strong>
                </div>
                ${c.status === "pending" ? `
                  <div style="margin-top: 12px; display: flex; gap: 8px;">
                    <button class="btn btn-primary" style="padding: 6px 12px; font-size: 11px;" onclick="App.handleCollabAction('${c.id}', 'accepted')">Accept</button>
                    <button class="btn btn-tertiary" style="padding: 6px 12px; font-size: 11px;" onclick="App.handleCollabAction('${c.id}', 'rejected')">Reject</button>
                  </div>
                ` : `<span class="tag ${badgeClass}" style="margin-top: 8px; display:inline-block; font-size:9px; padding:2px 6px;">${c.status.toUpperCase()}</span>`}
              </div>
            </div>
          `;
        });
      } else {
        collabList.innerHTML = `<p class="view-subtitle" style="font-size:12px;">Your next collaboration starts here. Open invitations from premium brands will appear in this workspace.</p>`;
      }

      // Load Recent Activity (timeline based on notifications)
      const activityList = document.getElementById("dashboard-activity-list");
      if (activityList) {
        activityList.innerHTML = "";
        try {
          const notifications = await window.DB.getNotifications(this.currentUser.id);
          if (notifications && notifications.length > 0) {
            notifications.slice(0, 3).forEach(n => {
              const formattedDate = new Date(n.created_at || Date.now()).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
              });
              activityList.innerHTML += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:rgba(255,255,255,0.01); border-radius:8px; font-size:12px;">
                  <div style="display:flex; gap:10px; align-items:center;">
                    <span style="color:#00F2A6;">●</span>
                    <span style="color:#fff;"><strong>${n.title}</strong>: ${n.message}</span>
                  </div>
                  <span style="color:var(--color-text-gray); font-size:11px;">${formattedDate}</span>
                </div>
              `;
            });
          } else {
            activityList.innerHTML = `
              <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:rgba(255,255,255,0.01); border-radius:8px; font-size:12px;">
                <div style="display:flex; gap:10px; align-items:center;">
                  <span style="color:#00D4FF;">●</span>
                  <span style="color:#fff;">Profile Audit: Intelligence vectors generated by Gemini</span>
                </div>
                <span style="color:var(--color-text-gray); font-size:11px;">Just now</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:rgba(255,255,255,0.01); border-radius:8px; font-size:12px;">
                <div style="display:flex; gap:10px; align-items:center;">
                  <span style="color:#4F46E5;">●</span>
                  <span style="color:#fff;">Account Setup: Creator workspace created successfully</span>
                </div>
                <span style="color:var(--color-text-gray); font-size:11px;">10m ago</span>
              </div>
            `;
          }
        } catch (e) {
          console.error("Failed to load activity list:", e);
        }
      }

    } catch (e) {
      this.showToast(e.message, "error");
    }
  },

  loadCreatorIntelligence: async function() {
    try {
      const creator = await window.DB.getProfile(this.currentUser.id, "creator");
      if (!creator) return;

      const scores = await window.DB.getCreatorScores(creator.id);
      if (scores) {
        // Radar Chart
        window.UI.renderRadarChart("intel-radar-chart-container", scores);
        
        // Progress Circular badge
        document.getElementById("intel-badge-score-value").textContent = scores.intelligence_score;
        let rating = "Needs Improvement";
        if (scores.intelligence_score >= 90) rating = "Excellent";
        else if (scores.intelligence_score >= 80) rating = "Strong";
        else if (scores.intelligence_score >= 60) rating = "Average";
        document.getElementById("intel-badge-score-label").textContent = rating;

        const scoreCircle = document.getElementById("intel-score-circle-ring");
        const circumference = 276.4;
        const offset = circumference - (scores.intelligence_score / 100) * circumference;
        setTimeout(() => {
          if (scoreCircle) scoreCircle.style.strokeDashoffset = offset;
        }, 100);

        document.getElementById("intel-score-explanation").textContent = scores.ai_explanation || "No explanation provided.";

        // Score breakdown bars
        document.getElementById("intel-breakdown-trust").textContent = `${scores.audience_trust}%`;
        document.getElementById("intel-bar-trust").style.width = `${scores.audience_trust}%`;

        document.getElementById("intel-breakdown-engagement").textContent = `${scores.engagement_rate}%`;
        document.getElementById("intel-bar-engagement").style.width = `${scores.engagement_rate}%`;

        document.getElementById("intel-breakdown-regional").textContent = `${scores.regional_influence}%`;
        document.getElementById("intel-bar-regional").style.width = `${scores.regional_influence}%`;

        document.getElementById("intel-breakdown-consistency").textContent = `${scores.content_consistency}%`;
        document.getElementById("intel-bar-consistency").style.width = `${scores.content_consistency}%`;

        document.getElementById("intel-breakdown-readiness").textContent = `${scores.brand_readiness}%`;
        document.getElementById("intel-bar-readiness").style.width = `${scores.brand_readiness}%`;
      } else {
        document.getElementById("intel-badge-score-value").textContent = "--";
        document.getElementById("intel-badge-score-label").textContent = "Unenriched";
        document.getElementById("intel-score-explanation").textContent = "Calculate score to view vectors.";
      }

      // Load suggestions
      const suggestions = await window.DB.getSuggestions(creator.id);
      const suggList = document.getElementById("intel-suggestions-list");
      suggList.innerHTML = "";
      if (suggestions && suggestions.length > 0) {
        suggestions.forEach(s => {
          suggList.innerHTML += `
            <div class="suggestion-item" style="display:flex; gap:12px; align-items:flex-start; margin-bottom:16px; padding:12px; background:rgba(255,255,255,0.01); border-radius:8px;">
              <div class="suggestion-icon" style="margin-top:2px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-cyan)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .3 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path><line x1="9" y1="18" x2="15" y2="18"></line><line x1="10" y1="22" x2="14" y2="22"></line></svg>
              </div>
              <div class="suggestion-content" style="flex:1;">
                <div class="suggestion-title" style="font-weight:600; font-size:13px; color:#fff;">${s.suggestion_text}</div>
                <div class="suggestion-desc" style="font-size:11px; color:var(--color-text-gray); margin-top:2px;">Calculated impact on score: +${s.expected_improvement} points.</div>
              </div>
              <span class="suggestion-impact impact-${s.impact_level}" style="font-size:9px; padding:2px 6px;">${s.impact_level.toUpperCase()}</span>
            </div>
          `;
        });
      } else {
        suggList.innerHTML = `<p class="view-subtitle" style="font-size:12px;">No recommendations compiled yet.</p>`;
      }
    } catch (err) {
      console.error(err);
    }
  },

  currentMyCampsTab: "all",
  filterMyCampaigns: function(tabName) {
    this.currentMyCampsTab = tabName;
    document.querySelectorAll("#subview-creator-my-campaigns button").forEach(btn => {
      btn.classList.remove("active-tab");
    });
    const activeBtn = document.getElementById(`tab-mycamps-${tabName}`);
    if (activeBtn) activeBtn.classList.add("active-tab");
    this.loadMyCampaigns();
  },

  loadMyCampaigns: async function() {
    try {
      const creator = await window.DB.getProfile(this.currentUser.id, "creator");
      if (!creator) return;

      const collabs = await window.DB.getCollabsForCreator(creator.id);
      const container = document.getElementById("mycamps-list-container");
      container.innerHTML = "";

      let filtered = collabs || [];
      if (this.currentMyCampsTab !== "all") {
        filtered = filtered.filter(c => c.status === this.currentMyCampsTab);
      }

      if (filtered.length === 0) {
        container.innerHTML = `
          <div class="luxury-card" style="text-align: center; padding: 40px; border-style: dashed;">
            <p class="view-subtitle">No campaigns found in this category.</p>
          </div>
        `;
        return;
      }

      filtered.forEach(c => {
        const badgeClass = c.status === "accepted" ? "tag-green" : c.status === "rejected" ? "tag-indigo" : "tag-cyan";
        const statusLabel = c.status === "accepted" ? "ONGOING" : c.status.toUpperCase();
        
        container.innerHTML += `
          <div class="glass-card" style="padding: 20px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
            <div style="flex: 1; min-width: 250px;">
              <h3 style="margin: 0 0 8px 0; color: #fff; font-size: 15px;">${c.campaign ? c.campaign.title : 'Campaign Offer'}</h3>
              <p class="view-subtitle" style="font-size: 12px; margin: 0; line-height:1.5;">
                Company: <strong>${c.brand ? c.brand.company_name : 'Sponsor'}</strong> | Niche: <strong>${c.campaign ? c.campaign.category : 'N/A'}</strong><br>
                Offered Budget: <strong>₹${c.suggested_price.toLocaleString('en-IN')}</strong> | Match Score: <strong>${c.match_score}%</strong>
              </p>
            </div>
            
            <div style="display: flex; align-items: center; gap: 12px;">
              <span class="tag ${badgeClass}" style="font-size: 10px; padding: 4px 8px;">${statusLabel}</span>
              ${c.status === "pending" ? `
                <div style="display: flex; gap: 8px;">
                  <button class="btn btn-primary" style="padding: 6px 12px; font-size: 11px;" onclick="App.handleCollabActionCampaigns('${c.id}', 'accepted')">Accept</button>
                  <button class="btn btn-tertiary" style="padding: 6px 12px; font-size: 11px;" onclick="App.handleCollabActionCampaigns('${c.id}', 'rejected')">Decline</button>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      });
    } catch (err) {
      console.error(err);
    }
  },

  handleCollabActionCampaigns: async function(collabId, status) {
    try {
      await window.DB.updateCollabStatus(collabId, status);
      this.showToast(`Invitation marked as ${status}`);
      this.loadMyCampaigns();
    } catch (e) {
      this.showToast(e.message, "error");
    }
  },

  loadCreatorProfileForm: async function() {
    try {
      const creator = await window.DB.getProfile(this.currentUser.id, "creator");
      if (!creator) return;
      
      document.getElementById("prof-name").value = creator.full_name || "";
      document.getElementById("prof-avatar").value = creator.avatar_url || "";
      document.getElementById("prof-bio").value = creator.bio || "";
      document.getElementById("prof-categories").value = creator.categories.join(", ");
      document.getElementById("prof-languages").value = creator.languages.join(", ");
      document.getElementById("prof-regions").value = creator.regions.join(", ");
      document.getElementById("prof-followers").value = creator.followers_count || "";
      document.getElementById("prof-views").value = creator.average_views || "";
      document.getElementById("prof-engagement").value = creator.engagement_rate || "";
      document.getElementById("prof-price-min").value = creator.pricing_min || "";
      document.getElementById("prof-price-prem").value = creator.pricing_premium || "";
    } catch (e) {
      this.showToast(e.message, "error");
    }
  },

  handleProfileSave: async function(e) {
    e.preventDefault();
    const profile = {
      full_name: document.getElementById("prof-name").value,
      avatar_url: document.getElementById("prof-avatar").value,
      bio: document.getElementById("prof-bio").value,
      categories: document.getElementById("prof-categories").value.split(",").map(s => s.trim()).filter(Boolean),
      languages: document.getElementById("prof-languages").value.split(",").map(s => s.trim()).filter(Boolean),
      regions: document.getElementById("prof-regions").value.split(",").map(s => s.trim()).filter(Boolean),
      followers_count: parseInt(document.getElementById("prof-followers").value) || 0,
      average_views: parseInt(document.getElementById("prof-views").value) || 0,
      engagement_rate: parseFloat(document.getElementById("prof-engagement").value) || 0,
      pricing_min: parseInt(document.getElementById("prof-price-min").value) || 0,
      pricing_premium: parseInt(document.getElementById("prof-price-prem").value) || 0
    };

    try {
      await window.DB.saveProfile(this.currentUser.id, "creator", profile);
      this.showToast("Profile changes saved successfully.");
      
      // Trigger n8n Enrichment queue display
      this.showPipelineProgressModal("Enriching Creator Profile Analytics", [
        { id: "wf01", name: "WF-01: Profile Analysis" },
        { id: "wf02", name: "WF-02: Score Engine" },
        { id: "wf03", name: "WF-03: Growth suggestions" }
      ]);
      
      await window.N8N.triggerProfileEnrichment(this.currentUser.id, (step, msg) => {
        this.updatePipelineProgressStep(step, msg);
      });
      
      setTimeout(() => {
        this.closePipelineProgressModal();
        this.switchSubview("creator-dashboard");
      }, 1000);
    } catch (err) {
      this.closePipelineProgressModal();
      this.showToast("AI pipeline failed: " + err.message, "error");
    }
  },

  handleCollabAction: async function(collabId, status) {
    try {
      await window.DB.updateCollabStatus(collabId, status);
      this.showToast(`Request marked as ${status}`);
      this.loadCreatorDashboard();
    } catch (e) {
      this.showToast(e.message, "error");
    }
  },

  // ==================== BRAND SUB-VIEWS ====================
  loadBrandDashboard: async function() {
    try {
      const brand = await window.DB.getProfile(this.currentUser.id, "brand");
      if (!brand) return;

      const campaigns = await window.DB.getCampaigns(brand.id);
      const collabs = JSON.parse(localStorage.getItem("cl_collabs") || "[]");
      const brandCollabs = collabs.filter(c => c.brand_id === brand.id);

      // Populate Stats
      document.getElementById("brand-stat-active-camps").textContent = campaigns.length;
      document.getElementById("brand-stat-active-collabs").textContent = brandCollabs.filter(c => c.status === "accepted").length;
      const totalBudget = campaigns.reduce((sum, c) => sum + (parseInt(c.budget) || 0), 0);
      document.getElementById("brand-stat-total-budget").textContent = `₹${totalBudget.toLocaleString('en-IN')}`;

      // Populate pipeline table
      const campsBody = document.getElementById("brand-dashboard-camps-body");
      campsBody.innerHTML = "";
      if (campaigns.length === 0) {
        campsBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:12px; color:var(--color-text-gray);">No active campaigns. Click 'Create Campaign' to start.</td></tr>`;
      } else {
        for (const c of campaigns) {
          const matches = await window.DB.getCampaignMatches(c.id);
          campsBody.innerHTML += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.02);">
              <td style="padding:12px 8px; color:#fff; font-weight:600;">${c.title}</td>
              <td style="padding:12px 8px; color:var(--color-text-gray); text-transform: capitalize;">${c.category}</td>
              <td style="padding:12px 8px; color:#00F2A6;">₹${(c.budget || 0).toLocaleString('en-IN')}</td>
              <td style="padding:12px 8px;"><span class="tag tag-cyan">${matches.length} matches</span></td>
              <td style="padding:12px 8px;"><span class="tag tag-green">${c.status.toUpperCase()}</span></td>
            </tr>
          `;
        }
      }

      // Match average
      let matchAvg = 85;
      if (campaigns.length > 0) {
        let totalMatches = 0;
        let sumScore = 0;
        for (const c of campaigns) {
          const matches = await window.DB.getCampaignMatches(c.id);
          matches.forEach(m => {
            sumScore += m.match_score || 80;
            totalMatches++;
          });
        }
        if (totalMatches > 0) matchAvg = Math.round(sumScore / totalMatches);
      }
      document.getElementById("brand-ai-avg-match").textContent = `${matchAvg}%`;

      // AI Recommendations Plan
      const recList = document.getElementById("brand-dashboard-recommendations");
      recList.innerHTML = `
        <div style="display:flex; gap:12px; align-items:flex-start; padding:12px; background:rgba(255,255,255,0.01); border-radius:8px;">
          <div style="color:var(--color-primary-cyan); margin-top:2px;">💡</div>
          <div style="flex:1;">
            <div style="font-weight:600; font-size:13px; color:#fff;">Target Sneha Reddy (+18% Engagement)</div>
            <div style="font-size:11px; color:var(--color-text-gray); margin-top:2px;">Handloom category matches Swad Spices Central India regional affinity matrix.</div>
          </div>
        </div>
        <div style="display:flex; gap:12px; align-items:flex-start; padding:12px; background:rgba(255,255,255,0.01); border-radius:8px;">
          <div style="color:var(--color-primary-cyan); margin-top:2px;">💡</div>
          <div style="flex:1;">
            <div style="font-weight:600; font-size:13px; color:#fff;">Deploy Indore Local Food Vlog Campaign</div>
            <div style="font-size:11px; color:var(--color-text-gray); margin-top:2px;">Dialect analysis highlights Bundeli culinary review triggers match with Swad product mix.</div>
          </div>
        </div>
      `;

      // Recent Activity
      const activityFeed = document.getElementById("brand-dashboard-activity");
      activityFeed.innerHTML = "";
      const notifications = await window.DB.getNotifications(this.currentUser.id);
      if (notifications && notifications.length > 0) {
        notifications.slice(0, 3).forEach(n => {
          const date = new Date(n.created_at || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
          activityFeed.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:rgba(255,255,255,0.01); border-radius:8px; font-size:12px;">
              <span style="color:#fff;"><strong>${n.title}</strong>: ${n.message}</span>
              <span style="color:var(--color-text-gray); font-size:10px;">${date}</span>
            </div>
          `;
        });
      } else {
        activityFeed.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:rgba(255,255,255,0.01); border-radius:8px; font-size:12px;">
            <span style="color:#fff;">Sourcing System: Matching index matrices compiled.</span>
            <span style="color:var(--color-text-gray); font-size:10px;">Just now</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:rgba(255,255,255,0.01); border-radius:8px; font-size:12px;">
            <span style="color:#fff;">Campaign Brief: 'Swad Indore Launch' draft accepted.</span>
            <span style="color:var(--color-text-gray); font-size:10px;">1h ago</span>
          </div>
        `;
      }

    } catch (e) {
      console.error(e);
    }
  },

  loadBrandAiMatch: async function() {
    try {
      const brand = await window.DB.getProfile(this.currentUser.id, "brand");
      if (!brand) return;

      const campaigns = await window.DB.getCampaigns(brand.id);
      const select = document.getElementById("brand-match-campaign-select");
      select.innerHTML = "";
      if (campaigns.length === 0) {
        select.innerHTML = `<option value="">No Active Campaigns Available</option>`;
      } else {
        campaigns.forEach(c => {
          select.innerHTML += `<option value="${c.id}">${c.title}</option>`;
        });
      }
      document.getElementById("brand-match-results-container").innerHTML = "";
    } catch (e) {
      console.error(e);
    }
  },

  runBrandAiMatching: async function() {
    const campaignId = document.getElementById("brand-match-campaign-select").value;
    if (!campaignId) {
      this.showToast("Please create or select a campaign brief first.", "warning");
      return;
    }

    const loader = document.getElementById("brand-match-loader");
    const container = document.getElementById("brand-match-results-container");

    loader.style.display = "block";
    container.innerHTML = "";

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const matches = await window.DB.getCampaignMatches(campaignId);
      loader.style.display = "none";

      if (!matches || matches.length === 0) {
        container.innerHTML = `
          <div class="glass-card" style="text-align: center; padding: 40px; border: 1px dashed var(--color-border); border-radius: 8px;">
            <p class="view-subtitle" style="margin:0;">No matching creator profiles found in local registry.</p>
          </div>
        `;
        return;
      }

      matches.forEach(m => {
        const creator = m.creator;
        if (!creator) return;

        container.innerHTML += `
          <div class="glass-card" style="padding: 24px; margin-bottom: 16px; border-left: 4px solid var(--color-primary-cyan); text-align: left;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px;">
              <div style="display:flex; gap:16px; align-items:center;">
                <img src="${creator.avatar_url}" style="width:54px; height:54px; border-radius:50%; border:2px solid var(--color-primary-cyan);">
                <div>
                  <h3 style="margin:0; color:#fff; font-size:16px;">${creator.full_name} <span style="font-size:10px; color:var(--color-text-gray); font-weight:normal; margin-left:8px;">ID: ${creator.creator_code || 'CR_N/A'}</span></h3>
                  <p style="margin:4px 0 0 0; font-size:12px; color:var(--color-text-gray);">
                    Niche: <strong>${creator.categories ? creator.categories.join(', ') : 'General'}</strong> | Followers: <strong>${(creator.followers_count || 0).toLocaleString()}</strong>
                  </p>
                </div>
              </div>

              <div style="text-align:right;">
                <div style="font-size:24px; font-weight:800; color:var(--color-primary-cyan);">${m.match_score}%</div>
                <div style="font-size:10px; color:var(--color-text-gray); text-transform:uppercase; font-weight:600; margin-top:2px;">AI Match Score</div>
              </div>
            </div>

            <div style="margin-top:16px; padding:12px; background:rgba(255,255,255,0.02); border-radius:8px;">
              <div style="font-weight:600; font-size:12px; color:#fff; display:flex; align-items:center; gap:6px;">
                <span>🤖</span> Gemini Sourcing Explanation
              </div>
              <p style="margin:6px 0 0 0; font-size:11px; color:var(--color-text-gray); line-height:1.5;">
                ${m.ai_explanation || "High alignment based on dialect fluency and demographic overlap with Central Indian audience clusters."}
              </p>
            </div>

            <div style="margin-top:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
              <div style="font-size:12px; color:var(--color-text-gray);">
                Recommended Pricing Index: <strong style="color:#00F2A6;">₹${(creator.pricing_min || 10000).toLocaleString('en-IN')} - ₹${(creator.pricing_premium || 20000).toLocaleString('en-IN')}</strong>
              </div>
              <div style="display:flex; gap:10px;">
                <button class="btn btn-tertiary" style="padding:6px 12px; font-size:11px;" onclick="App.showToast('Creator profile saved to matches!')">Save Creator</button>
                <button class="btn btn-primary" style="padding:6px 12px; font-size:11px;" onclick="App.expressBrandInterest('${creator.id}', '${campaignId}', ${m.match_score}, ${creator.pricing_min || 10000})">Express Interest</button>
              </div>
            </div>
          </div>
        `;
      });

    } catch (e) {
      loader.style.display = "none";
      this.showToast(e.message, "error");
    }
  },

  expressBrandInterest: async function(creatorId, campaignId, matchScore, basePrice) {
    try {
      const brand = await window.DB.getProfile(this.currentUser.id, "brand");
      if (!brand) return;

      const request = {
        campaign_id: campaignId,
        creator_id: creatorId,
        brand_id: brand.id,
        suggested_price: basePrice,
        match_score: matchScore
      };

      await window.DB.saveCollabRequest(request);
      this.showToast("Expressed interest successfully! Invitation sent to Creator Inbox.", "success");
      
      // Notify creator via notifications
      const mockNotifications = JSON.parse(localStorage.getItem("cl_notifications") || "[]");
      mockNotifications.push({
        id: "notif-" + Math.random().toString(36).substr(2, 9),
        user_id: creatorId,
        title: "New Campaign Invitation",
        message: `${brand.company_name} invited you to join their campaign brief.`,
        created_at: new Date().toISOString(),
        read: false
      });
      localStorage.setItem("cl_notifications", JSON.stringify(mockNotifications));

    } catch (e) {
      this.showToast(e.message, "error");
    }
  },

  loadBrandInsights: async function() {
    try {
      const brand = await window.DB.getProfile(this.currentUser.id, "brand");
      if (!brand) return;

      const campaigns = await window.DB.getCampaigns(brand.id);
      const totalBudget = campaigns.reduce((sum, c) => sum + (parseInt(c.budget) || 0), 0);
      document.getElementById("insights-stat-budget").textContent = `₹${totalBudget.toLocaleString('en-IN')}`;

      const spent = Math.round(totalBudget * 0.7);
      document.getElementById("insights-stat-spent").textContent = `₹${spent.toLocaleString('en-IN')}`;
    } catch (e) {
      console.error(e);
    }
  },

  loadBrandCampaigns: async function() {
    try {
      const campaigns = await window.DB.getCampaigns(this.currentUser.id);
      const listCol = document.getElementById("brand-campaign-list-column");
      listCol.innerHTML = "";
      
      if (campaigns.length > 0) {
        campaigns.forEach(c => {
          const isActive = this.selectedCampaignId === c.id;
          listCol.innerHTML += `
            <div class="glass-card" style="padding: 16px; margin-bottom: 16px; cursor: pointer; border-left: 4px solid ${isActive ? 'var(--color-primary-cyan)' : 'transparent'}; position: relative;" onclick="App.selectCampaign('${c.id}')">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;">
                <h4 style="margin: 0; font-size:14px; color:#fff;">${c.title}</h4>
                <div style="display:flex; gap:8px;">
                  <span onclick="App.editCampaign('${c.id}'); event.stopPropagation();" title="Edit Campaign" style="cursor:pointer; font-size:12px; color:var(--color-text-muted);">✏️</span>
                  <span onclick="App.archiveCampaign('${c.id}'); event.stopPropagation();" title="Archive Campaign" style="cursor:pointer; font-size:12px; color:var(--color-text-muted);">📥</span>
                </div>
              </div>
              <p class="view-subtitle" style="font-size: 11px; margin-bottom: 0;">Budget: ₹${c.budget.toLocaleString('en-IN')} | Category: ${c.category}</p>
              <div style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center;">
                <span class="tag tag-indigo" style="font-size: 9px; padding: 2px 6px;">${c.region}</span>
                <span class="tag tag-green" style="font-size: 9px; padding: 2px 6px; text-transform:uppercase;">${c.status || 'ACTIVE'}</span>
              </div>
            </div>
          `;
        });
        
        // Auto select first campaign if none selected
        if (!this.selectedCampaignId) {
          this.selectCampaign(campaigns[0].id);
        } else {
          this.renderCampaignWorkspace();
        }
      } else {
        listCol.innerHTML = `
          <div class="luxury-card" style="text-align: center; padding: 24px 16px;">
            <p class="view-subtitle" style="font-size: 11px; margin-bottom: 0;">Your next collaboration starts here.</p>
          </div>
        `;
        document.getElementById("campaign-workspace-column").innerHTML = `
          <div class="luxury-card" style="text-align: center; padding: 60px 20px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <svg viewBox="0 0 24 24" width="40" height="40" stroke="var(--color-text-muted)" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 16px;"><polygon points="22 12 16 12 14 15 10 15 8 12 2 12 2 17 22 17 22 12"></polygon><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>
            <h3 style="color: #fff; font-size: 16px; margin-bottom: 6px;">Your next collaboration starts here.</h3>
            <p class="view-subtitle" style="font-size: 12px; color: var(--color-text-gray); max-width: 320px; margin: 0 auto; line-height:1.5;">Create a campaign brief structure to trigger n8n matching scores across our database.</p>
            <button class="btn btn-primary" style="margin-top: 16px;" onclick="App.showCampaignModal()">+ Create Campaign</button>
          </div>
        `;
      }
    } catch (e) {
      this.showToast(e.message, "error");
    }
  },

  selectCampaign: function(campId) {
    this.selectedCampaignId = campId;
    this.loadBrandCampaigns(); // refresh border highlight
  },

  renderCampaignWorkspace: async function() {
    const workspace = document.getElementById("campaign-workspace-column");
    if (!this.selectedCampaignId) return;
    
    try {
      const campaigns = await window.DB.getCampaigns(this.currentUser.id);
      const camp = campaigns.find(c => c.id === this.selectedCampaignId);
      if (!camp) return;

      const matches = await window.DB.getCampaignMatches(this.selectedCampaignId);
      
      let matchesHTML = "";
      if (matches.length > 0) {
        matches.forEach(m => {
          if (!m.creator) return;
          matchesHTML += `
            <div class="creator-match-row">
              <div class="creator-info-block">
                <img src="${m.creator.avatar_url}" class="creator-avatar-sm" alt="Avatar">
                <div class="creator-details-sm">
                  <h4>${m.creator.full_name}</h4>
                  <p>${m.creator.categories.join("/")} | ${m.creator.languages.join("/")}</p>
                </div>
              </div>
              <div class="match-percentage-badge">
                <div class="match-pct">${m.match_score}% Match</div>
                <div style="display: flex; gap: 8px;">
                  <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 11px;" onclick="App.openCreatorDetails('${m.creator_id}', '${this.selectedCampaignId}')">View Analysis</button>
                  <button class="btn btn-primary" style="padding: 6px 12px; font-size: 11px;" onclick="App.expressCollabInterest('${this.selectedCampaignId}', '${m.creator_id}')">Send Offer</button>
                </div>
              </div>
            </div>
          `;
        });
      } else {
        matchesHTML = `
          <div style="text-align: center; padding: 30px 10px;">
            <p class="view-subtitle">No matching scores generated. Let's run n8n creator profiling calculations now.</p>
            <button class="btn btn-primary" style="margin-top: 12px;" onclick="App.runCampaignMatching('${camp.id}')">Run Match Analysis</button>
          </div>
        `;
      }

      workspace.innerHTML = `
        <div class="luxury-card" style="margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <h2>${camp.title}</h2>
            <span class="tag tag-green">${camp.status.toUpperCase()}</span>
          </div>
          <p style="margin-bottom: 16px; font-size: 14px; line-height: 1.6; color: var(--color-text-gray);">${camp.objective}</p>
          <div class="tags-container" style="margin-bottom: 16px;">
            <span class="tag tag-cyan">Target: ${camp.region}</span>
            <span class="tag tag-indigo">Language: ${camp.language}</span>
            <span class="tag tag-green">Budget: ₹${camp.budget.toLocaleString('en-IN')}</span>
          </div>
          ${camp.ai_keywords ? `
            <div style="font-size: 12px; color: var(--color-text-muted);">
              <strong>AI EXTRACED KEYWORDS:</strong> ${camp.ai_keywords.map(k => `#${k}`).join(" ")}
            </div>
          ` : ''}
        </div>
        
        <div class="luxury-card">
          <h3 style="margin-bottom: 16px;">Matched Creators & AI Pricing Sourcing</h3>
          ${matchesHTML}
        </div>
      `;
      
    } catch (e) {
      workspace.innerHTML = `<div class="glass-card">Error loading workspace details: ${e.message}</div>`;
    }
  },

  runCampaignMatching: async function(campId) {
    try {
      this.showPipelineProgressModal("Matching Campaign Profile with Creators Database", [
        { id: "wf04", name: "WF-04: Campaign Parse" },
        { id: "wf05", name: "WF-05: Brand Match Engine" },
        { id: "wf06", name: "WF-06: Pricing Recommendation Engine" }
      ]);
      
      await window.N8N.triggerCampaignMatching(campId, (step, msg) => {
        this.updatePipelineProgressStep(step, msg);
      });
      
      setTimeout(() => {
        this.closePipelineProgressModal();
        this.renderCampaignWorkspace();
      }, 1000);
    } catch (e) {
      this.closePipelineProgressModal();
      this.showToast("Matching pipeline failed: " + e.message, "error");
    }
  },

  expressCollabInterest: async function(campId, creatorId) {
    try {
      const matches = await window.DB.getCampaignMatches(campId);
      const match = matches.find(m => m.creator_id === creatorId);
      if (!match) return;

      const request = {
        campaign_id: campId,
        brand_id: this.currentUser.id,
        creator_id: creatorId,
        match_score: match.match_score,
        suggested_price: match.recommended_price,
        price_justification: match.pricing_justification
      };
      
      await window.DB.saveCollabRequest(request);
      this.showToast("Collaboration invitation sent to creator!");
      this.adminLog(`Collab request sent by Brand ${this.currentUser.email} to Creator ${creatorId}`);
    } catch (e) {
      this.showToast(e.message, "error");
    }
  },

  // Campaign Modals
  showCampaignModal: function() {
    document.getElementById("modal-campaign-form").classList.add("active");
  },

  closeCampaignModal: function() {
    document.getElementById("modal-campaign-form").classList.remove("active");
  },

  handleCampaignSubmit: async function(e) {
    e.preventDefault();
    const editId = document.getElementById("campaign-create-form").dataset.editId;
    
    const campaignData = {
      brand_id: this.currentUser.id,
      title: document.getElementById("camp-title").value,
      objective: document.getElementById("camp-objective").value,
      category: document.getElementById("camp-category").value,
      region: document.getElementById("camp-region").value,
      language: document.getElementById("camp-language").value,
      creator_type: document.getElementById("camp-type").value,
      budget: parseInt(document.getElementById("camp-budget").value) || 0,
      target_audience: document.getElementById("camp-audience").value
    };

    try {
      if (editId) {
        // Edit Mode: update campaign details in local storage directly
        const campaigns = JSON.parse(localStorage.getItem("cl_campaigns") || "[]");
        const idx = campaigns.findIndex(c => c.id === editId);
        if (idx !== -1) {
          campaigns[idx] = { ...campaigns[idx], ...campaignData };
          localStorage.setItem("cl_campaigns", JSON.stringify(campaigns));
        }
        delete document.getElementById("campaign-create-form").dataset.editId;
        this.closeCampaignModal();
        this.showToast("Campaign updated successfully!", "success");
        this.loadBrandCampaigns();
      } else {
        // Create Mode
        const newCamp = await window.DB.createCampaign(campaignData);
        this.closeCampaignModal();
        this.selectedCampaignId = newCamp.id;
        
        // Auto trigger matching pipeline
        await this.runCampaignMatching(newCamp.id);
        this.showToast("Campaign created & analyzed!", "success");
      }
      
      document.getElementById("campaign-create-form").reset();
    } catch (err) {
      this.showToast("Failed to process campaign: " + err.message, "error");
    }
  },

  // ==================== SEARCH SOURCING SUB-VIEW ====================
  loadBrandSearch: function() {
    const grid = document.getElementById("search-results-grid");
    grid.innerHTML = "";
    
    const creators = JSON.parse(localStorage.getItem("cl_creators") || "[]");
    const scores = JSON.parse(localStorage.getItem("cl_scores") || "{}");
    
    creators.forEach(c => {
      const cScore = scores[c.id] ? scores[c.id].intelligence_score : 50;
      
      grid.innerHTML += `
        <div class="col-4 glass-card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
              <img src="${c.avatar_url}" style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover;" alt="Avatar">
              <div>
                <h4 style="font-size: 16px;">${c.full_name}</h4>
                <p class="view-subtitle" style="font-size: 11px;">Followers: ${c.followers_count.toLocaleString('en-IN')}</p>
              </div>
            </div>
            
            <p style="font-size: 13px; line-height: 1.5; color: var(--color-text-gray); margin-bottom: 16px; height: 58px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">${c.bio}</p>
            
            <div class="tags-container" style="margin-bottom: 16px;">
              ${c.categories.map(cat => `<span class="tag tag-green" style="font-size: 9px; padding: 2px 6px;">${cat}</span>`).join("")}
              ${c.languages.map(lang => `<span class="tag tag-cyan" style="font-size: 9px; padding: 2px 6px;">${lang}</span>`).join("")}
              ${c.regions.map(reg => `<span class="tag tag-indigo" style="font-size: 9px; padding: 2px 6px;">${reg}</span>`).join("")}
            </div>
          </div>
          
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--color-border); padding-top: 12px;">
            <div>
              <span class="input-label" style="font-size: 9px;">INTELLIGENCE SCORE</span>
              <div style="font-weight: 700; color: #00F2A6; font-size: 16px;">${cScore}/100</div>
            </div>
            <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 11px;" onclick="App.openCreatorDetails('${c.id}')">View Analysis</button>
          </div>
        </div>
      `;
    });
  },

  handleSearchFilter: function() {
    const query = document.getElementById("search-input").value.toLowerCase();
    const cards = document.querySelectorAll("#search-results-grid > div");
    
    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      if (text.includes(query)) {
        card.style.display = "flex";
      } else {
        card.style.display = "none";
      }
    });
  },

  toggleSearchTag: function(tag) {
    document.getElementById("search-input").value = tag;
    this.handleSearchFilter();
  },

  openCreatorDetails: async function(creatorId, activeCampaignId = null) {
    try {
      const creators = JSON.parse(localStorage.getItem("cl_creators") || "[]");
      const creator = creators.find(c => c.id === creatorId);
      if (!creator) return;
      
      const scores = await window.DB.getCreatorScores(creatorId) || { intelligence_score: 50 };
      
      // Setup details popup layout
      const overlay = document.createElement("div");
      overlay.className = "modal-overlay active";
      overlay.id = "modal-creator-details-window";
      
      // Calculate dynamic price ranges if campaign active, otherwise basic range
      const baseMin = creator.pricing_min || 10000;
      const baseMax = creator.pricing_premium || 30000;
      const baseRec = Math.round((baseMin + baseMax) / 2);
      
      const detailsHTML = `
        <div class="modal-content glass-card" style="max-width: 700px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
            <div style="display: flex; align-items: center; gap: 16px;">
              <img src="${creator.avatar_url}" style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2px solid var(--color-primary-cyan);" alt="Avatar">
              <div>
                <h2>${creator.full_name}</h2>
                <p class="view-subtitle">${creator.regions.join("/")} | ${creator.languages.join("/")}</p>
              </div>
            </div>
            <button class="btn btn-tertiary" style="padding: 6px 12px;" onclick="document.getElementById('modal-creator-details-window').remove()">Close</button>
          </div>
          
          <div class="dashboard-grid">
            <!-- Left: Stats & Bio -->
            <div class="col-6">
              <h4 style="margin-bottom: 8px;">AI Profile Summary</h4>
              <p style="font-size: 13px; line-height: 1.6; color: var(--color-text-gray); margin-bottom: 16px;">
                ${creator.profile_summary || creator.bio}
              </p>
              
              <div class="dashboard-grid" style="gap: 12px; margin-bottom: 16px;">
                <div class="col-6" style="background: var(--color-surface-darker); padding: 10px; border-radius: 8px;">
                  <span class="input-label" style="font-size: 10px;">ENGAGEMENT</span>
                  <div style="font-weight: 600; font-size: 14px;">${creator.engagement_rate}%</div>
                </div>
                <div class="col-6" style="background: var(--color-surface-darker); padding: 10px; border-radius: 8px;">
                  <span class="input-label" style="font-size: 10px;">AVERAGE VIEWS</span>
                  <div style="font-weight: 600; font-size: 14px;">${creator.average_views.toLocaleString('en-IN')}</div>
                </div>
              </div>
              
              <h4 style="margin-bottom: 8px;">Enrichment Details</h4>
              <ul style="font-size: 12px; color: var(--color-text-gray); padding-left: 16px; line-height: 1.8;">
                <li><strong>Strengths:</strong> ${creator.strengths ? creator.strengths.join(", ") : "Authentic voice"}</li>
                <li><strong>Opportunities:</strong> ${creator.weaknesses ? creator.weaknesses.join(", ") : "N/A"}</li>
              </ul>
            </div>
            
            <!-- Right: Radar Chart -->
            <div class="col-6" style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
              <h4 style="align-self: flex-start; margin-bottom: 8px;">Creator Intelligence Profile</h4>
              <div id="modal-radar-chart" style="width: 200px; height: 200px;"></div>
              <div style="font-weight: 700; color: #00F2A6; font-size: 16px; margin-top: 10px;">CIS: ${scores.intelligence_score}/100</div>
            </div>
          </div>
          
          <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--color-border);" id="modal-pricing-box">
            <!-- Render pricing slider inside popup -->
          </div>
        </div>
      `;
      
      overlay.innerHTML = detailsHTML;
      document.body.appendChild(overlay);
      
      // Render SVG radar inside details modal
      window.UI.renderRadarChart("modal-radar-chart", scores);
      
      // Render Pricing Slider inside details modal
      const pricingRange = {
        min_price: baseMin,
        recommended_price: baseRec,
        premium_price: baseMax
      };
      
      window.UI.renderPricingSlider("modal-pricing-box", pricingRange, baseRec, (val) => {
        // Price slider interactive adjustment callback
      });
      
    } catch (e) {
      this.showToast(e.message, "error");
    }
  },

  // ==================== ADMIN SUB-VIEW ====================
  loadAdminDashboard: async function() {
    try {
      const users = JSON.parse(localStorage.getItem("cl_users") || "[]");
      const campaigns = await window.DB.getAllCampaigns();
      const creators = JSON.parse(localStorage.getItem("cl_creators") || "[]");
      
      const enrichedCount = creators.filter(c => c.is_enriched).length;
      
      document.getElementById("admin-stat-users").textContent = users.length;
      document.getElementById("admin-stat-campaigns").textContent = campaigns.length;
      document.getElementById("admin-stat-enriched").textContent = enrichedCount;
    } catch (e) {
      this.showToast(e.message, "error");
    }
  },

  adminLog: function(msg) {
    const consoleLog = document.getElementById("admin-console-log");
    if (!consoleLog) return;
    const time = new Date().toLocaleTimeString();
    consoleLog.innerHTML += `<br>[${time}] ${msg}`;
    consoleLog.scrollTop = consoleLog.scrollHeight;
  },

  // ==================== SETTINGS & DUAL-MODE ====================
  loadSettings: function() {
    const isLive = localStorage.getItem("cl_use_live") === "true";
    document.getElementById("setting-mode-select").value = isLive ? "live" : "demo";
  },

  handleModeChange: function() {
    // No-op since credentials input container is removed
  },

  saveIntegrationSettings: function() {
    const select = document.getElementById("setting-mode-select").value;
    const isLive = select === "live";
    
    localStorage.setItem("cl_use_live", isLive ? "true" : "false");
    
    if (isLive) {
      this.showToast("Switched to LIVE Backend Integration Engine (Port 5000)!");
      this.adminLog("[SYS] Switched to LIVE Backend REST API Engine.");
    } else {
      this.showToast("Switched to interactive local demo mode.");
      this.adminLog("[SYS] Switched to LOCAL Demo Engine.");
    }
  },

  // ==================== PIPELINE LOADING PROGRESS OVERLAY ====================
  showPipelineProgressModal: function(title, steps) {
    document.getElementById("pipeline-title").textContent = title;
    
    // Configure steps display
    steps.forEach((step, i) => {
      const el = document.getElementById(`qstep-${i + 1}`);
      if (el) {
        el.querySelector(".step-name").textContent = step.name;
        el.querySelector(".step-indicator").className = "step-indicator";
        el.querySelector(".step-status").textContent = "Pending";
      }
    });
    
    document.getElementById("modal-pipeline-progress").classList.add("active");
  },

  updatePipelineProgressStep: function(activeStepCode, msg) {
    this.adminLog(`[n8n Workflow Update] Step: ${activeStepCode} | ${msg}`);
    
    const stepsMapping = {
      // Creator Pipeline
      "wf01": { idx: 1, state: "active", txt: "WF-01 Running" },
      "wf02": { idx: 2, state: "active", txt: "WF-02 Running", prev: 1 },
      "wf03": { idx: 3, state: "active", txt: "WF-03 Running", prev: 2 },
      // Campaign Pipeline
      "wf04": { idx: 1, state: "active", txt: "WF-04 Running" },
      "wf05": { idx: 2, state: "active", txt: "WF-05 Running", prev: 1 },
      "wf06": { idx: 3, state: "active", txt: "WF-06 Running", prev: 2 },
      
      // Completion signals
      "complete": { idx: 3, state: "complete", txt: "Workflow Done", prev: 2 },
      "success": { idx: 3, state: "complete", txt: "Success", prev: 2 }
    };
    
    const conf = stepsMapping[activeStepCode];
    if (!conf) return;
    
    // Mark previous as complete
    if (conf.prev) {
      const prevEl = document.getElementById(`qstep-${conf.prev}`);
      if (prevEl) {
        prevEl.querySelector(".step-indicator").className = "step-indicator complete";
        prevEl.querySelector(".step-status").textContent = "Complete";
      }
    }
    
    // Mark active
    const activeEl = document.getElementById(`qstep-${conf.idx}`);
    if (activeEl) {
      if (conf.state === "complete") {
        activeEl.querySelector(".step-indicator").className = "step-indicator complete";
        activeEl.querySelector(".step-status").textContent = "Complete";
      } else {
        activeEl.querySelector(".step-indicator").className = "step-indicator active";
        activeEl.querySelector(".step-status").textContent = "Executing...";
      }
    }
  },

  closePipelineProgressModal: function() {
    document.getElementById("modal-pipeline-progress").classList.remove("active");
  },

  // ==================== TOAST NOTIFICATIONS ====================
  showToast: function(message, type = "success") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    // Icon selectors
    const icon = type === "success" ? "✔" : type === "error" ? "❌" : "ℹ";
    
    toast.innerHTML = `<span>${icon}</span> <div>${message}</div>`;
    container.appendChild(toast);
    
    // Trigger animation frame
    setTimeout(() => {
      toast.classList.add("show");
    }, 50);
    
    // Auto remove
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  // ==================== SANDBOX INTERACTIVE TAG HANDLER ====================
  selectSandboxTag: function(tag) {
    // Highlight button
    document.querySelectorAll(".sandbox-filter-btn").forEach(el => {
      el.classList.remove("active");
    });
    
    let btnId = "sbox-tag-marathi";
    let creatorId = "creator-priya-sharma";
    let matchScore = 94;
    
    if (tag === "Tech") {
      btnId = "sbox-tag-tech";
      creatorId = "creator-rahul-kapoor";
      matchScore = 85;
    } else if (tag === "Food") {
      btnId = "sbox-tag-food";
      creatorId = "creator-anjali-verma";
      matchScore = 91;
    } else if (tag === "Fashion") {
      btnId = "sbox-tag-fashion";
      creatorId = "creator-sneha-reddy";
      matchScore = 78;
    }
    
    const activeBtn = document.getElementById(btnId);
    if (activeBtn) activeBtn.classList.add("active");
    
    // Fetch creator and scores
    const creators = window.mockData.creators;
    const scores = window.mockData.creatorScores;
    
    const creator = creators.find(c => c.id === creatorId);
    const scoreObj = scores[creatorId];
    
    if (!creator || !scoreObj) return;
    
    // Update elements
    document.getElementById("sandbox-name").textContent = creator.full_name;
    document.getElementById("sandbox-avatar").src = creator.avatar_url;
    document.getElementById("sandbox-summary").textContent = creator.profile_summary;
    document.getElementById("sandbox-cis-score").textContent = `${scoreObj.intelligence_score}/100`;
    
    document.getElementById("sandbox-followers").textContent = creator.followers_count.toLocaleString('en-IN');
    document.getElementById("sandbox-engagement").textContent = `${creator.engagement_rate}%`;
    document.getElementById("sandbox-views").textContent = creator.average_views.toLocaleString('en-IN');
    
    // Render Tags
    const tagsBox = document.getElementById("sandbox-profile-tags");
    tagsBox.innerHTML = "";
    creator.categories.forEach(cat => tagsBox.innerHTML += `<span class="tag tag-green">${cat}</span>`);
    creator.languages.forEach(lang => tagsBox.innerHTML += `<span class="tag tag-cyan">${lang}</span>`);
    creator.regions.forEach(reg => tagsBox.innerHTML += `<span class="tag tag-indigo">${reg}</span>`);
    
    // Render Radar Chart
    window.UI.renderRadarChart("sandbox-radar-chart", scoreObj);
    
    // Render Donut Chart
    window.UI.renderDonutChart("sandbox-donut-chart", matchScore);
    
    // Render Match Label text
    let label = "Needs Optimization";
    if (matchScore >= 90) label = "Excellent Match";
    else if (matchScore >= 80) label = "Strong Match";
    else if (matchScore >= 70) label = "Average Match";
    document.getElementById("sandbox-match-label").textContent = label;
    document.getElementById("sandbox-match-label").style.color = matchScore >= 80 ? "#00F2A6" : "#4F46E5";
    
    // Render Pricing Slider
    const pricingRange = {
      min_price: creator.pricing_min,
      recommended_price: Math.round((creator.pricing_min + creator.pricing_premium) / 2),
      premium_price: creator.pricing_premium
    };
    
    window.UI.renderPricingSlider("sandbox-pricing-box", pricingRange, pricingRange.recommended_price, (val) => {
      // preview callback
    });
  },

  // Theme Switcher Layer
  setTheme: function(themeName) {
    localStorage.setItem("cl_active_theme", themeName);
    if (themeName === "slate") {
      document.body.classList.add("theme-slate");
    } else {
      document.body.classList.remove("theme-slate");
    }
    
    // Sync header dropdown if visible
    const select = document.querySelector(".landing-header select");
    if (select) select.value = themeName;
    
    this.adminLog(`Theme updated to: ${themeName}`);
  },

  // Custom Select Dropdown Handlers
  toggleCustomSelect: function(event) {
    event.stopPropagation();
    const customSelect = event.currentTarget.closest(".custom-select");
    
    // Close other dropdowns
    document.querySelectorAll(".custom-select").forEach(el => {
      if (el !== customSelect) el.classList.remove("active");
    });
    
    customSelect.classList.toggle("active");
  },

  selectCustomOption: function(event, value, text) {
    event.stopPropagation();
    const option = event.currentTarget;
    const customSelect = option.closest(".custom-select");
    
    // Update trigger text
    customSelect.querySelector(".custom-select-trigger span").textContent = text;
    
    // Toggle active classes on options
    customSelect.querySelectorAll(".custom-select-option").forEach(el => {
      el.classList.toggle("active", el === option);
    });
    
    // Sync backing select element
    const hiddenSelect = customSelect.nextElementSibling;
    if (hiddenSelect && hiddenSelect.tagName === "SELECT") {
      hiddenSelect.value = value;
      // Trigger native change events if any listeners exist
      hiddenSelect.dispatchEvent(new Event("change"));
    }
    
    // Close dropdown
    customSelect.classList.remove("active");
  },

  // Hero storytelling card rotation loop
  startHeroStorytellingCycle: function() {
    let activeIndex = 0;
    
    const cycle = () => {
      activeIndex = (activeIndex + 1) % 4;
      
      for (let i = 0; i < 4; i++) {
        const card = document.getElementById(`story-card-${i}`);
        if (!card) continue;
        
        // Calculate offset relative to active pointer
        const offset = (i - activeIndex + 4) % 4;
        
        // Remove old positions
        card.classList.remove("card-front", "card-middle", "card-back", "card-hidden");
        
        // Add new class name based on offset
        if (offset === 0) {
          card.classList.add("card-front");
        } else if (offset === 1) {
          card.classList.add("card-middle");
        } else if (offset === 2) {
          card.classList.add("card-back");
        } else {
          card.classList.add("card-hidden");
        }
      }
    };
    
    // Cycle every 5.5 seconds
    setInterval(cycle, 5500);
  },

  /* ==================== AI SEARCH PROMPT HANDLERS ==================== */
  fillPromptTemplate: function(text) {
    const input = document.getElementById("ai-search-prompt-input");
    if (input) {
      input.value = text;
      input.focus();
    }
  },

  handleAiPromptSearch: function(e) {
    e.preventDefault();
    const query = document.getElementById("ai-search-prompt-input").value;
    if (!query.trim()) {
      this.showToast("Please enter a campaign brief or niche.", "warning");
      return;
    }
    
    const loader = document.getElementById("ai-search-loader");
    const results = document.getElementById("search-results-grid");
    
    // Reset views
    results.style.display = "none";
    loader.style.display = "block";
    
    // Render steps representing n8n pipelines
    const stepsData = [
      "WF-04: Parse campaign query semantically",
      "WF-05: Translate local dialects & map affinities",
      "WF-06: Calculate recommended pricing confidence",
      "Compiling intelligence scoring profiles"
    ];
    
    const stepsBox = document.getElementById("ai-loader-steps");
    stepsBox.innerHTML = stepsData.map((step, idx) => `
      <div class="loader-step-row" id="loader-step-${idx}">
        <span class="loader-step-icon"></span>
        <span>${step}</span>
      </div>
    `).join("");
    
    let currentStep = 0;
    
    const runStep = () => {
      if (currentStep > 0) {
        const prev = document.getElementById(`loader-step-${currentStep - 1}`);
        if (prev) {
          prev.classList.remove("active");
          prev.classList.add("completed");
        }
      }
      
      if (currentStep < stepsData.length) {
        const cur = document.getElementById(`loader-step-${currentStep}`);
        if (cur) cur.classList.add("active");
        
        currentStep++;
        setTimeout(runStep, 900 + Math.random() * 400);
      } else {
        // Complete loading
        setTimeout(() => {
          loader.style.display = "none";
          this.renderPromptSearchResults(query);
        }, 500);
      }
    };
    
    runStep();
  },

  renderPromptSearchResults: function(query) {
    const grid = document.getElementById("search-results-grid");
    grid.innerHTML = "";
    grid.style.display = "grid";
    
    const creators = window.mockData.creators;
    const scores = window.mockData.creatorScores;
    
    // Select matched creators based on keywords or default to top ones
    let matches = [];
    const qLower = query.toLowerCase();
    
    if (qLower.includes("marathi") || qLower.includes("pune")) {
      matches = [creators.find(c => c.id === "creator-priya-sharma")];
    } else if (qLower.includes("bundeli") || qLower.includes("indore")) {
      matches = [creators.find(c => c.id === "creator-anjali-verma")];
    } else if (qLower.includes("telugu") || qLower.includes("hyderabad")) {
      matches = [creators.find(c => c.id === "creator-sneha-reddy")];
    } else {
      // Default: Return all 3 key regional matches
      matches = creators.filter(c => ["creator-priya-sharma", "creator-anjali-verma", "creator-sneha-reddy"].includes(c.id));
    }
    
    matches.forEach((c, idx) => {
      const scoreObj = scores[c.id];
      const cardId = `match-res-card-${c.id}`;
      const donutId = `match-res-donut-${c.id}`;
      const priceId = `match-res-price-${c.id}`;
      
      const card = document.createElement("div");
      card.className = "col-12 luxury-card";
      card.id = cardId;
      card.style.opacity = 0;
      card.style.transform = "translateY(15px)";
      card.style.transition = "opacity 0.6s ease, transform 0.6s ease";
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.gap = "20px";
      card.style.padding = "24px";
      card.style.marginBottom = "16px";
      
      card.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <img src="${c.avatar_url}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid var(--color-primary-cyan);" alt="Avatar">
            <div>
              <h3 style="font-size: 15px; font-weight: 600; color: #fff; margin:0;">${c.full_name}</h3>
              <p class="view-subtitle" style="font-size: 11px; color: var(--color-text-gray); margin-top: 2px; margin-bottom:0;">${c.regions.join("/")} | ${c.languages.join("/")}</p>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 12px; margin-left: auto;">
            <span class="tag tag-green pulse-badge-green" style="font-size: 10px; font-weight: 700; padding: 3px 8px;">${scoreObj.intelligence_score} CIS</span>
            <div id="${donutId}" style="width: 48px; height: 48px;"></div>
          </div>
        </div>
        
        <p class="view-subtitle" style="font-size: 12px; line-height: 1.6; border-left: 2px solid var(--color-primary-indigo); padding-left: 12px; margin: 4px 0; color: #94A3B8;">
          "${c.profile_summary}"
        </p>
        
        <div class="dashboard-grid" style="gap: 16px; margin: 0; border-top: 1px solid var(--color-border); padding-top: 16px; align-items: center;">
          <!-- Left: Stats -->
          <div class="col-4" style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 11px;">
              <span class="input-label" style="font-size: 9px; margin-bottom:0;">FOLLOWERS</span>
              <span style="font-weight: 600; color:#fff;">${c.followers_count.toLocaleString('en-IN')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px;">
              <span class="input-label" style="font-size: 9px; margin-bottom:0;">ENGAGEMENT</span>
              <span style="font-weight: 600; color:var(--color-primary-cyan);">${c.engagement_rate}%</span>
            </div>
          </div>
          
          <!-- Middle: Pricing Slider -->
          <div class="col-5" id="${priceId}" style="padding: 0 10px;">
            <!-- Rendered by UI -->
          </div>
          
          <!-- Right: Actions -->
          <div class="col-3" style="display: flex; gap: 8px; justify-content: flex-end;">
            <button class="btn btn-secondary" style="padding: 8px 12px; font-size: 11px; border-radius: 8px;" onclick="App.openCreatorDetails('${c.id}')">Analysis</button>
            <button class="btn btn-primary" style="padding: 8px 12px; font-size: 11px; border-radius: 8px;" onclick="App.expressCollabInterestDirect('${c.id}')">Send Offer</button>
          </div>
        </div>
      `;
      
      grid.appendChild(card);
      
      setTimeout(() => {
        card.style.opacity = 1;
        card.style.transform = "translateY(0px)";
        
        // Render SVG match score gauge
        window.UI.renderDonutChart(donutId, 94 - idx * 5);
        
        // Render Pricing Sourcing sliders
        const pricingRange = {
          min_price: c.pricing_min,
          recommended_price: Math.round((c.pricing_min + c.pricing_premium) / 2),
          premium_price: c.pricing_premium
        };
        window.UI.renderPricingSlider(priceId, pricingRange, pricingRange.recommended_price, (val) => {
          // callback
        });
      }, idx * 250);
    });
  },

  expressCollabInterestDirect: function(creatorId) {
    this.showToast("Simulating workflow request... WF-06: Triggering Collab offer", "info");
    setTimeout(() => {
      this.showToast("Collab invitation sent successfully! Waiting for response.", "success");
    }, 1200);
  },

  /* ==================== OTP VERIFICATION LOGIC ==================== */
  otpTimerInterval: null,
  otpEmailTarget: "",

  startOtpTimer: function() {
    let timeLeft = 60;
    const countEl = document.getElementById("otp-countdown-sec");
    const labelEl = document.getElementById("otp-timer-label");
    const resendBtn = document.getElementById("otp-resend-btn");
    
    if (this.otpTimerInterval) clearInterval(this.otpTimerInterval);
    
    resendBtn.style.pointerEvents = "none";
    resendBtn.style.opacity = "0.4";
    labelEl.style.display = "inline";
    if (countEl) countEl.textContent = timeLeft;
    
    this.otpTimerInterval = setInterval(() => {
      timeLeft--;
      if (countEl) countEl.textContent = timeLeft;
      
      if (timeLeft <= 0) {
        clearInterval(this.otpTimerInterval);
        labelEl.style.display = "none";
        resendBtn.style.pointerEvents = "auto";
        resendBtn.style.opacity = "1";
      }
    }, 1000);
  },

  resendOtpCode: function() {
    this.showToast("Verification code resent successfully!", "success");
    this.startOtpTimer();
  },

  verifyOtpCode: function(e) {
    e.preventDefault();
    const code = document.getElementById("verify-otp-input").value;
    if (code.length < 6) {
      this.showToast("Please enter a valid 6-digit OTP code.", "warning");
      return;
    }
    
    this.showToast("Verifying code...", "info");
    
    setTimeout(async () => {
      const email = this.otpEmailTarget || "priya.sharma@creatorlens.ai";
      
      try {
        // Match user locally
        const users = JSON.parse(localStorage.getItem("cl_users") || "[]");
        let matched = users.find(u => u.email === email);
        if (!matched) {
          // Auto register new creator on OTP check fallback
          matched = {
            id: "creator-priya-sharma",
            email: email,
            role: "creator"
          };
        }
        
        this.currentUser = matched;
        localStorage.setItem("cl_session_user", JSON.stringify(this.currentUser));
        this.showToast("OTP Verified! Logged in successfully.", "success");
        
        if (this.otpTimerInterval) clearInterval(this.otpTimerInterval);
        
        // Hide verification overlay panel
        document.getElementById("auth-main-panel").style.display = "block";
        document.getElementById("auth-otp-verify-panel").style.display = "none";
        
        this.showMainLayout();
      } catch (err) {
        this.showToast(err.message, "error");
      }
    }, 1200);
  },

  cancelOtpVerification: function() {
    if (this.otpTimerInterval) clearInterval(this.otpTimerInterval);
    document.getElementById("auth-main-panel").style.display = "block";
    document.getElementById("auth-otp-verify-panel").style.display = "none";
  },

  /* ==================== MULTI-STEP CREATOR ONBOARDING WIZARD ==================== */
  onboardingStep: 1,
  selectedLanguages: [],
  selectedCategories: [],
  tempCompiledScores: null,

  initOnboardingWizard: async function() {
    this.onboardingStep = 1;
    this.selectedLanguages = [];
    this.selectedCategories = [];
    this.tempCompiledScores = null;
    
    // Fetch creator details to pre-populate fields
    const creator = await window.DB.getProfile(this.currentUser.id, "creator");
    if (creator) {
      document.getElementById("ob-name").value = creator.full_name || "";
      document.getElementById("ob-avatar").value = creator.avatar_url || "";
      document.getElementById("ob-bio").value = creator.bio || "";
      document.getElementById("ob-city").value = creator.regions ? (creator.regions[0] || "") : "";
      document.getElementById("ob-state").value = creator.regions ? (creator.regions[1] || "") : "";
      document.getElementById("ob-country").value = "India";
      
      document.getElementById("ob-followers").value = creator.followers_count || "";
      document.getElementById("ob-views").value = creator.average_views || "";
      document.getElementById("ob-engagement").value = creator.engagement_rate || "";
      document.getElementById("ob-price-min").value = creator.pricing_min || "";
      document.getElementById("ob-price-prem").value = creator.pricing_premium || "";
      
      this.selectedLanguages = creator.languages ? [...creator.languages] : [];
      this.selectedCategories = creator.categories ? [...creator.categories] : [];
    }
    
    // Render Languages selector chips
    const langContainer = document.getElementById("ob-lang-chips");
    const languagesList = ["Hindi", "Marathi", "English", "Telugu", "Tamil", "Bengali", "Gujarati", "Punjabi"];
    langContainer.innerHTML = languagesList.map(lang => {
      const active = this.selectedLanguages.includes(lang) ? "active" : "";
      return `
        <span class="tag clickable ${active}" onclick="App.toggleLanguageChip(this, '${lang}')" style="font-size:13px; padding:8px 16px; cursor:pointer; user-select:none; border-radius:8px;">${lang}</span>
      `;
    }).join("");
    
    // Render Categories grid cards
    const catContainer = document.getElementById("ob-category-cards");
    const categoriesList = [
      { id: "food", label: "Food", desc: "Traditional culinary walks & local recipes" },
      { id: "travel", label: "Travel", desc: "Tier-2/3 tourism guides & explorations" },
      { id: "fashion", label: "Fashion", desc: "Vernacular lookbooks & style" },
      { id: "gaming", label: "Gaming", desc: "Mobile streams & local eSports vlogs" },
      { id: "finance", label: "Finance", desc: "Saving tips & mutual funds in Hindi" },
      { id: "beauty", label: "Beauty", desc: "Skincare routines & cosmetic guides" },
      { id: "tech", label: "Technology", desc: "Unboxings & specs in local languages" },
      { id: "fitness", label: "Fitness", desc: "Traditional home workout vlogs" }
    ];
    
    catContainer.innerHTML = categoriesList.map(cat => {
      const active = this.selectedCategories.includes(cat.id) ? "active-card" : "";
      return `
        <div class="col-6 luxury-card clickable-card ${active}" data-cat="${cat.id}" onclick="App.toggleCategoryCard(this, '${cat.id}')" style="padding:16px; text-align:left; cursor:pointer; user-select:none; box-sizing:border-box;">
          <h4 style="margin: 0 0 6px 0; font-size:14px; color:#fff;">${cat.label}</h4>
          <p class="view-subtitle" style="font-size:11px; margin:0; line-height:1.4;">${cat.desc}</p>
        </div>
      `;
    }).join("");
    
    this.showOnboardingStep(1);
  },

  toggleLanguageChip: function(el, lang) {
    if (!App.selectedLanguages) App.selectedLanguages = [];
    if (App.selectedLanguages.includes(lang)) {
      App.selectedLanguages = App.selectedLanguages.filter(l => l !== lang);
      el.classList.remove("active");
    } else {
      App.selectedLanguages.push(lang);
      el.classList.add("active");
    }
  },

  toggleCategoryCard: function(el, catId) {
    if (!App.selectedCategories) App.selectedCategories = [];
    if (App.selectedCategories.includes(catId)) {
      App.selectedCategories = App.selectedCategories.filter(c => c !== catId);
      el.classList.remove("active-card");
    } else {
      App.selectedCategories.push(catId);
      el.classList.add("active-card");
    }
  },

  showOnboardingStep: function(stepNum) {
    this.onboardingStep = stepNum;
    
    // Hide all steps
    document.querySelectorAll(".wizard-step").forEach(el => el.style.display = "none");
    
    // Show current step
    document.getElementById(`wstep-${stepNum}`).style.display = "block";
    
    // Update subtitle text
    const subtitle = document.getElementById("wizard-subtitle");
    const stepsNames = [
      "Welcome to CreatorLens",
      "Verify Personal Details",
      "Select Regional Dialects",
      "Select Focus Categories",
      "Connect Social Links",
      "Enter Audience & Pricing Metrics",
      "AI Sourcing Analysis",
      "Compile Intelligence Profile"
    ];
    if (subtitle) {
      subtitle.textContent = `Step ${stepNum} of 8: ${stepsNames[stepNum - 1]}`;
    }
    
    // Update progress bar width
    const pct = (stepNum / 8) * 100;
    const pbar = document.getElementById("onboarding-progress-bar");
    if (pbar) pbar.style.width = `${pct}%`;
    
    // Update navigation button visibilities
    const prevBtn = document.getElementById("ob-btn-prev");
    const nextBtn = document.getElementById("ob-btn-next");
    
    if (prevBtn) prevBtn.style.display = stepNum === 1 || stepNum === 7 ? "none" : "block";
    
    if (stepNum === 7) {
      if (nextBtn) nextBtn.style.display = "none";
    } else {
      if (nextBtn) nextBtn.style.display = "block";
    }
    
    if (stepNum === 8) {
      if (nextBtn) nextBtn.textContent = "Finish Onboarding →";
    } else {
      if (nextBtn) nextBtn.textContent = "Continue →";
    }
    
    // Reset view scroll positions
    window.scrollTo(0, 0);
  },

  nextOnboardingStep: function() {
    if (this.onboardingStep === 2) {
      // Validate step 2
      const name = document.getElementById("ob-name").value;
      if (!name.trim()) {
        this.showToast("Please enter your full name.", "warning");
        return;
      }
    }
    
    if (this.onboardingStep === 3) {
      if (this.selectedLanguages.length === 0) {
        this.showToast("Please select at least one language.", "warning");
        return;
      }
    }
    
    if (this.onboardingStep === 4) {
      if (this.selectedCategories.length === 0) {
        this.showToast("Please select at least one category.", "warning");
        return;
      }
    }
    
    if (this.onboardingStep === 6) {
      // Validate pricing min / max
      const min = document.getElementById("ob-price-min").value;
      const prem = document.getElementById("ob-price-prem").value;
      if (!min || !prem) {
        this.showToast("Please enter your pricing bounds.", "warning");
        return;
      }
    }
    
    if (this.onboardingStep < 6) {
      this.showOnboardingStep(this.onboardingStep + 1);
    } else if (this.onboardingStep === 6) {
      // Transition to AI Analysis Loader (Step 7)
      this.showOnboardingStep(7);
      this.runAiOnboardingAnalysis();
    } else if (this.onboardingStep === 8) {
      // Finish Onboarding
      this.finishCreatorOnboarding();
    }
  },

  prevOnboardingStep: function() {
    if (this.onboardingStep > 1 && this.onboardingStep !== 7) {
      this.showOnboardingStep(this.onboardingStep - 1);
    }
  },

  runAiOnboardingAnalysis: function() {
    const stepsData = [
      "WF-01: Connect profile data brokers",
      "WF-02: Parse bio & vernacular dialect parameters",
      "WF-03: Assess regional audience trust metrics",
      "Compiling final Intelligence Score..."
    ];
    
    const container = document.getElementById("ob-loader-steps");
    container.innerHTML = "";
    
    let idx = 0;
    
    const runStep = () => {
      if (idx > 0) {
        const prev = document.getElementById(`ob-step-row-${idx - 1}`);
        if (prev) {
          prev.classList.remove("active");
          prev.classList.add("completed");
        }
      }
      
      if (idx < stepsData.length) {
        const row = document.createElement("div");
        row.className = "loader-step-row active";
        row.id = `ob-step-row-${idx}`;
        row.innerHTML = `
          <span class="loader-step-icon"></span>
          <span>${stepsData[idx]}</span>
        `;
        container.appendChild(row);
        
        idx++;
        setTimeout(runStep, 800 + Math.random() * 400);
      } else {
        setTimeout(() => {
          // Transition to Step 8
          this.showOnboardingStep(8);
          this.compileOnboardingSummary();
        }, 600);
      }
    };
    
    runStep();
  },

  compileOnboardingSummary: function() {
    // Generate simulated CIS Score
    const followers = parseInt(document.getElementById("ob-followers").value) || 50000;
    const engagement = parseFloat(document.getElementById("ob-engagement").value) || 5.0;
    
    // Weight calculation
    let baseScore = 75;
    if (followers > 100000) baseScore += 8;
    else if (followers > 50000) baseScore += 5;
    
    if (engagement > 8.0) baseScore += 10;
    else if (engagement > 5.0) baseScore += 6;
    
    const finalScore = Math.min(98, baseScore + Math.floor(Math.random() * 5));
    
    const overallScoreEl = document.getElementById("ob-score-overall");
    if (overallScoreEl) overallScoreEl.textContent = finalScore;
    
    // Draw SVG radar chart preview for Step 8
    const mockScores = {
      intelligence_score: finalScore,
      engagement_trust: Math.min(99, Math.round(finalScore * 1.05)),
      regional_affinity: Math.min(99, Math.round(finalScore * 0.98)),
      dialect_accuracy: Math.min(99, Math.round(finalScore * 1.02)),
      readiness: Math.min(99, Math.round(finalScore * 0.95))
    };
    
    window.UI.renderRadarChart("ob-radar-chart", mockScores);
    
    // Temporarily cache compiled scores to write on Finish
    this.tempCompiledScores = mockScores;
  },

  finishCreatorOnboarding: async function() {
    this.showToast("Finalizing onboarding profiles...", "info");
    
    try {
      // Build updated profile object
      const name = document.getElementById("ob-name").value;
      const avatar = document.getElementById("ob-avatar").value || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150";
      const bio = document.getElementById("ob-bio").value;
      const city = document.getElementById("ob-city").value || "Indore";
      const state = document.getElementById("ob-state").value || "Madhya Pradesh";
      
      const followers = parseInt(document.getElementById("ob-followers").value) || 50000;
      const views = parseInt(document.getElementById("ob-views").value) || 10000;
      const engagement = parseFloat(document.getElementById("ob-engagement").value) || 5.0;
      const minPrice = parseInt(document.getElementById("ob-price-min").value) || 10000;
      const premPrice = parseInt(document.getElementById("ob-price-prem").value) || 20000;
      
      const creators = JSON.parse(localStorage.getItem("cl_creators") || "[]");
      const idx = creators.findIndex(c => c.id === this.currentUser.id);
      const existingCode = (creators[idx] && creators[idx].creator_code) || ("CR_" + String(creators.length + 5).padStart(3, "0"));
      
      const updatedProfile = {
        id: this.currentUser.id,
        creator_code: existingCode,
        full_name: name,
        avatar_url: avatar,
        bio: bio,
        categories: this.selectedCategories,
        languages: this.selectedLanguages,
        regions: [city, state],
        followers_count: followers,
        average_views: views,
        engagement_rate: engagement,
        pricing_min: minPrice,
        pricing_premium: premPrice,
        profile_completeness: 100,
        is_enriched: true,
        profile_summary: bio
      };
      
      // Update in Local Storage
      if (idx !== -1) {
        creators[idx] = updatedProfile;
      } else {
        creators.push(updatedProfile);
      }
      localStorage.setItem("cl_creators", JSON.stringify(creators));
      
      if (window.DB.isLive()) {
        await window.DB.saveProfile(this.currentUser.id, "creator", updatedProfile);
        try {
          await window.N8N.triggerProfileEnrichment(this.currentUser.id);
        } catch (e) {
          console.warn("Failed to run live profile enrichment trigger on onboarding:", e);
        }
      }
      
      // Save compiled scores
      const scores = JSON.parse(localStorage.getItem("cl_scores") || "{}");
      scores[this.currentUser.id] = this.tempCompiledScores || {
        intelligence_score: 85,
        engagement_trust: 88,
        regional_affinity: 80,
        dialect_accuracy: 85,
        readiness: 90
      };
      localStorage.setItem("cl_scores", JSON.stringify(scores));
      
      // Seed suggestions dynamically based on profile strengths
      const suggestions = JSON.parse(localStorage.getItem("cl_suggestions") || "{}");
      suggestions[this.currentUser.id] = [
        { suggestion_text: "Verify audience city breakdown details.", expected_improvement: 4, impact_level: "high" },
        { suggestion_text: "Publish secondary YouTube video short in Marathi dialect.", expected_improvement: 6, impact_level: "medium" },
        { suggestion_text: "Fill brand safety verification certifications.", expected_improvement: 3, impact_level: "low" }
      ];
      localStorage.setItem("cl_suggestions", JSON.stringify(suggestions));
      
      setTimeout(() => {
        this.showToast("Creator onboarding complete!", "success");
        // Redirect to dashboard
        this.switchSubview("creator-dashboard");
      }, 1000);
      
    } catch (err) {
      this.showToast(err.message, "error");
    }
  },

  /* ==================== CREATOR CAMPAIGN DISCOVERY ==================== */
  loadCampaignDiscoveryList: async function() {
    const grid = document.getElementById("discovery-campaigns-grid");
    if (!grid) return;
    
    const campaigns = JSON.parse(localStorage.getItem("cl_campaigns") || "[]");
    const creator = await window.DB.getProfile(this.currentUser.id, "creator");
    const catFilter = document.getElementById("disc-filter-category").value;
    const budFilter = document.getElementById("disc-filter-budget").value;
    
    const collabs = JSON.parse(localStorage.getItem("cl_collabs") || "[]");
    
    let filtered = campaigns.filter(c => c.status === "active");
    if (catFilter !== "all") {
      filtered = filtered.filter(c => c.category === catFilter);
    }
    if (budFilter !== "all") {
      filtered = filtered.filter(c => c.budget >= parseInt(budFilter));
    }
    
    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="col-12 luxury-card" style="text-align: center; padding: 40px; border-style: dashed; grid-column: span 12;">
          <p class="view-subtitle">No sponsorships match the current filters.</p>
        </div>
      `;
      return;
    }
    
    grid.innerHTML = filtered.map(camp => {
      let matchScore = 65;
      if (creator) {
        if (creator.categories && creator.categories.includes(camp.category)) matchScore += 12;
        if (creator.languages && creator.languages.includes(camp.language)) matchScore += 10;
        if (creator.regions && creator.regions.some(r => r.toLowerCase().includes(camp.region.toLowerCase()))) matchScore += 10;
      }
      matchScore = Math.min(98, matchScore);
      
      const isApplied = collabs.some(col => col.campaign_id === camp.id && col.creator_id === this.currentUser.id);
      const btnText = isApplied ? "Applied ✓" : "Apply to Campaign";
      const btnClass = isApplied ? "btn-secondary" : "btn-primary";
      const btnAttr = isApplied ? "disabled" : "";
      
      return `
        <div class="col-4 luxury-card" style="display:flex; flex-direction:column; justify-content:space-between; padding:20px; box-sizing:border-box;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:12px;">
              <span class="tag tag-indigo" style="font-size:9px;">${camp.category.toUpperCase()}</span>
              <span style="font-weight:700; color:var(--color-primary-cyan); font-size:12px;">${matchScore}% Match</span>
            </div>
            <h3 style="font-size:15px; font-weight:600; color:#fff; margin:0 0 6px 0;">${camp.title}</h3>
            <p class="view-subtitle" style="font-size:11px; line-height:1.5; color:#94A3B8; margin-bottom:14px; min-height:48px;">${camp.objective}</p>
            
            <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:16px; border-top:1px solid rgba(255,255,255,0.05); padding-top:10px;">
              <div style="display:flex; justify-content:space-between; font-size:11px;">
                <span style="color:var(--color-text-muted);">BUDGET</span>
                <span style="color:#fff; font-weight:600;">₹${camp.budget.toLocaleString('en-IN')}</span>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:11px;">
                <span style="color:var(--color-text-muted);">REGION TARGET</span>
                <span style="color:#fff; font-weight:600;">${camp.region}</span>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:11px;">
                <span style="color:var(--color-text-muted);">LANGUAGE</span>
                <span style="color:#fff; font-weight:600;">${camp.language}</span>
              </div>
            </div>
          </div>
          
          <button class="btn ${btnClass}" style="width:100%; font-size:12px;" ${btnAttr} onclick="App.applyToCampaign('${camp.id}', ${matchScore})">
            ${btnText}
          </button>
        </div>
      `;
    }).join("");
  },

  applyToCampaign: function(campId, matchScore) {
    this.showToast("Submitting sponsorship request...", "info");
    
    setTimeout(() => {
      const collabs = JSON.parse(localStorage.getItem("cl_collabs") || "[]");
      collabs.push({
        id: "col-" + Math.floor(Math.random()*10000),
        campaign_id: campId,
        creator_id: this.currentUser.id,
        match_score: matchScore,
        status: "pending",
        created_at: new Date().toISOString()
      });
      localStorage.setItem("cl_collabs", JSON.stringify(collabs));
      
      this.showToast("Applied successfully! Review in progress.", "success");
      this.loadCampaignDiscoveryList();
      
      this.addSystemNotification(
        "Campaign Application",
        `You have successfully applied to the campaign of ID: ${campId}. Status: Pending review.`,
        "info"
      );
    }, 1200);
  },

  addSystemNotification: function(title, message, type = "info") {
    const notifications = JSON.parse(localStorage.getItem("cl_notifications") || "[]");
    notifications.unshift({
      id: "not-" + Math.floor(Math.random()*100000),
      user_id: this.currentUser.id,
      title: title,
      message: message,
      type: type,
      read: false,
      created_at: new Date().toISOString()
    });
    localStorage.setItem("cl_notifications", JSON.stringify(notifications));
  },

  /* ==================== NOTIFICATIONS MODULE ==================== */
  loadNotifications: function() {
    const listEl = document.getElementById("notifications-inbox-list");
    if (!listEl) return;
    
    if (!localStorage.getItem("cl_notifications")) {
      const initial = [
        { id: "not-1", user_id: this.currentUser.id, title: "Payment Cleared", message: "Advance campaign payout of ₹15,000 for Swad Spices has been processed.", type: "payment", read: false, created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString() },
        { id: "not-2", user_id: this.currentUser.id, title: "Campaign Matched", message: "AI matching engine has aligned your profile with Pune Masala Chai Launch campaign.", type: "success", read: false, created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString() },
        { id: "not-3", user_id: this.currentUser.id, title: "System Scan Success", message: "Your creator score has been recalculated successfully following YouTube channel sync.", type: "info", read: true, created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString() }
      ];
      localStorage.setItem("cl_notifications", JSON.stringify(initial));
    }
    
    const notifications = JSON.parse(localStorage.getItem("cl_notifications") || "[]")
      .filter(n => n.user_id === this.currentUser.id);
    
    if (notifications.length === 0) {
      listEl.innerHTML = `
        <div class="luxury-card" style="text-align: center; padding: 40px; border-style: dashed;">
          <p class="view-subtitle" style="color: var(--color-text-gray);">Your inbox is clear. No new notifications.</p>
        </div>
      `;
      return;
    }
    
    listEl.innerHTML = notifications.map(not => {
      let icon = "🔔";
      if (not.type === "payment") icon = "💳";
      else if (not.type === "success") icon = "✓";
      else if (not.type === "warning") icon = "⚠️";
      
      const unreadBg = not.read ? "" : "background: rgba(0, 242, 166, 0.02); border-left: 3px solid var(--color-primary-cyan);";
      
      return `
        <div class="luxury-card" style="display:flex; justify-content:space-between; align-items:center; padding:16px; box-sizing:border-box; ${unreadBg}">
          <div style="display:flex; align-items:center; gap:16px;">
            <div style="font-size:20px; width:36px; height:36px; border-radius:50%; background:rgba(255,255,255,0.03); display:flex; align-items:center; justify-content:center;">
              ${icon}
            </div>
            <div>
              <h4 style="margin:0 0 4px 0; font-size:13px; color:#fff; font-weight:600;">${not.title}</h4>
              <p class="view-subtitle" style="margin:0; font-size:11px; color:#94A3B8;">${not.message}</p>
            </div>
          </div>
          <span style="font-size:10px; color:var(--color-text-muted);">${new Date(not.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
      `;
    }).join("");
  },

  clearAllNotifications: function() {
    const notifications = JSON.parse(localStorage.getItem("cl_notifications") || "[]");
    notifications.forEach(n => {
      if (n.user_id === this.currentUser.id) n.read = true;
    });
    localStorage.setItem("cl_notifications", JSON.stringify(notifications));
    this.showToast("All alerts marked as read.", "success");
    this.loadNotifications();
  },

  /* ==================== PROFILE MGMT & AI RE-ANALYSIS ==================== */
  loadProfileMgmtDetails: async function() {
    const creator = await window.DB.getProfile(this.currentUser.id, "creator");
    if (!creator) return;
    
    document.getElementById("pmg-name").value = creator.full_name || "";
    document.getElementById("pmg-avatar").value = creator.avatar_url || "";
    document.getElementById("pmg-bio").value = creator.bio || "";
    document.getElementById("pmg-ig").value = creator.social_ig || "";
    document.getElementById("pmg-yt").value = creator.social_yt || "";
    
    const scores = await window.DB.getCreatorScores(creator.id);
    document.getElementById("pmg-score-value").textContent = scores ? scores.intelligence_score : "--";
  },

  saveProfileMgmtDetails: async function(e) {
    e.preventDefault();
    this.showToast("Saving details...", "info");
    
    try {
      const creators = JSON.parse(localStorage.getItem("cl_creators") || "[]");
      const idx = creators.findIndex(c => c.id === this.currentUser.id);
      if (idx !== -1) {
        creators[idx].full_name = document.getElementById("pmg-name").value;
        creators[idx].avatar_url = document.getElementById("pmg-avatar").value;
        creators[idx].bio = document.getElementById("pmg-bio").value;
        creators[idx].social_ig = document.getElementById("pmg-ig").value;
        creators[idx].social_yt = document.getElementById("pmg-yt").value;
        localStorage.setItem("cl_creators", JSON.stringify(creators));
      }
      this.showToast("Profile details saved successfully!", "success");
    } catch(err) {
      this.showToast(err.message, "error");
    }
  },

  triggerCreatorReanalysis: function() {
    const modal = document.getElementById("modal-pipeline-progress");
    const steps = [
      { id: "qstep-1", label: "Step 1: Scrape Profile Details", text: "Pulling bio parameters..." },
      { id: "qstep-2", label: "Step 2: Parse Dialect Affinity", text: "Analyzing regional expressions..." },
      { id: "qstep-3", label: "Step 3: Render Intelligence Score", text: "SVG concentric ring rendering..." }
    ];
    
    document.getElementById("pipeline-title").textContent = "Re-analyzing Creator Profile...";
    modal.classList.add("active");
    
    steps.forEach((s) => {
      const stepEl = document.getElementById(s.id);
      if (stepEl) {
        stepEl.className = "queue-step";
        stepEl.querySelector(".step-name").textContent = s.label;
        stepEl.querySelector(".step-status").textContent = "Pending";
      }
    });
    
    let idx = 0;
    const nextStep = () => {
      if (idx > 0) {
        const prev = document.getElementById(steps[idx - 1].id);
        if (prev) {
          prev.className = "queue-step success";
          prev.querySelector(".step-status").textContent = "Completed";
        }
      }
      
      if (idx < steps.length) {
        const current = document.getElementById(steps[idx].id);
        if (current) {
          current.className = "queue-step active";
          current.querySelector(".step-status").textContent = "Analyzing...";
        }
        idx++;
        setTimeout(nextStep, 1000);
      } else {
        setTimeout(async () => {
          modal.classList.remove("active");
          
          const scores = JSON.parse(localStorage.getItem("cl_scores") || "{}");
          const userScores = scores[this.currentUser.id] || {
            intelligence_score: 85,
            engagement_trust: 88,
            regional_affinity: 80,
            dialect_accuracy: 85,
            readiness: 90
          };
          userScores.intelligence_score = Math.min(99, userScores.intelligence_score + 1);
          scores[this.currentUser.id] = userScores;
          localStorage.setItem("cl_scores", JSON.stringify(scores));
          
          this.showToast("AI Profile Re-analysis complete!", "success");
          this.loadProfileMgmtDetails();
          this.addSystemNotification(
            "AI Re-analysis Complete",
            `Your profile scoring has been optimized. New CIS Score is: ${userScores.intelligence_score}.`,
            "success"
          );
        }, 800);
      }
    };
    
    nextStep();
  },

  // ==================== AUTH EXTENSIONS (FORGOT / RESET) ====================
  showForgotPanel: function() {
    document.getElementById("auth-main-panel").style.display = "none";
    document.getElementById("auth-otp-verify-panel").style.display = "none";
    document.getElementById("auth-forgot-panel").style.display = "block";
    document.getElementById("auth-reset-panel").style.display = "none";
  },

  cancelForgotFlow: function() {
    document.getElementById("auth-main-panel").style.display = "block";
    document.getElementById("auth-otp-verify-panel").style.display = "none";
    document.getElementById("auth-forgot-panel").style.display = "none";
    document.getElementById("auth-reset-panel").style.display = "none";
  },

  handleForgotPasswordSubmit: function(e) {
    e.preventDefault();
    const email = document.getElementById("forgot-email").value;
    this.showToast(`Recovery link sent to ${email}`, "success");
    
    // Simulate navigation to reset page shortly after link verification
    setTimeout(() => {
      document.getElementById("auth-forgot-panel").style.display = "none";
      document.getElementById("auth-reset-panel").style.display = "block";
    }, 1500);
  },

  handleResetPasswordSubmit: function(e) {
    e.preventDefault();
    const pass = document.getElementById("reset-password").value;
    const confirmPass = document.getElementById("reset-password-confirm").value;
    
    if (pass !== confirmPass) {
      this.showToast("Passwords do not match!", "error");
      return;
    }
    
    this.showToast("Password updated successfully. Logging in...", "success");
    setTimeout(() => {
      // Create session and login automatically
      const demoUser = { id: "usr-" + Math.random().toString(36).substr(2, 5), email: "recovered@user.com", role: "creator" };
      localStorage.setItem("cl_session_user", JSON.stringify(demoUser));
      this.currentUser = demoUser;
      
      this.cancelForgotFlow();
      this.showMainLayout();
    }, 1200);
  },

  // ==================== CREATOR EARNINGS LOADER ====================
  loadCreatorEarnings: function() {
    const listBody = document.getElementById("creator-earnings-list-body");
    if (!listBody) return;
    
    listBody.innerHTML = "";
    
    // Renders custom mock transactions
    const txs = [
      { id: "TX-90312", campaign: "Swad Spices Pune Launch", brand: "Swad Spices Ltd", amount: "₹25,000", status: "settled", date: "2026-08-01" },
      { id: "TX-90184", campaign: "Vernacular organic tea promotion", brand: "Chai Time", amount: "₹20,000", status: "settled", date: "2026-07-28" },
      { id: "TX-91048", campaign: "Organic Masala Rollout", brand: "Swad Spices Ltd", amount: "₹15,000", status: "pending", date: "2026-08-03" }
    ];
    
    txs.forEach(t => {
      const statusColor = t.status === "settled" ? "var(--color-primary-green)" : "var(--color-primary-cyan)";
      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid var(--color-border)";
      tr.innerHTML = `
        <td style="padding: 12px 8px; color: #fff; font-family: monospace;">${t.id}</td>
        <td style="padding: 12px 8px; color: #fff; font-weight:600;">${t.campaign}</td>
        <td style="padding: 12px 8px; color: var(--color-text-gray);">${t.brand}</td>
        <td style="padding: 12px 8px; color: #fff; font-weight: 700;">${t.amount}</td>
        <td style="padding: 12px 8px;"><span class="tag" style="border: 1px solid ${statusColor}; color: ${statusColor}; background: transparent; padding: 2px 8px; font-size: 10px; border-radius: 4px;">${t.status.toUpperCase()}</span></td>
        <td style="padding: 12px 8px; color: var(--color-text-muted);">${t.date}</td>
      `;
      listBody.appendChild(tr);
    });
  },

  // ==================== BRAND SETTINGS LOADER ====================
  loadBrandSettings: function() {
    this.adminLog("Loaded brand settings panel.");
  },

  // ==================== ADMIN AUDIT LOGS & TAB SWITCHER ====================
  switchAdminTab: function(tabName) {
    // Hide all tabs
    document.getElementById("admin-panel-logs").style.display = "none";
    document.getElementById("admin-panel-users").style.display = "none";
    document.getElementById("admin-panel-camps").style.display = "none";
    
    // Show active tab
    if (tabName === "logs") {
      document.getElementById("admin-panel-logs").style.display = "block";
    } else if (tabName === "users") {
      document.getElementById("admin-panel-users").style.display = "block";
      this.renderAdminUsersList();
    } else if (tabName === "camps") {
      document.getElementById("admin-panel-camps").style.display = "block";
      this.renderAdminCampaignsList();
    }
    
    // Toggle active classes on tab buttons
    const buttons = ["logs", "users", "camps"];
    buttons.forEach(btn => {
      const el = document.getElementById(`btn-admin-tab-${btn}`);
      if (el) {
        if (btn === tabName) {
          el.className = "btn btn-secondary";
        } else {
          el.className = "btn btn-tertiary";
        }
      }
    });
  },

  renderAdminUsersList: function() {
    const listBody = document.getElementById("admin-users-list-body");
    if (!listBody) return;
    listBody.innerHTML = "";
    
    const mockUsers = [
      { id: "usr-c91", email: "priya@creator.com", role: "CREATOR", date: "2026-08-01" },
      { id: "usr-b32", email: "brand@swadspices.com", role: "BRAND", date: "2026-07-29" },
      { id: "usr-c04", email: "anjali@verma.com", role: "CREATOR", date: "2026-08-03" }
    ];
    
    mockUsers.forEach(u => {
      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid var(--color-border)";
      tr.innerHTML = `
        <td style="padding: 12px 8px; color: var(--color-text-gray); font-family: monospace;">${u.id}</td>
        <td style="padding: 12px 8px; color:#fff; font-weight:600;">${u.email}</td>
        <td style="padding: 12px 8px;"><span class="tag ${u.role === 'CREATOR' ? 'tag-cyan' : 'tag-indigo'}" style="font-size: 10px; padding:2px 8px;">${u.role}</span></td>
        <td style="padding: 12px 8px; color: var(--color-text-muted);">${u.date}</td>
      `;
      listBody.appendChild(tr);
    });
  },

  renderAdminCampaignsList: function() {
    const listBody = document.getElementById("admin-camps-list-body");
    if (!listBody) return;
    listBody.innerHTML = "";
    
    const campaigns = JSON.parse(localStorage.getItem("cl_campaigns") || "[]");
    campaigns.forEach(c => {
      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid var(--color-border)";
      tr.innerHTML = `
        <td style="padding: 12px 8px; color: var(--color-text-gray); font-family: monospace;">${c.id}</td>
        <td style="padding: 12px 8px; color:#fff; font-weight:600;">${c.title}</td>
        <td style="padding: 12px 8px; color:var(--color-primary-green); font-weight:700;">₹${c.budget.toLocaleString('en-IN')}</td>
        <td style="padding: 12px 8px; color: var(--color-text-gray);">${c.region} (${c.language})</td>
        <td style="padding: 12px 8px;"><span class="tag tag-green" style="font-size: 10px; padding:2px 8px;">${c.status ? c.status.toUpperCase() : 'ACTIVE'}</span></td>
      `;
      listBody.appendChild(tr);
    });
  },

  // ==================== CAMPAIGN ACTIONS (EDIT / ARCHIVE) ====================
  archiveCampaign: function(campId) {
    const campaigns = JSON.parse(localStorage.getItem("cl_campaigns") || "[]");
    const idx = campaigns.findIndex(c => c.id === campId);
    if (idx !== -1) {
      campaigns[idx].status = "completed";
      localStorage.setItem("cl_campaigns", JSON.stringify(campaigns));
      this.showToast("Campaign archived successfully!", "success");
      this.loadBrandCampaigns();
    }
  },

  editCampaign: function(campId) {
    const campaigns = JSON.parse(localStorage.getItem("cl_campaigns") || "[]");
    const camp = campaigns.find(c => c.id === campId);
    if (camp) {
      // Pre-fill campaign form values
      document.getElementById("camp-title").value = camp.title;
      document.getElementById("camp-objective").value = camp.objective;
      document.getElementById("camp-category").value = camp.category;
      document.getElementById("camp-region").value = camp.region;
      document.getElementById("camp-language").value = camp.language;
      document.getElementById("camp-budget").value = camp.budget;
      document.getElementById("camp-type").value = camp.creator_type;
      
      // Update form submit index so it edits instead of inserting
      const form = document.getElementById("campaign-create-form");
      form.dataset.editId = campId;
      
      // Open Campaign creation modal
      document.getElementById("modal-campaign-form").classList.add("active");
    }
  }
};

// Start application
window.onload = () => App.init();
