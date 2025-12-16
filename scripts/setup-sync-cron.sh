#!/usr/bin/env bash

# --------------------------------------------------------------------
#  Xoco Café — Sync scheduler helper
#  This script ensures the cron entry for syncing SQLite with Supabase
#  exists. It removes any previous entry containing "sync:sqlite" to
#  avoid duplicates and appends the desired schedule.
# --------------------------------------------------------------------

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CRON_CMD="0 19 * * * cd ${PROJECT_ROOT} && /usr/bin/env bash -lc 'npm run sync:sqlite'"

EXISTING_CRON="$(crontab -l 2>/dev/null || true)"

{
  echo "${EXISTING_CRON}" | grep -v "sync:sqlite" || true
  echo "${CRON_CMD}"
} | crontab -

echo "✅ Cron entry installed:"
echo "   ${CRON_CMD}"
