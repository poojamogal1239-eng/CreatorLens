const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// GET /api/creators/profile/:id
router.get('/profile/:id', async (req, res, next) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('creators')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Profile Not Found', message: error.message });
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
});

// POST /api/creators/profile
router.post('/profile', async (req, res, next) => {
  const { id, full_name, bio, categories, languages, regions, pricing_min, pricing_premium, followers_count, average_views, engagement_rate, profile_completeness } = req.body;
  
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
    profile_completeness: profile_completeness || 10
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
      supabase.from('creators').select('*').eq('id', id).single(),
      supabase.from('creator_scores').select('*').eq('creator_id', id).single(),
      supabase.from('creator_ai_suggestions').select('*').eq('creator_id', id),
      supabase.from('collaborations').select('*, campaigns(*), brands(*)').eq('creator_id', id)
    ]);

    // Handle profile query failure (mandatory segment)
    if (profileRes.error) {
      return res.status(404).json({ error: 'Creator Not Found', message: profileRes.error.message });
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
    console.log(`Triggering n8n Profile Enrichment webhook for creator: ${creator_id}`);
    
    // Call the n8n webhook (asynchronous execution or direct response)
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creator_id })
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
    res.status(502).json({ error: 'n8n Integration Error', message: err.message });
  }
});

module.exports = router;
