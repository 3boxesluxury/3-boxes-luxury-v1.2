#!/bin/bash
trap 'echo "[$(date)] Received signal: $SIG" >> /home/z/my-project/signal.log' SIGTERM SIGINT SIGHUP SIGUSR1 SIGUSR2
cd /home/z/my-project
exec node node_modules/.bin/next dev -p 3000 >> /home/z/my-project/dev.log 2>&1
