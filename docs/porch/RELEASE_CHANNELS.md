# Porch release channels

## Contract

Porch ships two independently installable clients over one production backend.

| Concern | Stable | Canary |
| --- | --- | --- |
| Web origin | `https://app.porch.chat` | `https://canary.porch.chat` |
| Desktop identity | Porch | Porch Canary |
| Update feed | Stable-only | Canary-only |
| Rollout | Stable-channel build from accepted revision | Candidate build first |
| Accounts and data | Shared Porch production backend | Shared Porch production backend |

The channels must use distinct application, installer, protocol, and updater
identifiers where the platform requires them. They may use the same trusted
publisher certificate.

## Compatibility rule

A Canary client may advance ahead of Stable only while it remains compatible
with the deployed backend and current Stable client behavior. A backend
candidate that needs a destructive or incompatible migration is validated on a
temporary isolated rehearsal stack before the single production backend is
updated.

The Canary client is not permission to run schema experiments against
production data.

## Promotion

1. Resolve and record the upstream commit.
2. Apply the declared Porch patch manifest.
3. Build immutable backend images and a Canary client from that exact revision.
4. Test the Canary client against the shared backend and current Stable client.
5. Soak the candidate and record its source revision and acceptance evidence.
6. Build the Stable identity from that same immutable source revision, using
   only the declared Stable channel parameters, then repeat install/update and
   smoke acceptance before publishing it.
7. Record the deployed backend, source revision, channel-specific artifact
   digests, and both client revisions.

The Stable and Canary packages cannot be byte-for-byte identical because their
application, installer, protocol, storage, notification, and updater identities
must differ for side-by-side installation. Promotion therefore means rebuilding
the Stable identity from the accepted immutable source revision—not copying a
Canary package and not rebuilding from a moving branch. Stable must never
consume the Canary update feed.

Every platform artifact within one channel build must consume the same version,
publication timestamp, and source SHA generated before the operating-system
matrix fans out. Runner start times are not release versions.

## Read-only upstream intake

Run `pnpm porch:upstream:configure` after cloning and
`pnpm porch:upstream:check` before intake work. The canonical Fluxer URL remains
available for fetches, while the configured push URL uses an intentionally
unsupported protocol. Porch never pushes branches or tags, opens pull requests,
or otherwise writes to Fluxer.

GitHub Actions also runs `pnpm porch:upstream:intake` every day and on demand.
The check only reads Fluxer's public `main` reference and compares it with
`.porch/upstream-lock.json`; it never opens a pull request, changes the lock, or
writes to the upstream repository. A moved upstream head makes the workflow
fail so intake remains an explicit reviewed operation.

### 2026-08-01 reviewed intake

Porch reviewed and integrated Fluxer commits `21a898e6..fe3f1b25` as one
ancestry-preserving merge. The five commits contain presence visibility and
relationship invariant fixes, reliable batched-message-delete audit logs,
removal of hosted-only Flutter authentication gates, Flatpak updater support,
and a marketing download-page redesign.

The merge had five overlapping Porch files and no textual conflicts. Semantic
review preserved Porch Hub login reconciliation, standalone registration-link
behavior, desktop version formatting, and Porch-owned update destinations. The
new managed-package action uses the desktop runtime's Flatpak app ID instead of
upstream hard-coded Fluxer package IDs, with `https://porch.chat/download` as a
safe fallback.

Because this intake changes gateway presence behavior, Porch also added a
Canary-triggered, Porch-owned gateway image workflow. It publishes only image
artifacts and moving candidate tags; production continues to deploy an
explicit immutable digest from the private operations repository.

### 2026-08-09 reviewed intake

Porch reviewed and integrated Fluxer commits `fe3f1b25..873c203b` as one
ancestry-preserving merge. The three commits make rich-embed descriptions
optional in the request schema and generated OpenAPI document, fix filtering
of `@everyone` and `@here` autocomplete suggestions when the typed query omits
the leading `@`, and update Fluxer's marketing-site TestFlight copy.

Only the generated OpenAPI document overlapped a recorded Porch downstream
path, and it merged without a textual conflict. Semantic review retained
Porch's registration and member-invite API additions. The marketing change is
not deployed because Porch uses the separate `porch-site` project.

### 2026-08-11 reviewed intake

Porch reviewed and integrated Fluxer commits `873c203b..03e6062e` as one
ancestry-preserving merge. The eleven commits make Windows game capture part
of the normal desktop package, add stalled-capture recovery and stale Vulkan
registration cleanup, repair shortcut handling, replace the upstream desktop
signing/release pipeline, remove app-proxy Canary time freezing, fix emoji
sprite alignment across browser zoom levels, and restore mobile channel-list
scrolling. Two final favicon changes affect only Fluxer's marketing site.

Seven textual conflicts were confined to intentionally downstream-owned
automation, desktop identity/update routing, and public download code. Porch
kept the inherited deployment workflow deleted, retained Porch Stable/Canary
package identities and Porch-owned update feeds, and retained the documented
unsigned-distribution policy. The retired separate game-capture build variant
was not carried forward because upstream now bundles the capture module in the
normal Windows client. The simplified upstream download API was retained with
Porch product names and API defaults.

The first post-merge Canary artifact run exposed one additional policy seam:
upstream Velopack packaging now unconditionally requires Azure Trusted Signing
metadata, while Porch intentionally distributes unsigned desktop builds. Porch
therefore keeps the upstream signed path intact but supplies an explicit
`PORCH_UNSIGNED_DESKTOP_BUILD` path that omits only Velopack's Trusted Signing
argument. A focused CI-helper regression test requires unsigned commands to
omit the argument and signed commands to retain it.

### 2026-08-12 reviewed intake

Porch reviewed and integrated Fluxer commits `03e6062e..10fc79ab` as one
ancestry-preserving merge. The five commits bundle the complete Fluxer font
family into application images, teach the admin and app-proxy images to serve
those fonts, remove Fluxer's retired Canary Testers guild integration, clean
repository metadata, and remove infrastructure-dependent integration suites.

Porch retained its isolated workflow set and downstream contributor guidance,
its member-facing invite-only registration copy, compiled localization checks,
and its authenticated-runtime startup split. The obsolete Canary Testers API
and UI were removed with upstream. The new app build now clears `dist` through
Node's cross-platform filesystem API so the upstream stale-output protection
also works in Porch's Windows desktop build matrix. The font loader remains in
the public bootstrap, while native voice initialization remains deferred until
the authenticated runtime to preserve the existing logged-out performance
boundary.

### 2026-08-13 reviewed intake

Porch reviewed and integrated Fluxer commits `10fc79ab..0c291a01` as one
ancestry-preserving merge. The three commits enforce attachment-upload
provenance before messages can persist uploaded files, force SVG and PDF media
responses to download instead of rendering inline, and reject malformed AVIF
tracks whose media or movie timescale is zero.

The focused API and media-proxy changes did not overlap any Porch downstream
source patch and merged without textual conflicts. Production intake requires
new immutable API/worker and media-proxy images only; the web clients, admin,
static assets, gateway, databases, and desktop release feeds remain unchanged.

### 2026-08-16 reviewed intake

Porch reviewed and integrated Fluxer commits `0c291a01..e054aa96` as one
ancestry-preserving merge. This 95-commit release train updates application
rendering, composer slowmode, search and settings behavior, reduced-motion and
splash handling, API registration and activity tracking, gateway push payloads,
media-proxy request coalescing, unfurl parsing, self-hosting discovery and CSP
configuration, and the desktop runtime to Electron 43.4.0. It also extracts the
upstream marketing site into a separate submodule and regenerates localization
catalogs.

Eleven textual conflicts were confined to Porch-owned automation, two client
performance seams, the desktop build helper, and upstream's rewritten release
helper. Porch retained GitHub-hosted runners, Porch-owned image credentials,
non-finalizing image builds, and the complete ban on external Fluxer automation;
the new private-marketing dispatcher is intentionally absent. Upstream's newer
window-layout invalidation and titlebar implementations supersede the older
overlapping Porch code, while Porch's Stable and Canary desktop identities are
preserved alongside upstream's universal macOS build support.

Semantic review confirmed that Porch Hub enrollment remains independent from
Fluxer's optional restrictive single-community mode. Approval now safely honors
both systems when explicitly enabled, while Porch's member registration links
continue to create accounts without treating social invites as registration
links. Production intake requires rebuilt Porch API/worker, app-proxy, gateway,
admin, and affected client artifacts plus updated immutable upstream media-proxy
and unfurl images; deployment remains pinned by digest in the operations repo.

### 2026-08-22 reviewed intake

Porch reviewed and integrated Fluxer commits `e054aa96..137edc7c` as one
ancestry-preserving merge. This 118-commit train adds the new application-shell
and navigation performance work, reduces renderer CPU and WASM memory pressure,
improves gateway connection latency, fixes screen-share audio defaults and
publication handling, introduces the standalone hardware-encoder capability
path, adds deferred phone-gate and registration administration changes, and
extends external media routing, downloads storage, billing, search, gateway,
and moderation behavior.

The largest architectural change removes Fluxer's native voice renderer and
native display-sender stack. Porch retired three downstream patches that only
protected that deleted path: native preview independence, Windows native
capture packaging, and serialized native subscription commands. Capture-card
and ultrawide behavior remains active on the replacement architecture: Porch
still carries source-aware dimensions, Source/480p/720p/1080p/1440p/4K quality,
60 FPS limits, aspect-ratio preservation, device-aware active controls, and
live quality replacement over Chromium capture plus the standalone hardware
encoder.

Semantic conflict review retained Porch Hub enrollment independently from
single-community mode, member-created account registration links, Porch-only
branding and public URLs, Stable/Canary browser handoff routing, the logged-out
runtime boundary, the five-second fresh-shell navigation policy, readable
desktop build versions, GitHub-hosted and release-free image workflows, and
Porch-owned unsigned desktop/update distribution. Upstream's removal of
self-host instance switching matches Porch's one-backend policy.

Focused validation covered app, desktop, API, and voice-engine typechecks;
public bootstrap isolation; service-worker recovery; registration, Porch Hub,
member invites, and deferred phone gating; updater behavior; and screen-share
resolution, source state, local controls, and debug-upload backoff. Production
intake requires new immutable images for every changed runtime service and new
Stable/Canary client artifacts before promotion.

The full Windows validation pass also exposed two upstream portability defects
before release. Porch now normalizes checkout newlines when checking generated
theme invariants and parses Hunspell dictionary search paths with the operating
system's native separator. The corrected desktop native suite passes all 220
unit and property tests on Windows.

Desktop artifact acceptance caught one further upstream packaging mismatch:
Velopack's generated assets manifest still named its removed generic Portable
ZIP after Porch staged the separately verified branded portable archive. The
Porch build helper now rewrites that entry to the exact staged filename and
fails if the manifest or portable inventory is missing or ambiguous, preventing
an atomic feed publication from introducing a broken download URL.

## Public hostnames

- `porch.chat`: landing page, downloads, status links, documentation, and
  corresponding-source disclosure.
- `app.porch.chat`: Stable web client.
- `canary.porch.chat`: Canary web client.
- `releases.porch.chat`: isolated Stable and Canary desktop feeds.

The temporary `fluxer.porch.chat` evaluation hostname is retired.
