#!/bin/bash
# Back up the WhatsApp (Baileys) auth keystore — ONLY when it's valid — so a
# corrupted/truncated creds.json can be restored without re-pairing.
# A server-side WhatsApp logout still requires re-pairing; this guards against
# LOCAL corruption only.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AUTH_DIR="$ROOT/store/auth"
BACKUP_DIR="$ROOT/data/wa-auth-backups"
KEEP=120   # 6h cadence × 120 = ~30 days of history (was 14 = only ~3.5 days)
CREDS="$AUTH_DIR/creds.json"

# Validate: creds.json must exist, be non-empty, and parse as JSON with a
# registered identity (me). Never back up a bad keystore.
if [[ ! -s "$CREDS" ]]; then
  echo "skip: creds.json missing or empty"; exit 0
fi
if ! node -e 'const c=require(process.argv[1]); if(!c||!c.me) process.exit(1)' "$CREDS" 2>/dev/null; then
  echo "skip: creds.json invalid or unpaired — not overwriting good backups"; exit 0
fi

TS="$(date -u +%Y%m%dT%H%M%SZ)"
DEST="$BACKUP_DIR/$TS"
mkdir -p "$DEST"
cp -a "$AUTH_DIR/." "$DEST/"
echo "backed up keystore -> $DEST"

# Prune to last $KEEP
ls -1dt "$BACKUP_DIR"/*/ 2>/dev/null | tail -n +$((KEEP+1)) | xargs -r rm -rf
echo "kept last $KEEP backups"
