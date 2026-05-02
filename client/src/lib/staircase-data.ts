// ---------------------------------------------------------------------------
// Staircase Types — Central Data
// ---------------------------------------------------------------------------

const NEW = "/images/new-portfolio/staircase";
const LOCAL = "/images/portfolio";
const HERO = "/images/staircases";

export interface GalleryPhoto {
  src: string;
  alt: string;
}

export interface StaircaseType {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  heroImage: string;
  features: string[];
  materials: string[];
  bestFor: string[];
  galleryPhotos: GalleryPhoto[];
  relatedTypes: string[];
}

export const STAIRCASE_TYPES: StaircaseType[] = [
  {
    slug: "curved",
    name: "Curved & Helical",
    tagline: "When steel curves like silk — the staircase that commands every room it enters.",
    description: "A sweeping curved staircase is the ultimate architectural statement. Each one is custom-bent and hand-forged in our shop, following a precise radius that flows from floor to floor with effortless grace. No straight lines, no sharp angles — just a continuous, sculptural curve that draws the eye and stops you in your tracks. Our helical staircases are engineered without a center column, creating an open, flowing form that's as structurally impressive as it is beautiful.",
    heroImage: `${HERO}/curved-hero.png`,
    features: [
      "Custom radius engineering — every curve built to your space",
      "No center column — open helical design",
      "Hand-forged scrollwork and ornamental details",
      "Compatible with marble, wood, or stone treads",
      "Continuous flowing handrail bent to match the curve",
      "Structural engineering included in every project",
    ],
    materials: ["Wrought Iron", "Forged Steel", "Bronze Accents", "Copper Leaf Details"],
    bestFor: ["Grand foyers", "Luxury homes", "Double-height entryways", "Historic renovations"],
    galleryPhotos: [
      { src: `${NEW}/IMG_7895.JPEG`, alt: "A grand curved staircase that commands the room from the moment you walk in" },
      { src: `${NEW}/IMG_8609.JPG`, alt: "Every curve tells a story — forged copper leaves and flowing iron in perfect harmony" },
      { src: `${NEW}/IMG_8615.JPG`, alt: "Where old-world craftsmanship meets new-world luxury — our signature curved railing" },
      { src: `${NEW}/FullSizeRender.jpg`, alt: "When steel curves like silk — our signature curved railing" },
      { src: `${NEW}/IMG_8750.JPG`, alt: "The details that stop you mid-step — hand-forged artistry you can feel" },
      { src: `${NEW}/IMG_4146.JPEG`, alt: "Crafted by hand in our shop — a curved stringer ready for its new home" },
    ],
    relatedTypes: ["grand", "ornamental", "spiral"],
  },
  {
    slug: "floating",
    name: "Floating & Cantilevered",
    tagline: "Treads that hover in mid-air — engineering precision disguised as pure magic.",
    description: "Floating staircases create the illusion of weightlessness. Each tread is anchored by a hidden structural steel spine embedded in the wall, making the steps appear to float in space. The result is an open, airy staircase that floods your home with light and creates a sense of modern luxury. Pair with glass railings for maximum transparency, or go with a single steel handrail for minimalist impact.",
    heroImage: `${HERO}/floating-hero.png`,
    features: [
      "Hidden structural steel spine — no visible support",
      "Cantilevered treads engineered for residential and commercial loads",
      "LED under-tread lighting available",
      "Glass, cable, or rod railing options",
      "Compatible with oak, walnut, or composite treads",
      "Mono-stringer and dual-stringer configurations",
    ],
    materials: ["Structural Steel", "Stainless Steel", "Tempered Glass", "Hardwood Treads"],
    bestFor: ["Modern homes", "Open-concept living", "Lofts", "Contemporary renovations"],
    galleryPhotos: [
      { src: `${NEW}/IMG_3906.JPEG`, alt: "Where engineering meets elegance — a mono-stringer floating staircase wrapped in glass" },
      { src: `${NEW}/IMG_3907.JPEG`, alt: "Looking down through glass — an open staircase that connects every level" },
      { src: `${NEW}/IMG_3276.JPEG`, alt: "Every step glows — LED-lit floating treads that redefine what a staircase can be" },
      { src: `${NEW}/IMG_7991.JPEG`, alt: "Floating treads meet LED lighting — modern luxury that glows from within" },
      { src: `${NEW}/IMG_7963.JPEG`, alt: "A bird's-eye view of floating treads bathed in light — architecture as art" },
      { src: `${NEW}/IMG_0863.JPEG`, alt: "Designed to float, built to last — modern craftsmanship at its finest" },
      { src: `${NEW}/IMG_0577.JPEG`, alt: "Clean lines, open living — a staircase built for the modern home" },
      { src: `${NEW}/142ec8ae-fff5-44e3-9b6f-2b2121b099d6.jpg`, alt: "Three flights of floating precision — steel and wood in perfect balance" },
      { src: `${NEW}/592e2faf-48d6-44e5-8b91-03d4457231f4.jpg`, alt: "Glass, steel, and light wood — a staircase that disappears into the architecture" },
      { src: `${NEW}/IMG_2633.JPEG`, alt: "Where glass meets steel — a floating staircase bathed in natural light" },
      { src: `${NEW}/IMG_6519.JPEG`, alt: "Three stories of floating perfection — oak treads, steel spine, glass railings" },
      { src: `${NEW}/IMG_9430.JPEG`, alt: "Modern farmhouse meets industrial steel — floating treads on a shiplap backdrop" },
      { src: `${NEW}/IMG_9449.JPEG`, alt: "Thick-cut oak floating on a single steel spine — the staircase that anchors the room" },
      { src: `${NEW}/IMG_8247.JPEG`, alt: "Floating treads meet horizontal iron — contemporary railing that lets light pour through" },
    ],
    relatedTypes: ["glass-panel", "straight-modern", "metal-wood"],
  },
  {
    slug: "spiral",
    name: "Spiral",
    tagline: "A sculptural helix that turns vertical space into a work of art.",
    description: "Spiral staircases are the ultimate space-saving solution that doubles as a sculptural centerpiece. Steps radiate from a central post in a continuous circular pattern, creating a mesmerizing visual effect from every angle. From tight residential spirals to wide commercial showpieces, we forge each one to fit your exact dimensions. Our spiral staircases are available in ornamental wrought iron, sleek modern steel, or industrial raw finishes.",
    heroImage: `${HERO}/spiral-hero.png`,
    features: [
      "Custom diameter — from tight 4ft to wide 8ft+",
      "Decorative or minimalist baluster options",
      "Code-compliant tread depth and headroom clearance",
      "Indoor and outdoor rated",
      "Matching landing platform and guard rail",
      "Fits through standard ceiling openings",
    ],
    materials: ["Wrought Iron", "Steel", "Powder-Coated Finishes", "Wood or Metal Treads"],
    bestFor: ["Lofts", "Small homes", "Rooftop access", "Wine cellars", "Mezzanines"],
    galleryPhotos: [
      { src: `${NEW}/15414fcf-625a-4e55-860a-ab1fefbb89e6.jpg`, alt: "Where artistry meets architecture — a spiral masterpiece viewed from above" },
      { src: `${NEW}/85f3d185-6628-421c-916c-b94e6affc98f.jpg`, alt: "Two stories of hand-forged artistry winding through a luxury foyer" },
      { src: `${NEW}/FullSizeRender-5.jpg`, alt: "A sculptural spiral that commands every room it enters" },
      { src: `${NEW}/FullSizeRender-6.jpg`, alt: "Raw steel, refined design — an industrial spiral that owns the room" },
    ],
    relatedTypes: ["curved", "ornamental", "industrial"],
  },
  {
    slug: "straight-modern",
    name: "Straight Modern",
    tagline: "Clean lines, bold contrast — the staircase that anchors a modern home.",
    description: "Don't mistake simple for ordinary. A straight modern staircase is the backbone of contemporary architecture — clean geometric lines, precise angles, and intentional minimalism that makes a powerful statement. Our straight designs feature exposed steel stringers, hidden fasteners, and premium tread materials that transform a functional element into the defining feature of your space.",
    heroImage: `${HERO}/straight-modern-hero.png`,
    features: [
      "Single or double steel stringer options",
      "Open or closed riser configurations",
      "Horizontal rod, cable, or glass railing",
      "Hidden connection hardware",
      "Wide-plank hardwood or steel treads",
      "Under-stair storage integration possible",
    ],
    materials: ["Powder-Coated Steel", "Stainless Steel", "Hardwood", "Glass Panels"],
    bestFor: ["Contemporary homes", "Minimalist interiors", "Commercial offices", "Retail spaces"],
    galleryPhotos: [
      { src: `${NEW}/IMG_5329.JPEG`, alt: "Clean lines, bold contrast — the modern staircase that anchors a luxury home" },
      { src: `${NEW}/IMG_0577.JPEG`, alt: "Clean lines, open living — a staircase built for the modern home" },
      { src: `${NEW}/IMG_2559.JPEG`, alt: "The zigzag stringer — structural art hiding in plain sight" },
    ],
    relatedTypes: ["floating", "cable-railing", "metal-wood"],
  },
  {
    slug: "l-shaped",
    name: "L-Shaped & Quarter-Turn",
    tagline: "The architectural pause — a landing that creates drama between floors.",
    description: "L-shaped staircases introduce a 90-degree turn with a generous landing platform, creating natural architectural interest and a sense of journey between floors. The landing offers a moment of pause — perfect for a window, artwork, or a statement light fixture. Our L-shaped designs range from traditional with ornamental iron balusters to sleek contemporary with glass or cable railings.",
    heroImage: `${HERO}/l-shaped-hero.png`,
    features: [
      "90-degree quarter-turn with landing platform",
      "Customizable landing size and position",
      "Multiple railing style options",
      "Sound privacy between floors",
      "Ideal for corner placements",
      "Window or niche integration at landing",
    ],
    materials: ["Steel Frame", "Iron Balusters", "Hardwood Treads", "Stone Options"],
    bestFor: ["Corner placements", "Traditional homes", "Entryways", "Multi-story residences"],
    galleryPhotos: [
      { src: `${NEW}/IMG_2559.JPEG`, alt: "The zigzag stringer — structural art hiding in plain sight" },
    ],
    relatedTypes: ["switchback", "straight-modern", "ornamental"],
  },
  {
    slug: "switchback",
    name: "U-Shaped & Switchback",
    tagline: "Two flights, one dramatic statement — the staircase that owns the room.",
    description: "U-shaped switchback staircases feature two parallel flights connected by a 180-degree landing, creating a commanding vertical presence. The wide landing provides generous circulation space and the dual flights create visual drama when viewed from any angle. Our switchback designs are popular in homes with generous floor plans where the staircase serves as the central architectural feature.",
    heroImage: `${HERO}/switchback-hero.png`,
    features: [
      "180-degree turn with spacious landing",
      "Dual parallel flights for dramatic effect",
      "Multiple railing and baluster options",
      "Open or enclosed configurations",
      "Multi-story capability",
      "Under-stair utility space",
    ],
    materials: ["Steel Stringers", "Iron Railings", "Hardwood or Stone Treads"],
    bestFor: ["Large homes", "Commercial lobbies", "Multi-story buildings", "Grand entrances"],
    galleryPhotos: [
      { src: `${NEW}/IMG_4789.JPEG`, alt: "Bold steel, warm oak — a switchback staircase that commands the room" },
      { src: `${NEW}/IMG_4842.JPEG`, alt: "Architectural drama from basement to sky — a three-story statement piece" },
    ],
    relatedTypes: ["l-shaped", "grand", "straight-modern"],
  },
  {
    slug: "grand",
    name: "Grand & Monumental",
    tagline: "The entrance you'll never forget — iron, marble, and crystal in harmony.",
    description: "Grand monumental staircases are the crown jewel of luxury architecture. Extra-wide treads, sweeping curves, and elaborate hand-forged ironwork create an unforgettable first impression. These are the staircases you see in historic estates, luxury hotels, and the homes of people who understand that architecture is art. Every element — from the gold leaf accents to the hand-forged scrollwork — is crafted to command attention and inspire awe.",
    heroImage: `${HERO}/grand-hero.png`,
    features: [
      "Extra-wide treads for dramatic proportions",
      "Hand-forged scrollwork and ornamental details",
      "Gold leaf, copper, or bronze accent options",
      "Marble, granite, or premium stone treads",
      "Crystal chandelier integration",
      "Multi-landing configurations for palatial spaces",
    ],
    materials: ["Hand-Forged Iron", "Gold Leaf", "Bronze", "Marble", "Premium Stone"],
    bestFor: ["Luxury estates", "Hotel lobbies", "Historic mansions", "Palatial residences"],
    galleryPhotos: [
      { src: `${NEW}/c8112adf-ebb3-46e7-af71-19ed1d2f8c68.jpg`, alt: "The grand entrance redefined — iron, marble, and crystal in harmony" },
      { src: `${NEW}/IMG_6934.JPEG`, alt: "Every scroll tells a story — over 1,000 hours of hand-forged ironwork" },
      { src: `${NEW}/IMG_6953.JPEG`, alt: "Where old-world artistry meets new-world luxury" },
      { src: `${NEW}/IMG_8334.JPEG`, alt: "A grand entrance deserves grand ironwork — sweeping scrolls and gold accents" },
      { src: `${NEW}/IMG_8352.JPEG`, alt: "When the railing is the centerpiece — ornate ironwork commanding a double-height foyer" },
    ],
    relatedTypes: ["curved", "ornamental", "bifurcated"],
  },
  {
    slug: "ornamental",
    name: "Ornamental & Wrought Iron",
    tagline: "Hand-forged leaves, scrolls, and stories told in iron — every detail by hand.",
    description: "Ornamental wrought iron staircases are living art. Every leaf, scroll, rosette, and vine is individually hand-forged by our craftsmen — heated, hammered, and shaped into forms that no machine can replicate. This is ironwork as it was done for centuries, elevated with modern engineering and finishing techniques. Each baluster panel is unique, each handrail joint seamless, each detail deliberate.",
    heroImage: `${HERO}/ornamental-hero.png`,
    features: [
      "Every element hand-forged — no cast or stamped parts",
      "Custom design consultation included",
      "Leaf, scroll, rosette, and vine motifs",
      "Patina, oil-rubbed, or painted finishes",
      "Period-accurate styles available for historic homes",
      "Matching newel posts and handrail terminations",
    ],
    materials: ["Hand-Forged Wrought Iron", "Steel", "Copper Accents", "Bronze"],
    bestFor: ["Historic homes", "Luxury estates", "Victorian restorations", "Custom residences"],
    galleryPhotos: [
      { src: `${NEW}/9DC80090-2970-42FC-AAA9-73CF9F5CD276.jpg`, alt: "Hand-forged scrollwork that turns a staircase into a masterpiece" },
      { src: `${NEW}/IMG_8609.JPG`, alt: "Every curve tells a story — forged copper leaves and flowing iron in perfect harmony" },
      { src: `${NEW}/IMG_8750.JPG`, alt: "The details that stop you mid-step — hand-forged artistry you can feel" },
      { src: `${NEW}/IMG_8615.JPG`, alt: "Where old-world craftsmanship meets new-world luxury — our signature curved railing" },
    ],
    relatedTypes: ["curved", "grand", "spiral"],
  },
  {
    slug: "glass-panel",
    name: "Glass Panel Railing",
    tagline: "Stainless steel and glass turn sunlight into sculpture.",
    description: "Glass panel railings transform a staircase into a transparent, light-filled architectural element. Frameless tempered glass panels are held by precision-machined stainless steel or aluminum standoffs, creating an almost invisible barrier that maximizes sightlines and light flow. The effect is a staircase that feels open, spacious, and unmistakably modern. Perfect for homes where the view — inside or out — is everything.",
    heroImage: `${HERO}/glass-panel-hero.png`,
    features: [
      "Frameless tempered safety glass panels",
      "Stainless steel or aluminum standoff mounts",
      "Top-mounted or side-mounted configurations",
      "Clear, frosted, or tinted glass options",
      "Stainless steel or wood cap rail",
      "Code-compliant panel thickness and dimensions",
    ],
    materials: ["Tempered Glass", "Stainless Steel", "Aluminum", "Brushed or Polished Finishes"],
    bestFor: ["Modern homes", "Open-concept spaces", "Waterfront properties", "Contemporary offices"],
    galleryPhotos: [
      { src: `${NEW}/IMG_3906.JPEG`, alt: "Where engineering meets elegance — a mono-stringer floating staircase wrapped in glass" },
      { src: `${NEW}/IMG_3907.JPEG`, alt: "Looking down through glass — an open staircase that connects every level" },
      { src: `${NEW}/IMG_4934.JPEG`, alt: "Stainless steel and glass turn sunlight into sculpture" },
      { src: `${NEW}/IMG_4726.JPG`, alt: "Gold-tone steel and glass — luxury detailing that elevates every entrance" },
      { src: `${NEW}/592e2faf-48d6-44e5-8b91-03d4457231f4.jpg`, alt: "Glass, steel, and light wood — a staircase that disappears into the architecture" },
      { src: `${NEW}/IMG_2633.JPEG`, alt: "Where glass meets steel — a floating staircase bathed in natural light" },
    ],
    relatedTypes: ["floating", "cable-railing", "straight-modern"],
  },
  {
    slug: "cable-railing",
    name: "Cable Railing",
    tagline: "Thin lines of stainless steel that frame your view without blocking it.",
    description: "Cable railing systems use thin, tensioned stainless steel cables running horizontally between sleek metal posts. The result is a railing that provides safety without obstruction — maintaining open sightlines and a contemporary aesthetic. Our cable railings are engineered for proper tension, code-compliant spacing, and long-term durability in both interior and exterior environments.",
    heroImage: `${HERO}/cable-railing-hero.png`,
    features: [
      "Marine-grade stainless steel cables",
      "Adjustable tensioning hardware",
      "Wood, steel, or composite post options",
      "Interior and exterior rated",
      "Code-compliant cable spacing",
      "Low maintenance — no painting or staining",
    ],
    materials: ["Stainless Steel Cable", "Steel Posts", "Wood or Metal Top Rail"],
    bestFor: ["Deck staircases", "Waterfront homes", "Modern interiors", "Outdoor applications"],
    galleryPhotos: [
      { src: `${LOCAL}/cable-railing/cable-railing-1.jpg`, alt: "Custom cable railing system" },
      { src: `${LOCAL}/cable-railing/cable-railing-2.jpg`, alt: "Cable railing installation" },
    ],
    relatedTypes: ["glass-panel", "floating", "straight-modern"],
  },
  {
    slug: "metal-wood",
    name: "Metal & Wood",
    tagline: "Reclaimed timber, forged steel — where rustic warmth meets modern craft.",
    description: "The combination of metal and wood brings together two timeless materials in a way that feels both warm and strong. Thick-cut hardwood treads paired with exposed steel stringers create a staircase with character — each piece of wood unique, each weld deliberate. This style works beautifully in farmhouses, lofts, and transitional homes where you want the honesty of natural materials with the strength of structural steel.",
    heroImage: `${HERO}/metal-wood-hero.png`,
    features: [
      "Live-edge, reclaimed, or dimensional lumber options",
      "Exposed or hidden steel stringer",
      "Mixed metal finishes available",
      "Iron pipe, rod, or cable railing pairings",
      "Custom wood species selection",
      "Natural oil, stain, or sealed finish options",
    ],
    materials: ["Steel Stringer", "Hardwood Treads", "Iron Railing", "Reclaimed Timber"],
    bestFor: ["Farmhouses", "Transitional homes", "Lofts", "Rustic-modern interiors"],
    galleryPhotos: [
      { src: `${NEW}/IMG_0777.jpg`, alt: "Reclaimed timber, forged steel — where rustic warmth meets modern craft" },
      { src: `${NEW}/IMG_9430.JPEG`, alt: "Modern farmhouse meets industrial steel — floating treads on a shiplap backdrop" },
      { src: `${NEW}/IMG_9449.JPEG`, alt: "Thick-cut oak floating on a single steel spine — the staircase that anchors the room" },
      { src: `${NEW}/IMG_4789.JPEG`, alt: "Bold steel, warm oak — a switchback staircase that commands the room" },
    ],
    relatedTypes: ["floating", "industrial", "straight-modern"],
  },
  {
    slug: "industrial",
    name: "Industrial",
    tagline: "Raw steel, exposed welds, zero pretense — built like it means it.",
    description: "Industrial staircases celebrate the raw beauty of steel. Exposed welds, diamond plate treads, pipe railings, and visible structural connections create an authentic aesthetic that's as honest as it is striking. This style doesn't hide the engineering — it puts it on display. Perfect for converted warehouses, urban lofts, and commercial spaces that want their architecture to tell a story of strength and purpose.",
    heroImage: `${HERO}/industrial-hero.png`,
    features: [
      "Exposed structural connections and welds",
      "Diamond plate or checker plate treads",
      "Pipe or tube railing systems",
      "Raw, galvanized, or powder-coated finishes",
      "Heavy-duty commercial-grade construction",
      "Open or perforated risers",
    ],
    materials: ["Raw Steel", "Galvanized Steel", "Diamond Plate", "Iron Pipe"],
    bestFor: ["Lofts", "Warehouses", "Breweries", "Urban commercial", "Gyms"],
    galleryPhotos: [
      { src: `${NEW}/FullSizeRender-6.jpg`, alt: "Raw steel, refined design — an industrial spiral that owns the room" },
      { src: `${NEW}/IMG_5273.JPEG`, alt: "Where it all begins — sparks fly as our craftsmen shape raw steel into art" },
      { src: `${NEW}/IMG_8464.JPEG`, alt: "Born in the shop, built for a lifetime — every staircase starts with raw steel" },
    ],
    relatedTypes: ["metal-wood", "spiral", "straight-modern"],
  },
  {
    slug: "outdoor",
    name: "Outdoor & Exterior",
    tagline: "Built for the elements — beauty that weathers every storm.",
    description: "Outdoor staircases require materials and engineering that can handle rain, snow, salt air, and temperature extremes. Our exterior staircases are built with galvanized or powder-coated steel, marine-grade hardware, and weather-resistant tread materials. From elegant deck access stairs to functional fire escapes, every exterior staircase we build is designed to look great and last decades without maintenance.",
    heroImage: `${HERO}/outdoor-hero.png`,
    features: [
      "Hot-dip galvanized or powder-coated finishes",
      "Marine-grade stainless steel hardware",
      "Anti-slip tread surfaces",
      "Weather-resistant in all climates",
      "Code-compliant for exterior applications",
      "Stone, concrete, or composite tread options",
    ],
    materials: ["Galvanized Steel", "Powder-Coated Steel", "Stainless Hardware", "Stone Treads"],
    bestFor: ["Decks", "Patios", "Rooftop access", "Commercial buildings", "Coastal properties"],
    galleryPhotos: [],
    relatedTypes: ["cable-railing", "industrial", "straight-modern"],
  },
  {
    slug: "bifurcated",
    name: "Bifurcated & Split",
    tagline: "One flight becomes two — the staircase that makes you feel like royalty.",
    description: "The bifurcated staircase — also known as an imperial or split staircase — begins as a single wide flight and splits into two symmetric flights at a central landing. This is the iconic 'Titanic' staircase, the grand hotel lobby entrance, the design that makes everyone who walks it feel like the main character. It's the most dramatic staircase configuration possible, and we build each one as a custom work of art.",
    heroImage: `${HERO}/bifurcated-hero.png`,
    features: [
      "Single lower flight splitting to two upper flights",
      "Symmetric or asymmetric configurations",
      "Elaborate ornamental railing options",
      "Extra-wide treads for ceremonial proportions",
      "Central landing as a focal point",
      "Compatible with any railing style",
    ],
    materials: ["Hand-Forged Iron", "Steel", "Marble Treads", "Bronze Accents"],
    bestFor: ["Luxury estates", "Hotel lobbies", "Event venues", "Palatial homes"],
    galleryPhotos: [],
    relatedTypes: ["grand", "curved", "ornamental"],
  },
];

export function getStaircaseType(slug: string): StaircaseType | undefined {
  return STAIRCASE_TYPES.find((t) => t.slug === slug);
}

export function getRelatedTypes(slugs: string[]): StaircaseType[] {
  return slugs
    .map((s) => STAIRCASE_TYPES.find((t) => t.slug === s))
    .filter((t): t is StaircaseType => t !== undefined);
}
