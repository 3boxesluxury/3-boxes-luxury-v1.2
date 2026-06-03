#!/bin/bash
while true; do
  cd /home/z/my-project
  setsid bun run dev >> /home/z/my-project/dev.log 2>&1 &
  PID=$!
  # Wait for server to respond
  for i in $(seq 1 20); do
    sleep 0.5
    if curl -s -o /dev/null http://localhost:3000/ 2>/dev/null; then
      echo "[$(date)] Server started PID=$PID" >> /home/z/my-project/respawn.log
      break
    fi
  done
  # Sleep then check
  sleep 8
  # If server died, kill port and restart
  if ! curl -s -o /dev/null http://localhost:3000/ 2>/dev/null; then
    echo "[$(date)] Server died, restarting..." >> /home/z/my-project/respawn.log
    kill $PID 2>/dev/null
    fuser -k 3000/tcp 2>/dev/null
    sleep 1
  else
    # Server still alive, wait longer and keep checking
    while curl -s -o /dev/null http://localhost:3000/ 2>/dev/null; do
      sleep 5
    done
    echo "[$(date)] Server died during runtime" >> /home/z/my-project/respawn.log
    kill $PID 2>/dev/null
    fuser -k 3000/tcp 2>/dev/null
    sleep 1
  fi
done
