#!/bin/bash
# Test class creation flow using agent-browser
# Prerequisites: Run setup-auth-state.sh first to create auth-state.json
#
# Usage: ./scripts/browser-tests/test-class-creation.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_FILE="$SCRIPT_DIR/auth-state.json"
SCREENSHOTS_DIR="$SCRIPT_DIR/screenshots"

# ============================================
# Pre-flight: Kill stuck test processes
# ============================================
kill_stuck_processes() {
  # Find vitest/jest processes running longer than 10 minutes (600 seconds)
  local stuck_pids=$(ps -eo pid,etime,comm | grep -E 'vitest|jest' | awk '{
    split($2, t, ":");
    if (length(t) == 3) { # H:MM:SS or longer
      if (t[1] > 0) print $1
    } else if (length(t) == 2 && t[1] >= 10) { # MM:SS where MM >= 10
      print $1
    }
  }')
  
  if [ -n "$stuck_pids" ]; then
    echo "⚠️  Found stuck test processes running >10 minutes. Killing them..."
    echo "$stuck_pids" | xargs -r kill -9 2>/dev/null || true
    echo "✅ Killed stuck processes to speed up localhost"
    sleep 1
  fi
}

# Run pre-flight check
kill_stuck_processes

# Check for auth state
if [ ! -f "$STATE_FILE" ]; then
  echo "❌ Auth state not found. Run setup-auth-state.sh first."
  exit 1
fi

mkdir -p "$SCREENSHOTS_DIR"

# Get the app URL from env or default to localhost
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"

# Generate unique class name for this test run
CLASS_NAME="Browser Test Class $(date +%s)"

echo "==================================="
echo "🧪 Testing Class Creation Flow"
echo "==================================="
echo ""

echo "🌐 Navigating to create class page (with saved auth state)..."
# Use --state flag to load auth state at browser launch
agent-browser open "$APP_URL/teacher/classes/new" --state "$STATE_FILE"
agent-browser wait --load networkidle

echo "📸 Taking snapshot of form..."
agent-browser snapshot -i

echo ""
echo "📝 Filling class form..."

# Fill Class Name
echo "   → Class Name: $CLASS_NAME"
agent-browser find label "Class Name" fill "$CLASS_NAME"

# Fill Description
echo "   → Description"
agent-browser find label "Description" fill "This is a test class created by agent-browser automation."

# Fill Price
echo "   → Price: 75.00"
agent-browser find label "Price" fill "75"

# Fill Capacity
echo "   → Capacity: 12"
agent-browser find label "Capacity" fill "12"

# Take snapshot to see current state before dropdowns
agent-browser snapshot -i

# Select Day of Week (click dropdown, snapshot to get refs, click option)
echo "   → Day of Week: Tuesday"
agent-browser click @e11
agent-browser wait 300
# Snapshot shows listbox with options - Tuesday is typically @e3
# Option refs: @e2=Tuesday/Thursday, @e3=Tuesday, @e4=Wednesday, etc.
agent-browser snapshot -i
agent-browser click @e3
agent-browser wait 500

# Take new snapshot to refresh refs after dropdown closes
# Block of time will now be @e12 again
echo "📸 Form state after day selection..."
agent-browser snapshot -i

# Select Block of time (click dropdown, snapshot to get refs, click option)  
echo "   → Block of time: Block 2"
agent-browser click @e12
agent-browser wait 300
# Snapshot shows listbox with block options - Block 2 is typically @e3
agent-browser snapshot -i
agent-browser click @e3

echo ""
echo "📸 Taking screenshot before submit..."
agent-browser screenshot "$SCREENSHOTS_DIR/class-form-filled.png"

echo ""
echo "🚀 Submitting form..."
agent-browser find role button click --name "Create Class"

echo "⏳ Waiting for redirect..."
agent-browser wait --load networkidle
agent-browser wait 4000

# Check current URL
CURRENT_URL=$(agent-browser get url)
echo "📍 Current URL: $CURRENT_URL"

# Take final snapshot
agent-browser snapshot -i

echo ""
echo "📸 Taking screenshot of result..."
agent-browser screenshot "$SCREENSHOTS_DIR/class-created.png"

# Verify the class name appears on the page
echo ""
echo "🔍 Verifying class was created..."
PAGE_TEXT=$(agent-browser get text body)

if echo "$PAGE_TEXT" | grep -q "$CLASS_NAME"; then
  echo "✅ SUCCESS: Class '$CLASS_NAME' was created!"
  echo ""
  echo "==================================="
  echo "Test Results"
  echo "==================================="
  echo "Class Name: $CLASS_NAME"
  echo "Final URL: $CURRENT_URL"
  echo "Screenshots saved to: $SCREENSHOTS_DIR/"
  echo "==================================="
  
  agent-browser close
  exit 0
else
  echo "❌ FAILED: Could not find class name on page"
  echo ""
  echo "Page content preview:"
  echo "$PAGE_TEXT" | head -50
  
  agent-browser screenshot "$SCREENSHOTS_DIR/class-creation-failed.png"
  agent-browser close
  exit 1
fi
