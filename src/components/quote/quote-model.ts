import { packageCategories, packagePrice } from "../packages/packages-data";
export type Answers = Record<string, string | string[]>;
export type Question = {
  id: string;
  stage: number;
  title: string;
  kind: "choice" | "multi" | "text" | "textarea" | "date" | "contact";
  options?: { value: string; label: string; detail?: string }[];
  required?: boolean;
  hint?: string;
};
export const stages = ["PROJECT", "SCOPE", "DETAILS", "INVESTMENT", "YOU", "REVIEW"];
export const findPackage = (key: string) =>
  packageCategories
    .flatMap((category) => category.tiers.map((tier) => ({ category, tier })))
    .find((item) => item.tier.inquiryKey === key);
export const serviceLabel = (id: string) =>
  id === "unsure"
    ? "I'm Not Sure Yet"
    : (packageCategories.find((c) => c.id === id)?.inquiryLabel ?? "");
const options = (labels: string[]) => labels.map((label) => ({ value: label, label }));
const choice = (
  id: string,
  stage: number,
  title: string,
  labels: string[],
  multi = false,
): Question => ({
  id,
  stage,
  title,
  kind: multi ? "multi" : "choice",
  options: options(labels),
  required: !multi,
});
const text = (
  id: string,
  stage: number,
  title: string,
  required = false,
  hint?: string,
): Question => ({ id, stage, title, kind: "textarea", required, ...(hint ? { hint } : {}) });
export function questions(a: Answers, confirmedPackage: boolean): Question[] {
  const s = a["service"];
  const list: Question[] = [];
  if (s === "story")
    list.push(
      choice("storyType", 1, "WHAT KIND OF STORY ARE WE TELLING?", [
        "Profile / character story",
        "Mini-documentary",
        "Brand story",
        "Interview-led film",
        "Original / creative film",
        "Not Sure Yet",
      ]),
      text(
        "projectDescription",
        1,
        "WHO OR WHAT IS THE STORY ABOUT?",
        true,
        "The person, organization or idea at the centre of the film.",
      ),
      text("projectGoal", 1, "WHAT DO YOU WANT PEOPLE TO FEEL, UNDERSTAND OR REMEMBER?"),
      choice(
        "distribution",
        1,
        "WHERE WILL THE FILM LIVE?",
        [
          "Website",
          "Instagram / TikTok",
          "YouTube",
          "Event / screening",
          "Internal / organizational",
          "Other",
          "Not Sure Yet",
        ],
        true,
      ),
    );
  if (s === "event") {
    if (!confirmedPackage)
      list.push(
        choice("eventType", 1, "WHAT KIND OF EVENT IS IT?", [
          "Celebration / birthday",
          "Launch",
          "Performance / concert",
          "Community event",
          "Gala / formal event",
          "Engagement / personal event",
          "Other",
        ]),
      );
    list.push(
      choice(
        "deliverables",
        1,
        "WHAT DO YOU WANT TO WALK AWAY WITH?",
        [
          "Highlight film",
          "Vertical social cuts",
          "Key speeches / moments",
          "Full speech / presentation recordings",
          "Raw / selected footage",
          "Not Sure Yet",
        ],
        true,
      ),
    );
  }
  if (s === "live")
    list.push(
      choice("liveType", 1, "WHAT ARE WE CAPTURING?", [
        "Conference",
        "Panel / conversation",
        "Presentation / talk",
        "Performance / concert",
        "Church / faith event",
        "Ceremony",
        "Other",
      ]),
    );
  if ((s === "event" || s === "live") && !confirmedPackage) {
    const category = packageCategories.find((c) => c.id === s)!;
    list.push({
      id: "package",
      stage: 1,
      title: s === "event" ? "WHERE WOULD YOU LIKE TO START?" : "HOW DO YOU WANT IT CAPTURED?",
      kind: "choice",
      required: true,
      options: [
        ...category.tiers.map((t) => ({
          value: t.inquiryKey,
          label: `${t.name} — ${packagePrice(t)}`,
          detail: t.description,
        })),
        { value: "unsure", label: "Help me choose" },
      ],
    });
  }
  if (s === "live") {
    list.push(
      choice("livestreamNeeded", 1, "DOES IT NEED TO BE LIVE?", [
        "No — recording only",
        "Yes — livestream",
        "Not Sure Yet",
      ]),
    );
    if (a["livestreamNeeded"] === "Yes — livestream")
      list.push(
        choice("streamingPlatformStatus", 1, "DO YOU ALREADY HAVE A STREAMING DESTINATION?", [
          "Yes",
          "No",
          "Not sure",
        ]),
        text(
          "technicalSetup",
          1,
          "ANYTHING WE SHOULD KNOW ABOUT THE VENUE’S INTERNET OR TECHNICAL SETUP?",
          false,
          "Optional. Connectivity and streaming requirements will be reviewed with you.",
        ),
      );
    list.push(
      choice(
        "deliverables",
        1,
        "WHAT NEEDS TO BE DELIVERED AFTERWARD?",
        [
          "Full program recording",
          "Individual sessions / talks",
          "Highlight film",
          "Social cuts",
          "Other",
          "Not Sure Yet",
        ],
        true,
      ),
    );
  }
  if (s === "content-day")
    list.push(
      choice("contentType", 1, "WHO ARE WE CREATING FOR?", [
        "Brand",
        "Organization",
        "Artist",
        "Creator",
        "Small business",
        "Other",
      ]),
      choice(
        "deliverables",
        1,
        "WHAT ARE WE MAKING?",
        [
          "Hero / feature video",
          "Vertical shorts",
          "Interviews",
          "Product / service content",
          "Behind the scenes",
          "Campaign content",
          "Not Sure Yet",
        ],
        true,
      ),
      choice("contentVolume", 1, "HOW MUCH CONTENT ARE YOU HOPING TO CREATE?", [
        "A few strong pieces",
        "A small content library",
        "Enough for a campaign",
        "I'm not sure — help me plan it",
      ]),
    );
  if (s === "custom")
    list.push(
      text(
        "projectDescription",
        1,
        "WHAT ARE YOU THINKING?",
        true,
        "Tell us the idea, even if it's still rough.",
      ),
      choice(
        "support",
        1,
        "WHAT KIND OF SUPPORT DO YOU THINK YOU NEED?",
        [
          "Creative development",
          "Cinematography",
          "Camera operation",
          "Production support",
          "Multi-day production",
          "Campaign production",
          "Crew / technical production",
          "Not Sure Yet",
        ],
        true,
      ),
    );
  if (s === "unsure")
    list.push(
      text(
        "projectDescription",
        1,
        "THAT’S OKAY. WHAT ARE YOU TRYING TO MAKE HAPPEN?",
        true,
        "The idea, the occasion, or what you need the video to do.",
      ),
    );
  list.push(
    choice("dateStatus", 2, "WHEN IS IT HAPPENING?", [
      "I have a date",
      "Date is flexible",
      "Still planning",
    ]),
  );
  if (a["dateStatus"] === "I have a date")
    list.push({
      id: "eventDate",
      stage: 2,
      title: "WHAT DATE SHOULD WE KEEP IN MIND?",
      kind: "date",
      required: true,
    });
  list.push(
    {
      id: "location",
      stage: 2,
      title: "WHERE IS IT HAPPENING?",
      kind: "text",
      required: true,
      hint: "City / location — or “still planning” if you don’t know yet.",
    },
    {
      id: "venue",
      stage: 2,
      title: "DO YOU HAVE A VENUE IN MIND?",
      kind: "text",
      hint: "Optional. A name or address is plenty.",
    },
  );
  const selected = findPackage(String(a["package"] ?? ""));
  const coverage = selected?.tier.deliverables.find((d) => /hours (production|coverage)/i.test(d));
  list.push({
    ...choice("coverage", 2, "HOW MUCH COVERAGE DO YOU THINK YOU NEED?", [
      "Up to 3 hours",
      "3–5 hours",
      "5–8 hours",
      "Full day",
      "Multiple days",
      "Not Sure Yet",
    ]),
    ...(coverage
      ? {
          hint: `Your starting package includes ${coverage.toLowerCase()}. Tell us if you need more.`,
        }
      : {}),
  });
  list.push(
    {
      ...choice("budget", 3, "WHAT INVESTMENT RANGE ARE YOU WORKING WITH?", [
        "Under $750",
        "$750–$1,500",
        "$1,500–$3,000",
        "$3,000–$5,000",
        "$5,000+",
        "Not Sure Yet",
      ]),
      hint: "CAD. We’ll review the scope with you. This is not a final quote.",
    },
    {
      ...choice("deliveryTimeline", 3, "WHEN DO YOU NEED THE FINAL FILM?", [
        "As soon as possible",
        "Within 1–2 weeks",
        "Within 3–4 weeks",
        "More than a month",
        "Flexible",
        "Not Sure Yet",
      ]),
      required: false,
      hint: "Optional. Your preferred timing, not a promised turnaround.",
    },
    {
      id: "contact",
      stage: 4,
      title: "WHO ARE WE BUILDING THIS WITH?",
      kind: "contact",
      required: true,
    },
    text(
      "additionalNotes",
      4,
      "ANYTHING ELSE WE SHOULD KNOW?",
      false,
      "Links, references, ideas, concerns — anything that helps us understand the project.",
    ),
  );
  return list;
}
export function validate(q: Question, a: Answers): string {
  if (q.kind === "contact") {
    if (!String(a["name"] ?? "").trim()) return "Please tell us your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(a["email"] ?? "").trim()))
      return "Please enter a valid email address.";
  }
  if (q.required && q.kind !== "contact") {
    const v = a[q.id];
    if (!v || (typeof v === "string" ? !v.trim() : !v.length))
      return "Choose an answer or tell us a little more to continue.";
  }
  return "";
}
export function submission(a: Answers, confirmed: boolean) {
  const selected = findPackage(String(a["package"] ?? ""));
  const fields: Record<string, string> = {
    service: serviceLabel(String(a["service"])),
    ...(selected
      ? {
          packageId: selected.tier.inquiryKey,
          packageTier: selected.tier.name,
          startingPoint: packagePrice(selected.tier),
        }
      : {}),
  };
  for (const q of questions(a, confirmed)) {
    if (q.id === "package" || q.id === "contact") continue;
    const value = a[q.id];
    if (value && value.length) fields[q.id] = Array.isArray(value) ? value.join(", ") : value;
  }
  for (const key of ["name", "email", "phone", "organization", "preferredContact"])
    if (a[key]) fields[key] = String(a[key]).trim();
  return fields;
}
export async function sendProject(
  fields: Record<string, string>,
  honey: string,
  request: typeof fetch = fetch,
) {
  const response = await request("https://formsubmit.co/ajax/hello@thedeptcollective.com", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      ...fields,
      _subject: "New project brief — Dept. Collective",
      _template: "table",
      _honey: honey,
    }),
    signal: AbortSignal.timeout(20000),
  });
  const result = await response.json();
  if (!response.ok || !(result.success === true || result.success === "true"))
    throw new Error("Submission was not confirmed");
}
