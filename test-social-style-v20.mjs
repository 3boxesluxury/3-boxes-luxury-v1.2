// ============================================================
// Test Script for Social Style Route v20 (YouTube-Enhanced)
// ============================================================
//
// Usage: node test-social-style-v20.mjs
//
// Tests:
//   1. v20 route without YouTube token (should work like v19)
//   2. v20 route with invalid YouTube token (should gracefully degrade)
//   3. v20 route birthday detection (today = 0 days)
//   4. v20 route gender detection from profile names
//
// Note: Real YouTube subscription fetch requires a valid Google OAuth token.
//       These tests verify the route handles missing/invalid tokens gracefully.
//
// ============================================================

const BASE_URL = process.env.BASE_URL || 'https://3-boxes-luxury-v1-2.vercel.app';

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
  } catch (err) {
    console.log(`❌ FAIL: ${name} — ${err.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

// ─── Test 1: v20 without YouTube token (same as v19) ───

async function testWithoutYouTubeToken() {
  const response = await fetch(`${BASE_URL}/api/social-style`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      networks: ['google'],
      googleData: {
        profile: { name: 'Priya Sharma' },
        gender: 'female',
      },
    }),
  });

  assert(response.ok, `Expected 200, got ${response.status}`);
  const data = await response.json();
  assert(data.analysis, 'Should return analysis');
  assert(data.products, 'Should return products');
  assert(Array.isArray(data.products), 'Products should be array');
  console.log(`   Products returned: ${data.products.length}`);
}

// ─── Test 2: v20 with invalid YouTube token (graceful degradation) ───

async function testWithInvalidYouTubeToken() {
  const response = await fetch(`${BASE_URL}/api/social-style`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      networks: ['google'],
      googleData: {
        profile: { name: 'Rahul Kumar' },
        gender: 'male',
      },
      googleAccessToken: 'invalid-test-token-12345',
    }),
  });

  // Should still return 200 — YouTube fetch fails gracefully
  assert(response.ok, `Expected 200, got ${response.status}`);
  const data = await response.json();
  assert(data.analysis, 'Should return analysis even with invalid YouTube token');
  assert(data.products, 'Should return products even with invalid YouTube token');
  console.log(`   Products returned: ${data.products.length}`);
}

// ─── Test 3: Birthday TODAY detection ───

async function testBirthdayToday() {
  const today = new Date();
  const birthday = `${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}`;

  const response = await fetch(`${BASE_URL}/api/social-style`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      networks: ['google'],
      googleData: {
        profile: { name: 'Test User' },
        gender: 'female',
        birthday: birthday,
        ageGroup: '25-34',
      },
    }),
  });

  assert(response.ok, `Expected 200, got ${response.status}`);
  const data = await response.json();
  assert(data.analysis, 'Should return analysis');

  // Check if birthday gift products are boosted (indicates birthday was detected)
  const hasBirthdayProduct = data.products?.some(p =>
    p.reason?.toLowerCase().includes('birthday') ||
    p.name?.toLowerCase().includes('birthday') ||
    p.name?.toLowerCase().includes('gift')
  );
  console.log(`   Birthday today: ${birthday}, birthday products found: ${hasBirthdayProduct}`);
}

// ─── Test 4: Gender-aware product filtering ───

async function testGenderAwareProducts() {
  // Test male
  const maleResponse = await fetch(`${BASE_URL}/api/social-style`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      networks: ['google'],
      googleData: {
        profile: { name: 'Vikram Singh' },
        gender: 'male',
      },
    }),
  });

  assert(maleResponse.ok, 'Male request should succeed');
  const maleData = await maleResponse.json();
  const maleCategories = maleData.analysis?.recommendedCategories?.map(c => c.name || c) || [];
  console.log(`   Male categories: ${maleCategories.join(', ')}`);

  // Test female
  const femaleResponse = await fetch(`${BASE_URL}/api/social-style`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      networks: ['google'],
      googleData: {
        profile: { name: 'Ananya Patel' },
        gender: 'female',
      },
    }),
  });

  assert(femaleResponse.ok, 'Female request should succeed');
  const femaleData = await femaleResponse.json();
  const femaleCategories = femaleData.analysis?.recommendedCategories?.map(c => c.name || c) || [];
  console.log(`   Female categories: ${femaleCategories.join(', ')}`);
}

// ─── Run all tests ───

async function main() {
  console.log('');
  console.log('=== Social Style Route v20 Test Suite ===');
  console.log(`Target: ${BASE_URL}/api/social-style`);
  console.log('');

  await test('Test 1: Without YouTube token (v19 compatible)', testWithoutYouTubeToken);
  await test('Test 2: Invalid YouTube token (graceful degradation)', testWithInvalidYouTubeToken);
  await test('Test 3: Birthday TODAY detection', testBirthdayToday);
  await test('Test 4: Gender-aware products', testGenderAwareProducts);

  console.log('');
  console.log('=== All tests completed ===');
  console.log('');
  console.log('NOTE: To test real YouTube subscription fetching,');
  console.log('provide a valid googleAccessToken from Google OAuth');
  console.log('with youtube.readonly scope.');
}

main().catch(console.error);
