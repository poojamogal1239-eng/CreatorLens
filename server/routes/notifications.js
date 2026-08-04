const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// GET /api/notifications/:userId (Fetch all notifications for a specific user)
router.get('/:userId', async (req, res, next) => {
  const { userId } = req.params;
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Database Error', message: error.message });
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/:id/read (Mark a specific notification as read)
router.patch('/:id/read', async (req, res, next) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Database Error', message: error.message });
    }

    res.json({ success: true, notification: data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
