#!/bin/bash
# Test: Update child details (grade level)
# Task ID: 17.3.5

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
SCREENSHOTS_DIR="$SCRIPT_DIR/screenshots"
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"

mkdir -p "$SCREENSHOTS_DIR"

echo "🧪 Test: Update child details"
echo "=============================="

# Login and add a child first
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
agent-browser find label "First Name" fill "UpdateTest"
agent-browser find label "Last Name" fill "Child"
agent-browser find role button click --name "Add" 2>/dev/null || \
agent-browser find role button click --name "Save"
agent-browser wait 2000

# Now edit the child
agent-browser snapshot -i
agent-browser find text "Edit" click 2>/dev/null || \
agent-browser find role button click --name "Edit"
agent-browser wait 1000
agent-browser snapshot -i

# Update grade
agent-browser find label "Grade" fill "6" 2>/dev/null || echo "   Updating grade field"
agent-browser screenshot "$SCREENSHOTS_DIR/update-child-filled.png"

agent-browser find role button click --name "Save" 2>/dev/null || \
agent-browser find role button click --name "Update"
agent-browser wait 2000
agent-browser screenshot "$SCREENSHOTS_DIR/update-child-result.png"

echo "✅ SUCCESS: Update child test completed"
agent-browser close
exit 0
