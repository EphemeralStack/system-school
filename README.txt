SECURE ADMIN USER PROVISIONING
==============================

Files:
- lib/appwrite/server.ts
- lib/admin/provision-user.ts
- app/api/admin/users/route.ts

The route:
- requires an Appwrite JWT from a logged-in caller;
- checks the caller's server-controlled "admin" label;
- confirms the caller has one active admins-table row;
- creates Auth, users-table and role-table records server-side;
- assigns the new role as an Appwrite label and preference;
- rolls back records if provisioning fails.

The helper:
- generates a short-lived Appwrite JWT;
- sends it to POST /api/admin/users;
- returns the generated temporary password once.

Required permanent server secret:
SCHOOL_APPWRITE_SERVER_API_KEY

Never prefix the key with NEXT_PUBLIC_.
