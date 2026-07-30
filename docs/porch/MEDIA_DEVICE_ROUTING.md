# Porch media device routing

Porch exposes operating-system audio routes separately from physical endpoints.

## Audio

- **Windows default** follows the current Windows default input or output route.
- **Windows communications** follows the current Windows communications input or output route.
- A named physical device stays pinned to that endpoint until it disappears.
- If a pinned endpoint disappears, Porch falls back to the first available route and heals the saved selection where the active media engine supports it.

The desktop native bridge enumerates the complete input and output inventory before a call starts. It does not return a placeholder-only `Default` list while the native audio device module is idle.

For a dynamic route, Porch keeps the saved setting as `default` or `communications` and separately fingerprints the concrete endpoint label and group. A device inventory change that moves the operating-system route therefore refreshes active microphone capture or reapplies active output routing without rewriting the user's preference to a hardware GUID.

## Camera

Windows does not provide a camera role equivalent to its default and communications audio roles. Porch therefore labels its synthetic camera route **Automatic**.

Automatic follows the first camera currently returned by the browser or native media inventory. The UI includes that camera's current name when available, for example `Automatic (Anker PowerConf C200)`. Active capture and the settings preview are rebuilt if the automatic route moves after a camera is connected, disconnected, or reordered.

A selected named camera remains pinned to its device ID while it is available.

## Validation contract

Device-routing changes should cover:

1. enumeration before joining a call;
2. default, communications, and physical audio selections;
3. automatic and physical camera selections;
4. inventory changes while settings are open;
5. route changes while microphone, output, or camera capture is active;
6. fallback after a selected endpoint disappears.

On Windows, compare the labels and endpoints with **Settings > System > Sound**. Porch should distinguish the default and communications routes even when both currently resolve to the same physical endpoint.
