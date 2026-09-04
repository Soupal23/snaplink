const { safeIncr, safeGet, safeSet, isRedisReady } = require('../config/redis');

let memoryHits = 0;
let memoryMisses = 0;

const recordCacheHit = async (code) => {
  console.log(`[CACHE HIT] /${code}`);
  memoryHits++;
  if (isRedisReady()) {
    await safeIncr('stats:cache:hits');
  }
};

const recordCacheMiss = async (code) => {
  console.log(`[CACHE MISS] /${code}`);
  memoryMisses++;
  if (isRedisReady()) {
    await safeIncr('stats:cache:misses');
  }
};

const getCacheStats = async () => {
  let hits = memoryHits;
  let misses = memoryMisses;

  if (isRedisReady()) {
    const rHits = await safeGet('stats:cache:hits');
    const rMisses = await safeGet('stats:cache:misses');
    hits = rHits !== null ? parseInt(rHits, 10) : 0;
    misses = rMisses !== null ? parseInt(rMisses, 10) : 0;
  }

  const total = hits + misses;
  const hitRate = total > 0 ? ((hits / total) * 100).toFixed(2) + '%' : '0.00%';

  return {
    hits,
    misses,
    totalRequests: total,
    hitRate,
    redisConnected: isRedisReady(),
  };
};

const resetCacheStats = async () => {
  memoryHits = 0;
  memoryMisses = 0;
  if (isRedisReady()) {
    await safeSet('stats:cache:hits', '0');
    await safeSet('stats:cache:misses', '0');
  }
  return { message: 'Cache statistics reset successfully.' };
};

module.exports = {
  recordCacheHit,
  recordCacheMiss,
  getCacheStats,
  resetCacheStats,
};
