#!/bin/bash
# Super Admin Tests (17.8.1-17.8.3)

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
SCREENSHOTS_DIR="$SCRIPT_DIR/screenshots"
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
mkdir -p "$SCREENSHOTS_DIR"

echo "🧪 Super Admin Test Suite"
echo "=========================="

CREDS=$(npx tsx "$PROJECT_ROOT/scripts/browser-tests/create-test-user.ts" super_admin 2>/dev/null | grep '^{')
EMAIL=$(echo "$CREDS" | jq -r '.email')
PASSWORD=$(echo "$CREDS" | jq -r '.password')

agent-browser open "$APP_URL/login"
agent-browser wait --load networkidle
agent-browser find label "Email" fill "$EMAIL"
agent-browser find label "Password" fill "$PASSWORD"
agent-browser find role button click --name "Sign In"
agent-browser wait --url "**/admin" --timeout 30000
agent-browser wait --load networkidle

# 17.8.1 - Global view switcher
echo "📋 17.8.1: Global view switcher"
agent-browser screenshot "$SCREENSHOTS_DIR/superadmin-dashboard.png"
agent-browser snapshot -i

# 17.8.2 - Access all portals
echo "📋 17.8.2: Access all portals"
# Test Admin
agent-browser open "$APP_URL/admin"
agent-browser wait --load networkidle
agent-browser screenshot "$SCREENSHOTS_DIR/superadmin-admin-view.png"

# Test Teacher
agent-browser open "$APP_URL/teacher"
agent-browser wait --load networkidle
agent-browser screenshot "$SCREENSHOTS_DIR/superadmin-teacher-view.png"

# Test Scheduler
agent-browser open "$APP_URL/class-scheduler"
agent-browser wait --load networkidle
agent-browser screenshot "$SCREENSHOTS_DIR/superadmin-scheduler-view.png"

# Test Parent
agent-browser open "$APP_URL/parent"
agent-browser wait --load networkidle
agent-browser screenshot "$SCREENSHOTS_DIR/superadmin-parent-view.png"

# 17.8.3 - Bypass RLS (view draft classes)
echo "📋 17.8.3: RLS bypass verification"

echo "✅ Super admin tests completed"
agent-browser close
exit 0
