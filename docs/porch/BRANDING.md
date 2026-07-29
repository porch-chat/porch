# Porch branding contract

Porch uses one approved product mark:
`fluxer_desktop/build_resources/porch/porch-chat-icon.svg`.

The mark is a green/teal/blue rounded square containing a white porch
threshold and speech bubble. Stable and Canary intentionally share the same
brand; channel identity is communicated by the application name and isolated
package/update identity, not by reverting to upstream artwork.

`fluxer_desktop/scripts/generate-porch-icons.ps1` derives:

- Stable and Canary desktop icons and Windows tiles;
- monochrome macOS tray templates;
- public web/PWA favicons, app icons, Microsoft tiles, and Open Graph art;
- static Stable and Canary desktop `.ico` copies.

The app's icon, logo, symbol, and wordmark components retain their upstream
component names for merge compatibility, but their compile-time fallbacks are
Porch assets. Runtime self-host branding URLs may override them; empty URLs
must never reveal upstream artwork.

The compile-time brand palette uses Porch teal (`#14B8A6`) and the auth and
invite fallbacks use `porch-pattern.svg`. The upstream purple palette,
food-pattern artwork, and `fluxer.app` instance example are user-visible
branding leaks and are rejected by the branding guard.

Public identity is Porch across more than artwork. The same guard covers the
developer applications documentation link, generated public and admin OpenAPI
metadata, support and localization contacts, status/help navigation, setup
defaults, push and system-user fallbacks, checkout labels, and API error
messages. Protocol, schema, package, and source identifiers may retain
`Fluxer` where changing them would break compatibility; those identifiers must
not be presented as the product name.

The developer applications screen links to the instance-owned specification at
`https://api.porch.chat/api/openapi.json`. That document advertises
`https://api.porch.chat/api` as its production server and must contain Porch
contact and product metadata.

The app proxy CSP must allow `https://challenges.cloudflare.com` in both
`script-src` and `frame-src` so the configured Cloudflare Turnstile widget can
render. The browser already submits the resulting token to the API, where
server-side Siteverify validation fails closed.

macOS packaging consumes the generated Porch `icon.png` and lets
electron-builder create the platform icon. It must not consume the historical
precompiled upstream `.icns`.

Run the complete source and generated-output guard from the repository root:

```sh
node scripts/validate-porch-branding.mjs
```

Both active Porch app-proxy and desktop workflows run this guard before
building. Internal Fluxer package/module identifiers may remain where required
for upstream compatibility; the guard targets user-visible artwork and
metadata.
