const http = require('http');
const { exec, spawn } = require('child_process');

let nextServer = null;
let nextReady = false;

function startNext() {
  console.log('[proxy] Starting Next.js dev server...');
  nextServer = spawn('node', ['node_modules/.bin/next', 'dev', '-p', '3001'], {
    cwd: '/home/z/my-project',
    stdio: 'pipe',
    detached: false
  });
  
  nextServer.stdout.on('data', (data) => {
    const str = data.toString();
    if (str.includes('Ready in')) {
      nextReady = true;
      console.log('[proxy] Next.js is ready');
    }
  });
  
  nextServer.on('exit', (code) => {
    console.log(`[proxy] Next.js exited with code ${code}, restarting in 2s...`);
    nextReady = false;
    setTimeout(startNext, 2000);
  });
}

startNext();

const proxy = http.createServer((req, res) => {
  if (!nextReady) {
    res.writeHead(503, { 'Content-Type': 'text/html' });
    res.end('<html><body><h2>Server is starting...</h2><p>Please wait a moment and refresh.</p></body></html>');
    return;
  }
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: req.url,
    method: req.method,
    headers: req.headers
  };
  
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  
  proxyReq.on('error', (e) => {
    res.writeHead(502, { 'Content-Type': 'text/html' });
    res.end('<html><body><h2>Server error</h2><p>Please try again.</p></body></html>');
  });
  
  req.pipe(proxyReq);
});

proxy.listen(3000, () => {
  console.log('[proxy] Proxy server running on port 3000');
});
