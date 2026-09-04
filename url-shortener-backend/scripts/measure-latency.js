const https = require('https');

async function measure() {
  const targetUrl = process.argv[2] || 'https://snaplink-n0r3.onrender.com/yyt';

  console.log(`\nMeasuring server latency for ${targetUrl} (20 requests)...`);

  const times = [];

  for (let i = 1; i <= 20; i++) {
    await new Promise((resolve) => {
      https.get(targetUrl, (res) => {
        const header = res.headers['x-response-time'];
        if (header) {
          const ms = parseFloat(header);
          times.push(ms);
          process.stdout.write(`.`);
        }
        res.resume();
        resolve();
      }).on('error', (err) => {
        console.error(`Req error:`, err.message);
        resolve();
      });
    });
  }

  if (times.length === 0) {
    console.error('\n❌ No X-Response-Time headers received.');
    process.exit(1);
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;

  console.log('\n\n===========================================');
  console.log('       PRODUCTION SERVER LATENCY REPORT    ');
  console.log('===========================================');
  console.log(` Target URL     : ${targetUrl}`);
  console.log(` Samples        : ${times.length} requests`);
  console.log(` Average Latency: ${avg.toFixed(2)} ms  🚀`);
  console.log(` Minimum Latency: ${Math.min(...times).toFixed(2)} ms`);
  console.log(` Maximum Latency: ${Math.max(...times).toFixed(2)} ms`);
  console.log('===========================================\n');
}

measure();
