# Section 01 hero film

The temporary hero media is the existing `src/assets/hero.jpg` photograph.
No stock footage or remote video is used by the hero.

To enable the final film:

1. Add an optimized, silent H.264 MP4 at `public/media/dept-hero.mp4`.
2. Set `HERO_VIDEO` to `"/media/dept-hero.mp4"` in
   `src/components/site/Hero.tsx` (currently `null`).
3. Replace the imported poster with a still from the final film if desired.

Keep the loop short and compressed (ideally under 5 MB). Video is decorative,
muted, inline, and starts only during the scroll reveal. It pauses outside the
hero; rejected autoplay or a failed video falls back to the still. Reduced-motion
visitors see the static typographic hero, without the extra scroll distance.

The opening viewport is 100svh. Desktop uses 160svh of native scroll travel;
touch/small screens use 90svh and a gentler 9× zoom (desktop: 26×).
Media emerges at 6–85%, scaling begins at 40–42%, metadata fades by 36%,
and the remaining mask dissolves at 85–100%. The same media layer stays
in place throughout. The scroll cue links to the end of the pinned sequence.
The existing Work section follows only after the sticky hero releases. No scroll trapping
or animation dependency is used. The visible display text is decorative SVG;
a semantic h1 provides its accessible equivalent.
