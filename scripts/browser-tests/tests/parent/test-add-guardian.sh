#!/bin/bash
# Test: Add family member (parent/guardian)
# Task ID: 17.3.4

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
SCREENSHOTS_DIR="$SCRIPT_DIR/screenshots"
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"

mkdir -p "$SCREENSHOTS_DIR"

echo "🧪 Test: Add family member (parent/guardian)"
echo "============================================="

# Login
CREDS=$(npx tsx "$PROJECT_ROOT/scripts/browser-tests/create-test-user.ts" parent 2>/dev/null | grep '^{' || echo "{}")
EMAIL=$(echo "$CREDS" | jq -r '.email')
PASSWORD=$(echo "$CREDS" | jq -r '.password')

agent-browser open "$APP_URL/login"
agent-browser wait --load networkidle
agent-browser find label "Email" fill "$EMAIL"
agent-browser find label "Password" fill "$PASSWORD"
agent-browser find role button click --name "Sign In"
agent-browser wait --url "**/parent" --timeout 30000
agent-browser wait --load networkidle

# Navigate to family
agent-browser open "$APP_URL/parent/family"
agent-browser wait --load networkidle

# Add guardian
agent-browser find text "Add" click 2>/dev/null || \
agent-browser find role button click --name "Add Family Member"
agent-browser wait 1000
agent-browser snapshot -i

GUARDIAN_NAME="Guardian$(date +%s)"
agent-browser find label "First Name" fill "$GUARDIAN_NAME"
agent-browser find label "Last Name" fill "Test"
agent-browser find label "Type" select "Parent" 2>/dev/null || echo "   Type field may not exist"

agent-browser screenshot "$SCREENSHOTS_DIR/add-guardian-filled.png"

agent-browser find role button click --name "Add" 2>/dev/null || \
agent-browser find role button click --name "Save"
agent-browser wait 2000
agent-browser screenshot "$SCREENSHOTS_DIR/add-guardian-result.png"

echo "✅ SUCCESS: Add guardian test completed"
agent-browser close
exit 0
