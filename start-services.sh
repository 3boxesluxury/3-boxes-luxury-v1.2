#!/bin/bash
# Start Next.js dev server
cd /home/z/my-project
npx next dev -p 3000 > /home/z/my-project/dev.log 2>&1 &
NEXT_PID=$!
echo "Next.js PID: $NEXT_PID"

# Start AI Proxy
cd /home/z/my-project/mini-services/ai-proxy
npx tsx index.ts > /tmp/ai-proxy.log 2>&1 &
PROXY_PID=$!
echo "AI Proxy PID: $PROXY_PID"

# Wait for services to start
sleep 5
echo "Services started"
echo "Next.js PID: $NEXT_PID"
echo "AI Proxy PID: $PROXY_PID"

# Keep the script running
wait
