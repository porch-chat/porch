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

## Public hostnames

- `porch.chat`: landing page, downloads, status links, documentation, and
  corresponding-source disclosure.
- `app.porch.chat`: Stable web client.
- `canary.porch.chat`: Canary web client.
- `releases.porch.chat`: isolated Stable and Canary desktop feeds.

The temporary `fluxer.porch.chat` evaluation hostname is retired.
