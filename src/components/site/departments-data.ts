export interface Department {
  number: string;
  name: string;
  title: [string, string];
  descriptor: string;
  statement: string[];
  media: { poster: string; preview: string; caption: string };
  route: string;
  status: "planned" | "published";
}
export const departments: Department[] = [
  {
    number: "01",
    name: "THE SCRIBE DEPT.",
    title: ["THE SCRIBE", "DEPT."],
    descriptor: "FAITH / FILM / PRODUCTION",
    statement: ["Stories of faith.", "Films with purpose.", "Production in service of the story."],
    media: {
      poster: "/media/archive/your-response-kiara.jpg",
      preview: "/media/archive/your-response-kiara-preview.mp4",
      caption: "YOUR RESPONSE? / A SCRIBE DEPT. ORIGINAL",
    },
    route: "/departments/scribe",
    status: "planned",
  },
];
