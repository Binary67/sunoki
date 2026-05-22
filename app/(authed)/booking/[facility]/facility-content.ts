export type Facility = {
  title: string;
  description: string;
  gradientClasses: string;
  accentColor: string;
  serifName: string;
  sublabel: string;
};

export const FACILITIES = {
  karaoke: {
    title: "Echoes of Serenity",
    description:
      "A private sanctuary designed for musical expression and emotional release, featuring studio-grade acoustics and intimate ambient lighting.",
    gradientClasses: "from-[#3b2a20] via-[#2a1f18] to-[#0e0a08]",
    accentColor: "#d4a574",
    serifName: "Dynasty",
    sublabel: "KARAOKE LOUNGE",
  },
  gym: {
    title: "Pulse of Vitality",
    description:
      "A precision-equipped strength studio balancing focused training with the calm of mindful movement and breath.",
    gradientClasses: "from-[#1a2530] via-[#11181f] to-[#070a0d]",
    accentColor: "#7fb3d5",
    serifName: "Apex",
    sublabel: "STRENGTH STUDIO",
  },
  yoga: {
    title: "Whispers of Stillness",
    description:
      "A softly lit studio for breath, balance, and restorative practice with natural fibers and warm light.",
    gradientClasses: "from-[#2d2316] via-[#1f1810] to-[#0c0a07]",
    accentColor: "#e8c79b",
    serifName: "Lumina",
    sublabel: "YOGA STUDIO",
  },
  lounge: {
    title: "Garden of Repose",
    description:
      "An unhurried social retreat with low seating, herbal infusions, and shaded greenery for conversation or quiet repose.",
    gradientClasses: "from-[#1f2a22] via-[#162018] to-[#08100b]",
    accentColor: "#a8c8a0",
    serifName: "Verdance",
    sublabel: "TRANQUIL LOUNGE",
  },
} as const satisfies Record<string, Facility>;

export type FacilitySlug = keyof typeof FACILITIES;
