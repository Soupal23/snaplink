const express = require('express');
const router = express.Router();
const useragent = require('express-useragent');
const Url = require('../models/Url');

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

// GET /:code -> Redirect to original URL & log analytics
router.get('/:code', async (req, res) => {
  // Prevent browser caching of redirects or 410 expired statuses
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    // 1. Fetch the URL document by short code
    const url = await Url.findOne({ urlCode: req.params.code });

    if (!url) {
      return res.status(404).json({ message: 'No URL found' });
    }

    // 2. Expiration check
    if (url.expiresAt && new Date() > new Date(url.expiresAt)) {
      return res.status(410).json({ message: 'This link has expired.' });
    }

    // 3. Max clicks check
    if (url.maxClicks !== null && url.maxClicks !== undefined && url.clicks >= url.maxClicks) {
      return res.status(410).json({ message: 'Link maximum click limit reached.' });
    }

    // 4. Build click analytics details
    const rawUserAgent = req.get('User-Agent') || '';
    const device = detectDevice(rawUserAgent);
    const uaParsed = req.useragent || {};
    const browser = uaParsed.browser && uaParsed.browser !== 'unknown' ? uaParsed.browser : 'Unknown';
    const os = uaParsed.os && uaParsed.os !== 'unknown' ? uaParsed.os : 'Unknown';
    const rawReferrer = req.get('Referrer') || req.get('Referer');
    let referrer = 'Direct';
    if (rawReferrer) {
      try { referrer = new URL(rawReferrer).hostname; } catch { referrer = 'Other'; }
    }

    const clickEntry = { timestamp: new Date(), referrer, device, browser, os };

    // 5. Atomically update clicks count and push to history
    await Url.updateOne(
      { _id: url._id },
      {
        $inc: { clicks: 1 },
        $push: { clicksHistory: clickEntry },
      }
    );

    // 6. Format destination URL and perform redirect
    let redirectUrl = url.originalUrl;
    if (!/^https?:\/\//i.test(redirectUrl)) {
      redirectUrl = `https://${redirectUrl}`;
    }
    return res.redirect(redirectUrl);

  } catch (err) {
    console.error('Redirect Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
