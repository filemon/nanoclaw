# NanoClaw v1 → v2 migration record (2026-06-22)

Migrated from v1.2.52 (`/root/nanoclaw`) to v2.1.19 (`/root/nanoclaw-v2`).
`migrate-v2.sh` ran the deterministic half; this records the `/migrate-from-v1`
finishing work and the issues fixed along the way.

## Install shape
- Host: **root** systemd system service `nanoclaw-v2-454ebe7e.service`.
- Channel: WhatsApp (native Baileys), auth keystore carried over from v1 (no re-pairing).
- Agent groups: `jirka-lid` (folder `main`, owner DM) and `Quick msgs` (folder `whatsapp_quick-msgs`).
- Owner: `whatsapp:420603221742@s.whatsapp.net` (Jiri) — global `owner` role.

## Issues found & fixed (not handled by migrate-v2.sh)
1. **WhatsApp adapter never installed** (`2c-install-whatsapp` failed): skill ran
   `git fetch origin channels`, but the `channels` branch only exists on `upstream`.
   Installed adapter + setup steps from `upstream/channels`; pinned deps
   (`@whiskeysockets/baileys@7.0.0-rc.9`, `qrcode@1.5.4`, `pino@9.6.0`).
2. **Auth keystore not copied** (`2b` logged `files=0`): copied
   `/root/nanoclaw/store/auth/` → `store/auth/`.
3. **DM routing mismatch**: migrate keyed the DM messaging group by the raw LID
   `74577845702810@lid`, but the adapter normalizes inbound DMs to the phone JID.
   Repointed `platform_id` → `420603221742@s.whatsapp.net`, deleted the stray
   auto-created group.
4. **OneCLI gateway too old**: stale `ghcr.io/onecli/onecli:latest` (pre-`/v1` API)
   → SDK 2.2.1 got 404s, containers couldn't spawn. Upgraded to pinned
   `onecli-gateway: 1.36.0`; persisted `ONECLI_BIND_HOST=172.17.0.1` to
   `~/.onecli/.env`. (See `docs/onecli-upgrades.md`.)
5. **Root-host file permissions**: host is root but containers run as `node` (uid 1000),
   so migrated root-owned mounts were unwritable (`EACCES`, "readonly database").
   Applied ACLs incl. defaults so new session dirs stay writable:
   `setfacl -R -m u:1000:rwX -m d:u:1000:rwX data/v2-sessions groups`.
6. **Skills delivered as real-dir copies** in each group's `.claude-shared/skills/`,
   shadowing the `/app/skills` symlink mechanism. Converted to symlinks →
   `/app/skills/<name>` so `container/skills/` is the single source of truth.

## Access policy
- DM (`jirka-lid`): `public`.
- Group (`Quick msgs`): `request_approval` (unknown senders → approval to owner).

## CLAUDE.local.md cleanup
- `groups/main`: kept identity + Obsidian KB and Apple Reminders integrations; stripped v1 boilerplate now covered by v2 fragments.
- `groups/whatsapp_quick-msgs`: reduced to identity.

## Fork customizations (Phase 4)
- Custom container skills ported: `apple-reminders`, `capabilities`, `monksheets`,
  `obsidian-vault`, `status`, `wrike`. Fixed v1-only paths in `capabilities`/`status`
  (`/workspace/group` → `/workspace/agent`; removed `/workspace/{project,ipc,extra}`).
- v1 src WhatsApp/Baileys fixes: **not ported** (obsolete — v2 uses upstream's adapter).

## Obsidian vault SSH access (fixed 2026-06-26)
The `obsidian-vault` skill SSHes to megakoko (Mac mini, tailscale `100.78.110.118`)
to run `obsidian-cli`, but migration never ported V1's SSH-key delivery — V2's
mount-security hard-blocks `.ssh`/`id_ed25519` and forces extra mounts under
`/workspace/extra/`, so V1's `/home/node/.ssh/id_ed25519` mount is impossible. OneCLI
can't help either: its secrets are HTTP-injection only (host/path-pattern → header/param),
nothing materializes a private key for `ssh`. Restored with a **dedicated** agent key
(not the user's personal key):
- `~/.config/nanoclaw/ssh/megakoko` (node-owned 0600, outside the project tree),
  authorized on megakoko with `from="100.69.243.85"` (this host's tailscale IP).
- Allowlist root `~/.config/nanoclaw/ssh` (read-only) in `mount-allowlist.json`;
  `container_configs.additional_mounts` → mounts it read-only at `/workspace/extra/megakoko`.
- Skill updated to `ssh -i /workspace/extra/megakoko ...`; `search`/`search-content`
  (obsidian-cli v0.2.2 is GUI-oriented) replaced with headless `find`/`grep` over the vault.
- Container→tailscale egress itself was fine (host SNAT `172.17.0.0/16 ! -o docker0`);
  the earlier `TCP22_FAIL` was megakoko sleeping, not a network regression.
- **Follow-up (2026-06-28):** agent still failed because the recurring nightly-task
  prompt (`messages_in` row `task-1782604884673-zo629v`, cron `0 2 * * *`, owner-DM
  session) hardcoded the dead V1 key path. Rewrote that row's `content`
  (`/home/node/.ssh/id_ed25519` → `/workspace/extra/megakoko`).
- **Follow-up 2 (2026-06-28):** the agent *still* reflexively reached for
  `~/.ssh/id_ed25519` (V1 muscle memory, ignoring the skill). Rather than keep
  fighting it, `container/entrypoint.sh` now auto-copies the RO-mounted key from
  `/workspace/extra/megakoko` to `~/.ssh/id_ed25519` (0600) at container start
  (guarded on the mount existing; no-op elsewhere; ephemeral under `--rm`), so plain
  `ssh jirifabian@…` works without `-i`. Note ssh itself comes from the **per-group**
  image's `openssh-client` apt package, not the base — so both the base image and the
  per-group image `…:ag-1782116733067-ph39jr` had to be rebuilt (`./container/build.sh`
  then a `FROM base + apt install openssh-client` derived build). Re-verified
  end-to-end through the real shipped entrypoint: provisions the key, plain `ssh`
  returns vault content. The per-group image only inherits base/entrypoint changes on
  rebuild — a plain next-message spawn reuses the cached derived image.

## Second SSH host: newkoko — Obsidian vault fallback (added 2026-06-29)
Replicated the megakoko SSH pattern for **newkoko** (Mac mini, tailscale
`100.115.140.20`, user `jirifabian`) at Jirka's request, to serve as an
**iCloud-synced fallback for the Obsidian vault when megakoko is offline**. newkoko has
the same vault (same iCloud path) and `obsidian-cli` v0.2.3; set its default vault with
`obsidian-cli set-default brain` so the skill's no-`--vault` commands work unchanged.
The `obsidian-vault` skill + Emilek's `CLAUDE.local.md` now document the megakoko→newkoko
fallback rule. Setup details:
- Dedicated agent key `~/.config/nanoclaw/ssh/newkoko` (node-owned 0600); pubkey to be
  authorized on newkoko `~/.ssh/authorized_keys` with `from="100.69.243.85"` (this host).
- Mounted read-only at `/workspace/extra/newkoko` via `container_configs.additional_mounts`
  (group `ag-1782116733067-ph39jr` / `main`) + materialized into `groups/main/container.json`.
  The existing allowlist root `~/.config/nanoclaw/ssh` already covers it.
- A second ed25519 key can't be SSH-auto-discovered (only `id_ed25519`/`id_rsa`/… are), so
  `entrypoint.sh` provisions it to `~/.ssh/id_newkoko` **and** writes `~/.ssh/config` with
  `Host newkoko 100.115.140.20 → IdentityFile ~/.ssh/id_newkoko` (and a megakoko alias). So
  plain `ssh newkoko` and `ssh jirifabian@100.115.140.20` both work; `ssh -i
  /workspace/extra/newkoko …` is equivalent.
- Same rebuild requirement as Follow-up 2: rebuilt base image + per-group image
  `…:ag-1782116733067-ph39jr`. Verified in-container that ssh is present, both keys +
  config provision, and `ssh -G newkoko` resolves to the right key. End-to-end SSH pends
  the remote authorizing the pubkey.

## Scheduled tasks
- `migrated-nightly-build` (cron `0 2 * * *`, 3am Prague property/deal monitoring) was
  skipped by migrate (target group "Bot particka" not wired). Restored into the owner
  DM session, redirected to deliver to the DM.

## Open items / notes
- Orphan folder `groups/whatsapp_main/` (own `soul.md`/`memories.md`, not wired to any
  agent group) left untouched — review or delete later.
- `onecli` CLI binary still v1.2.1; the `onecli-cli` pin is 2.2.5 — binary upgrade pending.
- v1 fully decommissioned (2026-06-22): unpushed commits pushed to `origin/main`,
  systemd unit `nanoclaw.service` removed, `/root/nanoclaw` deleted. v2 verified to
  have no runtime dependency on v1 before removal. Fork history remains on
  `git@github.com:filemon/nanoclaw.git`.
