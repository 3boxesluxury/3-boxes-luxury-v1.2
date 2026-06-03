---
Task ID: 1
Agent: main
Task: Permanently fix styled-jsx HMR error in family-shopping.tsx

Work Log:
- Verified family-shopping.tsx has NO styled-jsx imports or usage - file is completely clean
- Verified ALL source files in src/ have zero styled-jsx references
- Verified compiled .next chunks contain zero styled-jsx references
- Identified ROOT CAUSE: The PWA service worker (sw.js) was using cache-first strategy for .js files
- Service worker was intercepting requests for family-shopping_tsx_f9184e61._.js and serving stale cached version that contained the old styled-jsx import
- Turbopack uses deterministic chunk hashing based on module path, not content - so the chunk name stayed the same even after styled-jsx was removed from source
- Browser + Service Worker kept serving the old chunk with styled-jsx reference even though server had clean version

Fixes Applied:
1. Updated sw.js: bumped CACHE_NAME from v3 to v4 to invalidate ALL old caches
2. Updated sw.js: Added special rule for /_next/ paths - ALWAYS fetch from network, never cache (prevents stale HMR chunks)
3. Updated sw.js: Changed JS/CSS asset strategy from cache-first to network-first (prevents stale JS in general)
4. Updated next.config.ts: Added Cache-Control: no-cache, no-store, must-revalidate header for /_next/static/* paths
5. Cleared .next directory and all caches completely
6. Restarted dev server with fresh compilation

Stage Summary:
- Root cause: PWA Service Worker cache-first strategy for .js files + deterministic Turbopack chunk hashes
- Fix: Service worker now uses network-first for all JS and never caches /_next/ paths
- Server-served chunks are verified clean (no styled-jsx)
- Agent browser confirms Family Shopping loads with zero errors
- This fix is permanent - the service worker will no longer cache dev chunks
