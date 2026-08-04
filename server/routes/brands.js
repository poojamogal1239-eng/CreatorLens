const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// GET /api/brands/profile/:id
router.get('/profile/:id', async (req, res, next) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Brand Profile Not Found', message: error.message });
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
});

// POST /api/brands/profile
router.post('/profile', async (req, res, next) => {
  const { id, company_name, website, industry, bio } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: 'Bad Request', message: 'Brand ID is required to save profile.' });
  }

  const profileData = {
    company_name,
    website,
    industry,
    bio
  };

  try {
    const { data, error } = await supabase
      .from('brands')
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

module.exports = router;
