#!/usr/bin/env bash
# Backup de las tablas que la migración 0018 va a truncar/dropear.
# Uso: ./scripts/backup-pre-0018.sh
# Lee POSTGRES_URL_NON_POOLING de .env.local.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env.local ]; then
  echo "ERROR: .env.local no encontrado" >&2
  exit 1
fi

DB_URL=$(grep -E '^POSTGRES_URL_NON_POOLING=' .env.local | sed 's/^POSTGRES_URL_NON_POOLING=//; s/^"//; s/"$//')

if [ -z "$DB_URL" ]; then
  echo "ERROR: POSTGRES_URL_NON_POOLING no encontrada en .env.local" >&2
  exit 1
fi

TS=$(date +%Y-%m-%d_%H%M%S)
OUT_DIR="backups/${TS}_pre_0018"
mkdir -p "$OUT_DIR"

OUT_FILE="$OUT_DIR/dump.sql"

echo "Volcando datos a $OUT_FILE ..."

pg_dump "$DB_URL" \
  --data-only \
  --no-owner \
  --no-privileges \
  --column-inserts \
  --table=public.playlists \
  --table=public.playlist_songs \
  --table=public.playlist_parish_subscriptions \
  --table=public.announcements \
  --table=public.announcement_parishes \
  --table=public.liturgical_events \
  --table=public.favorites \
  > "$OUT_FILE"

BYTES=$(wc -c < "$OUT_FILE" | tr -d ' ')
LINES=$(wc -l < "$OUT_FILE" | tr -d ' ')
echo "OK — $OUT_FILE ($BYTES bytes, $LINES líneas)"
echo "Para restaurar: psql \"\$POSTGRES_URL_NON_POOLING\" -f $OUT_FILE"
