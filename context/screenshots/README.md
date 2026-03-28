# context/screenshots/

Visual context for AI-assisted development. Three subdirectories — one for each purpose.

---

## mockups/

Approved design mockups exported from `fpb-tracker-mockups.html`.

Export these five screens from the mockup HTML file and save them here before starting development:

| File | Screen | Notes |
|------|--------|-------|
| `dashboard-admin.png` | Admin Dashboard | Stat cards, floor progress, activity feed, unit table |
| `import-admin.png` | Equipment Import | Drag-drop uploader + column mapping panel |
| `qr-manager-admin.png` | QR Manager | QR grid + Avery sticker preview |
| `scan-handler-fabricator.png` | Scan Handler — Fabricator | Mark fabricated CTA |
| `scan-handler-driver.png` | Scan Handler — Driver | Mark delivered CTA (blue) |
| `scan-handler-installer.png` | Scan Handler — Installer | Mark installed CTA (green) |
| `pm-dashboard.png` | PM View | Read-only table with audit trail |

**How to export:** Open `fpb-tracker-mockups.html` in a browser, navigate to each screen, and use your browser's screenshot tool or a tool like Cleanshot to capture each screen. Save at 1x or 2x resolution.

---

## bugs/

Active bug screenshots for troubleshooting sessions with Cursor or Claude.

**Naming:** `YYYY-MM-DD_short-description.png`

Examples:
- `2024-01-15_qr-grid-overflow.png`
- `2024-01-22_scan-handler-button-not-visible-mobile.png`
- `2024-01-28_avery-label-alignment-off.png`

When a bug is fixed, either delete the screenshot or move it to `reference/`.

---

## reference/

Captured states of the working application — useful as ground truth when something regresses.

**Naming:** `screen-name_state-or-date.png`

Examples:
- `dashboard-admin-full.png`
- `scan-handler-complete-state.png`
- `avery-pdf-preview-correct.png`

Capture reference screenshots after each phase is completed and working.
