const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { redisClient } = require('../config/redis');

// Helper to create a RedisStore if redis is configured
const getStore = (prefix) => {
  if (redisClient) {
    return new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
      prefix: `rl:${prefix}:`,
    });
  }
  return undefined; // MemoryStore fallback
};

// 1. Strict Limiter for creating short links (Prevents MongoDB spam)
const shortenLimiter = rateLimit({
  store: getStore('shorten'),
  passOnStoreError: true,
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 10, // Limit each IP to 10 shorten requests per 15 minutes
  message: {
    message: 'Too many links created from this IP. Please wait 15 minutes before trying again.',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable legacy `X-RateLimit-*` headers
});

// 2. Brute-Force Limiter for analytics / redirect lookups
const apiLimiter = rateLimit({
  store: getStore('api'),
  passOnStoreError: true,
  windowMs: 1 * 60 * 1000, // 1-minute window
  max: 60, // Limit each IP to 60 requests per minute
  message: {
    message: 'Too many requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 3. Limiter for login and registration attempts
const authLimiter = rateLimit({
  store: getStore('auth'),
  passOnStoreError: true,
  windowMs: 15 * 60 * 1000,  // 15-minute window
  max: 10,                     // max 10 login/register attempts per IP per 15 min
  message: {
    message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed attempts against the limit
});

module.exports = { shortenLimiter, apiLimiter, authLimiter };