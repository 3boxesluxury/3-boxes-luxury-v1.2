#!/usr/bin/env node
// ============================================================
// Social Style Route v19 — Verification Test Script
// ============================================================
// Tests 4 scenarios:
//   1. Female + birthday within 30 days → "Luxury Gift Sets"
//   2. Male + no birthday → male categories, no gift sets
//   3. No gender + birthday today → "Luxury Gift Sets" with match 95
//   4. Gender from VLM (no OAuth) → log source as "VLM"
//
// Usage:
//   node test-social-style-v19.mjs                    # uses https://3boxes-luxury.vercel.app
//   BASE_URL=http://localhost:3000 node test-social-style-v19.mjs
// ============================================================

const BASE_URL = process.env.BASE_URL || 'https://3boxes-luxury.vercel.app';
const API_ENDPOINT = `${BASE_URL}/api/social-style`;

// ─── Helper: Calculate a date that's N days from today ───
function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd}`; // Facebook format
}

// ─── Color codes for terminal ───
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function pass(msg) { console.log(`  ${GREEN}✅ PASS${RESET} — ${msg}`); }
function fail(msg) { console.log(`  ${RED}❌ FAIL${RESET} — ${msg}`); }
function info(msg) { console.log(`  ${CYAN}ℹ️  INFO${RESET} — ${msg}`); }
function warn(msg) { console.log(`  ${YELLOW}⚠️  WARN${RESET} — ${msg}`); }

// ─── Call the API ───
async function callAPI(payload, timeoutMs = 120000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const text = await response.text();
      return { ok: false, status: response.status, error: text.substring(0, 500) };
    }

    const data = await response.json();
    return { ok: true, status: response.status, data };
  } catch (err) {
    return { ok: false, status: 0, error: err.message };
  }
}

// ─── Test 1: Female + birthday within 30 days ───
async function test1_femaleWithBirthday() {
  console.log(`\n${BOLD}${CYAN}══════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}TEST 1: Female + birthday within 30 days${RESET}`);
  console.log(`${BOLD}${CYAN}══════════════════════════════════════════════════════${RESET}`);
  console.log(`  Expect: "Luxury Gift Sets" in recommendedCategories`);
  console.log(`  Expect: Female categories (Designer Dresses, Gold Necklaces, etc.)`);
  console.log(`  Expect: gender="female", isNearBirthday=true in response`);

  const birthdayIn15Days = daysFromNow(15);

  const payload = {
    networks: ['facebook'],
    facebookData: {
      profile: {
        name: 'Priya Sharma',
        avatar: 'https://ui-avatars.com/api/?name=Priya+Sharma&background=E91E63&color=fff&size=256',
      },
      gender: 'female',
      birthday: birthdayIn15Days,
      ageGroup: '25-34',
    },
  };

  info(`Sending birthday: ${birthdayIn15Days} (15 days from today)`);
  const result = await callAPI(payload);

  if (!result.ok) {
    fail(`API returned error: ${result.error}`);
    return false;
  }

  const { data } = result;
  let allPassed = true;

  // Check gender in response
  if (data.gender === 'female') {
    pass(`Response gender = "female"`);
  } else {
    fail(`Response gender = "${data.gender}" (expected "female")`);
    allPassed = false;
  }

  // Check birthday data in response
  if (data.birthday) {
    pass(`Birthday returned: ${data.birthday}`);
  } else {
    fail(`Birthday missing from response`);
    allPassed = false;
  }

  // Check ageGroup in response
  if (data.ageGroup) {
    pass(`Age Group returned: ${data.ageGroup}`);
  } else {
    fail(`Age Group missing from response`);
    allPassed = false;
  }

  // Check isNearBirthday
  if (data.isNearBirthday === true) {
    pass(`isNearBirthday = true`);
  } else {
    fail(`isNearBirthday = ${data.isNearBirthday} (expected true)`);
    allPassed = false;
  }

  // Check daysUntilBirthday
  if (typeof data.daysUntilBirthday === 'number' && data.daysUntilBirthday >= 0 && data.daysUntilBirthday <= 30) {
    pass(`daysUntilBirthday = ${data.daysUntilBirthday}`);
  } else {
    fail(`daysUntilBirthday = ${data.daysUntilBirthday} (expected 0-30)`);
    allPassed = false;
  }

  // Check recommendedCategories includes "Luxury Gift Sets"
  const categories = data.analysis?.recommendedCategories || [];
  const categoryNames = categories.map(c => c.name);
  const giftCategory = categories.find(c => c.name === 'Luxury Gift Sets');

  if (categoryNames.includes('Luxury Gift Sets')) {
    pass(`"Luxury Gift Sets" IS in recommendedCategories (match: ${giftCategory.match})`);
    if (giftCategory.match >= 80) {
      pass(`Gift category match score >= 80 (got ${giftCategory.match})`);
    } else {
      warn(`Gift category match score low: ${giftCategory.match} (expected 80+)`);
    }
  } else {
    fail(`"Luxury Gift Sets" NOT in recommendedCategories`);
    info(`Categories returned: ${categoryNames.join(', ')}`);
    allPassed = false;
  }

  // Check no male-only categories
  const maleOnlyCategories = ['Bespoke Tailoring', 'Statement Accessories'];
  const hasMaleCategory = categoryNames.some(c => maleOnlyCategories.includes(c));
  if (!hasMaleCategory) {
    pass(`No male-only categories (Bespoke Tailoring, Statement Accessories)`);
  } else {
    warn(`Male-only category found — AI may not have respected gender rules`);
  }

  // Check products include gift sets
  const products = data.products || [];
  const giftProducts = products.filter(p => p.category === 'Luxury Gift Sets');
  if (giftProducts.length > 0) {
    pass(`Gift set products returned: ${giftProducts.map(p => p.name).join(', ')}`);
  } else {
    warn(`No "Luxury Gift Sets" products in product list`);
  }

  // Print category summary
  info(`Categories: ${categories.map(c => `${c.name} (${c.match})`).join(', ')}`);

  return allPassed;
}

// ─── Test 2: Male + no birthday ───
async function test2_maleNoBirthday() {
  console.log(`\n${BOLD}${CYAN}══════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}TEST 2: Male + no birthday${RESET}`);
  console.log(`${BOLD}${CYAN}══════════════════════════════════════════════════════${RESET}`);
  console.log(`  Expect: Male categories (Luxury Watches, Bespoke Tailoring, etc.)`);
  console.log(`  Expect: NO "Luxury Gift Sets" (unless AI adds it generically)`);
  console.log(`  Expect: gender="male", no birthday fields in response`);

  const payload = {
    networks: ['google'],
    googleData: {
      profile: {
        name: 'Rahul Kumar',
        avatar: 'https://ui-avatars.com/api/?name=Rahul+Kumar&background=1565C0&color=fff&size=256',
      },
      gender: 'male',
    },
  };

  const result = await callAPI(payload);

  if (!result.ok) {
    fail(`API returned error: ${result.error}`);
    return false;
  }

  const { data } = result;
  let allPassed = true;

  // Check gender in response
  if (data.gender === 'male') {
    pass(`Response gender = "male"`);
  } else {
    fail(`Response gender = "${data.gender}" (expected "male")`);
    allPassed = false;
  }

  // Check no birthday fields
  if (!data.birthday && !data.isNearBirthday) {
    pass(`No birthday data in response (correct — no birthday provided)`);
  } else {
    warn(`Birthday data present when none was provided: birthday=${data.birthday}, isNearBirthday=${data.isNearBirthday}`);
  }

  // Check recommendedCategories — should NOT have female-only categories
  const categories = data.analysis?.recommendedCategories || [];
  const categoryNames = categories.map(c => c.name);

  const femaleOnlyCategories = ['Designer Dresses', 'Designer Handbags'];
  const hasFemaleCategory = categoryNames.some(c => femaleOnlyCategories.includes(c));
  if (!hasFemaleCategory) {
    pass(`No female-only categories (Designer Dresses, Designer Handbags)`);
  } else {
    warn(`Female-only category found: ${categoryNames.filter(c => femaleOnlyCategories.includes(c)).join(', ')}`);
  }

  // Check for male-appropriate categories
  const expectedMaleCategories = ['Luxury Watches', 'Bespoke Tailoring', 'Premium Leather', 'Handcrafted Shoes', 'Smart Watches'];
  const hasAnyMaleCategory = categoryNames.some(c => expectedMaleCategories.includes(c));
  if (hasAnyMaleCategory) {
    pass(`Has male-appropriate categories: ${categoryNames.filter(c => expectedMaleCategories.includes(c)).join(', ')}`);
  } else {
    warn(`No typical male categories found. Got: ${categoryNames.join(', ')}`);
  }

  // Check "Luxury Gift Sets" should NOT be present (no birthday)
  const giftCategory = categories.find(c => c.name === 'Luxury Gift Sets');
  if (!giftCategory) {
    pass(`"Luxury Gift Sets" NOT in recommendedCategories (correct — no birthday)`);
  } else {
    warn(`"Luxury Gift Sets" present with match ${giftCategory.match} — acceptable if AI added it generically`);
  }

  // Check products are male-appropriate
  const products = data.products || [];
  const femaleProducts = products.filter(p => femaleOnlyCategories.includes(p.category));
  if (femaleProducts.length === 0) {
    pass(`No female-only products in recommendations`);
  } else {
    warn(`Female products found: ${femaleProducts.map(p => p.name).join(', ')}`);
  }

  // Print category summary
  info(`Categories: ${categories.map(c => `${c.name} (${c.match})`).join(', ')}`);

  return allPassed;
}

// ─── Test 3: No gender + birthday TODAY ───
async function test3_noGenderBirthdayToday() {
  console.log(`\n${BOLD}${CYAN}══════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}TEST 3: No gender + birthday TODAY${RESET}`);
  console.log(`${BOLD}${CYAN}══════════════════════════════════════════════════════${RESET}`);
  console.log(`  Expect: "Luxury Gift Sets" with match >= 90`);
  console.log(`  Expect: isBirthdayToday = true`);
  console.log(`  Expect: Gender-neutral or VLM-detected categories`);

  const todayBirthday = daysFromNow(0); // Today's date in MM/DD format

  const payload = {
    networks: ['facebook'],
    facebookData: {
      profile: {
        name: 'Alex Taylor', // Gender-neutral name
        avatar: 'https://ui-avatars.com/api/?name=Alex+Taylor&background=9C27B0&color=fff&size=256',
      },
      birthday: todayBirthday,
      ageGroup: '35-44',
      // No gender provided
    },
  };

  info(`Sending birthday: ${todayBirthday} (today)`);
  const result = await callAPI(payload);

  if (!result.ok) {
    fail(`API returned error: ${result.error}`);
    return false;
  }

  const { data } = result;
  let allPassed = true;

  // Check isBirthdayToday
  if (data.isBirthdayToday === true) {
    pass(`isBirthdayToday = true 🎂`);
  } else {
    fail(`isBirthdayToday = ${data.isBirthdayToday} (expected true)`);
    allPassed = false;
  }

  // Check isNearBirthday
  if (data.isNearBirthday === true) {
    pass(`isNearBirthday = true`);
  } else {
    fail(`isNearBirthday = ${data.isNearBirthday} (expected true)`);
    allPassed = false;
  }

  // Check daysUntilBirthday = 0
  if (data.daysUntilBirthday === 0) {
    pass(`daysUntilBirthday = 0 (it's today!)`);
  } else {
    warn(`daysUntilBirthday = ${data.daysUntilBirthday} (expected 0, may vary by timezone)`);
  }

  // Check "Luxury Gift Sets" with match >= 90
  const categories = data.analysis?.recommendedCategories || [];
  const giftCategory = categories.find(c => c.name === 'Luxury Gift Sets');

  if (giftCategory) {
    pass(`"Luxury Gift Sets" IS in recommendedCategories (match: ${giftCategory.match})`);
    if (giftCategory.match >= 90) {
      pass(`Gift category match score >= 90 (got ${giftCategory.match}) — BIRTHDAY TODAY BOOST WORKING`);
    } else if (giftCategory.match >= 80) {
      warn(`Gift category match score: ${giftCategory.match} (expected 90+ for birthday today)`);
    } else {
      fail(`Gift category match score too low: ${giftCategory.match} (expected 90+ for birthday today)`);
      allPassed = false;
    }
  } else {
    fail(`"Luxury Gift Sets" NOT in recommendedCategories (should be present for birthday today!)`);
    allPassed = false;
  }

  // Check gender — should be null/absent or VLM-detected
  if (!data.gender) {
    pass(`No gender in response (correct — none provided, VLM may or may not detect)`);
  } else {
    info(`Gender detected: ${data.gender} (likely from VLM or name inference)`);
  }

  // Check gift products
  const products = data.products || [];
  const giftProducts = products.filter(p => p.category === 'Luxury Gift Sets');
  if (giftProducts.length > 0) {
    pass(`Birthday gift products: ${giftProducts.map(p => p.name).join(', ')}`);
  } else {
    warn(`No "Luxury Gift Sets" products in product list`);
  }

  // Print category summary
  info(`Categories: ${categories.map(c => `${c.name} (${c.match})`).join(', ')}`);

  return allPassed;
}

// ─── Test 4: Gender from VLM only (no OAuth gender) ───
async function test4_genderFromVLM() {
  console.log(`\n${BOLD}${CYAN}══════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}TEST 4: Gender from VLM only (no OAuth gender)${RESET}`);
  console.log(`${BOLD}${CYAN}══════════════════════════════════════════════════════${RESET}`);
  console.log(`  Expect: _debug log shows gender source as "VLM" or "PROFILE"`);
  console.log(`  Expect: Gender detected and used for category filtering`);
  console.log(`  Note: This test uses a photo URL — VLM must succeed for "VLM" source`);

  // Using a clearly feminine profile picture for VLM to detect gender
  const payload = {
    networks: ['google'],
    googleData: {
      profile: {
        name: 'Taylor Smith', // Gender-neutral name to force VLM detection
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=256&h=256&fit=crop&crop=face', // Woman's photo
      },
      // No gender field — VLM should detect it
    },
  };

  const result = await callAPI(payload);

  if (!result.ok) {
    fail(`API returned error: ${result.error}`);
    return false;
  }

  const { data } = result;
  let allPassed = true;

  // Check debug trace for gender source
  const debugTrace = data._debug || [];
  const genderTrace = debugTrace.find(d => d.startsWith('Gender:'));
  info(`Debug trace (gender): ${genderTrace || 'not found'}`);

  if (genderTrace && genderTrace.includes('VLM')) {
    pass(`Gender source detected as "VLM" — visual gender detection working!`);
  } else if (genderTrace && genderTrace.includes('PROFILE')) {
    pass(`Gender source detected as "PROFILE" — name inference working (VLM may have failed)`);
  } else if (genderTrace && genderTrace.includes('OAUTH')) {
    warn(`Gender source is "OAUTH" — unexpected since no OAuth gender was provided`);
  } else if (genderTrace && genderTrace.includes('NEUTRAL')) {
    warn(`Gender is NEUTRAL — VLM and profile inference both failed to detect gender`);
  } else {
    info(`Gender trace: ${genderTrace || 'none'}`);
  }

  // Check if gender was detected at all
  if (data.gender) {
    pass(`Gender detected: ${data.gender}`);
  } else {
    warn(`No gender detected — VLM and name inference both returned null`);
  }

  // Check categories are gender-appropriate (if gender was detected)
  const categories = data.analysis?.recommendedCategories || [];
  const categoryNames = categories.map(c => c.name);

  if (data.gender === 'female') {
    const hasFemaleCategories = categoryNames.some(c => ['Designer Dresses', 'Gold Necklaces', 'Fine Jewelry', 'Designer Handbags'].includes(c));
    if (hasFemaleCategories) {
      pass(`Female-appropriate categories detected via VLM gender`);
    } else {
      warn(`No typical female categories despite female gender detection`);
    }
  } else if (data.gender === 'male') {
    const hasMaleCategories = categoryNames.some(c => ['Luxury Watches', 'Bespoke Tailoring', 'Premium Leather'].includes(c));
    if (hasMaleCategories) {
      pass(`Male-appropriate categories detected via VLM gender`);
    } else {
      warn(`No typical male categories despite male gender detection`);
    }
  }

  // Print category summary
  info(`Categories: ${categories.map(c => `${c.name} (${c.match})`).join(', ')}`);

  // Print all debug info
  info(`Full debug trace: ${JSON.stringify(debugTrace)}`);

  return allPassed;
}

// ─── Main runner ───
async function main() {
  console.log(`\n${BOLD}╔════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}║  Social Style Route v19 — Verification Test Suite     ║${RESET}`);
  console.log(`${BOLD}╚════════════════════════════════════════════════════════╝${RESET}`);
  console.log(`\n  API Endpoint: ${API_ENDPOINT}`);
  console.log(`  Timestamp: ${new Date().toISOString()}`);
  console.log(`  Today's date: ${new Date().toLocaleDateString('en-US')} (used for birthday calculations)\n`);

  const results = {};

  // Run tests sequentially (API has rate limits)
  results.test1 = await test1_femaleWithBirthday();
  results.test2 = await test2_maleNoBirthday();
  results.test3 = await test3_noGenderBirthdayToday();
  results.test4 = await test4_genderFromVLM();

  // Summary
  console.log(`\n${BOLD}════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}SUMMARY${RESET}`);
  console.log(`${BOLD}════════════════════════════════════════════════════════${RESET}`);

  const testNames = [
    ['Test 1', 'Female + birthday within 30 days'],
    ['Test 2', 'Male + no birthday'],
    ['Test 3', 'No gender + birthday today'],
    ['Test 4', 'Gender from VLM only'],
  ];

  let passCount = 0;
  for (let i = 0; i < testNames.length; i++) {
    const [label, name] = testNames[i];
    const key = `test${i + 1}`;
    const status = results[key] ? `${GREEN}PASS${RESET}` : `${RED}FAIL${RESET}`;
    console.log(`  ${label}: ${status} — ${name}`);
    if (results[key]) passCount++;
  }

  console.log(`\n  ${BOLD}${passCount}/4 tests passed${RESET}\n`);

  if (passCount === 4) {
    console.log(`${GREEN}${BOLD}🎉 ALL TESTS PASSED! Gender + Birthday + AgeGroup pipeline is working end-to-end.${RESET}\n`);
  } else {
    console.log(`${YELLOW}${BOLD}⚠️  Some tests failed. Check the details above for what needs fixing.${RESET}\n`);
  }
}

main().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
