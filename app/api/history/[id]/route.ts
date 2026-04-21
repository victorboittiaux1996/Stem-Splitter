import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getAuthUser, userWorkspaceId } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getJobForWorkspace, jobKey } from "@/lib/r2";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
const BUCKET = process.env.R2_BUCKET_NAME || "stem-splitter-storage";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;
  if (!id || !/^[A-Za-z0-9_-]{1,40}$/.test(id)) {
    return NextResponse.json({ error: "Invalid job id" }, { status: 400 });
  }

  const wsId = userWorkspaceId(user.id);

  // Workspace scoping via jobKey(wsId, id) is the primary ownership barrier —
  // a different user literally cannot resolve this path. The explicit userId
  // check below is defense-in-depth for any legacy job without userId written.
  const job = await getJobForWorkspace(wsId, id);
  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (job.userId !== undefined && job.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stemsPrefix = `workspaces/${wsId}/stems/${id}/`;

  try {
    let continuationToken: string | undefined;
    const stemKeys: { Key: string }[] = [];
    do {
      const list = await s3.send(
        new ListObjectsV2Command({
          Bucket: BUCKET,
          Prefix: stemsPrefix,
          MaxKeys: 1000,
          ContinuationToken: continuationToken,
        })
      );
      for (const obj of list.Contents ?? []) {
        if (obj.Key) stemKeys.push({ Key: obj.Key });
      }
      continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;
    } while (continuationToken);

    if (stemKeys.length > 0) {
      for (let i = 0; i < stemKeys.length; i += 1000) {
        await s3.send(
          new DeleteObjectsCommand({
            Bucket: BUCKET,
            Delete: { Objects: stemKeys.slice(i, i + 1000), Quiet: true },
          })
        );
      }
    }

    const inputKey = job.inputKey;
    if (inputKey && inputKey.startsWith("inputs/")) {
      await s3
        .send(new DeleteObjectCommand({ Bucket: BUCKET, Key: inputKey }))
        .catch(() => {});
    }

    await s3.send(
      new DeleteObjectCommand({ Bucket: BUCKET, Key: jobKey(wsId, id) })
    );

    // Await the supabase delete so analytics/joins don't see ghost rows if
    // the response returns before a cold worker flushes the query.
    const { error: supaErr } = await supabaseAdmin
      .from("jobs")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (supaErr) {
      console.warn("[DELETE history] supabase row delete failed:", id, supaErr.message);
    }

    return NextResponse.json({ ok: true, deletedStems: stemKeys.length });
  } catch (err) {
    console.error("[DELETE history]", id, err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
