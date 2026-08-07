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
  // Destructure optional fields from req.body
  const { originalUrl, customCode, expiresInHours, maxClicks } = req.body;
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';

  // Basic URL Syntax Check
  if (!validUrl.isUri(baseUrl)) {
  return res.status(500).json({ message: 'Invalid BASE_URL server configuration' });
  }

  if (!validUrl.isUri(originalUrl)) {
    return res.status(400).json({ message: 'Invalid long URL' });
  }

  try {
    // Security Validation Step
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

    // Calculate Expiration & Click Limits
    let expiresAt = null;
    if (expiresInHours && !isNaN(expiresInHours) && Number(expiresInHours) > 0) {
      expiresAt = new Date(Date.now() + Number(expiresInHours) * 60 * 60 * 1000);
    }

    const parsedMaxClicks = maxClicks && !isNaN(maxClicks) && Number(maxClicks) > 0 
      ? Number(maxClicks) 
      : null;

    let urlCode;

    if (customCode) {
      // Check if custom alias is already taken
      const existingCode = await Url.findOne({ urlCode: customCode });
      if (existingCode) {
        return res.status(400).json({ message: 'Custom alias is already in use. Choose another one.' });
      }
      urlCode = customCode;
    } else {
      // Return existing short link ONLY if no user, custom expiration, or click limits were specified
      if (!expiresAt && !parsedMaxClicks && !req.user) {
        let existingUrl = await Url.findOne({ originalUrl, expiresAt: null, maxClicks: null, user: null });
        if (existingUrl) {
          return res.json(existingUrl);
        }
      }
      // Generate random 6-character code
      urlCode = nanoid(6);
    }

    const shortUrl = `${baseUrl}/${urlCode}`;

    const url = new Url({
      user: req.user ? req.user.id : null, // Link user ID if logged in
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
    // Fetch all URLs created by the currently authenticated user, newest first
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

    return res.json({
      originalUrl: url.originalUrl,
      shortUrl: url.shortUrl,
      urlCode: url.urlCode,
      clicks: url.clicks || 0,
      date: url.date,
      expiresAt: url.expiresAt,
      maxClicks: url.maxClicks,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// =======================================================
// DELETE /api/url/:id (Delete User's Own Link)
// =======================================================
router.delete('/:id', apiLimiter, auth, async (req, res) => {
  try {
    const url = await Url.findById(req.params.id);

    // 1. Check if the link exists
    if (!url) {
      return res.status(404).json({ message: 'URL not found' });
    }

    // 2. Ownership Check: Ensure link belongs to the currently logged-in user
    if (!url.user || url.user.toString() !== req.user.id) {
      return res.status(403).json({ 
        message: 'Forbidden: You can only delete links that you created.' 
      });
    }

    // 3. Delete from MongoDB
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