#!/bin/bash
# Setup authentication state for agent-browser tests
# This script logs in as a teacher and saves the session state for reuse
#
# Usage: ./scripts/browser-tests/setup-auth-state.sh
# Output: Creates auth-state.json in the same directory

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
STATE_FILE="$SCRIPT_DIR/auth-state.json"
CREDS_FILE="$SCRIPT_DIR/.test-creds.json"

echo "📦 Creating test teacher user..."
cd "$PROJECT_ROOT"
# Filter to only get the JSON line (starts with {)
npx tsx "$SCRIPT_DIR/create-test-teacher.ts" 2>/dev/null | grep '^{' > "$CREDS_FILE"

# Parse credentials
EMAIL=$(cat "$CREDS_FILE" | jq -r '.email')
PASSWORD=$(cat "$CREDS_FILE" | jq -r '.password')
USER_ID=$(cat "$CREDS_FILE" | jq -r '.userId')

if [ -z "$EMAIL" ] || [ "$EMAIL" = "null" ]; then
  echo "❌ Failed to create test user"
  cat "$CREDS_FILE"
  exit 1
fi

echo "✅ Created test user: $EMAIL"
echo "   User ID: $USER_ID"

# Get the app URL from env or default to localhost
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"

echo "🌐 Opening login page at $APP_URL/login..."
agent-browser open "$APP_URL/login"
agent-browser wait --load networkidle

echo "📸 Taking snapshot of login page..."
agent-browser snapshot -i

echo "🔐 Filling login credentials..."
# Find and fill email input
agent-browser find label "Email" fill "$EMAIL"
# Find and fill password input  
agent-browser find label "Password" fill "$PASSWORD"

echo "🖱️ Clicking submit button..."
agent-browser find role button click --name "Sign In"

echo "⏳ Waiting for redirect to teacher dashboard..."
agent-browser wait --url "**/teacher" --timeout 30000
agent-browser wait --load networkidle

# Verify we're on the dashboard
CURRENT_URL=$(agent-browser get url)
echo "📍 Current URL: $CURRENT_URL"

if [[ "$CURRENT_URL" == *"/teacher"* ]]; then
  echo "✅ Login successful!"
  
  echo "💾 Saving auth state to $STATE_FILE..."
  agent-browser state save "$STATE_FILE"
  
  echo "📸 Taking screenshot for verification..."
  agent-browser screenshot "$SCRIPT_DIR/login-success.png"
  
  echo ""
  echo "==================================="
  echo "Auth state saved successfully!"
  echo "State file: $STATE_FILE"
  echo "User email: $EMAIL"
  echo "User ID: $USER_ID"
  echo "==================================="
else
  echo "❌ Login failed - unexpected URL: $CURRENT_URL"
  agent-browser screenshot "$SCRIPT_DIR/login-failed.png"
  agent-browser close
  exit 1
fi

# Keep browser open for subsequent tests or close
echo "🔒 Closing browser..."
agent-browser close

echo "✅ Setup complete! Run test-class-creation.sh to test class creation."
