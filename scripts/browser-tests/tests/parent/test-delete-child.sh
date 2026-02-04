#!/bin/bash
# Test: Delete child profile
# Task ID: 17.3.6

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
SCREENSHOTS_DIR="$SCRIPT_DIR/screenshots"
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"

mkdir -p "$SCREENSHOTS_DIR"

echo "🧪 Test: Delete child profile"
echo "=============================="

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

# Add child first
agent-browser open "$APP_URL/parent/family"
agent-browser wait --load networkidle
agent-browser find text "Add" click 2>/dev/null || \
agent-browser find role button click --name "Add Family Member"
agent-browser wait 1000
agent-browser find label "First Name" fill "DeleteTest"
agent-browser find label "Last Name" fill "Child"
agent-browser find role button click --name "Add" 2>/dev/null || \
agent-browser find role button click --name "Save"
agent-browser wait 2000

# Now delete the child
agent-browser snapshot -i
agent-browser screenshot "$SCREENSHOTS_DIR/delete-child-before.png"

agent-browser find text "Delete" click 2>/dev/null || \
agent-browser find role button click --name "Delete"
agent-browser wait 1000

# Confirm deletion
agent-browser find role button click --name "Confirm" 2>/dev/null || \
agent-browser find role button click --name "Delete" 2>/dev/null || \
agent-browser find text "Yes" click
agent-browser wait 2000
agent-browser screenshot "$SCREENSHOTS_DIR/delete-child-after.png"

echo "✅ SUCCESS: Delete child test completed"
agent-browser close
exit 0
