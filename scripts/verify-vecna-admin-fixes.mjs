import { io } from 'socket.io-client';

async function testAll() {
  console.log('--- STARTING VERIFICATION OF VECNA & ADMIN TELEMETRY FIXES ---');

  const API_BASE = 'http://127.0.0.1:5000/api';

  // 1. Log in as admin to obtain token
  console.log('1. Admin login...');
  const loginRes = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passkey: '1234567' }),
  });
  const loginData = await loginRes.json();
  if (!loginData.success || !loginData.token) {
    throw new Error(`Admin login failed: ${JSON.stringify(loginData)}`);
  }
  const adminToken = loginData.token;
  console.log('✔ Admin login successful.');

  // 2. Fetch T03 (Vecna team) performance
  console.log('2. Fetching T03 performance telemetry...');
  const perfRes = await fetch(`${API_BASE}/admin/teams/T03/performance`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const perfData = await perfRes.json();
  if (!perfData.success || !perfData.performance) {
    throw new Error(`Get performance failed: ${JSON.stringify(perfData)}`);
  }
  const perf = perfData.performance;
  console.log('✔ Team Overview:', perf.teamOverview);
  console.log(`✔ Stages count: ${perf.stages.length}`);

  const trial1 = perf.stages.find((s) => s.stageId === 1);
  console.log('✔ Trial 1 Name:', trial1?.stageName);
  console.log('✔ Trial 1 Status:', trial1?.status);
  console.log('✔ Trial 1 StartedAt:', trial1?.startedAt);
  console.log('✔ Trial 1 Duration:', trial1?.duration);
  console.log('✔ Trial 1 Points Earned:', trial1?.pointsEarned);
  console.log('✔ Trial 1 Itemized Events count:', trial1?.events?.length);

  if (!trial1?.stageName?.includes('CREEL HOUSE')) {
    throw new Error(`Expected Trial 1 name to include CREEL HOUSE, got: ${trial1?.stageName}`);
  }
  if (trial1?.startedAt === 'Unavailable') {
    throw new Error('Trial 1 startedAt should not be Unavailable when attempts exist!');
  }
  if (trial1?.pointsEarned !== 60) {
    throw new Error(`Expected Trial 1 pointsEarned = 60, got: ${trial1?.pointsEarned}`);
  }
  if (!trial1?.events || trial1.events.length === 0) {
    throw new Error('Trial 1 should have itemized events!');
  }
  console.log('✔ Sample Trial 1 event:', trial1.events[0]);

  // 3. Connect a mock Hawkins player socket and verify stage movement
  console.log('3. Testing Hawkins stage movement sync to Vecna tactical map...');
  const jwt = (await import('../backend/node_modules/jsonwebtoken/index.js')).default;
  const playerToken = jwt.sign(
    {
      teamId: 'T01',
      teamName: 'Null Pointers',
      leaderName: 'Player One',
      role: 'PLAYER',
    },
    'HAWKINS_NATIONAL_LAB_SECRET_KEY_1983',
    { expiresIn: '2h' }
  );

  const playerSocket = io('http://127.0.0.1:5000', {
    auth: {
      token: playerToken,
    },
    transports: ['websocket'],
  });

  await new Promise((resolve, reject) => {
    playerSocket.on('connect', () => {
      console.log('✔ Mock Hawkins player connected to socket.');
      resolve();
    });
    playerSocket.on('connect_error', reject);
    setTimeout(() => reject(new Error('Socket connection timeout')), 4000);
  });

  // Emit presence indicating player moved to Police Station (stageId 2)
  playerSocket.emit('presence', {
    type: 'presence',
    team: 'Null Pointers',
    teamId: 'T01',
    location: 'policeStation',
    stageId: 2,
    score: 10,
    ts: Date.now(),
  });

  // Allow socket event to process in backend
  await new Promise((r) => setTimeout(r, 600));

  // Check tactical map
  const mapRes = await fetch(`${API_BASE}/vecna/tactical-map`);
  const mapData = await mapRes.json();
  const policeStage = mapData.stages.find((s) => s.id === 2);
  const teamInPolice = policeStage?.teams?.find((t) => t.id === 'T01');

  console.log('✔ Tactical Map Stage 2 (Police):', {
    onlineCount: policeStage?.onlineCount,
    teams: policeStage?.teams?.map((t) => ({ id: t.id, name: t.name, stageId: t.stageId })),
  });

  if (!teamInPolice) {
    throw new Error('Expected T01 to be located in Stage 2 (Police Station) on Vecna tactical map!');
  }
  console.log('✔ T01 successfully tracked in Stage 2 (Police Station)!');

  // Test multi-stage movement across stages 3 -> 4 -> 5 -> 6
  const testStages = [
    { stageId: 3, loc: 'byersHouse', name: 'Byers House' },
    { stageId: 4, loc: 'lab', name: 'Hawkins Lab' },
    { stageId: 5, loc: 'radioTower', name: 'Radio Tower' },
    { stageId: 6, loc: 'gate', name: 'The Gate Rift' },
  ];

  for (const stg of testStages) {
    playerSocket.emit('presence', {
      type: 'presence',
      team: 'test team 1',
      teamId: 'T01',
      location: stg.loc,
      stageId: stg.stageId,
      score: 10,
      ts: Date.now(),
    });
    await new Promise((r) => setTimeout(r, 400));
    const mRes = await fetch(`${API_BASE}/vecna/tactical-map`);
    const mData = await mRes.json();
    const activeStg = mData.stages.find((s) => s.id === stg.stageId);
    const hasTeam = activeStg?.teams?.some((t) => t.id === 'T01');
    if (!hasTeam) {
      throw new Error(`Failed to track team in Stage ${stg.stageId} (${stg.name})`);
    }
    console.log(`✔ Dynamically tracked in Stage ${stg.stageId} (${stg.name})!`);
  }

  // Disconnect socket
  playerSocket.disconnect();

  console.log('\n======================================================');
  console.log('★ ALL VECNA & ADMIN TELEMETRY VERIFICATIONS PASSED! ★');
  console.log('======================================================');
}

testAll().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
