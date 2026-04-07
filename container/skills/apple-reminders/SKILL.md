# Apple Reminders Access

Access Jirka's Apple Reminders on megakoko (Mac mini) via SSH + osascript.

## Connection

```bash
ssh -o StrictHostKeyChecking=no jirifabian@100.78.110.118 "osascript -e '<applescript>'"
```

## Commands

### List all reminder lists
```bash
ssh jirifabian@100.78.110.118 "osascript -e 'tell application \"Reminders\" to get name of every list'"
```

Known lists: Buy, Movies, Reminders, Domacnost, TODO, Daily Adhoc, Family, Travel, Home, Expenses, Books, Games, Motorka, TopMonks, Work, Hobby, Healthy checks, and more.

### Get incomplete reminders from a list
```bash
ssh jirifabian@100.78.110.118 "osascript -e '
tell application \"Reminders\"
  set output to \"\"
  repeat with r in (every reminder in list \"LIST_NAME\" whose completed is false)
    set output to output & name of r & linefeed
  end repeat
  return output
end tell
'"
```

### Get reminders with due dates
```bash
ssh jirifabian@100.78.110.118 "osascript -e '
tell application \"Reminders\"
  set output to \"\"
  repeat with r in (every reminder in list \"LIST_NAME\" whose completed is false)
    set n to name of r
    try
      set d to due date of r as string
    on error
      set d to \"no due date\"
    end try
    set output to output & n & \" | \" & d & linefeed
  end repeat
  return output
end tell
'"
```

### Create a reminder
```bash
ssh jirifabian@100.78.110.118 "osascript -e '
tell application \"Reminders\"
  tell list \"LIST_NAME\"
    make new reminder with properties {name:\"REMINDER_TEXT\"}
  end tell
end tell
'"
```

### Create a reminder with due date
```bash
ssh jirifabian@100.78.110.118 "osascript -e '
tell application \"Reminders\"
  tell list \"LIST_NAME\"
    make new reminder with properties {name:\"REMINDER_TEXT\", due date:date \"YYYY-MM-DD HH:MM\"}
  end tell
end tell
'"
```

### Complete a reminder
```bash
ssh jirifabian@100.78.110.118 "osascript -e '
tell application \"Reminders\"
  set r to (first reminder in list \"LIST_NAME\" whose name is \"REMINDER_TEXT\" and completed is false)
  set completed of r to true
end tell
'"
```

### Delete a reminder
```bash
ssh jirifabian@100.78.110.118 "osascript -e '
tell application \"Reminders\"
  delete (first reminder in list \"LIST_NAME\" whose name is \"REMINDER_TEXT\")
end tell
'"
```

### Search reminders across all lists
```bash
ssh jirifabian@100.78.110.118 "osascript -e '
tell application \"Reminders\"
  set output to \"\"
  repeat with l in every list
    repeat with r in (every reminder in l whose completed is false and name contains \"SEARCH_TERM\")
      set output to output & name of l & \": \" & name of r & linefeed
    end repeat
  end repeat
  return output
end tell
'"
```

## Notes

- If megakoko is offline, SSH will timeout. Inform the user.
- Reminders sync via iCloud — changes appear on all Apple devices.
- AppleScript date format: `"2026-04-07 15:00"` (local time, Europe/Prague).
- For long lists, the command may take a few seconds.
- Always use double-escaped quotes in osascript: `\"` inside the SSH command.
