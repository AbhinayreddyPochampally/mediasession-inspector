# MediaSession Inspector

> A Chrome / Edge DevTools extension that shows the live state of the [Media Session API](https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API) on any page — registered action handlers, metadata, playback state, position state — and lets you fire each registered action to test how the page responds.

## Why this exists

While investigating a [Picture-in-Picture seek bug in Microsoft Edge](./docs/pip-investigation.md), I needed to know exactly which Media Session actions a page had registered at any moment, which it had cleared, and what the browser would do when the OS-level controls invoked each one.

There was no way to see this without reading the page's minified source or dropping `console.log` inside a `setActionHandler` shim every time. The bug took several hours to attribute to its real root cause — Edge bypassing the page's declared MediaSession state in its PiP overlay — and most of that time was instrumentation work that should have taken thirty seconds.

This tool is the instrumentation. If you're building anything that wires up `navigator.mediaSession` — a video site, podcast app, music streamer, live-stream platform — it surfaces what your page is actually telling the browser, in a DevTools panel that updates live.

## What it shows

A new panel in Chrome / Edge DevTools, refreshed as the page changes its Media Session state:

- **Metadata** — title, artist, album, artwork URLs currently set
- **Playback state** — `none` / `paused` / `playing`
- **Position state** — last `setPositionState({ duration, position, playbackRate })` call
- **Registered action handlers** — for each standard action (`play`, `pause`, `stop`, `seekbackward`, `seekforward`, `seekto`, `previoustrack`, `nexttrack`, `skipad`), a clear indicator of whether a handler is currently registered or has been cleared
- **Fire-this-action buttons** — invoke each registered handler directly from the panel to test how the page responds

## Install

> Extension currently in development. Star this repo to be notified when the Chrome Web Store and Microsoft Edge Add-ons listings go live.

For manual install during development:

```sh
git clone https://github.com/AbhinayreddyPochampally/mediasession-inspector
cd mediasession-inspector
npm install
npm run build
```

Then load `dist/` as an unpacked extension in `chrome://extensions` or `edge://extensions` with Developer Mode enabled. Open DevTools (F12) on any page and select the **MediaSession** panel.

## Planned (post-v1)

- Cross-browser state diffing — load the same page in Edge and Chrome, see what differs
- Timeline / history log of Media Session state changes
- Firefox port via WebExtensions API
- Export logs as JSON for filing in bug reports

## The investigation that motivated this

See [`docs/pip-investigation.md`](./docs/pip-investigation.md) — the original Edge PiP bug report, the cross-browser evidence, and the mechanism hypothesis. Filed with Microsoft on 2026-05-20 via in-product feedback and the Microsoft Edge Insider Tech Community.

## Contributing

Issues and PRs welcome. If you've found a Media Session API edge case worth surfacing in the panel — strange browser behavior, missing actions, spec deviations — open an issue with a minimal repro page and what you'd want the panel to show.

## License

MIT
