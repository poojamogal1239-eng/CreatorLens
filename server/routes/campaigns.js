const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// POST /api/campaigns (Create a new campaign brief)
router.post('/', async (req, res, next) => {
  const { brand_id, title, objective, category, target_audience, region, language, budget, creator_type } = req.body;

  if (!brand_id || !title || !objective || !category || !region || !language || !budget || !creator_type) {
    return res.status(400).json({ error: 'Bad Request', message: 'Missing required campaign parameters.' });
  }

  const campaignData = {
    brand_id,
    title,
    objective,
    category,
    target_audience,
    region,
    language,
    budget: parseInt(budget),
    creator_type,
    status: 'active'
  };

  try {
    const { data, error } = await supabase
      .from('campaigns')
      .insert([campaignData])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Database Error', message: error.message });
    }

    res.status(201).json({ success: true, campaign: data });
  } catch (err) {
    next(err);
  }
});

// GET /api/campaigns (List campaigns, optionally filtered by brand_id)
router.get('/', async (req, res, next) => {
  const { brand_id } = req.query;
  try {
    let query = supabase.from('campaigns').select('*');
    
    if (brand_id) {
      query = query.eq('brand_id', brand_id);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Database Error', message: error.message });
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/campaigns/:id (Retrieve a single campaign details)
router.get('/:id', async (req, res, next) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Campaign Not Found', message: error.message });
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/campaigns/:id/matches (Get recommendations for a campaign)
router.get('/:id/matches', async (req, res, next) => {
  const { id } = req.params;
  try {
    // Perform a join query to select match data and corresponding creator details
    const { data, error } = await supabase
      .from('campaign_matches')
      .select('*, creator:creators(*)')
      .eq('campaign_id', id)
      .order('match_score', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Database Error', message: error.message });
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
});

// POST /api/campaigns/:id/match (Triggers n8n Campaign Match Sourcing Engine)
router.post('/:id/match', async (req, res, next) => {
  const { id } = req.params;

  const webhookUrl = process.env.N8N_WEBHOOK_CAMPAIGN;
  if (!webhookUrl) {
    return res.status(500).json({ error: 'Server Config Error', message: 'N8N_WEBHOOK_CAMPAIGN URL is not configured.' });
  }

  try {
    console.log(`Triggering n8n Campaign Match Sourcing engine for campaign: ${id}`);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign_id: id })
    });

    if (!response.ok) {
      throw new Error(`n8n responded with status ${response.status}: ${response.statusText}`);
    }

    let resultData;
    const responseText = await response.text();
    try {
      resultData = JSON.parse(responseText);
    } catch (e) {
      resultData = { message: responseText };
    }

    res.json({
      success: true,
      message: 'Campaign sourcing trigger sent to n8n successfully',
      data: resultData
    });
  } catch (err) {
    console.error('Error triggering n8n campaign matching:', err);
    res.status(502).json({ error: 'n8n Integration Error', message: err.message });
  }
});

module.exports = router;
