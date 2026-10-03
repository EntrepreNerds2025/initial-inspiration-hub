export interface ProductionPackage {
  inquiryKey: string;
  name: string;
  price?: number;
  priceType: "from" | "fixed" | "custom";
  tagline?: string;
  description: string;
  includesLabel?: string;
  deliverables: string[];
  notes?: string[];
  ctaLabel: string;
}
export interface PackageCategory {
  id: string;
  number: string;
  name: string;
  inquiryLabel: string;
  metadata: string;
  description: string;
  tiers: ProductionPackage[];
}
export const packageCategories: PackageCategory[] = [
  {
    id: "story",
    number: "01",
    name: "STORIES & FILMS",
    inquiryLabel: "Stories & Films",
    metadata: "DOCUMENTARY / PROFILES / BRANDED FILMS / ORIGINALS",
    description:
      "Human-led films built around real people, experiences and ideas. From profiles and mini-documentaries to branded stories and original films, we find the moments that make the story worth watching.",
    tiers: [
      {
        inquiryKey: "story",
        name: "THE STORY",
        price: 1000,
        priceType: "from",
        tagline: "For stories that need more than coverage.",
        description:
          "A story-led production built around real people, experiences and ideas. Designed for profiles, mini-documentaries, testimonies, founder stories and human-led brand stories.",
        deliverables: [
          "Pre-production story call",
          "Story / interview planning",
          "Up to 3 hours production",
          "1 filmmaker",
          "Professional audio",
          "Lighting as required",
          "Interview + observational / B-roll coverage",
          "1 × 2–3 minute finished story film",
          "1 × vertical cut",
          "Colour + sound finishing",
          "2 revision rounds",
        ],
        notes: ["More involved productions can receive a custom quote."],
        ctaLabel: "BUILD YOUR STORY",
      },
    ],
  },
  {
    id: "event",
    number: "02",
    name: "EVENTS",
    inquiryLabel: "Events",
    metadata: "CELEBRATIONS / LAUNCHES / PERFORMANCES / EXPERIENCES",
    description:
      "Story-driven event coverage designed to capture both what happened and what it felt like.",
    tiers: [
      {
        inquiryKey: "event-essential",
        name: "ESSENTIAL",
        price: 600,
        priceType: "fixed",
        description: "Smaller events and moments that need intentional cinematic coverage.",
        deliverables: [
          "Up to 3 hours coverage",
          "1 filmmaker",
          "1 camera",
          "1 × 60–90 second highlight film",
          "1 × vertical social cut",
          "Colour + sound finishing",
          "Digital delivery",
          "1 revision round",
        ],
        ctaLabel: "BUILD THIS PACKAGE",
      },
      {
        inquiryKey: "event-signature",
        name: "SIGNATURE",
        price: 1000,
        priceType: "fixed",
        description: "Events that need more complete storytelling and more content from the day.",
        deliverables: [
          "Up to 5 hours coverage",
          "1 filmmaker",
          "1 camera",
          "1 × 2–3 minute event film",
          "3 × vertical social cuts",
          "Key speeches / important moments captured where applicable",
          "Colour + sound finishing",
          "Digital delivery",
          "2 revision rounds",
        ],
        ctaLabel: "BUILD THIS PACKAGE",
      },
      {
        inquiryKey: "event-full",
        name: "FULL EVENT",
        priceType: "custom",
        description: "Longer or more complex events requiring additional production.",
        includesLabel: "POSSIBLE NEEDS",
        deliverables: [
          "6+ hours coverage",
          "Multiple cameras",
          "Additional camera operators",
          "Full speech / presentation recordings",
          "Complex audio",
          "Multiple deliverables",
          "Additional locations",
        ],
        ctaLabel: "BUILD YOUR EVENT",
      },
    ],
  },
  {
    id: "live",
    number: "03",
    name: "LIVE PRODUCTION",
    inquiryLabel: "Live Production",
    metadata: "CONFERENCES / PANELS / PERFORMANCES / MULTI-CAMERA",
    description:
      "Professional video capture for conferences, conversations, performances and live experiences that need more than a highlight film.",
    tiers: [
      {
        inquiryKey: "live-single-camera",
        name: "SINGLE CAMERA",
        price: 500,
        priceType: "from",
        description: "Straightforward talks, presentations, ceremonies and performances.",
        deliverables: [
          "1 professional camera",
          "Camera operator",
          "Tripod-based coverage",
          "Professional audio feed / capture where available",
          "Full program recording",
          "Basic colour + audio finishing",
          "Digital delivery",
        ],
        notes: ["Coverage duration and production requirements determine the final quote."],
        ctaLabel: "BUILD THIS PRODUCTION",
      },
      {
        inquiryKey: "live-multi-camera",
        name: "MULTI-CAMERA",
        price: 900,
        priceType: "from",
        description:
          "Productions that benefit from multiple perspectives and a more polished full-program recording.",
        deliverables: [
          "2 cameras",
          "1–2 operators depending on production requirements",
          "Multiple angles",
          "Professional audio feed / capture",
          "Synchronized multi-camera edit",
          "Full program recording",
          "Basic titles where required",
          "Colour + audio finishing",
          "Digital delivery",
        ],
        ctaLabel: "BUILD THIS PRODUCTION",
      },
      {
        inquiryKey: "live-full-production",
        name: "FULL LIVE PRODUCTION",
        price: 1500,
        priceType: "from",
        description:
          "More involved live productions requiring multiple cameras and technical production.",
        includesLabel: "INCLUDES / AVAILABLE",
        deliverables: [
          "3+ cameras",
          "Live switching",
          "Dedicated production setup",
          "Professional audio integration",
          "Program recording",
          "ISO recording where required",
          "Basic graphics / lower thirds",
          "Pre-production planning",
          "Technical testing",
          "Digital delivery",
        ],
        notes: [
          "Livestreaming may be available depending on production requirements. Internet provision, platform access and venue connectivity are not included by default.",
          "Significantly more complex productions receive a custom quote.",
        ],
        ctaLabel: "BUILD YOUR PRODUCTION",
      },
    ],
  },
  {
    id: "content-day",
    number: "04",
    name: "CONTENT",
    inquiryLabel: "Content Production",
    metadata: "BRANDS / ORGANIZATIONS / CREATORS / SOCIAL",
    description:
      "One intentional production session designed to create multiple pieces of content for the people and platforms you're trying to reach.",
    tiers: [
      {
        inquiryKey: "content-day",
        name: "CONTENT DAY",
        price: 850,
        priceType: "from",
        tagline: "ONE SESSION. A LIBRARY OF CONTENT.",
        description:
          "Brands, organizations, entrepreneurs and creators who need multiple pieces of content from one intentional production session.",
        deliverables: [
          "Pre-production planning call",
          "Up to 4 hours production",
          "1 filmmaker",
          "Multiple setups within one location where practical",
          "1 × hero edit",
          "3 × vertical social edits",
          "Professional audio where required",
          "Colour + sound finishing",
          "Digital delivery",
        ],
        ctaLabel: "BUILD YOUR CONTENT DAY",
      },
    ],
  },
  {
    id: "custom",
    number: "05",
    name: "SOMETHING ELSE?",
    inquiryLabel: "Custom Production / Something Else",
    metadata: "CAMPAIGNS / CINEMATOGRAPHY / PRODUCTION SUPPORT / MULTI-DAY",
    description:
      "Not every project fits inside a package. For campaigns, cinematography, production support, multi-day shoots and ideas that need something different, we'll build the production around the project.",
    tiers: [
      {
        inquiryKey: "custom-production",
        name: "CUSTOM PRODUCTION",
        priceType: "custom",
        tagline: "BUILT AROUND THE PROJECT.",
        description: "Some projects don't fit inside a package.",
        includesLabel: "DESIGNED FOR",
        deliverables: [
          "Original films",
          "Campaigns",
          "Multi-day productions",
          "Touring / performance work",
          "Multiple locations",
          "Larger crews",
          "Specialized production",
          "Complex technical requirements",
          "Large deliverable sets",
        ],
        ctaLabel: "START A CONVERSATION",
      },
    ],
  },
];
export function packagePrice(item: ProductionPackage): string {
  if (item.priceType === "custom") return "CUSTOM QUOTE";
  return `${item.priceType === "from" ? "FROM " : ""}$${item.price?.toLocaleString("en-CA")} CAD`;
}
// The Quote Builder resolves this package key through the canonical category data.
// Selection travels in the URL, without global state or browser storage.
export function packageInquiryHref(inquiryKey: string): string {
  return `/start?package=${encodeURIComponent(inquiryKey)}`;
}
