// Simple keep-alive wrapper that ensures the ai-proxy stays running
const { spawn } = require('child_process');
const path = require('path');

function startProxy() {
  console.log(`[${new Date().toISOString()}] Starting ai-proxy...`);
  
  const child = spawn('npx', ['tsx', 'index.ts'], {
    cwd: __dirname,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });

  child.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  child.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  child.on('exit', (code, signal) => {
    console.log(`[${new Date().toISOString()}] ai-proxy exited with code ${code}, signal ${signal}, restarting in 3s...`);
    setTimeout(startProxy, 3000);
  });

  child.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Failed to start ai-proxy:`, err);
    setTimeout(startProxy, 3000);
  });
}

startProxy();

// Keep the process alive
process.stdin.resume();
