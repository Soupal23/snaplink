require('dotenv').config();
const { getCacheStats, resetCacheStats } = require('../utils/cacheStats');
const { isRedisReady } = require('../config/redis');

async function main() {
  const isReset = process.argv.includes('--reset');

  // Wait for Redis connection
  for (let i = 0; i < 10; i++) {
    if (isRedisReady()) break;
    await new Promise((r) => setTimeout(r, 200));
  }

  if (isReset) {
    await resetCacheStats();
    console.log('✅ Cache statistics have been successfully reset.');
    process.exit(0);
  }

  const stats = await getCacheStats();
  console.log('\n========================================');
  console.log('      SNAPLINK CACHE HIT-RATE REPORT    ');
  console.log('========================================');
  console.log(` Redis Status    : ${stats.redisConnected ? 'CONNECTED' : 'OFFLINE (Memory fallback)'}`);
  console.log(` Cache Hits      : ${stats.hits}`);
  console.log(` Cache Misses    : ${stats.misses}`);
  console.log(` Total Requests  : ${stats.totalRequests}`);
  console.log(` Cache Hit Rate  : ${stats.hitRate}`);
  console.log('========================================\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('Error fetching cache stats:', err);
  process.exit(1);
});
