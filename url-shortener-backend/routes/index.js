const express = require('express');
const router = express.Router();
const useragent = require('express-useragent');
const Url = require('../models/Url');
const { safeGet, safeSet, safeDel, safeIncr } = require('../config/redis');
const { recordCacheHit, recordCacheMiss } = require('../utils/cacheStats');

// Helper function to accurately detect device type (handles Android webviews & in-app browsers)
const detectDevice = (uaString = '') => {
  const ua = uaString.toLowerCase();
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'Tablet';
  }
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|hpwOS|webOS|Opera M(obi|ini)/i.test(ua)) {
    return 'Mobile';
  }
  return 'Desktop';
};

// Helper to construct click analytics record
const buildClickEntry = (req) => {
  const rawUserAgent = req.get('User-Agent') || '';
  const device = detectDevice(rawUserAgent);
  const uaParsed = req.useragent || {};
  const browser = uaParsed.browser && uaParsed.browser !== 'unknown' ? uaParsed.browser : 'Unknown';
  const os = uaParsed.os && uaParsed.os !== 'unknown' ? uaParsed.os : 'Unknown';
  const rawReferrer = req.get('Referrer') || req.get('Referer');
  let referrer = 'Direct';
  if (rawReferrer) {
    try {
      referrer = new URL(rawReferrer).hostname;
    } catch {
      referrer = 'Other';
    }
  }
  return { timestamp: new Date(), referrer, device, browser, os };
};

// Helper to ensure redirect URL has scheme
const formatRedirectUrl = (urlStr) => {
  if (!/^https?:\/\//i.test(urlStr)) {
    return `https://${urlStr}`;
  }
  return urlStr;
};

// GET /:code -> Redirect to original URL & log analytics
router.get('/:code', async (req, res) => {
  const code = req.params.code;

  // Prevent browser caching of redirects or 410 expired statuses
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    // ----------------------------------------------------
    // 1. CHECK REDIS CACHE FIRST
    // ----------------------------------------------------
    const cachedData = await safeGet(`url:${code}`);

    if (cachedData) {
      await recordCacheHit(code);

      let cached;
      try {
        cached = JSON.parse(cachedData);
      } catch (e) {
        cached = null;
      }

      if (cached) {
        // A. Expiration check on cached entry
        if (cached.expiresAt && new Date() > new Date(cached.expiresAt)) {
          await safeDel([`url:${code}`, `clicks:${code}`]);
          return res.status(410).json({ message: 'This link has expired.' });
        }

        // B. Atomic maxClicks check via Redis INCR
        if (cached.maxClicks !== null && cached.maxClicks !== undefined) {
          const currentClicks = await safeIncr(`clicks:${code}`);
          if (currentClicks !== null && currentClicks > cached.maxClicks) {
            // Click limit exceeded: evict keys and block
            await safeDel([`url:${code}`, `clicks:${code}`]);
            return res.status(410).json({ message: 'Link maximum click limit reached.' });
          }
        }

        // C. Build click analytics and asynchronously update MongoDB
        const clickEntry = buildClickEntry(req);
        Url.updateOne(
          { _id: cached.id },
          {
            $inc: { clicks: 1 },
            $push: { clicksHistory: clickEntry },
          }
        ).exec().catch((err) => console.error('[Mongo] Async click update error:', err.message));

        // D. Perform immediate redirect
        return res.redirect(formatRedirectUrl(cached.originalUrl));
      }
    }

    // ----------------------------------------------------
    // 2. CACHE MISS -> QUERY MONGODB
    // ----------------------------------------------------
    await recordCacheMiss(code);

    const url = await Url.findOne({ urlCode: code });

    if (!url) {
      return res.status(404).json({ message: 'No URL found' });
    }

    // Expiration check
    if (url.expiresAt && new Date() > new Date(url.expiresAt)) {
      return res.status(410).json({ message: 'This link has expired.' });
    }

    // Max clicks check
    if (url.maxClicks !== null && url.maxClicks !== undefined && url.clicks >= url.maxClicks) {
      return res.status(410).json({ message: 'Link maximum click limit reached.' });
    }

    // Calculate TTL matching link expiration or default 1 hour (3600s)
    let ttlSeconds = 3600;
    if (url.expiresAt) {
      const remainingMs = new Date(url.expiresAt).getTime() - Date.now();
      const remainingSec = Math.floor(remainingMs / 1000);
      if (remainingSec > 0) {
        ttlSeconds = Math.min(remainingSec, 3600);
      }
    }

    // Populate Redis Cache
    const cachePayload = JSON.stringify({
      id: url._id.toString(),
      originalUrl: url.originalUrl,
      expiresAt: url.expiresAt,
      maxClicks: url.maxClicks,
    });

    await safeSet(`url:${code}`, cachePayload, { EX: ttlSeconds });

    // Set atomic click counter in Redis with the exact same TTL
    if (url.maxClicks !== null && url.maxClicks !== undefined) {
      await safeSet(`clicks:${code}`, String((url.clicks || 0) + 1), { EX: ttlSeconds });
    }

    // Build click analytics and atomically update MongoDB
    const clickEntry = buildClickEntry(req);
    await Url.updateOne(
      { _id: url._id },
      {
        $inc: { clicks: 1 },
        $push: { clicksHistory: clickEntry },
      }
    );

    return res.redirect(formatRedirectUrl(url.originalUrl));

  } catch (err) {
    console.error('Redirect Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
