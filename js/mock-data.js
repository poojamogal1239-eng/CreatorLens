// Rich Mock Database for CreatorLens Platform (Demo Mode)

window.mockData = {
  // Mock Creators Database
  creators: [
    {
      id: "creator-anjali-verma",
      full_name: "Anjali Verma",
      avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
      bio: "Discovering Indore's food culture and traditional Bundelkhand recipes. Sharing authentic regional flavors.",
      categories: ["food", "lifestyle"],
      languages: ["Hindi", "Bundeli", "English"],
      regions: ["Indore", "Madhya Pradesh"],
      followers_count: 68000,
      engagement_rate: 7.82,
      average_views: 12400,
      pricing_min: 15000,
      pricing_premium: 25000,
      profile_summary: "Anjali Verma is a prominent regional foodie influencer based out of Madhya Pradesh. She has built a highly dedicated audience through consistent coverage of local street foods and traditional Bundeli recipes. Her content triggers strong regional affinity and drives high local conversion ratios.",
      strengths: ["Bundeli cultural connection", "Authentic recipe guides", "Active regional comment section"],
      weaknesses: ["Short-form content consistency", "Low YouTube integration"],
      missing_info: ["Audience city breakdown percentage", "Detailed demographics charts"],
      profile_completeness: 85,
      is_enriched: true
    },
    {
      id: "creator-rahul-kapoor",
      full_name: "Rahul Kapoor",
      avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
      bio: "Unboxing the latest tech in simple Hindi. Making gadgets easy to understand for everyone.",
      categories: ["tech", "gaming"],
      languages: ["Hindi", "English"],
      regions: ["Indore", "Pune"],
      followers_count: 142000,
      engagement_rate: 5.45,
      average_views: 28000,
      pricing_min: 25000,
      pricing_premium: 45000,
      profile_summary: "Rahul is a tech unboxer focused on Tier-2 smartphone buyers. By explaining technical specifications in everyday Hindi, he is a trusted consumer guide across Central and Western India.",
      strengths: ["Clear product explanations", "High video watch-time rates", "Strong trust ratings on reviews"],
      weaknesses: ["Instagram engagement is lower than YouTube", "Limited brand collaboration disclosures"],
      missing_info: ["Past brand project outcomes", "Detailed budget tiers"],
      profile_completeness: 92,
      is_enriched: true
    },
    {
      id: "creator-priya-sharma",
      full_name: "Priya Sharma",
      avatar_url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
      bio: "Assal Marathi recipes and Pune food walk updates. Serving traditional food with a modern twist.",
      categories: ["food", "lifestyle"],
      languages: ["Marathi", "Hindi"],
      regions: ["Pune", "Maharashtra"],
      followers_count: 94000,
      engagement_rate: 8.12,
      average_views: 18200,
      pricing_min: 18000,
      pricing_premium: 32000,
      profile_summary: "Priya is the go-to Pune culinary reviewer. Writing and speaking in fluent Marathi, her reviews have deep cultural resonance and trigger high purchase intent for local eateries.",
      strengths: ["Fluent local language content", "Excellent photography assets", "High response rates in comments"],
      weaknesses: ["Short-form content only", "High reliance on organic video reach"],
      missing_info: ["Detailed engagement demographics", "Estimated conversion margins"],
      profile_completeness: 90,
      is_enriched: true
    },
    {
      id: "creator-sneha-reddy",
      full_name: "Sneha Reddy",
      avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      bio: "Saree styling guides and ethnic lookbooks in Telugu. Directing Telugu fashion trends.",
      categories: ["fashion", "beauty"],
      languages: ["Telugu", "Kannada", "English"],
      regions: ["Hyderabad", "Andhra Pradesh"],
      followers_count: 210000,
      engagement_rate: 6.22,
      average_views: 45000,
      pricing_min: 30000,
      pricing_premium: 60000,
      profile_summary: "Sneha is a major regional fashion influencer focusing on ethnic wear and local handlooms in Telangana and Andhra. Her recommendations directly impact regional retail store footfalls.",
      strengths: ["High-production lookbooks", "Saree handloom brand advocacy", "Strong female audience share (85%)"],
      weaknesses: ["High pricing index", "Limited engagement with comments"],
      missing_info: ["Male-female detailed metrics", "Audience age charts"],
      profile_completeness: 78,
      is_enriched: true
    }
  ],

  // Creator Scores Table
  creatorScores: {
    "creator-anjali-verma": {
      intelligence_score: 89,
      audience_trust: 92,
      engagement_rate: 88,
      regional_influence: 95,
      content_consistency: 82,
      brand_readiness: 85,
      ai_explanation: "Anjali exhibits outstanding regional influence (95) and high audience trust (92) due to active responses in Bundeli comments. Posting consistency (82) is strong but has space to grow through regular Reels schedules."
    },
    "creator-rahul-kapoor": {
      intelligence_score: 84,
      audience_trust: 88,
      engagement_rate: 80,
      regional_influence: 75,
      content_consistency: 95,
      brand_readiness: 90,
      ai_explanation: "Rahul shows superb posting consistency (95) and high brand readiness (90) due to clear product disclosures. Regional influence (75) is moderate as unboxing is broad, but audience trust is high (88)."
    },
    "creator-priya-sharma": {
      intelligence_score: 91,
      audience_trust: 95,
      engagement_rate: 93,
      regional_influence: 92,
      content_consistency: 80,
      brand_readiness: 85,
      ai_explanation: "Priya enjoys a stellar intelligence score (91), driven by Pune-based audience trust (95) and high engagement (93). Expanding her content schedule could increase consistency metrics."
    },
    "creator-sneha-reddy": {
      intelligence_score: 79,
      audience_trust: 76,
      engagement_rate: 82,
      regional_influence: 85,
      content_consistency: 78,
      brand_readiness: 80,
      ai_explanation: "Sneha displays good regional influence (85) in Hyderabad and solid engagement (82). Audience trust (76) and consistency (78) represent channels for optimization."
    }
  },

  // Creator AI Suggestions Table
  creatorSuggestions: {
    "creator-anjali-verma": [
      {
        id: "sug-av-1",
        suggestion_text: "Add audience demographic reports to your details to improve discovery index by brands.",
        impact_level: "high",
        expected_improvement: 8
      },
      {
        id: "sug-av-2",
        suggestion_text: "Integrate more Bundelkhand cultural references in video descriptions to deepen regional affinity.",
        impact_level: "medium",
        expected_improvement: 5
      },
      {
        id: "sug-av-3",
        suggestion_text: "Update pricing categories to reflect current engagement increases and average view metrics.",
        impact_level: "low",
        expected_improvement: 2
      }
    ],
    "creator-rahul-kapoor": [
      {
        id: "sug-rk-1",
        suggestion_text: "Share video metrics reports directly from YouTube Creator panel to gain Verified Badge.",
        impact_level: "high",
        expected_improvement: 10
      },
      {
        id: "sug-rk-2",
        suggestion_text: "Create a short video portfolio containing key brand outcomes to attract high-budget sponsors.",
        impact_level: "medium",
        expected_improvement: 6
      }
    ],
    "creator-priya-sharma": [
      {
        id: "sug-ps-1",
        suggestion_text: "Increase upload frequency of Pune food walk summaries to build content consistency scores.",
        impact_level: "high",
        expected_improvement: 7
      },
      {
        id: "sug-ps-2",
        suggestion_text: "Link YouTube channel to allow unified viewer metrics mapping.",
        impact_level: "medium",
        expected_improvement: 4
      }
    ],
    "creator-sneha-reddy": [
      {
        id: "sug-sr-1",
        suggestion_text: "Provide specific male/female viewer metrics to justify high premium pricing indices.",
        impact_level: "high",
        expected_improvement: 12
      },
      {
        id: "sug-sr-2",
        suggestion_text: "Engage with comment queries regarding outfit links to raise audience trust index.",
        impact_level: "medium",
        expected_improvement: 8
      }
    ]
  },

  // Mock Campaigns Database
  campaigns: [
    {
      id: "camp-fmcg-pune",
      brand_id: "brand-1",
      title: "Masala Chai Rollout Pune",
      objective: "Promoting our new premium tea blend to young foodies and families in Pune. We need authentic culinary creators speaking local language.",
      category: "food",
      target_audience: "Age 18-35, tea lovers, regional focus",
      region: "Pune",
      language: "Marathi",
      budget: 50000,
      creator_type: "micro",
      status: "active",
      ai_keywords: ["tea", "masala chai", "pune foodies", "traditional marathi culinary"],
      ai_tier: "Micro-Influencer (50K - 100K)",
      created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
    },
    {
      id: "camp-tech-indore",
      brand_id: "brand-1",
      title: "App Launch Campaign Indore",
      objective: "Launching our grocery delivery app in Indore. Seeking local lifestyle and tech reviewers to highlight express 10-minute delivery services.",
      category: "lifestyle",
      target_audience: "Indore homemakers and students, digital buyers",
      region: "Indore",
      language: "Hindi",
      budget: 80000,
      creator_type: "micro",
      status: "active",
      ai_keywords: ["delivery app", "grocery", "indore local vlogs", "express delivery"],
      ai_tier: "Micro-influencer",
      created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
    }
  ],

  // Mock Brands Database
  brands: {
    "brand-1": {
      id: "brand-1",
      company_name: "Swad Spices Private Limited",
      website: "www.swadspices.com",
      industry: "FMCG / Food Products",
      bio: "Bringing authentic traditional flavors to modern households across Central India.",
      logo_url: "https://images.unsplash.com/photo-1516876437184-593fda40c7ce?w=100"
    }
  },

  // Simulated Pricing Algorithm Matrix (Category multipliers)
  pricingMatrix: {
    food: { base: 12000, multiplier: 1.1 },
    tech: { base: 15000, multiplier: 1.25 },
    lifestyle: { base: 10000, multiplier: 1.0 },
    fashion: { base: 14000, multiplier: 1.2 },
    beauty: { base: 13000, multiplier: 1.15 }
  }
};
