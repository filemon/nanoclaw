#!/bin/bash
# Push a one-time ntfy.sh alert when WhatsApp needs re-authentication.
# "Needs re-auth" = creds.json missing/empty/unpaired (the post-logout state).
# Alerts once per outage (state file), resets when the keystore is valid again.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CREDS="$ROOT/store/auth/creds.json"
PAIRING_FILE="$ROOT/store/pairing-code.txt"
STATE="$ROOT/data/.wa-reauth-alerted"
HISTORY="$ROOT/data/wa-outage-history.log"   # dated LOGOUT/RECOVERED transitions (for cadence analysis)
LOGGED="$ROOT/data/.wa-outage-logged"        # marks that the current outage was already recorded to HISTORY
TOPIC="nanoclaw-wa-8f009076339b7cbc42ff29c7"
HOST="$(hostname)"

valid=1
if [[ ! -s "$CREDS" ]]; then valid=0; fi
if [[ $valid -eq 1 ]] && ! node -e 'const c=require(process.argv[1]); if(!c||!c.me) process.exit(1)' "$CREDS" 2>/dev/null; then valid=0; fi

if [[ $valid -eq 1 ]]; then
  # Healthy — record recovery if we were mid-outage, then clear alert state.
  if [[ -f "$LOGGED" ]]; then
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) RECOVERED" >> "$HISTORY"
    rm -f "$LOGGED"
  fi
  rm -f "$STATE"
  exit 0
fi

# Re-auth needed. Record the logout transition once (dated), for cadence tracking.
if [[ ! -f "$LOGGED" ]]; then
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) LOGOUT" >> "$HISTORY"
  touch "$LOGGED"
fi

# Only alert once per outage.
if [[ -f "$STATE" ]]; then exit 0; fi

code=""
[[ -s "$PAIRING_FILE" ]] && code="$(cat "$PAIRING_FILE")"
if [[ -n "$code" ]]; then
  body="WhatsApp unlinked. Re-link: WhatsApp > Linked Devices > Link with phone number, enter code: $code  (host: $HOST)"
else
  body="WhatsApp unlinked — re-auth needed. Check host logs for QR/pairing code and re-link. (host: $HOST)"
fi

if curl -fsS --max-time 20 \
     -H "Title: NanoClaw: WhatsApp needs re-auth" \
     -H "Priority: urgent" \
     -H "Tags: warning,lock" \
     -d "$body" \
     "https://ntfy.sh/$TOPIC" >/dev/null 2>&1; then
  touch "$STATE"
  echo "alert sent to ntfy topic"
else
  echo "alert send FAILED (will retry next run)"
fi
