# FPB Tracker — Project Overview

> Discovery document capturing client context, goals, and scope.

---

## Client

**JDP Mechanical**
- Founded 1962, four generations of the Manos family
- Full-service mechanical contractor operating across the New York Metropolitan Area
- Services span in-house drafting, design, fabrication, transport, installation, and maintenance
- Notable projects include One Wall Street, The Spiral at Hudson Yards, and MoMA 53W53
- Fabrication facilities in Astoria, NY and Ronkonkoma, NY (18,000 sq ft, opened recently)
- Website: [jdpmechanical.com](https://www.jdpmechanical.com/)

---

## Problem

JDP is managing the fabrication, delivery, and installation of approximately **700 Fan Pipe Box (FPB) assemblies** across a large commercial project. Each unit moves through three sequential stages:

```
Fabrication → Delivery → Installation
```

Currently there is no system to track which units have completed each stage. The project management team has no live visibility, and workers in the field have no structured way to log progress. The client wants physical QR code stickers on each assembly that workers scan to update status — no manual data entry.

---

## Goals

1. Generate a unique QR code sticker for each of ~700 units
2. Workers scan the sticker on their phone to mark a stage complete
3. The spreadsheet/dashboard updates automatically and in real time
4. Project managers have live read-only visibility across all units
5. Stickers are printed on standard Avery label transfer paper

---

## User Roles

| Role | Access | Primary Action |
|------|--------|----------------|
| Admin | Full — import, manage, generate QR | Setup and oversight |
| Fabricator | Scan only | Mark unit as Fabricated |
| Driver | Scan only | Mark unit as Delivered |
| Installer | Scan only | Mark unit as Installed |
| PM | Read-only dashboard | Monitor progress |

Role enforcement is strict — a Fabricator cannot mark a unit Delivered, etc.

---

## Equipment Data

Each unit record contains the following fields sourced from the project's contract documents:

- Floor
- Equipment # (e.g. FPB-30-01)
- Reference Document
- Submittal GPM
- Design GPM
- Line Size
- CTL Size
- Supply Side (flow direction)

Equipment data will be imported via **CSV/Excel upload** by an admin, with **manual entry** also supported for additions or corrections.

---

## Key Workflows

### QR Sticker Generation
Admin triggers batch QR generation → each unit gets a unique URL pointing to `/scan/:unitId` → QR images stored in S3 → admin downloads a print-ready PDF formatted for **Avery 5160 labels (30-up, 1" × 2-5/8")** → stickers are affixed to physical assemblies.

Each sticker displays: equipment number, floor, and QR code.

### Field Scan Flow
1. Worker opens the app on their phone (stays logged in, JWT session)
2. Worker scans the QR sticker on the assembly
3. App shows unit details and presents the one available action for their role
4. Worker taps confirm
5. Status updates immediately with timestamp and worker identity
6. Dashboard reflects the change in real time

### PM Dashboard
Filterable live table showing all units with current stage status, timestamps, and worker identity per stage. Exportable to CSV.

---

## Brand Notes

JDP's visual identity is established and industrial — dark navy/charcoal palette with white text and gold/amber accents. The application UI should feel like a JDP product, not a generic SaaS tool. Field-facing screens (especially the scan handler) must be optimised for large-touch targets, minimal taps, and readability in variable lighting conditions.
