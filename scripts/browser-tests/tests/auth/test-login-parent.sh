#!/bin/bash
# Test: Sign in (Parent) → redirect to /parent
# Task ID: 17.2.4
#
# Verifies:
# - Parent can log in with valid credentials
# - Redirects to /parent dashboard
#
# Usage: ./scripts/browser-tests/tests/auth/test-login-parent.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
SCREENSHOTS_DIR="$SCRIPT_DIR/screenshots"
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"

mkdir -p "$SCREENSHOTS_DIR"

echo "🧪 Test: Sign in (Parent) → redirect to /parent"
echo "================================================"
echo ""

# Create a test parent user first
echo "📦 Creating test parent user..."
CREDS=$(npx tsx "$PROJECT_ROOT/scripts/browser-tests/create-test-user.ts" parent 2>/dev/null | grep '^{' || echo "{}")

EMAIL=$(echo "$CREDS" | jq -r '.email')
PASSWORD=$(echo "$CREDS" | jq -r '.password')

if [ -z "$EMAIL" ] || [ "$EMAIL" = "null" ]; then
  echo "❌ Failed to create test user"
  exit 1
fi

echo "Email: $EMAIL"

# 1. Navigate to login page
echo "📄 Opening login page..."
agent-browser open "$APP_URL/login"
agent-browser wait --load networkidle

# 2. Fill login form
echo "✏️ Filling login credentials..."
agent-browser find label "Email" fill "$EMAIL"
agent-browser find label "Password" fill "$PASSWORD"

# 3. Screenshot before submit
agent-browser screenshot "$SCREENSHOTS_DIR/login-parent-filled.png"

# 4. Submit form
echo "🖱️ Clicking Sign In..."
agent-browser find role button click --name "Sign In"

# 5. Wait for navigation
echo "⏳ Waiting for redirect..."
agent-browser wait --url "**/parent" --timeout 30000
agent-browser wait --load networkidle

# 6. Verify URL
CURRENT_URL=$(agent-browser get url)
echo "📍 Current URL: $CURRENT_URL"

if [[ "$CURRENT_URL" == *"/parent"* ]]; then
  echo "✅ SUCCESS: Redirected to parent dashboard"
  agent-browser screenshot "$SCREENSHOTS_DIR/login-parent-success.png"
  agent-browser close
  exit 0
else
  echo "❌ FAILED: Unexpected URL: $CURRENT_URL"
  agent-browser screenshot "$SCREENSHOTS_DIR/login-parent-failed.png"
  agent-browser close
  exit 1
fi
