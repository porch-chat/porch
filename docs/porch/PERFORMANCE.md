# Porch performance record

This document is the append-only performance record for the Porch clients.
Each investigation records the workload, evidence, changes, validation, and
remaining work so later upstream intake does not erase the reasoning behind a
downstream optimization.

## 2026-07-30 — desktop and media baseline

### Scope

- Porch Canary Desktop `2026.730.70528` on Windows 11
- Ryzen 7 3700X, 16 logical processors, Intel Arc B580
- Stable app bundle `2026.730.82444`
- Idle, community navigation, voice, camera, display share, and Elgato 4K X
  capture-card share
- Hardware acceleration enabled and disabled
- OpenAsar and Vesktop implementation review

Measurements are process CPU percentages normalized to one logical core. Media
tests used an isolated voice channel with only the local test account. They
validate local capture, composition, and send-path behavior but are not a
substitute for a two-client network quality test.

### Findings

1. A profiling-only `force-renderer-accessibility` Chromium switch had been
   persisted in the Canary profile. Removing it reduced the browser process
   from roughly 27% to 11% of one core and reduced the primary renderer working
   set from roughly 368 MB to 205 MB while connected to voice. This switch is
   valid for screen-reader testing but must not remain enabled for ordinary
   performance runs.
2. The desktop cleared Chromium shader and V8 code caches before every app URL
   load, despite already having a version-aware runtime cache invalidator. This
   prevented warm starts from benefiting from compiled code and shader caches.
3. Auto spellcheck repeatedly attempted dictionary downloads even when a
   self-hosted desktop had no dictionary endpoint configured, then fell back to
   the operating-system spellchecker.
4. Twenty text/voice channel switches with acceleration enabled measured
   83 ms median, 106 ms mean, and 217 ms p95. The same workload with acceleration
   disabled measured 128 ms median, 146 ms mean, and 405 ms p95. Hardware
   acceleration should remain enabled by default.
5. Navigation created large short-lived DOM/listener populations. A 30-switch
   V8 profile mapped the largest downstream hot paths to Scroller resize and
   mutation observation, scroll-indicator measurement, voice-grid element
   sizing, and garbage collection. The populations fell after forced GC, so the
   primary issue was churn and pause time rather than a permanent listener leak.
6. The scroll-indicator overlay observed every descendant `class` and `style`
   mutation and synchronously remeasured layout for each callback. Scrollers
   also rescanned their direct children after every descendant mutation.
7. Hardware acceleration off increased true idle CPU from roughly 6% to 15% of
   one core and made navigation substantially slower. It remains a
   troubleshooting escape hatch, not a performance mode.
8. Display and capture-card tracks preserved the selected 1920×1080/60 source
   constraints. The Elgato 4K X also exposed 3840×2160, 3440×1440, 2560×1080,
   and other unusual formats without distortion.
9. A controlled moving-content benchmark at 1920×1080/60 measured about 32% of
   one core for hardware-aware Auto/AV1, 39% for H.264, and 56% for VP8 across
   the Browser, GPU, and primary renderer processes. Auto/AV1 was retained.
   An always-on-top diagnostics popout that continuously repainted inside the
   shared display produced a much higher feedback workload; it is not
   representative of normal sharing and should stay closed during benchmarks.

### Implemented in this slice

- Preserve Chromium code and shader caches on normal starts. The existing
  version-aware runtime invalidator remains responsible for purging incompatible
  caches after Electron, Chromium, V8, executable, or app-bundle changes.
- In automatic spellcheck mode, use an already cached Porch dictionary when
  present; otherwise select the Windows/macOS system spellchecker immediately
  when no dictionary download endpoint is configured.
- Restrict each Scroller's child-list observer to direct children, matching the
  actual child ResizeObserver set it maintains.
- Coalesce scroll-indicator measurement to one animation frame, ignore unrelated
  descendant class/style changes, and suppress React state updates when the
  visible indicator did not change.

### Research notes

OpenAsar's strongest applicable ideas are a small main-process startup graph,
preserved code caches, early visible-window milestones, and deferring
noncritical maintenance. Its global DOM-removal monkey patch and aggressive
Chromium flags are Discord-specific and were not copied. Vesktop likewise
demonstrates the value of a small wrapper, but its background timer and
occlusion overrides trade responsiveness for idle CPU and power; Porch will not
enable them without a measured active-call regression that justifies the cost.

### Validation and next work

- Run targeted app tests, app and desktop TypeScript checks, formatting, and
  `git diff --check`.
- Build and deploy Canary, then repeat two consecutive warm-start measurements
  and the identical 20-switch navigation benchmark.
- Validate message image growth, sticky-to-bottom behavior, member lists,
  pickers, settings, voice, camera, display sharing, and capture-card sharing
  against the optimized observer behavior.
- Add a second authenticated client to a future media lab run to measure remote
  decode, packet adaptation, and end-to-end quality under motion and network
  impairment.
