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
  duration: "0:40",
  featured: true,
  seriesUrl: "/departments/scribe/your-response",
};
export const scribeNavigation: { label: string; href?: string }[] = [
  { label: "WATCH", href: "#watch" },
  { label: "PACKAGES", href: "/#packages" },
  { label: "ORIGINALS" },
  { label: "FIELD NOTES" },
  { label: "FOOTNOTES" },
  { label: "STORE" },
  { label: "ABOUT" },
];

// Local originals are the user-supplied films, not copies of YouTube content.
export const yourResponseFilms: ScribeContent[] = [
  { ...featuredContent, episode: "SHORT 01", relatedContent: ["DC—005-02"] },
  {
    ...featuredContent,
    id: "DC—005-02",
    slug: "your-response-matthew",
    episode: "SHORT 02",
    watchLabel: "SHORT 02 / MATTHEW",
    duration: "1:15",
    thumbnail: "/media/archive/your-response-matthew.jpg",
    heroMedia: {
      poster: "/media/archive/your-response-matthew.jpg",
      alt: "Matthew in conversation in Your Response?",
    },
    localFilm: "/media/archive/your-response-matthew.mp4",
    featured: false,
    relatedContent: ["DC—005-01"],
  },
];
export const yourResponseSeries = {
  title: "YOUR RESPONSE?",
  description: featuredContent.description,
  films: yourResponseFilms,
};
