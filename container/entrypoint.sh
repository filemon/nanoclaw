#!/bin/bash
# NanoClaw agent container entrypoint.
#
# The host passes initial session parameters via stdin as a single JSON blob,
# then the agent-runner opens the session DBs at /workspace/{inbound,outbound}.db
# and enters its poll loop. All further IO flows through those DBs.
#
# We capture stdin to a file first so /tmp/input.json is available for
# post-mortem inspection if the container exits unexpectedly, then exec bun
# so that bun becomes PID 1's direct child (under tini) and receives signals.

set -e

# Provision dedicated agent SSH keys mounted read-only under /workspace/extra/
# into the conventional locations so plain `ssh <host>` works (the agent reaches
# for default key paths / host aliases, not `-i <mount>`). No-op for containers
# without these mounts. The container is ephemeral (--rm) so these copies never
# persist.
SSH_DIR="${HOME:-/home/node}/.ssh"

# megakoko (Obsidian vault, Apple Reminders): SSH auto-discovers ~/.ssh/id_ed25519,
# so plain `ssh jirifabian@100.78.110.118` works without -i.
if [ -f /workspace/extra/megakoko ]; then
  mkdir -p "$SSH_DIR"; chmod 700 "$SSH_DIR"
  cp /workspace/extra/megakoko "$SSH_DIR/id_ed25519"
  chmod 600 "$SSH_DIR/id_ed25519"
fi

# newkoko: a second ed25519 key can't be auto-discovered (only id_ed25519/id_rsa/…
# are), so map it via an ~/.ssh/config Host alias. Plain `ssh newkoko` and
# `ssh jirifabian@100.115.140.20` both resolve to this key.
if [ -f /workspace/extra/newkoko ]; then
  mkdir -p "$SSH_DIR"; chmod 700 "$SSH_DIR"
  cp /workspace/extra/newkoko "$SSH_DIR/id_newkoko"
  chmod 600 "$SSH_DIR/id_newkoko"
  cat > "$SSH_DIR/config" <<'SSHCONFIG'
Host newkoko 100.115.140.20
    HostName 100.115.140.20
    User jirifabian
    IdentityFile ~/.ssh/id_newkoko
    IdentitiesOnly yes
    StrictHostKeyChecking accept-new

Host megakoko 100.78.110.118
    HostName 100.78.110.118
    User jirifabian
    IdentityFile ~/.ssh/id_ed25519
    StrictHostKeyChecking accept-new
SSHCONFIG
  chmod 600 "$SSH_DIR/config"
fi

cat > /tmp/input.json

exec bun run /app/src/index.ts < /tmp/input.json
