"""Modal GPU worker for stem separation.

Pipeline: MelBand RoFormer (vocals) + BS-RoFormer SW (instruments)
GPU: H100 80GB
Both models process the original mix in parallel.

Deploy: modal deploy worker/app.py
"""

import modal
import os
import time
import glob
import threading  # parallel inference thread-local state

app = modal.App("stem-splitter")

VOCAL_MODEL = "vocals_mel_band_roformer.ckpt"
INSTRUMENT_MODEL = "BS-Roformer-SW.ckpt"

_COLD_START = True  # True only on first invocation per container lifetime

# Cached Separator instances — loaded once per container, reused across invocations.
# Key insight: on a warm container model weights are already in VRAM, so every call
# after the first skips the 20-35s load_model penalty for each model.
_sep_vocal: "object | None" = None
_sep_instru: "object | None" = None

# Thread-local storage for per-thread tqdm progress state during parallel inference.
# Each inference thread stores {"start", "end", "stage", "job_id", "ws", "last_write"} here.
_tqdm_tls = threading.local()
_tqdm_orig_update = None  # baseline captured on first job; detects stale patches from crashed containers

# ─── bgutil PO token provider sidecar ───────────────────────────────────────
# Node.js subprocess that listens on 127.0.0.1:4416 and serves PO tokens to yt-dlp.
# Needed for YouTube's 2024+ anti-bot layer — without PO tokens, web/mweb/web_safari
# clients are rate-limited immediately on datacenter IPs.
# Kill switch: set USE_BGUTIL=false to skip sidecar entirely.

_bgutil_proc = None


def _bgutil_healthy() -> bool:
    """Return True if bgutil sidecar is up and listening on port 4416."""
    import socket
    try:
        with socket.create_connection(("127.0.0.1", 4416), timeout=0.3):
            return True
    except OSError:
        return False


def ensure_bgutil_provider():
    """Start the bgutil PO token provider sidecar if not already running."""
    global _bgutil_proc
    if os.environ.get("USE_BGUTIL", "true").lower() == "false":
        return
    if _bgutil_proc and _bgutil_proc.poll() is None and _bgutil_healthy():
        return
    import subprocess
    import atexit
    _bgutil_proc = subprocess.Popen(
        ["npm", "start"],
        cwd="/opt/bgutil-server/server",
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    # Wait up to 15s for the sidecar to bind (health-check loop).
    # bgutil fetches initial data from Google on first start, takes 5-12s on cold container.
    import time as _time
    for _ in range(75):
        if _bgutil_healthy():
            print("[bgutil] sidecar ready on :4416")
            return
        _time.sleep(0.2)
    print("[bgutil] WARNING: sidecar did not start within 15s — proceeding without PO tokens")
    atexit.register(lambda: _bgutil_proc and _bgutil_proc.terminate())


# ─── YouTube client fallback chain ──────────────────────────────────────────
# web_safari leads (cookies honored, PO token via bgutil).
# tv_simply second (cookie-compatible content, no PO token needed).
# ios DROPPED — bgutil cannot generate iOSGuard tokens.
# android_sdkless replaces deprecated android client.

YT_CLIENT_CHAIN = ["web_safari", "tv_simply", "mweb", "android_sdkless"]

_CHROME_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


def _is_youtube_url(url: str) -> bool:
    return "youtube.com" in url or "youtu.be" in url or url.startswith("ytsearch:")


# ─── Cookie jar management ──────────────────────────────────────────────────
# Reads COOKIES_TXT_1 / COOKIES_TXT_2 / COOKIES_TXT_3 from env (Modal Secret
# youtube-cookies-jar). Picks one deterministically by hashing the job_id so
# retries reuse the same jar. Falls back to None if no cookies are configured.

def _get_cookies_path(job_id: str) -> "str | None":
    """Write the selected cookie jar to /tmp and return its path."""
    jars = []
    for i in range(1, 4):
        val = os.environ.get(f"COOKIES_TXT_{i}", "").strip()
        if val:
            jars.append((i, val))
    if not jars:
        return None
    # Hash job_id to pick a stable jar (same job always uses the same jar)
    idx = hash(job_id) % len(jars)
    jar_num, content = jars[idx]
    path = f"/tmp/yt-cookies-{jar_num}.txt"
    if not os.path.exists(path):
        with open(path, "w") as f:
            f.write(content)
        os.chmod(path, 0o600)
    return path


# ─── Core yt-dlp runner ─────────────────────────────────────────────────────

class YtDlpError(Exception):
    def __init__(self, message: str, code: str, is_terminal: bool, stderr: str = ""):
        super().__init__(message)
        self.code = code
        self.is_terminal = is_terminal
        self.stderr = stderr


def _run_ytdlp_download(url: str, output_template: str, cookies_path: "str | None",
                        client: str, proxy: "str | None" = None) -> None:
    """Run yt-dlp for a single client attempt. Raises YtDlpError on failure."""
    import subprocess

    cmd = [
        "yt-dlp",
        "--format", "bestaudio/best",
        "-o", output_template,
        "--no-warnings",
        "--socket-timeout", "30",
        "--retries", "3",
        "--fragment-retries", "3",
        "--concurrent-fragments", "4",   # parallel DASH fragment downloads
        "--http-chunk-size", "10485760",  # 10 MB chunks — bypasses YouTube bandwidth throttling
        "--buffer-size", "16K",           # reduce syscall overhead on large files
        "--user-agent", _CHROME_UA,
        "--extractor-args", f"youtube:player_client={client}",
    ]

    # bgutil PO token provider (YouTube only, kill-switch aware)
    if _is_youtube_url(url) and os.environ.get("USE_BGUTIL", "true").lower() != "false" and _bgutil_healthy():
        cmd += ["--extractor-args", "youtubepot-bgutilhttp:base_url=http://127.0.0.1:4416"]

    if cookies_path:
        cmd += ["--cookies", cookies_path]

    if proxy:
        cmd += ["--proxy", proxy]

    cmd.append(url)

    try:
        subprocess.run(cmd, timeout=120, check=True, capture_output=True)
    except subprocess.TimeoutExpired:
        raise YtDlpError("Download timed out after 120s", "network", False)
    except subprocess.CalledProcessError as e:
        stderr = e.stderr.decode("utf-8", errors="replace") if e.stderr else ""
        code, is_terminal = classify_error(stderr)
        raise YtDlpError(f"yt-dlp failed (client={client})", code, is_terminal, stderr)


def _run_ytdlp_chain(url: str, output_template: str, cookies_path: "str | None",
                     proxy: "str | None" = None) -> None:
    """Walk YT_CLIENT_CHAIN until success or a terminal error."""
    last_error = None
    chain = YT_CLIENT_CHAIN if _is_youtube_url(url) else ["default"]

    for client in chain:
        try:
            _run_ytdlp_download(url, output_template, cookies_path, client, proxy)
            return  # success
        except YtDlpError as e:
            if e.is_terminal:
                raise  # private/removed/geo-blocked — no point trying other clients
            print(f"[yt-dlp] client={client} failed ({e.code}), trying next")
            last_error = e

    if last_error:
        raise last_error

# yt-dlp version pinned — update monthly after staging smoke test
_YT_DLP_VERSION = "2026.3.17"

# Shared yt-dlp hardening commands: Node.js 20 + bgutil PO token provider + Deno 2.x
# bgutil-ytdlp-pot-provider: Node.js HTTP sidecar that supplies PO tokens to yt-dlp
# Deno: required by yt-dlp to solve YT's 2026 n-challenge JS cipher
_YT_HARDENING_CMDS = [
    "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -",
    "apt-get install -y --no-install-recommends nodejs",
    "git clone --depth 1 --branch 1.3.1 https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git /opt/bgutil-server && cd /opt/bgutil-server/server && npm install",
    # Deno 2.x for yt-dlp n-challenge solver
    "curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh",
]

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "libsndfile1", "git", "curl", "ca-certificates", "gnupg", "unzip")
    .run_commands(*_YT_HARDENING_CMDS)
    .pip_install(
        "audio-separator[gpu]==0.42.1", "boto3", "fastapi[standard]",
        "soundfile", "numpy", "librosa", "essentia",
        "nnAudio==0.3.3", "einops", "tqdm", f"yt-dlp=={_YT_DLP_VERSION}", "torchaudio",
        "bgutil-ytdlp-pot-provider==1.3.1",
    )
    .run_commands(
        "git clone https://github.com/deezer/skey.git /opt/skey",
        "python -c \"from audio_separator.separator import Separator; "
        "import os; os.makedirs('/tmp/i', exist_ok=True); "
        "s = Separator(output_dir='/tmp/i'); "
        "s.load_model('" + VOCAL_MODEL + "'); "
        "s.load_model('" + INSTRUMENT_MODEL + "'); "
        "print('Models cached')\"",
    )
    .add_local_python_source("analyzer", "storage")
)

# Lightweight CPU-only image for URL metadata fetching (no GPU, no ML libs)
# Same YT hardening as the GPU image (bgutil + Deno) so url_info uses the same client stack
url_info_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("curl", "ca-certificates", "gnupg", "unzip", "git")
    .run_commands(*_YT_HARDENING_CMDS)
    .pip_install(f"yt-dlp=={_YT_DLP_VERSION}", "fastapi[standard]", "bgutil-ytdlp-pot-provider==1.3.1", "boto3")
    .add_local_python_source("storage")
)

# CPU-only image for URL audio downloads — same YT stack as url_info_image but with ffmpeg
# so yt-dlp can merge DASH video+audio streams (required for YouTube, SoundCloud, etc.)
download_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "curl", "ca-certificates", "gnupg", "unzip", "git")
    .run_commands(*_YT_HARDENING_CMDS)
    .pip_install(
        f"yt-dlp=={_YT_DLP_VERSION}", "fastapi[standard]",
        "bgutil-ytdlp-pot-provider==1.3.1", "boto3",
    )
    .add_local_python_source("storage")
)


@app.function(
    image=url_info_image,
    timeout=60,
    secrets=[
        modal.Secret.from_name("youtube-cookies-jar"),
    ],
)
@modal.web_endpoint(method="GET")
def url_info(url: str = "", playlist: str = ""):
    """Fetch metadata (duration + title) for a URL using yt-dlp.

    Lightweight CPU-only function — no GPU needed.
    Called by /api/url-info on Vercel where yt-dlp isn't available.

    For playlists (playlist="1"), returns a list of tracks instead of a single track.
    """
    if not url:
        return {"error": "Missing url parameter"}

    import subprocess
    import json

    import subprocess
    import json

    # Start bgutil sidecar for YouTube metadata fetches
    if _is_youtube_url(url):
        try:
            ensure_bgutil_provider()
        except Exception as _e:
            print(f"[bgutil] startup failed (non-fatal): {_e}")

    cookies_path = _get_cookies_path("url-info") if _is_youtube_url(url) else None

    def _yt_base_cmd():
        """Shared yt-dlp flags for all url_info calls."""
        cmd = [
            "yt-dlp",
            "--no-warnings",
            "--socket-timeout", "15",
            "--user-agent", _CHROME_UA,
        ]
        if _is_youtube_url(url):
            cmd += ["--extractor-args", "youtube:player_client=web_safari"]
            if _bgutil_healthy() and os.environ.get("USE_BGUTIL", "true").lower() != "false":
                cmd += ["--extractor-args", "youtubepot-bgutilhttp:base_url=http://127.0.0.1:4416"]
        if cookies_path:
            cmd += ["--cookies", cookies_path]
        return cmd

    # Playlist mode: extract all track URLs + metadata
    if playlist == "1":
        cmd = _yt_base_cmd() + [
            "--flat-playlist",
            "--dump-json",
            "--no-download",
            url,
        ]
        try:
            result = subprocess.run(cmd, timeout=45, capture_output=True, check=True)
            tracks = []
            for line in result.stdout.decode("utf-8", errors="replace").strip().split("\n"):
                if not line.strip():
                    continue
                entry = json.loads(line)
                track_url = entry.get("url") or entry.get("webpage_url") or ""
                # yt-dlp returns video IDs for YouTube playlists — reconstruct full URL
                # Other platforms (Spotify, SoundCloud) return full URLs directly
                if track_url and not track_url.startswith("http") and "youtube" in url.lower():
                    track_url = f"https://www.youtube.com/watch?v={track_url}"
                tracks.append({
                    "url": track_url,
                    "title": entry.get("title") or "",
                    "duration": entry.get("duration") or 0,
                })
            return {"isPlaylist": True, "tracks": tracks, "count": len(tracks)}
        except subprocess.TimeoutExpired:
            return {"error": "Playlist fetch timed out — too many tracks?", "isPlaylist": True, "tracks": []}
        except subprocess.CalledProcessError as e:
            stderr = e.stderr.decode("utf-8", errors="replace") if e.stderr else ""
            code, _ = classify_error(stderr)
            return {"error": f"Could not fetch playlist", "error_code": code, "isPlaylist": True, "tracks": []}
        except Exception as e:
            return {"error": str(e), "error_code": "unknown", "isPlaylist": True, "tracks": []}

    # Single track mode
    cmd = _yt_base_cmd() + [
        "--dump-json",
        "--no-download",
        url,
    ]

    try:
        result = subprocess.run(cmd, timeout=20, capture_output=True, check=True)
        data = json.loads(result.stdout)
        return {
            "duration": data.get("duration") or 0,
            "title": data.get("title") or "",
            "isPlaylist": False,
        }
    except subprocess.TimeoutExpired:
        return {"error": "Metadata fetch timed out", "duration": 0, "title": ""}
    except subprocess.CalledProcessError as e:
        stderr = e.stderr.decode("utf-8", errors="replace") if e.stderr else ""
        code, _ = classify_error(stderr)
        return {"error": "Could not fetch URL info", "error_code": code, "duration": 0, "title": ""}
    except Exception as e:
        return {"error": str(e), "error_code": "unknown", "duration": 0, "title": ""}


def compute_peaks(wav_path: str, num_peaks: int = 1000) -> list[float]:
    """Extract waveform peaks from a WAV file for instant frontend rendering."""
    import soundfile as sf
    import numpy as np
    data, sr = sf.read(wav_path)
    if data.ndim > 1:
        data = data.mean(axis=1)
    data = np.abs(data)
    bucket_size = max(1, len(data) // num_peaks)
    peaks = []
    for i in range(num_peaks):
        start = i * bucket_size
        end = min(start + bucket_size, len(data))
        peaks.append(float(np.max(data[start:end])))
    mx = max(peaks) if peaks else 1.0
    return [round(p / mx, 4) for p in peaks] if mx > 0 else peaks


def ensure_wav24(input_path: str, tmpdir: str) -> str:
    """Convert any input to WAV 24-bit so audio-separator outputs 24-bit stems."""
    import subprocess
    wav_path = os.path.join(tmpdir, "input_24bit.wav")
    subprocess.run(
        ["ffmpeg", "-y", "-i", input_path, "-acodec", "pcm_s24le", "-ar", "44100", wav_path],
        check=True, capture_output=True,
    )
    return wav_path


def convert_to_mp3(wav_path: str, mp3_path: str):
    """Convert a WAV stem to MP3 320kbps."""
    import subprocess
    subprocess.run(
        ["ffmpeg", "-y", "-i", wav_path, "-codec:a", "libmp3lame", "-b:a", "320k", mp3_path],
        check=True, capture_output=True,
    )


def _download_dropbox(url: str, output_dir: str) -> str:
    """Download audio from a Dropbox shared link (direct HTTP download)."""
    import urllib.request
    import urllib.parse

    # Transform Dropbox share URL to direct download
    parsed = urllib.parse.urlparse(url)
    if 'dropbox.com' in parsed.netloc:
        qs = urllib.parse.parse_qs(parsed.query)
        qs['dl'] = ['1']
        new_query = urllib.parse.urlencode(qs, doseq=True)
        url = urllib.parse.urlunparse(parsed._replace(query=new_query))

    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    })

    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            # Try to get filename from Content-Disposition header
            cd = resp.headers.get('Content-Disposition', '')
            filename = 'audio'
            if 'filename=' in cd:
                import re
                m = re.search(r'filename[*]?=["\']?([^"\';\n]+)', cd)
                if m:
                    filename = os.path.basename(m.group(1).strip())  # basename prevents path traversal

            # Ensure we have an extension
            ext = os.path.splitext(filename)[1].lower()
            if ext not in ('.mp3', '.wav', '.flac', '.aif', '.aiff', '.ogg', '.m4a', '.aac', '.webm'):
                ext = '.mp3'
                filename = f'audio{ext}'

            output_path = os.path.join(output_dir, filename)
            with open(output_path, 'wb') as f:
                while True:
                    chunk = resp.read(8192)
                    if not chunk:
                        break
                    f.write(chunk)

            if os.path.getsize(output_path) < 1000:
                raise Exception("Downloaded file is too small — check the Dropbox share link permissions")

            return output_path
    except urllib.error.HTTPError as e:
        raise Exception(f"Dropbox download failed (HTTP {e.code}) — make sure the link is publicly shared")
    except urllib.error.URLError as e:
        raise Exception(f"Dropbox download failed: {e.reason}")


def _resolve_spotify_to_ytsearch(url: str) -> str:
    """Convert a Spotify track URL to a YouTube search query.

    Spotify links can't be downloaded directly (DRM).
    Scrape the Spotify embed page for artist+title, then search YouTube.
    """
    import re
    import json
    import urllib.request

    track_id_match = re.search(r'track/([a-zA-Z0-9]+)', url)
    if not track_id_match:
        raise Exception("Invalid Spotify URL — only track links are supported")

    embed_url = f"https://open.spotify.com/embed/track/{track_id_match.group(1)}"
    req = urllib.request.Request(embed_url, headers={
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    })

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8', errors='replace')
    except Exception as e:
        raise Exception(f"Failed to fetch Spotify embed: {e}")

    match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html)
    if not match:
        raise Exception("Could not parse Spotify embed data")

    data = json.loads(match.group(1))
    entity = data.get('props', {}).get('pageProps', {}).get('state', {}).get('data', {}).get('entity')
    if not entity:
        raise Exception("No entity found in Spotify embed data")

    title = entity.get('name', '')
    artists = entity.get('artists', [])
    artist = ', '.join(a.get('name', '') for a in artists) if artists else ''
    query = f"{artist} - {title}" if artist else title

    if not query.strip():
        raise Exception("Could not extract artist/title from Spotify")

    print(f"Spotify → YouTube search: {query}")
    return f"ytsearch:{query}"


def _redact_cookies(s: str) -> str:
    """Strip cookie values from a string to prevent secret leaks in logs."""
    import re
    # Remove anything that looks like a Netscape cookies.txt line
    s = re.sub(r'(\.youtube\.com|\.google\.com)\S+', '[REDACTED]', s)
    # Remove long base64-ish tokens (cookie values are typically >20 chars of alphanumeric+_-)
    s = re.sub(r'(?<==)[A-Za-z0-9_\-]{20,}', '[REDACTED]', s)
    return s


def classify_error(stderr: str) -> tuple[str, bool]:
    """Parse yt-dlp stderr into a stable error code + terminal flag.

    Returns (code, is_terminal).
    is_terminal=True means retrying won't help (private, removed, geo-blocked, etc.).
    is_terminal=False means the caller should retry (bot detection, rate limit, network).
    """
    import re
    stderr = _redact_cookies(stderr)
    s = stderr.lower()

    patterns: list[tuple[str, str, bool]] = [
        # bot_detected: not terminal — caller should retry with proxy
        (r"sign in to confirm.*not a bot|http error 403|video unavailable.*confirm|"
         r"this content isn't available|please sign in", "bot_detected", False),
        # private
        (r"private video|this video is private", "private", True),
        # removed
        (r"this video has been removed|video unavailable|the video is not available", "removed", True),
        # geo_blocked
        (r"not available in your country|geo.?restricted|not available.*region", "geo_blocked", True),
        # age_restricted
        (r"age.?restricted|confirm your age|inappropriate for some users", "age_restricted", True),
        # rate_limited
        (r"http error 429|too many requests|rate.?limit", "rate_limited", False),
        # network
        (r"network is unreachable|timed out|connection reset|name or service not known|"
         r"ssl.*error|errno 111|errno 104", "network", False),
        # unsupported
        (r"unsupported url|not a valid url|no matching format", "unsupported", True),
    ]

    for pattern, code, terminal in patterns:
        if re.search(pattern, s):
            return (code, terminal)

    return ("unknown", False)


# User-facing error messages for URL download failures — shared by download_audio (CPU)
# and the legacy download path in separate() for audio_b64 / direct mode.
_ERROR_MESSAGES = {
    "bot_detected": "YouTube is temporarily blocking this request. Try again or upload the audio file directly.",
    "private": "This video is private and cannot be imported.",
    "removed": "This video is no longer available.",
    "geo_blocked": "This video is geo-restricted and cannot be imported.",
    "age_restricted": "This video is age-restricted and cannot be imported.",
    "rate_limited": "Too many requests. Please wait a minute and try again.",
    "network": "Could not reach the source. Please try again.",
    "unsupported": "This URL is not supported.",
    "unknown": "Import failed. Please try again or upload the audio file. Contact hello@44stems.com if the problem persists.",
}


def download_from_url(url: str, output_dir: str, job_id: str = "unknown") -> str:
    """Download audio from URL at best available quality.

    Dropbox links are downloaded directly via HTTP.
    Spotify links are resolved to YouTube search (DRM protection).
    YouTube/SoundCloud/Deezer use yt-dlp with the full hardening stack:
      - Authenticated cookies (Modal Secret youtube-cookies-jar)
      - bgutil PO token provider sidecar
      - Client fallback chain: web_safari → tv_simply → mweb → android_sdkless
      - Residential proxy (YT_PROXY_URL) — used directly for YouTube when set,
        since Modal datacenter IPs are always blocked by YouTube's anti-bot layer.
        Skipping the primary path avoids wasting 30-60s on retries that always fail.
    """
    # Dropbox: direct HTTP download (yt-dlp doesn't support it)
    if 'dropbox.com' in url or 'dropboxusercontent.com' in url:
        return _download_dropbox(url, output_dir)

    # Spotify: resolve to YouTube search (yt-dlp can't handle Spotify DRM)
    if 'spotify.com' in url:
        url = _resolve_spotify_to_ytsearch(url)

    # Start bgutil sidecar if needed (YouTube only, noop for other platforms)
    if _is_youtube_url(url):
        try:
            ensure_bgutil_provider()
        except Exception as _e:
            print(f"[bgutil] startup failed (non-fatal): {_e}")

    output_template = os.path.join(output_dir, 'audio.%(ext)s')
    proxy_url = os.environ.get("YT_PROXY_URL", "").strip()

    # Cookie handling:
    # - For non-YouTube URLs: never use cookies (platforms don't need them).
    # - For YouTube with proxy configured: skip cookies by default.
    #   Residential proxy IP passes YT anti-bot without authentication — keeping
    #   cookies out of the proxy path eliminates the weekly 5-7d expiry burden.
    #   Override with USE_COOKIES=true to force cookies even when proxy is set
    #   (useful if proxy alone starts failing age-gated content).
    # - For YouTube without proxy (primary/fallback path): use cookies.
    use_cookies_override = os.environ.get("USE_COOKIES", "").strip().lower()
    if _is_youtube_url(url):
        if proxy_url and use_cookies_override != "true":
            cookies_path = None  # proxy alone is sufficient; no weekly expiry overhead
        else:
            cookies_path = _get_cookies_path(job_id)
    else:
        cookies_path = None

    # For YouTube with proxy configured: go straight to proxy.
    # Modal datacenter IPs are always bot-detected by YouTube — trying primary first
    # wastes 30-60s on retries that are guaranteed to fail.
    # For non-YouTube (SoundCloud, Deezer, etc.) or when proxy is not configured:
    # try primary path first, fall back to proxy on non-terminal errors.
    if _is_youtube_url(url) and proxy_url:
        print(f"[yt-dlp] YouTube detected + proxy configured — using proxy directly (cookies={'yes' if cookies_path else 'no'})")
        try:
            with _ytdlp_semaphore:
                _run_ytdlp_chain(url, output_template, cookies_path, proxy=proxy_url)
        except YtDlpError as err:
            if err.code == "unknown" and err.stderr:
                print(f"[yt-dlp] UNKNOWN error stderr (first 500 chars): {_redact_cookies(err.stderr[:500])}")
            raise Exception(f"{err.code}:{err.args[0]}")
    else:
        # Primary path: direct Modal egress + client fallback chain
        # Semaphore caps concurrent yt-dlp processes at 3 — prevents bot-signature burst patterns.
        try:
            with _ytdlp_semaphore:
                _run_ytdlp_chain(url, output_template, cookies_path, proxy=None)
        except YtDlpError as primary_err:
            if primary_err.is_terminal:
                # Private/removed/geo-blocked — proxy won't help
                raise Exception(f"{primary_err.code}:{primary_err.args[0]}")

            # Non-terminal (bot_detected, rate_limited, network) → try proxy
            if proxy_url:
                print(f"[yt-dlp] primary failed ({primary_err.code}), retrying via residential proxy")
                try:
                    with _ytdlp_semaphore:
                        _run_ytdlp_chain(url, output_template, cookies_path, proxy=proxy_url)
                except YtDlpError as proxy_err:
                    raise Exception(f"{proxy_err.code}:{proxy_err.args[0]}")
            else:
                raise Exception(f"{primary_err.code}:{primary_err.args[0]}")

    for f in os.listdir(output_dir):
        if f.startswith('audio.') and not f.endswith('.part'):
            return os.path.join(output_dir, f)
    raise Exception(f"unknown:No audio file found after download from {url}")


@app.function(
    image=download_image,
    timeout=180,
    cpu=1.0,
    memory=512,
    secrets=[
        modal.Secret.from_name("r2-credentials"),
        modal.Secret.from_name("youtube-cookies-jar"),
        modal.Secret.from_name("yt-proxy-url"),
        modal.Secret.from_name("feature-flags"),
    ],
)
@modal.concurrent(max_inputs=5)
@modal.web_endpoint(method="POST")
def download_audio(request: dict):
    """Download audio from a URL and upload to R2 on CPU (no GPU billed).

    Called by Vercel before dispatching the GPU job — moves the 45-80s download
    cost off the H100 and onto a cheap CPU container.

    Input:  { "url": "...", "jobId": "...", "workspaceId": "..." }
    Output: { "inputKey": "inputs/{jobId}.ext", "downloadDuration": float }
         or { "error": "user-facing message" }  (status written to R2 before returning)
    """
    import tempfile
    import time as _time
    from storage import update_job_status, upload_to_r2

    url = request.get("url", "")
    job_id = request.get("jobId", "unknown")
    workspace_id = request.get("workspaceId") or None

    if not url:
        update_job_status(job_id, "failed", progress=0, stage="Error",
                          error="Missing url", workspace_id=workspace_id)
        return {"error": "Missing url"}

    # Write progress 5% so the frontend shows "Downloading audio" immediately
    update_job_status(job_id, "processing", progress=5, stage="Downloading audio",
                      workspace_id=workspace_id)

    _ext_map = {
        ".mp3": "audio/mpeg", ".wav": "audio/wav", ".flac": "audio/flac",
        ".m4a": "audio/mp4", ".aac": "audio/aac", ".ogg": "audio/ogg",
        ".webm": "audio/webm", ".aif": "audio/aiff", ".aiff": "audio/aiff",
    }

    _t0 = _time.time()
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            input_path = download_from_url(url, tmpdir, job_id=job_id)

            ext = os.path.splitext(input_path)[1].lower() or ".mp3"
            input_key = f"inputs/{job_id}{ext}"
            content_type = _ext_map.get(ext, "audio/mpeg")
            upload_to_r2(input_path, input_key, content_type=content_type)

            download_duration = _time.time() - _t0
            print(f"[DOWNLOAD] job={job_id} done in {download_duration:.2f}s key={input_key}")
            return {"inputKey": input_key, "downloadDuration": download_duration}

    except Exception as e:
        raw_error = str(e)
        parts = raw_error.split(":", 1)
        if len(parts) == 2 and parts[0] in _ERROR_MESSAGES:
            error_code = parts[0]
        else:
            error_code, _ = classify_error(raw_error)
        user_msg = _ERROR_MESSAGES.get(error_code, _ERROR_MESSAGES["unknown"])
        print(f"[DOWNLOAD] ERROR job={job_id} code={error_code}: {_redact_cookies(raw_error)}")
        update_job_status(job_id, "failed", progress=0, stage="Error",
                          error=user_msg, error_code=error_code, workspace_id=workspace_id)
        return {"error": user_msg}


def _make_tqdm_hook(start_pct, end_pct, job_id, stage, workspace_id=None):
    """Monkey-patch tqdm.update to write real progress directly to R2.

    Throttled to 1 write/s. Maps the model's 0→100% chunk progress onto [start_pct, end_pct].
    Writes directly to R2 so the frontend GET polling sees real values immediately.
    """
    import time as _t
    from tqdm import tqdm as _tqdm
    from storage import update_job_status

    _last_write = [0.0]
    _orig = _tqdm.update

    def patched(self, n=1):
        _orig(self, n)
        if self.total and self.total > 0:
            real_pct = int(start_pct + (self.n / self.total) * (end_pct - start_pct))
            now = _t.time()
            if now - _last_write[0] >= 1.0:
                _last_write[0] = now
                try:
                    update_job_status(job_id, "processing", progress=real_pct, stage=stage, workspace_id=workspace_id)
                except Exception:
                    pass  # never let a progress write failure kill the job

    return patched, _orig


def _make_parallel_tqdm_dispatch(orig):
    """Return a thread-safe tqdm.update replacement for parallel inference.

    Reads per-thread progress state from _tqdm_tls.state and writes to R2 at most
    once per second. Threads without TLS state are silently ignored (safe for any
    background threads that audio-separator may spawn internally).
    """
    from storage import update_job_status
    import time as _t

    def _dispatch(self, n=1):
        orig(self, n)
        state = getattr(_tqdm_tls, "state", None)
        if state is None:
            return  # non-instrumented thread — do nothing
        if self.total and self.total > 0:
            pct = int(state["start"] + (self.n / self.total) * (state["end"] - state["start"]))
            now = _t.time()
            last_write = state["last_write"]
            if now - last_write[0] >= 1.0:
                last_write[0] = now
                try:
                    update_job_status(
                        state["job_id"], "processing", progress=pct,
                        stage=state["stage"], workspace_id=state["ws"],
                    )
                except Exception:
                    pass  # never let a progress write failure kill the job

    return _dispatch


def _assert_tqdm_clean(job_id):
    """Detect and repair a stale tqdm.update patch from a previous crashed parallel job.

    First call per container: captures tqdm.update as the clean baseline.
    Subsequent calls: if tqdm.update differs from baseline, restores it and logs a warning.
    This handles the edge case where a container-level OOM prevented the parallel
    branch's finally block from running, leaving a stale patch in place.
    """
    global _tqdm_orig_update
    try:
        from tqdm import tqdm as _tqdm
        if _tqdm_orig_update is None:
            _tqdm_orig_update = _tqdm.update
            return
        if _tqdm.update is not _tqdm_orig_update:
            print(f"[PAR] job={job_id} WARNING stale tqdm patch from previous job — restoring")
            _tqdm.update = _tqdm_orig_update
    except Exception:
        pass


def _preload_models_if_cold(input_key: "str | None", tmpdir: str) -> "str | None":
    """Parallel preload of all 3 ML models + R2 download on cold container start.

    Launches 4 threads simultaneously:
      - S-KEY (17-24s load)
      - Vocal separator (2-3s)
      - Instru separator (2-3s)
      - R2 download (1-3s, only when input_key is set)

    Wall-clock cost = max(all loads) ≈ 17-24s instead of 25-30s sequential.
    Gain: 6-11s on cold starts. Warm containers: all guards return immediately (no-op).

    Returns the downloaded R2 file path if input_key was preloaded, else None.
    Kill switch: set PRELOAD_MODELS=0 in Modal feature-flags secret.
    """
    # Kill switch enforced here (not at call site) so callers don't need to know the flag name
    if os.environ.get("PRELOAD_MODELS", "1").strip() != "1":
        return None

    global _sep_vocal, _sep_instru

    import concurrent.futures as _cf
    import logging
    from audio_separator.separator import Separator
    import analyzer as _analyzer

    logging.getLogger("audio_separator").setLevel(logging.WARNING)

    _preload_dir = os.path.join(tmpdir, "preload")
    os.makedirs(_preload_dir, exist_ok=True)

    def _load_skey():
        _analyzer._init_skey()

    def _load_vocal():
        global _sep_vocal
        if _sep_vocal is not None:
            return
        v_dir = os.path.join(_preload_dir, "v")
        os.makedirs(v_dir, exist_ok=True)
        sep = Separator(output_dir=v_dir, output_format="WAV", normalization_threshold=0.9)
        sep.load_model(model_filename=VOCAL_MODEL)
        _sep_vocal = sep

    def _load_instru():
        global _sep_instru
        if _sep_instru is not None:
            return
        i_dir = os.path.join(_preload_dir, "i")
        os.makedirs(i_dir, exist_ok=True)
        sep = Separator(output_dir=i_dir, output_format="WAV", normalization_threshold=0.9)
        sep.load_model(model_filename=INSTRUMENT_MODEL)
        _sep_instru = sep

    def _download_r2():
        from storage import download_from_r2
        ext = os.path.splitext(input_key)[1] or ".mp3"
        path = os.path.join(_preload_dir, f"input{ext}")
        download_from_r2(input_key, path)
        return path

    _t0 = time.time()

    with _cf.ThreadPoolExecutor(max_workers=4) as executor:
        f_skey = executor.submit(_load_skey)
        f_vocal = executor.submit(_load_vocal)
        f_instru = executor.submit(_load_instru)
        f_r2 = executor.submit(_download_r2) if input_key else None
    # All threads done here (executor.shutdown(wait=True) on context exit)

    elapsed = time.time() - _t0
    # Re-raise any thread exceptions — print timing only on full success
    f_skey.result()
    f_vocal.result()
    f_instru.result()
    preloaded_path = f_r2.result() if f_r2 else None

    print(f"[PRELOAD] cold preload complete in {elapsed:.2f}s")
    return preloaded_path


@app.function(
    image=image,
    gpu="H100",
    timeout=600,
    keep_warm=0,  # NEVER increase without explicit cost approval — H100 = ~$95/day
    secrets=[
        modal.Secret.from_name("r2-credentials"),
        modal.Secret.from_name("youtube-cookies-jar"),
        modal.Secret.from_name("yt-proxy-url"),
        modal.Secret.from_name("feature-flags"),
    ],
)
@modal.web_endpoint(method="POST")
def separate(request: dict):
    """Process a stem separation job.

    Accepts: { "jobId": "...", "mode": "4stem"|"2stem", "inputKey": "..." }
    Or direct audio: { "audio_base64": "...", "filename": "...", "mode": "..." }
    """
    from audio_separator.separator import Separator
    import tempfile
    import base64
    import json
    import logging
    logging.getLogger("audio_separator").setLevel(logging.WARNING)

    global _COLD_START, _sep_vocal, _sep_instru
    _cold = _COLD_START
    _COLD_START = False
    _job_start = time.time()
    _timings: dict[str, float] = {}

    job_id = request.get("jobId", "test")
    mode = request.get("mode", "4stem")
    audio_b64 = request.get("audio_base64")
    input_key = request.get("inputKey")
    download_duration_cpu = request.get("downloadDuration")  # seconds spent in CPU download_audio
    callback_url = request.get("callbackUrl")  # PATCH /api/jobs/{jobId} on Next.js
    overlap = request.get("overlap", 8)
    workspace_id = request.get("workspaceId") or None
    mdxc = {"overlap": overlap}
    parallel_enabled = (
        os.environ.get("PARALLEL_INFERENCE", "0").strip() == "1"
        and mode in ("4stem", "6stem")  # 2stem skips the second model entirely
        and job_id != "test"            # test path bypasses tqdm hook
    )
    _timings['parallel_mode'] = 1 if parallel_enabled else 0
    if download_duration_cpu is not None:
        _timings['download_cpu'] = float(download_duration_cpu)
    _assert_tqdm_clean(job_id)

    _container_id = os.environ.get("MODAL_TASK_ID", "local")
    print(f"[TIMING] job={job_id} cold={int(_cold)} container={_container_id} phase=start")

    with tempfile.TemporaryDirectory() as tmpdir:
        # Parallel preload: models + R2 download in parallel on cold start
        # _preload_models_if_cold handles the PRELOAD_MODELS kill switch internally
        _preloaded_path = None
        if _cold:
            _t_warmup = time.time()
            try:
                _preloaded_path = _preload_models_if_cold(input_key, tmpdir)
            except Exception as _e:
                print(f"[PRELOAD] failed, falling back to sequential: {_e}")
                _preloaded_path = None
            _timings['warmup'] = time.time() - _t_warmup

        # Get input file
        _t0 = time.time()
        if audio_b64:
            filename = request.get("filename", "input.mp3")
            ext = os.path.splitext(filename)[1] or ".mp3"
            input_path = os.path.join(tmpdir, f"input{ext}")
            with open(input_path, "wb") as f:
                f.write(base64.b64decode(audio_b64))
        elif input_key:
            # Download from R2 — or reuse path already fetched by _preload_models_if_cold
            from storage import download_from_r2, update_job_status
            update_job_status(job_id, "processing", progress=5, stage="Downloading audio", workspace_id=workspace_id)
            if _preloaded_path:
                input_path = _preloaded_path
            else:
                ext = os.path.splitext(input_key)[1] or ".mp3"
                input_path = os.path.join(tmpdir, f"input{ext}")
                download_from_r2(input_key, input_path)
        else:
            return {"error": "No audio provided"}


        _timings['download_input'] = time.time() - _t0
        print(f"[TIMING] job={job_id} phase=download_input dur={_timings['download_input']:.2f}s")

        # Convert input to WAV 24-bit (forces audio-separator to output 24-bit)
        _t0 = time.time()
        print("Converting input to WAV 24-bit...")
        input_path = ensure_wav24(input_path, tmpdir)
        print("Input converted to WAV 24-bit")
        _timings['wav24_transcode'] = time.time() - _t0
        print(f"[TIMING] job={job_id} phase=wav24_transcode dur={_timings['wav24_transcode']:.2f}s")

        import concurrent.futures as _cf
        from analyzer import analyze_track

        # Launch analyze_track on CPU in background — runs during GPU inference (no contention).
        # S-KEY is now CPU-only (250K params), Essentia BPM was already CPU.
        # Results only needed at upload time (update_job_status + callback).
        # weakref.finalize guarantees shutdown even on uncaught exceptions (OOM, CUDA crash)
        # without requiring a try/finally over hundreds of lines. shutdown() is idempotent.
        import weakref as _weakref
        _analyze_executor = _cf.ThreadPoolExecutor(max_workers=1)
        _weakref.finalize(_analyze_executor, _analyze_executor.shutdown, wait=False, cancel_futures=True)
        _t_analyze_start = time.time()
        _analyze_future = _analyze_executor.submit(analyze_track, input_path)

        results = {}
        stem_names = []

        if not parallel_enabled:
            # === SEQUENTIAL PATH (default) ===
            # === VOCALS: MelBand RoFormer ===
            vocal_dir = os.path.join(tmpdir, "vocals")
            os.makedirs(vocal_dir)

            print(f"Extracting vocals (MelBand RoFormer, overlap={overlap})...")
            _t0 = time.time()
            if _sep_vocal is None:
                _sep_vocal = Separator(output_dir=vocal_dir, output_format="WAV", normalization_threshold=0.9, mdxc_params=mdxc)
                _sep_vocal.load_model(model_filename=VOCAL_MODEL)
                print(f"[TIMING] job={job_id} phase=sep_vocal_load_model cold_load=1")
            else:
                # Warm reuse — update output_dir and overlap on model_instance directly.
                # mdxc_params['overlap'] is baked into model_instance.overlap at load_model() time
                # (see audio_separator/separator/architectures/mdxc_separator.py:42), so we must
                # patch it here to ensure the correct preset is used for this job.
                # Modal: one job per container — no concurrent access to these globals.
                _sep_vocal.output_dir = vocal_dir
                _sep_vocal.mdxc_params = mdxc
                if hasattr(_sep_vocal, "model_instance") and _sep_vocal.model_instance is not None:
                    _sep_vocal.model_instance.overlap = mdxc.get("overlap", 8)
                    _sep_vocal.model_instance.output_dir = vocal_dir  # must be patched: set at load_model time, old tmpdir is deleted
                print(f"[TIMING] job={job_id} phase=sep_vocal_load_model cold_load=0 (cached, overlap={mdxc.get('overlap')})")
            sep_v = _sep_vocal
            _timings['sep_vocal_load_model'] = time.time() - _t0
            print(f"[TIMING] job={job_id} phase=sep_vocal_load_model dur={_timings['sep_vocal_load_model']:.2f}s")
            try:
                import subprocess as _sp
                _smi = _sp.run(
                    ["nvidia-smi", "--query-gpu=utilization.gpu,memory.used,memory.total", "--format=csv,noheader,nounits"],
                    capture_output=True, timeout=5,
                )
                print(f"[GPU] sm_util%,vram_used_mb,vram_total_mb: {_smi.stdout.decode().strip()}")
            except Exception:
                pass
            start = time.time()
            if job_id != "test":
                from tqdm import tqdm as _tqdm
                _end_pct = 85 if mode == "2stem" else 50
                _patched, _orig = _make_tqdm_hook(10, _end_pct, job_id, "Extracting vocals", workspace_id=workspace_id)
                _tqdm.update = _patched
                try:
                    sep_v.separate(input_path)
                finally:
                    _tqdm.update = _orig
            else:
                sep_v.separate(input_path)
            vocal_time = time.time() - start
            print(f"Vocals done in {vocal_time:.1f}s")
            _timings['sep_vocal_infer'] = vocal_time
            print(f"[TIMING] job={job_id} phase=sep_vocal_infer dur={vocal_time:.2f}s")

            for f in os.listdir(vocal_dir):
                if "(vocals)" in f.lower() and f.endswith(".wav"):
                    results["vocals"] = os.path.join(vocal_dir, f)
                    stem_names.append("vocals")
                    break

            if mode == "2stem":
                # Also grab instrumental
                for f in os.listdir(vocal_dir):
                    if "(other)" in f.lower() and f.endswith(".wav"):
                        results["instrumental"] = os.path.join(vocal_dir, f)
                        stem_names.append("instrumental")
                        break
            else:
                # === INSTRUMENTS: BS-RoFormer SW ===
                inst_dir = os.path.join(tmpdir, "instruments")
                os.makedirs(inst_dir)

                print(f"Extracting instruments (BS-RoFormer SW, overlap={overlap})...")
                _t0 = time.time()
                if _sep_instru is None:
                    _sep_instru = Separator(output_dir=inst_dir, output_format="WAV", normalization_threshold=0.9, mdxc_params=mdxc)
                    _sep_instru.load_model(model_filename=INSTRUMENT_MODEL)
                    print(f"[TIMING] job={job_id} phase=sep_instru_load_model cold_load=1")
                else:
                    # Warm reuse — same logic as sep_vocal: patch output_dir and model_instance.overlap directly.
                    _sep_instru.output_dir = inst_dir
                    _sep_instru.mdxc_params = mdxc
                    if hasattr(_sep_instru, "model_instance") and _sep_instru.model_instance is not None:
                        _sep_instru.model_instance.overlap = mdxc.get("overlap", 8)
                        _sep_instru.model_instance.output_dir = inst_dir  # must be patched: set at load_model time, old tmpdir is deleted
                    print(f"[TIMING] job={job_id} phase=sep_instru_load_model cold_load=0 (cached, overlap={mdxc.get('overlap')})")
                sep_i = _sep_instru
                _timings['sep_instru_load_model'] = time.time() - _t0
                print(f"[TIMING] job={job_id} phase=sep_instru_load_model dur={_timings['sep_instru_load_model']:.2f}s")
                start = time.time()
                if job_id != "test":
                    from tqdm import tqdm as _tqdm
                    _patched, _orig = _make_tqdm_hook(50, 85, job_id, "Extracting instruments", workspace_id=workspace_id)
                    _tqdm.update = _patched
                    try:
                        sep_i.separate(input_path)
                    finally:
                        _tqdm.update = _orig
                else:
                    sep_i.separate(input_path)
                inst_time = time.time() - start
                print(f"Instruments done in {inst_time:.1f}s")
                _timings['sep_instru_infer'] = inst_time
                print(f"[TIMING] job={job_id} phase=sep_instru_infer dur={inst_time:.2f}s")

                # Collect individual instrument stems
                inst_stems = {}
                for f in glob.glob(os.path.join(inst_dir, "**", "*.wav"), recursive=True):
                    fl = os.path.basename(f).lower()
                    for key in ["drums", "bass", "other", "guitar", "piano"]:
                        if f"({key})" in fl:
                            inst_stems[key] = f

                # Drums and Bass stay separate
                if "drums" in inst_stems:
                    results["drums"] = inst_stems["drums"]
                    stem_names.append("drums")
                if "bass" in inst_stems:
                    results["bass"] = inst_stems["bass"]
                    stem_names.append("bass")

                if mode == "6stem":
                    # Keep guitar, piano, other separate
                    for key in ["guitar", "piano", "other"]:
                        if key in inst_stems:
                            results[key] = inst_stems[key]
                            stem_names.append(key)
                    print(f"6-stem mode: kept guitar/piano/other separate")
                else:
                    # 4-stem: merge guitar + piano + other → single "other" stem
                    merge_files = [inst_stems[k] for k in ["other", "guitar", "piano"] if k in inst_stems]
                    _t0_merge = time.time()
                    if merge_files:
                        import numpy as np
                        import soundfile as sf

                        merged = None
                        sr = None
                        for mf in merge_files:
                            data, sample_rate = sf.read(mf)
                            sr = sample_rate
                            if merged is None:
                                merged = data.astype(np.float64)
                            else:
                                if len(data) > len(merged):
                                    merged = np.pad(merged, ((0, len(data) - len(merged)), (0, 0)))
                                elif len(merged) > len(data):
                                    data = np.pad(data, ((0, len(merged) - len(data)), (0, 0)))
                                merged += data.astype(np.float64)

                        peak = np.max(np.abs(merged))
                        if peak > 0.95:
                            merged = merged * (0.95 / peak)

                        other_path = os.path.join(inst_dir, "merged_other.wav")
                        sf.write(other_path, merged.astype(np.float32), sr, subtype='PCM_24')
                        results["other"] = other_path
                        stem_names.append("other")
                        print(f"4-stem mode: merged {len(merge_files)} stems into 'other'")
                    _timings['merge_stems'] = time.time() - _t0_merge
                    print(f"[TIMING] job={job_id} phase=merge_stems dur={_timings['merge_stems']:.2f}s")

        else:
            # === PARALLEL INFERENCE (PARALLEL_INFERENCE=1, mode=4stem/6stem only) ===
            # Both models run simultaneously on the same H100 via ThreadPoolExecutor.
            # tqdm progress dispatched per-thread via threading.local() — zero contention.
            _par_t0 = time.time()
            print(f"[PAR] job={job_id} mode={mode} overlap={overlap} enabled=1")

            vocal_dir = os.path.join(tmpdir, "vocals")
            os.makedirs(vocal_dir)
            inst_dir = os.path.join(tmpdir, "instruments")
            os.makedirs(inst_dir)

            # --- Init vocal separator ---
            _t0 = time.time()
            if _sep_vocal is None:
                _sep_vocal = Separator(output_dir=vocal_dir, output_format="WAV", normalization_threshold=0.9, mdxc_params=mdxc)
                _sep_vocal.load_model(model_filename=VOCAL_MODEL)
                print(f"[TIMING] job={job_id} phase=sep_vocal_load_model cold_load=1")
            else:
                _sep_vocal.output_dir = vocal_dir
                _sep_vocal.mdxc_params = mdxc
                if hasattr(_sep_vocal, "model_instance") and _sep_vocal.model_instance is not None:
                    _sep_vocal.model_instance.overlap = mdxc.get("overlap", 8)
                    _sep_vocal.model_instance.output_dir = vocal_dir
                print(f"[TIMING] job={job_id} phase=sep_vocal_load_model cold_load=0 (cached, overlap={mdxc.get('overlap')})")
            sep_v = _sep_vocal
            _timings['sep_vocal_load_model'] = time.time() - _t0

            # --- Init instru separator ---
            _t0 = time.time()
            if _sep_instru is None:
                _sep_instru = Separator(output_dir=inst_dir, output_format="WAV", normalization_threshold=0.9, mdxc_params=mdxc)
                _sep_instru.load_model(model_filename=INSTRUMENT_MODEL)
                print(f"[TIMING] job={job_id} phase=sep_instru_load_model cold_load=1")
            else:
                _sep_instru.output_dir = inst_dir
                _sep_instru.mdxc_params = mdxc
                if hasattr(_sep_instru, "model_instance") and _sep_instru.model_instance is not None:
                    _sep_instru.model_instance.overlap = mdxc.get("overlap", 8)
                    _sep_instru.model_instance.output_dir = inst_dir
                print(f"[TIMING] job={job_id} phase=sep_instru_load_model cold_load=0 (cached, overlap={mdxc.get('overlap')})")
            sep_i = _sep_instru
            _timings['sep_instru_load_model'] = time.time() - _t0

            try:
                import subprocess as _sp2
                _smi = _sp2.run(
                    ["nvidia-smi", "--query-gpu=utilization.gpu,memory.used,memory.total", "--format=csv,noheader,nounits"],
                    capture_output=True, timeout=5,
                )
                print(f"[PAR] job={job_id} phase=parallel_start vram: {_smi.stdout.decode().strip()}")
            except Exception:
                pass

            # Per-thread timing captured via mutable containers (dict lookup is atomic)
            _v_timing = [None]
            _i_timing = [None]

            def _run_vocal():
                print(f"[PAR] job={job_id} thread=vocal started")
                _t = time.time()
                _tqdm_tls.state = {
                    "start": 10, "end": 50, "stage": "Extracting vocals",
                    "job_id": job_id, "ws": workspace_id, "last_write": [0.0],
                }
                try:
                    sep_v.separate(input_path)
                except BaseException as _e:
                    print(f"[PAR] job={job_id} thread=vocal RAISED: {type(_e).__name__}: {_e}")
                    raise
                finally:
                    try:
                        del _tqdm_tls.state
                    except AttributeError:
                        pass
                    _v_timing[0] = time.time() - _t
                    print(f"[PAR] job={job_id} thread=vocal done dur={_v_timing[0]:.2f}s")

            def _run_instru():
                print(f"[PAR] job={job_id} thread=instru started")
                _t = time.time()
                _tqdm_tls.state = {
                    "start": 50, "end": 85, "stage": "Extracting instruments",
                    "job_id": job_id, "ws": workspace_id, "last_write": [0.0],
                }
                try:
                    sep_i.separate(input_path)
                except BaseException as _e:
                    print(f"[PAR] job={job_id} thread=instru RAISED: {type(_e).__name__}: {_e}")
                    raise
                finally:
                    try:
                        del _tqdm_tls.state
                    except AttributeError:
                        pass
                    _i_timing[0] = time.time() - _t
                    print(f"[PAR] job={job_id} thread=instru done dur={_i_timing[0]:.2f}s")

            # Install parallel tqdm dispatch (thread-safe via TLS), run both, always restore
            _par_tqdm_orig = None
            if job_id != "test":
                from tqdm import tqdm as _tqdm
                _par_tqdm_orig = _tqdm.update
                _tqdm.update = _make_parallel_tqdm_dispatch(_par_tqdm_orig)

            _par_first_exc = [None]
            try:
                with _cf.ThreadPoolExecutor(max_workers=2, thread_name_prefix="sep") as _pool:
                    fut_v = _pool.submit(_run_vocal)
                    fut_i = _pool.submit(_run_instru)
                    _done, _pending = _cf.wait([fut_v, fut_i], return_when=_cf.FIRST_EXCEPTION)
                    # Drain sibling even on failure — threads can't be killed mid-inference
                    for _f in list(_pending) + list(_done):
                        try:
                            _f.result()
                        except BaseException as _e:
                            if _par_first_exc[0] is None:
                                _par_first_exc[0] = _e
            finally:
                if _par_tqdm_orig is not None:
                    from tqdm import tqdm as _tqdm
                    _tqdm.update = _par_tqdm_orig  # GUARANTEED restored
                # Always record timings — even on failure path (criterion 5)
                _timings['sep_vocal_infer'] = _v_timing[0] or 0.0
                _timings['sep_instru_infer'] = _i_timing[0] or 0.0
                _timings['sep_parallel_wall'] = time.time() - _par_t0
                _serial_sum = (_v_timing[0] or 0.0) + (_i_timing[0] or 0.0)
                if _timings['sep_parallel_wall'] > 0:
                    print(f"[PAR] job={job_id} phase=parallel_wall dur={_timings['sep_parallel_wall']:.2f}s serial_sum={_serial_sum:.2f}s speedup={_serial_sum/_timings['sep_parallel_wall']:.2f}x")

            if _par_first_exc[0] is not None:
                raise _par_first_exc[0]

            try:
                _smi2 = _sp2.run(
                    ["nvidia-smi", "--query-gpu=utilization.gpu,memory.used,memory.total", "--format=csv,noheader,nounits"],
                    capture_output=True, timeout=5,
                )
                print(f"[PAR] job={job_id} phase=parallel_end vram: {_smi2.stdout.decode().strip()}")
            except Exception:
                pass

            # Collect vocals
            for f in os.listdir(vocal_dir):
                if "(vocals)" in f.lower() and f.endswith(".wav"):
                    results["vocals"] = os.path.join(vocal_dir, f)
                    stem_names.append("vocals")
                    break

            # Collect instrument stems
            inst_stems = {}
            for f in glob.glob(os.path.join(inst_dir, "**", "*.wav"), recursive=True):
                fl = os.path.basename(f).lower()
                for key in ["drums", "bass", "other", "guitar", "piano"]:
                    if f"({key})" in fl:
                        inst_stems[key] = f

            if "drums" in inst_stems:
                results["drums"] = inst_stems["drums"]
                stem_names.append("drums")
            if "bass" in inst_stems:
                results["bass"] = inst_stems["bass"]
                stem_names.append("bass")

            if mode == "6stem":
                for key in ["guitar", "piano", "other"]:
                    if key in inst_stems:
                        results[key] = inst_stems[key]
                        stem_names.append(key)
                print(f"6-stem mode: kept guitar/piano/other separate")
            else:
                # 4-stem: merge guitar + piano + other → single "other" stem
                merge_files = [inst_stems[k] for k in ["other", "guitar", "piano"] if k in inst_stems]
                _t0_merge = time.time()
                if merge_files:
                    import numpy as np
                    import soundfile as sf

                    merged = None
                    sr = None
                    for mf in merge_files:
                        data, sample_rate = sf.read(mf)
                        sr = sample_rate
                        if merged is None:
                            merged = data.astype(np.float64)
                        else:
                            if len(data) > len(merged):
                                merged = np.pad(merged, ((0, len(data) - len(merged)), (0, 0)))
                            elif len(merged) > len(data):
                                data = np.pad(data, ((0, len(merged) - len(data)), (0, 0)))
                            merged += data.astype(np.float64)

                    peak = np.max(np.abs(merged))
                    if peak > 0.95:
                        merged = merged * (0.95 / peak)

                    other_path = os.path.join(inst_dir, "merged_other.wav")
                    sf.write(other_path, merged.astype(np.float32), sr, subtype='PCM_24')
                    results["other"] = other_path
                    stem_names.append("other")
                    print(f"4-stem mode: merged {len(merge_files)} stems into 'other'")
                _timings['merge_stems'] = time.time() - _t0_merge
                print(f"[TIMING] job={job_id} phase=merge_stems dur={_timings['merge_stems']:.2f}s")

        # Fail explicitly if no stems were produced
        if not results:
            error_msg = "No stems produced — input file may be corrupted or too short"
            print(f"ERROR: {error_msg}")
            _analyze_executor.shutdown(wait=False, cancel_futures=True)
            if job_id != "test":
                from storage import update_job_status
                update_job_status(job_id, "failed", progress=0, stage="Error", error=error_msg, workspace_id=workspace_id)
            return {"error": error_msg}

        # Upload to R2 for all real jobs (file mode via inputKey OR URL mode via downloadUrl)
        if job_id != "test":
            from storage import upload_to_r2, update_job_status, stem_key as _stem_key

            update_job_status(job_id, "processing", progress=85, stage="Processing stems", workspace_id=workspace_id)

            # === Post-processing: peaks ∥ mp3_encode ∥ wav_upload in parallel ===
            # All three are CPU/IO-bound, zero GPU dependency.
            # Before: peaks(3s) → mp3(5s) → upload(8s) = 16s sequential on H100
            # After:  [peaks ∥ mp3 ∥ wav_upload](~5s) → mp3_upload(~4s) = ~9s
            _t_post = time.time()
            stem_peaks = {}
            _mp3_paths = {}

            print("Post-processing: peaks ∥ mp3_encode ∥ wav_upload...")
            with _cf.ThreadPoolExecutor(max_workers=1 + len(results) * 2) as _post_pool:
                # Peaks: single thread, loops stems (CPU-bound, ~3s)
                def _run_peaks():
                    for _n, _fp in results.items():
                        stem_peaks[_n] = compute_peaks(_fp)
                _f_peaks = _post_pool.submit(_run_peaks)

                # MP3 encode: one thread per stem, parallel ffmpeg subprocesses (~5s → ~1.5s)
                _mp3_futs = {}
                for _name, _wav in results.items():
                    _mp3 = _wav.replace(".wav", ".mp3")
                    _mp3_futs[_name] = (_mp3, _post_pool.submit(convert_to_mp3, _wav, _mp3))

                # WAV upload: one thread per stem, starts immediately (no dependency on peaks/mp3)
                _wav_futs = []
                for _name, _fp in results.items():
                    _r2k = _stem_key(workspace_id, job_id, _name, ".wav")
                    _wav_futs.append(_post_pool.submit(upload_to_r2, _fp, _r2k, content_type="audio/wav"))

                # Wait for all parallel work
                _f_peaks.result()
                for _name, (_mp3, _fut) in _mp3_futs.items():
                    _fut.result()
                    _mp3_paths[_name] = _mp3
                for _f in _wav_futs:
                    _f.result()

            _timings['post_parallel'] = time.time() - _t_post
            print(f"[TIMING] job={job_id} phase=post_parallel dur={_timings['post_parallel']:.2f}s")

            # Upload MP3s (needs encode done — guaranteed by pool above)
            _t0 = time.time()
            update_job_status(job_id, "processing", progress=92, stage="Uploading stems", workspace_id=workspace_id)
            with _cf.ThreadPoolExecutor(max_workers=len(_mp3_paths)) as _mp3_pool:
                _mp3_up_futs = []
                for _name, _fp in _mp3_paths.items():
                    _r2k = _stem_key(workspace_id, job_id, _name, ".mp3")
                    _mp3_up_futs.append(_mp3_pool.submit(upload_to_r2, _fp, _r2k, content_type="audio/mpeg"))
                for _f in _mp3_up_futs:
                    _f.result()
            _timings['upload_r2_total'] = time.time() - _t0
            print(f"[TIMING] job={job_id} phase=upload_mp3 dur={_timings['upload_r2_total']:.2f}s")

            # Collect analyze_track result (was running on CPU during inference)
            analysis = _analyze_future.result()
            _analyze_executor.shutdown(wait=False)
            _timings['analyze_track'] = time.time() - _t_analyze_start
            print(f"[TIMING] job={job_id} phase=analyze_track dur={_timings['analyze_track']:.2f}s (ran in parallel with inference)")

            # Write all data to R2 at progress=99 — NOT "completed" yet.
            # The PATCH callback will flip to "completed" AFTER tracking usage in Supabase.
            # This eliminates the race where the frontend sees "completed" before minutes are tracked.
            update_job_status(job_id, "processing", progress=99, stage="Finalizing",
                              stems=stem_names, bpm=analysis["bpm"],
                              key=analysis["key"], key_raw=analysis["key_raw"],
                              duration=analysis["duration"], peaks=stem_peaks,
                              workspace_id=workspace_id)

            # Notify Next.js to track usage minutes and flip status to "completed"
            # No retry — increment_usage is additive, retrying risks double-counting
            # Compute wall time + cold flag now so they're included in the callback payload
            _timings['total_wall_time'] = time.time() - _job_start
            _timings['cold'] = int(_cold)
            _t0 = time.time()
            callback_ok = False
            if callback_url:
                import urllib.request
                import urllib.error
                import urllib.parse

                secret = os.environ.get("MODAL_CALLBACK_SECRET", "")
                payload = json.dumps({
                    "status": "completed",
                    "duration": analysis["duration"],
                    "workspaceId": workspace_id,
                    "phase_timings": _timings,
                }).encode("utf-8")

                try:
                    req = urllib.request.Request(callback_url, data=payload, method="PATCH")
                    req.add_header("Content-Type", "application/json")
                    req.add_header("x-modal-secret", secret)

                    # Follow 307/308 redirects while preserving PATCH method and body
                    class _RedirectHandler(urllib.request.HTTPRedirectHandler):
                        def redirect_request(self, req, fp, code, msg, headers, newurl):
                            parsed = urllib.parse.urlparse(newurl)
                            if not parsed.hostname or not parsed.hostname.endswith("44stems.com"):
                                print(f"Refused redirect to {newurl}")
                                raise urllib.error.HTTPError(req.full_url, code, msg, headers, fp)
                            new_req = urllib.request.Request(newurl, data=req.data, method=req.get_method())
                            new_req.add_header("Content-Type", "application/json")
                            new_req.add_header("x-modal-secret", secret)
                            return new_req

                    opener = urllib.request.build_opener(_RedirectHandler)
                    opener.open(req, timeout=10)
                    print(f"Callback sent to {callback_url}")
                    callback_ok = True
                except urllib.error.HTTPError as e:
                    body = e.read().decode("utf-8", errors="replace")[:200] if hasattr(e, "read") else ""
                    print(f"Callback failed (HTTP {e.code}): {body}")
                except Exception as e:
                    print(f"Callback failed — usage NOT tracked for job {job_id}: {type(e).__name__}: {e}")

            _timings['callback_nextjs'] = time.time() - _t0
            print(f"[TIMING] job={job_id} phase=callback_nextjs dur={_timings['callback_nextjs']:.2f}s")

            # Fallback: if callback failed (or no callback_url), write "completed" to R2
            # so the user still sees their stems — but usage won't be tracked
            if not callback_ok:
                try:
                    print(f"Writing completed to R2 as fallback for job {job_id}")
                    update_job_status(job_id, "completed", progress=100, stage="Done",
                                      workspace_id=workspace_id)
                except Exception as e:
                    print(f"Fallback R2 write also failed for job {job_id}: {e}")

            # Write phase_timings to R2 — targeted write that only adds the timings key,
            # never touching status, completedAt, or any other field set by the callback.
            _timings['total_wall_time'] = time.time() - _job_start
            print(f"[TIMING] job={job_id} phase=total_wall_time dur={_timings['total_wall_time']:.2f}s cold={int(_cold)}")
            try:
                from storage import write_phase_timings as _wpt
                _wpt(job_id, _timings, workspace_id=workspace_id)
            except Exception as _e:
                print(f"[TIMING] phase_timings write failed (non-fatal): {_e}")

            return {"status": "completed", "stems": stem_names}

        # Collect analyze result for test/direct mode
        analysis = _analyze_future.result()
        _analyze_executor.shutdown(wait=False)
        _timings['analyze_track'] = time.time() - _t_analyze_start

        # Compute peaks for direct mode too
        stem_peaks = {}
        for stem_name, filepath in results.items():
            stem_peaks[stem_name] = compute_peaks(filepath)

        # Direct mode: return base64 encoded stems
        import base64 as b64
        encoded = {}
        for stem_name, filepath in results.items():
            with open(filepath, "rb") as f:
                encoded[stem_name] = b64.b64encode(f.read()).decode("utf-8")

        return {
            "status": "completed", "stems": stem_names, "data": encoded,
            "bpm": analysis["bpm"], "key": analysis["key"], "key_raw": analysis["key_raw"],
            "duration": analysis["duration"], "peaks": stem_peaks,
        }


# ─── Concurrency semaphore for yt-dlp calls ─────────────────────────────────
# Prevents a burst of 30-50 parallel imports from triggering YT bot detection.
# Excess requests queue naturally via Modal's scheduler.
import threading as _threading
_ytdlp_semaphore = _threading.Semaphore(3)


# ─── Synthetic monitoring (Layer 6) ─────────────────────────────────────────

# First YouTube video ever (jawed, "Me at the zoo", always available since 2005)
_YT_PROBE_URL = "https://www.youtube.com/watch?v=jNQXAC9IVRw"

@app.function(
    image=url_info_image,
    schedule=modal.Cron("0 * * * *"),  # every hour on the hour
    secrets=[
        modal.Secret.from_name("r2-credentials"),
        modal.Secret.from_name("youtube-cookies-jar"),
        modal.Secret.from_name("yt-proxy-url"),
        modal.Secret.from_name("alerts-webhook"),
    ],
    timeout=120,
)
def yt_synthetic_probe():
    """Hourly synthetic probe: download audio from a known-good public YT video.

    Tests the full production path (primary + proxy fallback) rather than primary only.
    Primary path (datacenter IP) will fail — probe uses proxy fallback as production does.
    Alerts on 2 consecutive failures via the alerts-webhook Modal Secret.
    """
    import subprocess
    import json

    print(f"[probe] starting yt_synthetic_probe for {_YT_PROBE_URL}")

    # Try bgutil sidecar (non-fatal if it doesn't start)
    try:
        ensure_bgutil_provider()
    except Exception as _e:
        print(f"[probe] bgutil startup failed (non-fatal): {_e}")

    cookies_path = _get_cookies_path("synthetic-probe")
    proxy_url = os.environ.get("YT_PROXY_URL", "").strip()

    def _probe_cmd(proxy=None):
        cmd = [
            "yt-dlp",
            "--list-formats",  # metadata only — no download bandwidth used
            "--no-warnings",
            "--socket-timeout", "20",
            "--user-agent", _CHROME_UA,
        ]
        if _bgutil_healthy() and os.environ.get("USE_BGUTIL", "true").lower() != "false":
            cmd += ["--extractor-args", "youtubepot-bgutilhttp:base_url=http://127.0.0.1:4416"]
        if cookies_path:
            cmd += ["--cookies", cookies_path]
        if proxy:
            cmd += ["--proxy", proxy]
        cmd.append(_YT_PROBE_URL)
        return cmd

    success = False
    error_snippet = ""

    # Primary path (datacenter IP) — expected to fail without bgutil+warmed cookies
    try:
        subprocess.run(_probe_cmd(), timeout=30, capture_output=True, check=True)
        print("[probe] OK via primary path")
        success = True
    except Exception as exc:
        stderr = getattr(exc, "stderr", b"")
        if isinstance(stderr, bytes):
            stderr = stderr.decode("utf-8", errors="replace")
        print(f"[probe] primary failed ({classify_error(stderr)[0]}), trying proxy")

        # Proxy fallback — this is what production uses
        if proxy_url:
            try:
                subprocess.run(_probe_cmd(proxy=proxy_url), timeout=40, capture_output=True, check=True)
                print("[probe] OK via proxy fallback")
                success = True
            except Exception as proxy_exc:
                ps = getattr(proxy_exc, "stderr", b"")
                if isinstance(ps, bytes):
                    ps = ps.decode("utf-8", errors="replace")
                error_snippet = _redact_cookies(str(ps or str(proxy_exc)))[:200]
                print(f"[probe] FAILED (proxy also failed): {error_snippet}")
        else:
            error_snippet = _redact_cookies(str(stderr or str(exc)))[:200]
            print(f"[probe] FAILED (no proxy configured): {error_snippet}")

    # R2 counter for consecutive failures
    from storage import get_s3_client, BUCKET
    s3 = get_s3_client()
    counter_key = "synthetic/yt-fail-count"
    fail_count = 0
    try:
        resp = s3.get_object(Bucket=BUCKET, Key=counter_key)
        fail_count = int(resp["Body"].read().decode("utf-8"))
    except Exception:
        pass

    if success:
        # Reset counter
        try:
            s3.put_object(Bucket=BUCKET, Key=counter_key, Body=b"0", ContentType="text/plain")
        except Exception:
            pass
        return

    fail_count += 1
    try:
        s3.put_object(Bucket=BUCKET, Key=counter_key, Body=str(fail_count).encode(), ContentType="text/plain")
    except Exception:
        pass

    if fail_count >= 2:
        # Send alert
        # Supported webhook formats (auto-detected from URL):
        #   ntfy.sh:  https://ntfy.sh/<topic>  — plain-text POST body (push notification to phone)
        #   Telegram: https://api.telegram.org/bot<token>/sendMessage?chat_id=<id>  — JSON
        #   Slack/Discord: https://hooks.slack.com/... or https://discord.com/api/webhooks/...  — JSON {"text":"..."}
        webhook_url = os.environ.get("ALERTS_WEBHOOK_URL", "").strip()
        if webhook_url:
            msg = f"44Stems YT probe FAILED x{fail_count} — error: {error_snippet}"
            try:
                if "ntfy.sh" in webhook_url:
                    # ntfy.sh: plain-text POST body, priority header for high-urgency alerts
                    req = urllib.request.Request(webhook_url, data=msg.encode("utf-8"), method="POST")
                    req.add_header("Content-Type", "text/plain")
                    req.add_header("Priority", "high")
                    req.add_header("Title", "44Stems YT Alert")
                elif "telegram" in webhook_url:
                    # Telegram Bot API: POST to sendMessage endpoint
                    payload = json.dumps({"text": msg}).encode("utf-8")
                    req = urllib.request.Request(webhook_url, data=payload, method="POST")
                    req.add_header("Content-Type", "application/json")
                else:
                    # Slack / Discord / generic JSON webhook
                    payload = json.dumps({"text": msg, "content": msg}).encode("utf-8")
                    req = urllib.request.Request(webhook_url, data=payload, method="POST")
                    req.add_header("Content-Type", "application/json")
                urllib.request.urlopen(req, timeout=10)
                print(f"[probe] alert sent (fail_count={fail_count})")
            except Exception as ae:
                print(f"[probe] alert send failed: {ae}")
        else:
            # Fallback: log loudly so Modal logs capture it
            print(f"[ALERT] YT synthetic probe failed {fail_count} times in a row. Set ALERTS_WEBHOOK_URL in Modal Secret alerts-webhook to receive notifications.")
