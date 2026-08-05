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
      Object.assign(data, data.creator_ai_analysis);
      delete data.creator_ai_analysis;
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
});

// POST /api/creators/profile
router.post('/profile', async (req, res, next) => {
  const { id, full_name, bio, categories, languages, regions, pricing_min, pricing_premium, followers_count, average_views, engagement_rate } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: 'Bad Request', message: 'Creator ID is required to save profile.' });
  }

  const profileData = {
    full_name,
    bio,
    categories: categories || [],
    languages: languages || [],
    regions: regions || [],
    pricing_min: pricing_min || 0,
    pricing_premium: pricing_premium || 0,
    followers_count: followers_count || 0,
    average_views: average_views || 0,
    engagement_rate: engagement_rate || 0,
    ai_status: 'Pending' // Reset to Pending on profile edit to trigger re-analysis if needed
  };

  try {
    const { data, error } = await supabase
      .from('creators')
      .update(profileData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Database Error', message: error.message });
    }

    res.json({ success: true, profile: data });
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
      supabase.from('collaborations').select('*, campaigns(*), brands(*)').eq('creator_id', id)
    ]);

    // Handle profile query failure (mandatory segment)
    if (profileRes.error) {
      return res.status(404).json({ error: 'Creator Not Found', message: profileRes.error.message });
    }

    // Flat merge creator_ai_analysis properties if present
    if (profileRes.data && profileRes.data.creator_ai_analysis) {
      Object.assign(profileRes.data, profileRes.data.creator_ai_analysis);
      delete profileRes.data.creator_ai_analysis;
    }

    // Scores, suggestions, and collabs are optional segments (might be empty/null initially)
    const dashboardData = {
      profile: profileRes.data,
      scores: scoresRes.data || null,
      suggestions: suggestionsRes.data || [],
      requests: collabsRes.data || []
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

    // Fetch creator_code first
    const { data: creatorData } = await supabase
      .from('creators')
      .select('creator_code')
      .eq('id', creator_id)
      .single();

    const creator_code = creatorData ? creatorData.creator_code : null;

    // 1. Update creator status to Processing
    await supabase
      .from('creators')
      .update({ ai_status: 'Processing' })
      .eq('id', creator_id);

    // 2. Create AI Job record in ai_jobs table
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
        trace_id
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
