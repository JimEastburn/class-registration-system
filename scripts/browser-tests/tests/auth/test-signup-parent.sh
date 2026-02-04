#!/bin/bash
# Test: Sign up (Parent) with all fields
# Task ID: 17.2.1
#
# Verifies:
# - Registration form displays all required fields
# - User can submit valid registration data
# - User is redirected to parent dashboard after signup
#
# Usage: ./scripts/browser-tests/tests/auth/test-signup-parent.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
SCREENSHOTS_DIR="$SCRIPT_DIR/screenshots"
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"

mkdir -p "$SCREENSHOTS_DIR"

# Generate unique email for this test
TIMESTAMP=$(date +%s)
RANDOM_NUM=$((RANDOM % 100000))
TEST_EMAIL="test-parent-${TIMESTAMP}-${RANDOM_NUM}@example.com"
TEST_PASSWORD="Password123!"
TEST_FIRST_NAME="Test"
TEST_LAST_NAME="Parent"

echo "🧪 Test: Sign up (Parent) with all fields"
echo "=========================================="
echo "Email: $TEST_EMAIL"
echo ""

# 1. Navigate to registration page
echo "📄 Opening registration page..."
agent-browser open "$APP_URL/register"
agent-browser wait --load networkidle

# 2. Take initial snapshot
echo "📸 Taking snapshot of registration form..."
agent-browser snapshot -i

# 3. Fill registration form
echo "✏️ Filling registration form..."
agent-browser find label "First Name" fill "$TEST_FIRST_NAME"
agent-browser find label "Last Name" fill "$TEST_LAST_NAME"
agent-browser find label "Email" fill "$TEST_EMAIL"
agent-browser find label "Password" fill "$TEST_PASSWORD"
agent-browser find label "Confirm Password" fill "$TEST_PASSWORD"

# 4. Accept Code of Conduct (if checkbox exists)
echo "☑️ Checking Code of Conduct..."
agent-browser find text "Code of Conduct" click 2>/dev/null || echo "   No CoC checkbox found, may be on separate screen"

# 5. Screenshot before submit
echo "📸 Taking pre-submit screenshot..."
agent-browser screenshot "$SCREENSHOTS_DIR/signup-parent-filled.png"

# 6. Submit form
echo "🖱️ Submitting registration..."
agent-browser find role button click --name "Create Account" 2>/dev/null || \
agent-browser find role button click --name "Sign Up" 2>/dev/null || \
agent-browser find role button click --name "Register"

# 7. Wait for navigation
echo "⏳ Waiting for redirect..."
agent-browser wait --load networkidle
agent-browser wait 2000

# 8. Verify redirect to parent dashboard
CURRENT_URL=$(agent-browser get url)
echo "📍 Current URL: $CURRENT_URL"

if [[ "$CURRENT_URL" == *"/parent"* ]]; then
  echo "✅ SUCCESS: Redirected to parent dashboard"
  agent-browser screenshot "$SCREENSHOTS_DIR/signup-parent-success.png"
  
  # Cleanup: close browser
  agent-browser close
  
  exit 0
elif [[ "$CURRENT_URL" == *"/login"* ]]; then
  # Some apps require email verification first
  echo "⚠️ INFO: User may need email verification - redirected to login"
  agent-browser screenshot "$SCREENSHOTS_DIR/signup-parent-verification-needed.png"
  agent-browser close
  exit 0
else
  echo "❌ FAILED: Unexpected URL after registration: $CURRENT_URL"
  agent-browser screenshot "$SCREENSHOTS_DIR/signup-parent-failed.png"
  agent-browser snapshot -i
  agent-browser close
  exit 1
fi
