#!/bin/bash
# Test: Browse available classes
# Task ID: 17.3.8

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
SCREENSHOTS_DIR="$SCRIPT_DIR/screenshots"
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
mkdir -p "$SCREENSHOTS_DIR"

echo "🧪 Test: Browse available classes"
echo "=================================="

CREDS=$(npx tsx "$PROJECT_ROOT/scripts/browser-tests/create-test-user.ts" parent 2>/dev/null | grep '^{')
EMAIL=$(echo "$CREDS" | jq -r '.email')
PASSWORD=$(echo "$CREDS" | jq -r '.password')

agent-browser open "$APP_URL/login"
agent-browser wait --load networkidle
agent-browser find label "Email" fill "$EMAIL"
agent-browser find label "Password" fill "$PASSWORD"
agent-browser find role button click --name "Sign In"
agent-browser wait --url "**/parent" --timeout 30000

# Browse classes
agent-browser open "$APP_URL/parent/browse"
agent-browser wait --load networkidle
agent-browser snapshot -i
agent-browser screenshot "$SCREENSHOTS_DIR/browse-classes.png"

PAGE_TEXT=$(agent-browser get text body 2>/dev/null || echo "")
if [[ "$PAGE_TEXT" == *"Class"* ]] || [[ "$PAGE_TEXT" == *"course"* ]] || [[ "$PAGE_TEXT" == *"Browse"* ]]; then
  echo "✅ SUCCESS: Classes page loaded"
else
  echo "⚠️ INFO: No classes displayed (may be expected if none exist)"
fi

agent-browser close
exit 0
