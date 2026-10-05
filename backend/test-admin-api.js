const http = require('http');

function post(path, body, headers = {}) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...headers,
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data || '{}') }));
    });
    req.write(payload);
    req.end();
  });
}

function get(path, headers = {}) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method: 'GET',
      headers,
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data || '{}') }));
    });
    req.end();
  });
}

async function run() {
  console.log('--> Testing POST /api/admin/login');
  const loginRes = await post('/api/admin/login', { passkey: 'HAWKINS_CHIEF_1983' });
  console.log('Login status:', loginRes.status, 'Token:', loginRes.data.token ? 'OK' : 'MISSING');

  const token = loginRes.data.token;
  const headers = { 'Authorization': `Bearer ${token}` };

  console.log('--> Testing GET /api/admin/chapters');
  const chRes = await get('/api/admin/chapters', headers);
  console.log('Admin chapters status:', chRes.status, 'Count:', chRes.data.chapters?.length);
  console.log('Sample Chapter 1 secret answer:', chRes.data.chapters?.[0]?.correctAnswer);

  console.log('--> Testing GET /api/admin/leaderboard');
  const lbRes = await get('/api/admin/leaderboard', headers);
  console.log('Leaderboard status:', lbRes.status, 'Total teams:', lbRes.data.totalTeams);
  console.log('Top team:', lbRes.data.leaderboard?.[0]?.teamName, 'Score:', lbRes.data.leaderboard?.[0]?.score);
}

run();
