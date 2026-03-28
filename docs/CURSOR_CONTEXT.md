# Cursor AI Context — FPB Tracker

This file gives Cursor AI context about this project so prompts stay consistent and accurate.

---

## What this project is

A supply chain tracking web app built for **JDP Mechanical**, a New York HVAC/mechanical contractor. The app tracks ~700 Fan Pipe Box (FPB) assemblies through three stages: **Fabrication → Delivery → Installation**. Workers scan QR code stickers on physical assemblies to update status. Project managers get a live dashboard.

---

## Stack

- **Frontend:** Vite + React 18 + TypeScript + Tailwind CSS + React Router v6
- **Backend:** Express.js + TypeScript
- **Database:** MongoDB Atlas + Mongoose
- **Auth:** Auth0 with RBAC (roles: `admin`, `fabricator`, `driver`, `installer`, `pm`)
- **QR:** `qrcode` npm package, images stored in AWS S3
- **PDF:** Puppeteer rendering Avery 5160 sticker layouts
- **Import:** `multer` + `xlsx` for CSV/Excel
- **Frontend hosting:** Vercel
- **API hosting:** Railway (uses Dockerfile for Puppeteer/Chromium)

Base template: [`misterlinderman/baseapp`](https://github.com/misterlinderman/baseapp)

---

## Key patterns to follow

- All new server files go in `server/src/` following the existing controllers / routes / models / services structure
- All new client pages go in `client/src/pages/`
- Shared TypeScript types for the Unit model live in `client/src/types/unit.ts`
- Auth is handled by Auth0 — do not build custom auth logic
- Role is read from the Auth0 JWT payload — use the existing auth middleware pattern
- All API routes are prefixed `/api`
- Protected routes use the existing Auth0 middleware from the base template

---

## Core data model

```typescript
// The central document everything revolves around
interface IUnit {
  equipmentId: string;       // e.g. "FPB-30-01"
  floor: number;
  referenceDocument: string;
  submittalGPM: number;
  designGPM: number;
  lineSize: string;
  ctlSize: string;
  supplyDirection: 'Left' | 'Right';
  qrCodeUrl: string;
  project: ObjectId;

  fabricated: { completedAt: Date; completedBy: ObjectId } | null;
  delivered:  { completedAt: Date; completedBy: ObjectId } | null;
  installed:  { completedAt: Date; completedBy: ObjectId } | null;
}
```

---

## Scan handler — most important screen

`/scan/:unitId` is the primary field-facing screen. It must be:
- Mobile-first, large touch targets
- Fast to load (workers may have poor signal on job sites)
- Show the unit details clearly
- Present exactly one action button based on the worker's role
- Validate that the previous stage is complete before allowing the action

Role → permitted action mapping:
- `fabricator` → mark `fabricated`
- `driver` → mark `delivered` (requires `fabricated` to be set)
- `installer` → mark `installed` (requires `delivered` to be set)

---

## PDF sticker spec

- Avery 5160 format: 30 labels per sheet, 1" × 2-5/8" each
- Each label contains: equipment number (large), floor number, QR code image
- Generated server-side by Puppeteer rendering an HTML template
- QR code URLs point to `https://<domain>/scan/:unitId`

---

## Ports (do not assume 5000 locally)

- **Local API default:** `http://localhost:3001` (`PORT` in `server/.env`).
- **Dockerfile / some hosts:** API may listen on **5000** inside the container — set `VITE_API_URL` and Auth0 URLs accordingly.

## What to read for full context

- `docs/PROJECT_OVERVIEW.md` — client background, problem statement, goals, user roles
- `docs/TECHNICAL_SPEC.md` — full architecture, data models, API routes, infrastructure, build phases
- `docs/VERSIONING.md` — version alignment, ports, build outputs
- `docs/AUTH0_ROLES_SETUP.md` — roles in the access token and Auth0 dashboard steps
