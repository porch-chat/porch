# Porch Hub automatic enrollment

Porch can enroll every eligible account into one ordinary community after the
account becomes active. This is separate from account registration links,
community invites, and Fluxer's single-community mode.

## Configure the Hub

1. Create the community in Porch and arrange its channels, roles, and
   permissions normally.
2. Open a channel in that community. The first numeric segment after
   `/channels/` in the browser address is the community ID.
3. Open the Porch admin panel, go to **Instance configuration** →
   **Community & Policy** → **Porch Hub**, and paste that ID.
4. Set **Automatic Hub enrollment** to **Enabled** and save.

Saving an enabled Hub validates that the community exists and immediately
backfills eligible existing accounts. The **Retry Hub backfill** button can be
used later; it is safe to run repeatedly and reports enrollment totals.

The deployment defaults to disabled with no community ID. Stable and Canary
share this setting because they use the same production backend.

## Behavior

- New open- or invite-only registrations join after account creation.
- Approval-mode registrations do not join while pending; approval enrolls them.
- Existing eligible accounts join when the Hub is first enabled or changed.
- A transient enrollment failure never blocks signup or login. Login and a
  manual backfill retry until enrollment succeeds.
- Bots, system accounts, rejected or pending registrations, accounts pending
  deletion, and actively temporary-banned accounts are excluded.
- Hub enrollment uses an administrative membership source, not an invite, and
  does not consume or create registration links.

After a successful enrollment, Porch records a per-Hub marker on the account.
That marker makes the initial enrollment exactly-once: a member may leave the
Hub later and will not be forced back in on the next login. Changing to a
different Hub ID creates a new enrollment target and enrolls eligible accounts
there once.

Disabling the feature stops new enrollment but keeps the markers. Re-enabling
the same Hub therefore respects previous voluntary departures.
