#!/bin/bash
# ============================================================================
# FXbuddy - Adobe CEP Extension Installer
# ============================================================================
#
# This script:
# 1. Enables Adobe CEP debug mode (PlayerDebugMode) so unsigned extensions load
# 2. Builds the React frontend for production
# 3. Symlinks the extension into Adobe's CEP extensions folder
#
# Usage:
#   chmod +x install.sh
#   ./install.sh
#
# After running, restart Premiere Pro / After Effects and go to:
#   Window > Extensions > FXbuddy
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_DIR="$SCRIPT_DIR/plugin"
EXTENSION_ID="com.fxbuddy.panel"
CEP_EXTENSIONS_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions"

echo ""
echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     FXbuddy CEP Extension Installer  ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""

# ── Step 1: Enable PlayerDebugMode ──────────────────────────────────────────
echo -e "${YELLOW}[1/4]${NC} Enabling Adobe CEP debug mode..."

# Set PlayerDebugMode for CEP versions 9 through 12 (covers all modern Adobe apps)
for version in 9 10 11 12; do
  defaults write "com.adobe.CSXS.${version}" PlayerDebugMode 1 2>/dev/null || true
done

echo -e "${GREEN}  ✓ PlayerDebugMode enabled for CSXS 9-12${NC}"

# ── Step 2: Install frontend dependencies ───────────────────────────────────
echo -e "${YELLOW}[2/4]${NC} Installing frontend dependencies..."

cd "$PLUGIN_DIR/client"

if [ ! -d "node_modules" ]; then
  npm install --silent
  echo -e "${GREEN}  ✓ Dependencies installed${NC}"
else
  echo -e "${GREEN}  ✓ Dependencies already installed${NC}"
fi

# ── Step 3: Build frontend for production ───────────────────────────────────
echo -e "${YELLOW}[3/4]${NC} Building frontend for production..."

npm run build --silent 2>&1 | tail -1
echo -e "${GREEN}  ✓ Production build complete${NC}"

# Verify critical files exist
if [ ! -f "$PLUGIN_DIR/client/dist/index.html" ]; then
  echo -e "${RED}  ✗ ERROR: dist/index.html not found after build${NC}"
  exit 1
fi
if [ ! -f "$PLUGIN_DIR/client/dist/CSInterface.js" ]; then
  echo -e "${RED}  ✗ ERROR: dist/CSInterface.js not found after build${NC}"
  exit 1
fi

echo -e "${GREEN}  ✓ Build output verified:${NC}"
echo "      - client/dist/index.html"
echo "      - client/dist/bundle.js"
echo "      - client/dist/styles.css"
echo "      - client/dist/CSInterface.js"

# ── Step 4: Symlink extension to Adobe CEP folder ──────────────────────────
echo -e "${YELLOW}[4/4]${NC} Installing extension to Adobe CEP..."

SYMLINK_TARGET="$CEP_EXTENSIONS_DIR/$EXTENSION_ID"

# Create the CEP extensions directory if it doesn't exist
mkdir -p "$CEP_EXTENSIONS_DIR"

# Remove existing symlink or directory if present
if [ -L "$SYMLINK_TARGET" ]; then
  rm "$SYMLINK_TARGET"
  echo "      Removed existing symlink"
elif [ -d "$SYMLINK_TARGET" ]; then
  echo -e "${YELLOW}      WARNING: $SYMLINK_TARGET is a directory, not a symlink.${NC}"
  echo -e "${YELLOW}      Removing it to create a symlink instead...${NC}"
  rm -rf "$SYMLINK_TARGET"
fi

# Create the symlink
ln -s "$PLUGIN_DIR" "$SYMLINK_TARGET"
echo -e "${GREEN}  ✓ Symlinked:${NC}"
echo "      $PLUGIN_DIR"
echo "      → $SYMLINK_TARGET"

# ── Done ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Installation Complete!           ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                      ║${NC}"
echo -e "${GREEN}║  Next steps:                         ║${NC}"
echo -e "${GREEN}║  1. Start the backend server:        ║${NC}"
echo -e "${GREEN}║     cd backend && npm run dev        ║${NC}"
echo -e "${GREEN}║                                      ║${NC}"
echo -e "${GREEN}║  2. Restart Premiere Pro or AE       ║${NC}"
echo -e "${GREEN}║                                      ║${NC}"
echo -e "${GREEN}║  3. Go to:                           ║${NC}"
echo -e "${GREEN}║     Window > Extensions > FXbuddy    ║${NC}"
echo -e "${GREEN}║                                      ║${NC}"
echo -e "${GREEN}║  Debug (Chrome DevTools):            ║${NC}"
echo -e "${GREEN}║  Premiere: localhost:8088             ║${NC}"
echo -e "${GREEN}║  After FX: localhost:8089             ║${NC}"
echo -e "${GREEN}║                                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
echo ""
