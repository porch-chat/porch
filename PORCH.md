# Porch

Porch is a public, upstream-first distribution of
[Fluxer](https://github.com/fluxerapp/fluxer) operated as a small, private,
invite-only communication service.

The project intentionally retains Fluxer's interface, architecture, and
upstream behavior. Porch-specific work is limited to branding, packaging,
deployment policy, controlled update channels, and narrowly documented product
gaps.

## Release model

- `main` is the stable Porch source line.
- `canary` is the candidate integration line.
- Porch Stable defaults to `https://app.porch.chat`.
- Porch Canary defaults to `https://canary.porch.chat`.
- Both clients use one production backend, account system, and data universe.
- `https://porch.chat` is the public landing, download, status, and source
  entry point.

The exact upstream base is recorded in `.porch/upstream-lock.json`. Every
downstream source modification is recorded in
`.porch/downstream-patches.json`.

## License and source

This fork remains licensed under AGPL-3.0-or-later. The root `LICENSE` and
upstream notices are authoritative. Porch publishes the corresponding source
revision for every hosted release and retains required third-party notices.

Porch branding and separately supplied brand assets may have additional
trademark or asset-use terms; those terms do not replace the software license.

## Upstream relationship

Fluxer is a read-only source of upstream releases. Porch may fetch and integrate
those releases, but Porch changes are not contributed back: no Porch pull
requests, issues, discussions, comments, branches, tags, or pushes go to
Fluxer. Keeping Git ancestry and the `upstream` remote exists only to make
auditable update intake practical.
