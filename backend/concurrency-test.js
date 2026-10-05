const http = require('http');

/**
 * Concurrency Test: Fires 100 simultaneous requests at a single time to the backend.
 * Measures response status, errors, and throughput latency.
 */
async function sendRequest(index) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const payload = JSON.stringify({
      chapterId: 1,
      taskId: 'ch1-quiz',
      answer: 'A',
      teamId: `team-${index % 10}`, // Distribute across 10 teams
    });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/chapters/validate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const duration = Date.now() - startTime;
        resolve({
          index,
          statusCode: res.statusCode,
          duration,
          success: res.statusCode === 200,
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        index,
        statusCode: 0,
        error: err.message,
        duration: Date.now() - startTime,
        success: false,
      });
    });

    req.write(payload);
    req.end();
  });
}

async function run100ConcurrencyTest() {
  console.log(`\n======================================================`);
  console.log(`  LAUNCHING 100 SIMULTANEOUS REQUESTS AT A SINGLE TIME`);
  console.log(`  Target: POST http://localhost:5000/api/chapters/validate`);
  console.log(`======================================================\n`);

  const wallClockStart = Date.now();

  // Create an array of 100 concurrent promises fired together
  const promises = [];
  for (let i = 0; i < 100; i++) {
    promises.push(sendRequest(i + 1));
  }

  const results = await Promise.all(promises);
  const wallClockEnd = Date.now();
  const totalDuration = wallClockEnd - wallClockStart;

  let successful = 0;
  let failed = 0;
  let rateLimited = 0;
  let totalLatency = 0;

  results.forEach((r) => {
    if (r.statusCode === 200) {
      successful++;
    } else if (r.statusCode === 429) {
      rateLimited++;
      failed++;
    } else {
      failed++;
    }
    totalLatency += r.duration;
  });

  const avgLatency = (totalLatency / results.length).toFixed(1);

  console.log(`--- RESULTS SUMMARY ---`);
  console.log(`Total Requests Fired simultaneously: ${results.length}`);
  console.log(`Successful (HTTP 200):                ${successful}`);
  console.log(`Failed / Dropped:                     ${failed}`);
  console.log(`Rate-limited (HTTP 429):              ${rateLimited}`);
  console.log(`Total Wall-Clock Time:                ${totalDuration}ms`);
  console.log(`Average Latency per Request:          ${avgLatency}ms`);
  console.log(`Throughput:                           ${((100 / totalDuration) * 1000).toFixed(0)} req/sec\n`);

  if (successful === 100) {
    console.log(`[PASS] Server successfully handled all 100 requests concurrently with 0 drops!\n`);
    process.exit(0);
  } else {
    console.error(`[FAIL] Expected 100 successes, but got ${successful}.\n`);
    process.exit(1);
  }
}

run100ConcurrencyTest();
