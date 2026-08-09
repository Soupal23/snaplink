const express = require('express');
const router = express.Router();
const validUrl = require('valid-url');
const { nanoid } = require('nanoid');
const Url = require('../models/Url');

// Import security utilities
const { isPrivateHost, isMaliciousUrl } = require('../utils/securityCheck');

// Import rate limiting middleware
const { shortenLimiter, apiLimiter } = require('../middleware/rateLimiter');

// Import Auth Middleware
const { auth, optionalAuth } = require('../middleware/auth');

// =======================================================
// POST /api/url/shorten (Supports Custom Slugs, Security, TTL/Click Limits & User Association)
// =======================================================
router.post('/shorten', shortenLimiter, optionalAuth, async (req, res) => {
  const { originalUrl, customCode, expiresInHours, maxClicks } = req.body;
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';

  if (!validUrl.isUri(baseUrl)) {
    return res.status(500).json({ message: 'Invalid BASE_URL server configuration' });
  }

  if (!validUrl.isUri(originalUrl)) {
    return res.status(400).json({ message: 'Invalid long URL' });
  }

  try {
    const parsedUrl = new URL(originalUrl);

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({
        message: 'Only http:// and https:// URLs are allowed.',
      });
    }

    const isPrivate = await isPrivateHost(parsedUrl.hostname);
    if (isPrivate) {
      return res.status(400).json({
        message: 'Security risk: Links pointing to internal IPs or localhost are not allowed.',
      });
    }

    const isDangerous = await isMaliciousUrl(originalUrl);
    if (isDangerous) {
      return res.status(400).json({
        message: 'Security risk: This URL has been flagged for malware or phishing.',
      });
    }

    let expiresAt = null;
    if (expiresInHours && !isNaN(expiresInHours) && Number(expiresInHours) > 0) {
      expiresAt = new Date(Date.now() + Number(expiresInHours) * 60 * 60 * 1000);
    }

    const parsedMaxClicks = maxClicks && !isNaN(maxClicks) && Number(maxClicks) > 0 
      ? Number(maxClicks) 
      : null;

    let urlCode;

    if (customCode) {
      const existingCode = await Url.findOne({ urlCode: customCode });
      if (existingCode) {
        return res.status(400).json({ message: 'Custom alias is already in use. Choose another one.' });
      }
      urlCode = customCode;
    } else {
      if (!expiresAt && !parsedMaxClicks && !req.user) {
        let existingUrl = await Url.findOne({ originalUrl, expiresAt: null, maxClicks: null, user: null });
        if (existingUrl) {
          return res.json(existingUrl);
        }
      }
      urlCode = nanoid(6);
    }

    const shortUrl = `${baseUrl}/${urlCode}`;

    const url = new Url({
      user: req.user ? req.user.id : null,
      originalUrl,
      shortUrl,
      urlCode,
      date: new Date(),
      expiresAt,
      maxClicks: parsedMaxClicks,
    });

    await url.save();
    return res.status(201).json(url);
  } catch (err) {
    console.error('Shorten URL error:', err.message);
    return res.status(400).json({ message: err.message || 'Server error processing URL validation.' });
  }
});

// =======================================================
// GET /api/url/my-links (User Dashboard Endpoint)
// =======================================================
router.get('/my-links', apiLimiter, auth, async (req, res) => {
  try {
    const urls = await Url.find({ user: req.user.id }).sort({ date: -1 });
    return res.json(urls);
  } catch (err) {
    console.error('Fetch my-links error:', err.message);
    return res.status(500).json({ message: 'Server error fetching user links' });
  }
});

// =======================================================
// GET /api/url/analytics/:code OR /api/url/stats/:code (Analytics Route)
// =======================================================
router.get(['/stats/:code', '/analytics/:code'], apiLimiter, async (req, res) => {
  try {
    const url = await Url.findOne({ urlCode: req.params.code });

    if (!url) {
      return res.status(404).json({ message: 'No URL found' });
    }

    // Include Tablet & Unknown to match the expanded schema enum
    const deviceBreakdown = { Desktop: 0, Mobile: 0, Tablet: 0, Unknown: 0 };
    const browserBreakdown = {};
    const osBreakdown = {};
    const referrerBreakdown = {};
    const dateBreakdown = {};

    // 1. Process tracked clicks history
    if (url.clicksHistory && url.clicksHistory.length > 0) {
      url.clicksHistory.forEach((click) => {
        // Device tracking
        const device = click.device || 'Unknown';
        deviceBreakdown[device] = (deviceBreakdown[device] || 0) + 1;

        // Browser & OS tracking
        if (click.browser) {
          browserBreakdown[click.browser] = (browserBreakdown[click.browser] || 0) + 1;
        }
        if (click.os) {
          osBreakdown[click.os] = (osBreakdown[click.os] || 0) + 1;
        }

        // Referrer tracking
        const ref = click.referrer || 'Direct';
        referrerBreakdown[ref] = (referrerBreakdown[ref] || 0) + 1;

        // Date tracking (YYYY-MM-DD)
        const dateStr = new Date(click.timestamp).toISOString().split('T')[0];
        dateBreakdown[dateStr] = (dateBreakdown[dateStr] || 0) + 1;
      });
    }

    // 2. Account for legacy untracked clicks (Total Clicks - History Array Length)
    const trackedCount = url.clicksHistory ? url.clicksHistory.length : 0;
    const legacyCount = (url.clicks || 0) - trackedCount;

    if (legacyCount > 0) {
      const createdDate = url.date
        ? new Date(url.date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      dateBreakdown[createdDate] = (dateBreakdown[createdDate] || 0) + legacyCount;
      deviceBreakdown.Desktop = (deviceBreakdown.Desktop || 0) + legacyCount;
      referrerBreakdown['Direct'] = (referrerBreakdown['Direct'] || 0) + legacyCount;
    }

    return res.json({
      originalUrl: url.originalUrl,
      shortUrl: url.shortUrl,
      urlCode: url.urlCode,
      clicks: url.clicks || 0,
      date: url.date,
      expiresAt: url.expiresAt,
      maxClicks: url.maxClicks,
      analytics: {
        devices: deviceBreakdown,
        browsers: browserBreakdown,
        os: osBreakdown,
        referrers: referrerBreakdown,
        dates: dateBreakdown,
      },
    });
  } catch (err) {
    console.error('Analytics route error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// =======================================================
// DELETE /api/url/:id (Delete User's Own Link)
// =======================================================
router.delete('/:id', apiLimiter, auth, async (req, res) => {
  try {
    const url = await Url.findById(req.params.id);

    if (!url) {
      return res.status(404).json({ message: 'URL not found' });
    }

    if (!url.user || url.user.toString() !== req.user.id) {
      return res.status(403).json({ 
        message: 'Forbidden: You can only delete links that you created.' 
      });
    }

    await Url.findByIdAndDelete(req.params.id);

    return res.json({ 
      message: 'Short link deleted successfully.', 
      deletedId: req.params.id 
    });
  } catch (err) {
    console.error('Delete URL error:', err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'URL not found' });
    }
    
    return res.status(500).json({ message: 'Server error deleting URL' });
  }
});

module.exports = router;