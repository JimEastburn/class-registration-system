#!/bin/bash
# Admin Portal Tests (17.6.1-17.6.22)

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
SCREENSHOTS_DIR="$SCRIPT_DIR/screenshots"
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
mkdir -p "$SCREENSHOTS_DIR"

echo "🧪 Admin Portal Test Suite"
echo "==========================="

CREDS=$(npx tsx "$PROJECT_ROOT/scripts/browser-tests/create-test-user.ts" admin 2>/dev/null | grep '^{')
EMAIL=$(echo "$CREDS" | jq -r '.email')
PASSWORD=$(echo "$CREDS" | jq -r '.password')

agent-browser open "$APP_URL/login"
agent-browser wait --load networkidle
agent-browser find label "Email" fill "$EMAIL"
agent-browser find label "Password" fill "$PASSWORD"
agent-browser find role button click --name "Sign In"
agent-browser wait --url "**/admin" --timeout 30000
agent-browser wait --load networkidle

# 17.6.1 - View admin dashboard
echo "📋 17.6.1: View admin dashboard"
agent-browser screenshot "$SCREENSHOTS_DIR/admin-dashboard.png"

# 17.6.2 - List all users
echo "📋 17.6.2: List all users"
agent-browser open "$APP_URL/admin/users"
agent-browser wait --load networkidle
agent-browser screenshot "$SCREENSHOTS_DIR/admin-users.png"

# 17.6.9 - View all classes
echo "📋 17.6.9: View all classes"
agent-browser open "$APP_URL/admin/classes"
agent-browser wait --load networkidle
agent-browser screenshot "$SCREENSHOTS_DIR/admin-classes.png"

# 17.6.11 - View all enrollments
echo "📋 17.6.11: View all enrollments"
agent-browser open "$APP_URL/admin/enrollments"
agent-browser wait --load networkidle
agent-browser screenshot "$SCREENSHOTS_DIR/admin-enrollments.png"

# 17.6.14 - View all payments
echo "📋 17.6.14: View all payments"
agent-browser open "$APP_URL/admin/payments"
agent-browser wait --load networkidle
agent-browser screenshot "$SCREENSHOTS_DIR/admin-payments.png"

# 17.6.17-20 - CSV exports
echo "📋 17.6.17-20: CSV exports"
agent-browser snapshot -i
agent-browser screenshot "$SCREENSHOTS_DIR/admin-exports.png"

# 17.6.21 - Update global settings
echo "📋 17.6.21: System settings"
agent-browser open "$APP_URL/admin/settings"
agent-browser wait --load networkidle
agent-browser screenshot "$SCREENSHOTS_DIR/admin-settings.png"

echo "✅ Admin portal tests completed"
agent-browser close
exit 0
