const express = require('express');
const router = express.Router();
const Url = require('../models/Url');

// =======================================================
// GET /:code (Redirect to Original URL with TTL & Click Checks)
// =======================================================
router.get('/:code', async (req, res) => {
  try {
    const url = await Url.findOne({ urlCode: req.params.code });

    // 1. Check if URL exists
    if (!url) {
      return res.status(404).json({ message: 'No URL found for this code' });
    }

    // 2. Check Expiration Timestamp (TTL)
    if (url.expiresAt && new Date() > new Date(url.expiresAt)) {
      return res.status(410).json({ message: 'This link has expired.' });
    }

    // 3. Check Max Click Limit
    if (url.maxClicks !== null && url.maxClicks !== undefined && url.clicks >= url.maxClicks) {
      return res.status(410).json({ message: 'Click limit reached for this link.' });
    }

    // 4. Increment click counter & save
    url.clicks++;
    await url.save();

    // 5. Redirect to destination
    return res.redirect(url.originalUrl);
  } catch (err) {
    console.error('Redirect error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;