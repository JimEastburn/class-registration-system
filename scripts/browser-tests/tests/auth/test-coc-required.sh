#!/bin/bash
# Test: Code of Conduct required
# Task ID: 17.2.3
#
# Verifies:
# - Registration requires Code of Conduct agreement
# - Form cannot be submitted without accepting CoC
#
# Usage: ./scripts/browser-tests/tests/auth/test-coc-required.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCREENSHOTS_DIR="$SCRIPT_DIR/screenshots"
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"

mkdir -p "$SCREENSHOTS_DIR"

TIMESTAMP=$(date +%s)
TEST_EMAIL="test-coc-${TIMESTAMP}@example.com"
TEST_PASSWORD="Password123!"

echo "🧪 Test: Code of Conduct required"
echo "=================================="
echo ""

# 1. Navigate to registration page
echo "📄 Opening registration page..."
agent-browser open "$APP_URL/register"
agent-browser wait --load networkidle

# 2. Fill form completely but skip CoC
echo "✏️ Filling form (without CoC acceptance)..."
agent-browser find label "First Name" fill "Test"
agent-browser find label "Last Name" fill "User"
agent-browser find label "Email" fill "$TEST_EMAIL"
agent-browser find label "Password" fill "$TEST_PASSWORD"
agent-browser find label "Confirm Password" fill "$TEST_PASSWORD"

# 3. Take snapshot to see form state
agent-browser snapshot -i
agent-browser screenshot "$SCREENSHOTS_DIR/coc-form-filled-no-checkbox.png"

# 4. Try to submit without checking CoC
echo "🖱️ Attempting to submit without CoC..."
agent-browser find role button click --name "Create Account" 2>/dev/null || \
agent-browser find role button click --name "Sign Up" 2>/dev/null || \
agent-browser find role button click --name "Register"

# 5. Wait briefly
agent-browser wait 1500

# 6. Check result
CURRENT_URL=$(agent-browser get url)
echo "📍 Current URL: $CURRENT_URL"

# Get page content for error message check
PAGE_TEXT=$(agent-browser get text body 2>/dev/null || echo "")
agent-browser screenshot "$SCREENSHOTS_DIR/coc-required-result.png"

# Success if: still on register page OR error about CoC
if [[ "$CURRENT_URL" == *"/register"* ]]; then
  if [[ "$PAGE_TEXT" == *"Code of Conduct"* ]] || [[ "$PAGE_TEXT" == *"agree"* ]] || [[ "$PAGE_TEXT" == *"required"* ]]; then
    echo "✅ SUCCESS: Code of Conduct error displayed"
  else
    echo "✅ SUCCESS: Form blocked (still on register page)"
  fi
  agent-browser close
  exit 0
else
  echo "❌ FAILED: Registration proceeded without CoC agreement"
  agent-browser close
  exit 1
fi
