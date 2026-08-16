const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// POST /api/assistant/chat (CreatorLens AI Assistant endpoint)
router.post('/chat', async (req, res, next) => {
  const { creator_id, message } = req.body;

  if (!creator_id || !message) {
    return res.status(400).json({ error: 'Bad Request', message: 'Missing creator_id or message prompt.' });
  }

  // Validate creator_id as UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(creator_id)) {
    return res.json({
      success: false,
      response: "Your Creator Intelligence profile hasn't been generated yet. Complete your profile and run Creator Intelligence analysis first.",
      creator_id
    });
  }

  try {
    // 1. Fetch creator profile, scores, and analysis to send as context
    const [profileRes, scoresRes] = await Promise.all([
      supabase.from('creators').select('*, creator_ai_analysis(*)').eq('id', creator_id).single(),
      supabase.from('creator_scores').select('*').eq('creator_id', creator_id).single()
    ]);

    if (profileRes.error || !profileRes.data || profileRes.data.ai_status !== 'Completed') {
      return res.json({
        success: false,
        response: "Your Creator Intelligence profile hasn't been generated yet. Complete your profile and run Creator Intelligence analysis first.",
        creator_id
      });
    }

    const profile = profileRes.data;
    const scores = scoresRes.data || null;

    if (profile && profile.creator_ai_analysis) {
      const { id, created_at, updated_at, ...analysisFields } = profile.creator_ai_analysis;
      Object.assign(profile, analysisFields);
      delete profile.creator_ai_analysis;
    }

    // Sanitize narrative text fields to prevent newlines and unescaped quotes from breaking n8n JSON template substitution
    const sanitize = (val) => {
      if (typeof val === 'string') {
        return val.replace(/[\r\n]+/g, ' ').replace(/"/g, '\\"');
      }
      if (Array.isArray(val)) {
        return val.map(v => typeof v === 'string' ? v.replace(/[\r\n]+/g, ' ').replace(/"/g, '\\"') : v);
      }
      return val;
    };

    if (profile) {
      profile.profile_summary = sanitize(profile.profile_summary);
      profile.ai_explanation = sanitize(profile.ai_explanation);
      profile.strengths = sanitize(profile.strengths);
      profile.weaknesses = sanitize(profile.weaknesses);
      profile.missing_information = sanitize(profile.missing_information);
    }

    // 2. Check if N8N Webhook for Assistant is configured
    const webhookUrl = process.env.N8N_WEBHOOK_ASSISTANT;
    if (!webhookUrl) {
      return res.json({
        success: false,
        response: "AI Assistant is offline. Please deploy the n8n AI Assistant Workflow next to activate the integration."
      });
    }

    // 3. Query the n8n Assistant Webhook
    const n8nPayload = {
      creator_id,
      message,
      gemini_api_key: process.env.GEMINI_API_KEY,
      context: {
        profile,
        scores
      }
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(n8nPayload)
    });

    if (!response.ok) {
      throw new Error(`n8n webhook error: ${response.statusText}`);
    }

    const result = await response.json();
    res.json({
      success: true,
      response: result.response || result.output || "AI Assistant workflow processed your request but returned no message."
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
