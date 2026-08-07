const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema({
  originalUrl: {
    type: String,
    required: true,
  },
  urlCode: {
    type: String,
    required: true,
    unique: true,
  },
  shortUrl: {
    type: String,
    required: true,
  },
  clicks: {
    type: Number,
    required: true,
    default: 0,
  },
  date: {
    type: Date,
    default: Date.now,
  },

  // FIELDS FOR TTL & CLICK LIMITS

  expiresAt: {
    type: Date,
    default: null,
    index: { expires: 0 }, // Tells MongoDB to automatically delete document when expiresAt timestamp passes
  },
  maxClicks: {
    type: Number,
    default: null,
  },
});

module.exports = mongoose.model('Url', urlSchema);