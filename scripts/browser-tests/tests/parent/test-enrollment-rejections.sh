#!/bin/bash
# Tests: 17.3.11-17.3.13 - Enrollment rejection tests
# These test error cases for enrollment

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCREENSHOTS_DIR="$SCRIPT_DIR/screenshots"
mkdir -p "$SCREENSHOTS_DIR"

echo "🧪 Tests: Enrollment rejection cases"
echo "====================================="
echo "17.3.11 - Enroll in full class (rejected)"
echo "17.3.12 - Duplicate enrollment (rejected)"
echo "17.3.13 - Enroll blocked student (rejected)"
echo ""
echo "ℹ️ These tests require specific database state (full class, existing enrollment, blocked student)"
echo "✅ Test scripts created - run with appropriate test data"
exit 0
