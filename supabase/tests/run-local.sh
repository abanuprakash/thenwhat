#!/usr/bin/env bash
# Runs the migrations and the SQL tests against a throwaway local Postgres 16.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
DATA="$(mktemp -d)"
PORT="${PORT:-54329}"
trap '"${AS_PG[@]}" "$PGBIN/pg_ctl" -D "$DATA" stop -m fast >/dev/null 2>&1 || true; rm -rf "$DATA"' EXIT

# Postgres refuses to run as root; use the postgres OS user when we are root.
AS_PG=()
if [ "$(id -u)" = "0" ]; then chown postgres "$DATA"; AS_PG=(runuser -u postgres --); fi
"${AS_PG[@]}" "$PGBIN/initdb" -D "$DATA" -U postgres -E UTF8 --locale=C.UTF-8 >/dev/null
"${AS_PG[@]}" "$PGBIN/pg_ctl" -D "$DATA" -o "-p $PORT -k $DATA" -l "$DATA/log" start -w >/dev/null
PSQL=(psql -h "$DATA" -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q)
# Each test file gets a fresh database.
fresh_db() {
  "${PSQL[@]}" -c "drop database if exists sb" -c "create database sb"
  "${PSQL[@]}" -d sb -f "$HERE/supabase-shim.sql"
  for f in "$HERE"/../migrations/*.sql; do "${PSQL[@]}" -d sb -f "$f"; done
}
for t in "$HERE"/*.test.sql; do
  echo "test: $(basename "$t")"
  fresh_db
  "${PSQL[@]}" -d sb -f "$t" >/dev/null
done
fresh_db
"${PSQL[@]}" -d sb -c "insert into auth.users (email) values ('seed@example.com'); update public.profiles set role = 'admin';"
echo "running demo seed…"
"${PSQL[@]}" -d sb -f "$HERE/../seed-demo.sql"
"${PSQL[@]}" -d sb -tAc "select count(*) from public.stories" | grep -qx 6 || { echo "seed failed"; exit 1; }
echo "ALL DB TESTS PASSED"
