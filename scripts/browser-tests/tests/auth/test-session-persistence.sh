#!/bin/bash
# Test: Session persistence (refresh page)
# Task ID: 17.2.8
#
# Verifies:
# - Session persists after page refresh
# - User remains logged in
#
# Usage: ./scripts/browser-tests/tests/auth/test-session-persistence.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
SCREENSHOTS_DIR="$SCRIPT_DIR/screenshots"
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"

mkdir -p "$SCREENSHOTS_DIR"

echo "🧪 Test: Session persistence (refresh page)"
echo "============================================"
echo ""

# Create and login as a test user
echo "📦 Creating test user and logging in..."
CREDS=$(npx tsx "$PROJECT_ROOT/scripts/browser-tests/create-test-user.ts" parent 2>/dev/null | grep '^{' || echo "{}")

EMAIL=$(echo "$CREDS" | jq -r '.email')
PASSWORD=$(echo "$CREDS" | jq -r '.password')

if [ -z "$EMAIL" ] || [ "$EMAIL" = "null" ]; then
  echo "❌ Failed to create test user"
  exit 1
fi

# Login
echo "🔐 Logging in..."
agent-browser open "$APP_URL/login"
agent-browser wait --load networkidle
agent-browser find label "Email" fill "$EMAIL"
agent-browser find label "Password" fill "$PASSWORD"
agent-browser find role button click --name "Sign In"
agent-browser wait --url "**/parent" --timeout 30000
agent-browser wait --load networkidle

CURRENT_URL=$(agent-browser get url)
if [[ "$CURRENT_URL" != *"/parent"* ]]; then
  echo "❌ Failed to log in"
  agent-browser close
  exit 1
fi

echo "✅ Logged in successfully"
agent-browser screenshot "$SCREENSHOTS_DIR/session-before-refresh.png"

# Refresh the page
echo "🔄 Refreshing page..."
agent-browser open "$CURRENT_URL"
agent-browser wait --load networkidle

# Check if still logged in
NEW_URL=$(agent-browser get url)
echo "📍 URL after refresh: $NEW_URL"

if [[ "$NEW_URL" == *"/parent"* ]]; then
  echo "✅ SUCCESS: Session persisted after refresh"
  agent-browser screenshot "$SCREENSHOTS_DIR/session-after-refresh.png"
  agent-browser close
  exit 0
elif [[ "$NEW_URL" == *"/login"* ]]; then
  echo "❌ FAILED: Session lost - redirected to login"
  agent-browser screenshot "$SCREENSHOTS_DIR/session-lost.png"
  agent-browser close
  exit 1
else
  echo "❌ FAILED: Unexpected URL: $NEW_URL"
  agent-browser screenshot "$SCREENSHOTS_DIR/session-unexpected.png"
  agent-browser close
  exit 1
fi
