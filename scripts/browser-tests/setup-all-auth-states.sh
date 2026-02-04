#!/bin/bash
# Setup authentication state files for all user roles
# This script creates test users and saves their session states for browser tests
#
# Usage: ./scripts/browser-tests/setup-all-auth-states.sh [role]
#
# If no role is specified, creates auth states for all roles.
# Valid roles: parent, student, admin, scheduler, superadmin
#
# AI AGENT: Use workflow /browser-tests to auto-run this script without manual approval
# Output: Creates auth-state-{role}.json files in the same directory

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Map short names to database role names and dashboard URLs
declare -A ROLE_MAP=(
  ["parent"]="parent"
  ["student"]="student"
  ["teacher"]="teacher"
  ["admin"]="admin"
  ["scheduler"]="class_scheduler"
  ["superadmin"]="super_admin"
)

declare -A DASHBOARD_MAP=(
  ["parent"]="/parent"
  ["student"]="/student"
  ["teacher"]="/teacher"
  ["admin"]="/admin"
  ["scheduler"]="/class-scheduler"
  ["superadmin"]="/admin"
)

# Get the app URL from env or default to localhost
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"

setup_auth_state() {
  local ROLE_SHORT=$1
  local ROLE_DB="${ROLE_MAP[$ROLE_SHORT]}"
  local DASHBOARD="${DASHBOARD_MAP[$ROLE_SHORT]}"
  local STATE_FILE="$SCRIPT_DIR/auth-state-$ROLE_SHORT.json"
  local CREDS_FILE="$SCRIPT_DIR/.test-creds-$ROLE_SHORT.json"

  echo ""
  echo "=========================================="
  echo "📦 Setting up auth state for: $ROLE_SHORT ($ROLE_DB)"
  echo "=========================================="

  # Create test user
  echo "📦 Creating test $ROLE_SHORT user..."
  cd "$PROJECT_ROOT"
  npx tsx "$SCRIPT_DIR/create-test-user.ts" "$ROLE_DB" 2>/dev/null | grep '^{' > "$CREDS_FILE"

  # Parse credentials
  EMAIL=$(cat "$CREDS_FILE" | jq -r '.email')
  PASSWORD=$(cat "$CREDS_FILE" | jq -r '.password')
  USER_ID=$(cat "$CREDS_FILE" | jq -r '.userId')

  if [ -z "$EMAIL" ] || [ "$EMAIL" = "null" ]; then
    echo "❌ Failed to create $ROLE_SHORT user"
    cat "$CREDS_FILE"
    return 1
  fi

  echo "✅ Created test user: $EMAIL"
  echo "   User ID: $USER_ID"

  # Open login page
  echo "🌐 Opening login page at $APP_URL/login..."
  agent-browser open "$APP_URL/login"
  agent-browser wait --load networkidle

  # Fill login form
  echo "🔐 Filling login credentials..."
  agent-browser find label "Email" fill "$EMAIL"
  agent-browser find label "Password" fill "$PASSWORD"

  # Submit
  echo "🖱️ Clicking submit button..."
  agent-browser find role button click --name "Sign In"

  # Wait for redirect
  echo "⏳ Waiting for redirect to $DASHBOARD..."
  agent-browser wait --url "**$DASHBOARD" --timeout 30000
  agent-browser wait --load networkidle

  # Verify URL
  CURRENT_URL=$(agent-browser get url)
  echo "📍 Current URL: $CURRENT_URL"

  if [[ "$CURRENT_URL" == *"$DASHBOARD"* ]]; then
    echo "✅ Login successful!"
    
    # Save auth state
    echo "💾 Saving auth state to $STATE_FILE..."
    agent-browser state save "$STATE_FILE"
    
    # Take screenshot
    agent-browser screenshot "$SCRIPT_DIR/screenshots/login-success-$ROLE_SHORT.png"
    
    echo "✅ Auth state for $ROLE_SHORT saved successfully!"
  else
    echo "❌ Login failed - unexpected URL: $CURRENT_URL"
    agent-browser screenshot "$SCRIPT_DIR/screenshots/login-failed-$ROLE_SHORT.png"
    agent-browser close
    return 1
  fi

  # Close browser for next role
  agent-browser close
  
  # Clean up temp credentials
  rm -f "$CREDS_FILE"
}

# Create screenshots directory if it doesn't exist
mkdir -p "$SCRIPT_DIR/screenshots"

# If a specific role is provided, only set up that role
if [ -n "$1" ]; then
  if [ -z "${ROLE_MAP[$1]}" ]; then
    echo "❌ Invalid role: $1"
    echo "Valid roles: ${!ROLE_MAP[@]}"
    exit 1
  fi
  setup_auth_state "$1"
else
  # Set up all roles
  for role in parent student admin scheduler superadmin; do
    setup_auth_state "$role"
  done
fi

echo ""
echo "============================================="
echo "✅ All auth states created successfully!"
echo "============================================="
echo "Files created:"
ls -la "$SCRIPT_DIR"/auth-state-*.json 2>/dev/null || echo "No auth state files found"
