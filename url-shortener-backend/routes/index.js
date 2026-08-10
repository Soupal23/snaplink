const express = require('express');
const router = express.Router();
const useragent = require('express-useragent');
const Url = require('../models/Url');

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
      const source = req.get('User-Agent') || '';
      
      // express-useragent safety check
      const ua = typeof useragent.parse === 'function' 
        ? useragent.parse(source) 
        : { browser: 'Unknown', os: 'Unknown', isMobile: false, isTablet: false };

      let device = 'Desktop';
      if (ua.isTablet) {
        device = 'Tablet';
      } else if (ua.isMobile) {
        device = 'Mobile';
      }

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
        browser: ua.browser || 'Unknown',
        os: ua.os || 'Unknown',
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