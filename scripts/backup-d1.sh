#!/usr/bin/env bash
# Exports a timestamped SQL dump of the remote D1 database.
# Output is written to backups/backup-<timestamp>.sql (git-ignored).
# Usage: ./scripts/backup-d1.sh [--local]
set -euo pipefail

TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
OUTDIR="backups"
OUTFILE="${OUTDIR}/backup-${TIMESTAMP}.sql"

mkdir -p "$OUTDIR"

if [[ "${1:-}" == "--local" ]]; then
  echo "Exporting local D1 database..."
  npx wrangler d1 export giapha-db --local --output "$OUTFILE"
else
  echo "Exporting remote D1 database..."
  npx wrangler d1 export giapha-db --remote --output "$OUTFILE"
fi

echo "Backup saved to $OUTFILE"
