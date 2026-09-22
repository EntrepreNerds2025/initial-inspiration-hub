import { heroPoster, heroVideo } from "./hero-media";

// Set video to the corresponding /media/manifesto/*.mp4 path when final media
// is available. Replace poster with a matching local still if desired.
// Null continues the preceding reel without mounting another video or still.
export const manifestoMedia: { id: string; video: string | null; poster: string }[] = [
  { id: "opening", video: heroVideo, poster: heroPoster },
  { id: "people", video: null, poster: heroPoster },
  { id: "performance", video: null, poster: heroPoster },
  { id: "process", video: null, poster: heroPoster },
  { id: "in-between", video: null, poster: heroPoster },
];
