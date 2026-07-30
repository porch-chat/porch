# Porch Actions policy

Porch is a detached downstream distribution. Its GitHub Actions may build and
validate `porch-chat/porch`, publish Porch-owned GHCR images, and package Porch
desktop clients. They must not authenticate to, dispatch, mutate, deploy, or
moderate Fluxer-owned repositories, organizations, infrastructure, or storage.

## Supported automation

- **Build Porch API** publishes the shared API/worker image from `canary`.
- **Build Porch admin** publishes the downstream administration UI from
  `canary`.
- **Build Porch app proxy** publishes the web client image from `canary`.
- **Build Porch static assets** publishes Porch-owned static files from
  `canary`.
- **Build Porch desktop** keeps Stable and Canary desktop identities separate.
- Image-only builds retain their release fragment as a short-lived workflow
  artifact and do not create draft GitHub releases. A release is created only
  when a workflow explicitly finalises one.
- **Check Fluxer upstream intake** runs daily and on demand with read-only
  repository permissions. It fails visibly when Fluxer's `main` moves beyond
  the exact commit recorded in `.porch/upstream-lock.json`.
- Pull-request validation checks source, tests, OpenAPI drift, and conventional
  titles.
- **Validate Porch automation isolation** rejects known upstream credentials,
  destinations, privileged pull-request triggers, and obsolete deployment
  integrations.

Production remains digest-pinned and is deployed from the private
`porch-chat/porch-deploy` operations repository. A successful image build does
not deploy or mutate the live service.

## Retired upstream automation

The downstream fork intentionally removes Fluxer Dart SDK dispatch, Fluxer
GitHub App workflows, Weblate/i18n pull-request automation, upstream moderation
bots, Fluxer Kubernetes deployment, Vultr static-bucket maintenance, and the
upstream all-services release orchestrator.

These workflows either require credentials Porch does not own or target
systems outside Porch's deployment model. They must not be restored during an
upstream merge. If Porch later needs equivalent functionality, it should be
implemented as a Porch-specific workflow with Porch-owned destinations and
least-privilege credentials.
