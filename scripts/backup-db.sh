#!/bin/bash
# =============================================================================
# Supabase Database Backup Script
# =============================================================================
# Creates a compressed pg_dump backup of the production Supabase database.
#
# SETUP (one-time):
#   1. Find your database password in the Supabase Dashboard:
#      Settings → Database → Database password
#   2. Set it as an environment variable  (DONT DO THIS, IT'S A SECURITY RISK, but if you must, add to ~/.zshrc for persistence):
#      export SUPABASE_DB_PASSWORD="your_database_password"
#   3. Make this script executable:
#      chmod +x scripts/backup-db.sh
#
# USAGE:
#   ./scripts/backup-db.sh              # Backup production
#   ./scripts/backup-db.sh --dev        # Backup dev/preview
#   ./scripts/backup-db.sh --plain      # Plain SQL instead of compressed
# =============================================================================

set -euo pipefail

# --- Use PostgreSQL 17 pg_dump (Supabase runs PG 17) ---
if [ -x "/opt/homebrew/opt/postgresql@17/bin/pg_dump" ]; then
  PG_DUMP="/opt/homebrew/opt/postgresql@17/bin/pg_dump"
else
  PG_DUMP="pg_dump"
fi

# --- Configuration ---
PROD_PROJECT_REF="jakjpigeafqqgispwlhl"
DEV_PROJECT_REF="nztngdpneuyhhnrkhehq"
BACKUP_DIR="$(cd "$(dirname "$0")/.." && pwd)/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# --- Parse arguments ---
TARGET="prod"
FORMAT="custom"   # -Fc (compressed, supports pg_restore)

for arg in "$@"; do
  case $arg in
    --dev)    TARGET="dev" ;;
    --plain)  FORMAT="plain" ;;
    --help|-h)
      echo "Usage: $0 [--dev] [--plain]"
      echo ""
      echo "Options:"
      echo "  --dev     Backup the dev/preview database instead of production"
      echo "  --plain   Output plain SQL (.sql) instead of compressed (.dump)"
      echo ""
      echo "Environment:"
      echo "  SUPABASE_DB_PASSWORD  Required. Your Supabase database password."
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg (use --help for usage)"
      exit 1
      ;;
  esac
done

# --- Validate password ---
if [ -z "${SUPABASE_DB_PASSWORD:-}" ]; then
  echo "❌ Error: SUPABASE_DB_PASSWORD is not set."
  echo ""
  echo "Find your database password in the Supabase Dashboard:"
  echo "  Settings → Database → Database password"
  echo ""
  echo "Then run:"
  echo "  export SUPABASE_DB_PASSWORD=\"your_password\""
  echo "  $0"
  exit 1
fi

# --- Resolve project ref ---
if [ "$TARGET" = "dev" ]; then
  PROJECT_REF="$DEV_PROJECT_REF"
  LABEL="dev"
else
  PROJECT_REF="$PROD_PROJECT_REF"
  LABEL="prod"
fi

# --- Connection details ---
# Uses PGPASSWORD env var to avoid special-character issues in URIs
DB_HOST="aws-0-us-west-2.pooler.supabase.com"
DB_PORT="5432"
DB_USER="postgres.${PROJECT_REF}"
DB_NAME="postgres"

# --- Set file extension ---
if [ "$FORMAT" = "plain" ]; then
  EXT="sql"
  PG_DUMP_FLAGS=""
else
  EXT="dump"
  PG_DUMP_FLAGS="-Fc"
fi

BACKUP_FILE="${BACKUP_DIR}/${LABEL}_backup_${TIMESTAMP}.${EXT}"

# --- Create backup directory ---
mkdir -p "$BACKUP_DIR"

# --- Run backup ---
echo "🔄 Starting ${LABEL} database backup..."
echo "   Project: ${PROJECT_REF}"
echo "   Host:    ${DB_HOST}"
echo "   Output:  ${BACKUP_FILE}"
echo ""

if PGPASSWORD="$SUPABASE_DB_PASSWORD" $PG_DUMP $PG_DUMP_FLAGS -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"; then
  FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "✅ Backup complete!"
  echo "   File: ${BACKUP_FILE}"
  echo "   Size: ${FILE_SIZE}"
else
  echo "❌ Backup failed. Check the error output above."
  rm -f "$BACKUP_FILE"  # Clean up empty/partial file
  exit 1
fi

# --- Cleanup old backups (keep last 10) ---
BACKUP_COUNT=$(ls -1 "${BACKUP_DIR}/${LABEL}_backup_"* 2>/dev/null | wc -l | tr -d ' ')
if [ "$BACKUP_COUNT" -gt 10 ]; then
  echo ""
  echo "🧹 Cleaning up old backups (keeping last 10)..."
  ls -1t "${BACKUP_DIR}/${LABEL}_backup_"* | tail -n +11 | xargs rm -f
  echo "   Removed $((BACKUP_COUNT - 10)) old backup(s)."
fi
