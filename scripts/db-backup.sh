#!/usr/bin/env bash
# Backs up the Supabase database (roles, schema, data) into one encrypted file.
#
#   SUPABASE_DB_URL='postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres' \
#   BACKUP_PASSPHRASE='…' bash scripts/db-backup.sh [output-folder]
#
# - Use the Session pooler connection string (Supabase → Connect). The direct db.<ref>.supabase.co
#   address needs IPv6, which GitHub's runners and many networks don't have.
# - Needs the Supabase CLI (v3: `supabase db dump --remote=<url>`), Docker, tar and gpg.
# - The plain dumps only ever exist in a private temporary folder, deleted when the script ends.
#   What's kept is <output-folder>/thenwhat-db-<UTC time>.tar.gz.gpg, encrypted with AES-256.
# - Profile photos (Storage) are not in a database dump; see docs/SETUP.md → Backups.
#
# Restore (into an empty project):
#   gpg --decrypt thenwhat-db-….tar.gz.gpg | tar xz
#   psql "$NEW_DB_URL" -f roles.sql -f schema.sql -f data.sql
set -euo pipefail

: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL to the Session pooler connection string}"
: "${BACKUP_PASSPHRASE:?Set BACKUP_PASSPHRASE (keep it somewhere safe: without it the backup cannot be opened)}"
if [ "${#BACKUP_PASSPHRASE}" -lt 16 ]; then
  echo "BACKUP_PASSPHRASE should be at least 16 characters." >&2
  exit 1
fi

OUT="${1:-backups}"
SUPABASE="${SUPABASE_CLI:-supabase}"
STAMP="$(date -u +%Y-%m-%d-%H%M)"

umask 077
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "Dumping roles, schema and data…"
"$SUPABASE" db dump --remote="$SUPABASE_DB_URL" -f "$WORK/roles.sql" --role-only
"$SUPABASE" db dump --remote="$SUPABASE_DB_URL" -f "$WORK/schema.sql"
# The two vector tables can't be loaded back (permission error), so they're left out, as Supabase advises.
"$SUPABASE" db dump --remote="$SUPABASE_DB_URL" -f "$WORK/data.sql" --data-only --use-copy \
  -x "storage.buckets_vectors" -x "storage.vector_indexes"

# A backup that silently missed the stories is worse than a failed run.
for f in roles schema data; do
  [ -s "$WORK/$f.sql" ] || { echo "The $f dump is empty." >&2; exit 1; }
done
# (The CLI quotes every name: "public"."lines".)
grep -Eq 'CREATE TABLE .*"?public"?\."?lines"? ' "$WORK/schema.sql" || { echo "The schema dump has no public.lines table." >&2; exit 1; }
grep -Eq '^COPY "?public"?\."?lines"? ' "$WORK/data.sql" || { echo "The data dump has no lines." >&2; exit 1; }

mkdir -p "$OUT"
FILE="$OUT/thenwhat-db-$STAMP.tar.gz.gpg"
tar -C "$WORK" -czf - roles.sql schema.sql data.sql |
  gpg --batch --yes --quiet --pinentry-mode loopback --passphrase-fd 3 \
    --symmetric --cipher-algo AES256 -o "$FILE" 3<<<"$BACKUP_PASSPHRASE"

echo "Saved $FILE ($(du -h "$FILE" | cut -f1)). Sizes before encryption:"
du -h "$WORK"/*.sql | sed "s|$WORK/||"
