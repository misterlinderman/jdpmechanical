import * as XLSX from 'xlsx';
import { Types } from 'mongoose';

export interface ParsedUnitRow {
  equipmentId: string;
  floor: number;
  referenceDocument: string;
  submittalGPM: number;
  designGPM: number;
  lineSize: string;
  ctlSize: string;
  supplyDirection: 'Left' | 'Right';
}

export interface ImportRowError {
  row: number;
  message: string;
}

export interface ImportResult {
  valid: (ParsedUnitRow & { project: Types.ObjectId })[];
  errors: ImportRowError[];
  columnMap: Record<string, string | null>;
}

function normalizeHeader(h: string): string {
  return String(h || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function mapHeaderToField(header: string): string | null {
  const n = normalizeHeader(header);
  const map: [string, string][] = [
    ['equipment #', 'equipmentId'],
    ['equipment#', 'equipmentId'],
    ['equipment', 'equipmentId'],
    ['floor', 'floor'],
    ['reference document', 'referenceDocument'],
    ['submittal gpm', 'submittalGPM'],
    ['design gpm', 'designGPM'],
    ['line size', 'lineSize'],
    ['line size ', 'lineSize'],
    ['ctl size', 'ctlSize'],
    ['supply side (flow)', 'supplyDirection'],
    ['supply side', 'supplyDirection'],
    ['supply direction', 'supplyDirection'],
  ];
  for (const [key, field] of map) {
    if (n === key) return field;
  }
  if (n.includes('line') && n.includes('size')) return 'lineSize';
  if (n.includes('ctl') && n.includes('size')) return 'ctlSize';
  return null;
}

function parseSupplyDirection(raw: string): 'Left' | 'Right' | null {
  const v = String(raw || '')
    .trim()
    .toLowerCase();
  if (v === 'left' || v === 'l') return 'Left';
  if (v === 'right' || v === 'r') return 'Right';
  if (v.includes('left')) return 'Left';
  if (v.includes('right')) return 'Right';
  return null;
}

function toNumber(val: unknown, field: string): number | null {
  if (val === undefined || val === null || val === '') {
    return null;
  }
  if (typeof val === 'number' && !Number.isNaN(val)) return val;
  const s = String(val).trim().replace(/,/g, '');
  const n = parseFloat(s);
  if (Number.isNaN(n)) {
    return null;
  }
  return n;
}

/**
 * Parse CSV/XLSX buffer; does not write to DB.
 */
export function parseImportBuffer(
  buffer: Buffer,
  projectId: Types.ObjectId
): ImportResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return {
      valid: [],
      errors: [{ row: 0, message: 'No sheet found in file' }],
      columnMap: {},
    };
  }
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });

  if (rows.length === 0) {
    return {
      valid: [],
      errors: [{ row: 0, message: 'No data rows found' }],
      columnMap: {},
    };
  }

  const firstRow = rows[0];
  const headers = Object.keys(firstRow);
  const columnMap: Record<string, string | null> = {};
  for (const h of headers) {
    columnMap[h] = mapHeaderToField(h);
  }

  const valid: (ParsedUnitRow & { project: Types.ObjectId })[] = [];
  const errors: ImportRowError[] = [];
  const seenEquipment = new Set<string>();

  rows.forEach((row, index) => {
    const rowNum = index + 2;
    const get = (field: string): unknown => {
      for (const h of headers) {
        if (columnMap[h] === field) {
          return row[h];
        }
      }
      return '';
    };

    const equipmentId = String(get('equipmentId') ?? '').trim();
    const floor = toNumber(get('floor'), 'floor');
    const referenceDocument = String(get('referenceDocument') ?? '').trim();
    const submittalGPM = toNumber(get('submittalGPM'), 'submittalGPM');
    const designGPM = toNumber(get('designGPM'), 'designGPM');
    const lineSize = String(get('lineSize') ?? '').trim();
    const ctlSize = String(get('ctlSize') ?? '').trim();
    const supplyRaw = String(get('supplyDirection') ?? '').trim();
    const supplyDirection = parseSupplyDirection(supplyRaw);

    const missing: string[] = [];
    if (!equipmentId) missing.push('Equipment #');
    if (floor === null) missing.push('Floor');
    if (!referenceDocument) missing.push('Reference Document');
    if (submittalGPM === null) missing.push('Submittal GPM');
    if (designGPM === null) missing.push('Design GPM');
    if (!lineSize) missing.push('Line size');
    if (!ctlSize) missing.push('CTL size');
    if (!supplyDirection) missing.push('Supply Side (flow)');

    if (missing.length) {
      errors.push({
        row: rowNum,
        message: `Missing or invalid: ${missing.join(', ')}`,
      });
      return;
    }

    const key = equipmentId.toLowerCase();
    if (seenEquipment.has(key)) {
      errors.push({
        row: rowNum,
        message: `Duplicate equipment ID in file: ${equipmentId}`,
      });
      return;
    }
    seenEquipment.add(key);

    valid.push({
      project: projectId,
      equipmentId,
      floor: floor as number,
      referenceDocument,
      submittalGPM: submittalGPM as number,
      designGPM: designGPM as number,
      lineSize,
      ctlSize,
      supplyDirection: supplyDirection as 'Left' | 'Right',
    });
  });

  return { valid, errors, columnMap };
}
