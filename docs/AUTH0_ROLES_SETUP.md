# Auth0: roles in the access token (FPB Tracker)

The FPB Tracker API reads roles from the **access token** JWT only (see `server/src/middleware/auth.ts`: claim `https://<AUTH0_AUDIENCE>/roles`). Assigning roles under **User Management → Roles** is not enough unless those roles also appear on the **access token** your SPA sends to Railway.

Some tenants do not show **“Add Roles in the Access Token”** on the API. Use **Actions** to put role names into the token, and ensure token **refresh** paths get the same claims.

---

## Prerequisites (check once)

1. **Single API identifier**  
   In **Applications → APIs**, your API identifier must match everywhere:

   - Railway: `AUTH0_AUDIENCE`
   - Vercel: `VITE_AUTH0_AUDIENCE`
   - Same value (e.g. `https://api.jdpmechanical.com` — no trailing slash unless you created it that way).

2. **SPA application**  
   The Vercel app must request that API on login (your code already passes `audience` in `client/src/main.tsx`).

3. **API RBAC**  
   **APIs → [your API] → Settings → RBAC:** enable **Enable RBAC**.  
   **“Add Permissions in the Access Token”** is optional for this app; the backend expects the **custom claim** `https://api.jdpmechanical.com/roles`, not the Permissions claim.

4. **Roles and users**  
   Under **User Management → Roles**, define roles: `admin`, `pm`, `fabricator`, `driver`, `installer`. Assign users to those roles as needed.

---

## Why two triggers?

| Trigger | When it runs | Why you need it |
|--------|----------------|-----------------|
| **Login / Post Login** | Interactive login (redirect flow) | First access and ID tokens after sign-in |
| **Credentials Exchange** | Token endpoint (includes **refresh** and silent token use) | Refreshed access tokens often **do not** re-run Post Login; without this, roles can disappear after refresh |

Both should set the **same** access-token custom claim your API expects.

---

## Claim shape (must match the server)

- **Claim name:** `https://api.jdpmechanical.com/roles`  
  (Must match `AUTH0_AUDIENCE` + `/roles` — if your audience differs, change the claim string to match.)

- **Claim value:** JSON array of role **name** strings, e.g. `["admin"]` or `["fabricator"]`.

The Express helper `extractRoles` reads this namespaced key from the JWT payload.

---

## Step A — Machine-to-machine (M2M) application (for fallback)

If `event.authorization.roles` is empty in Actions, load roles with the **Management API**.

1. **Applications → Applications → Create Application**  
   - Type: **Machine to Machine**  
   - Authorize it for the **Auth0 Management API**.

2. **Grant** at least these scopes (names vary by dashboard / tenant; use the permission search in **Applications → [M2M] → APIs → Auth0 Management API**):

   - `read:users` — list users (clear any filter and search `users` if you do not see it).
   - `read:roles` — list roles and read a user’s roles (`GET /api/v2/users/{id}/roles`).
   - **Assign / remove roles on users** — many tenants no longer show a single `assign:roles`. Enable the scopes your dashboard offers that correspond to **`POST` and `DELETE` `/api/v2/users/{id}/roles`**, commonly:
     - `create:role_members` and `delete:role_members`, **or**
     - `update:roles` (some tenants bundle membership changes here), **or**
     - legacy `assign:roles` if it still appears.  
   If saving roles in **Users & roles** returns **403**, open [Management API → Users](https://auth0.com/docs/api/management/v2#!/Users/post_user_roles) in the API explorer for your tenant and match the **required scope** shown there.

3. Note the M2M **Client ID** and **Client Secret** and your Auth0 **tenant domain** (e.g. `dev-xxxx.us.auth0.com`).

### Optional: same M2M for the API server (Users & roles UI)

The SPA route **`/admin/users`** (admins only) calls the backend **`/api/admin/auth0/*`**, which uses the Management API with client credentials. On Railway (or your API host), set:

- `AUTH0_MANAGEMENT_CLIENT_ID` — M2M application Client ID  
- `AUTH0_MANAGEMENT_CLIENT_SECRET` — M2M Client Secret  

`AUTH0_DOMAIN` must match the tenant used by the SPA. You can reuse the same M2M app you use in Actions (add the role-member scopes above), or create a dedicated M2M app with `read:users`, `read:roles`, plus the assign/remove scopes your tenant lists for user–role endpoints.

4. In each Action that uses the Management API, add **Secrets** (Auth0 Action editor → **Secrets**):

   - `AUTH0_DOMAIN` — tenant domain only (no `https://`)
   - `MGT_CLIENT_ID` — M2M client ID  
   - `MGT_CLIENT_SECRET` — M2M client secret  

5. In the Action, add the npm dependency **`auth0`** (Actions → **Dependencies** → `auth0` with a current major version supported by the runtime).

---

## Step B — Helper: resolve role names

Use this pattern inside Actions (adjust imports to the `auth0` package version you use):

1. If `event.authorization?.roles` exists and has entries, map each entry to a string:

   - If the entry is a string, use it.
   - If it is an object, use `name` (or the field your tenant returns).

2. If the array is still empty, call the Management API:

   - Instantiate `ManagementClient` with `domain`, `clientId`, `clientSecret` from secrets.
   - Resolve the user id from the Action `event` (Post Login: typically `event.user.user_id`).
   - Call the Management API to list roles assigned to that user (see Auth0 doc: **Get user roles**).
   - Map results to an array of role **name** strings.

3. If the array is still empty, exit without setting the claim (user truly has no roles).

---

## Step C — Post Login action

1. **Actions → Library → Create Action** (or edit **JDP Mechanical**).  
   Trigger: **Login / Post Login**.

2. Implement:

   - Resolve `names` (array of strings) using Step B.
   - If `names.length === 0`, return.
   - `const claim = 'https://api.jdpmechanical.com/roles';` (must match your real audience + `/roles`).
   - `api.accessToken.setCustomClaim(claim, names);`
   - Optionally `api.idToken.setCustomClaim(claim, names);` if you want the Profile page / user object to show roles without decoding the access token.

3. **Deploy** the Action.

4. **Actions → Triggers → Post Login** — ensure this Action is in the flow **before** “Complete”.

---

## Step D — Credentials Exchange action (refresh / token endpoint)

1. **Actions → Library → Create Action**  
   Trigger: **Credentials Exchange** (or the name your dashboard uses for “token issued from token endpoint”).

2. **Guard by audience** so you only modify tokens for your API:

   - If `event.resource_server.identifier` (or the field your runtime documents) does not equal your API identifier (e.g. `https://api.jdpmechanical.com`), **return** without changes.

3. Resolve the **user** identifier for this grant. The field name depends on grant type (authorization code vs refresh). Use Auth0’s **Credentials Exchange** event documentation for your runtime to read the correct `user_id` / subject.

4. Reuse the same logic as Step B to build `names` (Management API fallback is often required here because `event.authorization.roles` may be missing).

5. `api.accessToken.setCustomClaim('https://api.jdpmechanical.com/roles', names);`  
   Do **not** rely on Post Login alone for this claim.

6. **Deploy** and attach this Action under **Actions → Triggers → Credentials Exchange** (order: after any dependencies, before complete).

---

## Step E — Verify

1. **Logout** from the app (or clear site data for `jdpmechanical.vercel.app`) so no stale token is reused.

2. Log in again.

3. In the browser **Network** tab, find a request to your API (e.g. `GET .../api/users/me/session`). Copy the `Authorization: Bearer` JWT.

4. Paste the token into [jwt.io](https://jwt.io) (payload only; do not paste secrets in public channels).

5. Confirm the payload contains:

   `"https://api.jdpmechanical.com/roles": ["admin"]`  
   (or another assigned role name)

6. In the app, Home should no longer show **“Token roles: none”** for that user.

---

## Troubleshooting

| Symptom | What to check |
|--------|----------------|
| Claim on Profile / ID token but **Token roles: none** | Access token missing the claim — fix Post Login + Credentials Exchange; decode **access** token, not only ID token. |
| Works once, fails after a while | Refresh path — ensure **Credentials Exchange** Action is deployed and audience-guarded. |
| `event.authorization.roles` always empty | Use Management API fallback (Step A–B). |
| 401 from API | `AUTH0_AUDIENCE` / `VITE_AUTH0_AUDIENCE` mismatch with API identifier, or wrong tenant. |
| Wrong tenant | Vercel and Railway Auth0 env vars must use the same **Auth0 Domain** and **Audience** as the dashboard you edit. |

---

## Reference (this repo)

- Server: `extractRoles` — `server/src/middleware/auth.ts`
- Session endpoint used by the SPA: `GET /api/users/me/session` — `server/src/routes/users.ts`
- Client: `useSessionRoles` — `client/src/hooks/useSessionRoles.ts`
- Admin Auth0 directory UI: `GET/PUT /api/admin/auth0/...` — `server/src/routes/auth0Admin.ts`, `server/src/services/auth0Management.ts`; page `client/src/pages/AdminAuth0Users.tsx` (route `/admin/users`, `RoleRoute` with `admin` only)
