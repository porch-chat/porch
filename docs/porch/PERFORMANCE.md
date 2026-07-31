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
  caches after Porch release, Electron, Chromium, V8, or installed-executable
  changes.
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

## 2026-07-30 — native capture control-state regression

### Finding

While benchmarking the Elgato capture-card path, changing the stream-preview
setting caused both active-share control surfaces to revert to their
“Share your screen” state. Native publishing and streaming priority remained
active until voice was disconnected. The setting itself did not restart or stop
capture; its rerender exposed that the controls trusted only a participant
snapshot while Porch's local voice state still correctly reported an active
share.

The same convergence window can apply to native camera state, so the fix covers
both local video sources.

### Implemented and validated

- Merge Porch's observable local camera/share state with the participant
  snapshot when deriving both voice control surfaces. Either active signal keeps
  the corresponding stop/configure control available.
- Add a focused state-merge regression suite and retain the existing voice
  control-bar and connection-status state-machine suites.
- Re-test capture-card sharing while toggling the preview preference before
  considering the Canary candidate releasable.

## 2026-07-30 — stable Chromium runtime-cache identity

### Finding

The first packaged performance candidate still purged `Code Cache`, `GPUCache`,
and Dawn caches on every launch. Electron's patched filesystem exposes
`app.asar` as a virtual directory. The prior guard fingerprinted that virtual
directory, whose reported timestamp changed as bundle entries were accessed,
making every ordinary launch look like a new application bundle.

### Implemented and validation

- Base cache compatibility on the Porch release, Electron/Chromium/Node/V8
  versions, and the real installed executable fingerprint.
- Stop fingerprinting virtual `app.asar` directory metadata. Porch's immutable
  timestamp version changes for every packaged release, while runtime and
  executable changes remain independently represented.
- Add focused tests proving identical launches retain one key and release,
  runtime, or executable changes produce a different key.
- Validate a packaged build across at least three consecutive launches: the
  first launch may migrate the old key once, while later launches must not log
  cache removal.

## 2026-07-30 — immutable content-addressed asset caching

### Finding

Rspack emits Porch assets with content-hash-only names such as
`45b608b46e7c16c9.png` and `b4a58ac1ef27c03a.js`. The app proxy's hashed-asset
detector recognized only `name.<hash>.ext` and `name-<hash>.ext`, so these
immutable payloads were served with `max-age=3600, must-revalidate` instead of
the intended one-year immutable policy.

The 1.46 MB default emoji atlas made the impact especially visible. It is
correctly deferred until the emoji picker opens rather than blocking startup,
and lossless WebP saved less than five percent, so Porch retains the upstream
PNG sprite contract. The cache policy—not a risky binary-format fork—was the
appropriate fix.

### Implemented and validation

- Recognize a filename stem made entirely of at least eight hexadecimal
  characters as content-addressed in addition to the existing suffix formats.
- Keep short hexadecimal and ordinary unversioned asset names on the
  one-hour revalidation policy.
- Add regression coverage for hash-only, dotted, hyphenated, short-hex, and
  unversioned filenames.
- Verify deployed hash-only JS, CSS, image, and WASM assets return
  `public, max-age=31536000, immutable`, while mutable metadata and application
  entry points retain their existing revalidation/no-store policies.

## 2026-07-31 — resize responsiveness and bounded diagnostics uploads

### Scope and baseline

- Porch Canary Desktop `2026.731.33820` on Windows 11
- Window resizing and Windows snap transitions while authenticated and idle
- Fresh idle process tree with hardware acceleration enabled
- Voice-debug upload failure behavior with DevTools open
- OpenAsar, Vencord, Vesktop, and Electron performance guidance review

A fresh idle client used approximately 546–562 MB of private memory across the
Electron process tree. The previously observed 6 GB state was not a normal idle
baseline: docked DevTools retained a new failed voice-debug upload error object
every two seconds while the client requeued the same diagnostics batch forever.

### Findings

1. Window state installed resize, focus, blur, and visibility listeners when its
   singleton was constructed, while the application root installed a second
   authoritative listener set for the same events.
2. Every resize event replaced the observable window-size object and emitted a
   debug log, including duplicate or same-dimension notifications.
3. The desktop guild channel view unconditionally read the observable window
   size even though it only needed the value for a mobile PWA portrait layout.
   Because the view is a MobX observer, this subscribed the full desktop
   channel/voice subtree to every pixel of a live resize.
4. Member-list fit checks used two raw resize subscriptions even though their
   result changes only when the viewport crosses the 1024 px breakpoint.
5. Failed voice-debug uploads requeued the same batch and logged a fresh error
   object at the two-second upload interval with no backoff. This remained
   bounded without DevTools, but DevTools console retention could amplify it
   into multi-gigabyte renderer memory use.
6. OpenAsar's aggressive Chromium switches are not safe defaults for Porch.
   Forcing GPU blocklists, overlays, and high-performance adapters can trade a
   local benchmark win for rendering faults, power use, or instability.
   Vencord's broadly applicable lesson is to avoid eager work; Porch already
   lazy-loads route pages, syntax highlighting, settings, and other large
   feature modules. Vesktop globally disables background throttling, whereas
   Porch intentionally bypasses it only for an active call or stream.
7. The catch-all Rspack vendor cache group combined dependencies from initial
   and asynchronous chunks under one fixed name. That promoted lazy-only
   dependencies into the startup HTML. The eSpeak fallback alone became a
   4.05 MB minified initial script; CodeMirror was also parsed before any
   editor was opened.
8. The voice call UI mounted a stats forwarder that collected a full diagnostics
   snapshot and rendered it through `react-dom/server` every two seconds in
   every call, even when no diagnostics popout existed. Besides periodic call
   jank, this promoted both React server-renderer builds into startup.

### Implemented

- Keep one root-owned window event listener set and remove singleton-owned
  duplicates and resize-event debug logging.
- Coalesce observable window-size publication to one animation frame and avoid
  replacing the observable value when dimensions did not change.
- Prevent the desktop guild channel/call view from observing window size; the
  mobile PWA portrait branch still subscribes when it is actually active.
- Replace member-list raw resize handlers with a media-query breakpoint change
  subscription.
- Add bounded exponential voice-debug upload backoff up to one minute, retain
  batches only for retryable network/server failures, discard permanently
  rejected client-error payloads, and log only the first or changed failure
  state without retaining raw error objects.
- Restrict shared package extraction to chunks that can actually be initial.
  Feature-specific lazy chunks may reuse dependencies already needed at
  startup, but a lazy-only dependency can no longer turn a named shared chunk
  into an initial asset. In a production build this removed eSpeak, CodeMirror,
  and `react-dom/server` from startup and reduced the reported main entrypoint
  from 14.346 MiB to 11.264 MiB (3.082 MiB, or 21.5%).
- Collect and server-render voice debug stats only while the browser or desktop
  diagnostics popout is open. Opening the popout captures an on-demand initial
  snapshot; a lightweight open-state check enables live two-second updates and
  disables them again after close.

### Validation matrix

- Targeted resize-state and voice-debug retry-policy tests
- Rspack vendor-chunk policy regression test and production entrypoint audit
- Voice-debug stats dormancy/open-state regression tests and desktop IPC typecheck
- App TypeScript check, scoped Biome check, production app build, and
  `git diff --check`
- Canary live resize and navigation checks while idle, in voice, with camera,
  with display sharing, and with capture-card sharing
- Hardware acceleration enabled and disabled, including CPU, memory, frame
  cadence, media stats, and cleanup after each workload

### Canary acceptance results

- Canary app-proxy version `2026.731.135319` passed the complete public live
  verification and smoke suites. Its initial route fell from 4,052,918 to
  2,880,079 compressed bytes (3.87 to 2.75 MiB), a 28.9% transfer reduction.
- With hardware acceleration enabled, fresh idle measured 527 MB private and
  625 MB working set. Voice measured 591/693 MB and 20% of one logical core;
  live Elgato video measured 802/909 MB and 28%; a 3840x2160/60 Elgato share
  measured 1,533/1,574 MB and 67%. Resizing and navigating during that share
  measured 118% of one core. The intentionally recursive whole-display share
  was the heaviest workload at 186% of one core.
- With hardware acceleration disabled, fresh idle measured 326 MB private and
  704 MB working set. Voice measured 376/786 MB and 16% of one logical core;
  live Elgato video measured 545/974 MB and 24%; the same 3840x2160/60 share
  measured 1,083/1,594 MB and 57%. Lower private allocation did not make this
  mode faster: live-video resize increased from 63% to 92% of one core,
  capture-share resize increased from 118% to 130%, and recursive display
  sharing increased from 186% to 245%.
- Camera, display, and capture-card controls remained responsive through snap
  resizing and navigation in both modes. Elgato capture used the exact
  3840x2160 source format at up to 60 FPS and retained its aspect ratio. The
  physical Anker camera remained unavailable to Chromium on this host, while
  the Elgato path supplied live frames; that is a device/privacy-path result,
  not a Porch rendering failure.
- Ending the hardware-accelerated media call released roughly 626 MB after the
  first stress cycle. A fresh repeated 4K60 call/share cycle settled to 700 MB
  private after teardown, below the earlier 837 MB reading. The evidence is
  consistent with bounded reusable Chromium/GPU frame pools rather than an
  unbounded per-call leak. Hardware acceleration remains enabled by default;
  disabling it remains a compatibility fallback.
- The isolated local-account matrix does not validate a remote receiver's
  decode quality or network adaptation. That requires a separately authorized
  second client and remains explicit future acceptance work.
- Desktop workflow `30636088425` produced Windows Canary
  `2026.731.135052`. The prior installed Canary discovered the update, reported
  download progress, applied the exact published package, restarted at the new
  file version, and exposed the new diagnostics-popout bridge. DevTools was
  closed after this acceptance check.

## 2026-07-31 — two-device receiver and ingress audit

### Current evidence

- A fresh warm Canary restart settled around 470–490 MB private memory and
  799–819 MB working set. The earlier post-media idle process tree was about
  789 MB private and 932 MB working set, confirming that Chromium retains
  bounded reusable media pools but not reproducing the prior 6 GB DevTools
  amplification.
- A real two-device voice call between the isolated `Dylan` and `test_account`
  accounts measured about 563–573 MB private and 904–916 MB working set on the
  local client. Sampled process-tree CPU averaged roughly 34% of one logical
  core, with individual one-second samples from 23% to 60%.
- Watching one remote display share reproduced a temporary `-2303`
  first-frame timeout. The same stream later rendered successfully without a
  restart, proving that publication and attachment worked and that the failure
  deadline—not the media path—was premature.
- The watch graph now retains the 15-second missing-publication and attachment
  limits, but grants a successfully attached screen share a fresh 30-second
  first-frame window. Early callbacks from a superseded deadline are ignored.
- During the transient shared connection-loss incident, the production API
  answered its internal `/.well-known/fluxer` probe every minute in 1–7 ms,
  the OVH host remained lightly loaded with ample memory, and Cloudflare's
  authoritative DNS analytics showed only `NOERROR`. A subsequent public probe
  timed out once before ten consecutive requests completed in 94–153 ms. The
  evidence rules out an API-process crash and authoritative-DNS outage, but is
  not sufficient to distinguish the shared client network, recursive DNS/TLS,
  or the public OVH ingress path.

### Acceptance results

- Porch source `0983af5bc71269da11955fef885ec13c8b54c94e` shipped as
  app-proxy version `2026.731.155010` at immutable digest
  `sha256:50ff08e9ecf108649f399a3f8963b6dc63741b77d7e9de251a8173b78cd2901e`.
  The complete production verification suite passed after recreating only the
  app proxy.
- A fresh two-device 3840x2160/60 Elgato capture-card receive test crossed the
  old 15-second cutoff and remained live beyond 38 seconds without `-2303`.
  Repeating the receiver case with sender hardware acceleration disabled also
  rendered live content beyond the old cutoff. Publication, attachment,
  first-frame delivery, and teardown all completed normally.
- With acceleration enabled, the two-device 4K60 capture-card case measured
  1,649.8 MB private, 1,847.0 MB working set, 4,305 handles, and 51.9% of one
  logical core across six local Porch processes. With acceleration disabled,
  the same case measured 1,265.7 MB private, 1,943.0 MB working set, 3,804
  handles, and 63.3% of one logical core. Software rendering therefore used
  about 22% more sender CPU and remains a compatibility fallback rather than
  the default.
- A final accelerated two-device camera publish from the Elgato rendered on
  the receiver and measured 798.1 MB private, 1,071.8 MB working set, 3,923
  handles, and 49.2% of one logical core. Stopping video removed the received
  frames and restored the avatar tile without leaving a stale preview.
- A final whole-display publish rendered recursively on the receiver, stayed
  live beyond the initial watch period, and measured 1,068.4 MB private,
  1,336.2 MB working set, 4,069 handles, and 233.8% of one logical core. This
  intentionally recursive workload remains the worst case. Stopping the share
  removed the remote frames immediately.
- Hardware-accelerated maximize/restore settled by the next visual sample.
  Software rendering showed a visible old/new-layout split during the first
  sampled frame and settled by roughly 1.5 seconds. The samples support
  keeping hardware acceleration enabled, while the frame timing is an
  observational bound rather than a browser trace.
- A hardened one-minute public ingress probe now runs on OVH for API, Stable,
  and Canary discovery. It journals resolved address, TLS verification, HTTP
  status, and DNS/connect/TLS/first-byte/total timing, and returns failure for
  curl, TLS, or non-200 results without stopping the timer. Initial and
  recurring production runs were healthy.
- Both authorized test accounts were disconnected, all camera and share tracks
  were stopped, and the local Canary client was restarted with hardware
  acceleration restored after the matrix.

### Next performance work

- Use the new public probe alongside internal API health the next time a shared
  connection loss occurs. The current evidence narrows the earlier incident
  but does not justify assigning an exact cause retroactively.
- Treat recursive display sharing and software-rendered resize as known heavy
  paths. Further changes should be driven by a repeatable browser/GPU trace or
  a user-visible regression rather than speculative Chromium switches.
