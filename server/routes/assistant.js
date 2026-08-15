const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// POST /api/assistant/chat (CreatorLens AI Assistant endpoint)
router.post('/chat', async (req, res, next) => {
  const { creator_id, message } = req.body;

  if (!creator_id || !message) {
    return res.status(400).json({ error: 'Bad Request', message: 'Missing creator_id or message prompt.' });
  }

  try {
    // 1. Fetch creator profile, scores, and analysis to send as context
    const [profileRes, scoresRes] = await Promise.all([
      supabase.from('creators').select('*, creator_ai_analysis(*)').eq('id', creator_id).single(),
      supabase.from('creator_scores').select('*').eq('creator_id', creator_id).single()
    ]);

    const profile = profileRes.data || null;
    const scores = scoresRes.data || null;

    if (profile && profile.creator_ai_analysis) {
      const { id, created_at, updated_at, ...analysisFields } = profile.creator_ai_analysis;
      Object.assign(profile, analysisFields);
      delete profile.creator_ai_analysis;
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
