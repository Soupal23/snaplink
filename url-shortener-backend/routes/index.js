const express = require('express');
const router = express.Router();
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

    // Parse Device & Referrer
    const userAgent = req.get('User-Agent') || '';
    const isMobile = /mobile|android|iphone|ipad|tablet/i.test(userAgent);
    const device = isMobile ? 'Mobile' : 'Desktop';

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
    });

    await url.save();
    return res.redirect(url.originalUrl);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;