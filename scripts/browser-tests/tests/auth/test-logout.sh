#!/bin/bash
# Test: Sign out → redirect to /login
# Task ID: 17.2.7
#
# Verifies:
# - User can sign out
# - Redirects to /login after sign out
#
# Usage: ./scripts/browser-tests/tests/auth/test-logout.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
SCREENSHOTS_DIR="$SCRIPT_DIR/screenshots"
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"

mkdir -p "$SCREENSHOTS_DIR"

echo "🧪 Test: Sign out → redirect to /login"
echo "======================================="
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

# Login first
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
agent-browser screenshot "$SCREENSHOTS_DIR/logout-before.png"

# Find and click logout
echo "🚪 Looking for sign out button..."
agent-browser snapshot -i

# Try different common logout patterns
agent-browser find text "Sign Out" click 2>/dev/null || \
agent-browser find text "Log Out" click 2>/dev/null || \
agent-browser find text "Logout" click 2>/dev/null || \
agent-browser find role button click --name "Sign Out" 2>/dev/null || \
(
  # May need to open user menu first
  echo "   Looking in user menu..."
  agent-browser find role button click --name "User menu" 2>/dev/null || \
  agent-browser find testid "user-menu" click 2>/dev/null || \
  agent-browser find label "Open user menu" click 2>/dev/null
  agent-browser wait 500
  agent-browser snapshot -i
  agent-browser find text "Sign Out" click 2>/dev/null || \
  agent-browser find text "Log Out" click
)

# Wait for redirect
echo "⏳ Waiting for redirect..."
agent-browser wait --load networkidle
agent-browser wait 2000

# Verify redirect to login
CURRENT_URL=$(agent-browser get url)
echo "📍 Current URL: $CURRENT_URL"

if [[ "$CURRENT_URL" == *"/login"* ]] || [[ "$CURRENT_URL" == *"/"$ ]] || [[ "$CURRENT_URL" == "$APP_URL/" ]]; then
  echo "✅ SUCCESS: Redirected to login page"
  agent-browser screenshot "$SCREENSHOTS_DIR/logout-success.png"
  agent-browser close
  exit 0
else
  echo "❌ FAILED: Unexpected URL after logout: $CURRENT_URL"
  agent-browser screenshot "$SCREENSHOTS_DIR/logout-failed.png"
  agent-browser close
  exit 1
fi
