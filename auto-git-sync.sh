#!/bin/bash
# ============================================================
# Auto Git Sync Daemon for 3 BOXES LUXURY
# Watches for code & documentation changes and auto-pushes
# to GitHub: https://github.com/pmkshar/3-boxes-luxury
# ============================================================

PROJECT_DIR="/home/z/my-project"
SYNC_INTERVAL=30  # Check every 30 seconds
LOG_FILE="$PROJECT_DIR/git-sync.log"
BRANCH="main"
PID_FILE="$PROJECT_DIR/.git-sync-pid"

# Prevent duplicate instances
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE" 2>/dev/null)
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Daemon already running (PID $OLD_PID), exiting." >> "$LOG_FILE"
    exit 0
  fi
fi
echo $$ > "$PID_FILE"

# Ensure we're in the project directory
cd "$PROJECT_DIR" || exit 1

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Cleanup function
cleanup() {
  log "🛑 Auto Git Sync Daemon stopping..."
  rm -f "$PID_FILE"
  exit 0
}

trap cleanup SIGTERM SIGINT SIGHUP

log "🚀 Auto Git Sync Daemon started (PID $$, checking every ${SYNC_INTERVAL}s)"

# Initial sync on startup
initial_sync() {
  CHANGES=$(git status --porcelain 2>/dev/null)
  
  if [ -n "$CHANGES" ]; then
    log "📦 Initial sync: Found $(echo "$CHANGES" | wc -l) pending change(s)"
    sync_changes
  else
    LOCAL=$(git rev-parse HEAD 2>/dev/null)
    REMOTE=$(git rev-parse "origin/$BRANCH" 2>/dev/null 2>&1 || echo "")
    if [ "$LOCAL" != "$REMOTE" ]; then
      log "📦 Initial sync: Local ahead of remote, pushing..."
      git push origin "$BRANCH" >> "$LOG_FILE" 2>&1
      if [ $? -eq 0 ]; then
        log "✅ Initial push successful"
      else
        log "❌ Initial push failed - will retry"
      fi
    else
      log "✅ Initial sync: Everything up to date"
    fi
  fi
}

sync_changes() {
  # Stage all changes (respecting .gitignore)
  git add -A >> /dev/null 2>&1
  
  # Check if there's anything to commit
  STAGED=$(git diff --cached --stat 2>/dev/null)
  if [ -z "$STAGED" ]; then
    return 0
  fi
  
  # Build meaningful commit message based on what changed
  CHANGED_FILES=$(git diff --cached --name-only 2>/dev/null)
  
  # Detect change categories for better commit messages
  local msg_parts=()
  
  if echo "$CHANGED_FILES" | grep -q "flutter_app/lib/"; then
    msg_parts+=("mobile")
  fi
  if echo "$CHANGED_FILES" | grep -q "src/app/api/"; then
    msg_parts+=("api")
  fi
  if echo "$CHANGED_FILES" | grep -q "src/components/"; then
    msg_parts+=("ui")
  fi
  if echo "$CHANGED_FILES" | grep -q "Technical_Document\|\.pdf\|README\|docs"; then
    msg_parts+=("docs")
  fi
  if echo "$CHANGED_FILES" | grep -q "prisma/"; then
    msg_parts+=("db")
  fi
  if echo "$CHANGED_FILES" | grep -q "public/images\|public/uploads\|public/app"; then
    msg_parts+=("assets")
  fi
  if echo "$CHANGED_FILES" | grep -q "src/lib/"; then
    msg_parts+=("lib")
  fi
  if echo "$CHANGED_FILES" | grep -q "src/hooks/"; then
    msg_parts+=("hooks")
  fi
  
  # Build commit message
  if [ ${#msg_parts[@]} -gt 0 ]; then
    COMMIT_MSG="auto-sync(${msg_parts[*]}): "
  else
    COMMIT_MSG="auto-sync: "
  fi
  
  # Count files
  FILE_COUNT=$(echo "$CHANGED_FILES" | wc -l)
  COMMIT_MSG="${COMMIT_MSG}${FILE_COUNT} file(s) changed"
  
  # Commit
  git commit -m "$COMMIT_MSG" >> /dev/null 2>&1
  if [ $? -ne 0 ]; then
    log "⚠️ Commit failed (possibly no changes)"
    return 1
  fi
  
  log "📝 Committed: $COMMIT_MSG"
  
  # Push to GitHub with retry
  local retry=0
  local max_retries=3
  while [ $retry -lt $max_retries ]; do
    git push origin "$BRANCH" >> "$LOG_FILE" 2>&1
    if [ $? -eq 0 ]; then
      log "✅ Pushed to GitHub successfully"
      return 0
    fi
    retry=$((retry + 1))
    log "⚠️ Push attempt $retry failed, retrying in 10s..."
    sleep 10
  done
  
  log "❌ Push failed after $max_retries attempts - will retry next cycle"
  return 1
}

# Main loop
initial_sync

while true; do
  sleep "$SYNC_INTERVAL"
  
  # Check for any file changes
  CHANGES=$(git status --porcelain 2>/dev/null)
  
  if [ -n "$CHANGES" ]; then
    CHANGED_COUNT=$(echo "$CHANGES" | wc -l)
    log "🔄 Detected $CHANGED_COUNT changed file(s), syncing..."
    sync_changes
  fi
done
