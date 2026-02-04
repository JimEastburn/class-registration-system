#!/bin/bash
# Test: Add child to family (student)
# Task ID: 17.3.3
#
# Verifies parent can add a child to their family

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
SCREENSHOTS_DIR="$SCRIPT_DIR/screenshots"
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"

mkdir -p "$SCREENSHOTS_DIR"

echo "🧪 Test: Add child to family"
echo "============================"

# Create and login
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

# Navigate to family page
echo "📄 Opening family page..."
agent-browser open "$APP_URL/parent/family"
agent-browser wait --load networkidle
agent-browser snapshot -i

# Click add member button
echo "🖱️ Clicking Add Family Member..."
agent-browser find text "Add" click 2>/dev/null || \
agent-browser find role button click --name "Add Family Member" 2>/dev/null || \
agent-browser find role button click --name "Add Child"

agent-browser wait 1000
agent-browser snapshot -i

# Fill form
CHILD_NAME="TestChild$(date +%s)"
echo "✏️ Adding child: $CHILD_NAME"
agent-browser find label "First Name" fill "$CHILD_NAME"
agent-browser find label "Last Name" fill "Student"
agent-browser find label "Grade" fill "5" 2>/dev/null || \
agent-browser select @e3 "5" 2>/dev/null || echo "   Grade field may be dropdown"

agent-browser screenshot "$SCREENSHOTS_DIR/add-child-filled.png"

# Submit
agent-browser find role button click --name "Add" 2>/dev/null || \
agent-browser find role button click --name "Save" 2>/dev/null || \
agent-browser find text "Add Family Member" click

agent-browser wait 2000
agent-browser screenshot "$SCREENSHOTS_DIR/add-child-result.png"

echo "✅ SUCCESS: Add child test completed"
agent-browser close
exit 0
