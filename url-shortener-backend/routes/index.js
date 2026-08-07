const express = require('express');
const router = express.Router();
const Url = require('../models/Url');

// @route   GET /:code
// @desc    Redirect short code to original URL & increment clicks
router.get('/:code', async (req, res) => {
  try {
    const url = await Url.findOne({ urlCode: req.params.code });

    if (url) {
      // Increment click counter
      url.clicks++;
      await url.save();

      // Redirect user to destination
      return res.redirect(url.originalUrl);
    } else {
      return res.status(404).json({ message: 'No URL found for this code' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;