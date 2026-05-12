# Wrike API Reference (v4)

Base URL: `https://www.wrike.com/api/v4`
Auth: `Authorization: Bearer <permanent-token>` — injected by OneCLI gateway.

Wrike returns minimal fields by default. Add `?fields=['fieldName',...]` (URL-encoded, no quotes inside the brackets in raw form) to get more.

## Users (Contacts)

| Method | Path | Notes |
|--------|------|-------|
| GET | /contacts | All contacts. `?me=true` → just current user. `?metadata=[...]` for metadata filter. |
| GET | /contacts/{contactId} | Get one user. Multiple IDs comma-separated in path. |
| PUT | /contacts/{contactId} | Update profile (mostly own profile). |

Useful `fields`: `metadata`, `workScheduleId`, `customFields`, `phone`, `title`, `companyName`, `location`.

## Spaces

| Method | Path | Notes |
|--------|------|-------|
| GET | /spaces | List visible spaces. |
| GET | /spaces/{spaceId} | Get one space. Pass `?fields=['members','description']` for details. |
| POST | /spaces | Create space. Body: `{title, description?, accessType?, members?}` |
| PUT | /spaces/{spaceId} | Update space metadata or membership. |
| DELETE | /spaces/{spaceId} | Delete space. |

## Folders / Projects

A "space" is the top-level container; below that, **folders** and **projects** form the hierarchy. Tasks live inside folders/projects, not directly in spaces.

| Method | Path | Notes |
|--------|------|-------|
| GET | /folders | All folders user can see. Filter: `?descendants=true&fields=['description']`. |
| GET | /spaces/{spaceId}/folders | Folders directly under a space. |
| GET | /folders/{folderId} | Get folder details. |
| GET | /folders/{folderId}/folders | Subfolders. |
| POST | /folders/{folderId}/folders | Create a folder under another. Body: `{title, description?, project?}`. |
| PUT | /folders/{folderId} | Update folder. |
| DELETE | /folders/{folderId} | Move folder to trash. |

Note: spaces also have an implicit "root folder" — to create a task directly under a space, use the space's root folder ID (returned by `GET /spaces/{spaceId}?fields=['rootFolderId']`).

## Tasks

| Method | Path | Notes |
|--------|------|-------|
| GET | /tasks | Query tasks. Filters: `spaces=[id]`, `status=Active|Completed|Deferred|Cancelled`, `importance=High|Normal|Low`, `responsibles=[contactId]`, `authors=[contactId]`, `customStatuses=[id]`, `createdDate={"start":"2026-01-01T00:00:00","end":"..."}`, `updatedDate=...`, `completedDate=...`, `dueDate=...`, `permalink=<url>`. |
| GET | /tasks/{taskId} | Get one task (comma-separated for many). Useful `fields`: `description, briefDescription, parentIds, superParentIds, sharedIds, responsibleIds, recurrent, attachmentCount, customFields, dependencyIds, subTaskIds`. |
| GET | /folders/{folderId}/tasks | Tasks in a folder. Same filters as `/tasks`. |
| POST | /folders/{folderId}/tasks | Create. Body: `{title, description?, status?, importance?, dates?:{start,due,type}, parents?:[ids], responsibles?:[contactIds], followers?:[contactIds], shareds?:[ids], customFields?:[{id,value}], priorityBefore?, priorityAfter?}`. |
| PUT | /tasks/{taskId} | Update. Body: same fields as create plus `addParents`, `removeParents`, `addResponsibles`, `removeResponsibles`, etc. Mark done with `{"status":"Completed"}`. |
| DELETE | /tasks/{taskId} | Move to trash. |

### Status values
- Built-in: `Active`, `Completed`, `Deferred`, `Cancelled`.
- Custom statuses live per workflow — query with `GET /workflows`.

### Dates
ISO 8601 in the user's account timezone unless `Z` is appended. For a task with start + due:
```json
"dates": { "type": "Planned", "start": "2026-05-20T09:00:00", "due": "2026-05-22T17:00:00" }
```

## Comments

| Method | Path | Notes |
|--------|------|-------|
| GET | /tasks/{taskId}/comments | Comments on a task. |
| POST | /tasks/{taskId}/comments | Add comment. Body: `{text, plainText?:true}`. |
| GET | /folders/{folderId}/comments | Comments on a folder. |
| DELETE | /comments/{commentId} | Delete own comment. |

## Attachments

| Method | Path | Notes |
|--------|------|-------|
| GET | /tasks/{taskId}/attachments | List task attachments. |
| GET | /attachments/{id}/download | Get binary content. |
| POST | /tasks/{taskId}/attachments | Upload. Use `-H "X-File-Name: foo.pdf" --data-binary @foo.pdf` and the wrapper's curl args pass-through. |

## Custom Fields

| Method | Path | Notes |
|--------|------|-------|
| GET | /customfields | List custom field definitions. |
| GET | /customfields/{id} | One custom field. |

Set on a task: `{"customFields":[{"id":"IEAGC...","value":"My value"}]}`.

## Workflows (Custom Statuses)

| Method | Path | Notes |
|--------|------|-------|
| GET | /workflows | Workflows + their custom statuses. |

## Rate Limits & Errors

- Wrike rate-limits at the account level. On HTTP 429, back off and retry.
- Errors return `{"errorDescription": "...", "error": "..."}`. The wrapper passes `-sf` so non-2xx responses fail loudly.
