const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema({
  // USER ASSOCIATION (NEW)
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
});

module.exports = mongoose.model('Url', urlSchema);