# Porch client bootstrap resilience

Porch must not leave an authenticated client on an indefinite splash screen.
The protected application becomes usable only after the gateway sends `READY`
or `RESUMED`, so browser routing, runtime discovery, WebSocket policy, and the
gateway session lifecycle are one availability boundary.

## Failure classes

- The HTML bootstrap must advertise the same-origin `/api` client endpoint so
  authenticated REST requests retain their authorization headers.
- The HTML CSP must allow `wss://api.porch.chat` for the gateway and LiveKit.
- Caddy must route the exact `/gateway` and `/livekit` paths before the
  application-shell fallback.
- The service worker may use a cached shell only after giving a revalidated
  network response a realistic mobile-network window. Runtime endpoints and
  CSP can change without a new hashed application bundle.
- A gateway that sends `HELLO` but never answers `IDENTIFY` with `READY` must
  be treated as a failed attempt. Porch reconnects with a fresh identify after
  30 seconds instead of waiting forever.
- After ten seconds, the splash screen exposes explicit reload and sign-out
  recovery actions in addition to service-status links.
- Relative same-origin API endpoints are resolved through the absolute public
  API endpoint when identifying saved accounts. A valid account on `/api`
  must survive reloads without weakening isolation between different servers.
- Self-hosted Electron clients use LiveKit's normal ICE candidate selection.
  Relay-only ICE is reserved for hosted infrastructure that is guaranteed to
  advertise a TURN relay; otherwise direct UDP and LiveKit TCP fallback would
  both be rejected before media negotiation.

## Acceptance

The client test suite proves that an unanswered `IDENTIFY` closes the stale
socket with the `Gateway READY timeout` reason and enters reconnection. Service
worker routing tests protect the boundary between navigations, immutable
assets, and metadata. Instance-identity tests cover relative and absolute API
endpoints, cross-instance isolation, and invalid endpoints. Voice policy tests
cover self-hosted Electron, hosted Electron, and browser ICE selection.

Production verification remains deployment-owned. The Porch operations smoke
suite validates Stable and Canary discovery, semantic same-origin login and
protected API responses, CORS compatibility, the gateway `HELLO`, exact
LiveKit routing and token boundary, passkey configuration, service state, and
immutable images.

Pushes to `canary` that touch the web client or app proxy build a Porch-owned
multi-architecture image tagged `canary`. Production deployment must still pin
the resolved manifest digest; moving tags are never accepted in the operations
lock file.
