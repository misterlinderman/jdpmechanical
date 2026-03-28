import QRCode from 'qrcode';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Types } from 'mongoose';

function scanUrlForUnit(unitId: string): string {
  const base = (process.env.APP_DOMAIN || 'http://localhost:5173').replace(/\/$/, '');
  return `${base}/scan/${unitId}`;
}

let s3Client: S3Client | null = null;

function getS3(): S3Client | null {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return null;
  }
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

/**
 * Generate QR as SVG and upload to S3 when configured; otherwise return inline data URL (dev).
 */
export async function generateQRCode(unitId: string): Promise<string> {
  const url = scanUrlForUnit(unitId);
  const svg = await QRCode.toString(url, { type: 'svg', margin: 1, width: 256 });

  const client = getS3();
  const bucket = process.env.S3_BUCKET_NAME;
  if (client && bucket) {
    const key = `qr/${unitId}.svg`;
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: svg,
        ContentType: 'image/svg+xml',
        ACL: 'public-read',
      })
    );
    const publicBase = (process.env.S3_PUBLIC_URL_BASE || '').replace(/\/$/, '');
    if (publicBase) {
      return `${publicBase}/${key}`;
    }
    return `https://${bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
  }

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export async function generateQRBatch(
  unitIds: string[]
): Promise<{ unitId: string; url: string }[]> {
  const out: { unitId: string; url: string }[] = [];
  for (const id of unitIds) {
    const url = await generateQRCode(id);
    out.push({ unitId: id, url });
  }
  return out;
}

export function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id);
}
