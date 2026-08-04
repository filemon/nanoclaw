# Obsidian Vault Access

Access Jirka's Obsidian vault "brain" via SSH + obsidian-cli. The vault lives on two
Macs that sync the **same** vault over iCloud:

- **megakoko** (`100.99.163.67`) — primary.
- **newkoko** (`100.119.185.105`) — fallback, used when megakoko is offline/unreachable.

Both run `obsidian-cli` at `/opt/homebrew/bin/obsidian-cli` against the identical vault
at the same path, so any command below works against either host unchanged.

## Connection

Each Mac has its **own** dedicated agent key, mounted read-only under `/workspace/extra/`.
Always connect with the explicit key **and** `-o IdentitiesOnly=yes`, so only that host's
key is offered — offering several keys trips the remote's `MaxAuthTries` and fails with
"Too many authentication failures". (There is no `~/.ssh/config` in the container; the
bare `ssh megakoko` alias form does **not** work — use the full command below.)

- **megakoko** (primary):
  `ssh -i /workspace/extra/megakoko -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new jirifabian@100.99.163.67 "<command>"`
- **newkoko** (fallback):
  `ssh -i /workspace/extra/newkoko -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new jirifabian@100.119.185.105 "<command>"`

> newkoko was migrated to the current Tailscale tailnet on 2026-07-09 (IP `100.119.185.105`).
> If newkoko SSH returns `Permission denied (publickey)`, its `authorized_keys` `from=`
> restriction may still pin the old docker-ce IP — fix on newkoko (prefer `from="100.64.0.0/10"`).
> megakoko remains the primary path.

**Fallback rule:** always try **megakoko** first. If it times out or the connection
fails (megakoko asleep/offline), retry the **exact same command** against **newkoko** —
the vault content is identical. Only report "vault unreachable" to Jirka if *both* fail.

> ℹ️ **newkoko is intermittently unreachable since its 2026-07-09 tailnet migration** — its
> peer-to-peer path to this host goes stale and SSH times out even when newkoko is awake.
> This is expected and cosmetic. **Do NOT treat a newkoko timeout as "vault down" or raise
> it to Jirka unless megakoko *also* fails.** megakoko (always-on Mac mini) is the reliable
> primary and holds the identical vault; a newkoko-only timeout means nothing.

## obsidian-cli Commands

All commands run on megakoko via SSH. The default vault is "brain" at `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/brain/`.

### Print a note
```bash
ssh -i /workspace/extra/megakoko -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new jirifabian@100.99.163.67 "/opt/homebrew/bin/obsidian-cli print '<note-path>'"
```
Example: `obsidian-cli print 'Wrike/TODO'`

Add `-m` to include linked mentions at the end.

### Search notes by name
The installed `obsidian-cli` (v0.2.2) `search`/`search-content` subcommands are
GUI-oriented (they open the note in the Obsidian app) and do NOT return results
over a headless SSH session. For searching, use plain shell against the vault dir:

```bash
# By filename:
ssh -i /workspace/extra/megakoko -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new jirifabian@100.99.163.67 "find ~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/brain -iname '*<term>*'"
```

### Search note content
```bash
ssh -i /workspace/extra/megakoko -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new jirifabian@100.99.163.67 "grep -ril '<term>' ~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/brain"
```

### Create a note
```bash
ssh -i /workspace/extra/megakoko -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new jirifabian@100.99.163.67 "/opt/homebrew/bin/obsidian-cli create '<note-path>' --content '<content>'"
```

### Delete a note
```bash
ssh -i /workspace/extra/megakoko -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new jirifabian@100.99.163.67 "/opt/homebrew/bin/obsidian-cli delete '<note-path>'"
```

### Move/rename a note
```bash
ssh -i /workspace/extra/megakoko -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new jirifabian@100.99.163.67 "/opt/homebrew/bin/obsidian-cli move '<source>' '<dest>'"
```

### List vault contents (fallback)
```bash
ssh -i /workspace/extra/megakoko -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new jirifabian@100.99.163.67 "ls ~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/brain/<folder>/"
```

### Read/write raw files (fallback)
```bash
ssh -i /workspace/extra/megakoko -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new jirifabian@100.99.163.67 "cat ~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/brain/<path>"
ssh -i /workspace/extra/megakoko -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new jirifabian@100.99.163.67 "cat > ~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/brain/<path>" <<< "content"
```

## Vault Structure

Key folders: AI, Wrike, diary, Personal, TopMonks, India COE, Klaxoon, CZPodcast, Collectum, Betonbau

## Notes

- If megakoko is offline, SSH will timeout (~5–8s). Retry the same command against `newkoko` (fallback) before telling the user the vault is unreachable.
- The vault syncs via iCloud — changes appear on all devices.
- Use `obsidian-cli` for structured operations, raw SSH for bulk reads or when obsidian-cli doesn't support an operation.
