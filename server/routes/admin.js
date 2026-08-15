const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// GET /api/admin/dashboard (Total stats and recent platform activity feed)
router.get('/dashboard', async (req, res, next) => {
  try {
    const [creatorsCountRes, brandsCountRes, activeCampsRes, activeCollabsRes] = await Promise.all([
      supabase.from('creators').select('*', { count: 'exact', head: true }),
      supabase.from('brands').select('*', { count: 'exact', head: true }),
      supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('collaborations').select('*', { count: 'exact', head: true }).in('status', ['accepted', 'completed'])
    ]);

    // Pull recent items to construct timeline activities
    const [recentCreators, recentBrands, recentCamps, recentCollabs] = await Promise.all([
      supabase.from('creators').select('id, full_name, created_at').order('created_at', { ascending: false }).limit(5),
      supabase.from('brands').select('id, company_name, created_at').order('created_at', { ascending: false }).limit(5),
      supabase.from('campaigns').select('id, title, created_at').order('created_at', { ascending: false }).limit(5),
      supabase.from('collaborations').select('id, status, initiated_by, created_at, campaigns(title), creators(full_name)').order('created_at', { ascending: false }).limit(5)
    ]);

    // Format activities
    const activities = [];
    if (recentCreators.data) {
      recentCreators.data.forEach(c => {
        activities.push({
          type: 'creator_registration',
          message: `New Creator registered: "${c.full_name}"`,
          created_at: c.created_at
        });
      });
    }
    if (recentBrands.data) {
      recentBrands.data.forEach(b => {
        activities.push({
          type: 'brand_registration',
          message: `New Brand registered: "${b.company_name}"`,
          created_at: b.created_at
        });
      });
    }
    if (recentCamps.data) {
      recentCamps.data.forEach(camp => {
        activities.push({
          type: 'campaign_published',
          message: `Campaign published: "${camp.title}"`,
          created_at: camp.created_at
        });
      });
    }
    if (recentCollabs.data) {
      recentCollabs.data.forEach(collab => {
        const creatorName = collab.creators ? collab.creators.full_name : 'A Creator';
        const campaignTitle = collab.campaigns ? collab.campaigns.title : 'Campaign';
        
        if (collab.status === 'completed') {
          activities.push({
            type: 'collab_completed',
            message: `Collaboration completed: "${creatorName}" for "${campaignTitle}"`,
            created_at: collab.created_at
          });
        } else if (collab.status === 'accepted') {
          activities.push({
            type: 'collab_selected',
            message: `Creator "${creatorName}" selected for "${campaignTitle}"`,
            created_at: collab.created_at
          });
        } else if (collab.initiated_by === 'creator') {
          activities.push({
            type: 'application_received',
            message: `Creator application received from "${creatorName}" for "${campaignTitle}"`,
            created_at: collab.created_at
          });
        }
      });
    }

    // Sort by created_at desc and take top 8
    activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const sortedTimeline = activities.slice(0, 8);

    res.json({
      success: true,
      stats: {
        totalCreators: creatorsCountRes.count || 0,
        totalBrands: brandsCountRes.count || 0,
        activeCampaigns: activeCampsRes.count || 0,
        activeCollaborations: activeCollabsRes.count || 0
      },
      recentActivity: sortedTimeline
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/creators (Full list of creators with scores)
router.get('/creators', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('creators')
      .select('*, creator_scores(*), creator_ai_analysis(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/brands (Full list of brands with nested metrics)
router.get('/brands', async (req, res, next) => {
  try {
    const [brandsRes, campaignsRes, collabsRes] = await Promise.all([
      supabase.from('brands').select('*').order('created_at', { ascending: false }),
      supabase.from('campaigns').select('id, brand_id, status'),
      supabase.from('collaborations').select('id, brand_id')
    ]);

    if (brandsRes.error) throw brandsRes.error;

    // Aggregate counts in Node memory
    const campaignsList = campaignsRes.data || [];
    const collabsList = collabsRes.data || [];

    const enrichedBrands = (brandsRes.data || []).map(brand => {
      const brandCamps = campaignsList.filter(c => c.brand_id === brand.id);
      const brandCollabs = collabsList.filter(c => c.brand_id === brand.id);

      return {
        ...brand,
        campaigns_count: brandCamps.length,
        active_campaigns_count: brandCamps.filter(c => c.status === 'active').length,
        collaborations_count: brandCollabs.length
      };
    });

    res.json(enrichedBrands);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/campaigns (Full list of campaigns with application count)
router.get('/campaigns', async (req, res, next) => {
  try {
    const [campaignsRes, collabsRes, brandsRes] = await Promise.all([
      supabase.from('campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('collaborations').select('id, campaign_id, initiated_by'),
      supabase.from('brands').select('id, company_name')
    ]);

    if (campaignsRes.error) throw campaignsRes.error;

    const brandMap = {};
    if (brandsRes.data) {
      brandsRes.data.forEach(b => {
        brandMap[b.id] = b.company_name;
      });
    }

    const collabsList = collabsRes.data || [];

    const mapped = (campaignsRes.data || []).map(camp => {
      const campApplications = collabsList.filter(c => c.campaign_id === camp.id && c.initiated_by === 'creator');
      return {
        ...camp,
        brand_name: brandMap[camp.brand_id] || 'A Brand',
        applications_count: campApplications.length
      };
    });

    res.json(mapped);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/collaborations (Full list of collaborations with joins)
router.get('/collaborations', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('collaborations')
      .select('*, campaigns(*), creators(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;

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

module.exports = router;
