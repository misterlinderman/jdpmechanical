import puppeteer from 'puppeteer';

export interface StickerData {
  equipmentId: string;
  floor: number;
  qrCodeUrl: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Avery 5160: US Letter, 3 cols × 10 rows, label 2-625" × 1", margins top 0.5", sides 0.1875".
 */
function buildStickerHtml(units: StickerData[]): string {
  const cells: string[] = [];
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    const src = escapeHtml(u.qrCodeUrl);
    cells.push(`
      <div class="label">
        <div class="qr"><img src="${src}" alt="" /></div>
        <div class="text">
          <div class="eq">${escapeHtml(u.equipmentId)}</div>
          <div class="floor">Floor ${u.floor}</div>
        </div>
      </div>
    `);
  }
  // Pad to multiple of 30 for full sheets
  const pad = (30 - (units.length % 30)) % 30;
  for (let p = 0; p < pad; p++) {
    cells.push('<div class="label empty"></div>');
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: letter; margin: 0; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: system-ui, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      width: 8.5in;
      height: 11in;
      padding: 0.5in 0.1875in 0.1875in 0.1875in;
      page-break-after: always;
    }
    .page:last-child { page-break-after: auto; }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 2.625in);
      grid-template-rows: repeat(10, 1in);
      gap: 0;
      width: 100%;
    }
    .label {
      width: 2.625in;
      height: 1in;
      border: 0.5px solid #e5e7eb;
      display: flex;
      flex-direction: row;
      align-items: center;
      padding: 0.06in 0.08in;
      overflow: hidden;
    }
    .label.empty { border: none; }
    .qr {
      width: 0.42in;
      height: 0.42in;
      flex-shrink: 0;
      margin-right: 0.08in;
    }
    .qr img { width: 100%; height: 100%; object-fit: contain; }
    .text { flex: 1; min-width: 0; }
    .eq { font-weight: 700; font-size: 9pt; line-height: 1.1; }
    .floor { font-size: 7pt; color: #374151; margin-top: 2px; }
  </style>
</head>
<body>
${chunkArray(cells, 30)
  .map(
    (chunk) => `
  <div class="page">
    <div class="grid">
      ${chunk.join('\n')}
    </div>
  </div>`
  )
  .join('\n')}
</body>
</html>`;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

export async function generateStickerPDF(units: StickerData[]): Promise<Buffer> {
  if (units.length === 0) {
    throw new Error('No units to render');
  }

  const html = buildStickerHtml(units);
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: executablePath || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      printBackground: true,
      format: 'Letter',
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
