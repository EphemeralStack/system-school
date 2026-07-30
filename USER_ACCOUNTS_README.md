# Admin User Accounts

This implementation follows the provided User Accounts design inside the
existing admin dashboard shell.

It includes:

- User security overview
- Live reads from `users`, `admins`, `teachers`, `students`, and `applicants`
- Active, pending, and restricted account totals
- Role distribution
- User search and role filtering
- Recent account activity
- CSV export
- Existing Student, Teacher, and Applicant add flows
- Role editing only when a matching target role profile already exists
- Account lock/unlock through valid role-specific status values
- User Accounts-specific right-panel alerts and quick actions
- Responsive desktop, tablet, and mobile layouts

## Accuracy note

The current schema has no failed-login or blocked-IP audit collection. Those
security panels state that the telemetry source is not connected instead of
displaying fabricated security events.

## Install

Extract into the project root, then run:

```powershell
powershell -ExecutionPolicy Bypass -File .\install-user-accounts.ps1
npx tsc --noEmit
```
