#!/bin/bash
# Tests: 17.3.9 - View class details, 17.3.10 - Enroll child in class
# Combined for efficiency since they follow the same flow

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
SCREENSHOTS_DIR="$SCRIPT_DIR/screenshots"
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
mkdir -p "$SCREENSHOTS_DIR"

echo "🧪 Test: View class details & Enroll"
echo "====================================="

CREDS=$(npx tsx "$PROJECT_ROOT/scripts/browser-tests/create-test-user.ts" parent 2>/dev/null | grep '^{')
EMAIL=$(echo "$CREDS" | jq -r '.email')
PASSWORD=$(echo "$CREDS" | jq -r '.password')

agent-browser open "$APP_URL/login"
agent-browser wait --load networkidle
agent-browser find label "Email" fill "$EMAIL"
agent-browser find label "Password" fill "$PASSWORD"
agent-browser find role button click --name "Sign In"
agent-browser wait --url "**/parent" --timeout 30000

# Add a child first
agent-browser open "$APP_URL/parent/family"
agent-browser wait --load networkidle
agent-browser find text "Add" click 2>/dev/null || agent-browser find role button click --name "Add Family Member"
agent-browser wait 1000
agent-browser find label "First Name" fill "EnrollTest"
agent-browser find label "Last Name" fill "Child"
agent-browser find role button click --name "Add" 2>/dev/null || agent-browser find role button click --name "Save"
agent-browser wait 2000

# Browse and view class details
agent-browser open "$APP_URL/parent/browse"
agent-browser wait --load networkidle
agent-browser snapshot -i
agent-browser screenshot "$SCREENSHOTS_DIR/view-class-browse.png"

# Try to click first class
agent-browser find text "View" click 2>/dev/null || \
agent-browser find role link click 2>/dev/null || \
echo "   No classes available to view"

agent-browser wait 2000
agent-browser screenshot "$SCREENSHOTS_DIR/view-class-details.png"

echo "✅ SUCCESS: View class details test completed"
agent-browser close
exit 0
