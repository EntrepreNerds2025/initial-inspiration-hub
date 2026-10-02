export interface Department {
  number: string;
  name: string;
  title: string[];
  descriptor: string;
  statement: string[];
  mediaType: "image";
  media?: { poster: string; alt: string; caption: string };
  route?: string;
  externalUrl?: string;
  status: "planned" | "published";
}
export const departments: Department[] = [
  {
    number: "01",
    name: "THE SCRIBE DEPT.",
    title: ["THE SCRIBE", "DEPT."],
    descriptor: "FAITH / FILM / PRODUCTION",
    statement: ["Stories of faith.", "Films with purpose.", "Production in service of the story."],
    mediaType: "image",
    media: {
      poster: "/media/archive/your-response-kiara.jpg",
      alt: "Kiara in conversation in Your Response?",
      caption: "YOUR RESPONSE? / A SCRIBE DEPT. ORIGINAL",
    },
    route: "/departments/scribe",
    status: "published",
  },
  {
    number: "02",
    name: "DEARLY",
    title: ["DEARLY"],
    descriptor: "WEDDING FILM STUDIO / JOINT VENTURE",
    statement: ["The day, kept.", "Wedding films · Toronto & worldwide.", "A joint venture."],
    mediaType: "image",
    externalUrl: "https://dearly-film-starter.lovable.app/",
    status: "published",
  },
];
