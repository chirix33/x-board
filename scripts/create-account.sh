#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <email> <password>" >&2
  exit 1
fi

email="$1"
password="$2"

if [[ ! -f .env.local ]]; then
  echo "Missing .env.local. Copy .env.example and set DATABASE_URL first." >&2
  exit 1
fi

npx tsx scripts/create-account.ts "$email" "$password"
