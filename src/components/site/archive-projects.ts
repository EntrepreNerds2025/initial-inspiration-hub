export interface ArchiveFilm {
  label: string;
  aspectRatio: string;
  poster: string;
  source: { type: "vimeo"; id: string } | { type: "local"; src: string; preview: string };
}
export interface ArchiveProject {
  id: string;
  title: string;
  category: string;
  year?: string;
  location?: string;
  role?: string;
  productionCredit?: string;
  department?: string;
  status: "original" | "collaborative" | "unconfirmed";
  caseStudyUrl?: string;
  layout: "series" | "wide" | "right" | "left";
  films: ArchiveFilm[];
}
const vimeoFilm = (id: string): ArchiveFilm => ({
  label: "FULL FILM",
  aspectRatio: "16 / 9",
  poster: `/media/archive/${id}.jpg`,
  source: { type: "vimeo", id },
});
// IDs are catalogue identifiers, not dates. Unprovided credits remain unconfirmed.
export const archiveProjects: ArchiveProject[] = [
  {
    id: "DC—005",
    title: "YOUR RESPONSE?",
    category: "DOCUMENTARY / WORSHIP",
    year: "2026",
    department: "THE SCRIBE DEPT.",
    status: "original",
    layout: "series",
    films: [
      {
        label: "SHORT 01 / KIARA",
        aspectRatio: "9 / 16",
        poster: "/media/archive/your-response-kiara.jpg",
        source: {
          type: "local",
          src: "/media/archive/your-response-kiara.mp4",
          preview: "/media/archive/your-response-kiara-preview.mp4",
        },
      },
      {
        label: "SHORT 02 / MATTHEW",
        aspectRatio: "9 / 16",
        poster: "/media/archive/your-response-matthew.jpg",
        source: {
          type: "local",
          src: "/media/archive/your-response-matthew.mp4",
          preview: "/media/archive/your-response-matthew-preview.mp4",
        },
      },
    ],
  },
  {
    id: "DC—001",
    title: "EmployNext: Youth Trades Program",
    category: "DOCUMENTARY / PROGRAM FILM",
    status: "unconfirmed",
    layout: "wide",
    films: [vimeoFilm("1174716942")],
  },
  {
    id: "DC—002",
    title: "Reddit AI Search Event Recap",
    category: "EVENT RECAP",
    status: "unconfirmed",
    layout: "right",
    films: [vimeoFilm("1168847247")],
  },
  {
    id: "DC—003",
    title: "Breathe Mindful Living",
    category: "BRAND LAUNCH FILM",
    status: "unconfirmed",
    layout: "left",
    films: [vimeoFilm("1168844885")],
  },
  {
    id: "DC—004",
    title: "Muamba Foundation × Bartley Skills Winnipeg",
    category: "EVENT RECAP",
    status: "unconfirmed",
    layout: "wide",
    films: [vimeoFilm("1159742453")],
  },
];
