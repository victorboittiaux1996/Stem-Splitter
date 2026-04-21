# Modal cost baseline — facts only

Generated: 2026-04-21T09:09:35.650023+00:00
Billing window: **2026-03-21 → 2026-04-21** (21 days covered)

## Sources

1. **Modal billing** (`docs/modal-billing/*.json`, from `modal billing report --json`). Measured. Authoritative.
2. **Supabase `jobs.phase_timings.modal_cost`**. Estimated by the worker (wall+boot × H100 rate). Subset of completed jobs only.

## Per-app totals

| App ID | Description | Total |
|---|---|---|
| `ap-tWF8hmB2tAxyNlT6yzU9SD` | stem-splitter | $105.25 |
| `ap-XPNkMAeRxzzMVwNwqLw4SK` | stem-splitter-test | $2.0093 |
| `ap-8hPfej1zlJ5q2GOG5rmky0` | stem-splitter-bench | $0.9407 |
| `ap-Fdhdfusm6GXoRwda4k38hE` | stem-splitter-benchmark | $0.4112 |
| `ap-IqnzsiOmL3YuRdLYHn0bqY` | stem-splitter-prod-timed | $0.3893 |
| `ap-9taZCkzwJkaGmnPhjZP04b` | stem-splitter-gpu-test | $0.2898 |
| `ap-XV7hGag3vRz9T9UMw9vFwv` | stem-splitter-overlap-test | $0.2073 |
| `ap-5VRHO2BBdXf5KzWy51rAWk` | stem-splitter-staging | $0.2067 |
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

- **Prod app total**: $105.25
- **Non-prod total** (dev/bench/test): $5.6051
- **Grand total**: $110.86

## Prod app `ap-tWF8hmB2tAxyNlT6yzU9SD` — daily Modal vs Supabase-tracked (with GPU/idle split)

`GPU` = productive GPU time (wall × rate). `idle` = scaledown 30s per job × rate (container stays warm post-job, billed). `Total` = GPU + idle (the `modal_cost` self-report).

| Date | Modal billing | Tracked total | GPU only | Idle (30s) | Gap | Tracked % | Cold/Warm/Failed |
|---|---:|---:|---:|---:|---:|---:|---:|
| 2026-03-21 | $0.5045 | $0.0000 | $0.0000 | $0.0000 | $0.5045 | 0.0% | 0/0/0 |
| 2026-03-22 | $0.0493 | $0.0000 | $0.0000 | $0.0000 | $0.0493 | 0.0% | 0/0/0 |
| 2026-03-26 | $0.4861 | $0.0000 | $0.0000 | $0.0000 | $0.4861 | 0.0% | 0/0/0 |
| 2026-03-27 | $3.0230 | $0.0000 | $0.0000 | $0.0000 | $3.0230 | 0.0% | 0/0/0 |
| 2026-03-30 | $3.5137 | $0.0000 | $0.0000 | $0.0000 | $3.5137 | 0.0% | 0/0/0 |
| 2026-03-31 | $0.4621 | $0.0000 | $0.0000 | $0.0000 | $0.4621 | 0.0% | 0/0/0 |
| 2026-04-08 | $26.79 | $0.0000 | $0.0000 | $0.0000 | $26.79 | 0.0% | 0/0/0 |
| 2026-04-09 | $34.19 | $0.0000 | $0.0000 | $0.0000 | $34.19 | 0.0% | 0/0/0 |
| 2026-04-10 | $7.8927 | $0.0000 | $0.0000 | $0.0000 | $7.8927 | 0.0% | 0/0/0 |
| 2026-04-11 | $4.2885 | $0.0000 | $0.0000 | $0.0000 | $4.2885 | 0.0% | 0/0/0 |
| 2026-04-13 | $0.1906 | $0.0000 | $0.0000 | $0.0000 | $0.1906 | 0.0% | 0/0/0 |
| 2026-04-14 | $0.5308 | $0.0000 | $0.0000 | $0.0000 | $0.5308 | 0.0% | 0/0/0 |
| 2026-04-15 | $3.4741 | $0.0000 | $0.0000 | $0.0000 | $3.4741 | 0.0% | 0/0/0 |
| 2026-04-16 | $6.2664 | $0.0000 | $0.0000 | $0.0000 | $6.2664 | 0.0% | 0/0/0 |
| 2026-04-17 | $0.7503 | $0.0000 | $0.0000 | $0.0000 | $0.7503 | 0.0% | 0/0/0 |
| 2026-04-18 | $3.6521 | $0.0000 | $0.0000 | $0.0000 | $3.6521 | 0.0% | 3/4/0 |
| 2026-04-19 | $5.9389 | $0.5081 | $0.0000 | $0.0000 | $5.4308 | 8.6% | 11/6/0 |
| 2026-04-20 | $3.2447 | $1.4957 | $1.1541 | $0.3416 | $1.7490 | 46.1% | 8/3/0 |
| 2026-04-21 | $0.0023 | $0.0000 | $0.0000 | $0.0000 | $0.0023 | 0.0% | 0/0/0 |
| **TOTAL** | **$105.25** | **$2.0038** | **$1.1541** | **$0.3416** | **$103.25** | **1.9%** | **22/13/?** (35) |

**Idle cost share**: 17.0% of tracked ($0.3416 paid for scaledown 30s after each job).
**Cold/warm ratio**: 22 cold (63%) vs 13 warm (37%). High cold % = user jobs arrive in isolation (container scales to 0 between users).

## Facts established

- Modal prod spend over 19 days: **$105.25**
- Supabase-tracked spend over same days: **$2.0038**
- Gap: **$103.25** = 1.9% tracked, **98.1% untracked**

## Open gaps (will close after 48h of post-deploy traffic)

- Per-function attribution: Modal SDK v1.3.5 only supports tags at app-level. `env` and `version` tags are live (deploy `3b35c06-dirty`). Per-function cost breakdown available via Modal dashboard (Functions view) or indirectly via Supabase `phase_timings` (GPU jobs only).
- CPU function share (`download_audio`, `url_info`): not attributed per-job. Can estimate = Modal prod total − (GPU jobs Supabase-tracked × factor).
- Cron `yt_synthetic_probe` annualized cost: 24 runs/day × CPU rate ≈ $0.8/month. Visible in Modal dashboard under Functions tab.
- Failed / retried jobs not in Supabase `jobs` table: contribute to the gap.
- Container boot / image pull before `_CONTAINER_BOOT_T` (included in billing but not self-report for pre-2026-04-20 jobs — fixed in commit `7f6365f`).

**Next recompute**: wait 48h of traffic with `env=prod version=<sha>` tags active, then rerun this script. The gap % should drop significantly as more jobs ship with `modal_cost_gpu + modal_cost_idle` populated.
