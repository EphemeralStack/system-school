# Admin Persistence Installer — Windows Line-Ending Fix

Replace:

```text
scripts\apply-admin-section-persistence.mjs
```

The previous installer safely stopped because the project files use Windows
`CRLF` line endings while the source matcher expected Unix `LF`.

This version:

- keeps untouched originals for backup;
- removes a leading UTF-8 BOM for matching;
- normalizes CRLF/CR line endings before patching;
- performs every preflight validation before writing any project file;
- still makes no partial changes when a matcher fails.

Run:

```powershell
node .\scripts\apply-admin-section-persistence.mjs
```
