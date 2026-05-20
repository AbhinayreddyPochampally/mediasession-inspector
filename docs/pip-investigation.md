# Microsoft Edge Picture-in-Picture: Media Session API seek restrictions bypassed during YouTube ad playback

> The investigation that motivated the [MediaSession Inspector](../README.md) tool. Filed with Microsoft on 2026-05-20 via in-product feedback and the Microsoft Edge Insider Tech Community.

## Summary

Microsoft Edge's Picture-in-Picture overlay exposes functional `+10s` / `-10s` seek controls during YouTube ad playback, including non-skippable pre-roll ads. The seek action advances the playhead despite the page declaring the `seekforward` action as unavailable via the Media Session API. The same flow does not reproduce on Google Chrome under identical conditions.

## Evidence

[![Microsoft Edge PiP seek-during-ad recording](https://img.youtube.com/vi/Q2QUfKZEZbM/maxresdefault.jpg)](https://youtu.be/Q2QUfKZEZbM)

▶ **[Watch the screen recording (unlisted)](https://youtu.be/Q2QUfKZEZbM)**

Key timestamps in the recording (InPrivate window, music video, two consecutive pre-roll ads):

- **0:04** — PiP activated, ad 1 of 2 (NPCI, non-skippable — no Skip button visible at any point) playing
- **0:06** — NPCI ad has been bypassed; ad 2 of 2 (Maggi) is now playing
- **0:10** — Maggi ad bypassed
- **0:12** — main music video playing

The entire pre-roll ad block — combined ~30+ seconds of intended ad time — was consumed in approximately 10 seconds of wall-clock time using only the PiP overlay's seek-forward control. The non-skippable NPCI ad was bypassed in roughly 2 seconds of real time, indicating the seek action advanced the playhead through the ad faster than the ad could play.

## Mechanism (hypothesis)

The speed of playhead advancement — bypassing 30+ seconds of intended ad content in approximately 10 seconds of wall-clock time, and bypassing a non-skippable ad in roughly 2 seconds — is consistent with `HTMLMediaElement.currentTime` being mutated directly by the Edge PiP overlay, rather than the seek action being dispatched through the page's registered Media Session action handlers.

YouTube clears the `seekforward` Media Session action via `navigator.mediaSession.setActionHandler('seekforward', null)` during ad playback. Chrome respects this declaration — its PiP seek control is either hidden or inert while an ad is playing. Edge's PiP overlay appears to bypass the declared Media Session state and seek the underlying video element directly, regardless of which actions the page has registered.

## Reproduction

1. Open Microsoft Edge in an InPrivate window
2. Navigate to `youtube.com` and play any music video (high pre-roll ad probability)
3. When a pre-roll ad begins, click the in-player PiP icon to enter Picture-in-Picture
4. With the PiP window focused, press the `+10 seconds` seek-forward control on the PiP overlay repeatedly

Observed: the ad playhead advances. Non-skippable ads can be bypassed entirely; skippable ads can be advanced past the mandatory waiting period before the Skip button appears.

## Cross-browser comparison

Identical flow on Google Chrome 148.0.7778.168, same Windows installation, same network. Seek-forward control during ad playback does not advance the playhead. This isolates the issue to Edge's PiP implementation and confirms that YouTube's Media Session state is being declared correctly — Chrome reads and respects it; Edge does not.

## Impact

The scope extends beyond YouTube ads. Affects any page using the Media Session API to restrict seek during specific playback states, including:

- Live streams that disable seek
- DRM-protected content with seek restrictions
- Ad-bound playback on any platform that integrates with browser-level media controls
- Any spec-compliant use of `setActionHandler(action, null)` to remove an action from the declared set

In Edge's PiP overlay, none of these restrictions hold. This is a Media Session API compliance gap.

## Disclosure timeline

- **2026-05-20** — In-product feedback submitted via `edge://settings` → Send Feedback
- **2026-05-20** — Discussion posted on Microsoft Edge Insider Tech Community: _(link pending — add the thread URL here once the post is live)_
- **2026-05-20** — Investigation published here / publicly written up (post-disclosure window)

## Environment

- Microsoft Edge: 148.0.3967.70 (64-bit, Stable channel)
- OS: Windows 11 Home Single Language, version 25H2 (build 26200.8457)
- Mode: InPrivate, logged out of any Google account
- Compared against: Google Chrome 148.0.7778.168, same machine, same network conditions
