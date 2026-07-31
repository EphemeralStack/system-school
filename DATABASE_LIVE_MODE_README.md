# Database Live Mode

This pack removes known runtime mock/fallback records from the current School
Management Suite dashboards.

## Replaced with live Appwrite reads

- Admin Global Configuration counts, ledger, RBAC and notifications
- Financial Auditing Desk records, totals, trends and alerts
- Academic Matrix allocations, marks, attendance, resources and alerts
- Teacher dashboard profile, allocations, attendance and timetable
- Student dashboard class, subjects, attendance, marks, timetable and fees
- Applicant dashboard profile, application status, announcements and calendar
- User Accounts school filter that hid seeded profiles

## Install

Extract the ZIP into the project root and run:

```powershell
powershell -ExecutionPolicy Bypass -File .\install-live-database-mode.ps1
npx tsc --noEmit
npm run audit:data
```

The audit intentionally ignores seed scripts and test files. It reports known
mock/fallback runtime datasets left in application code.

Labels, UI configuration, status mappings and chart colors remain static by
design. Actual records, totals, names, amounts, alerts and operational metrics
come from Appwrite.
