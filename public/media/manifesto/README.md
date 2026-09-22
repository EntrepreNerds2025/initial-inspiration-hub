# Section 02 — Manifesto media

The opening reuses the approved hero's image and video configuration from
`src/components/site/hero-media.ts`. The final reel is configured as
`/media/dept-hero.mp4`. Both sections use the same reel;
the opening manifesto video synchronizes to the hero's playback time at entry.

Optional subsequent clips belong here:

- `people.mp4`
- `performance.mp4`
- `process.mp4`
- `in-between.mp4`

Enable their `/media/manifesto/...` URLs in
`src/components/site/manifesto-media.ts`. Each entry also accepts a poster still.
Unconfigured beats continue the opening reel without extra video instances or
still overlays. The matching hero poster remains the fallback.
Use short, silent, compressed H.264 MP4 loops and matching stills. The sequence
crossfades successive media layers; only the current/transitioning clips play.
Videos pause offscreen, when the browser tab is hidden, when paused by the
visitor, and for reduced motion. A failed video leaves its poster visible.

The manifesto overlaps the hero's final viewport. Its sticky stage stays hidden
until aligned with the hero's full-screen frame, then takes over without a cut.
The opening image position and color treatment match the hero. The original hero
animation remains unchanged.

Native scroll drives six text beats and a decorative 24 fps timecode spanning
18 editorial seconds. The final subject holds nearly twice as long as the other
subjects. Desktop uses 460svh of scroll travel; touch/small screens use 270svh.
The media fades to black before a regular-flow closing statement. Reduced-motion
visitors receive all statements as normal readable content with no pinned scene,
autoplay, timecode animation, or extra scroll distance.
