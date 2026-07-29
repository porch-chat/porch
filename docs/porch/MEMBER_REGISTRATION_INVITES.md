# Member registration invites

Porch keeps account registration separate from community and group membership.

## Product behavior

- Community and group-DM invite links only join an existing account.
- A community or group-DM invite does not bypass closed registration.
- Signed-in members can create a standalone account registration link from the
  server rail or from **User settings → Invites**.
- Each member registration link:
  - creates a Porch account only;
  - works once;
  - expires after seven days;
  - can be revoked by the member who created it;
  - never auto-joins a community, group DM, or instance default community.
- A member has at most one active registration link. Creating while one is
  active returns the existing link.
- Members can create at most five links in a rolling 24-hour rate-limit window.

## API

- `GET /users/@me/registration-invites`
- `POST /users/@me/registration-invites`
- `DELETE /users/@me/registration-invites/:registration_invite_id`

The member endpoints require a signed-in default user. Member links reuse the
instance registration-link store and closed-registration validation, but are
tagged with `issuer_type: "member"` and filtered by creator for listing and
revocation.

Administrators retain their existing registration-link controls. Existing
stored registration links without an issuer type normalize to
`issuer_type: "admin"` for backward compatibility.
