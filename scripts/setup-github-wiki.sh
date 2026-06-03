#!/bin/bash
# =============================================================================
# setup-github-wiki.sh
# Push the local wiki-repo content to a GitHub wiki
# =============================================================================
#
# Usage:
#   ./scripts/setup-github-wiki.sh <owner>/<repo> [github-token]
#
# Examples:
#   ./scripts/setup-github-wiki.sh 3boxes-luxury/platform
#   ./scripts/setup-github-wiki.sh 3boxes-luxury/platform ghp_xxxxxxxxxxxx
#
# Prerequisites:
#   1. A GitHub repository must exist (or be created first)
#   2. The wiki must be enabled in the repository settings
#   3. Git must be configured with access to GitHub (SSH key or HTTPS token)
#
# =============================================================================

set -euo pipefail

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# --- Configuration ---
WIKI_REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)/wiki-repo"
GITHUB_OWNER_REPO="${1:-}"
GITHUB_TOKEN="${2:-}"

# --- Helper Functions ---
info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# --- Validate Inputs ---
if [ -z "$GITHUB_OWNER_REPO" ]; then
    error "Usage: $0 <owner>/<repo> [github-token]

Examples:
  $0 3boxes-luxury/platform
  $0 3boxes-luxury/platform ghp_xxxxxxxxxxxx

Step 1: Create the GitHub repository (if it doesn't exist):
  Using GitHub CLI:
    gh repo create 3boxes-luxury/platform --private --description \"3 BOXES LUXURY E-Commerce Platform\"

  Or using the GitHub API:
    curl -X POST https://api.github.com/user/repos \\
      -H \"Authorization: token YOUR_TOKEN\" \\
      -d '{\"name\":\"platform\",\"private\":true,\"description\":\"3 BOXES LUXURY E-Commerce Platform\"}'

Step 2: Enable the wiki in repository settings:
  Go to: https://github.com/$GITHUB_OWNER_REPO/settings
  Check \"Wikis\" under Features section

Step 3: Create the first wiki page (required to initialize the wiki git repo):
  Go to: https://github.com/$GITHUB_OWNER_REPO/wiki
  Click \"Create the first page\" and save any content

Step 4: Run this script:
  $0 3boxes-luxury/platform ghp_xxxxxxxxxxxx
"
fi

# --- Validate wiki-repo directory ---
if [ ! -d "$WIKI_REPO_DIR/.git" ]; then
    error "Wiki repo not found at $WIKI_REPO_DIR. Run the wiki setup first."
fi

# --- Build the wiki remote URL ---
if [ -n "$GITHUB_TOKEN" ]; then
    WIKI_REMOTE="https://${GITHUB_TOKEN}@github.com/${GITHUB_OWNER_REPO}.wiki.git"
else
    # Try SSH
    WIKI_REMOTE="git@github.com:${GITHUB_OWNER_REPO}.wiki.git"
fi

info "GitHub Wiki Setup"
info "=================="
info "Repository:  https://github.com/${GITHUB_OWNER_REPO}"
info "Wiki Remote: ${WIKI_REMOTE/https:\/\/[^@]*@/https:\/\/***@}"
info "Local Dir:   ${WIKI_REPO_DIR}"
echo ""

# --- Step 1: Check if the GitHub repo exists ---
info "Step 1: Checking if GitHub repository exists..."
if command -v gh &> /dev/null; then
    if gh repo view "$GITHUB_OWNER_REPO" &> /dev/null; then
        ok "Repository exists: ${GITHUB_OWNER_REPO}"
    else
        error "Repository not found: ${GITHUB_OWNER_REPO}

Create it first:
  gh repo create ${GITHUB_OWNER_REPO} --private --description '3 BOXES LUXURY E-Commerce Platform'
"
    fi
else
    warn "GitHub CLI (gh) not installed. Cannot verify repository existence."
    warn "Make sure the repository https://github.com/${GITHUB_OWNER_REPO} exists."
fi

# --- Step 2: Check if the wiki is enabled ---
info "Step 2: Checking if wiki is enabled..."
info "  Visit https://github.com/${GITHUB_OWNER_REPO}/settings"
info "  Ensure 'Wikis' is checked under Features."
echo ""
read -p "Is the wiki enabled? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    error "Please enable the wiki first, then re-run this script."
fi

# --- Step 3: Initialize the wiki (if needed) ---
info "Step 3: Checking if wiki has been initialized..."
info "  Visit https://github.com/${GITHUB_OWNER_REPO}/wiki"
info "  If you see 'Create the first page', click it and save any content."
echo ""
read -p "Has the wiki been initialized (first page created)? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    error "Please create the first wiki page first, then re-run this script."
fi

# --- Step 4: Set the remote ---
info "Step 4: Setting up git remote..."
cd "$WIKI_REPO_DIR"

# Remove existing wiki remote if present
if git remote | rg -q "^wiki$"; then
    info "  Removing existing 'wiki' remote..."
    git remote remove wiki
fi

git remote add wiki "$WIKI_REMOTE"
ok "Remote 'wiki' added: ${WIKI_REMOTE/https:\/\/[^@]*@/https:\/\/***@}"

# --- Step 5: Pull any existing wiki content ---
info "Step 5: Pulling existing wiki content (if any)..."
git fetch wiki 2>/dev/null || true

# Check if the remote has any commits
if git branch -r | rg -q "wiki/master\|wiki/main"; then
    BRANCH=$(git branch -r | rg "wiki/(master|main)" | head -1 | sed 's/wiki\///' | tr -d ' ')
    info "  Remote branch found: $BRANCH"

    # Try to rebase our content on top of existing wiki content
    # This preserves the initial page created to initialize the wiki
    git rebase "wiki/$BRANCH" 2>/dev/null || {
        warn "  Could not rebase. Force-pushing our content instead."
        warn "  This will overwrite any existing wiki content."
        read -p "  Continue with force push? (y/n) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "Aborted by user."
        fi
    }
else
    info "  No existing wiki content found. Fresh push."
fi

# --- Step 6: Push ---
info "Step 6: Pushing wiki content to GitHub..."
git push wiki HEAD:master --force 2>&1 || {
    error "Push failed. Common causes:

1. Wiki not initialized - Visit https://github.com/${GITHUB_OWNER_REPO}/wiki and create the first page
2. Authentication failed - Provide a GitHub token: $0 ${GITHUB_OWNER_REPO} ghp_xxxxxxxxxxxx
3. Repository not found - Check the owner/repo name

For SSH authentication, ensure your SSH key is added:
  ssh-keygen -t ed25519 -C 'your-email@example.com'
  eval \"\$(ssh-agent -s)\"
  ssh-add ~/.ssh/id_ed25519
  Add the public key to: https://github.com/settings/keys
"
}

echo ""
ok "Wiki successfully pushed!"
echo ""
info "Visit your wiki at:"
info "  https://github.com/${GITHUB_OWNER_REPO}/wiki"
echo ""
info "Wiki pages available:"
info "  - Home (documentation hub)"
info "  - Technical Documentation"
info "  - Functional Documentation"
info "  - Architecture Deep Dive"
info "  - Training Videos"
info "  - Patent Research"
info "  - Patent Application"
echo ""
info "To update the wiki in the future:"
info "  1. Edit files in ${WIKI_REPO_DIR}"
info "  2. cd ${WIKI_REPO_DIR} && git add -A && git commit -m 'Update wiki'"
info "  3. git push wiki master"
echo ""
