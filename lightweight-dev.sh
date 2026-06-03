#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=256"
# Run without turbopack
exec node node_modules/.bin/next dev -p 3000
