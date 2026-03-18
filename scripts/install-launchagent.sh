#!/bin/bash
# Install Nexus LaunchAgent

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PLIST_SRC="$SCRIPT_DIR/com.nexus.launch.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/com.nexus.launch.plist"

echo "🚀 Installing Nexus LaunchAgent..."

# Check node exists
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found"
  exit 1
fi

echo "✅ Node found at: $(which node)"

# Copy plist
cp "$PLIST_SRC" "$PLIST_DEST"
echo "✅ Plist copied to: $PLIST_DEST"

# Load LaunchAgent
launchctl unload "$PLIST_DEST" 2>/dev/null || true
launchctl load "$PLIST_DEST"
echo "✅ LaunchAgent loaded"

echo ""
echo "✅ Nexus LaunchAgent installed successfully!"
echo ""
echo "📍 Plist location: $PLIST_DEST"
echo "🔁 Nexus will now start automatically on login"
echo ""
echo "=== Verification ==="
echo ""
echo "1. Check if LaunchAgent is loaded:"
echo "   launchctl list | grep com.nexus.launch"
echo ""
echo "2. Check Nexus status:"
echo "   cd $PROJECT_DIR && npm run status"
echo ""
echo "3. View logs:"
echo "   tail -f $PROJECT_DIR/logs/nexus-stdout.log"
echo "   tail -f $PROJECT_DIR/logs/nexus-stderr.log"
echo ""
echo "To manually stop: launchctl unload $PLIST_DEST"
echo "To manually start: launchctl load $PLIST_DEST"
