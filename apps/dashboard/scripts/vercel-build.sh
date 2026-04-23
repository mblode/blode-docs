#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${APP_ROOT}/../.." && pwd)"

if [[ "${VERCEL_ENV:-}" == "production" ]]; then
  if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "DATABASE_URL must be set for production dashboard builds." >&2
    exit 1
  fi

  (cd "${REPO_ROOT}" && npm run db:push:ci --workspace=packages/db)
fi

(cd "${REPO_ROOT}" && npx turbo run build --filter=dashboard...)
