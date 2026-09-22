# Section 03 — Dept. Archive

Edit `src/components/site/archive-projects.ts` to add/reorder archive entries.
Each project has `id`, `title`, `category`, optional `year`, `location`, `role`,
`productionCredit`, `department`, `caseStudyUrl`, `status`, `layout`, and `films`.
Each film has `label`, native `aspectRatio`, `poster`, and a `source`:
- Vimeo: `{ type: "vimeo", id: "..." }`
- Local: `{ type: "local", src: "/media/archive/film.mp4", preview: "/media/archive/film-preview.mp4" }`

DC—001 through DC—004 retain the original Vimeo films respectively:
EmployNext 1174716942, Reddit 1168847247, Breathe 1168844885,
Muamba Foundation × Bartley Skills Winnipeg 1159742453.
Their local poster filenames match these IDs. Their role, year, and production
credits have not been supplied; no authorship is inferred. `unconfirmed` and
`collaborative` entries display SELECTED WORK. Set actual `role` and
`productionCredit` when confirmed; missing credits are hidden until supplied.

DC—005 is YOUR RESPONSE?, one original series from THE SCRIBE DEPT., with:
- `your-response-kiara.mp4` (40 seconds)
- `your-response-matthew.mp4` (75 seconds)
- matching `.jpg` posters and `-preview.mp4` files

These files were generated from the user's supplied final renders, preserving
9:16 and the full duration. Full films are 720×1280 H.264/AAC with audio;
hover previews are 8 seconds at 360×640, silent, roughly 230 KB / 498 KB.
Replace the same paths to update media. Keep original masters outside the repo.

Add DC—006, DC—007, etc. as another project object; IDs are not chronological.
Projects share a three-column contact sheet (two on tablet, one on mobile).
Use `series` for paired vertical films; other layout values share the standard cell. `films` can
hold multiple shorts. `original` displays the original-work credit; department
selects the Scribe label. No case-study route is fabricated: missing
`caseStudyUrl` opens the accessible film dialog. A supplied URL takes precedence
for OPEN FILE. Do not supply a URL until its destination exists.

No archive video or Vimeo iframe mounts initially. Posters load lazily.
A shared IntersectionObserver reveals each project once (24px, 600ms, 80ms
neighbor stagger). At 60% media visibility, after the reveal, up to two projects
play silent previews. Short 02 begins 650ms after Short 01. Mounted players are
retained and paused offscreen so they resume rather than restart. Vimeo uses its
postMessage API; local clips use play/pause. Hidden tabs and open film dialogs
pause previews. Reduced-motion visitors get stills with no entrance animation.
Hover adds restrained brightness and OPEN feedback; touch needs no hover.
Full films open with controls and require an explicit play action for audio.
Escape/Close restores focus. The compact 3/2/1-column layout is unchanged.
