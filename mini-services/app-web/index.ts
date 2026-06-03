import { serve } from 'bun';
import { readdir, stat, readFile } from 'fs/promises';
import { join, extname } from 'path';

const PORT = 3002;
const WEB_DIR = join(import.meta.dir, '../../flutter_app/build/web');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.css': 'text/css',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.ico': 'image/x-icon',
};

serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname;

    // Security: prevent directory traversal
    if (path.includes('..')) {
      return new Response('Forbidden', { status: 403 });
    }

    // Default to index.html for root or unknown paths (SPA routing)
    let filePath = join(WEB_DIR, path);
    
    try {
      const fileStat = await stat(filePath);
      if (fileStat.isDirectory()) {
        filePath = join(filePath, 'index.html');
      }
    } catch {
      // If file not found, serve index.html (SPA fallback)
      filePath = join(WEB_DIR, 'index.html');
    }

    try {
      const file = await readFile(filePath);
      const ext = extname(filePath);
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      return new Response(file, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch {
      // Final fallback to index.html
      try {
        const indexFile = await readFile(join(WEB_DIR, 'index.html'));
        return new Response(indexFile, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      } catch {
        return new Response('Not Found', { status: 404 });
      }
    }
  },
});

console.log(`3 BOXES LUXURY app serving on port ${PORT}`);
