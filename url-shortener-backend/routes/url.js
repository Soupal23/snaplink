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

// Import Redis & Cache Telemetry utilities
const { safeDel } = require('../config/redis');
const { getCacheStats, resetCacheStats } = require('../utils/cacheStats');

// =======================================================
// POST /api/url/shorten (Supports Custom Slugs, Security, TTL/Click Limits & User Association)
// =======================================================
router.post('/shorten', shortenLimiter, optionalAuth, async (req, res) => {
  const { originalUrl, customCode, expiresInHours, maxClicks } = req.body;

  // 1. Remove trailing slash if present to avoid double-slash URLs (e.g., domain.com//code)
  const rawBaseUrl = process.env.BASE_URL || 'http://localhost:5000';
  const baseUrl = rawBaseUrl.replace(/\/$/, '');

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
    
    const MAX_EXPIRES_HOURS = 8760;

    let expiresAt = null;
    if (expiresInHours && !isNaN(expiresInHours) && Number(expiresInHours) > 0) {
      const hours = Math.min(Number(expiresInHours), MAX_EXPIRES_HOURS);
      expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    }

    const parsedMaxClicks = maxClicks && !isNaN(maxClicks) && Number(maxClicks) > 0 
      ? Number(maxClicks) 
      : null;

    let urlCode;

    const RESERVED_CODES = new Set(['api', 'health', 'static', 'favicon.ico', 'robots.txt', '.well-known']);
    const ALIAS_REGEX = /^[a-zA-Z0-9_-]+$/;  // alphanumeric, dash, underscore only
    const MAX_ALIAS_LENGTH = 50;
    const MIN_ALIAS_LENGTH = 3;

    if (customCode) {
      // Type guard
      if (typeof customCode !== 'string') {
        return res.status(400).json({ message: 'Custom alias must be a string.' });
      }
      // Length guard
      if (customCode.length < MIN_ALIAS_LENGTH || customCode.length > MAX_ALIAS_LENGTH) {
        return res.status(400).json({ message: `Custom alias must be between ${MIN_ALIAS_LENGTH} and ${MAX_ALIAS_LENGTH} characters.` });
      }
      // Character whitelist
      if (!ALIAS_REGEX.test(customCode)) {
        return res.status(400).json({ message: 'Custom alias can only contain letters, numbers, hyphens, and underscores.' });
      }
      // Reserved word check
      if (RESERVED_CODES.has(customCode.toLowerCase())) {
        return res.status(400).json({ message: 'This alias is reserved and cannot be used.' });
      }

      const existingCode = await Url.findOne({ urlCode: customCode });
      if (existingCode) {
        return res.status(400).json({ message: 'Custom alias is already in use. Choose another one.' });
      }
      urlCode = customCode;
    
    } else {
      if (!expiresAt && !parsedMaxClicks && !req.user) {
        let existingUrl = await Url.findOne({ originalUrl, expiresAt: null, maxClicks: null, user: null });
        if (existingUrl) {
          // Ensure the returned object reflects the current environment's BASE_URL
          const updatedDoc = existingUrl.toObject();
          updatedDoc.shortUrl = `${baseUrl}/${existingUrl.urlCode}`;
          return res.json(updatedDoc);
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
router.get(['/stats/:code', '/analytics/:code'], apiLimiter, auth , async (req, res) => {
  try {
    const url = await Url.findOne({ urlCode: req.params.code });

    if (!url) {
      return res.status(404).json({ message: 'No URL found' });
    }

    if (url.user && url.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: You do not own this link.' });
    }

    const deviceBreakdown = { Desktop: 0, Mobile: 0, Tablet: 0, Unknown: 0 };
    const browserBreakdown = {};
    const osBreakdown = {};
    const referrerBreakdown = {};
    const dateBreakdown = {};

    if (url.clicksHistory && url.clicksHistory.length > 0) {
      url.clicksHistory.forEach((click) => {
        const device = click.device || 'Unknown';
        deviceBreakdown[device] = (deviceBreakdown[device] || 0) + 1;

        if (click.browser) {
          browserBreakdown[click.browser] = (browserBreakdown[click.browser] || 0) + 1;
        }
        if (click.os) {
          osBreakdown[click.os] = (osBreakdown[click.os] || 0) + 1;
        }

        const ref = click.referrer || 'Direct';
        referrerBreakdown[ref] = (referrerBreakdown[ref] || 0) + 1;

        // Safe Date Parsing: Prevents RangeError on invalid/missing timestamps
        const rawDate = click.timestamp ? new Date(click.timestamp) : new Date();
        const validDate = !isNaN(rawDate.getTime()) ? rawDate : new Date();
        const dateStr = validDate.toISOString().split('T')[0];
        dateBreakdown[dateStr] = (dateBreakdown[dateStr] || 0) + 1;
      });
    }

    const trackedCount = url.clicksHistory ? url.clicksHistory.length : 0;
    const legacyCount = (url.clicks || 0) - trackedCount;

    if (legacyCount > 0) {
      
      const rawCreatedDate = url.date ? new Date(url.date) : new Date();
      const validCreatedDate = !isNaN(rawCreatedDate.getTime()) ? rawCreatedDate : new Date();
      const createdDate = validCreatedDate.toISOString().split('T')[0];

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
// GET /api/url/cache-stats (Cache Telemetry Metrics - Authenticated)
// =======================================================
router.get('/cache-stats', apiLimiter, auth, async (req, res) => {
  try {
    const stats = await getCacheStats();
    return res.json(stats);
  } catch (err) {
    console.error('Cache stats error:', err.message);
    return res.status(500).json({ message: 'Server error retrieving cache stats' });
  }
});

// =======================================================
// POST /api/url/cache-stats/reset (Reset Telemetry Metrics - Authenticated)
// =======================================================
router.post('/cache-stats/reset', apiLimiter, auth, async (req, res) => {
  try {
    const result = await resetCacheStats();
    return res.json(result);
  } catch (err) {
    console.error('Reset cache stats error:', err.message);
    return res.status(500).json({ message: 'Server error resetting cache stats' });
  }
});

// =======================================================
// DELETE /api/url/:id (Delete User's Own Link)
// =======================================================

router.delete('/:id', apiLimiter, auth, async (req, res) => {
  try {
    // Atomic: ownership is enforced inside the query, not checked separately
    const deleted = await Url.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,      // Only deletes if this user owns the document
    });
    if (!deleted) {
      // Could be: not found, or not owned by this user
      // Check separately to give an accurate error message
      const exists = await Url.findById(req.params.id);
      if (!exists) return res.status(404).json({ message: 'URL not found' });
      return res.status(403).json({ message: 'Forbidden: You can only delete links that you created.' });
    }

    // Atomically evict cached link and click counter from Redis
    if (deleted.urlCode) {
      await safeDel([`url:${deleted.urlCode}`, `clicks:${deleted.urlCode}`]);
    }

    return res.json({ message: 'Short link deleted successfully.', deletedId: req.params.id });
  } catch (err) {
    console.error('Delete URL error:', err.message);
    return res.status(500).json({ message: 'Server error deleting URL' });
  }
});

module.exports = router;