const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// POST /api/collaborations (Send campaign collaboration offer to creator)
router.post('/', async (req, res, next) => {
  const { campaign_id, creator_id, brand_id, suggested_price, price_justification } = req.body;

  if (!campaign_id || !creator_id || !brand_id || !suggested_price) {
    return res.status(400).json({ error: 'Bad Request', message: 'Missing parameters for collaboration request.' });
  }

  try {
    // 1. Create collaboration row
    const { data: collabData, error: collabError } = await supabase
      .from('collaborations')
      .insert([{
        campaign_id,
        creator_id,
        brand_id,
        suggested_price: parseInt(suggested_price),
        price_justification,
        status: 'pending'
      }])
      .select()
      .single();

    if (collabError) {
      return res.status(500).json({ error: 'Database Error', message: collabError.message });
    }

    // 2. Fetch campaign and brand names to construct a user-friendly notification
    const [campRes, brandRes] = await Promise.all([
      supabase.from('campaigns').select('title').eq('id', campaign_id).single(),
      supabase.from('brands').select('company_name').eq('id', brand_id).single()
    ]);

    const campaignTitle = campRes.data ? campRes.data.title : 'New Campaign';
    const brandName = brandRes.data ? brandRes.data.company_name : 'A Brand';

    // 3. Create a notification for the creator
    const notificationText = `You have received a collaboration request from "${brandName}" for the campaign "${campaignTitle}" with a proposed pricing of ₹${parseInt(suggested_price).toLocaleString('en-IN')}.`;
    
    await supabase.from('notifications').insert([{
      user_id: creator_id,
      title: 'Inbound Campaign Invitation',
      message: notificationText,
      type: 'info',
      read: false
    }]);

    res.status(201).json({ success: true, collaboration: collabData });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/collaborations/:id (Update collaboration status: accepted, rejected, completed)
router.patch('/:id', async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['pending', 'accepted', 'rejected', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid status update value.' });
  }

  try {
    // 1. Fetch current collab record to know the related parties
    const { data: collab, error: fetchError } = await supabase
      .from('collaborations')
      .select('*, campaigns(title), creators(full_name)')
      .eq('id', id)
      .single();

    if (fetchError || !collab) {
      return res.status(404).json({ error: 'Not Found', message: 'Collaboration request not found.' });
    }

    // 2. Update status
    const { data: updatedCollab, error: updateError } = await supabase
      .from('collaborations')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Database Error', message: updateError.message });
    }

    const campaignTitle = collab.campaigns ? collab.campaigns.title : 'Campaign';
    const creatorName = collab.creators ? collab.creators.full_name : 'A Creator';

    // 3. Auto-notify the brand of the creator's decision
    let notificationTitle = 'Collab Update';
    let notificationText = `Creator "${creatorName}" updated collab status to ${status} for campaign "${campaignTitle}".`;
    let notificationType = 'info';

    if (status === 'accepted') {
      notificationTitle = 'Offer Accepted!';
      notificationText = `Great news! "${creatorName}" has accepted your collaboration proposal for "${campaignTitle}".`;
      notificationType = 'success';
    } else if (status === 'rejected') {
      notificationTitle = 'Offer Declined';
      notificationText = `"${creatorName}" has declined your collaboration proposal for "${campaignTitle}".`;
      notificationType = 'warning';
    }

    await supabase.from('notifications').insert([{
      user_id: collab.brand_id,
      title: notificationTitle,
      message: notificationText,
      type: notificationType,
      read: false
    }]);

    // 4. (For Creators) If accepted, trigger a success payment/cleared notice on their profile too
    if (status === 'accepted') {
      await supabase.from('notifications').insert([{
        user_id: collab.creator_id,
        title: 'Campaign Joined Successfully',
        message: `You have successfully joined "${campaignTitle}". Work tracker is now active.`,
        type: 'success',
        read: false
      }]);
    }

    res.json({ success: true, collaboration: updatedCollab });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
