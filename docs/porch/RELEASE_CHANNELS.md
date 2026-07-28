# Porch release channels

## Contract

Porch ships two independently installable clients over one production backend.

| Concern | Stable | Canary |
| --- | --- | --- |
| Web origin | `https://app.porch.chat` | `https://canary.porch.chat` |
| Desktop identity | Porch | Porch Canary |
| Update feed | Stable-only | Canary-only |
| Rollout | Promoted immutable artifacts | Candidate artifacts first |
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
3. Build immutable backend images and client artifacts.
4. Test the Canary client against the shared backend and current Stable client.
5. Soak the candidate.
6. Promote the exact tested client artifact digest to Stable.
7. Record the deployed backend and both client revisions.

Stable must never consume the Canary update feed, and promotion must not rebuild
from a moving branch.

## Public hostnames

- `porch.chat`: landing page, downloads, status links, documentation, and
  corresponding-source disclosure.
- `app.porch.chat`: Stable web client.
- `canary.porch.chat`: Canary web client.
- `fluxer.porch.chat`: temporary evaluation hostname; retire or redirect after
  Canary migration.
