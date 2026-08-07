const express = require('express');
const router = express.Router();
const validUrl = require('valid-url');
const { nanoid } = require('nanoid');
const Url = require('../models/Url');

// Import security utilities (Assuming you created utils/securityCheck.js)
const { isPrivateHost, isMaliciousUrl } = require('../utils/securityCheck');

// =======================================================
// POST /api/url/shorten (Supports Custom Slugs & Security Checks)
// =======================================================
router.post('/shorten', async (req, res) => {
  const { originalUrl, customCode } = req.body;
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';

  // 1. Basic URL Syntax Check
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

    // A. Block non-HTTP/HTTPS protocols (e.g., file://, ftp://, javascript:)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({
        message: 'Only http:// and https:// URLs are allowed.',
      });
    }

    // B. SSRF Protection: Prevent shortening localhost, internal IPs, or LAN addresses
    const isPrivate = await isPrivateHost(parsedUrl.hostname);
    if (isPrivate) {
      return res.status(400).json({
        message: 'Security risk: Links pointing to internal IPs or localhost are not allowed.',
      });
    }

    // C. Anti-Phishing & Malware Check
    const isDangerous = await isMaliciousUrl(originalUrl);
    if (isDangerous) {
      return res.status(400).json({
        message: 'Security risk: This URL has been flagged for malware or phishing.',
      });
    }
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
      // Return existing short link if the long URL is already stored
      let url = await Url.findOne({ originalUrl });
      if (url) {
        return res.json(url);
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
router.get('/stats/:code', async (req, res) => {
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
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;