# Porch desktop distribution

Porch Stable and Porch Canary are two independently installable desktop clients
over one Porch backend. The shared build-time contract is
`fluxer_desktop/porch-product.json`.

## Channel contract

| Property | Stable | Canary |
|---|---|---|
| Name | Porch | Porch Canary |
| Default origin | `https://app.porch.chat` | `https://canary.porch.chat` |
| Application ID | `chat.porch.desktop` | `chat.porch.desktop.canary` |
| Velopack ID | `porch_desktop` | `porch_desktop_canary` |
| Protocol | `porch:` | `porch-canary:` |
| User-data directory | `porch` | `porchcanary` |
| Windows AUMID | `Porch.Porch` | `Porch.Porch.Canary` |
| Update feed | `https://releases.porch.chat/desktop/stable/...` | `https://releases.porch.chat/desktop/canary/...` |

The different package, protocol, storage, notification, and application IDs are
intentional. Installing Canary never replaces Stable and neither channel reads
the other channel's update feed.

## Build

The active GitHub workflow is `.github/workflows/build-porch-desktop.yaml`.
It builds Windows x64 with upstream's existing Electron/native/Velopack build
steps, uploads an unsigned acceptance artifact to GitHub Actions, and has
read-only repository permissions. It does not publish to Fluxer storage,
webhooks, signing services, or repositories.

The original upstream desktop publisher is retained only as an inactive
reference under `.github/upstream-workflows/`.

Windows signing is a release gate, but is not claimed until Porch-owned
credentials are installed. The first unsigned Canary package is for local
acceptance only.

## Feed layout

Velopack artifacts are served without filename rewriting:

```text
desktop/
  canary/
    win32/
      x64/
        releases.win.json
        RELEASES
        *.nupkg
        *-Setup.exe
  stable/
    win32/
      x64/
        releases.win.json
        RELEASES
        *.nupkg
        *-Setup.exe
```

macOS and Linux use the same channel/platform/architecture boundary when those
artifacts are accepted. A feed directory is immutable except for its release
indexes. All payloads have SHA-256 sidecars.

## Promotion

1. Build from the recorded Porch source revision.
2. Publish the exact artifact to Canary.
3. Verify install, launch origin, protocol registration, update check,
   notifications, permissions, media, and uninstall.
4. Soak the candidate.
5. Copy the exact accepted artifact bytes and digest into Stable.
6. Generate Stable indexes over those same bytes. Do not rebuild.
7. Retain the prior Stable index and payload for rollback.

Promotion is a controlled copy, not a branch merge or moving-tag rebuild.
Downgrade protection remains Velopack's responsibility; rollback publishes a
newer package version containing the last accepted application bytes.

## Brand assets

The desktop packages use the existing Porch threshold/chat icon from the Porch
site and legacy desktop package. `scripts/generate-porch-icons.ps1` reproducibly
derives Windows/Electron sizes from that source SVG. Stable and Canary share the
same mark and are distinguished by their product names and OS identities.
