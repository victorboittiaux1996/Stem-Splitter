/**
 * One-shot migration: move all R2 objects from workspaces/ws-1/ to workspaces/ws-{victorUserId}/
 * and update share_links.workspace_id in Supabase.
 *
 * Run once after deploying the workspace-per-user fix:
 *   npx tsx scripts/migrate-ws1.ts
 *
 * Requires env vars (from .env.local):
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * The script will:
 *   1. Look up Victor's user ID from Supabase profiles (email: hello@44stems.com)
 *   2. List all objects under workspaces/ws-1/
 *   3. Copy each object to workspaces/ws-{userId}/
 *   4. Update share_links.workspace_id in Supabase
 *   5. Print a summary — you can then manually delete ws-1 objects if desired
 */

import { createClient } from "@supabase/supabase-js";
import {
  S3Client,
  ListObjectsV2Command,
  CopyObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "stem-splitter-storage";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error("Missing R2 env vars (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)");
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  // Step 1: Find Victor's user ID
  console.log("Looking up user ID for hello@44stems.com...");
  const { data: profiles, error: profileErr } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("email", "hello@44stems.com")
    .limit(1);

  if (profileErr || !profiles?.length) {
    // Try auth.users as fallback
    const { data: authData, error: authErr } = await supabase.auth.admin.listUsers();
    if (authErr || !authData) {
      console.error("Could not find user. Provide USER_ID env var to override.");
      process.exit(1);
    }
    const victorUser = authData.users.find(u => u.email === "hello@44stems.com");
    if (!victorUser) {
      console.error("User hello@44stems.com not found in auth.users. Set USER_ID env var.");
      process.exit(1);
    }
    await runMigration(victorUser.id);
  } else {
    await runMigration(profiles[0].id);
  }
}

async function runMigration(userId: string) {
  const targetWorkspace = `ws-${userId}`;
  const sourcePrefix = "workspaces/ws-1/";
  const targetPrefix = `workspaces/${targetWorkspace}/`;

  console.log(`\nMigrating ws-1 → ${targetWorkspace}`);
  console.log(`Source: ${sourcePrefix}`);
  console.log(`Target: ${targetPrefix}\n`);

  // Step 2: List all objects under ws-1
  let allKeys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const list = await s3.send(new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: sourcePrefix,
      MaxKeys: 1000,
      ContinuationToken: continuationToken,
    }));
    const keys = (list.Contents ?? []).map(o => o.Key!);
    allKeys.push(...keys);
    continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (continuationToken);

  console.log(`Found ${allKeys.length} objects under ${sourcePrefix}`);

  if (allKeys.length === 0) {
    console.log("Nothing to migrate.");
  } else {
    // Step 3: Copy each object (patch workspaceId in job JSON bodies)
    let copied = 0;
    let errors = 0;
    for (const key of allKeys) {
      const suffix = key.slice(sourcePrefix.length);
      const destKey = `${targetPrefix}${suffix}`;
      try {
        // For job JSON files, rewrite the workspaceId field so Modal callbacks
        // don't write back to the ws-1 path if the job was in-flight at migration time.
        if (key.endsWith(".json") && key.includes("/jobs/")) {
          const res = await s3.send(new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
          const text = await res.Body?.transformToString();
          if (text) {
            const job = JSON.parse(text);
            if (job.workspaceId === "ws-1") {
              job.workspaceId = targetWorkspace;
            }
            await s3.send(new PutObjectCommand({
              Bucket: R2_BUCKET_NAME,
              Key: destKey,
              Body: JSON.stringify(job),
              ContentType: "application/json",
            }));
            console.log(`  ✓ ${key} → ${destKey} (workspaceId patched)`);
            copied++;
            continue;
          }
        }
        // Non-JSON or non-job objects: plain copy
        await s3.send(new CopyObjectCommand({
          Bucket: R2_BUCKET_NAME,
          CopySource: `${R2_BUCKET_NAME}/${key}`,
          Key: destKey,
        }));
        console.log(`  ✓ ${key} → ${destKey}`);
        copied++;
      } catch (err) {
        console.error(`  ✗ Failed to copy ${key}:`, err);
        errors++;
      }
    }
    console.log(`\nCopied: ${copied} / ${allKeys.length}  (${errors} errors)`);
  }

  // Step 4: Update share_links in Supabase
  console.log("\nUpdating share_links.workspace_id in Supabase...");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count, error: updateErr } = await (supabase as any)
    .from("share_links")
    .update({ workspace_id: targetWorkspace })
    .eq("workspace_id", "ws-1")
    .select("*", { count: "exact", head: true });

  if (updateErr) {
    console.error("Failed to update share_links:", updateErr);
  } else {
    console.log(`Updated ${count ?? "?"} share_links rows.`);
  }

  console.log("\nDone. Verify the migration, then optionally delete ws-1 objects:");
  console.log(`  aws s3 rm s3://${R2_BUCKET_NAME}/workspaces/ws-1/ --recursive --endpoint-url https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
