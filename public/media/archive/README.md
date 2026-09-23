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

Archive rows prepare media within 600px below the viewport. All prepared previews
play simultaneously, muted and looping, with no project limit or hover requirement.
Players stay mounted and playing as the page is explored; hidden tabs and open
film dialogs pause background previews. Vimeo autopause is disabled.
The initial responsive row (3 desktop / 2 tablet / 1 mobile) is visible immediately.
Later rows reveal once with a 56px upward movement over 750ms and 60ms neighbor
stagger; mobile uses 40px / 600ms. Reduced motion removes the entrance movement,
while preserving muted playback. Posters remain fallbacks while media loads.
Full films require an explicit play action for audio. Layout and IDs are unchanged.
