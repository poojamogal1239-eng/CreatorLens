// CreatorLens Platform MVP Coordinator & State Controller

const LOCATION_DATA = {
  "Madhya Pradesh": ["Indore", "Bhopal", "Gwalior", "Jabalpur"],
  "Maharashtra": ["Pune", "Mumbai", "Nagpur", "Thane"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad"],
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore"],
  "Delhi": ["New Delhi"],
  "Karnataka": ["Bengaluru", "Mysore", "Hubli", "Mangalore"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Trichy"],
  "Uttar Pradesh": ["Noida", "Lucknow", "Kanpur", "Agra", "Varanasi"],
  "West Bengal": ["Kolkata", "Howrah", "Darjeeling"]
};

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
  handleRouting: async function() {
    const hash = window.location.hash || "#/";
    
    // Close mobile sidebar if open on navigation
    const sidebar = document.querySelector(".sidebar");
    if (sidebar) sidebar.classList.remove("sidebar-open");

    // Handle local section anchor jumps directly on landing page
    if (!hash.startsWith("#/") && hash !== "#/") {
      const anchorId = hash.substring(1);
      document.getElementById("view-landing").style.display = "block";
      document.getElementById("view-auth").style.display = "none";
      document.getElementById("view-main").style.display = "none";
      
      // Initialize sandbox preview content for anchor entry
      this.selectSandboxTag("Marathi");
      
      const targetEl = document.getElementById(anchorId);
      if (targetEl) {
        setTimeout(() => {
          targetEl.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
      return;
    }

    const path = hash.substring(2); // Remove '#/'
    
    // Non-anchor route transitions should reset viewport scrolls
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
      
      // Clear any pending background dashboard polling
      if (this.dashboardPollInterval) {
        clearInterval(this.dashboardPollInterval);
        this.dashboardPollInterval = null;
      }
      this.activeSubview = null;

      // Auto logout and reset forms to prevent cross-session leaks
      this.currentUser = null;
      localStorage.removeItem("cl_session_user");
      
      const emailInput = document.getElementById("auth-email");
      if (emailInput) emailInput.value = "";
      const passwordInput = document.getElementById("auth-password");
      if (passwordInput) passwordInput.value = "";
      const nameInput = document.getElementById("auth-name");
      if (nameInput) nameInput.value = "";
      const errBox = document.getElementById("auth-error-message");
      if (errBox) errBox.style.display = "none";
      
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

    // Role-based route isolation constraints
    const roleVal = this.currentUser.role;
    if (roleVal === "creator") {
      const allowed = ["creator-dashboard", "complete-profile", "creator-profile", "creator-intelligence", "creator-campaign-discovery", "creator-my-campaigns", "creator-profile-mgmt", "creator-earnings", "creator-assistant", "notifications", "creator-settings"];
      if (!allowed.includes(path)) {
        window.location.hash = "#/creator-dashboard";
        return;
      }
    } else if (roleVal === "brand") {
      const allowed = ["brand-dashboard", "brand-campaigns", "brand-ai-match", "brand-search", "brand-insights", "notifications", "brand-settings"];
      if (!allowed.includes(path)) {
        window.location.hash = "#/brand-dashboard";
        return;
      }
    } else if (roleVal === "admin") {
      const allowed = ["admin-dashboard", "admin-creators", "admin-brands", "admin-campaigns", "admin-collaborations"];
      if (!allowed.includes(path)) {
        window.location.hash = "#/admin-dashboard";
        return;
      }
    }
    
    // Fetch user profile from Supabase/MockDB to check status gates
    try {
      const profile = await window.DB.getProfile(this.currentUser.id, this.currentUser.role);
      if (this.currentUser.role === "creator" && profile) {
        this.creatorProfileStatus = profile.profile_status || 'Incomplete';
        this.creatorAiStatus = profile.ai_status || 'Not Started';
        
        const lockedPaths = ["creator-dashboard", "creator-intelligence", "creator-campaign-discovery", "creator-my-campaigns", "creator-earnings", "creator-assistant"];
        if (lockedPaths.includes(path)) {
          if (this.creatorProfileStatus !== 'Ready' || this.creatorAiStatus !== 'Completed') {
            window.location.hash = "#/complete-profile";
            this.showToast("Please complete your profile and generate your Creator Intelligence Score first!", "warning");
            return;
          }
        }
      } else {
        this.creatorProfileStatus = 'Ready';
        this.creatorAiStatus = 'Completed';
      }
    } catch (err) {
      console.error("Failed to load user profile in router:", err);
    }
    
    // Ensure dashboard layout is visible
    document.getElementById("view-landing").style.display = "none";
    document.getElementById("view-auth").style.display = "none";
    document.getElementById("view-main").style.display = "flex";
    
    // Refresh sidebar details
    document.getElementById("nav-user-name").textContent = this.currentUser.email.split("@")[0];
    document.getElementById("nav-user-role").textContent = this.currentUser.role;
    document.getElementById("nav-user-avatar").textContent = this.currentUser.email.charAt(0).toUpperCase();
    
    // Toggle header AI Assistant button visibility based on role
    const assistantBtn = document.getElementById("top-nav-assistant-btn");
    if (assistantBtn) {
      if (this.currentUser.role === "brand") {
        assistantBtn.style.display = "none";
      } else {
        assistantBtn.style.display = "flex";
      }
    }
    
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

  scrollToSection: function(sectionId) {
    this.adminLog(`Scrolling to section: ${sectionId}`);
    
    // Ensure landing view is showing
    document.getElementById("view-landing").style.display = "block";
    document.getElementById("view-auth").style.display = "none";
    document.getElementById("view-main").style.display = "none";
    
    if (window.location.hash !== "#/") {
      history.pushState(null, null, "#/");
    }
    
    if (sectionId === "view-landing") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const targetEl = document.getElementById(sectionId);
      if (targetEl) {
        setTimeout(() => {
          targetEl.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    }
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
    
    document.getElementById("reg-name-group").style.display = isLogin ? "none" : "block";
    document.getElementById("reg-role-group").style.display = isLogin ? "none" : "block";
    
    const submitBtn = document.getElementById("auth-submit-btn");
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = isLogin ? "Login Account →" : "Create New Account →";
    }
    
    document.getElementById("auth-form").dataset.mode = tab;
    
    // Reset OTP verification panels back to defaults
    const mainPanel = document.getElementById("auth-main-panel");
    if (mainPanel) mainPanel.style.display = "block";
    const otpPanel = document.getElementById("auth-otp-verify-panel");
    if (otpPanel) otpPanel.style.display = "none";
    const otpInputGroup = document.getElementById("otp-input-group");
    if (otpInputGroup) otpInputGroup.style.display = "none";
    const pwdInputGroup = document.getElementById("password-input-group");
    if (pwdInputGroup) pwdInputGroup.style.display = "block";
    
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
        const name = document.getElementById("auth-name") ? document.getElementById("auth-name").value : "";
        this.currentUser = await window.DB.register(email, password, role, name);
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
    if (this.dashboardPollInterval) {
      clearInterval(this.dashboardPollInterval);
      this.dashboardPollInterval = null;
    }
    this.activeSubview = null;
    
    localStorage.removeItem("cl_session_user");
    if (this.currentUser) {
      this.adminLog(`User ${this.currentUser.email} logged out.`);
    }
    this.currentUser = null;
    this.showAuthLayout();
  },

  toggleSidebar: function(e) {
    if (e) e.stopPropagation();
    const sidebar = document.querySelector(".sidebar");
    if (sidebar) {
      sidebar.classList.toggle("sidebar-open");
    }
  },

  toggleUserDropdown: function() {
    const drop = document.getElementById("top-nav-user-dropdown");
    if (drop) {
      drop.style.display = drop.style.display === "none" ? "block" : "none";
    }
  },

  toggleAiAssistant: function() {
    this.switchSubview("creator-assistant");
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
        { id: "creator-dashboard", label: "Overview", svg: icons.dashboard },
        { id: "creator-profile-mgmt", label: "My Profile", svg: icons.profile },
        { id: "creator-intelligence", label: "My Intelligence", svg: icons.intelligence },
        { id: "creator-campaign-discovery", label: "Brand Opportunities", svg: icons.search },
        { id: "creator-my-campaigns", label: "My Campaigns", svg: icons.campaigns },
        { id: "creator-earnings", label: "My Earnings", svg: `<svg class="sidebar-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>` },
        { id: "creator-assistant", label: "AI Assistant", svg: `<svg class="sidebar-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>` },
        { id: "notifications", label: "Messages & Alerts", svg: icons.notifications },
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
        { id: "admin-dashboard", label: "Dashboard", svg: icons.dashboard },
        { id: "admin-creators", label: "Creators", svg: icons.profile },
        { id: "admin-brands", label: "Brands", svg: icons.profile },
        { id: "admin-campaigns", label: "Campaigns", svg: icons.campaigns },
        { id: "admin-collaborations", label: "Collaborations", svg: icons.intelligence }
      ];
    }
    
    const isLocked = (role === "creator" && (this.creatorProfileStatus !== "Ready" || this.creatorAiStatus !== "Completed"));
    const lockedPaths = ["creator-dashboard", "creator-intelligence", "creator-campaign-discovery", "creator-my-campaigns", "creator-earnings", "creator-assistant"];
    
    menuItems.forEach(item => {
      const a = document.createElement("a");
      a.className = "menu-item";
      a.id = `nav-link-${item.id}`;
      
      if (isLocked && lockedPaths.includes(item.id)) {
        a.className = "menu-item disabled";
        a.style.opacity = "0.4";
        a.style.cursor = "not-allowed";
        a.innerHTML = `<span style="display:inline-flex; align-items:center; justify-content:center; margin-right:8px; width:16px; height:16px;">${item.svg}</span> ${item.label} <span style="font-size:10px; margin-left:auto; opacity:0.6;">🔒</span>`;
        a.onclick = (e) => {
          e.preventDefault();
          this.showToast("Complete onboarding and generate your intelligence score to unlock this section!", "warning");
        };
      } else {
        a.innerHTML = `<span style="display:inline-flex; align-items:center; justify-content:center; margin-right:8px; width:16px; height:16px;">${item.svg}</span> ${item.label}`;
        a.onclick = () => this.switchSubview(item.id);
      }
      menuContainer.appendChild(a);
    });
  },

  // View Switcher & Routes (Hash updates)
  switchSubview: function(subviewId) {
    window.location.hash = "#/" + subviewId;
  },

  renderSubviewElements: function(subviewId) {
    this.activeSubview = subviewId;
    
    if (subviewId !== "creator-dashboard" && this.dashboardPollInterval) {
      clearInterval(this.dashboardPollInterval);
      this.dashboardPollInterval = null;
    }
    
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
      } else if (subviewId === "complete-profile") {
        path = "Portal / Onboarding";
        label = "Complete Your Creator Profile";
      } else if (subviewId === "creator-profile") {
        path = "Portal / Onboarding";
        label = "Complete Your Profile";
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
      } else if (subviewId === "creator-earnings") {
        path = "Portal / Earnings";
        label = "Financial Breakdown & Campaign Payouts";
      } else if (subviewId === "creator-assistant") {
        path = "Portal / AI Assistant";
        label = "CreatorLens Intelligence Q&A";
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
      } else if (subviewId === "admin-dashboard") {
        path = "Admin / Dashboard";
        label = "System Ecosystem Overview";
      } else if (subviewId === "admin-creators") {
        path = "Admin / Creators";
        label = "Platform Creators Registry";
      } else if (subviewId === "admin-brands") {
        path = "Admin / Brands";
        label = "Brand Partners Registry";
      } else if (subviewId === "admin-campaigns") {
        path = "Admin / Campaigns";
        label = "Global Campaigns Manager";
      } else if (subviewId === "admin-collaborations") {
        path = "Admin / Collaborations";
        label = "Partnerships & Activity Logs";
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
      } else if (subviewId === "complete-profile") {
        this.loadCompleteProfileGatekeeper();
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
      } else if (subviewId === "creator-earnings") {
        this.loadCreatorEarnings();
      } else if (subviewId === "creator-assistant") {
        this.loadCreatorAssistant();
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
      } else if (subviewId === "admin-creators") {
        this.loadAdminCreators();
      } else if (subviewId === "admin-brands") {
        this.loadAdminBrands();
      } else if (subviewId === "admin-campaigns") {
        this.loadAdminCampaigns();
      } else if (subviewId === "admin-collaborations") {
        this.loadAdminCollaborations();
      }
    }
  },

  // ==================== CREATOR SUB-VIEWS ====================
  loadCreatorDashboard: async function() {
    try {
      if (!this.currentUser) return;
      const creator = await window.DB.getProfile(this.currentUser.id, "creator");
      if (!creator) return;

      document.getElementById("creator-dashboard-subtitle").textContent = 
        `Welcome back, ${creator.full_name}! Monitor your AI score & inbound sponsorships.`;

      document.getElementById("stat-followers").textContent = creator.followers_count.toLocaleString('en-IN');
      document.getElementById("stat-engagement").textContent = `${creator.engagement_rate}%`;
      document.getElementById("stat-views").textContent = creator.average_views.toLocaleString('en-IN');

      // Clear or set polling depending on the AI status
      if (creator.ai_status === 'Processing') {
        if (!this.dashboardPollInterval) {
          console.log("[SYS] Initiating background status polling for creator ID: " + creator.id);
          this.dashboardPollInterval = setInterval(async () => {
            if (this.activeSubview === 'creator-dashboard') {
              await this.loadCreatorDashboard();
            }
          }, 3500);
        }
      } else {
        if (this.dashboardPollInterval) {
          console.log("[SYS] Profile enrichment complete. Stopping status polling.");
          clearInterval(this.dashboardPollInterval);
          this.dashboardPollInterval = null;
        }
      }

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
          if (scoreCircle) scoreCircle.style.strokeDashoffset = offset;
        }, 100);
      } else if (creator.ai_status === 'Processing') {
        document.getElementById("radar-chart-container").innerHTML = `
          <style>
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
          <div style="text-align: center; color: var(--color-text-gray); padding: 40px 0;">
            <div style="margin: 0 auto 16px auto; width: 40px; height: 40px; border: 3px solid rgba(0, 242, 166, 0.1); border-top: 3px solid var(--color-primary-cyan); border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <h4 style="color: #fff; margin-bottom: 8px;">AI Analysis In Progress</h4>
            <p style="font-size: 11px; max-width: 300px; margin: 0 auto; line-height: 1.5; color: var(--color-text-gray);">Gemini is analyzing your regional footprint and computing your CIS score vectors. This will update automatically in real-time...</p>
          </div>
        `;
        document.getElementById("badge-score-value").textContent = "AI";
        document.getElementById("badge-score-label").textContent = "Processing...";
      } else if (creator.ai_status === 'Failed') {
        document.getElementById("radar-chart-container").innerHTML = `
          <div style="text-align: center; color: var(--color-text-gray); padding: 40px 0;">
            <div style="font-size: 32px; margin-bottom: 12px;">⚠️</div>
            <h4 style="color: #fff; margin-bottom: 8px;">AI Scoring Failed</h4>
            <p style="font-size: 11px; max-width: 300px; margin: 0 auto; line-height: 1.5; color: var(--color-text-gray);">An error occurred during Gemini analysis. Please try resetting or updating your profile information to trigger retry.</p>
          </div>
        `;
        document.getElementById("badge-score-value").textContent = "Err";
        document.getElementById("badge-score-label").textContent = "Failed";
      } else {
        if (creator.profile_status === 'Ready') {
          document.getElementById("radar-chart-container").innerHTML = `
            <div style="text-align: center; color: var(--color-text-gray); padding: 40px 0;">
              <p>Profile details are complete.</p>
              <button class="btn btn-primary" style="margin-top: 12px;" onclick="App.switchSubview('creator-profile-mgmt')">
                Go to Profile to Trigger Analysis
              </button>
            </div>
          `;
          document.getElementById("badge-score-value").textContent = "--";
          document.getElementById("badge-score-label").textContent = "Ready for AI";
        } else {
          document.getElementById("radar-chart-container").innerHTML = `
            <div style="text-align: center; color: var(--color-text-gray); padding: 40px 0;">
              <p>Score details not generated yet.</p>
              <button class="btn btn-primary" style="margin-top: 12px;" onclick="App.switchSubview('creator-profile-mgmt')">
                Complete Profile to Calculate Score
              </button>
            </div>
          `;
          document.getElementById("badge-score-value").textContent = "--";
          document.getElementById("badge-score-label").textContent = "Unenriched";
        }
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
      if (!this.currentUser) return;
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

        // Score breakdown bars with -1 Insufficient Data handling
        const updateBar = (barId, labelId, val, unlockMsg) => {
          const barEl = document.getElementById(barId);
          const labelEl = document.getElementById(labelId);
          if (!barEl || !labelEl) return;
          
          const container = barEl.parentElement.parentElement;
          let descEl = container.querySelector(".unlock-desc");
          
          if (val < 0) {
            labelEl.textContent = "Insufficient Data";
            labelEl.style.color = "#ff6b6b";
            barEl.style.width = "0%";
            if (!descEl) {
              descEl = document.createElement("div");
              descEl.className = "unlock-desc";
              descEl.style.fontSize = "10px";
              descEl.style.color = "var(--color-text-gray)";
              descEl.style.marginTop = "4px";
              descEl.style.lineHeight = "1.3";
              container.appendChild(descEl);
            }
            descEl.innerHTML = `🔑 <em>To unlock:</em> ${unlockMsg}`;
          } else {
            labelEl.textContent = `${val}%`;
            labelEl.style.color = "#fff";
            barEl.style.width = `${val}%`;
            if (descEl) descEl.remove();
          }
        };

        updateBar(
          "intel-bar-trust", 
          "intel-breakdown-trust", 
          scores.audience_trust, 
          "Add your audience demographics & age range details on Step 3 of onboarding."
        );

        updateBar(
          "intel-bar-engagement", 
          "intel-breakdown-engagement", 
          scores.engagement_rate_score, 
          "Connect and sync your Instagram or YouTube account metrics on Step 2 of onboarding."
        );

        updateBar(
          "intel-bar-regional", 
          "intel-breakdown-regional", 
          scores.regional_influence, 
          "Specify your main audience location dialects on Step 3 of onboarding."
        );

        updateBar(
          "intel-bar-consistency", 
          "intel-breakdown-consistency", 
          scores.content_consistency, 
          "Provide posting frequency details on Step 3 of onboarding."
        );

        updateBar(
          "intel-bar-readiness", 
          "intel-breakdown-readiness", 
          scores.brand_readiness, 
          "Configure rate cards, previous campaigns, and target brands on Step 4 of onboarding."
        );
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
      if (!this.currentUser) return;
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
        // Map database status + price_justification simulation metadata to user-friendly statuses
        let displayStatus = "Applied";
        let badgeClass = "tag-cyan";
        
        if (c.status === "accepted") {
          displayStatus = "Selected";
          badgeClass = "tag-green pulse-badge-green";
          if (c.price_justification && c.price_justification.includes("In Progress")) {
            displayStatus = "In Progress";
            badgeClass = "tag-blue pulse-badge-blue";
          }
        } else if (c.status === "completed") {
          displayStatus = "Completed";
          badgeClass = "tag-green";
        } else if (c.status === "rejected") {
          displayStatus = "Rejected";
          badgeClass = "tag-red";
        } else if (c.status === "pending") {
          if (c.price_justification && c.price_justification.includes("State: ")) {
            displayStatus = c.price_justification.split("State: ")[1].trim();
            badgeClass = "tag-cyan";
          } else {
            displayStatus = "Applied";
            badgeClass = "tag-cyan";
          }
        }

        const isOutbound = c.initiated_by === "creator";

        container.innerHTML += `
          <div class="glass-card" style="padding: 20px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
              <div style="flex: 1; min-width: 250px;">
                <h3 style="margin: 0 0 8px 0; color: #fff; font-size: 15px;">${c.campaign ? c.campaign.title : 'Campaign Offer'}</h3>
                <p class="view-subtitle" style="font-size: 12px; margin: 0; line-height:1.5;">
                  Company: <strong>${c.brand ? c.brand.company_name : 'Sponsor'}</strong> | Niche: <strong>${c.campaign ? c.campaign.category : 'N/A'}</strong><br>
                  Budget: <strong>₹${c.suggested_price.toLocaleString('en-IN')}</strong> | Match Score: <strong>${c.match_score || 75}%</strong> | Applied: <strong>${new Date(c.created_at).toLocaleDateString()}</strong>
                </p>
              </div>
              
              <div style="display: flex; align-items: center; gap: 12px;">
                <span class="tag ${badgeClass}" style="font-size: 10px; padding: 4px 8px; font-weight:700;">${displayStatus.toUpperCase()}</span>
                ${(!isOutbound && c.status === "pending") ? `
                  <div style="display: flex; gap: 8px;">
                    <button class="btn btn-primary" style="padding: 6px 12px; font-size: 11px;" onclick="App.handleCollabActionCampaigns('${c.id}', 'accepted')">Accept</button>
                    <button class="btn btn-tertiary" style="padding: 6px 12px; font-size: 11px;" onclick="App.handleCollabActionCampaigns('${c.id}', 'rejected')">Decline</button>
                  </div>
                ` : ''}
              </div>
            </div>

            <!-- developer simulation control panel -->
            <div class="collab-simulation-panel" style="padding: 12px; border: 1px dashed #f59e0b; border-radius: 6px; background: rgba(245, 158, 11, 0.015); display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <span style="font-size: 9px; font-weight: 700; color: #f59e0b; letter-spacing: 0.5px;">[DEVELOPER TEST SIMULATION]</span>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                <button class="btn btn-secondary" style="font-size: 9px; padding: 3px 6px; border-color: rgba(255,255,255,0.15);" onclick="App.simulateCampaignStatus('${c.id}', 'Under Review')">Under Review</button>
                <button class="btn btn-secondary" style="font-size: 9px; padding: 3px 6px; border-color: rgba(255,255,255,0.15);" onclick="App.simulateCampaignStatus('${c.id}', 'Shortlisted')">Shortlisted</button>
                <button class="btn btn-secondary" style="font-size: 9px; padding: 3px 6px; border-color: rgba(255,255,255,0.15);" onclick="App.simulateCampaignStatus('${c.id}', 'Selected')">Selected (Outcome)</button>
                <button class="btn btn-secondary" style="font-size: 9px; padding: 3px 6px; border-color: rgba(255,255,255,0.15);" onclick="App.simulateCampaignStatus('${c.id}', 'In Progress')">In Progress</button>
                <button class="btn btn-secondary" style="font-size: 9px; padding: 3px 6px; border-color: rgba(255,255,255,0.15);" onclick="App.simulateCampaignStatus('${c.id}', 'Completed')">Completed (Outcome)</button>
                <button class="btn btn-secondary" style="font-size: 9px; padding: 3px 6px; border-color: rgba(255,255,255,0.15);" onclick="App.simulateCampaignStatus('${c.id}', 'Rejected')">Reject (Outcome)</button>
              </div>
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
      if (window.DB.isLive()) {
        const response = await fetch(`${window.N8N.backendUrl}/collaborations/${collabId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status })
        });
        if (!response.ok) throw new Error("Failed to update status on server.");
      } else {
        await window.DB.updateCollabStatus(collabId, status);
      }
      this.showToast(`Invitation marked as ${status}`);
      this.loadMyCampaigns();
    } catch (e) {
      this.showToast(e.message, "error");
    }
  },

  simulateCampaignStatus: async function(collabId, targetStatus) {
    this.showToast(`Simulating status change to ${targetStatus}...`, "info");
    try {
      let dbStatus = "pending";
      let price_justification = "Simulation update.";
      
      if (targetStatus === "Selected" || targetStatus === "In Progress") {
        dbStatus = "accepted";
        if (targetStatus === "In Progress") {
          price_justification = "Simulation update: In Progress";
        }
      } else if (targetStatus === "Completed") {
        dbStatus = "completed";
      } else if (targetStatus === "Rejected") {
        dbStatus = "rejected";
      } else {
        dbStatus = "pending";
        price_justification = `Simulation update: State: ${targetStatus}`;
      }

      if (window.DB.isLive()) {
        const response = await fetch(`${window.N8N.backendUrl}/collaborations/${collabId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: dbStatus, price_justification })
        });
        if (!response.ok) {
          throw new Error("Failed to update status on server.");
        }
      } else {
        const collabs = JSON.parse(localStorage.getItem("cl_collabs") || "[]");
        const idx = collabs.findIndex(c => c.id === collabId);
        if (idx !== -1) {
          collabs[idx].status = dbStatus;
          collabs[idx].price_justification = price_justification;
          localStorage.setItem("cl_collabs", JSON.stringify(collabs));
        }
      }

      // Add a system notification to creator
      let notifyType = "info";
      if (targetStatus === "Selected" || targetStatus === "Completed") notifyType = "success";
      if (targetStatus === "Rejected") notifyType = "warning";

      this.addSystemNotification(
        `Campaign Status Update`,
        `Your application status has been updated to "${targetStatus}".`,
        notifyType
      );

      this.showToast(`Status updated to ${targetStatus}!`, "success");
      await this.loadMyCampaigns();
    } catch (err) {
      this.showToast(`Simulation failed: ${err.message}`, "error");
    }
  },

  loadCreatorEarnings: async function() {
    try {
      if (!this.currentUser) return;
      const creator = await window.DB.getProfile(this.currentUser.id, "creator");
      if (!creator) return;

      let collabs = [];
      if (window.DB.isLive()) {
        collabs = await window.DB.getCollabsForCreator(creator.id) || [];
      } else {
        const localCollabs = JSON.parse(localStorage.getItem("cl_collabs") || "[]");
        const campaigns = JSON.parse(localStorage.getItem("cl_campaigns") || "[]");
        const brands = JSON.parse(localStorage.getItem("cl_brands") || "{}");
        collabs = localCollabs.filter(c => c.creator_id === creator.id).map(c => ({
          ...c,
          campaign: campaigns.find(camp => camp.id === c.campaign_id),
          brand: brands[c.brand_id]
        }));
      }

      let total = 0;
      let pending = 0;
      let paid = 0;

      const historyBody = document.getElementById("earnings-history-body");
      historyBody.innerHTML = "";

      const earningCollabs = collabs.filter(c => c.status === "accepted" || c.status === "completed");

      if (earningCollabs.length === 0) {
        historyBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:24px; color:var(--color-text-gray);">No earnings accumulated yet. Apply to campaigns and get selected to start earning!</td></tr>`;
      } else {
        earningCollabs.forEach(c => {
          const amount = parseInt(c.suggested_price) || 0;
          if (c.status === "accepted") {
            pending += amount;
          } else if (c.status === "completed") {
            paid += amount;
          }

          const statusBadge = c.status === "accepted" ? '<span class="tag tag-indigo">PENDING</span>' : '<span class="tag tag-green">PAID</span>';

          historyBody.innerHTML += `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.03);">
              <td style="padding:12px 8px; color:#fff; font-weight:600;">${c.campaign ? c.campaign.title : 'Campaign Sponsorship'}</td>
              <td style="padding:12px 8px;">${c.brand ? c.brand.company_name : 'Sponsor'}</td>
              <td style="padding:12px 8px; text-align:right; color:#fff; font-weight:600;">₹${amount.toLocaleString('en-IN')}</td>
              <td style="padding:12px 8px; text-align:right;">${statusBadge}</td>
            </tr>
          `;
        });
      }

      total = pending + paid;

      document.getElementById("earnings-total").textContent = `₹${total.toLocaleString('en-IN')}`;
      document.getElementById("earnings-pending").textContent = `₹${pending.toLocaleString('en-IN')}`;
      document.getElementById("earnings-paid").textContent = `₹${paid.toLocaleString('en-IN')}`;

    } catch (err) {
      console.error("Failed to load earnings:", err);
    }
  },

  loadCreatorAssistant: function() {
    const chatContainer = document.getElementById("assistant-chat-messages");
    if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
  },

  sendAssistantSuggestion: function(promptText) {
    const input = document.getElementById("assistant-chat-input");
    if (input) {
      input.value = promptText;
      const form = document.getElementById("assistant-chat-form");
      if (form) {
        form.dispatchEvent(new Event("submit", { cancelable: true }));
      }
    }
  },

  handleAssistantChatSubmit: async function(e) {
    e.preventDefault();
    const input = document.getElementById("assistant-chat-input");
    if (!input) return;
    const promptText = input.value.trim();
    if (!promptText) return;

    input.value = "";

    const chatContainer = document.getElementById("assistant-chat-messages");
    if (!chatContainer) return;

    // 1. Append User Message
    const userMsg = document.createElement("div");
    userMsg.style.cssText = "background:rgba(0, 242, 166, 0.05); padding:12px 16px; border-radius:8px; max-width:80%; align-self:flex-end; color:#fff; line-height:1.5; border-right:3px solid var(--color-primary-cyan);";
    userMsg.textContent = promptText;
    chatContainer.appendChild(userMsg);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // 2. Append Loading Message
    const loadingMsg = document.createElement("div");
    loadingMsg.style.cssText = "background:rgba(255,255,255,0.02); padding:12px 16px; border-radius:8px; max-width:80%; align-self:flex-start; color:var(--color-text-gray); line-height:1.5;";
    loadingMsg.innerHTML = '<div style="display:flex; align-items:center; gap:8px;"><span class="pulse-badge-blue" style="width:6px; height:6px; background:#6366f1; border-radius:50%; display:inline-block;"></span><span>AI Assistant is thinking...</span></div>';
    chatContainer.appendChild(loadingMsg);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
      // 3. Query Real Backend Route /api/assistant/chat
      const response = await fetch(`${window.N8N.backendUrl}/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creator_id: this.currentUser.id,
          message: promptText
        })
      });

      if (!response.ok) {
        throw new Error("Failed to communicate with Assistant API.");
      }

      const result = await response.json();
      
      loadingMsg.remove();

      // 4. Append AI response message
      const botMsg = document.createElement("div");
      botMsg.style.cssText = "background:rgba(255,255,255,0.02); padding:12px 16px; border-radius:8px; max-width:80%; align-self:flex-start; color:#fff; line-height:1.5; border-left:3px solid var(--color-primary-cyan);";
      botMsg.textContent = result.response;
      chatContainer.appendChild(botMsg);
      chatContainer.scrollTop = chatContainer.scrollHeight;

    } catch (err) {
      loadingMsg.remove();
      const errorMsg = document.createElement("div");
      errorMsg.style.cssText = "background:rgba(239, 68, 68, 0.05); padding:12px 16px; border-radius:8px; max-width:80%; align-self:flex-start; color:#ef4444; line-height:1.5; border-left:3px solid #ef4444;";
      errorMsg.textContent = `Error: ${err.message}`;
      chatContainer.appendChild(errorMsg);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  },

  loadCreatorProfileForm: async function() {
    try {
      if (!this.currentUser) return;
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
      if (!this.currentUser) return;
      const brand = await window.DB.getProfile(this.currentUser.id, "brand");
      if (!brand) return;

    const campaigns = await window.DB.getCampaigns(brand.id);
      const brandCollabs = await window.DB.getCollabsForBrand(brand.id) || [];

      // Map status in memory to Published (active), Draft (cancelled), Closed (completed)
      const activeCamps = campaigns.filter(c => c.status === "active");
      const activeCollabs = brandCollabs.filter(c => c.status === "accepted" || c.status === "completed");

      // Populate Stats
      document.getElementById("brand-stat-active-camps").textContent = activeCamps.length;
      document.getElementById("brand-stat-active-collabs").textContent = activeCollabs.length;
      const totalBudget = activeCamps.reduce((sum, c) => sum + (parseInt(c.budget) || 0), 0);
      document.getElementById("brand-stat-total-budget").textContent = `₹${totalBudget.toLocaleString('en-IN')}`;

      // Populate pipeline table
      const campsBody = document.getElementById("brand-dashboard-camps-body");
      campsBody.innerHTML = "";
      if (campaigns.length === 0) {
        campsBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:12px; color:var(--color-text-gray);">No active campaigns. Click 'Create Campaign' to start.</td></tr>`;
      } else {
        for (const c of campaigns) {
          const matches = await window.DB.getCampaignMatches(c.id);
          let labelClass = "tag-cyan";
          let labelText = "DRAFT";
          if (c.status === "active") {
            labelClass = "tag-green";
            labelText = "PUBLISHED";
          } else if (c.status === "completed") {
            labelClass = "tag-indigo";
            labelText = "CLOSED";
          }
          campsBody.innerHTML += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.02);">
              <td style="padding:12px 8px; color:#fff; font-weight:600;">${c.title}</td>
              <td style="padding:12px 8px; color:var(--color-text-gray); text-transform: capitalize;">${c.category}</td>
              <td style="padding:12px 8px; color:#00F2A6;">₹${(c.budget || 0).toLocaleString('en-IN')}</td>
              <td style="padding:12px 8px;"><span class="tag tag-cyan">${matches.length} matches</span></td>
              <td style="padding:12px 8px;"><span class="tag ${labelClass}">${labelText}</span></td>
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
  loadBrandAiMatch: async function() {
    try {
      if (!this.currentUser) return;
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
        if (this.selectedCampaignId) {
          select.value = this.selectedCampaignId;
        } else if (campaigns.length > 0) {
          this.selectedCampaignId = campaigns[0].id;
          select.value = this.selectedCampaignId;
        }
      }
      
      if (this.selectedCampaignId) {
        await this.displayBrandAiMatches(this.selectedCampaignId);
      } else {
        document.getElementById("brand-match-results-container").innerHTML = "";
      }
    } catch (e) {
      console.error(e);
    }
  },

  handleCampaignSelectChange: async function(campaignId) {
    this.selectedCampaignId = campaignId;
    await this.displayBrandAiMatches(campaignId);
  },

  displayBrandAiMatches: async function(campaignId) {
    const container = document.getElementById("brand-match-results-container");
    if (!container) return;
    container.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <p class="view-subtitle" style="margin:0; color: var(--color-primary-cyan);">Loading saved matches...</p>
      </div>
    `;

    try {
      const matches = await window.DB.getCampaignMatches(campaignId);
      container.innerHTML = "";

      if (!matches || matches.length === 0) {
        container.innerHTML = `
          <div class="glass-card" style="text-align: center; padding: 40px; border: 1px dashed var(--color-border); border-radius: 8px;">
            <p class="view-subtitle" style="margin:0;">No matching creator profiles found in registry. Click "Calculate Matches" to run n8n sourcing.</p>
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
                ${m.match_explanation || m.ai_explanation || "High alignment based on dialect fluency and demographic overlap with Central Indian audience clusters."}
              </p>
            </div>

            <div style="margin-top:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
              <div style="font-size:12px; color:var(--color-text-gray);">
                Recommended Pricing Index: <strong style="color:#00F2A6;">₹${(creator.pricing_min || 10000).toLocaleString('en-IN')} - ₹${(creator.pricing_premium || 20000).toLocaleString('en-IN')}</strong>
              </div>
              <div style="display:flex; gap:10px;">
                <button class="btn btn-tertiary" style="padding:6px 12px; font-size:11px;" onclick="App.showToast('Creator profile saved to matches!')">Save Creator</button>
                <button class="btn btn-secondary" style="padding:6px 12px; font-size:11px;" onclick="App.openCreatorDetails('${creator.id}', '${campaignId}')">View Profile</button>
                <button class="btn btn-primary" style="padding:6px 12px; font-size:11px;" onclick="App.expressBrandInterest('${creator.id}', '${campaignId}', ${m.match_score}, ${creator.pricing_min || 10000})">Express Interest</button>
              </div>
            </div>
          </div>
        `;
      });
    } catch (e) {
      console.error(e);
      container.innerHTML = `
        <div class="glass-card" style="text-align: center; padding: 40px; border: 1px dashed var(--color-danger); border-radius: 8px;">
          <p class="view-subtitle" style="margin:0; color: var(--color-danger);">Failed to load matches: ${e.message}</p>
        </div>
      `;
    }
  },

  runBrandAiMatching: async function() {
    const campaignId = document.getElementById("brand-match-campaign-select").value;
    if (!campaignId) {
      this.showToast("Please create or select a campaign brief first.", "warning");
      return;
    }

    const container = document.getElementById("brand-match-results-container");
    container.innerHTML = "";

    try {
      this.showPipelineProgressModal("Running Gemini AI Campaign Sourcing Matchmaker", [
        { id: "wf04", name: "WF-04: Campaign Parse" },
        { id: "wf05", name: "WF-05: Brand Match Engine" },
        { id: "wf06", name: "WF-06: Pricing Recommendation Engine" }
      ]);

      if (window.DB.isLive()) {
        await window.N8N.triggerCampaignMatching(campaignId, (step, msg) => {
          this.updatePipelineProgressStep(step, msg);
        });
      } else {
        await new Promise(resolve => setTimeout(resolve, 500));
        this.updatePipelineProgressStep("wf04", "Success");
        await new Promise(resolve => setTimeout(resolve, 500));
        this.updatePipelineProgressStep("wf05", "Success");
        await new Promise(resolve => setTimeout(resolve, 500));
        this.updatePipelineProgressStep("wf06", "Success");
      }

      setTimeout(async () => {
        this.closePipelineProgressModal();
        await this.displayBrandAiMatches(campaignId);
      }, 1000);

    } catch (e) {
      this.closePipelineProgressModal();
      this.showToast("Matching pipeline failed: " + e.message, "error");
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
      if (!this.currentUser) return;
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
      if (!this.currentUser) return;
      const brand = await window.DB.getProfile(this.currentUser.id, "brand");
      if (!brand) return;

      const campaigns = await window.DB.getCampaigns(brand.id);
      this.campaigns = campaigns;
      const listCol = document.getElementById("brand-campaign-list-column");
      listCol.innerHTML = "";
      
      if (campaigns.length > 0) {
        campaigns.forEach(c => {
          const isActive = this.selectedCampaignId === c.id;
          let labelClass = "tag-cyan";
          let labelText = "DRAFT";
          if (c.status === "active") {
            labelClass = "tag-green";
            labelText = "PUBLISHED";
          } else if (c.status === "completed") {
            labelClass = "tag-indigo";
            labelText = "CLOSED";
          }

          listCol.innerHTML += `
            <div class="glass-card" style="padding: 16px; margin-bottom: 16px; cursor: pointer; border-left: 4px solid ${isActive ? 'var(--color-primary-cyan)' : 'transparent'}; position: relative;" onclick="App.selectCampaign('${c.id}')">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;">
                <h4 style="margin: 0; font-size:14px; color:#fff;">${c.title}</h4>
                <div style="display:flex; gap:8px;">
                  <span onclick="App.editCampaign('${c.id}'); event.stopPropagation();" title="Edit Campaign" style="cursor:pointer; font-size:12px; color:var(--color-text-muted);">✏️</span>
                  <span onclick="App.deleteCampaign('${c.id}'); event.stopPropagation();" title="Delete Campaign" style="cursor:pointer; font-size:12px; color:var(--color-text-muted);">🗑️</span>
                </div>
              </div>
              <p class="view-subtitle" style="font-size: 11px; margin-bottom: 0;">Budget: ₹${c.budget.toLocaleString('en-IN')} | Category: ${c.category}</p>
              <div style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center;">
                <span class="tag tag-indigo" style="font-size: 9px; padding: 2px 6px;">${c.region}</span>
                <span class="tag ${labelClass}" style="font-size: 9px; padding: 2px 6px; text-transform:uppercase;">${labelText}</span>
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
      const brand = await window.DB.getProfile(this.currentUser.id, "brand");
      if (!brand) return;

      const campaigns = await window.DB.getCampaigns(brand.id);
      const camp = campaigns.find(c => c.id === this.selectedCampaignId);
      if (!camp) return;

      const collabs = await window.DB.getCollabsForBrand(this.currentUser.id) || [];
      const campCollabs = collabs.filter(c => c.campaign_id === camp.id);

      const matches = await window.DB.getCampaignMatches(this.selectedCampaignId);

      // 1. Render Applications Received (initiated_by === 'creator')
      const applications = campCollabs.filter(c => c.initiated_by === 'creator');
      let applicationsHTML = "";

      if (applications.length === 0) {
        applicationsHTML = `
          <div style="text-align: center; padding: 24px 10px; border: 1px dashed rgba(255,255,255,0.05); border-radius: 8px;">
            <p class="view-subtitle" style="font-size: 12px; margin: 0;">No creator applications received for this campaign yet.</p>
          </div>
        `;
      } else {
        applications.forEach(app => {
          const creator = app.creator;
          if (!creator) return;

          // Resolve scores (could be in creator_scores nested, or flat merged)
          const creatorScores = creator.creator_scores && creator.creator_scores[0] ? creator.creator_scores[0] : {};
          const cis = creatorScores.intelligence_score || 75;
          const trust = creatorScores.audience_trust || 75;
          const engagement = creatorScores.engagement || 75;
          const regional = creatorScores.regional_influence || 75;
          const consistency = creatorScores.content_consistency || 75;
          const readiness = creatorScores.brand_readiness || 75;

          // Parse current state from price_justification simulation text
          let displayStatus = "Applied";
          let badgeClass = "tag-cyan";
          
          if (app.status === "accepted") {
            displayStatus = "Selected";
            badgeClass = "tag-green pulse-badge-green";
            if (app.price_justification && app.price_justification.includes("In Progress")) {
              displayStatus = "In Progress";
              badgeClass = "tag-blue pulse-badge-blue";
            }
          } else if (app.status === "completed") {
            displayStatus = "Completed";
            badgeClass = "tag-green";
          } else if (app.status === "rejected") {
            displayStatus = "Rejected";
            badgeClass = "tag-red";
          } else if (app.status === "pending") {
            if (app.price_justification && app.price_justification.includes("State: ")) {
              displayStatus = app.price_justification.split("State: ")[1].trim();
              badgeClass = "tag-cyan";
            } else {
              displayStatus = "Applied";
              badgeClass = "tag-cyan";
            }
          }

          // Build Action buttons dynamically based on current simulation state
          let actionButtons = "";
          if (displayStatus === "Applied") {
            actionButtons = `
              <button class="btn btn-primary" style="padding: 4px 8px; font-size: 10px;" onclick="App.handleApplicationAction('${app.id}', 'pending', 'State: Under Review')">Review Application</button>
              <button class="btn btn-tertiary" style="padding: 4px 8px; font-size: 10px;" onclick="App.handleApplicationAction('${app.id}', 'rejected', 'Rejected')">Reject</button>
            `;
          } else if (displayStatus === "Under Review") {
            actionButtons = `
              <button class="btn btn-primary" style="padding: 4px 8px; font-size: 10px;" onclick="App.handleApplicationAction('${app.id}', 'pending', 'State: Shortlisted')">Shortlist Creator</button>
              <button class="btn btn-tertiary" style="padding: 4px 8px; font-size: 10px;" onclick="App.handleApplicationAction('${app.id}', 'rejected', 'Rejected')">Reject</button>
            `;
          } else if (displayStatus === "Shortlisted") {
            actionButtons = `
              <button class="btn btn-primary" style="padding: 4px 8px; font-size: 10px;" onclick="App.handleApplicationAction('${app.id}', 'accepted', 'Selected')">Select Creator</button>
              <button class="btn btn-tertiary" style="padding: 4px 8px; font-size: 10px;" onclick="App.handleApplicationAction('${app.id}', 'rejected', 'Rejected')">Reject</button>
            `;
          } else if (displayStatus === "Selected") {
            actionButtons = `
              <button class="btn btn-primary" style="padding: 4px 8px; font-size: 10px;" onclick="App.handleApplicationAction('${app.id}', 'accepted', 'In Progress')">Start Collaboration</button>
            `;
          } else if (displayStatus === "In Progress") {
            actionButtons = `
              <button class="btn btn-green" style="padding: 4px 8px; font-size: 10px; background:#10b981; border-color:#10b981;" onclick="App.handleApplicationAction('${app.id}', 'completed', 'Completed')">Complete Collaboration</button>
            `;
          }

          applicationsHTML += `
            <div style="border-bottom: 1px solid rgba(255,255,255,0.03); padding: 16px 0; display:flex; flex-direction:column; gap:12px;">
              <div style="display:flex; justify-content:space-between; align-items:start; flex-wrap:wrap; gap:12px;">
                <div style="display:flex; gap:12px; align-items:center;">
                  <img src="${creator.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}" style="width:36px; height:36px; border-radius:50%; border:1px solid rgba(255,255,255,0.1);" alt="Avatar">
                  <div>
                    <h4 style="margin:0; color:#fff; font-size:14px; font-weight:600;">${creator.full_name}</h4>
                    <p class="view-subtitle" style="font-size:11px; margin:2px 0 0 0;">Niches: <strong>${creator.categories ? creator.categories.join(', ') : 'Food'}</strong> | Location: <strong>${creator.city || 'Pune'}, ${creator.state || 'Maharashtra'}</strong></p>
                  </div>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                  <span class="tag ${badgeClass}" style="font-size:10px; padding:3px 8px; font-weight:700;">${displayStatus.toUpperCase()}</span>
                  <div style="display:flex; gap:6px;">
                    ${actionButtons}
                  </div>
                </div>
              </div>

              <!-- Creator Intelligence Variables breakdown -->
              <div style="display:grid; grid-template-columns: repeat(6, 1fr); gap:8px; background:rgba(255,255,255,0.015); padding:10px; border-radius:6px; text-align:center;">
                <div>
                  <div style="font-size:10px; color:var(--color-text-gray);">CIS SCORE</div>
                  <div style="font-size:13px; font-weight:700; color:var(--color-primary-cyan); margin-top:2px;">${cis}</div>
                </div>
                <div>
                  <div style="font-size:10px; color:var(--color-text-gray);">ENGAGEMENT</div>
                  <div style="font-size:13px; font-weight:700; color:#fff; margin-top:2px;">${engagement}%</div>
                </div>
                <div>
                  <div style="font-size:10px; color:var(--color-text-gray);">AUDIENCE TRUST</div>
                  <div style="font-size:13px; font-weight:700; color:#fff; margin-top:2px;">${trust}%</div>
                </div>
                <div>
                  <div style="font-size:10px; color:var(--color-text-gray);">REGIONAL AFF</div>
                  <div style="font-size:13px; font-weight:700; color:#fff; margin-top:2px;">${regional}%</div>
                </div>
                <div>
                  <div style="font-size:10px; color:var(--color-text-gray);">CONSISTENCY</div>
                  <div style="font-size:13px; font-weight:700; color:#fff; margin-top:2px;">${consistency}%</div>
                </div>
                <div>
                  <div style="font-size:10px; color:var(--color-text-gray);">READINESS</div>
                  <div style="font-size:13px; font-weight:700; color:#fff; margin-top:2px;">${readiness}%</div>
                </div>
              </div>
            </div>
          `;
        });
      }

      // 2. Render AI Sourcing Match Recommendations
      let matchesHTML = "";
      
      // Filter out matches that have already applied to avoid double rendering
      const activeMatchRecommendations = matches.filter(m => !campCollabs.some(c => c.creator_id === m.creator_id));

      if (activeMatchRecommendations.length > 0) {
        activeMatchRecommendations.forEach(m => {
          if (!m.creator) return;
          matchesHTML += `
            <div class="creator-match-row" style="border-bottom:1px solid rgba(255,255,255,0.02); padding:12px 0; display:flex; justify-content:space-between; align-items:center;">
              <div class="creator-info-block" style="display:flex; gap:12px; align-items:center;">
                <img src="${m.creator.avatar_url}" class="creator-avatar-sm" style="width:32px; height:32px; border-radius:50%;" alt="Avatar">
                <div class="creator-details-sm">
                  <h4 style="margin:0; font-size:13px; color:#fff;">${m.creator.full_name}</h4>
                  <p class="view-subtitle" style="font-size:11px; margin:2px 0 0 0;">${m.creator.categories ? m.creator.categories.join("/") : 'Food'} | ${m.creator.languages ? m.creator.languages.join("/") : 'Marathi'}</p>
                </div>
              </div>
              <div class="match-percentage-badge" style="display:flex; align-items:center; gap:12px;">
                <div class="match-pct" style="font-weight:700; color:var(--color-primary-cyan); font-size:12px;">${m.match_score}% Match</div>
                <div style="display: flex; gap: 8px;">
                  <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 10px;" onclick="App.openCreatorDetails('${m.creator_id}', '${this.selectedCampaignId}')">View Analysis</button>
                  <button class="btn btn-primary" style="padding: 4px 8px; font-size: 10px;" onclick="App.expressCollabInterest('${this.selectedCampaignId}', '${m.creator_id}')">Send Offer</button>
                </div>
              </div>
            </div>
          `;
        });
      } else {
        matchesHTML = `
          <div style="text-align: center; padding: 20px 10px;">
            <p class="view-subtitle" style="font-size: 11px;">No active recommendations. Run calculations in the AI Creator Match workspace.</p>
            <button class="btn btn-primary" style="margin-top: 12px; font-size: 11px; padding: 6px 12px;" onclick="App.switchSubview('brand-ai-match')">Go to AI Creator Match</button>
          </div>
        `;
      }

      // Map status for heading render
      let statusLabelClass = "tag-cyan";
      let statusLabelText = "DRAFT";
      if (camp.status === "active") {
        statusLabelClass = "tag-green";
        statusLabelText = "PUBLISHED";
      } else if (camp.status === "completed") {
        statusLabelClass = "tag-indigo";
        statusLabelText = "CLOSED";
      }

      workspace.innerHTML = `
        <div class="luxury-card" style="margin-bottom: 24px; box-sizing:border-box;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <h2 style="margin:0; font-size:18px; color:#fff;">${camp.title}</h2>
            <span class="tag ${statusLabelClass}" style="text-transform:uppercase;">${statusLabelText}</span>
          </div>
          <p style="margin-bottom: 16px; font-size: 13px; line-height: 1.6; color: var(--color-text-gray);">${camp.objective}</p>
          <div class="tags-container" style="margin-bottom: 16px; display:flex; gap:8px;">
            <span class="tag tag-cyan" style="font-size:10px;">Target: ${camp.region}</span>
            <span class="tag tag-indigo" style="font-size:10px;">Language: ${camp.language}</span>
            <span class="tag tag-green" style="font-size:10px;">Budget: ₹${camp.budget.toLocaleString('en-IN')}</span>
          </div>
        </div>
        
        <!-- Creator Applications Section (Applications Received) -->
        <div class="luxury-card" style="margin-bottom: 24px; box-sizing:border-box;">
          <h3 style="margin-top:0; margin-bottom: 12px; color:#fff; font-size:15px; font-weight:600;">Applications Received</h3>
          <div id="workspace-applications-list">
            ${applicationsHTML}
          </div>
        </div>

        <!-- Matched Creators recommendations list -->
        <div class="luxury-card" style="box-sizing:border-box;">
          <h3 style="margin-top:0; margin-bottom:12px; color:#fff; font-size:15px; font-weight:600;">AI Sourcing Match Engine Recommendations</h3>
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

  // Location and Chip Helpers for Campaign Form
  handleCampaignStateChange: function(stateValue) {
    const citySelect = document.getElementById("camp-city");
    if (!citySelect) return;
    
    citySelect.innerHTML = '<option value="" disabled selected>Select City</option>';
    const cities = LOCATION_DATA[stateValue] || [];
    cities.forEach(city => {
      citySelect.innerHTML += `<option value="${city}">${city}</option>`;
    });
    citySelect.disabled = cities.length === 0;
  },

  handleChipChange: function(checkbox) {
    const parent = checkbox.parentElement;
    if (checkbox.checked) {
      parent.style.borderColor = 'var(--color-primary-cyan)';
      parent.style.background = 'rgba(0, 212, 255, 0.1)';
      parent.style.boxShadow = '0 0 8px rgba(0, 212, 255, 0.2)';
    } else {
      parent.style.borderColor = 'rgba(79, 70, 229, 0.35)';
      parent.style.background = 'rgba(255, 255, 255, 0.03)';
      parent.style.boxShadow = 'none';
    }
  },

  ensureStateSelectPopulated: function() {
    const stateSelect = document.getElementById("camp-state");
    if (stateSelect && stateSelect.children.length <= 1) {
      stateSelect.innerHTML = '<option value="" disabled selected>Select State</option>';
      Object.keys(LOCATION_DATA).sort().forEach(state => {
        stateSelect.innerHTML += `<option value="${state}">${state}</option>`;
      });
    }
  },

  resetCampaignForm: function() {
    const form = document.getElementById("campaign-create-form");
    if (form) {
      form.reset();
      delete form.dataset.editId;
    }
    
    // Reset state & city selects
    const stateSelect = document.getElementById("camp-state");
    const citySelect = document.getElementById("camp-city");
    if (stateSelect) stateSelect.value = "";
    if (citySelect) {
      citySelect.innerHTML = '<option value="" disabled selected>Select City</option>';
      citySelect.disabled = true;
    }
    
    // Reset chips styles
    document.querySelectorAll('input[name="camp-age-group"]').forEach(chk => {
      chk.checked = false;
      this.handleChipChange(chk);
    });
    document.querySelectorAll('input[name="camp-interest"]').forEach(chk => {
      chk.checked = false;
      this.handleChipChange(chk);
    });
  },

  // Campaign Modals
  showCampaignModal: function() {
    this.resetCampaignForm();
    this.ensureStateSelectPopulated();
    document.getElementById("modal-campaign-form").classList.add("active");
  },

  closeCampaignModal: function() {
    this.resetCampaignForm();
    document.getElementById("modal-campaign-form").classList.remove("active");
  },

  handleCampaignSubmit: async function(e) {
    e.preventDefault();
    const editId = document.getElementById("campaign-create-form").dataset.editId;
    
    // Gather selected age groups
    const selectedAges = [];
    document.querySelectorAll('input[name="camp-age-group"]:checked').forEach(chk => {
      selectedAges.push(chk.value);
    });
    
    // Gather selected interests
    const selectedInterests = [];
    document.querySelectorAll('input[name="camp-interest"]:checked').forEach(chk => {
      selectedInterests.push(chk.value);
    });

    const targetAudienceString = `Age: ${selectedAges.join(", ") || "Any"} | Interests: ${selectedInterests.join(", ") || "Any"}`;
    
    const campaignData = {
      brand_id: this.currentUser.id,
      title: document.getElementById("camp-title").value,
      objective: document.getElementById("camp-objective").value,
      category: document.getElementById("camp-category").value,
      region: document.getElementById("camp-city").value, // City name is saved in region
      language: document.getElementById("camp-language").value,
      creator_type: document.getElementById("camp-type").value,
      budget: parseInt(document.getElementById("camp-budget").value) || 0,
      target_audience: targetAudienceString,
      status: document.getElementById("camp-status").value || "active"
    };

    try {
      if (editId) {
        await window.DB.updateCampaign(editId, campaignData);
        delete document.getElementById("campaign-create-form").dataset.editId;
        this.closeCampaignModal();
        this.showToast("Campaign updated successfully!", "success");
        this.loadBrandCampaigns();
      } else {
        // Create Mode
        const newCamp = await window.DB.createCampaign(campaignData);
        this.closeCampaignModal();
        this.selectedCampaignId = newCamp.id;
        
        this.showToast("Campaign created successfully!", "success");
        this.loadBrandCampaigns();
      }
      
      document.getElementById("campaign-create-form").reset();
    } catch (err) {
      this.showToast("Failed to process campaign: " + err.message, "error");
    }
  },

  handleApplicationAction: async function(collabId, status, price_justification) {
    try {
      await window.DB.updateCollabStatus(collabId, status, price_justification);
      let stateLabel = price_justification.replace("State: ", "");
      if (price_justification === "Selected") stateLabel = "Selected (Pending Payout)";
      if (price_justification === "In Progress") stateLabel = "Collaboration Started";
      if (price_justification === "Completed") stateLabel = "Collaboration Completed & Payout Cleared";
      
      this.showToast(`Application updated: ${stateLabel}`, "success");
      await this.renderCampaignWorkspace();
    } catch (err) {
      this.showToast("Action failed: " + err.message, "error");
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
      const creator = await window.DB.getProfile(creatorId, "creator");
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
      
      const enrichedCount = creators.filter(c => c.ai_status === 'Completed').length;
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
  tempCompiledScores: null,

  startOnboardingWizard: function() {
    window.location.hash = "#/creator-profile";
  },

  loadCompleteProfileGatekeeper: async function() {
    try {
      const profile = await window.DB.getProfile(this.currentUser.id, "creator");
      if (!profile) return;
      
      if (profile.ai_status === 'Processing') {
        this.resumeAnalysisPolling = true;
        this.switchSubview("creator-profile");
        return;
      }
      
      const score = this.calculateProfileCompleteness(profile);
      
      const pctEl = document.getElementById("gatekeeper-progress-pct");
      const barEl = document.getElementById("gatekeeper-progress-bar");
      
      if (pctEl) pctEl.textContent = `${score}%`;
      if (barEl) barEl.style.width = `${score}%`;
    } catch (e) {
      console.error("Failed to load complete profile gatekeeper:", e);
    }
  },

  calculateProfileCompleteness: function(profile) {
    if (!profile) return 0;
    let score = 0;
    if (profile.full_name && profile.full_name.trim()) score += 10;
    if (profile.avatar_url && profile.avatar_url.trim()) score += 10;
    if (profile.bio && profile.bio.trim()) score += 10;
    if (profile.city && profile.city.trim()) score += 10;
    if (profile.state && profile.state.trim()) score += 10;
    
    const langs = profile.languages || [];
    if (langs.length > 0) score += 10;
    
    const cats = profile.categories || [];
    if (cats.length > 0) score += 10;
    
    const social = profile.social_links || {};
    const hasIg = social.instagram && social.instagram.handle && social.instagram.handle.trim();
    const hasYt = social.youtube && social.youtube.handle && social.youtube.handle.trim();
    if (hasIg || hasYt) score += 10;
    
    const aud = profile.audience_metadata || {};
    if (aud.location && aud.location.trim() && aud.posting_frequency && aud.posting_frequency.trim()) score += 10;
    
    const collab = profile.collab_metadata || {};
    if (collab.target_brands && collab.target_brands.length > 0 && collab.previous_experience !== undefined) score += 10;
    
    return score;
  },

  initOnboardingWizard: async function() {
    if (!this.currentUser) return;
    this.onboardingStep = 1;
    this.tempCompiledScores = null;
    
    // Fetch creator details to pre-populate fields
    const creator = await window.DB.getProfile(this.currentUser.id, "creator");
    if (creator) {
      document.getElementById("ob-name").value = creator.full_name || "";
      document.getElementById("ob-avatar").value = creator.avatar_url || "";
      document.getElementById("ob-bio").value = creator.bio || "";
      document.getElementById("ob-city").value = creator.city || "";
      document.getElementById("ob-state").value = creator.state || "";
      
      const langs = creator.languages || [];
      document.getElementById("ob-languages").value = langs.join(", ");
      
      const cats = creator.categories || [];
      document.getElementById("ob-categories").value = cats.join(", ");
      
      const social = creator.social_links || {};
      if (social.instagram) {
        document.getElementById("ob-ig-handle").value = social.instagram.handle || "";
        document.getElementById("ob-ig-followers").value = social.instagram.followers || "";
        document.getElementById("ob-ig-views").value = social.instagram.average_views || "";
        document.getElementById("ob-ig-engagement").value = social.instagram.engagement_rate || "";
      }
      if (social.youtube) {
        document.getElementById("ob-yt-handle").value = social.youtube.handle || "";
        document.getElementById("ob-yt-followers").value = social.youtube.followers || "";
        document.getElementById("ob-yt-views").value = social.youtube.average_views || "";
        document.getElementById("ob-yt-engagement").value = social.youtube.engagement_rate || "";
      }
      
      const aud = creator.audience_metadata || {};
      document.getElementById("ob-aud-location").value = aud.location || "";
      if (aud.age_range) document.getElementById("ob-aud-age").value = aud.age_range;
      if (aud.posting_frequency) document.getElementById("ob-posting-frequency").value = aud.posting_frequency;
      const formats = aud.formats || [];
      document.getElementById("ob-formats").value = formats.join(", ");
      
      const collab = creator.collab_metadata || {};
      const targetBrands = collab.target_brands || [];
      document.getElementById("ob-target-brands").value = targetBrands.join(", ");
      if (collab.previous_experience !== undefined) {
        document.getElementById("ob-collab-exp").value = collab.previous_experience ? "yes" : "no";
        this.toggleCollabExamples(collab.previous_experience ? "yes" : "no");
      }
      document.getElementById("ob-collab-email").value = collab.contact_email || "";
      document.getElementById("ob-collab-examples").value = collab.previous_campaigns || "";
      document.getElementById("ob-price-min").value = creator.pricing_min || "";
      document.getElementById("ob-price-prem").value = creator.pricing_premium || "";
      document.getElementById("ob-portfolio").value = collab.portfolio_url || "";
      document.getElementById("ob-mediakit").value = collab.media_kit_url || "";
    }
    
    // Bind change listener for experience dropdown
    const collabExpEl = document.getElementById("ob-collab-exp");
    if (collabExpEl) {
      collabExpEl.onchange = (e) => this.toggleCollabExamples(e.target.value);
    }
    
    if (this.resumeAnalysisPolling) {
      this.resumeAnalysisPolling = false;
      this.showOnboardingStep(5);
      
      const reviewPanel = document.getElementById("ob-review-trigger-panel");
      const procPanel = document.getElementById("ob-processing-panel");
      const navBar = document.getElementById("ob-nav-bar");
      const exitBtn = document.getElementById("ob-exit-btn");
      
      if (reviewPanel) reviewPanel.style.display = "none";
      if (procPanel) procPanel.style.display = "block";
      if (navBar) navBar.style.display = "none";
      if (exitBtn) exitBtn.style.display = "none";
      
      const logsContainer = document.getElementById("ob-loader-steps");
      if (logsContainer) logsContainer.innerHTML = "";
      
      const addLog = (text, status = "active") => {
        document.querySelectorAll(".loader-step-row.active").forEach(el => {
          el.classList.remove("active");
          el.classList.add("completed");
        });
        const row = document.createElement("div");
        row.className = `loader-step-row ${status}`;
        row.innerHTML = `<span class="loader-step-icon"></span> <span>${text}</span>`;
        if (logsContainer) logsContainer.appendChild(row);
        const stepLabel = document.getElementById("ob-processing-step");
        if (stepLabel) stepLabel.textContent = text;
      };
      
      addLog("Resuming profile analysis check...");
      
      try {
        await this.pollCreatorIntelligence(null, addLog);
        addLog("Successfully enriched profile details!", "completed");
        this.creatorProfileStatus = "Ready";
        this.creatorAiStatus = "Completed";
        
        setTimeout(() => {
          this.showToast("Profile score generated successfully!", "success");
          this.renderNavigation();
          this.switchSubview("creator-dashboard");
        }, 1500);
      } catch (err) {
        this.showToast("Analysis failed: " + err.message, "error");
        this.creatorAiStatus = "Failed";
        this.renderNavigation();
        this.switchSubview("complete-profile");
      }
      return;
    }

    this.showOnboardingStep(1);
  },

  toggleCollabExamples: function(val) {
    const el = document.getElementById("group-ob-collab-examples");
    if (el) {
      el.style.display = val === "yes" ? "block" : "none";
    }
  },

  showOnboardingStep: function(stepNum) {
    this.onboardingStep = stepNum;
    
    // Hide all steps
    document.querySelectorAll(".wizard-step").forEach(el => el.style.display = "none");
    
    // Show current step
    const stepEl = document.getElementById(`wstep-${stepNum}`);
    if (stepEl) stepEl.style.display = "block";
    
    // Update subtitle text
    const subtitle = document.getElementById("wizard-subtitle");
    const stepsNames = [
      "Creator Identity",
      "Social Footprint",
      "Audience & Content",
      "Collaboration Settings",
      "Review & Trigger Analysis"
    ];
    if (subtitle) {
      subtitle.textContent = `Step ${stepNum} of 5: ${stepsNames[stepNum - 1]}`;
    }
    
    // Update progress bar width
    const pct = (stepNum / 5) * 100;
    const pbar = document.getElementById("onboarding-progress-bar");
    if (pbar) pbar.style.width = `${pct}%`;
    
    // Update navigation button visibilities
    const prevBtn = document.getElementById("ob-btn-prev");
    const nextBtn = document.getElementById("ob-btn-next");
    const saveBtn = document.getElementById("ob-btn-save");
    const exitBtn = document.getElementById("ob-exit-btn");
    
    if (prevBtn) prevBtn.style.display = stepNum === 1 ? "none" : "block";
    if (saveBtn) saveBtn.style.display = stepNum === 5 ? "none" : "block";
    if (exitBtn) exitBtn.style.display = "block";
    
    if (nextBtn) {
      if (stepNum === 5) {
        nextBtn.style.display = "none";
      } else {
        nextBtn.style.display = "block";
        nextBtn.textContent = "Continue →";
      }
    }
    
    // Reset view scroll positions
    window.scrollTo(0, 0);
  },

  collectOnboardingFields: function() {
    const name = document.getElementById("ob-name").value.trim();
    const avatar = document.getElementById("ob-avatar").value.trim();
    const bio = document.getElementById("ob-bio").value.trim();
    const city = document.getElementById("ob-city").value.trim();
    const state = document.getElementById("ob-state").value.trim();
    const languages = document.getElementById("ob-languages").value.split(",").map(s => s.trim()).filter(Boolean);
    const categories = document.getElementById("ob-categories").value.split(",").map(s => s.trim()).filter(Boolean);

    const social_links = {
      instagram: {
        handle: document.getElementById("ob-ig-handle").value.trim() || null,
        followers: parseInt(document.getElementById("ob-ig-followers").value) || null,
        average_views: parseInt(document.getElementById("ob-ig-views").value) || null,
        engagement_rate: parseFloat(document.getElementById("ob-ig-engagement").value) || null,
        is_connected: false,
        metrics_source: document.getElementById("ob-ig-followers").value ? "manual" : null
      },
      youtube: {
        handle: document.getElementById("ob-yt-handle").value.trim() || null,
        followers: parseInt(document.getElementById("ob-yt-followers").value) || null,
        average_views: parseInt(document.getElementById("ob-yt-views").value) || null,
        engagement_rate: parseFloat(document.getElementById("ob-yt-engagement").value) || null,
        is_connected: false,
        metrics_source: document.getElementById("ob-yt-followers").value ? "manual" : null
      }
    };

    const audience_metadata = {
      location: document.getElementById("ob-aud-location").value.trim() || null,
      age_range: document.getElementById("ob-aud-age").value || null,
      posting_frequency: document.getElementById("ob-posting-frequency").value || null,
      formats: document.getElementById("ob-formats").value.split(",").map(s => s.trim()).filter(Boolean)
    };

    const collab_metadata = {
      target_brands: document.getElementById("ob-target-brands").value.split(",").map(s => s.trim()).filter(Boolean),
      previous_experience: document.getElementById("ob-collab-exp").value === "yes",
      contact_email: document.getElementById("ob-collab-email").value.trim() || null,
      previous_campaigns: document.getElementById("ob-collab-examples").value.trim() || null,
      portfolio_url: document.getElementById("ob-portfolio").value.trim() || null,
      media_kit_url: document.getElementById("ob-mediakit").value.trim() || null
    };

    const minVal = parseInt(document.getElementById("ob-price-min").value);
    const premVal = parseInt(document.getElementById("ob-price-prem").value);

    let totalFollowers = 0;
    let totalViews = 0;
    let totalEng = 0;
    let platformsCount = 0;

    if (social_links.instagram.handle) {
      totalFollowers += social_links.instagram.followers || 0;
      totalViews += social_links.instagram.average_views || 0;
      totalEng += social_links.instagram.engagement_rate || 0;
      platformsCount++;
    }
    if (social_links.youtube.handle) {
      totalFollowers += social_links.youtube.followers || 0;
      totalViews += social_links.youtube.average_views || 0;
      totalEng += social_links.youtube.engagement_rate || 0;
      platformsCount++;
    }

    return {
      full_name: name || null,
      avatar_url: avatar || null,
      bio: bio || null,
      city: city || null,
      state: state || null,
      languages: languages,
      categories: categories,
      social_links: social_links,
      audience_metadata: audience_metadata,
      collab_metadata: collab_metadata,
      followers_count: totalFollowers,
      average_views: totalViews,
      engagement_rate: platformsCount > 0 ? parseFloat((totalEng / platformsCount).toFixed(2)) : 0,
      pricing_min: isNaN(minVal) ? 0 : minVal,
      pricing_premium: isNaN(premVal) ? 0 : premVal,
      regions: [city, state].filter(Boolean)
    };
  },

  saveOnboardingStepDraft: async function(stepNum) {
    const fields = this.collectOnboardingFields();
    
    // Step validation
    if (stepNum === 1) {
      if (!fields.full_name || !fields.avatar_url || !fields.bio || !fields.city || !fields.state || fields.languages.length === 0 || fields.categories.length === 0) {
        this.showToast("Please fill in all mandatory fields (*) on this step.", "warning");
        return false;
      }
    }
    if (stepNum === 2) {
      const hasIg = fields.social_links.instagram.handle;
      const hasYt = fields.social_links.youtube.handle;
      if (!hasIg && !hasYt) {
        this.showToast("At least one social profile (Instagram or YouTube) is mandatory.", "warning");
        return false;
      }
    }
    if (stepNum === 3) {
      if (!fields.audience_metadata.location || !fields.audience_metadata.posting_frequency || fields.audience_metadata.formats.length === 0) {
        this.showToast("Please fill in all mandatory fields (*) on this step.", "warning");
        return false;
      }
    }
    if (stepNum === 4) {
      if (fields.collab_metadata.target_brands.length === 0) {
        this.showToast("Please fill in all mandatory fields (*) on this step.", "warning");
        return false;
      }
    }

    // Save profile to database/mock DB
    try {
      await window.DB.saveProfile(this.currentUser.id, "creator", fields);
    } catch (e) {
      console.error("Failed to save step draft:", e);
    }
    return true;
  },

  saveOnboardingDraft: async function() {
    const fields = this.collectOnboardingFields();
    try {
      this.showToast("Saving draft...", "info");
      await window.DB.saveProfile(this.currentUser.id, "creator", fields);
      this.showToast("Draft saved successfully! You can resume anytime.", "success");
      this.switchSubview("complete-profile");
    } catch (e) {
      this.showToast("Failed to save draft: " + e.message, "error");
    }
  },

  syncMockSocialMetrics: function() {
    const igHandle = document.getElementById("ob-ig-handle").value.trim();
    const ytHandle = document.getElementById("ob-yt-handle").value.trim();
    
    if (!igHandle && !ytHandle) {
      this.showToast("Please enter at least one handle (Instagram or YouTube) to sync metrics.", "warning");
      return;
    }
    
    this.showToast("Connecting and fetching API metrics...", "info");
    
    setTimeout(() => {
      if (igHandle) {
        document.getElementById("ob-ig-followers").value = 18400;
        document.getElementById("ob-ig-views").value = 4500;
        document.getElementById("ob-ig-engagement").value = 5.25;
      }
      if (ytHandle) {
        document.getElementById("ob-yt-followers").value = 32000;
        document.getElementById("ob-yt-views").value = 14500;
        document.getElementById("ob-yt-engagement").value = 6.80;
      }
      this.showToast("Metrics connection completed successfully!", "success");
    }, 1500);
  },

  triggerCreatorIntelligence: async function() {
    // 1. Save final draft of onboarding data
    const validated = await this.saveOnboardingStepDraft(4);
    if (!validated) return;

    // Show processing panels
    const reviewPanel = document.getElementById("ob-review-trigger-panel");
    const procPanel = document.getElementById("ob-processing-panel");
    const navBar = document.getElementById("ob-nav-bar");
    const exitBtn = document.getElementById("ob-exit-btn");
    
    if (reviewPanel) reviewPanel.style.display = "none";
    if (procPanel) procPanel.style.display = "block";
    if (navBar) navBar.style.display = "none";
    if (exitBtn) exitBtn.style.display = "none";

    const stepLabel = document.getElementById("ob-processing-step");
    const logsContainer = document.getElementById("ob-loader-steps");
    logsContainer.innerHTML = "";

    const addLog = (text, status = "active") => {
      document.querySelectorAll(".loader-step-row.active").forEach(el => {
        el.classList.remove("active");
        el.classList.add("completed");
      });
      const row = document.createElement("div");
      row.className = `loader-step-row ${status}`;
      row.innerHTML = `<span class="loader-step-icon"></span> <span>${text}</span>`;
      logsContainer.appendChild(row);
      if (stepLabel) stepLabel.textContent = text;
    };

    addLog("Validating creator profile completeness...");

    try {
      let data;
      if (window.DB.isLive()) {
        const response = await fetch(`${window.N8N.backendUrl}/creators/enrich`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ creator_id: this.currentUser.id })
        });
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || response.statusText);
        }
        data = await response.json();
      } else {
        data = await window.N8N.triggerProfileEnrichment(this.currentUser.id);
      }

      addLog("Analyzing connected social footprints...");
      
      const job_id = data && data.data ? data.data.job_id : null;
      if (window.DB.isLive() && job_id) {
        await this.pollCreatorIntelligence(job_id, addLog);
      } else {
        await new Promise(r => setTimeout(r, 2000));
        addLog("Computing five-axis score vectors...");
        await new Promise(r => setTimeout(r, 2000));
      }

      addLog("Generating suggestions and recommendations...");
      await new Promise(r => setTimeout(r, 1000));

      this.showToast("Creator Intelligence compiled successfully!", "success");
      
      this.creatorProfileStatus = 'Ready';
      this.creatorAiStatus = 'Completed';
      
      this.renderNavigation();
      window.location.hash = "#/creator-dashboard";
    } catch (err) {
      console.error("Creator enrichment failed:", err);
      this.showToast(err.message, "error");
      
      if (reviewPanel) reviewPanel.style.display = "block";
      if (procPanel) procPanel.style.display = "none";
      if (navBar) navBar.style.display = "flex";
      if (exitBtn) exitBtn.style.display = "block";
    }
  },

  pollCreatorIntelligence: async function(job_id, addLog) {
    const startTime = Date.now();
    const timeout = 60000;
    let currentStep = 1;

    while (Date.now() - startTime < timeout) {
      await new Promise(r => setTimeout(r, 2000));
      
      const response = await fetch(`${window.N8N.backendUrl}/creators/profile/${this.currentUser.id}`);
      if (!response.ok) {
        throw new Error("Failed to poll profile status updates.");
      }
      const profile = await response.json();
      
      if (profile.ai_status === "Completed") {
        return;
      } else if (profile.ai_status === "Failed") {
        throw new Error("Creator Intelligence score generation failed.");
      }
      
      const elapsed = Date.now() - startTime;
      if (elapsed > 10000 && currentStep === 2) {
        currentStep = 3;
        addLog("Computing five-axis score vectors...");
      } else if (elapsed > 4000 && currentStep === 1) {
        currentStep = 2;
        addLog("Analyzing connected social footprints...");
      }
    }
    throw new Error("Creator Intelligence score generation timed out.");
  },

  nextOnboardingStep: async function() {
    const validated = await this.saveOnboardingStepDraft(this.onboardingStep);
    if (!validated) return;

    if (this.onboardingStep < 5) {
      this.showOnboardingStep(this.onboardingStep + 1);
    }
  },

  prevOnboardingStep: function() {
    if (this.onboardingStep > 1) {
      this.showOnboardingStep(this.onboardingStep - 1);
    }
  },

  /* ==================== CREATOR CAMPAIGN DISCOVERY ==================== */
  loadCampaignDiscoveryList: async function() {
    try {
      if (!this.currentUser) return;
      const grid = document.getElementById("discovery-campaigns-grid");
      if (!grid) return;
      
      const creator = await window.DB.getProfile(this.currentUser.id, "creator");
      const catFilter = document.getElementById("disc-filter-category").value;
      const budFilter = document.getElementById("disc-filter-budget").value;
      
      let campaigns = [];
      let collabs = [];
      
      if (window.DB.isLive()) {
        campaigns = await window.DB.getAllCampaigns() || [];
        if (creator) {
          collabs = await window.DB.getCollabsForCreator(creator.id) || [];
        }
      } else {
        campaigns = JSON.parse(localStorage.getItem("cl_campaigns") || "[]");
        collabs = JSON.parse(localStorage.getItem("cl_collabs") || "[]");
      }
      
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
    } catch (e) {
      this.showToast(e.message, "error");
    }
  },

  applyToCampaign: async function(campId, matchScore) {
    this.showToast("Submitting sponsorship request...", "info");
    
    try {
      let camp;
      if (window.DB.isLive()) {
        const campaigns = await window.DB.getAllCampaigns() || [];
        camp = campaigns.find(c => c.id === campId);
      } else {
        const campaigns = JSON.parse(localStorage.getItem("cl_campaigns") || "[]");
        camp = campaigns.find(c => c.id === campId);
      }
      
      if (!camp) throw new Error("Sponsorship campaign not found.");

      const requestPayload = {
        campaign_id: campId,
        creator_id: this.currentUser.id,
        brand_id: camp.brand_id,
        suggested_price: camp.budget,
        price_justification: `AI matched application at ${matchScore}% match score.`,
        initiated_by: "creator"
      };

      if (window.DB.isLive()) {
        await window.DB.saveCollabRequest(requestPayload);
      } else {
        const collabs = JSON.parse(localStorage.getItem("cl_collabs") || "[]");
        collabs.push({
          id: "col-" + Math.floor(Math.random()*10000),
          ...requestPayload,
          status: "pending",
          created_at: new Date().toISOString()
        });
        localStorage.setItem("cl_collabs", JSON.stringify(collabs));
      }
      
      this.showToast("Applied successfully! Review in progress.", "success");
      await this.loadCampaignDiscoveryList();
      
      this.addSystemNotification(
        "Campaign Application Submitted",
        `You have successfully applied to "${camp.title}". Status: Under review.`,
        "info"
      );
    } catch (err) {
      this.showToast(`Application failed: ${err.message}`, "error");
    }
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
    
    // Parse social links correctly
    const social = creator.social_links || {};
    document.getElementById("pmg-ig").value = (social.instagram && social.instagram.handle) ? social.instagram.handle : (creator.social_ig || "");
    document.getElementById("pmg-yt").value = (social.youtube && social.youtube.handle) ? social.youtube.handle : (creator.social_yt || "");
    
    const scores = await window.DB.getCreatorScores(creator.id);
    document.getElementById("pmg-score-value").textContent = scores ? scores.intelligence_score : "--";

    const badge = document.getElementById("pmg-status-badge");
    if (badge) {
      if (creator.ai_status === "Completed") {
        badge.className = "tag tag-green pulse-badge-green";
        badge.textContent = "AI Enriched Profile";
      } else if (creator.ai_status === "Processing") {
        badge.className = "tag tag-blue pulse-badge-blue";
        badge.textContent = "Processing...";
      } else if (creator.ai_status === "Failed") {
        badge.className = "tag tag-red";
        badge.textContent = "Enrichment Failed";
      } else {
        badge.className = "tag tag-gray";
        badge.textContent = "Unenriched";
      }
    }
  },

  saveProfileMgmtDetails: async function(e) {
    e.preventDefault();
    this.showToast("Saving details...", "info");
    
    try {
      const name = document.getElementById("pmg-name").value.trim();
      const avatar = document.getElementById("pmg-avatar").value.trim();
      const bio = document.getElementById("pmg-bio").value.trim();
      const igHandle = document.getElementById("pmg-ig").value.trim();
      const ytHandle = document.getElementById("pmg-yt").value.trim();

      const currentProfile = await window.DB.getProfile(this.currentUser.id, "creator");
      const socialLinks = currentProfile.social_links || {};
      
      if (!socialLinks.instagram) socialLinks.instagram = {};
      socialLinks.instagram.handle = igHandle || null;

      if (!socialLinks.youtube) socialLinks.youtube = {};
      socialLinks.youtube.handle = ytHandle || null;

      const profileData = {
        full_name: name,
        avatar_url: avatar,
        bio: bio,
        social_links: socialLinks,
        social_ig: igHandle,
        social_yt: ytHandle
      };

      await window.DB.saveProfile(this.currentUser.id, "creator", profileData);
      
      // Update local storage for mock fallback compatibility
      const creators = JSON.parse(localStorage.getItem("cl_creators") || "[]");
      const idx = creators.findIndex(c => c.id === this.currentUser.id);
      if (idx !== -1) {
        creators[idx] = { ...creators[idx], ...profileData };
        localStorage.setItem("cl_creators", JSON.stringify(creators));
      }

      this.showToast("Profile details saved successfully!", "success");
      
      await this.loadProfileMgmtDetails();
      
      // Reload profile statuses and refresh the sidebar locks
      const profile = await window.DB.getProfile(this.currentUser.id, "creator");
      if (profile) {
        this.creatorProfileStatus = profile.profile_status || 'Incomplete';
        this.creatorAiStatus = profile.ai_status || 'Not Started';
      }
      this.renderNavigation();
    } catch(err) {
      this.showToast(err.message, "error");
    }
  },

  triggerCreatorReanalysis: async function() {
    const modal = document.getElementById("modal-pipeline-progress");
    const steps = [
      { id: "qstep-1", label: "Step 1: Scrape Profile Details", text: "Pulling bio parameters..." },
      { id: "qstep-2", label: "Step 2: Parse Dialect Affinity", text: "Analyzing regional expressions..." },
      { id: "qstep-3", label: "Step 3: Render Intelligence Score", text: "SVG concentric ring rendering..." }
    ];
    
    document.getElementById("pipeline-title").textContent = "Re-analyzing Creator Profile...";
    modal.classList.add("active");

    const updateStepUI = (stepId, status, label) => {
      const stepEl = document.getElementById(stepId);
      if (stepEl) {
        stepEl.className = `queue-step ${status === 'Completed' ? 'success' : status === 'Analyzing...' ? 'active' : ''}`;
        stepEl.querySelector(".step-name").textContent = label;
        stepEl.querySelector(".step-status").textContent = status;
      }
    };

    if (window.DB.isLive()) {
      try {
        updateStepUI("qstep-1", "Analyzing...", "Step 1: Scrape Profile Details");
        updateStepUI("qstep-2", "Pending", "Step 2: Parse Dialect Affinity");
        updateStepUI("qstep-3", "Pending", "Step 3: Render Intelligence Score");

        await window.N8N.triggerProfileEnrichment(this.currentUser.id, (step, msg) => {
          console.log(`[Reanalysis Step] ${step}: ${msg}`);
          if (step === "wf01") {
            updateStepUI("qstep-1", "Completed", "Step 1: Scrape Profile Details");
            updateStepUI("qstep-2", "Analyzing...", "Step 2: Parse Dialect Affinity");
          } else if (step === "wf02" || step === "wf03") {
            updateStepUI("qstep-2", "Completed", "Step 2: Parse Dialect Affinity");
            updateStepUI("qstep-3", "Analyzing...", "Step 3: Render Intelligence Score");
          } else if (step === "complete") {
            updateStepUI("qstep-3", "Completed", "Step 3: Render Intelligence Score");
          }
        });
        
        modal.classList.remove("active");
        this.showToast("AI Profile Re-analysis complete!", "success");
        await this.loadProfileMgmtDetails();
        
        if (this.activeSubview === "creator-dashboard") {
          await this.loadCreatorDashboard();
        } else if (this.activeSubview === "creator-intelligence") {
          await this.loadCreatorIntelligence();
        }
        
      } catch (err) {
        modal.classList.remove("active");
        this.showToast(`AI Re-analysis failed: ${err.message}`, "error");
      }
    } else {
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
    }
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



  // ==================== BRAND SETTINGS LOADER ====================
  loadBrandSettings: function() {
    this.adminLog("Loaded brand settings panel.");
  },

  // ==================== ADMIN SUB-VIEWS & LOADERS ====================
  loadAdminDashboard: async function() {
    try {
      const data = await window.DB.getAdminDashboard();
      if (!data) return;

      document.getElementById("admin-stat-creators").textContent = data.stats.totalCreators;
      document.getElementById("admin-stat-brands").textContent = data.stats.totalBrands;
      document.getElementById("admin-stat-active-campaigns").textContent = data.stats.activeCampaigns;
      document.getElementById("admin-stat-active-collaborations").textContent = data.stats.activeCollaborations;

      const list = document.getElementById("admin-dashboard-activity-list");
      list.innerHTML = "";
      if (data.recentActivity && data.recentActivity.length > 0) {
        data.recentActivity.forEach(act => {
          const date = new Date(act.created_at || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
          let icon = "⚡";
          if (act.type.includes("creator")) icon = "👤";
          if (act.type.includes("brand")) icon = "🏢";
          if (act.type.includes("campaign")) icon = "📢";
          if (act.type.includes("collab")) icon = "🤝";
          
          list.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(255,255,255,0.01); border-radius:8px; font-size:12.5px;">
              <span style="color:#fff;">${icon} <strong>${act.message}</strong></span>
              <span style="color:var(--color-text-muted); font-size:11px;">${date}</span>
            </div>
          `;
        });
      } else {
        list.innerHTML = `<div style="text-align:center; padding:20px; color:var(--color-text-gray);">No recent platform activities recorded.</div>`;
      }
    } catch (e) {
      this.showToast("Failed to load Admin Dashboard: " + e.message, "error");
    }
  },

  loadAdminCreators: async function() {
    try {
      const creators = await window.DB.getAdminCreators() || [];
      this.adminCreators = creators; // Cache creators

      const body = document.getElementById("admin-creators-list-body");
      body.innerHTML = "";
      if (creators.length === 0) {
        body.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:16px; color:var(--color-text-gray);">No creators registered.</td></tr>`;
      } else {
        creators.forEach(c => {
          const creatorScores = c.creator_scores && c.creator_scores[0] ? c.creator_scores[0] : {};
          const cis = creatorScores.intelligence_score !== undefined && creatorScores.intelligence_score >= 0 ? creatorScores.intelligence_score : "--";
          const email = c.collab_metadata?.contact_email || "N/A";
          
          let enrichClass = "tag-cyan";
          if (c.ai_status === "Processing") enrichClass = "tag-indigo pulse-badge-blue";
          if (c.ai_status === "Completed") enrichClass = "tag-green";
          if (c.ai_status === "Failed") enrichClass = "tag-red";

          let onboardClass = c.profile_status === "Ready" ? "tag-green" : "tag-cyan";

          body.innerHTML += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.02); height: 50px;">
              <td style="padding:10px 8px; color:#fff; font-weight:600; display:flex; align-items:center; gap:8px;">
                <img src="${c.avatar_url}" style="width:28px; height:28px; border-radius:50%; border:1px solid rgba(255,255,255,0.1);" alt="Avatar">
                ${c.full_name}
              </td>
              <td style="padding:10px 8px; color:var(--color-text-gray);">${email}</td>
              <td style="padding:10px 8px; color:var(--color-text-gray);">${c.city || 'Indore'}, ${c.state || 'MP'}</td>
              <td style="padding:10px 8px; text-align:center; font-weight:700; color:var(--color-primary-cyan);">${cis}</td>
              <td style="padding:10px 8px; text-align:center;"><span class="tag ${enrichClass}" style="font-size:9.5px;">${c.ai_status}</span></td>
              <td style="padding:10px 8px; text-align:center;"><span class="tag ${onboardClass}" style="font-size:9.5px;">${c.profile_status}</span></td>
              <td style="padding:10px 8px; text-align:right;">
                <button class="btn btn-secondary" style="padding:4px 8px; font-size:11px;" onclick="App.openAdminCreatorModal('${c.id}')">View Details</button>
              </td>
            </tr>
          `;
        });
      }
    } catch (e) {
      this.showToast("Failed to load Creators registry: " + e.message, "error");
    }
  },

  loadAdminBrands: async function() {
    try {
      const brands = await window.DB.getAdminBrands() || [];
      this.adminBrands = brands; // Cache brands

      const body = document.getElementById("admin-brands-list-body");
      body.innerHTML = "";
      if (brands.length === 0) {
        body.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:16px; color:var(--color-text-gray);">No brands registered.</td></tr>`;
      } else {
        brands.forEach(b => {
          body.innerHTML += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.02); height: 50px;">
              <td style="padding:10px 8px; color:#fff; font-weight:600;">${b.company_name}</td>
              <td style="padding:10px 8px; color:var(--color-primary-cyan);"><a href="${b.website}" target="_blank" style="color:inherit; text-decoration:none;">${b.website || 'N/A'}</a></td>
              <td style="padding:10px 8px; text-align:center; color:#fff;">${b.campaigns_count || 0}</td>
              <td style="padding:10px 8px; text-align:center; color:var(--color-primary-green); font-weight:700;">${b.active_campaigns_count || 0}</td>
              <td style="padding:10px 8px; text-align:center; color:#fff;">${b.collaborations_count || 0}</td>
              <td style="padding:10px 8px; text-align:right;">
                <button class="btn btn-secondary" style="padding:4px 8px; font-size:11px;" onclick="App.openAdminBrandModal('${b.id}')">View Details</button>
              </td>
            </tr>
          `;
        });
      }
    } catch (e) {
      this.showToast("Failed to load Brands registry: " + e.message, "error");
    }
  },

  loadAdminCampaigns: async function() {
    try {
      const campaigns = await window.DB.getAdminCampaigns() || [];
      const body = document.getElementById("admin-campaigns-list-body");
      body.innerHTML = "";
      if (campaigns.length === 0) {
        body.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:16px; color:var(--color-text-gray);">No campaigns created.</td></tr>`;
      } else {
        campaigns.forEach(c => {
          let labelClass = "tag-cyan";
          let labelText = "DRAFT";
          if (c.status === "active") {
            labelClass = "tag-green";
            labelText = "PUBLISHED";
          } else if (c.status === "completed") {
            labelClass = "tag-indigo";
            labelText = "CLOSED";
          }

          body.innerHTML += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.02); height: 50px;">
              <td style="padding:10px 8px; color:#fff; font-weight:600;">${c.title}</td>
              <td style="padding:10px 8px; color:var(--color-text-gray);">${c.brand_name}</td>
              <td style="padding:10px 8px; text-align:right; color:#00F2A6; font-weight:700;">₹${c.budget.toLocaleString('en-IN')}</td>
              <td style="padding:10px 8px; color:var(--color-text-gray);">${c.region}</td>
              <td style="padding:10px 8px; color:var(--color-text-gray);">${c.language}</td>
              <td style="padding:10px 8px; text-align:center;"><span class="tag ${labelClass}" style="font-size:9.5px;">${labelText}</span></td>
              <td style="padding:10px 8px; text-align:center;"><span class="tag tag-cyan" style="font-size:9.5px;">${c.applications_count || 0} applied</span></td>
            </tr>
          `;
        });
      }
    } catch (e) {
      this.showToast("Failed to load Campaigns manager: " + e.message, "error");
    }
  },

  loadAdminCollaborations: async function() {
    try {
      const collabs = await window.DB.getAdminCollaborations() || [];
      const body = document.getElementById("admin-collaborations-list-body");
      body.innerHTML = "";
      if (collabs.length === 0) {
        body.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:16px; color:var(--color-text-gray);">No collaborations active.</td></tr>`;
      } else {
        collabs.forEach(c => {
          const brandName = c.brand ? c.brand.company_name : "A Brand";
          const creatorName = c.creator ? c.creator.full_name : "A Creator";
          const date = new Date(c.created_at || Date.now()).toLocaleDateString('en-IN');

          // User friendly label parsing mimicking creator/brand dash
          let displayStatus = "Applied";
          let badgeClass = "tag-cyan";
          
          if (c.status === "accepted") {
            displayStatus = "Selected";
            badgeClass = "tag-green";
            if (c.price_justification && c.price_justification.includes("In Progress")) {
              displayStatus = "In Progress";
              badgeClass = "tag-blue";
            }
          } else if (c.status === "completed") {
            displayStatus = "Completed";
            badgeClass = "tag-green";
          } else if (c.status === "rejected") {
            displayStatus = "Rejected";
            badgeClass = "tag-red";
          } else if (c.status === "pending") {
            if (c.price_justification && c.price_justification.includes("State: ")) {
              displayStatus = c.price_justification.split("State: ")[1].trim();
              badgeClass = "tag-cyan";
            }
          }

          body.innerHTML += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.02); height: 50px;">
              <td style="padding:10px 8px; color:#fff; font-weight:600;">${c.campaign ? c.campaign.title : 'Campaign Offer'}</td>
              <td style="padding:10px 8px; color:var(--color-text-gray);">${brandName}</td>
              <td style="padding:10px 8px; color:#fff;">${creatorName}</td>
              <td style="padding:10px 8px; text-align:right; color:#00F2A6; font-weight:700;">₹${c.suggested_price.toLocaleString('en-IN')}</td>
              <td style="padding:10px 8px; text-align:center;"><span class="tag tag-indigo" style="font-size:9.5px; text-transform:uppercase;">${c.initiated_by}</span></td>
              <td style="padding:10px 8px; text-align:center;"><span class="tag ${badgeClass}" style="font-size:9.5px; text-transform:uppercase;">${displayStatus}</span></td>
              <td style="padding:10px 8px; color:var(--color-text-muted); font-size:11px;">${date}</td>
            </tr>
          `;
        });
      }
    } catch (e) {
      this.showToast("Failed to load Collaborations registry: " + e.message, "error");
    }
  },

  openAdminCreatorModal: async function(creatorId) {
    try {
      const creator = this.adminCreators ? this.adminCreators.find(c => c.id === creatorId) : null;
      if (!creator) return;

      // Identity pre-fills
      document.getElementById("admin-creator-detail-name").textContent = creator.full_name;
      document.getElementById("admin-creator-detail-fullname").textContent = creator.full_name;
      document.getElementById("admin-creator-detail-avatar").src = creator.avatar_url;
      document.getElementById("admin-creator-detail-bio").textContent = creator.bio;
      document.getElementById("admin-creator-detail-onboarding").textContent = creator.profile_status.toUpperCase();
      document.getElementById("admin-creator-detail-ai").textContent = creator.ai_status.toUpperCase();
      document.getElementById("admin-creator-detail-location").textContent = `${creator.city || 'Indore'}, ${creator.state || 'MP'}`;

      // Retrieve scores
      const creatorScores = creator.creator_scores && creator.creator_scores[0] ? creator.creator_scores[0] : {};
      const cis = creatorScores.intelligence_score !== undefined && creatorScores.intelligence_score >= 0 ? creatorScores.intelligence_score : "--";
      const trust = creatorScores.audience_trust !== undefined && creatorScores.audience_trust >= 0 ? creatorScores.audience_trust : 0;
      const engagement = creatorScores.engagement !== undefined && creatorScores.engagement >= 0 ? creatorScores.engagement : 0;
      const regional = creatorScores.regional_influence !== undefined && creatorScores.regional_influence >= 0 ? creatorScores.regional_influence : 0;
      const consistency = creatorScores.content_consistency !== undefined && creatorScores.content_consistency >= 0 ? creatorScores.content_consistency : 0;
      const readiness = creatorScores.brand_readiness !== undefined && creatorScores.brand_readiness >= 0 ? creatorScores.brand_readiness : 0;

      // Populate overall CIS and vectors bars
      document.getElementById("admin-creator-detail-cis").textContent = cis;
      document.getElementById("admin-creator-vector-trust").textContent = `${trust}%`;
      document.getElementById("admin-creator-fill-trust").style.width = `${trust}%`;
      document.getElementById("admin-creator-vector-engagement").textContent = `${engagement}%`;
      document.getElementById("admin-creator-fill-engagement").style.width = `${engagement}%`;
      document.getElementById("admin-creator-vector-regional").textContent = `${regional}%`;
      document.getElementById("admin-creator-fill-regional").style.width = `${regional}%`;
      document.getElementById("admin-creator-vector-consistency").textContent = `${consistency}%`;
      document.getElementById("admin-creator-fill-consistency").style.width = `${consistency}%`;
      document.getElementById("admin-creator-vector-readiness").textContent = `${readiness}%`;
      document.getElementById("admin-creator-fill-readiness").style.width = `${readiness}%`;

      // Strengths & Weaknesses
      const strengthsList = document.getElementById("admin-creator-detail-strengths");
      strengthsList.innerHTML = "";
      const strengths = creator.creator_ai_analysis && creator.creator_ai_analysis[0] ? creator.creator_ai_analysis[0].strengths || [] : ["Consistent local vocabulary matching target niches."];
      strengths.forEach(s => {
        strengthsList.innerHTML += `<li>${s}</li>`;
      });

      const weaknessesList = document.getElementById("admin-creator-detail-weaknesses");
      weaknessesList.innerHTML = "";
      const weaknesses = creator.creator_ai_analysis && creator.creator_ai_analysis[0] ? creator.creator_ai_analysis[0].weaknesses || [] : ["Requires audience geography metrics updates."];
      weaknesses.forEach(w => {
        weaknessesList.innerHTML += `<li>${w}</li>`;
      });

      // Retrieve campaigns for this creator
      const creatorCollabs = await window.DB.getCollabsForCreator(creatorId) || [];
      const collabBody = document.getElementById("admin-creator-campaigns-body");
      collabBody.innerHTML = "";
      if (creatorCollabs.length === 0) {
        collabBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:8px; color:var(--color-text-gray);">No campaign collaborations recorded.</td></tr>`;
      } else {
        creatorCollabs.forEach(col => {
          let displayStatus = "Applied";
          if (col.status === "accepted") {
            displayStatus = "Selected";
            if (col.price_justification && col.price_justification.includes("In Progress")) displayStatus = "In Progress";
          } else if (col.status === "completed") {
            displayStatus = "Completed";
          } else if (col.status === "rejected") {
            displayStatus = "Rejected";
          }

          collabBody.innerHTML += `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.01);">
              <td style="padding:8px 4px; color:#fff;">${col.campaign ? col.campaign.title : 'Campaign Offer'}</td>
              <td style="padding:8px 4px; color:var(--color-text-gray);">${col.brand ? col.brand.company_name : 'Sponsor'}</td>
              <td style="padding:8px 4px; text-align:right; color:#00F2A6;">₹${col.suggested_price.toLocaleString('en-IN')}</td>
              <td style="padding:8px 4px; text-align:center; text-transform:uppercase;">${col.initiated_by}</td>
              <td style="padding:8px 4px; text-align:center; color:#fff; font-weight:600;">${displayStatus}</td>
            </tr>
          `;
        });
      }

      document.getElementById("modal-admin-creator-details").classList.add("active");
    } catch (e) {
      this.showToast("Failed to open creator details: " + e.message, "error");
    }
  },

  closeAdminCreatorModal: function() {
    document.getElementById("modal-admin-creator-details").classList.remove("active");
  },

  openAdminBrandModal: async function(brandId) {
    try {
      const brand = this.adminBrands ? this.adminBrands.find(b => b.id === brandId) : null;
      if (!brand) return;

      document.getElementById("admin-brand-detail-name").textContent = brand.company_name;
      document.getElementById("admin-brand-detail-fullname").textContent = brand.company_name;
      document.getElementById("admin-brand-detail-bio").textContent = brand.bio || "No brand company bio provided.";
      document.getElementById("admin-brand-detail-website").textContent = brand.website || "N/A";
      document.getElementById("admin-brand-detail-industry").textContent = brand.industry || "N/A";

      // Query campaigns created by this brand
      const campaigns = await window.DB.getCampaigns(brandId) || [];
      const campBody = document.getElementById("admin-brand-campaigns-body");
      campBody.innerHTML = "";
      if (campaigns.length === 0) {
        campBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:8px; color:var(--color-text-gray);">No campaigns created by this brand.</td></tr>`;
      } else {
        campaigns.forEach(c => {
          let labelText = "DRAFT";
          if (c.status === "active") labelText = "PUBLISHED";
          if (c.status === "completed") labelText = "CLOSED";

          campBody.innerHTML += `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.01);">
              <td style="padding:8px 4px; color:#fff;">${c.title}</td>
              <td style="padding:8px 4px; color:var(--color-text-gray); text-transform:capitalize;">${c.category}</td>
              <td style="padding:8px 4px; text-align:right; color:#00F2A6;">₹${c.budget.toLocaleString('en-IN')}</td>
              <td style="padding:8px 4px; color:var(--color-text-gray);">${c.region}</td>
              <td style="padding:8px 4px; text-align:center; color:#fff;">${labelText}</td>
            </tr>
          `;
        });
      }

      // Query collaborations for this brand
      const brandCollabs = await window.DB.getCollabsForBrand(brandId) || [];
      const collabBody = document.getElementById("admin-brand-collabs-body");
      collabBody.innerHTML = "";
      if (brandCollabs.length === 0) {
        collabBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:8px; color:var(--color-text-gray);">No platform partnerships activity.</td></tr>`;
      } else {
        brandCollabs.forEach(col => {
          const creatorName = col.creator ? col.creator.full_name : "A Creator";
          let displayStatus = "Applied";
          if (col.status === "accepted") {
            displayStatus = "Selected";
            if (col.price_justification && col.price_justification.includes("In Progress")) displayStatus = "In Progress";
          } else if (col.status === "completed") {
            displayStatus = "Completed";
          } else if (col.status === "rejected") {
            displayStatus = "Rejected";
          }

          collabBody.innerHTML += `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.01);">
              <td style="padding:8px 4px; color:#fff;">${creatorName}</td>
              <td style="padding:8px 4px; color:var(--color-text-gray);">${col.campaign ? col.campaign.title : 'Campaign Offer'}</td>
              <td style="padding:8px 4px; text-align:right; color:#00F2A6;">₹${col.suggested_price.toLocaleString('en-IN')}</td>
              <td style="padding:8px 4px; text-align:center; text-transform:uppercase;">${col.initiated_by}</td>
              <td style="padding:8px 4px; text-align:center; color:#fff; font-weight:600;">${displayStatus}</td>
            </tr>
          `;
        });
      }

      document.getElementById("modal-admin-brand-details").classList.add("active");
    } catch (e) {
      this.showToast("Failed to open brand details: " + e.message, "error");
    }
  },

  closeAdminBrandModal: function() {
    document.getElementById("modal-admin-brand-details").classList.remove("active");
  },

  // ==================== CAMPAIGN ACTIONS (EDIT / DELETE) ====================
  deleteCampaign: async function(campId) {
    const confirmed = confirm("Are you sure you want to delete this campaign? This action cannot be undone.");
    if (!confirmed) return;
    
    try {
      await window.DB.deleteCampaign(campId);
      if (this.selectedCampaignId === campId) {
        this.selectedCampaignId = null;
      }
      this.showToast("Campaign deleted successfully.", "success");
      this.loadBrandCampaigns();
    } catch (e) {
      this.showToast("Failed to delete campaign: " + e.message, "error");
    }
  },

  editCampaign: function(campId) {
    let camp;
    if (window.DB.isLive()) {
      camp = this.campaigns ? this.campaigns.find(c => c.id === campId) : null;
    } else {
      const campaigns = JSON.parse(localStorage.getItem("cl_campaigns") || "[]");
      camp = campaigns.find(c => c.id === campId);
    }
    if (camp) {
      this.resetCampaignForm();
      this.ensureStateSelectPopulated();

      // Pre-fill campaign form values
      document.getElementById("camp-title").value = camp.title;
      document.getElementById("camp-objective").value = camp.objective;
      document.getElementById("camp-category").value = camp.category;
      
      // Determine state/city
      const city = camp.region;
      let state = "";
      for (const [st, cities] of Object.entries(LOCATION_DATA)) {
        if (cities.includes(city)) {
          state = st;
          break;
        }
      }

      const stateSelect = document.getElementById("camp-state");
      const citySelect = document.getElementById("camp-city");
      
      if (stateSelect && citySelect) {
        if (state) {
          stateSelect.value = state;
          this.handleCampaignStateChange(state);
          citySelect.value = city;
        } else {
          // Custom fallback for unmapped region strings
          stateSelect.value = "";
          citySelect.innerHTML = `<option value="${city}" selected>${city}</option>`;
          citySelect.disabled = false;
        }
      }

      document.getElementById("camp-language").value = camp.language;
      document.getElementById("camp-budget").value = camp.budget;
      document.getElementById("camp-type").value = camp.creator_type;
      document.getElementById("camp-status").value = camp.status || "active";
      
      // Parse target audience
      const audStr = camp.target_audience || "";
      if (audStr.includes("Age:") || audStr.includes("Interests:")) {
        const parts = audStr.split("|");
        parts.forEach(part => {
          if (part.includes("Age:")) {
            const ages = part.replace("Age:", "").split(",").map(s => s.trim());
            ages.forEach(age => {
              const chk = document.querySelector(`input[name="camp-age-group"][value="${age}"]`);
              if (chk) {
                chk.checked = true;
                this.handleChipChange(chk);
              }
            });
          } else if (part.includes("Interests:")) {
            const interests = part.replace("Interests:", "").split(",").map(s => s.trim());
            interests.forEach(interest => {
              const chk = document.querySelector(`input[name="camp-interest"][value="${interest}"]`);
              if (chk) {
                chk.checked = true;
                this.handleChipChange(chk);
              }
            });
          }
        });
      } else {
        // Fallback parsing for legacy free-text values
        const lowerAud = audStr.toLowerCase();
        
        if (lowerAud.includes("18-24")) {
          const chk = document.querySelector('input[name="camp-age-group"][value="18-24"]');
          if (chk) { chk.checked = true; this.handleChipChange(chk); }
        }
        if (lowerAud.includes("25-34")) {
          const chk = document.querySelector('input[name="camp-age-group"][value="25-34"]');
          if (chk) { chk.checked = true; this.handleChipChange(chk); }
        }
        if (lowerAud.includes("35-44")) {
          const chk = document.querySelector('input[name="camp-age-group"][value="35-44"]');
          if (chk) { chk.checked = true; this.handleChipChange(chk); }
        }
        if (lowerAud.includes("under 18") || lowerAud.includes("under-18")) {
          const chk = document.querySelector('input[name="camp-age-group"][value="under-18"]');
          if (chk) { chk.checked = true; this.handleChipChange(chk); }
        }
        if (lowerAud.includes("45+")) {
          const chk = document.querySelector('input[name="camp-age-group"][value="45+"]');
          if (chk) { chk.checked = true; this.handleChipChange(chk); }
        }

        const availableInterests = ["Food", "Tech", "Lifestyle", "Fashion", "Beauty", "Gaming", "Travel", "Fitness"];
        availableInterests.forEach(interest => {
          if (lowerAud.includes(interest.toLowerCase())) {
            const chk = document.querySelector(`input[name="camp-interest"][value="${interest}"]`);
            if (chk) { chk.checked = true; this.handleChipChange(chk); }
          }
        });
      }

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
