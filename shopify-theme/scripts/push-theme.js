#!/usr/bin/env node
/**
 * Push 3 BOXES LUXURY Shopify Theme to Shopify
 * Uses the Admin API to create a theme and upload all files
 * 
 * Usage: node push-theme.js
 * 
 * Make sure SHOPIFY_ADMIN_TOKEN env var is set, or update below.
 */

const fs = require('fs');
const path = require('path');

const STORE_DOMAIN = '3boxesluxury-2.myshopify.com';
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN || 'YOUR_SHOPIFY_ADMIN_TOKEN';
const API_VERSION = '2025-01';
const BASE_URL = `https://${STORE_DOMAIN}/admin/api/${API_VERSION}`;
const THEME_DIR = path.join(__dirname, '..');

const headers = {
  'X-Shopify-Access-Token': ADMIN_TOKEN,
  'Content-Type': 'application/json',
};

async function shopifyFetch(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
  const text = await res.text();
  
  if (res.status === 429) {
    const retryAfter = parseFloat(res.headers.get('Retry-After') || '2');
    console.log(`  ⏳ Rate limited, waiting ${retryAfter}s...`);
    await new Promise(r => setTimeout(r, retryAfter * 1000));
    return shopifyFetch(url, options);
  }
  
  if (!res.ok) {
    console.error(`  ❌ Error ${res.status}: ${text.substring(0, 300)}`);
    return null;
  }
  
  try { return JSON.parse(text); } catch { return { ok: true }; }
}

async function createTheme(name) {
  console.log(`🎨 Creating theme "${name}"...`);
  const data = await shopifyFetch(`${BASE_URL}/themes.json`, {
    method: 'POST',
    body: JSON.stringify({ theme: { name, role: 'unpublished' } }),
  });
  
  if (data && data.theme) {
    console.log(`  ✅ Theme created! ID: ${data.theme.id}`);
    return data.theme.id;
  }
  return null;
}

async function listThemes() {
  const data = await shopifyFetch(`${BASE_URL}/themes.json`);
  return data ? data.themes : [];
}

async function uploadAsset(themeId, key, value) {
  const payload = { asset: { key, value } };
  const data = await shopifyFetch(`${BASE_URL}/themes/${themeId}/assets.json`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return data && data.asset;
}

async function uploadBinaryAsset(themeId, key, filePath) {
  const fileContent = fs.readFileSync(filePath);
  const base64 = fileContent.toString('base64');
  const payload = { asset: { key, attachment: base64 } };
  const data = await shopifyFetch(`${BASE_URL}/themes/${themeId}/assets.json`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return data && data.asset;
}

function getFiles(dir, prefix) {
  const dirPath = path.join(THEME_DIR, dir);
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath)
    .filter(e => !e.startsWith('.') && !e.endsWith('.zip'))
    .map(e => ({ key: `${prefix}${e}`, path: path.join(dirPath, e) }))
    .filter(f => fs.statSync(f.path).isFile());
}

async function uploadAllFiles(themeId) {
  // Upload in correct order: layout → snippets → sections → assets → config → locales → templates
  const orderedFiles = [
    ...getFiles('layout', 'layout/'),
    ...getFiles('snippets', 'snippets/'),
    ...getFiles('sections', 'sections/'),
    ...getFiles('assets', 'assets/'),
    ...getFiles('config', 'config/'),
    ...getFiles('locales', 'locales/'),
    ...getFiles('templates', 'templates/'),
  ];
  
  console.log(`\n📤 Uploading ${orderedFiles.length} files to theme ${themeId}...\n`);
  
  let success = 0, failed = 0;
  
  for (let i = 0; i < orderedFiles.length; i++) {
    const { key, path: filePath } = orderedFiles[i];
    const ext = path.extname(filePath).toLowerCase();
    const isBinary = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.woff', '.woff2', '.ttf', '.otf'].includes(ext);
    
    process.stdout.write(`  [${String(i + 1).padStart(2)}/${orderedFiles.length}] ${key.padEnd(45)} `);
    
    try {
      let result;
      if (isBinary) {
        result = await uploadBinaryAsset(themeId, key, filePath);
      } else {
        const content = fs.readFileSync(filePath, 'utf-8');
        result = await uploadAsset(themeId, key, content);
      }
      
      if (result) {
        console.log('✅');
        success++;
      } else {
        console.log('❌');
        failed++;
      }
    } catch (err) {
      console.log(`❌ ${err.message}`);
      failed++;
    }
    
    await new Promise(r => setTimeout(r, 400));
  }
  
  console.log(`\n📊 ${success} succeeded, ${failed} failed out of ${orderedFiles.length} files`);
  return failed === 0;
}

async function main() {
  const command = process.argv[2] || 'push';
  
  console.log('🚀 3 BOXES LUXURY — Shopify Theme Manager\n');
  console.log(`Store: ${STORE_DOMAIN}\n`);
  
  if (command === 'list') {
    const themes = await listThemes();
    console.log('📋 Themes:\n');
    themes.forEach(t => {
      const role = t.role === 'main' ? '🟢 LIVE' : '⚪ ' + t.role;
      console.log(`  ${role}  ${t.name} (ID: ${t.id})${t.previewable ? ' ✨ previewable' : ''}`);
    });
    return;
  }
  
  if (command === 'push') {
    const themeName = process.argv[3] || '3 Boxes Luxury';
    
    // Check if theme already exists
    const themes = await listThemes();
    const existing = themes.find(t => t.name === themeName);
    
    let themeId;
    if (existing) {
      console.log(`📦 Found existing theme "${themeName}" (ID: ${existing.id})`);
      themeId = existing.id;
    } else {
      themeId = await createTheme(themeName);
      if (!themeId) {
        console.error('Failed to create theme. Exiting.');
        process.exit(1);
      }
    }
    
    const success = await uploadAllFiles(themeId);
    
    if (success) {
      console.log(`\n🎉 Theme "${themeName}" pushed successfully!`);
    } else {
      console.log(`\n⚠️  Some files had issues. Check errors above.`);
    }
    
    console.log(`\n📌 Next steps:`);
    console.log(`  1. Go to https://${STORE_DOMAIN}/admin/themes`);
    console.log(`  2. Find "${themeName}" and click "Customize"`);
    console.log(`  3. Configure: upload logo, set hero image, choose collections`);
    console.log(`  4. Click "Publish" when ready!`);
    return;
  }
  
  console.log('Usage: node push-theme.js [push|list] [theme-name]');
}

main().catch(console.error);
