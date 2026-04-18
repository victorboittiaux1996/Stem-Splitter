import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const jobsTable = () => supabaseAdmin.from("jobs") as any;

type JobRow = {
  id: string;
  status: string;
  mode: string | null;
  file_name: string | null;
  created_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  error_code: string | null;
  phase_timings: Record<string, number> | null;
  cold_start: boolean | null;
  bpm: number | null;
};

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();

async function sendMessage(chatId: number | string, text: string) {
  if (!BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN not set");
    return;
  }
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

export async function POST(request: NextRequest) {
  // Verify the request comes from Telegram
  if (WEBHOOK_SECRET) {
    const secret = request.headers.get("x-telegram-bot-api-secret-token");
    if (secret !== WEBHOOK_SECRET) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  let update: Record<string, unknown>;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const message = (update.message ?? update.edited_message) as Record<string, unknown> | undefined;
  if (!message?.text) return NextResponse.json({ ok: true });

  const chatId = (message.chat as Record<string, unknown>).id as number;
  const text = (message.text as string).trim();
  const parts = text.split(/\s+/);
  const command = parts[0].toLowerCase().replace(/@\w+/, "");
  const arg = parseInt(parts[1] ?? "", 10);

  try {
    switch (command) {
      case "/ping":
      case "/start":
        await sendMessage(chatId, "✅ <b>44Stems bot online</b>\n\nCommands:\n/recap [N] — last N jobs summary\n/errors [N] — recent failures\n/timing [N] — phase timing breakdown\n/live — currently processing");
        break;
      case "/recap":
      case "/stats":
        await handleRecap(chatId, isNaN(arg) ? 10 : Math.min(arg, 50));
        break;
      case "/errors":
        await handleErrors(chatId, isNaN(arg) ? 5 : Math.min(arg, 20));
        break;
      case "/timing":
        await handleTiming(chatId, isNaN(arg) ? 5 : Math.min(arg, 20));
        break;
      case "/live":
      case "/status":
        await handleLive(chatId);
        break;
      default:
        await sendMessage(chatId, "Commands: /recap [N] · /errors [N] · /timing [N] · /live · /ping");
    }
  } catch (err) {
    console.error("Telegram command error:", err);
    await sendMessage(chatId, "❌ Error processing command");
  }

  return NextResponse.json({ ok: true });
}

async function handleRecap(chatId: number | string, n: number) {
  const { data: rawJobs, error } = await jobsTable()
    .select("status, mode, duration_seconds, error_code, phase_timings, cold_start, created_at, completed_at, file_name")
    .order("created_at", { ascending: false })
    .limit(n);
  const jobs = rawJobs as JobRow[] | null;

  if (error || !jobs?.length) {
    await sendMessage(chatId, `No jobs found. (${error?.message ?? "empty"})`);
    return;
  }

  const total = jobs.length;
  const completed = jobs.filter((j) => j.status === "completed");
  const failed = jobs.filter((j) => j.status === "failed");
  const successRate = Math.round((completed.length / total) * 100);

  const durations = completed.map((j) => j.duration_seconds).filter((v): v is number => typeof v === "number");
  const avgDur = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
  const minDur = durations.length ? Math.min(...durations) : null;
  const maxDur = durations.length ? Math.max(...durations) : null;

  const coldStarts = completed.filter((j) => j.cold_start).length;

  const modeCounts = jobs.reduce(
    (acc, j) => {
      const k = j.mode ?? "?";
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const modesStr = Object.entries(modeCounts)
    .map(([k, v]) => `${k}×${v}`)
    .join("  ");

  const errorCounts = failed.reduce(
    (acc, j) => {
      const code = j.error_code ?? "unknown";
      acc[code] = (acc[code] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const errorsStr = Object.entries(errorCounts)
    .map(([k, v]) => `${k}×${v}`)
    .join("  ");

  const oldest = new Date(jobs[jobs.length - 1].created_at);
  const newest = new Date(jobs[0].created_at);
  const fmt = (d: Date) =>
    d.toLocaleDateString("fr-FR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  let msg = `<b>📊 Recap — last ${total} jobs</b>\n`;
  msg += `✅ ${completed.length}/${total} success (${successRate}%)\n`;
  if (failed.length > 0) msg += `❌ ${failed.length} failed${errorsStr ? ` — ${errorsStr}` : ""}\n`;
  msg += "\n";
  if (avgDur !== null) {
    msg += `⏱ Avg <b>${avgDur.toFixed(1)}s</b>  (min ${minDur!.toFixed(1)}s / max ${maxDur!.toFixed(1)}s)\n`;
  }
  if (coldStarts > 0) msg += `🥶 Cold starts: ${coldStarts}/${completed.length}\n`;
  msg += `📁 ${modesStr}\n`;
  msg += `📅 ${fmt(oldest)} → ${fmt(newest)}\n`;

  // Per-job list (last 5 max to avoid message length issues)
  const listed = jobs.slice(0, 5);
  msg += "\n<b>Jobs:</b>\n";
  for (const j of listed) {
    const icon = j.status === "completed" ? "✅" : j.status === "failed" ? "❌" : "⏳";
    const dur = j.duration_seconds != null ? ` ${j.duration_seconds.toFixed(1)}s` : "";
    const name = (j.file_name ?? "unknown").slice(0, 35);
    const t = new Date(j.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    msg += `${icon} ${t}${dur} · ${j.mode} · ${name}\n`;
  }

  await sendMessage(chatId, msg);
}

async function handleErrors(chatId: number | string, n: number) {
  const { data: rawJobs, error } = await jobsTable()
    .select("id, error_code, file_name, created_at")
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(n);
  const jobs = rawJobs as Pick<JobRow, "id" | "error_code" | "file_name" | "created_at">[] | null;

  if (error) {
    await sendMessage(chatId, `❌ Query error: ${error.message}`);
    return;
  }

  if (!jobs?.length) {
    await sendMessage(chatId, "✅ No recent failures.");
    return;
  }

  let msg = `<b>❌ Recent failures (${jobs.length})</b>\n`;
  for (const j of jobs) {
    const t = new Date(j.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const name = (j.file_name ?? "unknown").slice(0, 40);
    msg += `• ${t} — <code>${j.error_code ?? "unknown"}</code> — ${name}\n`;
  }

  await sendMessage(chatId, msg);
}

async function handleTiming(chatId: number | string, n: number) {
  const { data: rawJobs, error } = await jobsTable()
    .select("phase_timings, cold_start, mode")
    .eq("status", "completed")
    .not("phase_timings", "is", null)
    .order("created_at", { ascending: false })
    .limit(n);
  const jobs = rawJobs as Pick<JobRow, "phase_timings" | "cold_start" | "mode">[] | null;

  if (error) {
    await sendMessage(chatId, `❌ Query error: ${error.message}`);
    return;
  }

  if (!jobs?.length) {
    await sendMessage(chatId, "No completed jobs with timing data yet.");
    return;
  }

  const phases: Array<[string, string]> = [
    ["download_input",    "download   "],
    ["wav24_transcode",   "transcode  "],
    ["analyze_track",     "analyze    "],
    ["sep_vocal_infer",   "infer_voc  "],
    ["sep_instru_infer",  "infer_inst "],
    ["upload_r2_total",   "upload_r2  "],
    ["total_wall_time",   "TOTAL      "],
  ];

  let msg = `<b>⏱ Phase timings — last ${jobs.length} jobs</b>\n<pre>`;
  msg += "phase        avg    min    max\n";

  for (const [phase, label] of phases) {
    const vals = jobs
      .map((j) => (j.phase_timings as Record<string, number> | null)?.[phase])
      .filter((v): v is number => typeof v === "number" && v > 0);
    if (!vals.length) continue;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    msg += `${label} ${avg.toFixed(1)}s  ${min.toFixed(1)}s  ${max.toFixed(1)}s\n`;
  }

  const coldStarts = jobs.filter((j) => j.cold_start).length;
  msg += `</pre>🥶 Cold: ${coldStarts}/${jobs.length}`;

  await sendMessage(chatId, msg);
}

async function handleLive(chatId: number | string) {
  const { data: rawJobs, error } = await jobsTable()
    .select("id, mode, file_name, created_at, status")
    .in("status", ["processing", "uploading"])
    .order("created_at", { ascending: false })
    .limit(10);
  const jobs = rawJobs as Pick<JobRow, "id" | "mode" | "file_name" | "created_at" | "status">[] | null;

  if (error) {
    await sendMessage(chatId, `❌ Query error: ${error.message}`);
    return;
  }

  if (!jobs?.length) {
    await sendMessage(chatId, "✅ No active jobs.");
    return;
  }

  let msg = `<b>🔄 Active jobs (${jobs.length})</b>\n`;
  for (const j of jobs) {
    const ago = Math.round((Date.now() - new Date(j.created_at).getTime()) / 1000);
    const name = (j.file_name ?? "unknown").slice(0, 35);
    msg += `• ${j.status} · ${j.mode} · ${name} · ${ago}s ago\n`;
  }

  await sendMessage(chatId, msg);
}
