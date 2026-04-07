# MonkSheets API Reference

Base URL: `https://monksheets.topmonks.com`

## Auth

| Method | Path | Notes |
|--------|------|-------|
| GET | /api/auth/me | Current user info |
| GET | /api/auth/token | Get API token |
| POST | /api/auth/token | Generate new token |
| DELETE | /api/auth/token | Revoke token |
| GET | /api/auth/preferences | User preferences |
| PATCH | /api/auth/preferences | Update preferences |
| POST | /api/auth/logout | Logout |
| POST | /api/auth/exchange | Exchange auth code for JWT. Body: `{code}` |

## Time Entries

| Method | Path | Query/Body |
|--------|------|------------|
| GET | /api/time/entries/daily | `?date=YYYY-MM-DD` |
| GET | /api/time/entries/weekly | `?week=YYYY-WNN` (ISO week) |
| GET | /api/time/entries/range | `?startDate=...&endDate=...` |
| POST | /api/time/entries | `{projectId, date, hours, description, task}` |
| PATCH | /api/time/entries/{id} | `{hours, description, task}` |
| DELETE | /api/time/entries/{id} | |

## Timesheets

| Method | Path | Query/Body |
|--------|------|------------|
| GET | /api/time/timesheet/current | Current period timesheet |
| GET | /api/time/timesheets | `?limit=N` |
| GET | /api/time/timesheets/{id} | Timesheet details |
| GET | /api/time/timesheets/{id}/history | State transition history |
| POST | /api/time/timesheets/{id}/submit | Submit for approval |
| POST | /api/time/timesheets/{id}/rows | Add project row. Body: `{projectId}` |
| DELETE | /api/time/timesheets/{id}/rows/{projectId} | Remove project row |
| POST | /api/time/timesheets/{id}/approve | Approve (manager only) |
| POST | /api/time/timesheets/{id}/reject | Reject. Body: `{reason}` |
| POST | /api/time/timesheets/import | Import from Tempo XLSX |
| GET | /api/time/timesheets/pending | `?state=...&periodId=...&userId=...` |
| GET | /api/time/timesheets/all | `?state=...&periodId=...&userId=...&projectId=...&page=N&pageSize=N` |

## Admin Timesheet Operations

| Method | Path | Body |
|--------|------|------|
| GET | /api/time/admin/timesheets/pending | Pending timesheets |
| POST | /api/time/admin/timesheets/{id}/approve | Admin approve |
| POST | /api/time/admin/timesheets/{id}/reject | `{reason}` |
| POST | /api/time/admin/timesheets/{id}/reopen | Reopen timesheet |
| POST | /api/time/admin/timesheets/{id}/submit | Submit on behalf |
| DELETE | /api/time/admin/timesheets/{id} | Delete open timesheet |
| POST | /api/time/admin/timesheets/bulk/submit | `{ids: [...]}` |
| POST | /api/time/admin/timesheets/bulk/approve | `{ids: [...]}` |
| POST | /api/time/admin/timesheets/bulk/reject | `{ids: [...], reason}` |
| POST | /api/time/admin/timesheets/bulk/delete | `{ids: [...]}` |

## Periods

| Method | Path | Notes |
|--------|------|-------|
| GET | /api/time/periods/current | Current period info |

## Time Projects & Tasks

| Method | Path | Query/Body |
|--------|------|------------|
| GET | /api/time/projects | `?search=...&all=bool` |
| GET | /api/time/projects/{projectId}/tasks | Task names for project |
| PUT | /api/time/projects/{projectId}/tasks | `{code, name, status, origin, plannedHours}` |
| GET | /api/time/projects/{projectId}/tasks/hours | `?name=...` — tasks with logged hours |

## Projects (Management)

| Method | Path | Query/Body |
|--------|------|------------|
| GET | /api/projects | `?state=...&customerId=...&projectManagerId=...&search=...&onlyParents=bool&onlyMine=bool&labelIds=...&includeArchived=bool` |
| POST | /api/projects | `{name, fullName, description, customerId, parentId, projectManagerId, startDate, endDate, defaultRate, hoursTotal, moneyTotal, isDefault, mandatoryTasks, labelIds}` |
| GET | /api/projects/{id} | Project details |
| PATCH | /api/projects/{id} | Update project (same fields as POST) |
| DELETE | /api/projects/{id} | Delete project |
| GET | /api/projects/{id}/children | Direct child projects |
| GET | /api/projects/{id}/descendants | All descendant projects |
| GET | /api/projects/{id}/ancestors | Parent hierarchy |
| GET | /api/projects/{id}/statistics | Project statistics |
| GET | /api/projects/{id}/investment-summary | Investment breakdown |
| GET | /api/projects/{id}/subproject-statistics | Subproject stats |
| GET | /api/projects/{id}/sweat-equity | `?month=N&year=YYYY` |
| POST | /api/projects/{id}/start | Start project |
| POST | /api/projects/{id}/pause | Pause project |
| POST | /api/projects/{id}/resume | Resume project |
| POST | /api/projects/{id}/complete | Complete project |
| POST | /api/projects/{id}/cancel | Cancel project |
| POST | /api/projects/{id}/reopen | Reopen project |
| POST | /api/projects/{id}/archive | Archive project |

## Project Assignments

| Method | Path | Body |
|--------|------|------|
| GET | /api/projects/{id}/assignments | List assignments |
| POST | /api/projects/{id}/assignments | `{userId, startDate, endDate, billingRate, hourlyCosts, userInvestment, roleName}` |
| PATCH | /api/projects/{id}/assignments/{assignmentId} | Update assignment (same fields) |
| DELETE | /api/projects/{id}/assignments/{assignmentId} | Remove assignment |

## Customers

| Method | Path | Query/Body |
|--------|------|------------|
| GET | /api/customers | `?search=...` |
| POST | /api/customers | `{name}` |
| GET | /api/customers/{id} | Customer details |
| PATCH | /api/customers/{id} | `{name}` |
| DELETE | /api/customers/{id} | Delete customer |

## Labels

| Method | Path | Body |
|--------|------|------|
| GET | /api/labels | List labels |
| POST | /api/labels | `{name, color, description, isSystem}` |
| GET | /api/labels/admin | Admin label view |
| PATCH | /api/labels/{id} | `{name, color, description, isSystem}` |
| DELETE | /api/labels/{id} | Delete label |

## Time Off

| Method | Path | Query/Body |
|--------|------|------------|
| GET | /api/time-off/types | Available time off types |
| POST | /api/time-off/types | `{name}` |
| PUT | /api/time-off/types/{id} | `{name}` |
| DELETE | /api/time-off/types/{id} | Delete type |
| GET | /api/time-off/ | `?year=YYYY&state=...` |
| POST | /api/time-off/ | `{timeOffTypeId, dateFrom, dateTo, dateFromHours, dateToHours}` |
| GET | /api/time-off/team | Team approved time offs |
| GET | /api/time-off/{id} | Single request details |
| DELETE | /api/time-off/{id} | Cancel request |
| POST | /api/time-off/{id}/submit | Submit for approval |
| POST | /api/time-off/{id}/approve | Approve (manager) |
| POST | /api/time-off/{id}/reject | `{reason}` |
| GET | /api/time-off/admin/all | All requests (manager) |
| GET | /api/time-off/admin/pending | Pending requests (manager) |
| DELETE | /api/time-off/admin/{id} | Cancel any request (manager) |
| POST | /api/time-off/bulk/approve | `{ids: [...]}` |
| POST | /api/time-off/bulk/reject | `{ids: [...], reason}` |
| POST | /api/time-off/bulk/cancel | `{ids: [...]}` |
| POST | /api/time-off/bulk/submit | `{ids: [...]}` |
| GET | /api/time-off/calendar | `?startDate=...&endDate=...` |
| GET | /api/time-off/summary | `?year=YYYY` — annual balance |

## Expenses

| Method | Path | Query/Body |
|--------|------|------------|
| GET | /api/expenses | `?state=...&projectId=...` |
| POST | /api/expenses | `{projectId, description}` |
| GET | /api/expenses/{id} | Expense details |
| PUT | /api/expenses/{id} | `{description, projectId}` |
| DELETE | /api/expenses/{id} | Delete expense |
| POST | /api/expenses/{id}/submit | Submit expense |
| POST | /api/expenses/{id}/cancel | Cancel expense |

## Holidays & Approvals

| Method | Path | Query |
|--------|------|-------|
| GET | /api/holidays | `?year=YYYY` — Czech public holidays |
| GET | /api/approval-counts | Pending approval badge counts |

## Health

| Method | Path |
|--------|------|
| GET | /api/health |
| GET | /api/health/deep |
| GET | /api/time/health |
| GET | /api/time-off/health |
| GET | /api/auth/health |
