# Admin Sidebar and Return Loading Fix

This pack:

1. Replaces the Academic Matrix sidebar with the same visual structure used by
   the Global Configuration sidebar.
2. Stores the loaded school record in browser session storage.
3. Restores that school record before paint when returning to the dashboard.
4. Refreshes the record quietly in the background.

## Install

Extract into the project root and replace the existing
`AdminWorkspaceShell.tsx`, then run:

```powershell
powershell -ExecutionPolicy Bypass -File .\install-admin-sidebar-return-fix.ps1
npx tsc --noEmit
```
