const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// GET /api/collaborations (List all collaborations, optionally filtered by brand_id or creator_id)
router.get('/', async (req, res, next) => {
  const { brand_id, creator_id } = req.query;
  try {
    let query = supabase.from('collaborations').select('*, campaigns(*), creators(*, creator_scores(*), creator_ai_analysis(*))');
    if (brand_id) {
      query = query.eq('brand_id', brand_id);
    }
    if (creator_id) {
      query = query.eq('creator_id', creator_id);
    }
    
    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ error: 'Database Error', message: error.message });
    }

    // Resolve brand names manually (PGRST200 join restriction)
    const { data: brandsData } = await supabase.from('brands').select('*');
    const brandMap = {};
    if (brandsData) {
      brandsData.forEach(b => {
        brandMap[b.id] = b;
      });
    }

    const mapped = (data || []).map(collab => ({
      ...collab,
      brand: brandMap[collab.brand_id] || null
    }));

    res.json(mapped);
  } catch (err) {
    next(err);
  }
});

// POST /api/collaborations (Send campaign collaboration offer to creator)
router.post('/', async (req, res, next) => {
  const { campaign_id, creator_id, brand_id, suggested_price, price_justification, initiated_by } = req.body;

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
        status: 'pending',
        initiated_by: initiated_by || 'brand'
      }])
      .select()
      .single();

    if (collabError) {
      return res.status(500).json({ error: 'Database Error', message: collabError.message });
    }

    // 2. Fetch campaign, brand, and creator names to construct a user-friendly notification
    const [campRes, brandRes, creatorRes] = await Promise.all([
      supabase.from('campaigns').select('title').eq('id', campaign_id).single(),
      supabase.from('brands').select('company_name').eq('id', brand_id).single(),
      supabase.from('creators').select('full_name').eq('id', creator_id).single()
    ]);

    const campaignTitle = campRes.data ? campRes.data.title : 'New Campaign';
    const brandName = brandRes.data ? brandRes.data.company_name : 'A Brand';
    const creatorName = creatorRes.data ? creatorRes.data.full_name : 'A Creator';

    // 3. Create a notification for the recipient
    if (initiated_by === 'creator') {
      const notificationText = `Creator "${creatorName}" has applied to your campaign "${campaignTitle}".`;
      await supabase.from('notifications').insert([{
        user_id: brand_id,
        title: 'New Campaign Application',
        message: notificationText,
        type: 'info',
        read: false
      }]);
    } else {
      const notificationText = `You have received a collaboration request from "${brandName}" for the campaign "${campaignTitle}" with a proposed pricing of ₹${parseInt(suggested_price).toLocaleString('en-IN')}.`;
      await supabase.from('notifications').insert([{
        user_id: creator_id,
        title: 'Inbound Campaign Invitation',
        message: notificationText,
        type: 'info',
        read: false
      }]);
    }

    res.status(201).json({ success: true, collaboration: collabData });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/collaborations/:id (Update collaboration status and metadata)
router.patch('/:id', async (req, res, next) => {
  const { id } = req.params;
  const { status, price_justification } = req.body;

  if (status && !['pending', 'accepted', 'rejected', 'completed'].includes(status)) {
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

    // 2. Update status and metadata
    const updateData = {};
    if (status) updateData.status = status;
    if (price_justification !== undefined) updateData.price_justification = price_justification;

    const { data: updatedCollab, error: updateError } = await supabase
      .from('collaborations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Database Error', message: updateError.message });
    }

    const campaignTitle = collab.campaigns ? collab.campaigns.title : 'Campaign';
    const creatorName = collab.creators ? collab.creators.full_name : 'A Creator';

    // 3. Dispatch notifications depending on update source (Brand vs Creator)
    const isOutboundCollab = collab.initiated_by === 'creator';
    
    if (isOutboundCollab || (collab.status === 'accepted' && status === 'completed')) {
      // Brand is updating Creator application or completing accepted collaboration -> Notify Creator
      if (status) {
        if (status === 'accepted') {
          const isProgress = price_justification && price_justification.includes('In Progress');
          await supabase.from('notifications').insert([{
            user_id: collab.creator_id,
            title: isProgress ? 'Campaign Work Started' : 'Campaign Application Selected!',
            message: isProgress 
              ? `Your campaign collaboration for "${campaignTitle}" is now In Progress.`
              : `Congratulations! You have been Selected for the campaign "${campaignTitle}".`,
            type: 'success',
            read: false
          }]);
        } else if (status === 'completed') {
          await supabase.from('notifications').insert([{
            user_id: collab.creator_id,
            title: 'Campaign Payout Cleared!',
            message: `Your campaign collaboration for "${campaignTitle}" has been Completed. Payout cleared!`,
            type: 'success',
            read: false
          }]);
        } else if (status === 'rejected') {
          await supabase.from('notifications').insert([{
            user_id: collab.creator_id,
            title: 'Application Update',
            message: `Your application for "${campaignTitle}" was not selected.`,
            type: 'warning',
            read: false
          }]);
        }
      }

      if (price_justification && price_justification.includes('State: ')) {
        const stateName = price_justification.split('State: ')[1].trim();
        await supabase.from('notifications').insert([{
          user_id: collab.creator_id,
          title: `Application ${stateName}`,
          message: `Your application status for "${campaignTitle}" has been updated to: ${stateName}.`,
          type: 'info',
          read: false
        }]);
      }
    } else {
      // Creator is accepting or declining Inbound Brand Invitation -> Notify Brand
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

      // Notify the creator that their acceptance went through
      if (status === 'accepted') {
        await supabase.from('notifications').insert([{
          user_id: collab.creator_id,
          title: 'Campaign Joined Successfully',
          message: `You have successfully joined "${campaignTitle}". Work tracker is now active.`,
          type: 'success',
          read: false
        }]);
      }
    }

    res.json({ success: true, collaboration: updatedCollab });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
