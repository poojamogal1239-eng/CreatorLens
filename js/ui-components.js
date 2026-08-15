// Reusable High-Fidelity SVG Charts & Components for CreatorLens

window.UI = {
  // 1. Dynamic SVG Radar Chart Generator
  renderRadarChart: function(containerId, scores) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Clear container
    container.innerHTML = "";
    
    const size = 300;
    const cx = size / 2;
    const cy = size / 2;
    const rMax = 100;
    
    const axes = [
      { key: "audience_trust", label: "Audience Trust" },
      { key: "engagement_rate", label: "Engagement" },
      { key: "regional_influence", label: "Regional" },
      { key: "content_consistency", label: "Consistency" },
      { key: "brand_readiness", label: "Readiness" }
    ];
    
    const numAxes = axes.length;
    const angleStep = (2 * Math.PI) / numAxes;
    
    // Create SVG element
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
    svg.style.overflow = "visible";
    
    // Draw concentric background grid pentagons (20%, 40%, 60%, 80%, 100%)
    const levels = [0.2, 0.4, 0.6, 0.8, 1.0];
    levels.forEach(level => {
      const points = [];
      for (let i = 0; i < numAxes; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const x = cx + rMax * level * Math.cos(angle);
        const y = cy + rMax * level * Math.sin(angle);
        points.push(`${x},${y}`);
      }
      const pentagon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      pentagon.setAttribute("points", points.join(" "));
      pentagon.setAttribute("class", "radar-grid");
      pentagon.setAttribute("fill", "none");
      pentagon.setAttribute("stroke", "rgba(255,255,255,0.06)");
      svg.appendChild(pentagon);
    });
    
    // Draw axis lines and text labels
    const labelOffset = 22;
    axes.forEach((axis, i) => {
      const angle = i * angleStep - Math.PI / 2;
      
      // Axis Line
      const xEnd = cx + rMax * Math.cos(angle);
      const yEnd = cy + rMax * Math.sin(angle);
      
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", cx);
      line.setAttribute("y1", cy);
      line.setAttribute("x2", xEnd);
      line.setAttribute("y2", yEnd);
      line.setAttribute("class", "radar-axis");
      line.setAttribute("stroke", "rgba(255,255,255,0.15)");
      svg.appendChild(line);
      
      // Label text
      const xText = cx + (rMax + labelOffset) * Math.cos(angle);
      const yText = cy + (rMax + labelOffset) * Math.sin(angle) + 4; // Adjust vertical alignment
      
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", xText);
      text.setAttribute("y", yText);
      text.setAttribute("class", "radar-label");
      text.setAttribute("fill", "#9CA3AF");
      text.setAttribute("font-size", "11px");
      text.setAttribute("text-anchor", "middle");
      text.textContent = axis.label;
      svg.appendChild(text);
    });
    
    // Calculate and draw value polygon
    const valPoints = [];
    axes.forEach((axis, i) => {
      const angle = i * angleStep - Math.PI / 2;
      let score = scores[axis.key];
      if (score === undefined) {
        if (axis.key === "engagement_rate") {
          score = scores.engagement_rate_score;
        }
      }
      if (score === undefined || score === null) {
        score = -1;
      }
      
      const isInsufficient = score < 0;
      const displayScore = isInsufficient ? 0 : score;
      const r = rMax * (displayScore / 100);
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      valPoints.push(`${x},${y}`);
    });
    
    // Glow/fill polygon
    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    polygon.setAttribute("points", valPoints.join(" "));
    polygon.setAttribute("class", "radar-polygon");
    polygon.setAttribute("fill", "rgba(0, 242, 166, 0.18)");
    polygon.setAttribute("stroke", "#00F2A6");
    polygon.setAttribute("stroke-width", "2.5px");
    polygon.setAttribute("style", "filter: drop-shadow(0 0 6px rgba(0, 242, 166, 0.4));");
    svg.appendChild(polygon);
    
    // Draw dots and value labels
    axes.forEach((axis, i) => {
      const angle = i * angleStep - Math.PI / 2;
      let score = scores[axis.key];
      if (score === undefined) {
        if (axis.key === "engagement_rate") {
          score = scores.engagement_rate_score;
        }
      }
      if (score === undefined || score === null) {
        score = -1;
      }
      
      const isInsufficient = score < 0;
      const displayScore = isInsufficient ? 0 : score;
      const r = rMax * (displayScore / 100);
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      
      // Circle Dot
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", x);
      circle.setAttribute("cy", y);
      circle.setAttribute("r", "4");
      circle.setAttribute("class", "radar-dot");
      circle.setAttribute("fill", isInsufficient ? "#ff6b6b" : "#00D4FF");
      circle.setAttribute("stroke", "#fff");
      circle.setAttribute("stroke-width", "1.5");
      svg.appendChild(circle);
      
      // Score tooltip-like text
      const xValText = cx + (r - 12) * Math.cos(angle);
      const yValText = cy + (r - 12) * Math.sin(angle) + 3;
      const valText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      valText.setAttribute("x", xValText);
      valText.setAttribute("y", yValText);
      valText.setAttribute("fill", isInsufficient ? "#ff6b6b" : "#fff");
      valText.setAttribute("font-size", "10px");
      valText.setAttribute("font-weight", "600");
      valText.setAttribute("text-anchor", "middle");
      valText.textContent = isInsufficient ? "N/A" : score;
      svg.appendChild(valText);
    });
    
    container.appendChild(svg);
  },
  
  // 2. High-Fidelity SVG Match Score Donut Progress Generator
  renderDonutChart: function(containerId, percentage) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Clear container
    container.innerHTML = "";
    
    const size = 120;
    const cx = size / 2;
    const cy = size / 2;
    const r = 45;
    const strokeWidth = 8;
    const circumference = 2 * Math.PI * r;
    const strokeOffset = circumference - (percentage / 100) * circumference;
    
    // Create SVG element
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
    
    // Background underlay circle
    const underlay = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    underlay.setAttribute("cx", cx);
    underlay.setAttribute("cy", cy);
    underlay.setAttribute("r", r);
    underlay.setAttribute("class", "donut-underlay");
    underlay.setAttribute("fill", "none");
    underlay.setAttribute("stroke", "rgba(255, 255, 255, 0.05)");
    underlay.setAttribute("stroke-width", strokeWidth);
    svg.appendChild(underlay);
    
    // Progress fill circle
    const fill = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    fill.setAttribute("cx", cx);
    fill.setAttribute("cy", cy);
    fill.setAttribute("r", r);
    fill.setAttribute("class", "donut-fill");
    fill.setAttribute("fill", "none");
    fill.setAttribute("stroke", percentage >= 85 ? "#00F2A6" : percentage >= 70 ? "#00D4FF" : "#4F46E5");
    fill.setAttribute("stroke-width", strokeWidth);
    fill.setAttribute("transform", `rotate(-90 ${cx} ${cy})`);
    fill.setAttribute("stroke-linecap", "round");
    
    // Animate fill-in
    svg.appendChild(fill);
    
    // Draw text values in center
    const textGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    textGroup.setAttribute("text-anchor", "middle");
    
    const pctText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    pctText.setAttribute("x", cx);
    pctText.setAttribute("y", cy + 6);
    pctText.setAttribute("fill", "#fff");
    pctText.setAttribute("font-family", "Poppins");
    pctText.setAttribute("font-size", "22px");
    pctText.setAttribute("font-weight", "700");
    pctText.textContent = `${percentage}%`;
    textGroup.appendChild(pctText);
    
    svg.appendChild(textGroup);
    container.appendChild(svg);
    
    // Trigger transition animation
    setTimeout(() => {
      fill.style.strokeDashoffset = strokeOffset;
    }, 50);
  },

  // 3. Dynamic Interactive Pricing Slider UI Generator
  renderPricingSlider: function(containerId, pricingDetails, selectedPriceValue, onPriceChanged) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const minVal = pricingDetails.min_price || 10000;
    const premiumVal = pricingDetails.premium_price || 30000;
    const recVal = pricingDetails.recommended_price || 20000;
    
    if (!selectedPriceValue) {
      selectedPriceValue = recVal;
    }
    
    container.innerHTML = `
      <div class="price-range-display">
        <div>
          <div class="input-label">RECOMMENDED COLLABORATION COST</div>
          <div class="price-range-val">₹${selectedPriceValue.toLocaleString('en-IN')}</div>
        </div>
        <div style="text-align: right;">
          <div class="input-label" style="display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #00F2A6;"></span>
            CONFIDENCE
          </div>
          <div style="font-weight: 600; color: #00F2A6; font-size: 14px;">High</div>
        </div>
      </div>
      
      <div class="slider-track-container" id="slider-track-box">
        <div class="slider-track"></div>
        <div class="slider-fill" id="pricing-slider-fill"></div>
        <div class="slider-handle" id="pricing-slider-handle"></div>
      </div>
      
      <div class="slider-ticks">
        <div>MIN LIMIT<br><strong style="color: #94A3B8;">₹${(minVal/1000).toFixed(0)}K</strong></div>
        <div style="text-align: center; color: #00F2A6;">RECOMMENDED<br><strong>₹${(recVal/1000).toFixed(0)}K</strong></div>
        <div style="text-align: right;">PREMIUM LIMIT<br><strong style="color: #94A3B8;">₹${(premiumVal/1000).toFixed(0)}K</strong></div>
      </div>

      <!-- Bloomberg-Terminal Sourcing ROI Analytics -->
      <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--color-border); padding-top: 14px; margin-top: 16px; gap: 10px;">
        <div>
          <span class="input-label" style="font-size: 8px; margin-bottom: 0;">EST. IMPRESSIONS</span>
          <div class="roi-views" style="font-size: 12px; font-weight: 700; color: #fff; margin-top: 2px;">--</div>
        </div>
        <div style="text-align: center;">
          <span class="input-label" style="font-size: 8px; margin-bottom: 0;">EST. ACTIONS (ROI)</span>
          <div class="roi-ratio" style="font-size: 12px; font-weight: 700; color: var(--color-primary-cyan); margin-top: 2px;">--</div>
        </div>
        <div style="text-align: right;">
          <span class="input-label" style="font-size: 8px; margin-bottom: 0;">EST. COST PER VIEW</span>
          <div class="roi-cpv" style="font-size: 12px; font-weight: 700; color: var(--color-primary-green); margin-top: 2px;">--</div>
        </div>
      </div>
    `;
    
    const trackBox = container.querySelector("#slider-track-box");
    const fill = container.querySelector("#pricing-slider-fill");
    const handle = container.querySelector("#pricing-slider-handle");
    
    // Position helper function
    function updatePositions(price) {
      const pct = Math.max(0, Math.min(100, ((price - minVal) / (premiumVal - minVal)) * 100));
      fill.style.width = `${pct}%`;
      handle.style.left = `${pct}%`;
      
      // Calculate Bloomberg stats live
      const estViews = Math.round(price * 4.2);
      const estActions = Math.round(estViews * 0.078);
      const cpv = (price / estViews).toFixed(2);
      
      const vEl = container.querySelector(".roi-views");
      const aEl = container.querySelector(".roi-ratio");
      const cEl = container.querySelector(".roi-cpv");
      
      if (vEl) vEl.textContent = estViews.toLocaleString('en-IN');
      if (aEl) aEl.textContent = estActions.toLocaleString('en-IN');
      if (cEl) cEl.textContent = "₹" + cpv;
    }
    
    updatePositions(selectedPriceValue);
    
    // Drag logic
    let isDragging = false;
    
    function calculatePriceFromX(clientX) {
      const rect = trackBox.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const pct = x / rect.width;
      const calculatedVal = minVal + pct * (premiumVal - minVal);
      // Round to nearest 500
      return Math.round(calculatedVal / 500) * 500;
    }
    
    function onMove(e) {
      if (!isDragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const newPrice = calculatePriceFromX(clientX);
      updatePositions(newPrice);
      const valDisplay = container.querySelector(".price-range-val");
      valDisplay.textContent = `₹${newPrice.toLocaleString('en-IN')}`;
      if (onPriceChanged) {
        onPriceChanged(newPrice);
      }
    }
    
    function onEnd() {
      isDragging = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onEnd);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
    }
    
    handle.addEventListener("mousedown", (e) => {
      isDragging = true;
      e.preventDefault();
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onEnd);
    });
    
    handle.addEventListener("touchstart", (e) => {
      isDragging = true;
      document.addEventListener("touchmove", onMove, { passive: true });
      document.addEventListener("touchend", onEnd);
    });
    
    // Click track to jump
    trackBox.addEventListener("click", (e) => {
      if (e.target === handle) return;
      const newPrice = calculatePriceFromX(e.clientX);
      updatePositions(newPrice);
      const valDisplay = container.querySelector(".price-range-val");
      valDisplay.textContent = `₹${newPrice.toLocaleString('en-IN')}`;
      if (onPriceChanged) {
        onPriceChanged(newPrice);
      }
    });
  }
};
