#!/usr/bin/env bash
set -euo pipefail

readonly repo_url="https://github.com/hassanIssa00/NEXUS-ED.git"
readonly branch="master"
readonly app_dir="$HOME/nexus-edu-prod"

if [[ -d "$app_dir/.git" ]]; then
  git -C "$app_dir" fetch --depth=1 origin "$branch"
  git -C "$app_dir" merge --ff-only FETCH_HEAD
elif [[ -e "$app_dir" ]]; then
  echo "Refusing to use non-empty deployment path without a Git checkout: $app_dir" >&2
  exit 1
else
  git clone --depth=1 --branch "$branch" "$repo_url" "$app_dir"
fi

if [[ ! -r "$app_dir/.env.production" ]]; then
  echo "Missing $app_dir/.env.production; provision production secrets on the VM first." >&2
  exit 1
fi

cd "$app_dir"
docker compose --env-file .env.production -f docker-compose.prod.yml config --quiet
docker compose --env-file .env.production -f docker-compose.prod.yml up \
  --detach --build --remove-orphans --wait --wait-timeout 300

docker compose --env-file .env.production -f docker-compose.prod.yml exec -T api \
  node -e "fetch('http://127.0.0.1:4000/api/health/ready').then(async (r) => { if (!r.ok) throw new Error('API readiness returned ' + r.status); const body = await r.json(); if (body.status !== 'ready') throw new Error('API is not ready'); console.log('API readiness passed against the production database.'); }).catch((e) => { console.error(e); process.exit(1); })"

git -C "$app_dir" rev-parse --short HEAD
