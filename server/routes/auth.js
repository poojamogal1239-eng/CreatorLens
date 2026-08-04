const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  const { email, password, role } = req.body;
  
  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Bad Request', message: 'Email, password, and role are required.' });
  }

  try {
    // 1. Sign up user via Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true // Auto-confirm email for easy dev/onboarding
    });

    if (error) {
      return res.status(400).json({ error: 'Auth Error', message: error.message });
    }

    const user = data.user;

    // 2. Insert role mapper profile in public.users
    const { error: dbError } = await supabase
      .from('users')
      .insert([{ id: user.id, email, role }]);

    if (dbError) {
      // Cleanup auth user on database insertion failure
      await supabase.auth.admin.deleteUser(user.id);
      return res.status(500).json({ error: 'Database Error', message: dbError.message });
    }

    // 3. Initialize profile tables
    if (role === 'creator') {
      const { error: creatorError } = await supabase
        .from('creators')
        .insert([{ 
          id: user.id, 
          full_name: email.split('@')[0],
          avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          bio: 'Regional Content Creator'
        }]);
      if (creatorError) console.error('Failed to create creator profile row:', creatorError);
    } else if (role === 'brand') {
      const { error: brandError } = await supabase
        .from('brands')
        .insert([{ 
          id: user.id, 
          company_name: email.split('@')[0] + ' Corp'
        }]);
      if (brandError) console.error('Failed to create brand profile row:', brandError);
    }

    res.status(201).json({
      success: true,
      user: { id: user.id, email, role }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Bad Request', message: 'Email and password are required.' });
  }

  try {
    // 1. Authenticate credentials
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return res.status(401).json({ error: 'Unauthorized', message: error.message });
    }

    const session = data.session;
    const user = data.user;

    // 2. Query user role mapper
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (dbError || !userData) {
      return res.status(404).json({ error: 'User Role Not Found', message: 'Auth user lacks corresponding db role.' });
    }

    res.json({
      success: true,
      token: session.access_token,
      user: {
        id: user.id,
        email: user.email,
        role: userData.role
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
