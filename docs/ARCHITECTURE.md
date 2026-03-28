# FPB Tracker — Architecture Reference

> Quick-reference architecture document for use during development.
> For full details see TECHNICAL_SPEC.md.

---

## System Overview

```
Browser (Vercel CDN)          Railway (API + Puppeteer)       External Services
────────────────────          ──────────────────────────      ─────────────────
Vite + React 18 (TS)    ────► Express.js + TypeScript    ────► MongoDB Atlas
Tailwind CSS                  Mongoose ODM                ────► Auth0 (RBAC)
React Router v6               Auth0 JWT middleware         ────► AWS S3 (QR images)
Auth0 SPA SDK                 Socket.io (real-time)
Socket.io client              Puppeteer (PDF)
                              qrcode (QR generation)
                              multer + xlsx (import)
```

---

## Request Flow — Field Worker Scan

```
1. Worker opens phone camera
2. Scans QR sticker on assembly
3. Phone navigates to https://fpbtracker.jdpmechanical.com/scan/[unitId]
4. ScanHandler.tsx loads — reads unitId from URL params
5. Auth0 checks JWT (stored in localStorage, 7-day expiry)
6. GET /api/units/:unitId → returns unit data + current stage status
7. Worker sees unit details + one CTA button keyed to their role
8. Worker taps "Mark fabricated" (or delivered / installed)
9. POST /api/scan/:unitId → validates role + prerequisite → updates Unit → creates ScanEvent
10. Socket.io emits 'unit:updated' to all connected dashboard clients
11. ScanHandler shows success state
12. Admin/PM dashboards update in real time
```

---

## Data Flow — Admin Import

```
1. Admin navigates to /admin/import
2. Drops CSV/Excel file onto upload zone
3. AdminImport.tsx sends file to POST /api/units/import (multipart/form-data via multer)
4. importService.ts parses file with xlsx package
5. Auto-maps column headers to Unit schema fields
6. Validates all rows — returns { valid[], errors[] }
7. Unit.insertMany(valid) — bulk insert
8. Returns { inserted: N, errors: [...] }
9. AdminImport.tsx shows success state with count
10. Socket.io emits 'units:imported' — dashboard refetches
```

---

## Data Flow — QR Generation + PDF

```
1. Admin navigates to /admin/qr
2. Clicks "Generate batch" 
3. POST /api/qr/generate → qrService.generateQRBatch(unitIds[])
4. For each unit: qrcode.toBuffer() → SVG → upload to S3 → save URL to Unit.qrCodeUrl
5. Returns { generated: N, urls: [...] }
6. QRManager.tsx refreshes the grid to show new QR thumbnails

PDF download:
7. Admin clicks "Download PDF — all 700"
8. GET /api/qr/sheet → queries all Units with qrCodeUrl
9. pdfService.generateStickerPDF(units[]) 
10. Puppeteer renders Avery 5160 HTML template → PDF buffer
11. Response streams PDF as download attachment
```

---

## Role Permission Matrix

| Action | admin | fabricator | driver | installer | pm |
|--------|-------|-----------|--------|----------|-----|
| View dashboard | ✓ | — | — | — | ✓ |
| Import CSV | ✓ | — | — | — | — |
| Generate QR | ✓ | — | — | — | — |
| Download PDF | ✓ | — | — | — | — |
| Export CSV | ✓ | — | — | — | ✓ |
| Mark fabricated | — | ✓ | — | — | — |
| Mark delivered | — | — | ✓ | — | — |
| Mark installed | — | — | — | ✓ | — |
| View scan handler | — | ✓ | ✓ | ✓ | — |
| View activity log | ✓ | — | — | — | — |

---

## MongoDB Collections

| Collection | Purpose | Key Indexes |
|-----------|---------|-------------|
| `units` | Core FPB assembly records | equipmentId (unique), floor, project |
| `scanevents` | Immutable audit log of all scans | unit, user, timestamp |
| `projects` | Project containers | name |
| `users` | Synced from Auth0 on first login | auth0Id (unique) |

---

## Environment Architecture

| Environment | Frontend | API | Database |
|-------------|----------|-----|----------|
| Development | localhost:5173 | localhost:**3001** (default `PORT` in `server/.env`) | Atlas M0 (free) |
| Production | Vercel (CDN) | Railway (Dockerfile; image defaults **PORT=5000**) | Atlas M10+ |

Match `VITE_API_URL` and Auth0 callback URLs to whichever host/port the API uses in that environment.

---

## Key Dependencies

### Server
```json
{
  "qrcode": "SVG QR generation",
  "multer": "multipart file upload handling",
  "xlsx": "CSV + Excel parsing",
  "puppeteer": "headless Chrome for PDF rendering",
  "@aws-sdk/client-s3": "S3 upload for QR images",
  "socket.io": "real-time dashboard updates",
  "express-oauth2-jwt-bearer": "Auth0 JWT validation"
}
```

### Client
```json
{
  "@auth0/auth0-react": "Auth0 SPA SDK",
  "socket.io-client": "real-time updates",
  "react-router-dom": "v6 client routing"
}
```

---

## Real-time Architecture (Socket.io)

```
Server (Railway):
  scan route → io.emit('unit:updated', updatedUnit)
  import route → io.emit('units:imported', { count })

Client (custom hook useRealtimeUnits):
  socket.on('unit:updated', (unit) => updateUnitInState(unit))
  socket.on('units:imported', () => refetchAllUnits())
```

Socket connection is authenticated — pass the Auth0 JWT as a handshake auth token.

---

## Sticker Label Layout (Avery 5160)

```
Page: 8.5" × 11" (US Letter)
Labels: 3 columns × 10 rows = 30 per page
Label size: 2-5/8" wide × 1" tall

Individual label:
┌─────────────────────────────┐
│ ████  FPB-30-01             │
│ ████  Floor 30              │
│ [QR]                        │
└─────────────────────────────┘
  ↑
  28px × 28px QR code image
  pulled from S3 URL
```

700 units ÷ 30 per sheet = 24 sheets (rounded up from 23.3)
