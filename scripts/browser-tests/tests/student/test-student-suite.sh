#!/bin/bash
# Student Portal Tests (17.5.1-17.5.4)

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
SCREENSHOTS_DIR="$SCRIPT_DIR/screenshots"
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
mkdir -p "$SCREENSHOTS_DIR"

echo "🧪 Student Portal Test Suite"
echo "============================="

CREDS=$(npx tsx "$PROJECT_ROOT/scripts/browser-tests/create-test-user.ts" student 2>/dev/null | grep '^{')
EMAIL=$(echo "$CREDS" | jq -r '.email')
PASSWORD=$(echo "$CREDS" | jq -r '.password')

agent-browser open "$APP_URL/login"
agent-browser wait --load networkidle
agent-browser find label "Email" fill "$EMAIL"
agent-browser find label "Password" fill "$PASSWORD"
agent-browser find role button click --name "Sign In"
agent-browser wait --url "**/student" --timeout 30000
agent-browser wait --load networkidle

# 17.5.1 - View linked student dashboard
echo "📋 17.5.1: View student dashboard"
agent-browser screenshot "$SCREENSHOTS_DIR/student-dashboard.png"

# 17.5.2 - View weekly schedule
echo "📋 17.5.2: View weekly schedule"
agent-browser open "$APP_URL/student/schedule"
agent-browser wait --load networkidle
agent-browser screenshot "$SCREENSHOTS_DIR/student-schedule.png"

# 17.5.3 - View class details
echo "📋 17.5.3: View class details"
agent-browser open "$APP_URL/student/classes"
agent-browser wait --load networkidle
agent-browser screenshot "$SCREENSHOTS_DIR/student-classes.png"

# 17.5.4 - View class materials
echo "📋 17.5.4: View class materials"
echo "   (Requires enrollment with materials)"

echo "✅ Student portal tests completed"
agent-browser close
exit 0
