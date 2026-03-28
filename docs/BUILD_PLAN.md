# FPB Tracker — Phased Build Plan

> Step-by-step build guide with exact Cursor / Claude prompts for each task.
> Read `.cursorrules` before starting. Reference approved mockups in `context/screenshots/mockups/`.

---

## Before You Begin

### Repository Setup

The base template is at: https://github.com/misterlinderman/jdpmechanical

The repo root **is** the application — there is no extra subdirectory nesting. Client code lives at `/client`, server code at `/server`. If you cloned and see an extra wrapper directory, move everything up one level.

```bash
# Verify structure looks like this at root:
ls
# client/  server/  .cursorrules  .gitignore  Dockerfile  package.json  ...
```

### Environment Setup

Before Phase 1, collect and set the following:

**client/.env**
```
VITE_API_URL=http://localhost:5000
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_AUDIENCE=https://fpb-tracker-api
```

**server/.env**
```
MONGODB_URI=mongodb+srv://...
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://fpb-tracker-api
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=fpb-tracker-qr
PORT=5000
```

### Auth0 Setup (do this first)

1. Create an Auth0 Application (Single Page Application) for the frontend
2. Create an Auth0 API resource with audience `https://fpb-tracker-api`
3. Create roles in Auth0: `admin`, `fabricator`, `driver`, `installer`, `pm`
4. Enable RBAC in the API settings so roles appear in the JWT
5. Create one test user per role for development

---

## Phase 1 — Foundation

**Goal:** Working auth, all five roles, Unit CRUD, CSV/Excel import, basic data table in admin.
**Estimate:** 2–3 weeks / ~30 hours

---

### Step 1.1 — Verify Base Template Runs

**Prompt:**
```
I'm starting the FPB Tracker build on top of the base template at /. 
Help me verify the project runs correctly:
1. Check that `client/` and `server/` both have their dependencies installed
2. Confirm the existing Auth0 integration works by checking the auth middleware in server/src/middleware/
3. Start both client and server and confirm the app loads at localhost:5173
4. List any missing dependencies or configuration issues

Read .cursorrules for project context before starting.
```

---

### Step 1.2 — Auth0 Role Middleware

**Prompt:**
```
Add role-based access control middleware to the Express server.

Requirements:
- Read the user's role from the Auth0 JWT payload (it will be in the token after enabling RBAC)
- Create a `requireRole(...roles: string[])` middleware function that checks the decoded JWT
- Roles are: admin | fabricator | driver | installer | pm
- Return 403 with a clear message if the role doesn't match
- Add this to server/src/middleware/auth.ts (extending the existing auth middleware)
- Export both the existing auth check and the new role check

Read .cursorrules for the exact role definitions and middleware patterns to follow.
```

---

### Step 1.3 — Project + Unit Mongoose Models

**Prompt:**
```
Create the Mongoose models for FPB Tracker.

Create these files:
- server/src/models/Project.ts
- server/src/models/Unit.ts  
- server/src/models/ScanEvent.ts

Use the exact interfaces from .cursorrules (the Core Data Model Reference section).
- Project: name, client, createdAt
- Unit: all fields from IUnit — equipmentId, floor, referenceDocument, submittalGPM, designGPM, lineSize, ctlSize, supplyDirection, qrCodeUrl, project ref, fabricated/delivered/installed as StageStatus | null
- ScanEvent: unit ref, user ref, action enum (fabricated|delivered|installed), timestamp, optional GPS location

Also create the shared TypeScript type file at client/src/types/unit.ts with IUnit, StageStatus, and IScanEvent interfaces.
```

---

### Step 1.4 — Unit CRUD API Routes

**Prompt:**
```
Create the Unit CRUD API routes at server/src/routes/units.ts.

Routes to implement (all prefixed /api, as per .cursorrules):
- GET /api/units — list all units, filterable by floor and stage via query params, roles: admin, pm
- POST /api/units — create single unit, role: admin
- PUT /api/units/:id — update unit record, role: admin
- DELETE /api/units/:id — remove unit, role: admin
- GET /api/units/:id — get single unit, all authenticated roles

Use the existing auth middleware and the new requireRole middleware.
Return consistent JSON: { success: boolean, data?: any, error?: string }
Use 400 for bad input, 401 for auth, 403 for role violations, 404 for missing records.

Register these routes in the main Express app.
```

---

### Step 1.5 — CSV/Excel Import Service

**Prompt:**
```
Create the CSV/Excel import service for bulk unit upload.

Create server/src/services/importService.ts that:
1. Accepts a parsed file buffer (from multer)
2. Uses the xlsx package to parse both .csv and .xlsx/.xls files
3. Auto-detects column headers and maps them to the Unit schema fields:
   - "Equipment #" → equipmentId
   - "Floor" → floor
   - "Reference Document" → referenceDocument
   - "Submittal GPM" → submittalGPM
   - "Design GPM" → designGPM
   - "Line size" or "Line Size" → lineSize
   - "CTL size" or "CTL Size" → ctlSize
   - "Supply Side (flow)" or "Supply Side" → supplyDirection (normalize to Left|Right)
4. Validates all required fields are present
5. Returns: { valid: Unit[], errors: { row: number, message: string }[], columnMap: object }
6. Does NOT do the DB insert — just parsing and validation

Then create the POST /api/units/import route in units.ts that:
1. Uses multer to handle file upload (in-memory storage, no disk writes)
2. Calls importService
3. Bulk inserts valid units using Unit.insertMany()
4. Returns summary: { inserted: number, errors: [...] }
```

---

### Step 1.6 — Admin Import Page (UI)

**Prompt:**
```
Build the AdminImport page at client/src/pages/AdminImport.tsx.

Reference: context/screenshots/mockups/import-admin.png for the approved design.

The page has two panels side-by-side:
LEFT PANEL:
- Drag-and-drop upload zone accepting .csv, .xlsx, .xls
- "Browse files" button as fallback
- Below that: manual single-unit entry form with fields for equipmentId, floor, lineSize, supplyDirection (Left/Right select)
- "Add unit" button

RIGHT PANEL (shows after file is selected):
- "Column mapping" table showing: Your column → Maps to → Status (✓ matched / ⚠ review)
- Green success banner: "Ready to import — N units detected · 0 errors"
- Checklist: file parsed, columns matched, no duplicates, types validated
- "Import N units" button (gold, full width)

Use the brand colours from .cursorrules. Match the mockup styling closely.
Wire up to POST /api/units/import.
Show a success state after import completes.
```

---

### Step 1.7 — Basic Admin Dashboard with Unit Table

**Prompt:**
```
Build the AdminDashboard page at client/src/pages/AdminDashboard.tsx.

Reference: context/screenshots/mockups/dashboard-admin.png for the approved design.

Include:
1. Four stat cards: Total Units, Fabricated (gold), Delivered (blue), Installed (green)
   - Each with count, progress bar, and percentage
2. Two-column panel row:
   - Left: "Progress by floor" — horizontal bar chart showing fabrication progress per floor
   - Right: "Recent activity" — last 5 scan events with badge, equipment ID, worker name, time ago
3. Below: "Unit status table" section with:
   - Floor and stage filter dropdowns
   - Export CSV button
   - Table: Equipment #, Floor, Fabricated badge, Delivered badge, Installed badge, Line size, GPM

Fetch data from GET /api/units.
Use the badge colours from .cursorrules (amber=fabricated, blue=delivered, green=installed, slate=pending).
This is a desktop admin screen — not mobile-first.
```

---

### Step 1.8 — Phase 1 Checkpoint

**Prompt:**
```
Phase 1 checkpoint. Help me verify everything is working:

1. Can an admin user log in via Auth0?
2. Does GET /api/units return data (test with 5 manually seeded units)?
3. Does the import page successfully parse a test CSV and bulk insert units?
4. Does the admin dashboard display units with correct stage badges?
5. Are the role middleware tests passing — does a fabricator get 403 on admin routes?

Run through these checks and identify any gaps before we move to Phase 2.
```

---

## Phase 2 — QR & Scan

**Goal:** QR code generation, S3 upload, mobile scan handler, role-gated stage updates, audit log.
**Estimate:** 1–2 weeks / ~24 hours

---

### Step 2.1 — QR Generation Service

**Prompt:**
```
Create the QR code generation service at server/src/services/qrService.ts.

Requirements:
1. Use the `qrcode` npm package to generate QR codes as SVG strings (server-side)
2. Each QR code encodes the URL: `${process.env.APP_DOMAIN}/scan/${unitId}`
3. Upload the SVG to AWS S3 using aws-sdk
   - Bucket: process.env.S3_BUCKET_NAME
   - Key pattern: `qr/${unitId}.svg`
   - ACL: public-read (required for PDF rendering later)
4. Return the public S3 URL
5. Export two functions:
   - generateQRCode(unitId: string): Promise<string> — single unit
   - generateQRBatch(unitIds: string[]): Promise<{ unitId: string, url: string }[]> — batch

Then create POST /api/qr/generate in server/src/routes/qr.ts:
- Accepts: { unitIds: string[] } or { all: true } for all units without QR
- Calls generateQRBatch
- Updates each Unit document with the returned qrCodeUrl
- Returns: { generated: number, urls: { unitId, url }[] }
- Role: admin only
```

---

### Step 2.2 — Scan Route (Stage Update)

**Prompt:**
```
Create the scan route at server/src/routes/scan.ts.

POST /api/scan/:unitId

This is the most critical route in the app. It must:

1. Authenticate the user (use existing auth middleware)
2. Look up the unit by :unitId
3. Determine the permitted action for the user's role:
   - fabricator → set fabricated (no prerequisite)
   - driver → set delivered (requires unit.fabricated to exist)
   - installer → set installed (requires unit.delivered to exist)
4. Reject if:
   - Role is admin or pm (no scan action for these roles)
   - The stage for this role is already set (already done)
   - The prerequisite stage is not complete (return clear error message)
5. If valid:
   - Set unit.[stage] = { completedAt: new Date(), completedBy: req.user._id }
   - Create a ScanEvent document (unit, user, action, timestamp)
   - Save both
   - Return the updated unit
6. Wrap in a transaction if possible for atomicity

Return shapes:
- Success: { success: true, unit: IUnit, event: IScanEvent }
- Error: { success: false, error: string, code: 'ALREADY_DONE' | 'PREREQUISITE_MISSING' | 'WRONG_ROLE' }
```

---

### Step 2.3 — ScanHandler Page (Mobile)

**Prompt:**
```
Build the ScanHandler page at client/src/pages/ScanHandler.tsx.

Route: /scan/:unitId
This is the PRIMARY field-facing screen. Mobile-first. Read .cursorrules ScanHandler rules carefully.

Reference approved mockups:
- context/screenshots/mockups/scan-handler-fabricator.png
- context/screenshots/mockups/scan-handler-driver.png  
- context/screenshots/mockups/scan-handler-installer.png

On mount:
1. Load unit from GET /api/units/:unitId
2. Read the user's role from Auth0

Display:
- Header: "Scanned unit" label, large equipment ID (e.g. FPB-30-33), floor + line size + supply direction
- Unit detail card: submittalGPM, designGPM, ctlSize, referenceDocument
- Stage timeline: 3 steps (Fabricated, Delivered, Installed)
  - Done steps: green check icon + worker name + timestamp
  - Active step (the one this role can act on): gold arrow icon + "Mark as [stage]" + "Tap to confirm"
  - Locked steps: muted, "Awaiting prior stage"
- CTA button: full-width, large, role-coloured
  - Fabricator: gold, "Mark fabricated"
  - Driver: blue (#378ADD), "Mark delivered"
  - Installer: green, "Mark installed"

Error states:
- Wrong role: "This unit is not in your stage" explanation
- Already done: "This stage was completed by [name] on [date]"
- Previous stage incomplete: "Fabrication must be complete before delivery"

POST to /api/scan/:unitId on button tap. Optimistic UI — update immediately, roll back on error.

Keep the component under 200 lines. Extract the stage timeline as a sub-component.
```

---

### Step 2.4 — QR Manager Page (Admin)

**Prompt:**
```
Build the QRManager page at client/src/pages/QRManager.tsx.

Reference: context/screenshots/mockups/qr-manager-admin.png

Left panel — QR grid:
- 5-column grid of QR card thumbnails
- Each card: white QR image box + equipment ID label below
- Cards without QR yet: placeholder state (muted, dashed)
- "695 of 700 QR codes generated · 5 pending" status line
- "Select all" and "Generate batch" buttons in section header

Right panel:
- "Avery 5160 sticker preview" panel
  - Small preview grid (3 columns, 6 labels visible)
  - Each preview label: black QR square + Equipment # (bold) + Floor label
  - "Download PDF — all 700" button (gold, full width)
  - "Download by floor" button (secondary)
- "S3 storage" panel: progress bar showing X/700 stored

Wire up:
- "Generate batch" → POST /api/qr/generate with all units missing qrCodeUrl
- "Download PDF — all 700" → GET /api/qr/sheet (triggers download)
- "Download by floor" → GET /api/qr/sheet?floor=XX

Refresh the QR grid after generation completes.
```

---

### Step 2.5 — Phase 2 Checkpoint

**Prompt:**
```
Phase 2 checkpoint. Verify the full scan flow end-to-end:

1. Generate a QR code for a test unit — does it appear in S3?
2. Open /scan/[unitId] on a mobile device (or Chrome DevTools mobile mode)
   - Does the unit data load?
   - Is the correct CTA button shown for the logged-in user's role?
3. Tap the CTA — does the unit's stage update in the database?
4. Is a ScanEvent created in MongoDB?
5. Scan the same unit again with the same role — do you get the ALREADY_DONE error?
6. Try to scan as the wrong role — do you get WRONG_ROLE?
7. Does the admin dashboard reflect the stage update after refreshing?

Document any failures with screenshots in context/screenshots/bugs/.
```

---

## Phase 3 — PDF & Live Dashboard

**Goal:** Puppeteer PDF renderer, Avery 5160 layout, live dashboard with real-time updates, PM view, CSV export.
**Estimate:** 1–2 weeks / ~20 hours

---

### Step 3.1 — Puppeteer PDF Service

**Prompt:**
```
Create the Avery 5160 PDF service at server/src/services/pdfService.ts.

Avery 5160 spec:
- US Letter page (8.5" × 11")
- 30 labels per sheet, 3 columns × 10 rows
- Each label: 1" tall × 2-5/8" wide
- Margins: top 0.5", left 0.1875", right 0.1875"
- Label content: Equipment # (bold, large), Floor, QR code image (from S3 URL)

Implementation:
1. Accept an array of: { equipmentId: string, floor: number, qrCodeUrl: string }[]
2. Render an HTML template formatted to the Avery 5160 grid
   - Use CSS grid or table layout to place 30 labels per page
   - Multiple pages if > 30 units
   - Each label: QR image on left, text on right
3. Use Puppeteer to render the HTML to PDF
   - printBackground: true
   - format: 'Letter'
   - margin: { top: '0', right: '0', bottom: '0', left: '0' }
   - (use the HTML template's own margins)
4. Return the PDF buffer

Note on Puppeteer in Railway: we're using a Dockerfile with Chromium installed.
Use puppeteer-core and point to the system Chromium path in the Dockerfile environment.
Export: generateStickerPDF(units: StickerData[]): Promise<Buffer>
```

---

### Step 3.2 — QR Sheet Download Route

**Prompt:**
```
Add the GET /api/qr/sheet route to server/src/routes/qr.ts.

Behaviour:
1. Accept optional query param: ?floor=30 to filter by floor
2. Query units from MongoDB (with qrCodeUrl set; optionally filtered by floor)
3. Call pdfService.generateStickerPDF with the unit data
4. Set response headers:
   - Content-Type: application/pdf
   - Content-Disposition: attachment; filename="fpb-stickers-[date].pdf"
5. Pipe the PDF buffer to the response

Also add a GET /api/qr/preview route that returns just the first page as a PNG (for the UI preview thumbnail).

Role: admin only.
```

---

### Step 3.3 — Real-time Dashboard with Socket.io

**Prompt:**
```
Add real-time updates to the dashboard using Socket.io.

Server setup (server/src/index.ts):
1. Attach Socket.io to the existing Express HTTP server
2. After any successful scan (in the scan route), emit a 'unit:updated' event with the updated unit
3. After a bulk import, emit a 'units:imported' event with the count

Client setup (client/src/):
1. Create a custom hook: useRealtimeUnits.ts
   - Connects to Socket.io on mount
   - Listens for 'unit:updated' events
   - Updates the local units state (replace the matching unit by _id)
   - Listens for 'units:imported' to trigger a full refetch
   - Cleans up the socket connection on unmount
2. Use this hook in AdminDashboard and LiveDashboard

The PM view banner should show "Live — updating in real time · Last scan X minutes ago"
using the timestamp from the most recent socket event.
```

---

### Step 3.4 — PM Dashboard (Read-Only Live View)

**Prompt:**
```
Build the LiveDashboard page at client/src/pages/LiveDashboard.tsx.

This serves both the Admin live view and the PM read-only view.
Reference: context/screenshots/mockups/pm-dashboard.png

Components:
1. Live banner (for PM): green dot + "Live — updating in real time · Last scan X ago · Read-only"
2. Four stat cards (same as admin dashboard)
3. Filter row:
   - Search input: equipment # search (client-side filter)
   - Floor dropdown
   - Stage dropdown (All / Fabricated / Delivered / Installed / Pending)
   - Export CSV button (shown for admin and pm)
4. Full unit status table:
   - Columns: Equipment #, Floor, Stage (badge), Fabricated By, Fab Time, Delivered By, Del Time, Installed By, Inst Time
   - All timestamps formatted as "Mon 08:40" or "Today 08:14" or "Yesterday"
   - Worker names shown as first initial + last name (e.g. "A. Manos")
   - Pending cells show "—"

PM users: show the live banner, hide admin actions (no import button, no QR manager link).
Admin users: no banner needed, show full nav.

Use the useRealtimeUnits hook from Step 3.3.
CSV export calls GET /api/export/csv with current filters as query params.
```

---

### Step 3.5 — CSV Export Route

**Prompt:**
```
Create the CSV export route at server/src/routes/export.ts.

GET /api/export/csv
Roles: admin, pm

Query params:
- floor (optional): filter by floor number
- stage (optional): filter by fabricated|delivered|installed|pending

Export all matching units as CSV with these columns:
Equipment ID, Floor, Reference Document, Line Size, CTL Size, Supply Direction,
Submittal GPM, Design GPM,
Fabricated By, Fabricated At,
Delivered By, Delivered At,
Installed By, Installed At

For each StageStatus, resolve the completedBy ObjectId to a user name.
Format timestamps as ISO 8601.
Pending stages show empty cells.

Response headers:
- Content-Type: text/csv
- Content-Disposition: attachment; filename="fpb-status-[YYYY-MM-DD].csv"

Register this route in the main app.
```

---

### Step 3.6 — Phase 3 Checkpoint

**Prompt:**
```
Phase 3 checkpoint. Full end-to-end verification:

1. Generate QR codes for all 700 units (or a test batch of 30)
2. Download the Avery 5160 PDF — does it open correctly and show 30 labels per page?
3. Open the admin dashboard — does it update in real time when a scan event fires?
4. Log in as a PM user — is the dashboard read-only? Does the live banner appear?
5. Apply a floor filter — does the table filter correctly?
6. Export to CSV — does the file download with all columns and correct data?
7. Open /scan/:unitId on mobile and complete a scan — does the dashboard update within 2 seconds?

Capture reference screenshots in context/screenshots/reference/ after everything passes.
```

---

## Phase 4 — Polish

**Goal:** Brand styling pass, mobile PWA optimisation, activity log, optional notifications.
**Estimate:** 1 week / ~12 hours

---

### Step 4.1 — JDP Brand Styling Pass

**Prompt:**
```
Do a full brand styling pass across all pages in client/src/pages/.

Reference: context/screenshots/mockups/ for all approved screens.
Reference: the brand variables in .cursorrules (Brand / Styling section).

Check each page for:
1. Consistent use of CSS variables (--navy, --gold, --white-dim, etc.) — no hardcoded colour values
2. Font consistency: DM Sans for body text, DM Mono for data/numbers
3. Stage badge colours: amber=fabricated, blue=delivered, green=installed, slate=pending
4. Button hierarchy: primary (gold), secondary (outline-gold), tertiary (navy-light)
5. Table styling: muted borders, hover states on rows
6. ScanHandler mobile: verify touch targets are minimum 48px, test at 375px viewport width
7. Empty states: all tables/lists should have designed empty states (not blank)

Produce a list of specific changes needed before making them.
```

---

### Step 4.2 — ScanHandler PWA Optimisation

**Prompt:**
```
Optimise the ScanHandler for mobile PWA use.

1. Add a web app manifest (client/public/manifest.json):
   - name: "FPB Tracker"
   - short_name: "FPB"
   - theme_color: "#0f1923" (JDP navy)
   - background_color: "#0f1923"
   - display: "standalone"
   - start_url: "/"
   - Icons at 192x192 and 512x512 (create simple JDP navy + gold mark SVGs)

2. In ScanHandler.tsx:
   - Add loading skeleton state (show while unit data loads)
   - Add offline detection — show a banner if navigator.onLine is false
   - Ensure the page works at 320px minimum width
   - Test that the CTA button is thumb-reachable at bottom of screen

3. Add the manifest link to index.html and the theme-color meta tag

4. Test on iOS Safari and Android Chrome (use Chrome DevTools device emulation if no physical device)
```

---

### Step 4.3 — Activity Log Page

**Prompt:**
```
Build an Activity Log page at client/src/pages/ActivityLog.tsx.

Route: /admin/activity
Role: admin

Shows all ScanEvents in reverse chronological order.

Features:
- Full-width table: Time, Equipment ID, Floor, Stage (badge), Worker, Worker Role
- Filter by: date range (from/to), worker, stage, floor
- Infinite scroll or pagination (20 events per page)
- "Load more" button at bottom

Each row:
- Timestamp formatted as "Jan 15 at 2:34 PM"
- Equipment ID links to the unit (opens a unit detail modal or navigates to dashboard filtered to that unit)
- Stage badge (amber/blue/green)
- Worker name + role badge

Add a link to the Activity Log from the AdminDashboard nav.

Fetch from GET /api/events (create this route: query ScanEvent, populate unit and user, return paginated results).
```

---

### Step 4.4 — Dockerfile for Railway

**Prompt:**
```
Create the Dockerfile for Railway deployment.

Requirements:
- Base image: node:20-slim
- Install Chromium for Puppeteer (required for PDF generation)
- Set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true (we're providing our own)
- Set PUPPETEER_EXECUTABLE_PATH to the installed Chromium binary
- Copy server/ code and install dependencies
- Expose PORT from environment
- CMD: node dist/index.js (after TypeScript compilation)

Also create a .dockerignore file excluding:
- node_modules/
- client/ (frontend is on Vercel, not Railway)
- .env files
- dist/ (built inside Docker)
- context/screenshots/ (not needed at runtime)

Add a note at the top of the Dockerfile explaining why Chromium is needed (Puppeteer for Avery PDF generation).
```

---

### Step 4.5 — Final Deployment Checklist

**Prompt:**
```
Help me run through the production deployment checklist for FPB Tracker.

Frontend (Vercel):
1. Connect the GitHub repo to Vercel
2. Set root directory to client/
3. Add all VITE_ environment variables
4. Deploy — confirm build succeeds and the app loads

Backend (Railway):
1. Connect the GitHub repo to Railway
2. Railway will detect the Dockerfile and use it
3. Add all server environment variables (MONGODB_URI, AUTH0_*, AWS_*, S3_BUCKET_NAME, APP_DOMAIN)
4. Deploy — confirm the API is reachable at the Railway URL
5. Update VITE_API_URL in Vercel to point to the Railway URL

Auth0:
1. Add the production Vercel URL to Auth0 Allowed Callback URLs
2. Add the production URL to Allowed Logout URLs and Allowed Web Origins

MongoDB Atlas:
1. Add Railway's outbound IPs to the Atlas IP allowlist (or use 0.0.0.0/0 for simplicity)
2. Confirm the M10 cluster is provisioned for production reliability

AWS S3:
1. Confirm the S3 bucket has public-read ACL on objects
2. Confirm CORS is configured to allow the production domain

Test production:
1. Log in as each role
2. Scan a test unit end-to-end
3. Download the Avery PDF
4. Export CSV

Document any issues found in context/screenshots/bugs/.
```

---

## Appendix A — Prompt Templates

Use these when you need to ask Cursor or Claude for help mid-build.

### Debugging a UI Component

```
I'm working on [component name] in client/src/pages/[file].tsx.

Current issue: [describe the problem]
Screenshot of the problem: context/screenshots/bugs/[filename].png
Expected behaviour (from mockup): context/screenshots/mockups/[filename].png

The relevant API endpoint is [METHOD /api/path].
The component currently does: [brief description]

Please [fix / help me understand / suggest an approach].
Read .cursorrules for brand and coding conventions.
```

### Debugging an API Route

```
I'm getting an error in the [route name] API route at server/src/routes/[file].ts.

Error: [paste the error message]
Request: [METHOD /api/path with sample payload]
Expected response: [what you expect]

The relevant models are Unit and ScanEvent (see .cursorrules for the schemas).
The auth middleware is already applied.

Please help me diagnose and fix this.
```

### Adding a New Feature

```
I need to add [feature description] to FPB Tracker.

Context from .cursorrules:
- This affects the [Unit / ScanEvent / UI] layer
- The relevant existing code is in [file paths]
- The user role that needs this is [role]

Please implement this following the project conventions in .cursorrules.
Keep the implementation minimal — don't add abstractions that aren't needed yet.
```

---

## Appendix B — Key File Locations

| What | Where |
|------|-------|
| Project goals + client context | `docs/PROJECT_OVERVIEW.md` |
| Full architecture + data models | `docs/TECHNICAL_SPEC.md` |
| Cursor rules + conventions | `.cursorrules` |
| Approved mockups (HTML) | `fpb-tracker-mockups.html` |
| Mockup screenshots | `context/screenshots/mockups/` |
| Bug screenshots | `context/screenshots/bugs/` |
| Shared TypeScript types | `client/src/types/unit.ts` |
| Auth middleware | `server/src/middleware/auth.ts` |
| Unit model | `server/src/models/Unit.ts` |
| Scan route (most critical) | `server/src/routes/scan.ts` |
| QR service | `server/src/services/qrService.ts` |
| PDF service | `server/src/services/pdfService.ts` |
| Import service | `server/src/services/importService.ts` |
