# FPB Tracker — Technical Specification

> Architecture decisions, stack rationale, data models, and infrastructure plan.

---

## Stack

Built on top of [`misterlinderman/baseapp`](https://github.com/misterlinderman/baseapp) — a production-ready MERN starter with TypeScript, Auth0, and Tailwind CSS.

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Vite + React 18 + TypeScript | From base template |
| Styling | Tailwind CSS | JDP brand colours via CSS variables |
| Routing | React Router v6 | From base template |
| Backend | Express.js + TypeScript | From base template |
| Database | MongoDB Atlas + Mongoose | From base template |
| Auth | Auth0 | Retained from template; RBAC for role enforcement |
| QR Generation | `qrcode` npm package | Generates SVGs server-side |
| File Import | `multer` + `xlsx` | CSV and Excel upload support |
| PDF Export | Puppeteer | Headless Chrome for Avery sticker sheet rendering |
| File Storage | AWS S3 | QR image hosting |
| Frontend hosting | Vercel | CDN, instant preview deploys per branch |
| API hosting | Railway | Node/Express via Dockerfile for Puppeteer support |

---

## Authentication & Roles

Auth0 is retained from the base template. Roles are managed via **Auth0 RBAC** and included in the JWT token payload.

Defined roles:

```
admin | fabricator | driver | installer | pm
```

- Workers stay logged in on their device (7-day expiry + refresh token)
- The scan handler at `/scan/:unitId` reads the worker's role from their JWT and presents only the valid next action for that role
- Role middleware on all protected Express routes validates role against the action being attempted

---

## Data Models

### `Unit`

Core record for each FPB assembly.

```typescript
interface IUnit {
  _id: ObjectId;
  project: ObjectId;              // ref → Project
  equipmentId: string;            // e.g. "FPB-30-01"
  floor: number;
  referenceDocument: string;
  submittalGPM: number;
  designGPM: number;
  lineSize: string;               // e.g. "3/4\""
  ctlSize: string;                // e.g. "1/2\""
  supplyDirection: 'Left' | 'Right';
  qrCodeUrl: string;              // S3 URL

  fabricated: StageStatus | null;
  delivered: StageStatus | null;
  installed: StageStatus | null;

  createdAt: Date;
  updatedAt: Date;
}

interface StageStatus {
  completedAt: Date;
  completedBy: ObjectId;          // ref → User
}
```

### `ScanEvent`

Audit log — one document per scan action.

```typescript
interface IScanEvent {
  _id: ObjectId;
  unit: ObjectId;                 // ref → Unit
  user: ObjectId;                 // ref → User
  action: 'fabricated' | 'delivered' | 'installed';
  timestamp: Date;
  location?: { lat: number; lng: number };  // optional GPS from mobile
}
```

### `Project`

Top-level container, enables multi-project use in future.

```typescript
interface IProject {
  _id: ObjectId;
  name: string;
  client: string;
  createdAt: Date;
}
```

---

## API Routes

All routes are prefixed `/api`. Protected routes require a valid Auth0 JWT.

### Auth (from base template)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users/me` | Current user profile |

### Units
| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/units` | admin, pm | List all units (filterable) |
| POST | `/api/units` | admin | Create single unit |
| PUT | `/api/units/:id` | admin | Update unit record |
| DELETE | `/api/units/:id` | admin | Remove unit |
| POST | `/api/units/import` | admin | Bulk import from CSV/Excel |
| GET | `/api/units/:id` | all | Get single unit (used by scan handler) |

### Scan
| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/api/scan/:unitId` | fabricator, driver, installer | Update unit stage status, write ScanEvent |

The scan route validates that the worker's role maps to a permitted action and that the previous stage is already complete (e.g. cannot mark Delivered if not yet Fabricated).

### QR
| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/api/qr/generate` | admin | Generate QR codes for a batch of units, upload to S3 |
| GET | `/api/qr/sheet` | admin | Return print-ready Avery PDF as download |

### Export
| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/export/csv` | admin, pm | Export current unit status table as CSV |

---

## Frontend Pages

| Route | Component | Access | Description |
|-------|-----------|--------|-------------|
| `/` | `Dashboard` | all | Redirect to role-appropriate view |
| `/admin` | `AdminDashboard` | admin | Overview + quick actions |
| `/admin/import` | `AdminImport` | admin | Drag-and-drop CSV/Excel uploader with column mapping |
| `/admin/qr` | `QRManager` | admin | Batch QR generation + PDF sticker download |
| `/dashboard` | `LiveDashboard` | all | Filterable live status table |
| `/scan/:unitId` | `ScanHandler` | fabricator, driver, installer | Mobile-optimised scan action page |
| `/print` | `StickerPrint` | admin | Avery 5160 print preview + download trigger |

---

## QR + PDF Sticker Details

- QR codes encode the URL `https://<domain>/scan/:unitId`
- Generated server-side using the `qrcode` package (SVG output)
- Stored in **AWS S3**, URL persisted to the Unit document
- Sticker PDF uses **Puppeteer** rendering an HTML template formatted to **Avery 5160** spec:
  - 30 labels per sheet
  - Each label: 1" × 2-5/8"
  - Label content: Equipment # (large), Floor, QR code image
- PDF served as a direct download from `/api/qr/sheet`

---

## Infrastructure

### Vercel (Frontend)
- Auto-deploy on push to `main`
- Preview deployments on feature branches
- Environment variables: `VITE_API_URL`, `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`

### Railway (API)
- Deploy via **Dockerfile** (required for Puppeteer/Chromium support)
- Railway's Node.js auto-detect buildpack does not include a Chrome binary
- Base image: `node:20-slim` + Chromium install in Dockerfile
- Alternative: `@sparticuz/chromium` npm package (avoids Dockerfile, faster to ship)
- Environment variables: `MONGODB_URI`, `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`

### MongoDB Atlas
- Free tier sufficient for development
- Production: M10 cluster minimum for reliability
- Collections: `units`, `scanevents`, `projects`, `users`

### AWS S3
- Single bucket for QR image storage
- Public read on QR image objects (required for PDF rendering)
- Bucket policy restricts write to API service role only

---

## Recommended Project File Structure

Additions to the base template — existing template structure is unchanged.

```
fpb-tracker/
├── client/src/
│   ├── pages/
│   │   ├── AdminDashboard.tsx
│   │   ├── AdminImport.tsx
│   │   ├── QRManager.tsx
│   │   ├── ScanHandler.tsx         ← /scan/:unitId  (mobile-first)
│   │   ├── LiveDashboard.tsx
│   │   └── StickerPrint.tsx
│   └── types/
│       └── unit.ts                 ← shared Unit + StageStatus types
│
├── server/src/
│   ├── models/
│   │   ├── Unit.ts
│   │   ├── ScanEvent.ts
│   │   └── Project.ts
│   ├── routes/
│   │   ├── units.ts
│   │   ├── scan.ts
│   │   ├── qr.ts
│   │   └── export.ts
│   └── services/
│       ├── qrService.ts            ← qrcode generation + S3 upload
│       ├── pdfService.ts           ← Puppeteer + Avery 5160 layout
│       └── importService.ts        ← xlsx/CSV parsing + bulk insert
│
└── Dockerfile                      ← Railway deploy with Chromium
```

---

## Third-Party Packages to Add

```bash
# Server
npm install qrcode @types/qrcode
npm install multer @types/multer xlsx
npm install puppeteer           # or @sparticuz/chromium for Railway
npm install aws-sdk             # S3 upload
npm install socket.io           # optional: real-time dashboard updates

# Client
npm install socket.io-client    # optional: if using real-time
```

---

## Build Phases

### Phase 1 — Foundation (2–3 weeks)
Auth setup, user roles via Auth0 RBAC, Unit model, CRUD routes, CSV/manual import, basic data table in admin.

### Phase 2 — QR and Scan (1–2 weeks)
QR generation service, S3 integration, mobile scan handler page, role-gated status update logic, ScanEvent logging.

### Phase 3 — PDF and Dashboard (1–2 weeks)
Puppeteer PDF renderer, Avery 5160 sticker layout, live dashboard with filters (floor, stage, date range), CSV export, PM read-only view.

### Phase 4 — Polish (1 week)
Email/SMS notifications on stage completion, activity log view, mobile PWA optimisation, JDP brand styling pass.

---

## Open Questions

- Will multiple projects run concurrently in this app, or is it single-project for now?
- Does JDP want email/SMS notifications when a stage completes, and if so, to whom?
- GPS location logging on scan events — nice-to-have or required?
- Should the PM dashboard be accessible without login (shareable link) or always require auth?
