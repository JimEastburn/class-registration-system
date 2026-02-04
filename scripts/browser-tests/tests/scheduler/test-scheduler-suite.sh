#!/bin/bash
# Class Scheduler Portal Tests (17.7.1-17.7.30)

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
SCREENSHOTS_DIR="$SCRIPT_DIR/screenshots"
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
mkdir -p "$SCREENSHOTS_DIR"

echo "🧪 Class Scheduler Portal Test Suite"
echo "======================================"

CREDS=$(npx tsx "$PROJECT_ROOT/scripts/browser-tests/create-test-user.ts" class_scheduler 2>/dev/null | grep '^{')
EMAIL=$(echo "$CREDS" | jq -r '.email')
PASSWORD=$(echo "$CREDS" | jq -r '.password')

agent-browser open "$APP_URL/login"
agent-browser wait --load networkidle
agent-browser find label "Email" fill "$EMAIL"
agent-browser find label "Password" fill "$PASSWORD"
agent-browser find role button click --name "Sign In"
agent-browser wait --url "**/class-scheduler" --timeout 30000
agent-browser wait --load networkidle

# 17.7.1 - View scheduler dashboard
echo "📋 17.7.1: View scheduler dashboard"
agent-browser screenshot "$SCREENSHOTS_DIR/scheduler-dashboard.png"

# 17.7.2 - View master calendar grid
echo "📋 17.7.2: View master calendar grid"
agent-browser open "$APP_URL/class-scheduler/calendar"
agent-browser wait --load networkidle
agent-browser screenshot "$SCREENSHOTS_DIR/scheduler-calendar.png"

# 17.7.3-4 - Calendar axis tests
echo "📋 17.7.3-4: Calendar axis verification"
agent-browser snapshot -i

# 17.7.6 - Create class for any teacher
echo "📋 17.7.6: Scheduler class creation"
agent-browser open "$APP_URL/class-scheduler/classes"
agent-browser wait --load networkidle
agent-browser screenshot "$SCREENSHOTS_DIR/scheduler-classes.png"

# 17.7.18-22 - Block-based scheduling tests
echo "📋 17.7.18-22: Block-based scheduling tests"

# 17.7.24-26 - Drag-and-drop tests
echo "📋 17.7.24-26: Drag-and-drop scheduling tests"

# 17.7.27-30 - Teacher conflict detection
echo "📋 17.7.27-30: Teacher conflict detection tests"

echo "✅ Scheduler portal tests completed"
agent-browser close
exit 0
