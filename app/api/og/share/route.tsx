import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getJobForWorkspace, listStemsForWorkspace } from "@/lib/r2";

export const runtime = "nodejs";

const STEM_COLORS = ["#1B10FD", "#FF3B30", "#FF9500", "#34C759", "#AF52DE", "#00C7BE"];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Missing id", { status: 400 });
  }

  // Fetch share link data
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: link } = await (supabase as any)
    .from("share_links")
    .select("job_id, workspace_id")
    .eq("id", id)
    .maybeSingle();

  let trackName = "Shared split";
  let stemNames: string[] = [];

  if (link) {
    const job = await getJobForWorkspace(link.workspace_id ?? null, link.job_id);
    if (job?.fileName) {
      trackName = job.fileName.replace(/\.[^/.]+$/, "");
    }
    const wsId = link.workspace_id ?? null;
    const stemKeys = await listStemsForWorkspace(wsId, link.job_id);
    const prefix = wsId
      ? `workspaces/${wsId}/stems/${link.job_id}/`
      : `stems/${link.job_id}/`;
    stemNames = stemKeys.map((k) => k.replace(prefix, "").replace(".wav", ""));
  }

  // Load Futura PT Bold font
  const appUrl = (
    process.env.APP_URL ?? `https://${request.headers.get("host")}`
  ).trim();

  const fontData = await fetch(`${appUrl}/fonts/futura-pt-bold.ttf`).then(
    (r) => r.arrayBuffer()
  );
  const fontMediumData = await fetch(`${appUrl}/fonts/futura-pt-medium.ttf`).then(
    (r) => r.arrayBuffer()
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          backgroundColor: "#000000",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "52px 64px",
          fontFamily: "FuturaPT",
          position: "relative",
        }}
      >
        {/* Top bar: logo + domain */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#FFFFFF", letterSpacing: "0.12em" }}>
            44STEMS
          </span>
          <span style={{ fontSize: 14, color: "#555555", letterSpacing: "0.06em" }}>
            44stems.com
          </span>
        </div>

        {/* Center: track name */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, justifyContent: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#1B10FD", letterSpacing: "0.16em", textTransform: "uppercase" }}>
            SHARED SPLIT
          </div>
          <div
            style={{
              fontSize: trackName.length > 40 ? 44 : trackName.length > 25 ? 56 : 68,
              fontWeight: 700,
              color: "#FFFFFF",
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
              maxWidth: 900,
            }}
          >
            {trackName}
          </div>

          {/* Stem pills */}
          {stemNames.length > 0 && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
              {stemNames.map((name, i) => (
                <div
                  key={name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    backgroundColor: "#111111",
                    padding: "6px 14px",
                    border: `1px solid #222222`,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: STEM_COLORS[i % STEM_COLORS.length],
                    }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#AAAAAA", letterSpacing: "0.06em", textTransform: "capitalize" }}>
                    {name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom: stem count + CTA */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <span style={{ fontSize: 15, color: "#555555", letterSpacing: "0.04em" }}>
            {stemNames.length} stem{stemNames.length !== 1 ? "s" : ""} · Split with AI
          </span>
          <div
            style={{
              backgroundColor: "#1B10FD",
              padding: "10px 24px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF", letterSpacing: "0.06em" }}>
              TRY 44STEMS FREE
            </span>
          </div>
        </div>

        {/* Accent line top */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            backgroundColor: "#1B10FD",
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "FuturaPT", data: fontData, weight: 700 },
        { name: "FuturaPT", data: fontMediumData, weight: 500 },
      ],
    }
  );
}
