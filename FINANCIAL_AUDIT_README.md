# Financial Auditing Desk

This implementation follows the provided Financial Auditing Desk reference
inside the existing Admin Dashboard shell.

It adds:

- Finance section URL synchronization
- Three compact KPI cards
- Live Appwrite reads from `fees`, `payments`, `students`, and `users`
- Ledger filters and search
- Responsive ledger table/cards
- Entry detail modal
- CSV export
- Audit trail
- Collection, outstanding, trend, and entry summaries
- Finance-specific notifications and quick actions
- Presentation fallbacks while the finance tables are empty

## Install

Extract the ZIP into the project root, then run:

```powershell
powershell -ExecutionPolicy Bypass -File .\install-financial-audit.ps1
npx tsc --noEmit
```
