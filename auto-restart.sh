#!/bin/bash
while true; do
  cd /home/z/my-project
  # Start server
  node node_modules/.bin/next dev -p 3000 &
  SERVER_PID=$!
  # Wait for it to be ready
  for i in $(seq 1 30); do
    if curl -s -o /dev/null http://localhost:3000/ 2>/dev/null; then
      echo "[$(date)] Server ready PID=$SERVER_PID" >> /home/z/my-project/restart.log
      break
    fi
    sleep 0.5
  done
  # Wait for server to die
  while kill -0 $SERVER_PID 2>/dev/null; do
    sleep 1
  done
  echo "[$(date)] Server PID $SERVER_PID died, restarting..." >> /home/z/my-project/restart.log
  sleep 1
done
