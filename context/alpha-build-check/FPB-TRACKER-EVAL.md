# FPB Tracker — Proposal Evaluation Reference

> **Purpose:** This document is a concise reference for evaluating the alpha build against the agreed proposal scope. Use it to verify that each deliverable, route, model, and behaviour has been implemented as specified before marking a phase complete.

---

## Project Summary

A MERN stack web application for **JDP Mechanical** that tracks ~700 Fan Pipe Box (FPB) assemblies through three sequential stages:

```
Fabrication → Delivery → Installation
```

Workers scan QR code stickers on physical assemblies to update status via their phone. Project managers get a live dashboard. Admins manage data import, QR generation, and sticker printing.

**Stack:** Vite + React 18 + TypeScript + Tailwind · Express.js + TypeScript · MongoDB Atlas + Mongoose · Auth0 RBAC · Puppeteer PDF · Base: `misterlinderman/baseapp`

---

## Scope Overview

| Phase | Focus | Hours | Cost | Timeline |
|-------|-------|-------|------|----------|
| 1 | Foundation | 30 hrs | $3,900 | 2–3 wks |
| 2 | QR & Scan | 24 hrs | $3,120 | 1–2 wks |
| 3 | PDF & Dashboard | 20 hrs | $2,600 | 1–2 wks |
| 4 | Polish | 12 hrs | $1,560 | 1 wk |
| **Total** | | **86 hrs** | **$11,180** | **5–8 wks** |

---

## Phase 1 — Foundation
**Target: 30 hours · 2–3 weeks**

### Auth & Roles
- [ ] Auth0 RBAC configured with five roles: `admin`, `fabricator`, `driver`, `installer`, `pm`
- [ ] JWT middleware on all protected Express routes
- [ ] Role-based access enforced — requests rejected if role doesn't match required permission
- [ ] 7-day JWT session with refresh token (workers stay logged in on device)

### Data Models
- [ ] `Unit` model with all fields: `equipmentId`, `floor`, `referenceDocument`, `submittalGPM`, `designGPM`, `lineSize`, `ctlSize`, `supplyDirection`, `qrCodeUrl`, `project`, `fabricated`, `delivered`, `installed`
- [ ] `StageStatus` sub-schema: `{ completedAt: Date, completedBy: ObjectId }`
- [ ] `ScanEvent` model: `unit`, `user`, `action` (fabricated | delivered | installed), `timestamp`, optional `location`
- [ ] `Project` model: `name`, `client`, `createdAt`

### API Routes — Units (`/api/units`)
- [ ] `GET /api/units` — list all units, filterable; roles: `admin`, `pm`
- [ ] `POST /api/units` — create single unit; role: `admin`
- [ ] `PUT /api/units/:id` — update unit record; role: `admin`
- [ ] `DELETE /api/units/:id` — remove unit; role: `admin`
- [ ] `POST /api/units/import` — bulk import from CSV/Excel; role: `admin`
- [ ] `GET /api/units/:id` — get single unit (used by scan handler); all roles

### API Routes — Export (`/api/export`)
- [ ] `GET /api/export/csv` — full unit status table export; roles: `admin`, `pm`
  - Must include all fields: equipment ID, floor, all stage timestamps, worker identities per stage
  - Structured for downstream use in Excel, Power BI, or system migration

### Import Service
- [ ] `multer` + `xlsx` handling for CSV and Excel uploads
- [ ] Auto column mapping against known field names
- [ ] Validation with error reporting before insert (duplicate IDs, type errors)
- [ ] Bulk insert with result summary (units imported, errors found)

### Frontend — Admin Dashboard (`/admin`)
- [ ] Live stat cards: Total units / Fabricated / Delivered / Installed with counts and % progress bars
- [ ] Progress by floor — horizontal bar chart
- [ ] Real-time activity feed — last N scan events with badge, unit ID, worker name, timestamp
- [ ] Filterable unit status table — filter by floor, stage; columns: Equipment #, Floor, Fabricated, Delivered, Installed, Line size, GPM
- [ ] Export CSV button

### Frontend — Equipment Import (`/admin/import`)
- [ ] Drag-and-drop CSV/Excel upload area
- [ ] Column mapping preview table (Your column → Maps to → Status)
- [ ] Validation checklist before import (file parsed, columns matched, no duplicates, types valid)
- [ ] Manual single-unit entry form: Equipment #, Floor, Line size, Supply side
- [ ] Import confirmation with unit count

### Brand & UI
- [ ] JDP colour palette applied: `--navy: #0F1923`, `--gold: #C9963A`, `--white: #F0EDE8`
- [ ] DM Sans / DM Mono typeface (or equivalent)
- [ ] Industrial tone — not generic SaaS

---

## Phase 2 — QR & Scan
**Target: 24 hours · 1–2 weeks**

### QR Generation Service
- [ ] Server-side QR code generation using `qrcode` npm package (SVG output)
- [ ] Each code encodes URL: `https://<domain>/scan/:unitId`
- [ ] **No external file storage required** — QR codes generated at print time and embedded in PDF
- [ ] `qrCodeUrl` field on Unit model populated (can reference internal generation endpoint or be omitted if fully embedded)
- [ ] Batch generation endpoint for all units or a filtered subset

### API Routes — QR (`/api/qr`)
- [ ] `POST /api/qr/generate` — generate QR codes for a batch of units; role: `admin`
- [ ] `GET /api/qr/sheet` — return print-ready Avery PDF as download; role: `admin`

### Scan Handler (`/scan/:unitId`)
> **Most important screen — evaluate carefully**

- [ ] Loads unit record by ID from URL param
- [ ] Displays unit details: Equipment #, Floor, Line size, Supply side, Submittal GPM, Design GPM, CTL size, Reference doc
- [ ] Reads worker role from JWT; presents exactly **one** action button matching their role
- [ ] Role → action mapping enforced:
  - `fabricator` → Mark fabricated (requires: no prior stage needed)
  - `driver` → Mark delivered (requires: `fabricated` is set)
  - `installer` → Mark installed (requires: `delivered` is set)
- [ ] Blocks action if previous stage not complete — clear error state shown
- [ ] Stage timeline displayed — Done / Active / Pending for each stage
- [ ] On confirm: `POST /api/scan/:unitId` → updates Unit, writes ScanEvent
- [ ] Mobile-first layout: large touch targets, minimal taps, readable in variable lighting
- [ ] Fast load — optimised for poor job site signal

### API Routes — Scan (`/api/scan`)
- [ ] `POST /api/scan/:unitId` — update unit stage, write ScanEvent; roles: `fabricator`, `driver`, `installer`
- [ ] Validates role → stage mapping server-side (not just client-side)
- [ ] Validates sequential progression (cannot skip stages)
- [ ] Returns updated unit record on success

### Frontend — QR Manager (`/admin/qr`)
- [ ] Grid view of generated QR codes with equipment IDs
- [ ] Avery 5160 sticker preview (30-up, 1" × 2-5/8")
- [ ] Label content: Equipment # (large), Floor, QR code image
- [ ] Download PDF — all units
- [ ] Download PDF — by floor (optional filter)
- [ ] Generation status: X of 700 QR codes generated

---

## Phase 3 — PDF & Dashboard
**Target: 20 hours · 1–2 weeks**

### PDF Service (Puppeteer)
- [ ] Puppeteer rendering HTML template formatted to Avery 5160 spec
- [ ] 30 labels per sheet, 1" × 2-5/8" per label
- [ ] Label content: Equipment # (prominent), Floor, QR code embedded
- [ ] Served as direct file download from `/api/qr/sheet`
- [ ] Correct page margins for standard label transfer paper
- [ ] Railway Dockerfile includes Chromium binary (or `@sparticuz/chromium` used instead)

### Live Dashboard (`/dashboard`)
- [ ] Real-time updates as scans come in (polling or WebSocket via `socket.io`)
- [ ] Same stat cards as Admin Dashboard
- [ ] Filterable table: floor, stage, date range, search by equipment #
- [ ] Full audit columns: Fabricated by / Fab time / Delivered by / Del time / Installed by / Inst time
- [ ] CSV export
- [ ] Accessible to all roles (role-appropriate view)

### PM View (`/dashboard` — PM role)
- [ ] Read-only — no action buttons shown
- [ ] Live indicator ("Live — updating in real time")
- [ ] Clearly labelled as read-only in UI
- [ ] Floor and stage filter controls
- [ ] CSV export available

### Data Export
- [ ] Export includes all unit fields plus all stage completion data
- [ ] One row per unit; columns for each stage: worker name, timestamp
- [ ] Compatible with Excel, Power BI, and general CSV tooling

---

## Phase 4 — Polish
**Target: 12 hours · 1 week**

- [ ] Email or SMS notifications on stage completion *(if confirmed in scope at kickoff)*
- [ ] Activity log view — full chronological scan event history
- [ ] PWA optimisation — installable on mobile, offline-tolerant scan handler
- [ ] Final JDP brand styling pass — consistency check across all screens
- [ ] Mobile UX review — scan handler tested on real devices

---

## Deliverables Checklist

| Deliverable | Phase | Status |
|-------------|-------|--------|
| Admin Dashboard | 1 | — |
| Equipment Import (CSV/Excel + manual) | 1 | — |
| Data Export (CSV) | 1 | — |
| Backend API (all routes) | 1–3 | — |
| Data Import/Export Service | 1 | — |
| QR Manager | 2 | — |
| QR + PDF Service (Puppeteer, Avery 5160) | 2–3 | — |
| Scan Handler (mobile, role-aware) | 2 | — |
| Live Dashboard | 3 | — |
| PM Dashboard (read-only) | 3 | — |
| Polish pass | 4 | — |

---

## Role Access Matrix

| Route / Feature | admin | fabricator | driver | installer | pm |
|----------------|:-----:|:----------:|:------:|:---------:|:--:|
| Admin Dashboard | ✓ | | | | |
| Equipment Import | ✓ | | | | |
| QR Manager | ✓ | | | | |
| Live Dashboard | ✓ | | | | ✓ |
| Export CSV | ✓ | | | | ✓ |
| Scan Handler | | ✓ | ✓ | ✓ | |
| Mark Fabricated | | ✓ | | | |
| Mark Delivered | | | ✓ | | |
| Mark Installed | | | | ✓ | |

---

## Key Constraints & Non-Negotiables

1. **Sequential stage enforcement** — server-side, not just client-side. A unit cannot be marked Delivered unless Fabricated is set. Installer cannot skip Delivery.
2. **Role enforcement is strict** — wrong-role scan attempts must be rejected at the API level, not just hidden in UI.
3. **No AWS S3 dependency** — QR codes generated server-side at PDF render time. No external file storage service required for base scope.
4. **Mobile-first scan handler** — this is the primary field-facing screen. Large targets, fast load, readable in daylight.
5. **Data portability** — CSV export must include all fields and all stage data in a format suitable for Excel/Power BI ingestion.
6. **Single project scope** — data model supports multi-project, but UI is scoped to one active project for this build.

---

## Out of Scope (this build)

- Email / SMS notifications *(flagged for Phase 4 if confirmed)*
- GPS coordinate logging on scan events
- Multi-project management UI
- Shareable unauthenticated PM dashboard link
- Ongoing hosting management post-launch
- Maintenance retainer

---

## Open Items (to confirm at kickoff)

| # | Question | Impact |
|---|----------|--------|
| 1 | QR sticker printing method — Avery 5160 PDF (assumed), Zebra/ZPL label printer, or print-on-demand? | May affect Phase 2–3 scope |
| 2 | Email/SMS notifications on stage completion — in scope? | Phase 4 hours |
| 3 | GPS location on scan events — required or nice-to-have? | Phase 2 hours |
| 4 | PM dashboard — login required (assumed) or shareable link? | Phase 3 scope |
| 5 | Domain — JDP subdomain or standalone? | Deployment config |
| 6 | Post-launch support — in scope? | Separate engagement |
