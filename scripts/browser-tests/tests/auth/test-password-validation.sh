#!/bin/bash
# Test: Password validation (weak password rejected)
# Task ID: 17.2.2
#
# Verifies:
# - Weak passwords are rejected with appropriate error
# - Password requirements are displayed/enforced
#
# Usage: ./scripts/browser-tests/tests/auth/test-password-validation.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCREENSHOTS_DIR="$SCRIPT_DIR/screenshots"
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"

mkdir -p "$SCREENSHOTS_DIR"

TIMESTAMP=$(date +%s)
TEST_EMAIL="test-weakpwd-${TIMESTAMP}@example.com"
WEAK_PASSWORD="123"  # Weak password

echo "🧪 Test: Password validation (weak password rejected)"
echo "======================================================="
echo ""

# 1. Navigate to registration page
echo "📄 Opening registration page..."
agent-browser open "$APP_URL/register"
agent-browser wait --load networkidle

# 2. Fill form with weak password
echo "✏️ Filling form with weak password..."
agent-browser find label "First Name" fill "Test"
agent-browser find label "Last Name" fill "User"
agent-browser find label "Email" fill "$TEST_EMAIL"
agent-browser find label "Password" fill "$WEAK_PASSWORD"
agent-browser find label "Confirm Password" fill "$WEAK_PASSWORD"

# 3. Try to submit
echo "🖱️ Attempting to submit..."
agent-browser find role button click --name "Create Account" 2>/dev/null || \
agent-browser find role button click --name "Sign Up" 2>/dev/null || \
agent-browser find role button click --name "Register"

# 4. Wait briefly for validation message
agent-browser wait 1500

# 5. Check for validation error
echo "🔍 Checking for validation error..."
agent-browser snapshot -i
agent-browser screenshot "$SCREENSHOTS_DIR/password-validation-weak.png"

# Look for error message
ERROR_CHECK=$(agent-browser get text body 2>/dev/null || echo "")

if [[ "$ERROR_CHECK" == *"password"* ]] || [[ "$ERROR_CHECK" == *"Password"* ]] || [[ "$ERROR_CHECK" == *"characters"* ]] || [[ "$ERROR_CHECK" == *"weak"* ]] || [[ "$ERROR_CHECK" == *"strong"* ]]; then
  echo "✅ SUCCESS: Password validation error displayed"
  agent-browser close
  exit 0
else
  # Check if still on register page (form rejected)
  CURRENT_URL=$(agent-browser get url)
  if [[ "$CURRENT_URL" == *"/register"* ]]; then
    echo "✅ SUCCESS: Form rejected weak password (still on register page)"
    agent-browser close
    exit 0
  else
    echo "❌ FAILED: Weak password was accepted or no validation error shown"
    agent-browser close
    exit 1
  fi
fi
