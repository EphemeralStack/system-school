# Student Enrollment Date Fix

Replace these complete files:

```text
app/(dashboard)/admin/students/page.tsx
app/api/admin/students/route.ts
```

The fix:

- accepts existing Appwrite ISO date-time values;
- extracts `YYYY-MM-DD` correctly for the edit input;
- renders dates without appending a second time component;
- avoids timezone-driven day shifts;
- stores edited enrollment dates as valid ISO date-time values.

After replacing the files, run:

```powershell
npx tsc --noEmit
```
