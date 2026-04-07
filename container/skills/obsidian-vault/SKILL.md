# Obsidian Vault Access

Access Jirka's Obsidian vault "brain" on megakoko (Mac mini) via SSH + obsidian-cli.

## Connection

```bash
ssh -o StrictHostKeyChecking=no jirifabian@100.78.110.118 "<command>"
```

The SSH key is at `/home/node/.ssh/id_ed25519` (mounted into the container).

## obsidian-cli Commands

All commands run on megakoko via SSH. The default vault is "brain" at `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/brain/`.

### Print a note
```bash
ssh jirifabian@100.78.110.118 "/opt/homebrew/bin/obsidian-cli print '<note-path>'"
```
Example: `obsidian-cli print 'Wrike/TODO'`

Add `-m` to include linked mentions at the end.

### Search notes by name (fuzzy)
```bash
ssh jirifabian@100.78.110.118 "/opt/homebrew/bin/obsidian-cli search '<term>'"
```

### Search note content
```bash
ssh jirifabian@100.78.110.118 "/opt/homebrew/bin/obsidian-cli search-content '<term>'"
```

### Create a note
```bash
ssh jirifabian@100.78.110.118 "/opt/homebrew/bin/obsidian-cli create '<note-path>' --content '<content>'"
```

### Delete a note
```bash
ssh jirifabian@100.78.110.118 "/opt/homebrew/bin/obsidian-cli delete '<note-path>'"
```

### Move/rename a note
```bash
ssh jirifabian@100.78.110.118 "/opt/homebrew/bin/obsidian-cli move '<source>' '<dest>'"
```

### List vault contents (fallback)
```bash
ssh jirifabian@100.78.110.118 "ls ~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/brain/<folder>/"
```

### Read/write raw files (fallback)
```bash
ssh jirifabian@100.78.110.118 "cat ~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/brain/<path>"
ssh jirifabian@100.78.110.118 "cat > ~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/brain/<path>" <<< "content"
```

## Vault Structure

Key folders: AI, Wrike, diary, Personal, TopMonks, India COE, Klaxoon, CZPodcast, Collectum, Betonbau

## Notes

- If megakoko is offline, SSH will timeout (5s). Inform the user.
- The vault syncs via iCloud — changes appear on all devices.
- Use `obsidian-cli` for structured operations, raw SSH for bulk reads or when obsidian-cli doesn't support an operation.
