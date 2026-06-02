import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

let r2Client: S3Client | null = null;

export function isR2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
}

function getR2Client(): S3Client {
  if (!isR2Configured()) {
    throw new Error("Cloudflare R2 não está configurado");
  }

  if (!r2Client) {
    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }

  return r2Client;
}

function getBucketName(): string {
  return process.env.R2_BUCKET_NAME!;
}

export function getR2ObjectKey(filename: string): string {
  return `audio/${filename}`;
}

export function getR2PublicUrl(filename: string): string | null {
  const baseUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (!baseUrl) {
    return null;
  }

  return `${baseUrl}/${getR2ObjectKey(filename)}`;
}

export async function uploadToR2(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<void> {
  const client = getR2Client();

  await client.send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: getR2ObjectKey(filename),
      Body: buffer,
      ContentType: contentType,
    })
  );
}

export async function headR2Object(
  filename: string
): Promise<{ size: number; contentType: string } | null> {
  try {
    const client = getR2Client();
    const response = await client.send(
      new HeadObjectCommand({
        Bucket: getBucketName(),
        Key: getR2ObjectKey(filename),
      })
    );

    return {
      size: response.ContentLength ?? 0,
      contentType: response.ContentType ?? "application/octet-stream",
    };
  } catch {
    return null;
  }
}

export async function getFromR2(
  filename: string,
  range?: { start: number; end: number }
): Promise<{ buffer: Buffer; contentType: string; size: number } | null> {
  try {
    const client = getR2Client();
    const response = await client.send(
      new GetObjectCommand({
        Bucket: getBucketName(),
        Key: getR2ObjectKey(filename),
        Range: range ? `bytes=${range.start}-${range.end}` : undefined,
      })
    );

    if (!response.Body) {
      return null;
    }

    const buffer = Buffer.from(await response.Body.transformToByteArray());

    return {
      buffer,
      contentType: response.ContentType ?? "application/octet-stream",
      size: response.ContentLength ?? buffer.length,
    };
  } catch {
    return null;
  }
}
