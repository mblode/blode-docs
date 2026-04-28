#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${APP_ROOT}/../.." && pwd)"

if [[ "${VERCEL_ENV:-}" == "production" ]]; then
  if [[ -z "${DIRECT_URL:-}${POSTGRES_URL_NON_POOLING:-}${DATABASE_URL:-}" ]]; then
    echo "One of DIRECT_URL, POSTGRES_URL_NON_POOLING, or DATABASE_URL must be set for production dashboard builds." >&2
    exit 1
  fi

  # Apply pending Drizzle migrations and (re-)install the auth.users trigger.
  # Both steps are idempotent: drizzle-orm tracks applied migrations in
  # drizzle.__drizzle_migrations, and apply-auth-user-sync.mjs uses
  # `create or replace`. SKIP_DB_MIGRATE=1 bypasses both.
  if [[ "${SKIP_DB_MIGRATE:-}" == "1" ]]; then
    echo "Skipping db:migrate (SKIP_DB_MIGRATE=1)."
  else
    (cd "${REPO_ROOT}" && npm run db:migrate --workspace=packages/db)
  fi
fi

(cd "${REPO_ROOT}" && npx turbo run build --filter=dashboard...)
