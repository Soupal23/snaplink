const mongoose = require('mongoose');

// Subdocument schema for recording individual click details
const clickLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
  },
  referrer: {
    type: String,
    default: 'Direct',
  },
  device: {
    type: String,
    enum: ['Mobile', 'Tablet', 'Desktop', 'Unknown'], // Enforces consistent casing and categories
    default: 'Desktop',
  },
  // OPTIONAL: Keep these if you want to display browser/OS stats on your dashboard
  browser: {
    type: String,
    default: 'Unknown',
  },
  os: {
    type: String,
    default: 'Unknown',
  },
});

const urlSchema = new mongoose.Schema({
  // USER ASSOCIATION
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, // null for guest links, ObjectId for logged-in users
  },
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
    index: { expires: 0 }, // Automatically deletes document when expiresAt timestamp passes
  },
  maxClicks: {
    type: Number,
    default: null,
  },

  // CLICK ANALYTICS HISTORY
  clicksHistory: [clickLogSchema],
});

module.exports = mongoose.model('Url', urlSchema);