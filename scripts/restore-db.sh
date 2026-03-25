#!/bin/bash
# =============================================================================
# Supabase Database Restoration Script
# =============================================================================
# Restores a compressed pg_dump backup (created by backup-db.sh) to the
# development Supabase database.
#
# USAGE:
#   ./scripts/restore-db.sh <backup_file.dump>
#
# =============================================================================

set -euo pipefail

# --- Use PostgreSQL 17 pg_restore (Supabase runs PG 17) ---
if [ -x "/opt/homebrew/opt/postgresql@17/bin/pg_restore" ]; then
  PG_RESTORE="/opt/homebrew/opt/postgresql@17/bin/pg_restore"
else
  PG_RESTORE="pg_restore"
fi

# --- Configuration (MUST MATCH backup-db.sh) ---
PROD_PROJECT_REF="jakjpigeafqqgispwlhl"
DEV_PROJECT_REF="nztngdpneuyhhnrkhehq"
DB_HOST="aws-0-us-west-2.pooler.supabase.com"
DB_PORT="5432"
DB_NAME="postgres"

# --- Parse arguments ---
if [ "$#" -eq 0 ] || [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
  echo "Usage: $0 <backup_file.dump>"
  echo ""
  echo "Description:"
  echo "  Restores a compressed pg_dump backup to the development Supabase database."
  echo ""
  echo "Environment:"
  echo "  SUPABASE_DB_PASSWORD  Required. Your development database password."
  exit 0
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

# --- Validate password ---
if [ -z "${SUPABASE_DB_PASSWORD:-}" ]; then
  echo "❌ Error: SUPABASE_DB_PASSWORD is not set."
  echo "Set it with: export SUPABASE_DB_PASSWORD=\"your_dev_database_password\""
  exit 1
fi

# --- Target Configuration ---
# This script is STRICTLY for restoring to DEVELOPMENT.
PROJECT_REF="$DEV_PROJECT_REF"
DB_USER="postgres.${PROJECT_REF}"

# --- Safety Confirmation ---
echo "⚠️  WARNING: This will OVERWRITE the database at ${PROJECT_REF}."
echo "   Target Host: ${DB_HOST}"
echo "   Backup File: ${BACKUP_FILE}"
echo ""
read -p "Are you absolutely sure you want to proceed? (type 'RECONSTRUCT-DEV' to confirm): " CONFIRM

if [ "$CONFIRM" != "RECONSTRUCT-DEV" ]; then
  echo "❌ Restoration cancelled."
  exit 1
fi

# --- Run restoration ---
echo "🔄 Starting restoration to dev..."
echo ""

# pg_restore flags:
# -h: host
# -p: port
# -U: user
# -d: database
# -v: verbose
# -c: clean (drop existing objects before recreating) - ONLY if using plain sql, for custom format we use --clean --if-exists
# --clean --if-exists: drops existing objects
# --no-owner: don't try to set ownership (since we are using the postgres user)
# --no-privileges: don't try to set privileges (Supabase manages these)

if PGPASSWORD="$SUPABASE_DB_PASSWORD" $PG_RESTORE \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  -v \
  "$BACKUP_FILE"; then
  echo ""
  echo "✅ Restoration complete!"
else
  echo ""
  echo "❌ Restoration failed. Check the error output above."
  exit 1
fi
