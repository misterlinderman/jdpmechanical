# context/

This directory is the AI context scaffolding for FPB Tracker. It is intentionally committed to the repository so that Cursor, Claude, and future developers always have the right context alongside the code.

---

## Directory Structure

```
context/
├── README.md                  ← This file
└── screenshots/
    ├── README.md              ← Screenshot organisation guide
    ├── mockups/               ← Approved design mockups (reference before building)
    ├── bugs/                  ← Bug screenshots for troubleshooting sessions
    └── reference/             ← Production / staging reference screenshots
```

---

## How to Use This Directory

### When Building a New Screen
Before writing any code for a UI component or page, check `screenshots/mockups/` for the approved design. The five core screens (dashboard, import, QR manager, scan handler, PM view) all have approved mockups in the `fpb-tracker-mockups.html` file at the root. Export screenshots of those mockups here for quick reference.

### When Troubleshooting a Bug
1. Take a screenshot of the broken state
2. Save it to `screenshots/bugs/` with a descriptive name: `YYYY-MM-DD_description.png`
3. When prompting Cursor or Claude about the bug, reference the screenshot path
4. Once resolved, move it to `screenshots/reference/` or delete it

### When Prompting AI for Help
Reference screenshots directly in your prompt:
```
I'm building the ScanHandler screen. 
See context/screenshots/mockups/scan-handler-fabricator.png for the approved design.
The current output looks like context/screenshots/bugs/2024-01-15_scan-layout-broken.png.
```

---

## Screenshot Naming Conventions

| Directory | Convention | Example |
|-----------|-----------|---------|
| `mockups/` | `screen-name.png` | `scan-handler-fabricator.png` |
| `bugs/` | `YYYY-MM-DD_short-description.png` | `2024-01-15_qr-grid-overflow.png` |
| `reference/` | `screen-name_state.png` | `dashboard-admin-full.png` |

---

## What Lives Here vs. Elsewhere

| Content | Location |
|---------|----------|
| Project requirements + goals | `docs/PROJECT_OVERVIEW.md` |
| Architecture + data models | `docs/TECHNICAL_SPEC.md` |
| Cursor AI rules + conventions | `.cursorrules` (root) |
| Interactive mockup HTML | `fpb-tracker-mockups.html` (root) |
| Build phase prompts | `docs/BUILD_PLAN.md` |
| Screenshots + visual context | `context/screenshots/` (here) |
