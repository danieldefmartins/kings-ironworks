export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  featuredImage: string;
  publishedDate: string;
  readTime: string;
  tags: string[];
}

export const BLOG_CATEGORIES = [
  { id: "all", label: "ALL" },
  { id: "fire-escapes", label: "FIRE ESCAPES" },
  { id: "restoration", label: "RESTORATION" },
  { id: "railings", label: "RAILINGS" },
  { id: "guides", label: "GUIDES" },
];

const IMG_BASE =
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663313028198";

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "massachusetts-fire-escape-inspection-requirements-2026",
    title:
      "Massachusetts Fire Escape Inspection Requirements: The Complete 2026 Guide",
    excerpt:
      "Massachusetts law mandates fire escape inspections every five years. Learn what's required, who can inspect, consequences of non-compliance, and how to prepare.",
    category: "fire-escapes",
    featuredImage: `${IMG_BASE}/VrmKyMuovdgoFRfz.JPG`,
    publishedDate: "2026-02-25",
    readTime: "6 min read",
    tags: [
      "fire escapes",
      "inspections",
      "massachusetts",
      "building code",
      "compliance",
    ],
    content: `
      <p>Massachusetts law mandates that building owners inspect and certify fire escapes every five years under <strong>Massachusetts State Building Code Section 1001.3.3</strong>. Despite this clear requirement, many property owners remain uncertain about certification timelines, who can legally perform inspections, and the consequences of falling out of compliance.</p>

      <p>This guide covers everything you need to know to stay compliant in 2026 and beyond.</p>

      <h2>What the Law Requires</h2>

      <p>Under the Massachusetts State Building Code, <em>"all exterior fire escapes, steel or wooden stairways, egress balconies, and exterior bridges must be examined, tested, and certified"</em> every five years.</p>

      <p>Only two types of professionals are authorized to perform these inspections:</p>

      <ul>
        <li><strong>Massachusetts Registered Professional Engineers</strong></li>
        <li><strong>Licensed Fire Escape Installers</strong></li>
      </ul>

      <p>After inspection, the authorized professional must submit a signed affidavit to the local building official confirming the fire escape's condition and compliance.</p>

      <h2>What Structures Are Covered?</h2>

      <p>The inspection requirement applies to more than just traditional fire escapes. It covers:</p>

      <ul>
        <li>Exterior fire escapes (ladder and platform type)</li>
        <li>Steel or wooden exterior stairways serving as egress</li>
        <li>Egress balconies connected to emergency exit paths</li>
        <li>Exterior bridges between buildings used for emergency exit</li>
      </ul>

      <p>These requirements extend across all building types — residential apartments, commercial properties, mixed-use buildings, and industrial spaces.</p>

      <h2>The Inspection Checklist</h2>

      <p>A certified inspector will evaluate the following areas during a fire escape inspection:</p>

      <ul>
        <li><strong>Structural integrity</strong> — frames, supports, brackets, and wall connections are examined for stability and load-bearing capacity</li>
        <li><strong>Rust and corrosion</strong> — surface and deep corrosion patterns are documented, especially at joints and connection points</li>
        <li><strong>Stairs, treads, and landings</strong> — checked for warping, cracking, missing components, and proper tread depth</li>
        <li><strong>Railings and guardrails</strong> — tested for stability, proper height, and spacing between balusters</li>
        <li><strong>Hardware and fasteners</strong> — bolts, anchors, and connectors are inspected for looseness or deterioration</li>
        <li><strong>Paint and protective coatings</strong> — evaluated for peeling, bubbling, or failure that could expose metal to the elements</li>
      </ul>

      <h2>Consequences of Non-Compliance</h2>

      <p>Failing to maintain current fire escape certification carries serious risks:</p>

      <ul>
        <li><strong>Municipal fines</strong> — up to $50 per offense, with continuing violations accruing up to $10 per day until the issue is resolved</li>
        <li><strong>Insurance claim denials</strong> — if an injury occurs on an uncertified fire escape, your insurance carrier may deny the claim entirely</li>
        <li><strong>Safety liability</strong> — undetected structural problems put tenants, employees, and visitors at risk</li>
      </ul>

      <p>The financial exposure from an insurance denial or liability claim far exceeds the cost of regular inspections and maintenance.</p>

      <h2>How to Prepare for Your Inspection</h2>

      <p>Taking a few steps before your scheduled inspection can save time and help ensure a smooth process:</p>

      <ol>
        <li><strong>Clear the fire escape</strong> — remove all items including furniture, plants, storage containers, and debris</li>
        <li><strong>Ensure full access</strong> — make sure the inspector can reach every level and component without obstruction</li>
        <li><strong>Locate previous records</strong> — have your last certification and any repair documentation available</li>
        <li><strong>Do a visual walk-through</strong> — note any obvious rust, loose railings, or damaged treads so you can discuss them with the inspector</li>
        <li><strong>Schedule during good weather</strong> — inspections require safe outdoor conditions for accurate assessment</li>
      </ol>

      <h2>What Happens After the Inspection?</h2>

      <h3>If Your Fire Escape Passes</h3>
      <p>You'll receive certification valid for the next five years. Keep the documentation on file — your local building department and insurance company may request it at any time.</p>

      <h3>If Your Fire Escape Fails</h3>
      <p>The inspector will document specific issues that must be repaired before re-certification can be issued. Common repairs include:</p>

      <ul>
        <li>Rust remediation and surface treatment</li>
        <li>Railing replacement or reinforcement</li>
        <li>Stair tread and landing repair</li>
        <li>Rebolting and re-anchoring to the building</li>
        <li>Full repainting with protective coatings</li>
      </ul>

      <p>Once repairs are completed, a follow-up inspection is required to issue the certification.</p>

      <h2>Schedule Your Fire Escape Inspection</h2>

      <p>King Iron Works is a <strong>Licensed Fire Escape Installer</strong> offering inspection, certification, and repair services across Massachusetts and Florida. With 20+ years of experience and a full fabrication facility, we handle everything from routine inspections to complete fire escape replacement.</p>

      <p>Contact us at <a href="tel:16174042589"><strong>+1 617-404-2589</strong></a> or <a href="mailto:info@kingsironworks.com"><strong>info@kingsironworks.com</strong></a> to schedule your inspection.</p>
    `,
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

export function getPostsByCategory(category: string): BlogPost[] {
  if (category === "all") return BLOG_POSTS;
  return BLOG_POSTS.filter((post) => post.category === category);
}
