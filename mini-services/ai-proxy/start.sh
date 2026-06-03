#!/bin/bash
# Auto-restart wrapper for the ai-proxy service
# Keeps the service alive even if it crashes

cd /home/z/my-project/mini-services/ai-proxy

while true; do
  echo "[$(date)] Starting ai-proxy service..."
  npx tsx index.ts
  EXIT_CODE=$?
  echo "[$(date)] ai-proxy exited with code $EXIT_CODE, restarting in 3s..."
  sleep 3
done
