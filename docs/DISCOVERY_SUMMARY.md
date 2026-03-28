# FPB Tracker — Discovery Summary

> Condensed summary of the initial discovery conversation for use in project bidding and proposal preparation.

---

## Status

**Client has approved the concept.** Mockups were presented and the build direction is confirmed. A formal bid/proposal is in preparation.

---

## The Client

**JDP Mechanical** — a fourth-generation family HVAC/mechanical contractor based in the New York Metropolitan Area, founded 1962. Full-service operation covering in-house drafting, design, fabrication, transport, installation, and maintenance. Clients include major NYC developers and institutions. Notable completed projects: One Wall Street, The Spiral at Hudson Yards, MoMA 53W53. Two fabrication facilities: Astoria, NY (headquarters) and Ronkonkoma, NY (18,000 sq ft, recently opened).

Primary contact: the project management team overseeing a large commercial build currently in progress.

---

## The Problem

JDP is fabricating, delivering, and installing approximately **700 Fan Pipe Box (FPB) assemblies** for a commercial project. Each assembly moves through three sequential stages:

```
Fabrication → Delivery → Installation
```

No tracking system currently exists. The PM team has no live visibility into how many units have cleared each stage. Field workers have no structured mechanism to log progress. The client's existing workflow involved a shared spreadsheet that required manual updates — unreliable in a multi-site, multi-trade environment.

The client's original concept (shared as a diagram at kickoff) showed QR codes on physical stickers, workers scanning to update a live spreadsheet. That concept was validated and expanded into a full web application.

---

## The Solution

A purpose-built **MERN stack web application** — FPB Tracker — that gives every stakeholder a role-appropriate interface:

- **Admins** import the equipment schedule, generate QR codes, and download print-ready sticker sheets
- **Fabricators, drivers, and installers** scan QR stickers on their phone to mark their stage complete — one tap, no manual entry
- **Project managers** watch a live dashboard update in real time as scans come in

The application is branded to JDP — dark navy/charcoal palette, gold/amber accents, industrial tone — and designed to feel like a JDP product, not a generic SaaS tool.

---

## Key Requirements Confirmed

| Requirement | Decision |
|---|---|
| Equipment data entry | CSV/Excel bulk import + manual single-unit entry |
| QR sticker format | Avery 5160 labels (30-up, 1" × 2-5/8"), print-ready PDF |
| Field worker auth | JWT sessions, stay logged in on device (7-day expiry) |
| Role enforcement | Strict — each role can only perform its own stage action |
| PM dashboard | Live, filterable, exportable to CSV |
| Hosting | Vercel (frontend) + Railway (API) |
| Database | MongoDB Atlas |
| Auth provider | Auth0 with RBAC |

---

## Screens Designed & Approved

Five screens were mocked up in JDP brand styling and presented. All approved.

1. **Admin dashboard** — live stat cards (total / fabricated / delivered / installed), progress by floor, real-time activity feed, filterable unit table
2. **Equipment import** — drag-and-drop CSV/Excel uploader with automatic column mapping and validation, plus manual entry form
3. **QR manager** — batch QR generation, Avery 5160 sticker preview, PDF download (all units or by floor)
4. **Scan handler** — mobile-first, role-aware; shows unit spec details and one action button keyed to the worker's role; three variants shown (fabricator / driver / installer)
5. **PM view** — read-only live table with full audit trail (who completed each stage, timestamp), floor and stage filters, CSV export

---

## Technical Stack

Built on [`misterlinderman/baseapp`](https://github.com/misterlinderman/baseapp) — a production-ready MERN starter with TypeScript, Auth0, and Tailwind CSS already wired up.

**New work layered on top:**
- Three new Mongoose models: `Unit`, `ScanEvent`, `Project`
- Four new Express route groups: `units`, `scan`, `qr`, `export`
- Three new services: QR generation (+ S3 upload), PDF rendering (Puppeteer + Avery layout), CSV/Excel import
- Five new React pages matching the approved mockups

**Notable infrastructure decision:** Railway requires a Dockerfile for Puppeteer/Chromium support. Two options identified — custom Dockerfile (`node:20-slim` + Chromium) or `@sparticuz/chromium` npm package. Either works; Dockerfile is cleaner long-term.

---

## Build Phases (Estimated)

| Phase | Scope | Estimate |
|---|---|---|
| 1 — Foundation | Auth, roles, Unit model, CRUD, import, data table | 2–3 weeks |
| 2 — QR & Scan | QR generation, S3, scan handler, role enforcement, audit log | 1–2 weeks |
| 3 — PDF & Dashboard | Puppeteer PDF, Avery layout, live dashboard, PM view, CSV export | 1–2 weeks |
| 4 — Polish | Notifications, activity log, PWA optimisation, brand styling pass | 1 week |

**Total estimated timeline: 5–8 weeks.**

---

## Open Questions for Proposal / Kickoff

The following were flagged during discovery and should be addressed in the proposal or confirmed at project kickoff:

1. **Single vs. multi-project** — is this app scoped to one project, or does JDP want to run multiple projects concurrently?
2. **Notifications** — does JDP want email or SMS alerts when a stage completes, and if so, to whom (PM only? specific contacts per floor?)?
3. **GPS logging** — should scan events capture device GPS coordinates? Nice-to-have or required?
4. **PM dashboard access** — always requires login, or should there be a shareable read-only link with no auth?
5. **Domain / subdomain** — will this live at a JDP subdomain (e.g. `fpbtracker.jdpmechanical.com`) or a standalone domain?
6. **Ongoing maintenance** — is post-launch support and hosting management in scope for the engagement?

---

## Project Artifacts

The following documents were produced during discovery and are included in the project repository:

| File | Purpose |
|---|---|
| `docs/PROJECT_OVERVIEW.md` | Client background, problem statement, goals, user roles, key workflows, brand notes |
| `docs/TECHNICAL_SPEC.md` | Full architecture, data models, API routes, frontend pages, infrastructure plan, build phases |
| `docs/CURSOR_CONTEXT.md` | Condensed AI context file for use with Cursor IDE during development |
| `docs/DISCOVERY_SUMMARY.md` | This file — high-level summary for proposal and onboarding use |
| `fpb-tracker-mockups.html` | Interactive screen walkthrough presented at kickoff — 5 screens, JDP brand styling, keyboard navigable |
