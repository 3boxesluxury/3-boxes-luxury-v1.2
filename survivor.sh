#!/bin/bash
cd /home/z/my-project
while true; do
  node node_modules/.bin/next dev -p 3000 >> /home/z/my-project/dev.log 2>&1
  EXIT=$?
  echo "[$(date)] Server exited ($EXIT), restarting in 1s..." >> /home/z/my-project/dev.log
  sleep 1
done
