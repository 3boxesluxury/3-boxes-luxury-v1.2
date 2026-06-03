#!/bin/bash
# Keep the Flutter web app service alive
while true; do
  cd /home/z/my-project/mini-services/app-web
  bun index.ts
  sleep 2
done
