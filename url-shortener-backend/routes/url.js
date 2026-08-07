const express = require('express');
const router = express.Router();
const validUrl = require('valid-url');
const { nanoid } = require('nanoid');
const Url = require('../models/Url');

// Import security utilities
const { isPrivateHost, isMaliciousUrl } = require('../utils/securityCheck');

// Import rate limiting middleware
const { shortenLimiter, apiLimiter } = require('../middleware/rateLimiter');

// =======================================================
// POST /api/url/shorten (Supports Custom Slugs, Security & TTL/Click Limits)
// =======================================================
// shortenLimiter added 
router.post('/shorten', shortenLimiter, async (req, res) => {
  // 1. Destructure new optional fields from req.body
  const { originalUrl, customCode, expiresInHours, maxClicks } = req.body;
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';

  // Basic URL Syntax Check
  if (!validUrl.isUri(baseUrl)) {
    return res.status(401).json({ message: 'Invalid base URL' });
  }

  if (!validUrl.isUri(originalUrl)) {
    return res.status(400).json({ message: 'Invalid long URL' });
  }

  try {
    // ===================================================
    // SECURITY VALIDATION STEP
    // ===================================================
    const parsedUrl = new URL(originalUrl);

    // Block non-HTTP/HTTPS protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({
        message: 'Only http:// and https:// URLs are allowed.',
      });
    }

    // SSRF Protection
    const isPrivate = await isPrivateHost(parsedUrl.hostname);
    if (isPrivate) {
      return res.status(400).json({
        message: 'Security risk: Links pointing to internal IPs or localhost are not allowed.',
      });
    }

    // Anti-Phishing & Malware Check
    const isDangerous = await isMaliciousUrl(originalUrl);
    if (isDangerous) {
      return res.status(400).json({
        message: 'Security risk: This URL has been flagged for malware or phishing.',
      });
    }
    // ===================================================

    // ===================================================
    // CALCULATE EXPIRATION & CLICK LIMITS
    // ===================================================
    let expiresAt = null;
    if (expiresInHours && !isNaN(expiresInHours) && Number(expiresInHours) > 0) {
      // Calculate date in future: Current Time + (Hours * 60m * 60s * 1000ms)
      expiresAt = new Date(Date.now() + Number(expiresInHours) * 60 * 60 * 1000);
    }

    const parsedMaxClicks = maxClicks && !isNaN(maxClicks) && Number(maxClicks) > 0 
      ? Number(maxClicks) 
      : null;
    // ===================================================

    let urlCode;

    if (customCode) {
      // Check if custom alias is already taken
      const existingCode = await Url.findOne({ urlCode: customCode });
      if (existingCode) {
        return res.status(400).json({ message: 'Custom alias is already in use. Choose another one.' });
      }
      urlCode = customCode;
    } else {
      // Return existing short link ONLY if no custom expiration or click limits were specified
      if (!expiresAt && !parsedMaxClicks) {
        let existingUrl = await Url.findOne({ originalUrl, expiresAt: null, maxClicks: null });
        if (existingUrl) {
          return res.json(existingUrl);
        }
      }
      // Generate random 6-character code
      urlCode = nanoid(6);
    }

    const shortUrl = `${baseUrl}/${urlCode}`;

    const url = new Url({
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
// GET /api/url/stats/:code (Analytics Route)
// =======================================================
//  apiLimiter added 
router.get('/stats/:code', apiLimiter, async (req, res) => {
  try {
    const url = await Url.findOne({ urlCode: req.params.code });

    if (!url) {
      return res.status(404).json({ message: 'No URL found' });
    }

    return res.json({
      originalUrl: url.originalUrl,
      shortUrl: url.shortUrl,
      urlCode: url.urlCode,
      clicks: url.clicks,
      date: url.date,
      expiresAt: url.expiresAt,
      maxClicks: url.maxClicks,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;