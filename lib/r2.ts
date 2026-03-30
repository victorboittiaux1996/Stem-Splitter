import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Job } from "./types";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "stem-splitter-storage";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// Upload a file to R2
export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType?: string
) {
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

// Read a JSON object from R2
export async function readJsonFromR2<T>(key: string): Promise<T | null> {
  try {
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    );
    const text = await response.Body?.transformToString();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

// Write a JSON object to R2
export async function writeJsonToR2(key: string, data: unknown) {
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: JSON.stringify(data),
      ContentType: "application/json",
    })
  );
}

// Get a presigned download URL
export async function getPresignedUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    }),
    { expiresIn }
  );
}

// Get a presigned upload URL (PUT) — browser uploads directly to R2, bypassing Vercel
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  return getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn }
  );
}

// Get the size of an object in R2 (returns 0 if not found)
export async function getObjectSize(key: string): Promise<number> {
  try {
    const response = await s3.send(
      new HeadObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    );
    return response.ContentLength ?? 0;
  } catch {
    return 0;
  }
}

// Job helpers
export async function getJob(jobId: string): Promise<Job | null> {
  return readJsonFromR2<Job>(`jobs/${jobId}.json`);
}

export async function createJob(job: Job) {
  await writeJsonToR2(`jobs/${job.id}.json`, job);
}

export async function updateJob(jobId: string, updates: Partial<Job>) {
  const existing = await getJob(jobId);
  if (!existing) throw new Error(`Job ${jobId} not found`);
  await writeJsonToR2(`jobs/${jobId}.json`, { ...existing, ...updates });
}

// List stem files for a job
export async function listStems(jobId: string): Promise<string[]> {
  const response = await s3.send(
    new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: `stems/${jobId}/`,
    })
  );
  return (
    response.Contents?.map((obj) => obj.Key!).filter((k) =>
      k.endsWith(".wav")
    ) ?? []
  );
}
