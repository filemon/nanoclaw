---
name: wrike
description: Read and manage Wrike tasks, spaces, and users via the Wrike v4 REST API. Use when the user asks about Wrike tasks, projects, spaces, folders, assignees, or wants to create/update/complete a Wrike task.
allowed-tools: Bash(wrike\ *)
---

# Wrike — Tasks, Spaces, Users

Use the `wrike` CLI to call the Wrike v4 API. Auth is handled by the OneCLI gateway — the token is injected on the wire, no need to pass it.

## First-use setup

```bash
ln -sf /home/node/.claude/skills/wrike/wrike /usr/local/bin/wrike 2>/dev/null || {
  mkdir -p ~/bin && ln -sf /home/node/.claude/skills/wrike/wrike ~/bin/wrike
  export PATH="$HOME/bin:$PATH"
}
```

## Usage

```
wrike <METHOD> <path> [curl-args...]
```

Examples:

```bash
# Who am I
wrike GET "/contacts?me=true"

# List spaces
wrike GET /spaces

# Tasks in a space (active only), with description + assignees
wrike GET "/tasks?spaces=[IEAGCXXXXX]&status=Active&fields=['description','responsibleIds']"

# Get one task
wrike GET /tasks/IEAGCXXXXXKQYABC

# Create a task in a folder/space root
wrike POST /folders/IEAGCXXXXX/tasks -d '{"title":"Review PR","description":"Look at #123","importance":"High"}'

# Update a task (mark completed)
wrike PUT /tasks/IEAGCXXXXXKQYABC -d '{"status":"Completed"}'

# Add a comment
wrike POST /tasks/IEAGCXXXXXKQYABC/comments -d '{"text":"Done, please review."}'
```

## Notes

- IDs look like `IEAGCXXXXX` — they're not numeric. Resolve names → IDs by listing first (`/contacts`, `/spaces`).
- Wrike returns minimal fields by default. Pass `?fields=['description','customFields','attachmentCount']` to get more.
- Most query-param arrays use the form `?status=Active` or `?spaces=[id1,id2]` (brackets, no quotes inside).
- Dates are ISO 8601: `"2026-05-20T15:00:00"`. Wrike interprets in the requester's account timezone unless `Z` is appended.
- See `api-reference.md` in this skill directory for the endpoint list.

## Troubleshooting

- **401 / "Not authorized"** — the OneCLI gateway isn't injecting the Wrike token. On the host, run `onecli secrets list` and confirm a secret with host-pattern `www.wrike.com` exists. If not, see the project README for OneCLI token setup.
- **400 with "Invalid request parameters"** — array params usually need `[id1,id2]` (no quotes) and the bracket form must be URL-safe in `curl`. Quote the whole URL.
