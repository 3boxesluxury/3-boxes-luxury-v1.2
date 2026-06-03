#!/bin/bash
while true; do
  cd /home/z/my-project
  node node_modules/.bin/next dev -p 3000 2>>/home/z/my-project/dev.log &
  PID=$!
  # Wait for ready
  for i in $(seq 1 30); do
    sleep 0.3
    curl -s -o /dev/null http://localhost:3000/ 2>/dev/null && break
  done
  # Keep alive while server runs
  while kill -0 $PID 2>/dev/null; do
    sleep 0.5
  done
  sleep 0.5
done
