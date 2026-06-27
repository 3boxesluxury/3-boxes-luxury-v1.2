export async function register() {
  // Only start ai-proxy on the sandbox (not on Vercel serverless)
  if (process.env.NEXT_RUNTIME === 'nodejs' && !process.env.VERCEL) {
    console.log('[instrumentation] Starting ai-proxy server on port 3030...')
    try {
      const { spawn } = await import('child_process')
      const { join } = await import('path')
      const { existsSync } = await import('fs')

      const proxyDir = join(process.cwd(), 'mini-services', 'ai-proxy')
      const proxyScript = join(proxyDir, 'index.ts')

      if (!existsSync(proxyScript)) {
        console.warn('[instrumentation] ai-proxy script not found at', proxyScript)
        return
      }

      let restartCount = 0
      const MAX_RESTARTS = 3

      const startProxy = () => {
        const child = spawn('npx', ['tsx', proxyScript], {
          cwd: proxyDir,
          stdio: ['ignore', 'pipe', 'pipe'],
          detached: false,
        })

        child.stdout.on('data', (data: Buffer) => {
          process.stdout.write(data)
        })

        child.stderr.on('data', (data: Buffer) => {
          process.stderr.write(data)
        })

        child.on('exit', (code: number | null, signal: string | null) => {
          // Code 0 means graceful exit (e.g., port already in use)
          if (code === 0) {
            console.log('[instrumentation] ai-proxy exited gracefully (likely port already in use), not restarting')
            return
          }
          restartCount++
          if (restartCount <= MAX_RESTARTS) {
            console.log(`[instrumentation] ai-proxy exited with code ${code}, signal ${signal}, restarting in 5s... (attempt ${restartCount}/${MAX_RESTARTS})`)
            setTimeout(startProxy, 5000)
          } else {
            console.error(`[instrumentation] ai-proxy failed ${MAX_RESTARTS} times, giving up`)
          }
        })

        child.on('error', (err: Error) => {
          console.error('[instrumentation] Failed to start ai-proxy:', err)
          restartCount++
          if (restartCount <= MAX_RESTARTS) {
            setTimeout(startProxy, 5000)
          }
        })

        console.log('[instrumentation] ai-proxy child process started (PID:', child.pid, ')')
      }

      startProxy()
    } catch (err) {
      console.error('[instrumentation] Failed to start ai-proxy:', err)
    }
  }
}
