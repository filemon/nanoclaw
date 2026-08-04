---
name: monksheets
description: Track time, manage timesheets, projects, time off, expenses, and invoicing via MonkSheets API. Use when the user asks about hours, timesheets, time off, PTO, vacation, projects, customers, expenses, or logging work.
allowed-tools: Bash(monksheets\ *)
---

# MonkSheets — Time Tracking & Project Management

Use the `monksheets` CLI to call the MonkSheets API. Auth is handled by OneCLI gateway.

## First-use setup

```bash
ln -sf /home/node/.claude/skills/monksheets/monksheets /usr/local/bin/monksheets 2>/dev/null || {
  mkdir -p ~/bin && ln -sf /home/node/.claude/skills/monksheets/monksheets ~/bin/monksheets
  export PATH="$HOME/bin:$PATH"
}
```

## Usage

```
monksheets <METHOD> <path> [curl-args...]
```

Examples:

```bash
monksheets GET /api/auth/me
monksheets GET "/api/time/entries/daily?date=2026-04-07"
monksheets POST /api/time/entries -d '{"projectId":"abc","date":"2026-04-07","hours":4,"description":"Feature X"}'
monksheets DELETE /api/time/entries/123
```

## Complete API Reference

See `api-reference.md` in this skill directory for the full endpoint list.
