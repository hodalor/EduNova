#!/bin/sh

set -eu

BACKUP_DIR="${BACKUP_DIR:-/var/backups/eduova}"
TIMESTAMP="$(date '+%Y%m%d_%H%M%S')"
DB_NAME="${DB_NAME:-eduova}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
S3_BUCKET="${S3_BUCKET:-s3://eduova-backups/database}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

mkdir -p "$BACKUP_DIR"

BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

export PGPASSWORD="${DB_PASSWORD:?DB_PASSWORD must be set}"

pg_dump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges | gzip > "$BACKUP_FILE"

aws s3 cp "$BACKUP_FILE" "$S3_BUCKET/"

find "$BACKUP_DIR" -type f -name "${DB_NAME}_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete

aws s3 ls "$S3_BUCKET/" | while read -r line; do
  file_date="$(echo "$line" | awk '{print $1" "$2}')"
  file_name="$(echo "$line" | awk '{print $4}')"
  [ -n "$file_name" ] || continue
  if [ "$(date -j -v-"${RETENTION_DAYS}"d '+%s' 2>/dev/null || date -d "-${RETENTION_DAYS} days" '+%s')" -gt \
       "$(date -j -f '%Y-%m-%d %H:%M:%S' "$file_date" '+%s' 2>/dev/null || date -d "$file_date" '+%s')" ]; then
    aws s3 rm "$S3_BUCKET/$file_name"
  fi
done

cat <<'CRON'
# Run daily at 2AM
0 2 * * * /app/scripts/backup.sh >> /var/log/eduova-backup.log 2>&1
CRON
