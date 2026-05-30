// ---------------------------------------------------------------------------
// Staircase Hub — Configurator Data
// ---------------------------------------------------------------------------

const HUB = "/images/staircase-hub";

export interface StaircaseStructure {
  slug: string;
  name: string;
  subtitle: string;
  tagline: string;
  description: string;
  heroMobile: string;
  heroDesktop: string;
  tiers: FinishTier[];
  railings: RailingOption[];
}

export interface FinishTier {
  id: string;
  name: string;
  description: string;
  imageMobile: string;
  imageDesktop: string;
  features: string[];
}

export interface RailingOption {
  id: string;
  name: string;
  description: string;
  image: string;
}

export const STRUCTURES: StaircaseStructure[] = [
  {
    slug: "curved",
    name: "Curved",
    subtitle: "Sweeping Elegance",
    tagline: "The staircase that commands every room it enters.",
    description: "A custom-bent curve that flows from floor to floor with effortless grace. No straight lines, no sharp angles — just a continuous, sculptural form engineered to your exact space.",
    heroMobile: `${HUB}/heroes/mobile/king-iron-works-curved-staircase.jpg`,
    heroDesktop: `${HUB}/heroes/desktop/king-iron-works-curved-staircase.jpg`,
    tiers: [
      {
        id: "traditional",
        name: "Traditional",
        description: "Oak treads, iron balusters, warm and inviting",
        imageMobile: `${HUB}/tiers/mobile/king-iron-works-curved-traditional.jpg`,
        imageDesktop: `${HUB}/tiers/desktop/king-iron-works-curved-traditional.jpg`,
        features: ["White oak treads", "Black vertical picket balusters", "Oak handrail", "Closed risers"],
      },
      {
        id: "modern",
        name: "Modern",
        description: "Open risers, horizontal rods, clean lines",
        imageMobile: `${HUB}/tiers/mobile/king-iron-works-curved-modern.jpg`,
        imageDesktop: `${HUB}/tiers/desktop/king-iron-works-curved-modern.jpg`,
        features: ["Oak treads with open risers", "Horizontal rod railing", "Steel stringer", "Sputnik chandelier"],
      },
      {
        id: "luxury",
        name: "Luxury",
        description: "Glass railing, LED lighting, stone accents",
        imageMobile: `${HUB}/tiers/mobile/king-iron-works-curved-luxury.jpg`,
        imageDesktop: `${HUB}/tiers/desktop/king-iron-works-curved-luxury.jpg`,
        features: ["Walnut treads", "Frameless glass railing", "LED under-tread lighting", "Stone accent wall"],
      },
      {
        id: "ultra-luxury",
        name: "Ultra-Luxury",
        description: "Gold leaf, marble, hand-forged ironwork",
        imageMobile: `${HUB}/tiers/mobile/king-iron-works-curved-ultra-luxury.jpg`,
        imageDesktop: `${HUB}/tiers/desktop/king-iron-works-curved-ultra-luxury.jpg`,
        features: ["Ebony treads with marble risers", "Hand-forged ornamental balustrade", "Gold leaf scroll accents", "Crystal chandelier"],
      },
    ],
    railings: [
      { id: "glass", name: "Glass Panel", description: "Maximum transparency and modern elegance", image: `${HUB}/railings/king-iron-works-railing-curved-glass.jpg` },
      { id: "cable", name: "Cable Railing", description: "Open sightlines with industrial character", image: `${HUB}/railings/king-iron-works-railing-curved-cable.jpg` },
      { id: "rod", name: "Metal Rod", description: "Classic vertical balusters in black steel", image: `${HUB}/railings/king-iron-works-railing-curved-rod.jpg` },
    ],
  },
  {
    slug: "floating-cantilever",
    name: "Floating Cantilever",
    subtitle: "Gravity-Defying Design",
    tagline: "Treads that hover in mid-air — pure engineering magic.",
    description: "Each tread is anchored by a hidden structural steel spine embedded in the wall. No visible supports, no stringer — just steps floating in space. The most dramatic way to connect two floors.",
    heroMobile: `${HUB}/heroes/mobile/king-iron-works-floating-cantilever-staircase.jpg`,
    heroDesktop: `${HUB}/heroes/desktop/king-iron-works-floating-cantilever-staircase.jpg`,
    tiers: [
      {
        id: "traditional",
        name: "Traditional",
        description: "Floating treads with classic iron railing",
        imageMobile: `${HUB}/tiers/mobile/king-iron-works-cantilever-traditional.jpg`,
        imageDesktop: `${HUB}/tiers/desktop/king-iron-works-cantilever-traditional.jpg`,
        features: ["Oak treads from wall", "Vertical picket railing", "Carpet runner option", "Traditional pendant"],
      },
      {
        id: "modern",
        name: "Modern",
        description: "Clean lines with cable railing",
        imageMobile: `${HUB}/tiers/mobile/king-iron-works-cantilever-modern.jpg`,
        imageDesktop: `${HUB}/tiers/desktop/king-iron-works-cantilever-modern.jpg`,
        features: ["Oak treads, no visible support", "Cable railing", "Concrete accent wall", "Minimal styling"],
      },
      {
        id: "luxury",
        name: "Luxury",
        description: "Glass railing, LED glow, stone wall",
        imageMobile: `${HUB}/tiers/mobile/king-iron-works-cantilever-luxury.jpg`,
        imageDesktop: `${HUB}/tiers/desktop/king-iron-works-cantilever-luxury.jpg`,
        features: ["Walnut treads from stone wall", "Frameless glass with brass handrail", "LED under-tread lighting", "Designer pendant lights"],
      },
      {
        id: "ultra-luxury",
        name: "Ultra-Luxury",
        description: "Backlit onyx, integrated LED handrail",
        imageMobile: `${HUB}/tiers/mobile/king-iron-works-cantilever-ultra-luxury.jpg`,
        imageDesktop: `${HUB}/tiers/desktop/king-iron-works-cantilever-ultra-luxury.jpg`,
        features: ["Black granite treads", "Backlit onyx feature wall", "Glass railing with LED handrail", "Pool views"],
      },
    ],
    railings: [
      { id: "glass", name: "Glass Panel", description: "Maximum transparency and modern elegance", image: `${HUB}/railings/king-iron-works-railing-cantilever-glass.jpg` },
      { id: "cable", name: "Cable Railing", description: "Open sightlines with industrial character", image: `${HUB}/railings/king-iron-works-railing-cantilever-cable.jpg` },
      { id: "rod", name: "Metal Rod", description: "Classic vertical balusters in black steel", image: `${HUB}/railings/king-iron-works-railing-cantilever-rod.jpg` },
    ],
  },
  {
    slug: "mono-stringer",
    name: "Mono-Stringer",
    subtitle: "The Center Beam",
    tagline: "One bold steel spine supporting every step.",
    description: "A single center beam stringer carries all the weight while the treads extend outward on both sides. Open risers let light pour through, creating a staircase that feels weightless despite its structural honesty.",
    heroMobile: `${HUB}/heroes/mobile/king-iron-works-mono-stringer-staircase.jpg`,
    heroDesktop: `${HUB}/heroes/desktop/king-iron-works-mono-stringer-staircase.jpg`,
    tiers: [
      {
        id: "traditional",
        name: "Traditional",
        description: "Center beam with classic balusters",
        imageMobile: `${HUB}/tiers/mobile/king-iron-works-mono-traditional.jpg`,
        imageDesktop: `${HUB}/tiers/desktop/king-iron-works-mono-traditional.jpg`,
        features: ["Oak treads on white stringer", "Vertical picket balusters", "Oak handrail", "Entry pendant"],
      },
      {
        id: "modern",
        name: "Modern",
        description: "Black steel beam with cable railing",
        imageMobile: `${HUB}/tiers/mobile/king-iron-works-mono-modern.jpg`,
        imageDesktop: `${HUB}/tiers/desktop/king-iron-works-mono-modern.jpg`,
        features: ["Oak on black steel center beam", "Cable railing with wood cap", "Open risers", "Modern pendant"],
      },
      {
        id: "luxury",
        name: "Luxury",
        description: "Glass panels, brass handrail, LED glow",
        imageMobile: `${HUB}/tiers/mobile/king-iron-works-mono-luxury.jpg`,
        imageDesktop: `${HUB}/tiers/desktop/king-iron-works-mono-luxury.jpg`,
        features: ["Walnut on dark steel stringer", "Glass panel with brass handrail", "LED underlighting", "Stone feature wall"],
      },
      {
        id: "ultra-luxury",
        name: "Ultra-Luxury",
        description: "Sculptural stringer, glass curtain wall",
        imageMobile: `${HUB}/tiers/mobile/king-iron-works-mono-ultra-luxury.jpg`,
        imageDesktop: `${HUB}/tiers/desktop/king-iron-works-mono-ultra-luxury.jpg`,
        features: ["Ebony on polished steel stringer", "Glass railing with LED handrail", "Glass curtain wall views", "Abstract sculpture"],
      },
    ],
    railings: [
      { id: "glass", name: "Glass Panel", description: "Maximum transparency and modern elegance", image: `${HUB}/railings/king-iron-works-railing-mono-glass.jpg` },
      { id: "cable", name: "Cable Railing", description: "Open sightlines with industrial character", image: `${HUB}/railings/king-iron-works-railing-mono-cable.jpg` },
      { id: "rod", name: "Metal Rod", description: "Classic vertical balusters in black steel", image: `${HUB}/railings/king-iron-works-railing-mono-rod.jpg` },
    ],
  },
  {
    slug: "spiral",
    name: "Spiral",
    subtitle: "Sculptural Helix",
    tagline: "A work of art that happens to be a staircase.",
    description: "Spiral staircases turn vertical space into a statement. Steps radiate from a central post in a continuous circular pattern — saving floor space while creating a mesmerizing focal point from every angle.",
    heroMobile: `${HUB}/heroes/mobile/king-iron-works-spiral-staircase.jpg`,
    heroDesktop: `${HUB}/heroes/desktop/king-iron-works-spiral-staircase.jpg`,
    tiers: [
      {
        id: "traditional",
        name: "Traditional",
        description: "Cherry wood treads, classic balusters",
        imageMobile: `${HUB}/tiers/mobile/king-iron-works-spiral-traditional.jpg`,
        imageDesktop: `${HUB}/tiers/desktop/king-iron-works-spiral-traditional.jpg`,
        features: ["Cherry wood treads", "Vertical picket balusters", "Curved wood handrail", "Warm classic feel"],
      },
      {
        id: "modern",
        name: "Modern",
        description: "Industrial loft, cable railing, exposed brick",
        imageMobile: `${HUB}/tiers/mobile/king-iron-works-spiral-modern.jpg`,
        imageDesktop: `${HUB}/tiers/desktop/king-iron-works-spiral-modern.jpg`,
        features: ["Oak treads with open risers", "Cable railing", "Industrial loft setting", "Exposed brick backdrop"],
      },
      {
        id: "luxury",
        name: "Luxury",
        description: "Glass railing, LED lighting, living room focal point",
        imageMobile: `${HUB}/tiers/mobile/king-iron-works-spiral-luxury.jpg`,
        imageDesktop: `${HUB}/tiers/desktop/king-iron-works-spiral-luxury.jpg`,
        features: ["Walnut treads", "Curved glass panel railing", "LED under-tread lighting", "Gas fireplace backdrop"],
      },
      {
        id: "ultra-luxury",
        name: "Ultra-Luxury",
        description: "Sculptural ribbon, glass interior, gold ceiling",
        imageMobile: `${HUB}/tiers/mobile/king-iron-works-spiral-ultra-luxury.jpg`,
        imageDesktop: `${HUB}/tiers/desktop/king-iron-works-spiral-ultra-luxury.jpg`,
        features: ["Glossy black steel ribbon", "Curved glass interior panel", "Gold leaf ceiling ring", "Freestanding art piece"],
      },
    ],
    railings: [
      { id: "glass", name: "Glass Panel", description: "Curved glass following the spiral form", image: `${HUB}/railings/king-iron-works-railing-spiral-glass.jpg` },
      { id: "cable", name: "Cable Railing", description: "Cables following the spiral curve", image: `${HUB}/railings/king-iron-works-railing-spiral-cable.jpg` },
      { id: "rod", name: "Metal Rod", description: "Vertical rods with curved handrail", image: `${HUB}/railings/king-iron-works-railing-spiral-rod.jpg` },
    ],
  },
  {
    slug: "traditional",
    name: "Traditional",
    subtitle: "Timeless Craft",
    tagline: "The staircase every home deserves — done right.",
    description: "Traditional staircases are the backbone of residential architecture. White risers, hardwood treads, and custom iron railings — elevated from standard to stunning. From modern farmhouse to classic colonial, we make the everyday extraordinary.",
    heroMobile: `${HUB}/heroes/mobile/king-iron-works-traditional-staircase.jpg`,
    heroDesktop: `${HUB}/heroes/desktop/king-iron-works-traditional-staircase.jpg`,
    tiers: [
      {
        id: "basic",
        name: "Classic",
        description: "Pine treads, wood balusters, carpet runner",
        imageMobile: `${HUB}/tiers/mobile/king-iron-works-traditional-basic.jpg`,
        imageDesktop: `${HUB}/tiers/desktop/king-iron-works-traditional-basic.jpg`,
        features: ["Pine treads", "White wood balusters", "Oak handrail", "Optional carpet runner"],
      },
      {
        id: "modern",
        name: "Modern",
        description: "Oak treads, black iron rods, shiplap walls",
        imageMobile: `${HUB}/tiers/mobile/king-iron-works-traditional-modern.jpg`,
        imageDesktop: `${HUB}/tiers/desktop/king-iron-works-traditional-modern.jpg`,
        features: ["White oak treads", "Black vertical rod balusters", "Oak handrail", "Modern farmhouse style"],
      },
      {
        id: "luxury",
        name: "Luxury",
        description: "Walnut treads, ornamental iron, wainscoting",
        imageMobile: `${HUB}/tiers/mobile/king-iron-works-traditional-luxury.jpg`,
        imageDesktop: `${HUB}/tiers/desktop/king-iron-works-traditional-luxury.jpg`,
        features: ["Walnut treads", "Ornamental iron with scrollwork", "Wainscoting walls", "Crystal chandelier"],
      },
      {
        id: "ultra-luxury",
        name: "Ultra-Luxury",
        description: "Mahogany, gold leaf ironwork, marble foyer",
        imageMobile: `${HUB}/tiers/mobile/king-iron-works-traditional-ultra-luxury.jpg`,
        imageDesktop: `${HUB}/tiers/desktop/king-iron-works-traditional-ultra-luxury.jpg`,
        features: ["Dark mahogany treads", "Hand-forged iron with gold leaf", "Marble floors", "Palatial chandelier"],
      },
    ],
    railings: [
      { id: "glass", name: "Glass Panel", description: "Modern glass on a traditional structure", image: `${HUB}/railings/king-iron-works-railing-traditional-glass.jpg` },
      { id: "cable", name: "Cable Railing", description: "Contemporary cables on classic stairs", image: `${HUB}/railings/king-iron-works-railing-traditional-cable.jpg` },
      { id: "rod", name: "Metal Rod", description: "Black vertical rods — the most popular choice", image: `${HUB}/railings/king-iron-works-railing-traditional-rod.jpg` },
    ],
  },
  {
    slug: "l-shaped",
    name: "L-Shaped",
    subtitle: "The Architectural Turn",
    tagline: "A landing that creates drama between floors.",
    description: "L-shaped staircases introduce a 90-degree turn with a generous landing platform. The turn creates natural architectural interest — perfect for a window, artwork, or a statement light fixture. Every L-shaped staircase is an opportunity for design.",
    heroMobile: `${HUB}/heroes/mobile/king-iron-works-l-shaped-staircase.jpg`,
    heroDesktop: `${HUB}/heroes/desktop/king-iron-works-l-shaped-staircase.jpg`,
    tiers: [
      {
        id: "basic",
        name: "Classic",
        description: "Oak treads, wood balusters, landing window",
        imageMobile: `${HUB}/tiers/mobile/king-iron-works-l-shaped-basic.jpg`,
        imageDesktop: `${HUB}/tiers/desktop/king-iron-works-l-shaped-basic.jpg`,
        features: ["Oak treads", "White wood balusters", "Landing with window", "Brass wall sconce"],
      },
      {
        id: "modern",
        name: "Modern",
        description: "Open risers, horizontal rods, clean landing",
        imageMobile: `${HUB}/tiers/mobile/king-iron-works-l-shaped-modern.jpg`,
        imageDesktop: `${HUB}/tiers/desktop/king-iron-works-l-shaped-modern.jpg`,
        features: ["Oak with open risers", "Horizontal rod railing", "Black steel stringer", "Modern pendant"],
      },
      {
        id: "luxury",
        name: "Luxury",
        description: "Glass railing, LED lighting, arched window",
        imageMobile: `${HUB}/tiers/mobile/king-iron-works-l-shaped-luxury.jpg`,
        imageDesktop: `${HUB}/tiers/desktop/king-iron-works-l-shaped-luxury.jpg`,
        features: ["Walnut treads", "Glass panel with brass handrail", "LED under-tread lighting", "Globe chandelier"],
      },
      {
        id: "ultra-luxury",
        name: "Ultra-Luxury",
        description: "Marble treads, laser-cut panels, cascading crystal",
        imageMobile: `${HUB}/tiers/mobile/king-iron-works-l-shaped-ultra-luxury.jpg`,
        imageDesktop: `${HUB}/tiers/desktop/king-iron-works-l-shaped-ultra-luxury.jpg`,
        features: ["Dark marble with brass inlay", "Laser-cut leaf panel railing", "Bronze handrail", "Crystal cascade chandelier"],
      },
    ],
    railings: [
      { id: "glass", name: "Glass Panel", description: "Frameless glass with brass handrail", image: `${HUB}/railings/king-iron-works-railing-l-shaped-glass.jpg` },
      { id: "cable", name: "Cable Railing", description: "Cables with wood top rail", image: `${HUB}/railings/king-iron-works-railing-l-shaped-cable.jpg` },
      { id: "rod", name: "Metal Rod", description: "Vertical metal rods with oak handrail", image: `${HUB}/railings/king-iron-works-railing-l-shaped-rod.jpg` },
    ],
  },
];

export function getStructure(slug: string): StaircaseStructure | undefined {
  return STRUCTURES.find((s) => s.slug === slug);
}
