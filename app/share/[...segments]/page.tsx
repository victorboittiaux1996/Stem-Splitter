import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getJobForWorkspace, getPresignedUrl, listStemsForWorkspace, stemKey } from "@/lib/r2";
import { Logo } from "@/components/website/logo";
import Link from "next/link";
import { SharePlayerV2 } from "./share-player-v2";

const F = "var(--font-futura), sans-serif";
const C = {
  bg: "#F3F3F3",
  bgCard: "#FFFFFF",
  bgHover: "#E0E0E0",
  text: "#000000",
  textSec: "#555555",
  textMuted: "#999999",
  accent: "#1B10FD",
} as const;

interface Props {
  params: Promise<{ segments: string[] }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { segments } = await params;
    const id = segments[0];

    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: link } = await (supabase as any)
      .from("share_links")
      .select("job_id, workspace_id")
      .eq("id", id)
      .maybeSingle();

    let trackName = "Shared split";
    let stemCount = 0;

    if (link) {
      const job = await getJobForWorkspace(link.workspace_id ?? null, link.job_id);
      if (job?.fileName) trackName = job.fileName.replace(/\.[^/.]+$/, "");
      const stemKeys = await listStemsForWorkspace(link.workspace_id ?? null, link.job_id);
      stemCount = stemKeys.length;
    }

    const appUrl = (process.env.APP_URL ?? "https://44stems.com").trim();
    const ogImageUrl = `${appUrl}/api/og/share?id=${id}`;
    const description = `${stemCount} stem${stemCount !== 1 ? "s" : ""} · Split with AI on 44Stems`;

    return {
      title: `${trackName} — 44Stems`,
      description,
      openGraph: {
        title: `${trackName} — 44Stems`,
        description,
        images: [{ url: ogImageUrl, width: 1200, height: 630, alt: trackName }],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: `${trackName} — 44Stems`,
        description,
        images: [ogImageUrl],
      },
    };
  } catch (e) {
    console.error("[share/generateMetadata] failed:", e);
    return {
      title: "Shared split — 44Stems",
      description: "Split with AI on 44Stems",
    };
  }
}

export default async function SharePage({ params }: Props) {
  const { segments } = await params;
  const id = segments[0];
  const urlSlug = segments[1] ?? null;

  const supabase = await createClient();

  // Fetch share link (public RLS)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: link } = await (supabase as any)
    .from("share_links")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!link) notFound();

  // Redirect to canonical URL with slug if missing or incorrect
  if (link.slug && urlSlug !== link.slug) {
    redirect(`/share/${id}/${link.slug}`);
  }

  // Increment view count atomically (fire-and-forget)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (supabase as any)
    .rpc("increment_share_view_count", { link_id: id })
    .then(() => {});

  // Fetch job from R2
  const job = await getJobForWorkspace(link.workspace_id ?? null, link.job_id);
  if (!job || job.status !== "completed") notFound();

  // List stems and get presigned URLs (1h expiry)
  const wsId = link.workspace_id ?? null;
  const stemKeys = await listStemsForWorkspace(wsId, link.job_id);
  if (stemKeys.length === 0) notFound();

  const stemsPrefix = wsId
    ? `workspaces/${wsId}/stems/${link.job_id}/`
    : `stems/${link.job_id}/`;

  const STEM_ORDER = ["vocals", "drums", "bass", "guitar", "piano", "other", "instrumental"];

  const stemsUnsorted = await Promise.all(
    stemKeys.map(async (key) => {
      const name = key.replace(stemsPrefix, "").replace(".wav", "");
      const wavUrl = await getPresignedUrl(key, 3600);
      const mp3Key = stemKey(wsId, link.job_id, name, ".mp3");
      const mp3Url = await getPresignedUrl(mp3Key, 3600).catch(() => null);
      return { name, wavUrl, mp3Url };
    })
  );

  const stems = stemsUnsorted.sort((a, b) => {
    const ia = STEM_ORDER.indexOf(a.name);
    const ib = STEM_ORDER.indexOf(b.name);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  const trackName = (job.fileName ?? "track").replace(/\.[^/.]+$/, "");
  const bpm = job.bpm != null ? Math.round(job.bpm) : null;
  const key = job.key ?? null;

  // Build info line: "4 stems · 128 BPM · 10A"
  const infoParts: string[] = [
    `${stems.length} stem${stems.length !== 1 ? "s" : ""}`,
  ];
  if (bpm) infoParts.push(`${bpm} BPM`);
  if (key) infoParts.push(key);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: C.bg, fontFamily: F }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid #E0E0E0", backgroundColor: C.bgCard }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 40px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/">
            <Logo size="md" color={C.text} monochrome />
          </Link>
          <Link href="/pricing"
            style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.04em", color: C.accent, textDecoration: "none" }}>
            GET PRO
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "48px 40px" }}>
        {/* Title */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: C.text, marginBottom: 4 }}>
            {trackName}
          </h1>
          <p style={{ fontSize: 13, color: C.textMuted }}>
            {infoParts.join(" · ")}
          </p>
        </div>

        {/* Players */}
        <SharePlayerV2 stems={stems} trackName={trackName} peaks={job.peaks ?? {}} />

        {/* CTA */}
        <div style={{ marginTop: 48, padding: "32px", backgroundColor: C.bgCard, textAlign: "center" }}>
          <p style={{ fontSize: 15, color: C.textMuted, marginBottom: 16 }}>Split your own tracks</p>
          <Link href="/"
            style={{ display: "inline-block", fontSize: 14, fontWeight: 700, letterSpacing: "0.04em", color: "#FFFFFF", backgroundColor: C.accent, padding: "10px 28px", textDecoration: "none" }}>
            TRY 44STEMS FREE
          </Link>
        </div>
      </main>
    </div>
  );
}
