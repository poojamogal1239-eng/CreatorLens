const supabase = require('./config/supabase');

const users = [
  { id: "11111111-1111-1111-1111-111111111111", email: "anjali@creator.com", role: "creator" },
  { id: "22222222-2222-2222-2222-222222222222", email: "rahul@creator.com", role: "creator" },
  { id: "33333333-3333-3333-3333-333333333333", email: "priya@creator.com", role: "creator" },
  { id: "44444444-4444-4444-4444-444444444444", email: "sneha@creator.com", role: "creator" },
  { id: "55555555-5555-5555-5555-555555555555", email: "brand@swadspices.com", role: "brand" },
  { id: "66666666-6666-6666-6666-666666666666", email: "admin@creatorlens.com", role: "admin" }
];

const creators = [
  {
    id: "11111111-1111-1111-1111-111111111111",
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
    profile_status: "Ready",
    ai_status: "Not Started",
    city: "Indore",
    state: "Madhya Pradesh",
    social_links: {
      instagram: { handle: "@anjali_eats", followers: 68000, average_views: 12400, engagement_rate: 7.82 }
    },
    audience_metadata: {
      location: "India / Madhya Pradesh",
      age_range: "18-24",
      posting_frequency: "2-3 times a week",
      formats: ["Reels", "Posts"]
    },
    collab_metadata: {
      target_brands: ["Food", "Spices", "Kitchen"],
      previous_experience: true,
      contact_email: "anjali@creator.com",
      previous_campaigns: "Tata Tea Indore Walk",
      portfolio_url: "https://anjalieats.com"
    }
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
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
    profile_status: "Ready",
    ai_status: "Not Started",
    city: "Indore",
    state: "Madhya Pradesh",
    social_links: {
      instagram: { handle: "@rahul_tech", followers: 142000, average_views: 28000, engagement_rate: 5.45 }
    },
    audience_metadata: {
      location: "India / Central India",
      age_range: "18-24",
      posting_frequency: "Daily",
      formats: ["Videos", "Reels"]
    },
    collab_metadata: {
      target_brands: ["Gadgets", "Mobile", "Laptops"],
      previous_experience: true,
      contact_email: "rahul@creator.com",
      previous_campaigns: "Nothing Phone Indore Launch",
      portfolio_url: "https://rahultech.com"
    }
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
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
    profile_status: "Ready",
    ai_status: "Not Started",
    city: "Pune",
    state: "Maharashtra",
    social_links: {
      instagram: { handle: "@priya_cooks", followers: 94000, average_views: 18200, engagement_rate: 8.12 }
    },
    audience_metadata: {
      location: "India / Maharashtra",
      age_range: "25-34",
      posting_frequency: "Weekly",
      formats: ["Videos", "Posts"]
    },
    collab_metadata: {
      target_brands: ["Dairy", "Groceries", "Snacks"],
      previous_experience: false,
      contact_email: "priya@creator.com"
    }
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
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
    profile_status: "Ready",
    ai_status: "Not Started",
    city: "Hyderabad",
    state: "Telangana",
    social_links: {
      instagram: { handle: "@sneha_styles", followers: 210000, average_views: 45000, engagement_rate: 6.22 }
    },
    audience_metadata: {
      location: "India / South India",
      age_range: "18-24",
      posting_frequency: "2-3 times a week",
      formats: ["Reels", "Stories"]
    },
    collab_metadata: {
      target_brands: ["Textiles", "Sarees", "Cosmetics"],
      previous_experience: true,
      contact_email: "sneha@creator.com",
      previous_campaigns: "Kora Sarees Hyderabad Launch",
      portfolio_url: "https://snehastyles.com"
    }
  }
];

const brands = [
  {
    id: "55555555-5555-5555-5555-555555555555",
    company_name: "Swad Spices Private Limited",
    website: "www.swadspices.com",
    industry: "FMCG / Food Products",
    bio: "Bringing authentic traditional flavors to modern households across Central India."
  }
];

const campaigns = [
  {
    id: "99999999-9999-9999-9999-999999999999",
    brand_id: "55555555-5555-5555-5555-555555555555",
    title: "Masala Chai Rollout Pune",
    objective: "Promoting our new premium tea blend to young foodies and families in Pune. We need authentic culinary creators speaking local language.",
    category: "food",
    target_audience: "Age 18-35, tea lovers, regional focus",
    region: "Pune",
    language: "Marathi",
    budget: 50000,
    creator_type: "micro",
    status: "active",
    ai_status: "Pending"
  },
  {
    id: "88888888-8888-8888-8888-888888888888",
    brand_id: "55555555-5555-5555-5555-555555555555",
    title: "Swad Spices Creator Campaign",
    objective: "Promoting traditional Bundeli masala spices to regional households in Madhya Pradesh. Focus on authentic food preparation and recipe storytelling.",
    category: "food",
    target_audience: "Regional families, cooking enthusiasts, Indore residents",
    region: "Indore",
    language: "Hindi",
    budget: 45000,
    creator_type: "micro",
    status: "active",
    ai_status: "Pending"
  }
];

const creatorScores = [
  {
    creator_id: "11111111-1111-1111-1111-111111111111",
    intelligence_score: 89,
    audience_trust: 92,
    engagement_rate_score: 88,
    regional_influence: 95,
    content_consistency: 82,
    brand_readiness: 85,
    ai_explanation: "Anjali Verma holds a very high regional influence index (95) driven by dialect alignment (Bundeli/Hindi) and strong local foodie comment engagement."
  },
  {
    creator_id: "22222222-2222-2222-2222-222222222222",
    intelligence_score: 84,
    audience_trust: 85,
    engagement_rate_score: 80,
    regional_influence: 88,
    content_consistency: 90,
    brand_readiness: 82,
    ai_explanation: "Rahul Kapoor has a high content consistency score (90) matching consistent unboxing reels and video schedules."
  },
  {
    creator_id: "33333333-3333-3333-3333-333333333333",
    intelligence_score: 87,
    audience_trust: 89,
    engagement_rate_score: 91,
    regional_influence: 92,
    content_consistency: 80,
    brand_readiness: 84,
    ai_explanation: "Priya Sharma triggers strong regional alignment in Maharashtra (92) with fluent Marathi engagement."
  },
  {
    creator_id: "44444444-4444-4444-4444-444444444444",
    intelligence_score: 82,
    audience_trust: 80,
    engagement_rate_score: 84,
    regional_influence: 85,
    content_consistency: 88,
    brand_readiness: 80,
    ai_explanation: "Sneha Reddy drives high regional conversions (85) for traditional retail saree layouts in Hyderabad."
  }
];

const creatorAiAnalysis = [
  {
    creator_id: "11111111-1111-1111-1111-111111111111",
    profile_summary: "Anjali Verma is a prominent regional foodie influencer based out of Madhya Pradesh. She has built a highly dedicated audience through consistent coverage of local street foods and traditional Bundeli recipes. Her content triggers strong regional affinity and drives high local conversion ratios.",
    profile_completeness: 85,
    strengths: ["Bundeli cultural connection", "Authentic recipe guides", "Active regional comment section"],
    weaknesses: ["Short-form content consistency", "Low YouTube integration"],
    missing_information: ["Audience city breakdown percentage", "Detailed demographics charts"]
  },
  {
    creator_id: "22222222-2222-2222-2222-222222222222",
    profile_summary: "Rahul is a tech unboxer focused on Tier-2 smartphone buyers. By explaining technical specifications in everyday Hindi, he is a trusted consumer guide across Central and Western India.",
    profile_completeness: 92,
    strengths: ["Clear product explanations", "High video watch-time rates", "Strong trust ratings on reviews"],
    weaknesses: ["Instagram engagement is lower than YouTube", "Limited brand collaboration disclosures"],
    missing_information: ["Past brand project outcomes", "Detailed budget tiers"]
  },
  {
    creator_id: "33333333-3333-3333-3333-333333333333",
    profile_summary: "Priya is the go-to Pune culinary reviewer. Writing and speaking in fluent Marathi, her reviews have deep cultural resonance and trigger high purchase intent for local eateries.",
    profile_completeness: 90,
    strengths: ["Fluent local language content", "Excellent photography assets", "High response rates in comments"],
    weaknesses: ["Short-form content only", "High reliance on organic video reach"],
    missing_information: ["Detailed engagement demographics", "Estimated conversion margins"]
  },
  {
    creator_id: "44444444-4444-4444-4444-444444444444",
    profile_summary: "Sneha is a major regional fashion influencer focusing on ethnic wear and local handlooms in Telangana and Andhra. Her recommendations directly impact regional retail store footfalls.",
    profile_completeness: 78,
    strengths: ["High-production lookbooks", "Saree handloom brand advocacy", "Strong female audience share (85%)"],
    weaknesses: ["High pricing index", "Limited engagement with comments"],
    missing_information: ["Male-female detailed metrics", "Audience age charts"]
  }
];

async function cleanAndSeed() {
  console.log("=== STARTING DATABASE CLEAN AND SEED ===");

  const tables = [
    { name: 'notifications', key: 'id' },
    { name: 'collaborations', key: 'id' },
    { name: 'campaign_matches', key: 'id' },
    { name: 'creator_ai_suggestions', key: 'id' },
    { name: 'creator_scores', key: 'creator_id' },
    { name: 'creator_ai_analysis', key: 'creator_id' },
    { name: 'workflow_logs', key: 'id' },
    { name: 'ai_jobs', key: 'id' },
    { name: 'campaigns', key: 'id' },
    { name: 'creators', key: 'id' },
    { name: 'brands', key: 'id' },
    { name: 'users', key: 'id' }
  ];

  // 1. Clean all tables
  for (const table of tables) {
    console.log(`Clearing table: ${table.name}...`);
    const { error } = await supabase
      .from(table.name)
      .delete()
      .neq(table.key, '00000000-0000-0000-0000-000000000000'); // Delete all

    if (error) {
      console.error(`Error clearing ${table.name}:`, error.message);
    }
  }

  console.log("\nDatabase successfully cleaned.\n");

  // 2. Insert Users into Supabase Auth & public.users table
  console.log("Inserting users into Auth and DB...");
  const { data: listData } = await supabase.auth.admin.listUsers();
  const existingUsers = listData && listData.users ? listData.users : [];
  
  for (const u of users) {
    const existing = existingUsers.find(usr => usr.email.toLowerCase() === u.email.toLowerCase());
    if (existing) {
      console.log(`User ${u.email} exists in auth. Deleting...`);
      await supabase.auth.admin.deleteUser(existing.id);
    }
    
    console.log(`Creating auth user: ${u.email}...`);
    const { error: authErr } = await supabase.auth.admin.createUser({
      id: u.id,
      email: u.email,
      password: "password123",
      email_confirm: true
    });
    
    if (authErr) {
      console.error(`Failed to create auth user ${u.email}:`, authErr.message);
    }
  }

  const { error: userErr } = await supabase.from('users').insert(users);
  if (userErr) {
    console.error("Error inserting users into DB:", userErr.message);
    return;
  }

  // 3. Insert Creators
  console.log("Inserting creators...");
  const { error: creatorErr } = await supabase.from('creators').insert(creators);
  if (creatorErr) {
    console.error("Error inserting creators:", creatorErr.message);
    return;
  }

  // 3b. Insert Creator Scores
  console.log("Inserting creator scores...");
  const { error: scoresErr } = await supabase.from('creator_scores').insert(creatorScores);
  if (scoresErr) {
    console.error("Error inserting creator scores:", scoresErr.message);
    return;
  }

  // 3c. Insert Creator AI Analysis
  console.log("Inserting creator AI analysis...");
  const { error: analysisErr } = await supabase.from('creator_ai_analysis').insert(creatorAiAnalysis);
  if (analysisErr) {
    console.error("Error inserting creator AI analysis:", analysisErr.message);
    return;
  }

  // 4. Insert Brands
  console.log("Inserting brands...");
  const { error: brandErr } = await supabase.from('brands').insert(brands);
  if (brandErr) {
    console.error("Error inserting brands:", brandErr.message);
    return;
  }

  // 5. Insert Campaigns
  console.log("Inserting campaigns...");
  const { error: campaignErr } = await supabase.from('campaigns').insert(campaigns);
  if (campaignErr) {
    console.error("Error inserting campaigns:", campaignErr.message);
    return;
  }

  console.log("\n=== DATABASE CLEAN AND SEED COMPLETED SUCCESSFULLY ===");
}

cleanAndSeed();
