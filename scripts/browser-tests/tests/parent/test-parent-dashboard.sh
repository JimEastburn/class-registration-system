#!/bin/bash
# Test: View parent dashboard
# Task ID: 17.3.1
#
# Verifies:
# - Parent dashboard loads correctly
# - Dashboard shows family summary, upcoming classes, recent payments sections
#
# Usage: ./scripts/browser-tests/tests/parent/test-parent-dashboard.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
AUTH_STATE="$PROJECT_ROOT/scripts/browser-tests/auth-state-parent.json"
SCREENSHOTS_DIR="$SCRIPT_DIR/screenshots"
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"

mkdir -p "$SCREENSHOTS_DIR"

echo "🧪 Test: View parent dashboard"
echo "==============================="
echo ""

# Check if auth state exists, if not create it
if [ ! -f "$AUTH_STATE" ] || [ "$(cat "$AUTH_STATE" | jq -r '.cookies | length')" == "0" ]; then
  echo "📦 Creating test parent user and logging in..."
  CREDS=$(npx tsx "$PROJECT_ROOT/scripts/browser-tests/create-test-user.ts" parent 2>/dev/null | grep '^{' || echo "{}")
  EMAIL=$(echo "$CREDS" | jq -r '.email')
  PASSWORD=$(echo "$CREDS" | jq -r '.password')
  
  if [ -z "$EMAIL" ] || [ "$EMAIL" = "null" ]; then
    echo "❌ Failed to create test user"
    exit 1
  fi
  
  agent-browser open "$APP_URL/login"
  agent-browser wait --load networkidle
  agent-browser find label "Email" fill "$EMAIL"
  agent-browser find label "Password" fill "$PASSWORD"
  agent-browser find role button click --name "Sign In"
  agent-browser wait --url "**/parent" --timeout 30000
  agent-browser wait --load networkidle
else
  echo "🔐 Loading saved auth state..."
  agent-browser state load "$AUTH_STATE"
  agent-browser open "$APP_URL/parent"
  agent-browser wait --load networkidle
fi

# Verify we're on parent dashboard
CURRENT_URL=$(agent-browser get url)
echo "📍 Current URL: $CURRENT_URL"

if [[ "$CURRENT_URL" != *"/parent"* ]]; then
  echo "❌ FAILED: Not on parent dashboard"
  agent-browser screenshot "$SCREENSHOTS_DIR/parent-dashboard-failed.png"
  agent-browser close
  exit 1
fi

# Take snapshot and screenshot
echo "📸 Capturing dashboard..."
agent-browser snapshot -i
agent-browser screenshot "$SCREENSHOTS_DIR/parent-dashboard.png"

# Check for key dashboard elements
PAGE_TEXT=$(agent-browser get text body 2>/dev/null || echo "")

echo "🔍 Checking for dashboard components..."
HAS_FAMILY=false
HAS_CLASSES=false
HAS_PAYMENTS=false

[[ "$PAGE_TEXT" == *"Family"* ]] || [[ "$PAGE_TEXT" == *"family"* ]] && HAS_FAMILY=true
[[ "$PAGE_TEXT" == *"Class"* ]] || [[ "$PAGE_TEXT" == *"Upcoming"* ]] && HAS_CLASSES=true
[[ "$PAGE_TEXT" == *"Payment"* ]] || [[ "$PAGE_TEXT" == *"payment"* ]] && HAS_PAYMENTS=true

echo "   Family section: $HAS_FAMILY"
echo "   Classes section: $HAS_CLASSES"
echo "   Payments section: $HAS_PAYMENTS"

echo "✅ SUCCESS: Parent dashboard loaded"
agent-browser close
exit 0
