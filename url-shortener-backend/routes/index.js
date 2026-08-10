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
  try {
    const url = await Url.findOne({ urlCode: req.params.code });

    if (!url) {
      return res.status(404).json({ message: 'No URL found' });
    }

    // Expiration or click limit checks
    if (url.expiresAt && new Date() > new Date(url.expiresAt)) {
      return res.status(410).json({ message: 'This link has expired.' });
    }
    if (url.maxClicks && url.clicks >= url.maxClicks) {
      return res.status(410).json({ message: 'Link maximum click limit reached.' });
    }

    // Safely attempt analytics logging
    try {
      const rawUserAgent = req.get('User-Agent') || req.headers['user-agent'] || '';
      
      // Explicit regex check to prevent mobile in-app browsers from registering as Desktop
      const device = detectDevice(rawUserAgent);

      // Parse Browser and OS
      const uaParsed = req.useragent || (typeof useragent.parse === 'function' ? useragent.parse(rawUserAgent) : {});
      const browser = uaParsed.browser && uaParsed.browser !== 'unknown' ? uaParsed.browser : 'Unknown';
      const os = uaParsed.os && uaParsed.os !== 'unknown' ? uaParsed.os : 'Unknown';

      // Parse Referrer
      const rawReferrer = req.get('Referrer') || req.get('Referer');
      let referrer = 'Direct';
      if (rawReferrer) {
        try {
          referrer = new URL(rawReferrer).hostname;
        } catch {
          referrer = 'Other';
        }
      }

      // Increment total clicks and record click history log
      url.clicks += 1;
      url.clicksHistory.push({
        timestamp: new Date(),
        referrer,
        device,
        browser,
        os,
      });

      await url.save();
    } catch (analyticsErr) {
      console.error('Analytics tracking failed silently:', analyticsErr);
      // Fallback: Still increment click count if full analytics parse fails
      url.clicks += 1;
      await url.save();
    }

    // Ensure URL has http:// or https:// protocol
    let redirectUrl = url.originalUrl;
    if (!/^https?:\/\//i.test(redirectUrl)) {
      redirectUrl = `https://${redirectUrl}`;
    }

    // Always perform the redirect
    return res.redirect(redirectUrl);

  } catch (err) {
    console.error('Redirect Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;