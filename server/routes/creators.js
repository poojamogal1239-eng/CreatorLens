const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// GET /api/creators/profile/:id
router.get('/profile/:id', async (req, res, next) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('creators')
      .select('*, creator_ai_analysis(*)')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Profile Not Found', message: error.message });
    }

    if (data.creator_ai_analysis) {
      const { id: analysisId, created_at: analysisCreatedAt, updated_at: analysisUpdatedAt, ...analysisFields } = data.creator_ai_analysis;
      Object.assign(data, analysisFields);
      delete data.creator_ai_analysis;
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
});

// POST /api/creators/profile
router.post('/profile', async (req, res, next) => {
  const { 
    id, 
    full_name, 
    avatar_url,
    bio, 
    categories, 
    languages, 
    regions, 
    pricing_min, 
    pricing_premium, 
    followers_count, 
    average_views, 
    engagement_rate,
    city,
    state,
    social_links,
    audience_metadata,
    collab_metadata
  } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: 'Bad Request', message: 'Creator ID is required to save profile.' });
  }

  try {
    // 1. Fetch existing profile to merge and avoid wiping other fields
    const { data: existingProfile, error: fetchError } = await supabase
      .from('creators')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      return res.status(500).json({ error: 'Database Fetch Error', message: fetchError.message });
    }

    const currentProfile = existingProfile || {};

    // 2. Merge incoming payload fields
    const merged = {
      full_name: full_name !== undefined ? full_name : currentProfile.full_name,
      avatar_url: avatar_url !== undefined ? avatar_url : currentProfile.avatar_url,
      bio: bio !== undefined ? bio : currentProfile.bio,
      categories: categories !== undefined ? categories : (currentProfile.categories || []),
      languages: languages !== undefined ? languages : (currentProfile.languages || []),
      regions: regions !== undefined ? regions : (currentProfile.regions || []),
      pricing_min: pricing_min !== undefined ? pricing_min : (currentProfile.pricing_min || 0),
      pricing_premium: pricing_premium !== undefined ? pricing_premium : (currentProfile.pricing_premium || 0),
      followers_count: followers_count !== undefined ? followers_count : (currentProfile.followers_count || 0),
      average_views: average_views !== undefined ? average_views : (currentProfile.average_views || 0),
      engagement_rate: engagement_rate !== undefined ? engagement_rate : (currentProfile.engagement_rate || 0),
      city: city !== undefined ? city : currentProfile.city,
      state: state !== undefined ? state : currentProfile.state,
      social_links: social_links !== undefined ? social_links : (currentProfile.social_links || {}),
      audience_metadata: audience_metadata !== undefined ? audience_metadata : (currentProfile.audience_metadata || {}),
      collab_metadata: collab_metadata !== undefined ? collab_metadata : (currentProfile.collab_metadata || {})
    };

    // 3. Compute readiness based on merged profile state
    const hasSocialHandle = merged.social_links && (
      (merged.social_links.instagram && merged.social_links.instagram.handle && merged.social_links.instagram.handle.trim()) ||
      (merged.social_links.youtube && merged.social_links.youtube.handle && merged.social_links.youtube.handle.trim())
    );

    const hasAudience = merged.audience_metadata && 
      merged.audience_metadata.location && merged.audience_metadata.location.trim() &&
      merged.audience_metadata.posting_frequency && merged.audience_metadata.posting_frequency.trim();

    const hasCollab = merged.collab_metadata && 
      merged.collab_metadata.target_brands && merged.collab_metadata.target_brands.length > 0 && 
      merged.collab_metadata.previous_experience !== undefined;

    const isReady = !!(
      merged.full_name && merged.full_name.trim() &&
      merged.avatar_url && merged.avatar_url.trim() &&
      merged.city && merged.city.trim() &&
      merged.state && merged.state.trim() &&
      merged.languages && merged.languages.length > 0 &&
      merged.categories && merged.categories.length > 0 &&
      merged.bio && merged.bio.trim() &&
      hasSocialHandle &&
      hasAudience &&
      hasCollab
    );

    merged.profile_status = isReady ? 'Ready' : 'Incomplete';

    // 4. Perform update
    const { data: updatedProfile, error: updateError } = await supabase
      .from('creators')
      .update(merged)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Database Update Error', message: updateError.message });
    }

    res.json({ success: true, profile: updatedProfile });
  } catch (err) {
    next(err);
  }
});

// GET /api/creators/dashboard/:id
router.get('/dashboard/:id', async (req, res, next) => {
  const { id } = req.params;
  try {
    // Run concurrent queries to collect dashboard segments
    const [profileRes, scoresRes, suggestionsRes, collabsRes] = await Promise.all([
      supabase.from('creators').select('*, creator_ai_analysis(*)').eq('id', id).single(),
      supabase.from('creator_scores').select('*').eq('creator_id', id).single(),
      supabase.from('creator_ai_suggestions').select('*').eq('creator_id', id),
      supabase.from('collaborations').select('*, campaigns(*)').eq('creator_id', id)
    ]);

    // Handle profile query failure (mandatory segment)
    if (profileRes.error) {
      return res.status(404).json({ error: 'Creator Not Found', message: profileRes.error.message });
    }

    // Flat merge creator_ai_analysis properties if present
    if (profileRes.data && profileRes.data.creator_ai_analysis) {
      const { id: analysisId, created_at: analysisCreatedAt, updated_at: analysisUpdatedAt, ...analysisFields } = profileRes.data.creator_ai_analysis;
      Object.assign(profileRes.data, analysisFields);
      delete profileRes.data.creator_ai_analysis;
    }

    let suggestions = suggestionsRes.data || [];
    if (suggestions.length === 0 && profileRes.data) {
      const weaknesses = profileRes.data.weaknesses || [];
      const missing = profileRes.data.missing_information || [];
      
      weaknesses.forEach((w, index) => {
        suggestions.push({
          id: `weakness-${index}`,
          creator_id: id,
          suggestion_text: `Address profile weakness: ${w}`,
          impact_level: 'medium',
          expected_improvement: 5
        });
      });
      
      missing.forEach((m, index) => {
        suggestions.push({
          id: `missing-${index}`,
          creator_id: id,
          suggestion_text: `Add missing details: ${m}`,
          impact_level: 'high',
          expected_improvement: 10
        });
      });
    }

    // Fetch brand profiles to map them manually (due to collaborations -> brands PostgREST join schema limits)
    const { data: brandsData } = await supabase.from('brands').select('*');
    const brandMap = {};
    if (brandsData) {
      brandsData.forEach(b => {
        brandMap[b.id] = b;
      });
    }

    const mappedCollabs = (collabsRes.data || []).map(collab => ({
      ...collab,
      brand: brandMap[collab.brand_id] || null
    }));

    // Scores, suggestions, and collabs are optional segments (might be empty/null initially)
    const dashboardData = {
      profile: profileRes.data,
      scores: scoresRes.data || null,
      suggestions: suggestions,
      requests: mappedCollabs
    };

    res.json(dashboardData);
  } catch (err) {
    next(err);
  }
});

// POST /api/creators/enrich (Triggers n8n Profile Enrichment Workflow)
router.post('/enrich', async (req, res, next) => {
  const { creator_id } = req.body;

  if (!creator_id) {
    return res.status(400).json({ error: 'Bad Request', message: 'creator_id is required.' });
  }

  const webhookUrl = process.env.N8N_WEBHOOK_PROFILE;
  if (!webhookUrl) {
    return res.status(500).json({ error: 'Server Config Error', message: 'N8N_WEBHOOK_PROFILE URL is not configured.' });
  }

  try {
    const trace_id = require('crypto').randomUUID();

    // 1. Fetch profile first to validate mandatory profile data is complete
    const { data: creatorData, error: profileErr } = await supabase
      .from('creators')
      .select('creator_code, profile_status, ai_status')
      .eq('id', creator_id)
      .single();

    if (profileErr || !creatorData) {
      return res.status(404).json({ error: 'Profile Not Found', message: 'Creator profile must exist before enrichment.' });
    }

    if (creatorData.profile_status !== 'Ready') {
      return res.status(400).json({ 
        error: 'Incomplete Profile', 
        message: 'All mandatory profile fields must be completed before generating a Creator Intelligence Score.' 
      });
    }

    // 2. IDEMPOTENCY CHECK: Check if there is an active job already Processing/Pending
    const { data: activeJobs } = await supabase
      .from('ai_jobs')
      .select('id, status')
      .eq('creator_id', creator_id)
      .eq('workflow_name', 'creator_profile_enrichment')
      .in('status', ['Pending', 'Processing'])
      .limit(1);

    if (activeJobs && activeJobs.length > 0) {
      console.log(`[Idempotency] Active job already running for creator ${creator_id}: ${activeJobs[0].id}`);
      return res.json({
        success: true,
        message: 'AI Profile analysis is already in progress.',
        data: { job_id: activeJobs[0].id }
      });
    }

    const creator_code = creatorData.creator_code;

    // 3. Update creator status to Processing
    await supabase
      .from('creators')
      .update({ ai_status: 'Processing' })
      .eq('id', creator_id);

    // 4. Create AI Job record in ai_jobs table
    const { data: jobData, error: jobErr } = await supabase
      .from('ai_jobs')
      .insert([{
        job_type: 'Creator Analysis',
        workflow_name: 'creator_profile_enrichment',
        workflow_version: 'v1.0',
        creator_id: creator_id,
        status: 'Processing',
        trace_id: trace_id,
        queued_at: new Date().toISOString(),
        started_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (jobErr) throw jobErr;
    const job_id = jobData.id;

    // 3. Insert record into workflow_logs
    await supabase
      .from('workflow_logs')
      .insert([{
        workflow_name: 'creator_profile_enrichment',
        trace_id: trace_id,
        creator_id: creator_id,
        status: 'Processing',
        started_at: new Date().toISOString(),
        execution_id: job_id,
        workflow_version: 'v1.0',
        input_payload: { creator_id, creator_code, trace_id, job_id }
      }]);

    console.log(`Triggering n8n Profile Enrichment webhook for creator: ${creator_id} | Code: ${creator_code} | Job: ${job_id} | Trace: ${trace_id}`);
    
    // Call the n8n webhook (asynchronous trigger)
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id,
        creator_id,
        creator_code,
        workflow: 'creator_profile_enrichment',
        trace_id,
        gemini_api_key: process.env.GEMINI_API_KEY
      })
    });

    if (!response.ok) {
      throw new Error(`n8n responded with status ${response.status}: ${response.statusText}`);
    }

    // Try parsing response as JSON, fallback to text
    let resultData;
    const responseText = await response.text();
    try {
      resultData = JSON.parse(responseText);
    } catch (e) {
      resultData = { message: responseText };
    }

    res.json({
      success: true,
      message: 'Profile enrichment trigger sent to n8n successfully',
      data: resultData
    });
  } catch (err) {
    console.error('Error triggering n8n profile enrichment:', err);
    
    // Attempt to mark as failed in case of immediate dispatch error
    try {
      await supabase
        .from('creators')
        .update({ ai_status: 'Failed' })
        .eq('id', creator_id);
    } catch (dbErr) {
      console.error('Failed to reset creator status to Failed on trigger error:', dbErr);
    }

    res.status(502).json({ error: 'n8n Integration Error', message: err.message });
  }
});

module.exports = router;
