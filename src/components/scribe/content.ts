export interface ScribeContent {
  id: string;
  slug: string;
  title: string;
  titleLines: string[];
  subtitle?: string;
  series?: string;
  episode?: string;
  contentType: string;
  category: string;
  description: string;
  duration?: string;
  year?: string;
  thumbnail: string;
  heroMedia: { alt: string; poster: string; portraitPoster?: string; position?: string };
  previewMedia?: string;
  youtubeVideoId?: string;
  localFilm?: string;
  watchLabel: string;
  featured: boolean;
  credits?: string[];
  relatedContent?: string[];
  seriesUrl?: string;
}
export const featuredContent: ScribeContent = {
  id: "DC—005-01",
  slug: "your-response-kiara",
  title: "YOUR RESPONSE?",
  titleLines: ["YOUR", "RESPONSE?"],
  subtitle: "A SCRIBE DEPT. ORIGINAL",
  series: "YOUR RESPONSE?",
  contentType: "ORIGINAL SERIES",
  category: "WORSHIP",
  description:
    "Exploring worship through people, conversations, perspectives and documentary storytelling.",
  year: "2026",
  thumbnail: "/media/archive/your-response-kiara.jpg",
  heroMedia: {
    poster: "/media/archive/your-response-kiara.jpg",
    alt: "Kiara in conversation in Your Response?",
    position: "50% 35%",
  },
  localFilm: "/media/archive/your-response-kiara.mp4",
  watchLabel: "SHORT 01 / KIARA",
  featured: true,
};
export const scribeNavigation: { label: string; href?: string }[] = [
  { label: "WATCH", href: "#watch" },
  { label: "ORIGINALS" },
  { label: "FIELD NOTES" },
  { label: "FOOTNOTES" },
  { label: "STORE" },
  { label: "ABOUT" },
];
