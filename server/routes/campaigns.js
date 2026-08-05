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

// GET /api/campaigns/:id/matches (Get recommendations for a campaign joined with pricing recommendations)
router.get('/:id/matches', async (req, res, next) => {
  const { id } = req.params;
  try {
    const { data: matches, error: matchesErr } = await supabase
      .from('campaign_matches')
      .select('*, creator:creators(*)')
      .eq('campaign_id', id)
      .order('match_score', { ascending: false });

    if (matchesErr) {
      return res.status(500).json({ error: 'Database Error', message: matchesErr.message });
    }

    const { data: pricingRecs, error: pricingErr } = await supabase
      .from('pricing_recommendations')
      .select('*')
      .eq('campaign_id', id);

    if (pricingErr) {
      console.error("Failed to query pricing recommendations:", pricingErr.message);
    }

    const pricingMap = {};
    if (pricingRecs) {
      pricingRecs.forEach(p => {
        pricingMap[p.creator_id] = p;
      });
    }

    const enrichedMatches = matches.map(m => {
      const p = pricingMap[m.creator_id];
      return {
        ...m,
        min_price: p ? p.min_price : m.min_price,
        recommended_price: p ? p.recommended_price : m.recommended_price,
        premium_price: p ? p.premium_price : m.premium_price,
        pricing_justification: p ? p.pricing_justification : m.pricing_justification
      };
    });

    res.json(enrichedMatches);
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
    const trace_id = require('crypto').randomUUID();

    // 1. Update campaign status to Processing
    await supabase
      .from('campaigns')
      .update({ ai_status: 'Processing' })
      .eq('id', id);

    // 2. Create AI Job record in ai_jobs table
    const { data: jobData, error: jobErr } = await supabase
      .from('ai_jobs')
      .insert([{
        job_type: 'Match Engine',
        workflow_name: 'campaign_matching',
        workflow_version: 'v1.0',
        campaign_id: id,
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
        workflow_name: 'campaign_matching',
        trace_id: trace_id,
        campaign_id: id,
        status: 'Processing',
        started_at: new Date().toISOString(),
        execution_id: job_id,
        workflow_version: 'v1.0',
        input_payload: { campaign_id: id, trace_id, job_id }
      }]);

    console.log(`Triggering n8n Campaign Match Sourcing engine for campaign: ${id} | Job: ${job_id} | Trace: ${trace_id}`);
    
    // Call the n8n webhook (asynchronous trigger)
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id,
        campaign_id: id,
        workflow: 'campaign_matching',
        trace_id: trace_id
      })
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
    
    try {
      await supabase
        .from('campaigns')
        .update({ ai_status: 'Failed' })
        .eq('id', id);
    } catch (dbErr) {
      console.error('Failed to reset campaign status to Failed on trigger error:', dbErr);
    }

    res.status(502).json({ error: 'n8n Integration Error', message: err.message });
  }
});

module.exports = router;
