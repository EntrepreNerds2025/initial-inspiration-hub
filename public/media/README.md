# Section 01 hero film

The final 17.4-second reel is `public/media/dept-hero.mp4`: a silent, fast-start
H.264 MP4 at the original 1920×1080 resolution, optimized from the supplied MOV
(27 MB to 8.8 MB). The matching first-frame fallback is `dept-hero-poster.jpg`.
Replace these files to update Section 01; their URLs are configured in `src/components/site/hero-media.ts`.
The manifesto reuses this reel throughout its sequence, synchronizing playback at entry.

One video element autoplays muted, loops, and plays inline without controls.
The same element stays mounted through the entire mask/full-screen transition;
scrolling never seeks or resets playback. It pauses offscreen or in a hidden tab.
The poster remains visible until playback begins and on video failure. Reduced-motion
visitors see the poster without mounting or downloading the video.

The opening viewport is 100svh. Desktop uses 160svh of native scroll travel;
touch/small screens use 90svh and a gentler 9× zoom (desktop: 26×).
Media emerges at 6–85%, scaling begins at 40–42%, metadata fades by 36%,
and the remaining mask dissolves at 85–100%. The same media layer stays
in place throughout. The scroll cue links to the end of the pinned sequence.
The existing Work section follows only after the sticky hero releases. No scroll trapping
or animation dependency is used. The visible display text is decorative SVG;
a semantic h1 provides its accessible equivalent.
