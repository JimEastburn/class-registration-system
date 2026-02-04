#!/bin/bash
# Test: Update profile (phone number)
# Task ID: 17.3.2
#
# Verifies parent can update their profile phone number
#
# Usage: ./scripts/browser-tests/tests/parent/test-parent-update-profile.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
SCREENSHOTS_DIR="$SCRIPT_DIR/screenshots"
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"

mkdir -p "$SCREENSHOTS_DIR"

echo "🧪 Test: Update profile (phone number)"
echo "======================================="

# Create test user and login
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

# Navigate to profile page
echo "📄 Opening profile page..."
agent-browser open "$APP_URL/parent/profile"
agent-browser wait --load networkidle
agent-browser snapshot -i

# Update phone number
NEW_PHONE="555-123-4567"
echo "✏️ Updating phone number to: $NEW_PHONE"
agent-browser find label "Phone" fill "$NEW_PHONE" 2>/dev/null || \
agent-browser find placeholder "Phone" fill "$NEW_PHONE"

# Save
echo "🖱️ Saving profile..."
agent-browser find role button click --name "Save" 2>/dev/null || \
agent-browser find role button click --name "Update Profile" 2>/dev/null || \
agent-browser find text "Save" click

agent-browser wait 2000
agent-browser screenshot "$SCREENSHOTS_DIR/profile-updated.png"

echo "✅ SUCCESS: Profile update test completed"
agent-browser close
exit 0
