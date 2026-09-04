const { createClient } = require('redis');

let redisClient = null;
let isReady = false;

if (!process.env.REDIS_URL) {
  console.warn('[Redis] No REDIS_URL configured in environment. Using in-memory fallback.');
} else {
  redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.error('[Redis] Max reconnection retries reached. Falling back.');
          return new Error('Max retries reached');
        }
        return Math.min(retries * 100, 3000);
      },
    },
  });

  redisClient.on('connect', () => {
    console.log('[Redis] Connecting to Redis...');
  });

  redisClient.on('ready', () => {
    isReady = true;
    console.log('[Redis] Connected and ready to serve requests.');
  });

  redisClient.on('error', (err) => {
    isReady = false;
    console.error('[Redis] Connection Error:', err.message);
  });

  redisClient.on('end', () => {
    isReady = false;
    console.warn('[Redis] Connection closed.');
  });

  (async () => {
    try {
      await redisClient.connect();
    } catch (err) {
      isReady = false;
      console.error('[Redis] Initial connection failed. Operating with graceful fallback:', err.message);
    }
  })();
}

// Helper to check if Redis is live and ready
const isRedisReady = () => isReady && redisClient && redisClient.isOpen;

// Safe wrapper functions that fail-soft without throwing uncaught errors
const safeGet = async (key) => {
  if (!isRedisReady()) return null;
  try {
    return await redisClient.get(key);
  } catch (err) {
    console.error(`[Redis] safeGet failed for key "${key}":`, err.message);
    return null;
  }
};

const safeSet = async (key, value, options) => {
  if (!isRedisReady()) return null;
  try {
    return await redisClient.set(key, value, options);
  } catch (err) {
    console.error(`[Redis] safeSet failed for key "${key}":`, err.message);
    return null;
  }
};

const safeDel = async (keys) => {
  if (!isRedisReady()) return null;
  try {
    return await redisClient.del(keys);
  } catch (err) {
    console.error(`[Redis] safeDel failed for keys:`, err.message);
    return null;
  }
};

const safeIncr = async (key) => {
  if (!isRedisReady()) return null;
  try {
    return await redisClient.incr(key);
  } catch (err) {
    console.error(`[Redis] safeIncr failed for key "${key}":`, err.message);
    return null;
  }
};

const safeExpire = async (key, seconds) => {
  if (!isRedisReady()) return null;
  try {
    return await redisClient.expire(key, seconds);
  } catch (err) {
    console.error(`[Redis] safeExpire failed for key "${key}":`, err.message);
    return null;
  }
};

module.exports = {
  redisClient,
  isRedisReady,
  safeGet,
  safeSet,
  safeDel,
  safeIncr,
  safeExpire,
};
