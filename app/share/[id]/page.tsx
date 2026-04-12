import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getJobForWorkspace, getPresignedUrl, listStemsForWorkspace, stemKey } from "@/lib/r2";
import { Logo } from "@/components/website/logo";
import Link from "next/link";

const F = "'Futura PT', 'futura-pt', sans-serif";
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
  params: Promise<{ id: string }>;
}

export default async function SharePage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();

  // Fetch share link (public RLS)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: link } = await (supabase as any)
    .from("share_links")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!link) notFound();

  // Increment view count atomically (fire-and-forget — don't await to block render)
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

  const stems = await Promise.all(
    stemKeys.map(async (key) => {
      const name = key.replace(stemsPrefix, "").replace(".wav", "");
      const wavUrl = await getPresignedUrl(key, 3600);
      const mp3Key = stemKey(wsId, link.job_id, name, ".mp3");
      const mp3Url = await getPresignedUrl(mp3Key, 3600).catch(() => null);
      return { name, wavUrl, mp3Url };
    })
  );

  const fileName = job.fileName ?? "track";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: C.bg, fontFamily: F }}>
      {/* Header */}
      <header style={{ height: 56, display: "flex", alignItems: "center", borderBottom: "1px solid #E0E0E0", backgroundColor: C.bgCard, padding: "0 40px", justifyContent: "space-between" }}>
        <Link href="/">
          <Logo />
        </Link>
        <Link href="/pricing"
          style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.04em", color: C.accent, textDecoration: "none" }}>
          GET PRO
        </Link>
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "48px 40px" }}>
        {/* Title */}
        <div style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textMuted, marginBottom: 8 }}>
            Shared split
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: C.text, marginBottom: 4 }}>
            {fileName}
          </h1>
          <p style={{ fontSize: 13, color: C.textMuted }}>
            {stems.length} stems · {link.view_count + 1} views
          </p>
        </div>

        {/* Stems */}
        <div style={{ backgroundColor: C.bgCard }}>
          {stems.map((stem, i) => (
            <div
              key={stem.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "16px 20px",
                borderBottom: i < stems.length - 1 ? "1px solid #E8E8E8" : undefined,
              }}
            >
              <span style={{ flex: 1, fontSize: 15, fontWeight: 600, letterSpacing: "0.03em", color: C.text, textTransform: "capitalize" }}>
                {stem.name}
              </span>
              <audio
                controls
                src={stem.wavUrl}
                style={{ height: 32, flex: 2, accentColor: C.accent }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                {stem.mp3Url && (
                  <a
                    href={stem.mp3Url}
                    download={`${stem.name}.mp3`}
                    style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", color: C.textSec, textDecoration: "none", padding: "5px 10px", backgroundColor: C.bgHover }}
                  >
                    MP3
                  </a>
                )}
                <a
                  href={stem.wavUrl}
                  download={`${stem.name}.wav`}
                  style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", textDecoration: "none", padding: "5px 10px", backgroundColor: C.accent, color: "#FFFFFF" }}
                >
                  WAV
                </a>
              </div>
            </div>
          ))}
        </div>

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
