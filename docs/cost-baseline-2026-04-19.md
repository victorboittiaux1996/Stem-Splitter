# Modal cost baseline — facts only

Generated: 2026-04-19T20:01:42.672770+00:00
Billing window: **2026-03-21 → 2026-04-19** (19 days covered)

## Sources

1. **Modal billing** (`docs/modal-billing/*.json`, from `modal billing report --json`). Measured. Authoritative.
2. **Supabase `jobs.phase_timings.modal_cost`**. Estimated by the worker (wall+boot × H100 rate). Subset of completed jobs only.

## Per-app totals

| App ID | Description | Total |
|---|---|---|
| `ap-tWF8hmB2tAxyNlT6yzU9SD` | stem-splitter | $97.92 |
| `ap-XPNkMAeRxzzMVwNwqLw4SK` | stem-splitter-test | $2.0093 |
| `ap-8hPfej1zlJ5q2GOG5rmky0` | stem-splitter-bench | $0.9407 |
| `ap-Fdhdfusm6GXoRwda4k38hE` | stem-splitter-benchmark | $0.4112 |
| `ap-IqnzsiOmL3YuRdLYHn0bqY` | stem-splitter-prod-timed | $0.3893 |
| `ap-9taZCkzwJkaGmnPhjZP04b` | stem-splitter-gpu-test | $0.2898 |
| `ap-XV7hGag3vRz9T9UMw9vFwv` | stem-splitter-overlap-test | $0.2073 |
| `ap-HBip1kDNE69QKPKw08Kcm4` | stem-splitter-gpu-test | $0.1853 |
| `ap-bBxD1FbzhpflVL0crktjr4` | stem-splitter-overlap-test | $0.0963 |
| `ap-xGYtjvDz50M73dlC4brcDc` | stem-splitter-best | $0.0936 |
| `ap-HvsG1O1s1wVL9nfowU2nff` | stem-splitter-best | $0.0847 |
| `ap-ZXXI4fj5CJBfb0ukwy2J5I` | stem-splitter-ab-test | $0.0756 |
| `ap-xTo3GSssk3OhNviKiuUMA1` | stem-splitter-ab-test | $0.0712 |
| `ap-I9ZMGM3UDWEs18qEmOiUb9` | stem-splitter-24bit-test | $0.0577 |
| `ap-13rIPqPuRKTMzGe8k1ttI0` | stem-splitter-best | $0.0552 |
| `ap-8CJNuK80CpDJBghySrfASc` | stem-splitter-test | $0.0519 |
| `ap-gaLz0GLfUctCN4IElmnhW2` | stem-splitter-best | $0.0484 |
| `ap-OGZBPNMskUYMfc7NxH3JFJ` | stem-splitter-best | $0.0470 |
| `ap-N0aEud0uQDrarLPAG2mPa3` | stem-splitter-test | $0.0469 |
| `ap-Udic7TLeONjhPGNGUL9Xae` | stem-splitter-best | $0.0410 |
| `ap-OuIgZZFkSQQlxRfTBlV7y1` | stem-splitter-test | $0.0317 |
| `ap-SabmGzL6vduDLcqgFzGfq8` | stem-splitter-test | $0.0317 |
| `ap-BFRqNqinqUEF10SK40mFY1` | stem-splitter-test | $0.0310 |
| `ap-0L8ZNGfwqEimCheWkPUJ0j` | stem-splitter-test | $0.0292 |
| `ap-GaD6oItx02jrBQHbyT1FiZ` | stem-splitter-test | $0.0221 |
| `ap-sTY83Bcih2VGPYTMxzNbfj` | stem-splitter-test | $0.0211 |
| `ap-aMjijQD9kuFS18NHVQGRXf` | kessin-test | $0.0199 |
| `ap-iP6wtlfTdoYsYm1bnUI6df` | stem-splitter | $0.0031 |
| `ap-szJdCphrpVAUTh2nS8HgF0` | stem-splitter-ab-test | $0.0025 |
| `ap-9kcALcT8P8tIFC4P1mrbtr` | dl-test | $0.0015 |
| `ap-hpCy2KjaW2SilbeKnohm98` | proxy-test2 | $0.0013 |
| `ap-VbNQ82BJkX6XVXgl137pjW` | stem-splitter | $0.0001 |
| `ap-Dpy0OA7Remm0sq61CVe0fm` | test-cls | $0.0001 |
| `ap-3KSivgwjd37c4CYia0MnWw` | stem-splitter | $0.0001 |
| `ap-mDQMV1dVkefdTugCX3X1Ml` | stem-splitter | $0.0001 |
| `ap-bJ0JKHR1EtOI1YrFeboM7Q` | stem-splitter | $0.0001 |
| `ap-Y3g6ParnGBH1ds34A5q5OD` | stem-splitter | $0.0001 |
| `ap-OSSKxdXG5EWO6xtKxkFvqD` | stem-splitter | $0.0001 |
| `ap-Vb8wx9YPnzztXgfCgt5HnA` | stem-splitter | $0.0000 |
| `ap-gsfLO2LXdU7uV1VrRjX4s8` | cookie-check | $0.0000 |
| `ap-AXk9WZ0ahwIbmd6WrZHqT0` | fmt-test | $0.0000 |
| `ap-eBT6egS9gNyD8oUdkm72CB` | tv-test | $0.0000 |
| `ap-ImE9VSC7v8w5rzqHwuO9pY` | rv-test | $0.0000 |
| `ap-AzLy6KveOcejg7GuR2zCgR` | v3-test | $0.0000 |
| `ap-g6A9fLlWwXluWLdJpTkSS9` | nocookie-test | $0.0000 |
| `ap-tqxWNCtAJkWvF554I4jpdC` | stem-splitter | $0.0000 |
| `ap-EKwJBGISr0huMF4FQ4vPvw` | stem-splitter | $0.0000 |
| `ap-eubzJscU4DWx7oNhob9QRf` | proxy-check | $0.0000 |
| `ap-qNiGVUDJld0ZzKigfHrCbL` | stem-splitter | $0.0000 |
| `ap-sQlLOLVhhURpmPvgWtkroJ` | proxy-test | $0.0000 |
| `ap-yfA4v4eRCaTo9z0JHAfzu3` | proxy-test3 | $0.0000 |

- **Prod app total**: $97.92
- **Non-prod total** (dev/bench/test): $5.3984
- **Grand total**: $103.32

## Prod app `ap-tWF8hmB2tAxyNlT6yzU9SD` — daily Modal vs Supabase-tracked

| Date | Modal billing | Supabase tracked | Gap | Tracked % | Completed jobs | w_cost / missing |
|---|---:|---:|---:|---:|---:|---:|
| 2026-03-21 | $0.5045 | $0.0000 | $0.5045 | 0.0% | 0 (failed 0) | 0 / 0 |
| 2026-03-22 | $0.0493 | $0.0000 | $0.0493 | 0.0% | 0 (failed 0) | 0 / 0 |
| 2026-03-26 | $0.4861 | $0.0000 | $0.4861 | 0.0% | 0 (failed 0) | 0 / 0 |
| 2026-03-27 | $3.0230 | $0.0000 | $3.0230 | 0.0% | 0 (failed 0) | 0 / 0 |
| 2026-03-30 | $3.5137 | $0.0000 | $3.5137 | 0.0% | 0 (failed 0) | 0 / 0 |
| 2026-03-31 | $0.4621 | $0.0000 | $0.4621 | 0.0% | 0 (failed 0) | 0 / 0 |
| 2026-04-08 | $26.79 | $0.0000 | $26.79 | 0.0% | 0 (failed 0) | 0 / 0 |
| 2026-04-09 | $34.19 | $0.0000 | $34.19 | 0.0% | 0 (failed 0) | 0 / 0 |
| 2026-04-10 | $7.8927 | $0.0000 | $7.8927 | 0.0% | 0 (failed 0) | 0 / 0 |
| 2026-04-11 | $4.2885 | $0.0000 | $4.2885 | 0.0% | 0 (failed 0) | 0 / 0 |
| 2026-04-13 | $0.1906 | $0.0000 | $0.1906 | 0.0% | 0 (failed 0) | 0 / 0 |
| 2026-04-14 | $0.5308 | $0.0000 | $0.5308 | 0.0% | 0 (failed 0) | 0 / 0 |
| 2026-04-15 | $3.4741 | $0.0000 | $3.4741 | 0.0% | 0 (failed 0) | 0 / 0 |
| 2026-04-16 | $6.2664 | $0.0000 | $6.2664 | 0.0% | 0 (failed 0) | 0 / 0 |
| 2026-04-17 | $0.7503 | $0.0000 | $0.7503 | 0.0% | 0 (failed 0) | 0 / 0 |
| 2026-04-18 | $3.6521 | $0.0000 | $3.6521 | 0.0% | 7 (failed 0) | 0 / 7 |
| 2026-04-19 | $1.8548 | $0.0000 | $1.8548 | 0.0% | 12 (failed 0) | 0 / 12 |
| **TOTAL** | **$97.92** | **$0.0000** | **$97.92** | **0.0%** | 19 | |

## Facts established

- Modal prod spend over 17 days: **$97.92**
- Supabase-tracked spend over same days: **$0.0000**
- Gap: **$97.92** = 0.0% tracked, **100.0% untracked**

## NOT established (would require instrumentation)

- What fraction of the gap comes from CPU functions (`download_audio`, `url_info`)
- What fraction comes from cron jobs (`yt_synthetic_probe`, `sweep_stale_jobs`)
- What fraction comes from container boot / image pull before `_CONTAINER_BOOT_T`
- What fraction comes from failed/retried jobs not in Supabase

To attribute: add `tags={"function": ..., "gpu": ...}` to `@app.function()` decorators, redeploy, wait ≥ 24h, then rerun `modal billing report --tag-names function,gpu`.
