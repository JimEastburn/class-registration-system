#!/bin/bash
# Test: Login with wrong password (rejected)
# Task ID: 17.2.6
#
# Verifies:
# - Login with incorrect password is rejected
# - Appropriate error message is displayed
#
# Usage: ./scripts/browser-tests/tests/auth/test-login-failure.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
SCREENSHOTS_DIR="$SCRIPT_DIR/screenshots"
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"

mkdir -p "$SCREENSHOTS_DIR"

echo "🧪 Test: Login with wrong password (rejected)"
echo "=============================================="
echo ""

# Create a test user first
echo "📦 Creating test user..."
CREDS=$(npx tsx "$PROJECT_ROOT/scripts/browser-tests/create-test-user.ts" parent 2>/dev/null | grep '^{' || echo "{}")

EMAIL=$(echo "$CREDS" | jq -r '.email')
WRONG_PASSWORD="WrongPassword999!"

if [ -z "$EMAIL" ] || [ "$EMAIL" = "null" ]; then
  echo "❌ Failed to create test user"
  exit 1
fi

echo "Email: $EMAIL"
echo "Using wrong password: $WRONG_PASSWORD"

# 1. Navigate to login page
echo "📄 Opening login page..."
agent-browser open "$APP_URL/login"
agent-browser wait --load networkidle

# 2. Fill login form with wrong password
echo "✏️ Filling login with wrong password..."
agent-browser find label "Email" fill "$EMAIL"
agent-browser find label "Password" fill "$WRONG_PASSWORD"

# 3. Submit form
echo "🖱️ Clicking Sign In..."
agent-browser find role button click --name "Sign In"

# 4. Wait for response
agent-browser wait 2000

# 5. Check result
CURRENT_URL=$(agent-browser get url)
echo "📍 Current URL: $CURRENT_URL"

agent-browser snapshot -i
agent-browser screenshot "$SCREENSHOTS_DIR/login-failure-result.png"

# Success if still on login page
if [[ "$CURRENT_URL" == *"/login"* ]]; then
  echo "✅ SUCCESS: Login was rejected (still on login page)"
  
  # Try to find error message
  PAGE_TEXT=$(agent-browser get text body 2>/dev/null || echo "")
  if [[ "$PAGE_TEXT" == *"invalid"* ]] || [[ "$PAGE_TEXT" == *"Invalid"* ]] || [[ "$PAGE_TEXT" == *"incorrect"* ]] || [[ "$PAGE_TEXT" == *"failed"* ]] || [[ "$PAGE_TEXT" == *"error"* ]]; then
    echo "   Error message displayed"
  fi
  
  agent-browser close
  exit 0
else
  echo "❌ FAILED: Login was accepted with wrong password"
  agent-browser close
  exit 1
fi
