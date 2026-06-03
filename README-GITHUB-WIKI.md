# GitHub Wiki Setup Guide

This document explains how to set up and push the 3 BOXES LUXURY project documentation to a GitHub wiki.

---

## Quick Start

```bash
# From the project root:
./scripts/setup-github-wiki.sh <owner>/<repo> [github-token]

# Example:
./scripts/setup-github-wiki.sh 3boxes-luxury/platform ghp_xxxxxxxxxxxx
```

---

## Prerequisites

### 1. Create the GitHub Repository

If the repository doesn't exist yet, create it using one of these methods:

**Using GitHub CLI (recommended):**
```bash
gh repo create 3boxes-luxury/platform --private \
  --description "3 BOXES LUXURY E-Commerce Platform"
```

**Using the GitHub API:**
```bash
curl -X POST https://api.github.com/user/repos \
  -H "Authorization: token YOUR_GITHUB_TOKEN" \
  -d '{
    "name": "platform",
    "private": true,
    "description": "3 BOXES LUXURY E-Commerce Platform"
  }'
```

**Using the GitHub web interface:**
- Go to https://github.com/new
- Repository name: `platform` (or your preferred name)
- Visibility: Private (recommended for confidential docs)
- Description: `3 BOXES LUXURY E-Commerce Platform`
- Do NOT initialize with README (we have an existing project)

### 2. Enable the Wiki

1. Go to your repository on GitHub
2. Click **Settings**
3. Under **Features**, check **Wikis**
4. The wiki URL will be: `https://github.com/<owner>/<repo>/wiki`

### 3. Initialize the Wiki

GitHub wikis must have at least one page before you can push via git:

1. Go to `https://github.com/<owner>/<repo>/wiki`
2. Click **Create the first page**
3. Add any content (it will be overwritten by our push)
4. Click **Save**

This creates the `.wiki.git` repository that our script pushes to.

### 4. Set Up Git Authentication

**Option A: SSH Key (recommended)**
```bash
ssh-keygen -t ed25519 -C "your-email@example.com"
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
# Add the public key to https://github.com/settings/keys
```

**Option B: HTTPS Token**
- Generate a Personal Access Token at https://github.com/settings/tokens
- Required scopes: `repo` (full control of private repositories)
- Pass the token as the second argument to the setup script

---

## Wiki Page Structure

The wiki contains 7 main pages plus navigation elements:

| Wiki Page | Source File | Content |
|-----------|-------------|---------|
| **Home** | `wiki-repo/Home.md` | Documentation hub, overview, patent status, architecture, quick start |
| **Technical Documentation** | `wiki-repo/Technical-Documentation.md` | Complete code-level docs: architecture, pipeline, API specs, configuration |
| **Functional Documentation** | `wiki-repo/Functional-Documentation.md` | User-facing feature guide, test cases, training scripts, QA procedures |
| **Architecture Deep Dive** | `wiki-repo/Architecture-Deep-Dive.md` | System design decisions, data flow internals, deployment topology, scalability |
| **Training Videos** | `wiki-repo/Training-Videos.md` | 10 video training scripts with recording guides (~162 min total) |
| **Patent Research** | `wiki-repo/Patent-Research.md` | 13-patent landscape analysis, white space identification, litigation context |
| **Patent Application** | `wiki-repo/Patent-Application.md` | Draft patent application with claims, prior art analysis, filing guide |
| **_Sidebar** | `wiki-repo/_Sidebar.md` | Navigation sidebar for all wiki pages |
| **_Footer** | `wiki-repo/_Footer.md` | Copyright footer |

### GitHub Wiki Naming Convention

GitHub wikis use a specific naming convention:
- File names use dashes between words: `Technical-Documentation.md`
- Wiki links use spaces: `[[Technical Documentation]]`
- The home page must be named `Home.md`

---

## How to Push the Wiki

### Automated (Recommended)

```bash
./scripts/setup-github-wiki.sh <owner>/<repo> [github-token]
```

The script will:
1. Verify the GitHub repository exists (requires `gh` CLI)
2. Confirm the wiki is enabled
3. Confirm the wiki has been initialized
4. Set up the git remote (`wiki`)
5. Push all wiki content

### Manual

```bash
cd wiki-repo

# Add the wiki remote
git remote add wiki https://github.com/<owner>/<repo>.wiki.git
# Or with token: git remote add wiki https://TOKEN@github.com/<owner>/<repo>.wiki.git
# Or with SSH:   git remote add wiki git@github.com:<owner>/<repo>.wiki.git

# Push the content
git push wiki master --force
```

---

## How to Update the Wiki

When documentation changes in `docs/wiki/` or `docs/patent/`, update the wiki:

### Option 1: Update individual files

```bash
# Copy updated file to wiki-repo
cp docs/wiki/TECHNICAL-DOCUMENTATION.md wiki-repo/Technical-Documentation.md

# Commit and push
cd wiki-repo
git add -A
git commit -m "Update Technical Documentation"
git push wiki master
cd ..
```

### Option 2: Sync all wiki files

```bash
# Re-copy all files
cp docs/wiki/HOME.md wiki-repo/Home.md
cp docs/wiki/TECHNICAL-DOCUMENTATION.md wiki-repo/Technical-Documentation.md
cp docs/wiki/FUNCTIONAL-DOCUMENTATION.md wiki-repo/Functional-Documentation.md
cp docs/wiki/TRAINING-VIDEOS.md wiki-repo/Training-Videos.md
cp docs/patent/PATENT-RESEARCH.md wiki-repo/Patent-Research.md
cp docs/patent/PATENT-APPLICATION.md wiki-repo/Patent-Application.md

# Commit and push
cd wiki-repo
git add -A
git commit -m "Sync all wiki documentation"
git push wiki master
cd ..
```

### Important: Update Links for GitHub Wiki Format

When copying files from `docs/wiki/` to `wiki-repo/`, ensure links use GitHub wiki format:

| Source Format | Wiki Format |
|---------------|-------------|
| `[Text](./TECHNICAL-DOCUMENTATION.md)` | `[[Technical Documentation]]` |
| `[Text](./PATENT-RESEARCH.md)` | `[[Patent Research]]` |
| `[Text](../patent/PATENT-APPLICATION.md)` | `[[Patent Application]]` |

GitHub wikis use `[[Page Name]]` syntax for internal links, where `Page Name` matches the file name with dashes replaced by spaces.

---

## Architecture

```
docs/                          ← Source documentation (in main project repo)
├── wiki/
│   ├── HOME.md
│   ├── TECHNICAL-DOCUMENTATION.md
│   ├── FUNCTIONAL-DOCUMENTATION.md
│   ├── TRAINING-VIDEOS.md
│   └── (ARCHITECTURE-DEEP-DIVE.md generated)
├── patent/
│   ├── PATENT-RESEARCH.md
│   └── PATENT-APPLICATION.md

wiki-repo/                     ← GitHub wiki git repository (local copy)
├── Home.md                    ← Converted from HOME.md
├── Technical-Documentation.md ← Converted from TECHNICAL-DOCUMENTATION.md
├── Functional-Documentation.md← Converted from FUNCTIONAL-DOCUMENTATION.md
├── Architecture-Deep-Dive.md  ← New (generated from technical docs)
├── Training-Videos.md         ← Converted from TRAINING-VIDEOS.md
├── Patent-Research.md         ← Copied from docs/patent/
├── Patent-Application.md      ← Copied from docs/patent/
├── _Sidebar.md                ← Wiki navigation
└── _Footer.md                 ← Wiki footer

GitHub:                        ← Remote
  <owner>/<repo>.wiki.git      ← Separate git repo for wiki content
```

The `wiki-repo/` is a separate git repository that pushes to `https://github.com/<owner>/<repo>.wiki.git`. This is independent from the main project repository.

---

## Troubleshooting

### "remote: Repository not found"
- The repository doesn't exist or you don't have access
- Create the repository first or check the owner/repo name

### "remote: Wiki repository is empty"
- You need to create the first wiki page via the GitHub web interface first
- Visit `https://github.com/<owner>/<repo>/wiki` and create a page

### "fatal: could not read Username"
- Authentication failed
- Use a GitHub token: `./scripts/setup-github-wiki.sh <owner>/<repo> ghp_xxxxx`

### "error: failed to push some refs"
- The remote has changes that conflict
- Use `--force` flag: `git push wiki master --force`
- This overwrites any existing wiki content with your local version

### Wiki pages not showing up
- File names must match the GitHub wiki convention (CamelCase with dashes)
- Home page must be named `Home.md` (capital H)
- File names with spaces won't work; use dashes: `Technical-Documentation.md`

---

*Last updated: March 2025*
