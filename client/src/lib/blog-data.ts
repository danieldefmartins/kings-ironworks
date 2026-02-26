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
  {
    slug: "warning-signs-fire-escape-needs-repair",
    title: "5 Warning Signs Your Fire Escape Needs Immediate Repair",
    excerpt:
      "Rust, loose railings, sagging platforms? Learn the 5 warning signs that mean your fire escape needs repair now — before it becomes a safety hazard or code violation.",
    category: "fire-escapes",
    featuredImage: `${IMG_BASE}/PmBUKqXwdDkeqflj.JPG`,
    publishedDate: "2026-02-25",
    readTime: "6 min read",
    tags: [
      "fire escape repair",
      "rust damage",
      "fire escape safety",
      "boston",
      "structural damage",
    ],
    content: `
      <p>Here's something we see all the time: a building owner walks past their fire escape every single day, and because the problems happen gradually — a little more rust here, a little more wobble there — they don't realize how bad things have gotten until an inspector shows up and fails the whole structure.</p>

      <p>The truth is, most fire escape problems don't happen overnight. They build up over years of New England weather, deferred maintenance, and the simple passage of time. But the good news? The warning signs are usually pretty obvious once you know what to look for.</p>

      <p>We've been inspecting, repairing, and building fire escapes across Boston for over 20 years. Here are the five signs we tell every property owner to watch for — and what to do about each one.</p>

      <h2>1. Rust and Corrosion (Especially at Connection Points)</h2>

      <p>This is the big one. Rust is the number one enemy of fire escapes in New England, and it's not hard to understand why. Our buildings deal with rain, snow, ice, road salt, and freeze-thaw cycles for roughly half the year. All of that moisture accelerates oxidation on exposed metal — and fire escapes are about as exposed as it gets.</p>

      <p>Now, a little surface rust isn't necessarily an emergency. That's the orange-brown discoloration you'll see on the surface of the metal, and it can usually be addressed with proper scraping, priming, and repainting with a rust-inhibitive coating.</p>

      <p>What you need to worry about is <strong>deep corrosion</strong>. That's when the rust has eaten into the metal itself — you'll see flaking, pitting, or metal that feels thin and brittle to the touch. Pay special attention to connection points where the fire escape meets the building wall, bolts, welds, and the underside of platforms and treads. These are the areas that trap moisture and corrode first.</p>

      <p><strong>How to spot it:</strong> Look for orange or reddish-brown discoloration, flaking metal, or areas where the paint is bubbling from underneath. Tap suspect areas with a wrench — if the metal sounds hollow or crumbles, that's deep corrosion and it needs professional attention immediately.</p>

      <h2>2. Loose, Missing, or Wobbly Railings</h2>

      <p>Railings are one of the most critical safety features on a fire escape. During an actual emergency — when people are moving quickly, possibly in the dark, possibly in a panic — railings are what keep someone from falling off an open platform several stories above the ground.</p>

      <p>So when railings start to wobble, pull away from their posts, or go missing entirely, it's a serious problem. And it's one of the most common issues we see during inspections.</p>

      <p>The usual culprits are corroded bolts, weakened welds, and fasteners that have loosened over time due to thermal expansion and contraction (metal expands in summer heat and contracts in winter cold — over the years, this loosens connections). Sometimes it's as simple as tightening or replacing hardware. Other times, the railing itself has deteriorated to the point where it needs to be replaced.</p>

      <p><strong>How to spot it:</strong> Give each railing a firm shake. It should feel completely solid with zero movement. If there's any give, any rocking, or if you can see daylight where the railing meets its post or the wall — that's a repair that shouldn't wait.</p>

      <h2>3. Sagging or Uneven Platforms and Landings</h2>

      <p>Every landing platform on a fire escape is designed to support a specific load. When you step onto a platform and it feels like it's dipping, bouncing, or tilting to one side, that's a sign that the structural supports underneath are compromised.</p>

      <p>This can happen for a few reasons. The support brackets that connect the platform to the building may be corroded or pulling away from the masonry. The platform itself may have metal fatigue — especially in older fire escapes that have been through decades of weather cycles. Or the anchor bolts may have loosened or failed.</p>

      <p>This is one where we always tell people: if it doesn't feel right, trust your instincts. A platform that sags under the weight of one person could fail entirely under the weight of multiple people during an actual evacuation.</p>

      <p><strong>How to spot it:</strong> Stand on each platform and pay attention to how it feels. Is it level? Does it flex or bounce? Look at the underside (from the ground or floor below) for visible sagging, bent supports, or gaps between the brackets and the building wall.</p>

      <h2>4. Damaged or Deteriorating Stairs and Treads</h2>

      <p>The stairs are the part of the fire escape that takes the most abuse. They carry all the foot traffic, collect the most water and debris, and because they're angled, water tends to pool at the edges and in the connection points rather than draining away cleanly.</p>

      <p>Over time, this leads to thinning metal on the treads, holes or perforations where rust has eaten through, cracked or broken welds at the stringer connections, and warped or bent steps that no longer sit flat.</p>

      <p>And here's the thing most people don't think about: <strong>the drop ladder</strong>. That's the counterbalanced ladder on the lowest landing that's designed to swing down to the ground so people can climb to safety. If it's rusted in place, jammed, or the mechanism is broken — the entire fire escape is effectively unusable from the street level. We check these on every inspection, and you'd be surprised how often they're frozen solid.</p>

      <p><strong>How to spot it:</strong> Walk each flight of stairs and feel for treads that flex, rock, or feel thinner than they should. Look for visible holes, cracks at the welds, or steps that are no longer level. And test the drop ladder — if it doesn't swing freely, it needs servicing.</p>

      <h2>5. Peeling Paint and Exposed Bare Metal</h2>

      <p>We know — peeling paint doesn't sound like a big deal. It sounds like a cosmetic issue, like something you'd get around to when the building gets its next facelift.</p>

      <p>But on a fire escape, paint isn't decoration — it's protection. The <strong>Massachusetts State Building Code (Section 1001.3.1)</strong> specifically requires that fire escapes be maintained with weather-protecting products applied as often as necessary to keep them in safe condition. That protective coating is the barrier between the metal and moisture. When it fails, you're essentially watching the clock start on every other problem on this list.</p>

      <p>Peeling, bubbling, cracking, or flaking paint — especially if you can see bare metal underneath — means that section of the fire escape is actively being attacked by the elements. Left alone, surface rust becomes deep corrosion, and deep corrosion becomes a structural problem.</p>

      <p>The fix isn't complicated: proper scraping down to clean metal, rust-inhibitive primer, and a quality enamel-based paint. But the key is doing it before the damage goes deeper. A paint job today can prevent a major structural repair next year.</p>

      <p><strong>How to spot it:</strong> Do a visual scan from the ground — you can often see peeling and flaking paint even from street level. Look for patches of orange showing through the paint, bubbling sections (a sign that rust is forming underneath), or areas where bare metal is clearly exposed.</p>

      <h2>So You Spotted a Problem. Now What?</h2>

      <p>First off — don't panic, but don't sit on it either. Fire escape problems get worse with time, never better. What's a minor repair today can become a major structural project (and a much bigger bill) if you leave it for another winter.</p>

      <p>Here's what we recommend:</p>

      <ol>
        <li><strong>Document what you see.</strong> Take photos from multiple angles. Note which floors and which components are affected. This helps your inspector focus their assessment.</li>
        <li><strong>Don't use it as storage.</strong> Under Massachusetts law (M.G.L. Chapter 143, Section 22), any item left on a fire escape is considered a common nuisance. Clear everything off — plants, bikes, furniture, all of it.</li>
        <li><strong>Call a licensed professional.</strong> In Massachusetts, fire escape inspections and certifications can only be performed by a Registered Professional Engineer or Licensed Fire Escape Installer. A handyman or general contractor can't sign off on this.</li>
        <li><strong>Get ahead of your <a href="/blog/massachusetts-fire-escape-inspection-requirements-2026">5-year certification</a>.</strong> If you spot problems now, it's much better to address them proactively than to find out during your certification inspection.</li>
      </ol>

      <h2>How King Iron Works Handles Fire Escape Repairs</h2>

      <p>We've seen every kind of fire escape problem imaginable — from minor rust touch-ups to full structural rebuilds on buildings that probably should have called us five years earlier.</p>

      <p>Here's how we typically approach a repair project:</p>

      <ul>
        <li><strong>Free on-site assessment</strong> — we come to your building, walk the entire fire escape, and give you an honest evaluation of what needs to happen. No charge, no pressure.</li>
        <li><strong>Detailed scope of work</strong> — you'll know exactly what we're repairing, why it needs to be done, and what it's going to cost before we start.</li>
        <li><strong>In-house fabrication</strong> — if your fire escape needs replacement parts — new treads, platforms, railings, brackets — we design and fabricate everything at our Everett, MA facility.</li>
        <li><strong>Structural engineering coordination</strong> — for more complex situations, we work directly with engineers to make sure the repair meets all code requirements.</li>
        <li><strong>Certification upon completion</strong> — as a Licensed Fire Escape Installer in Massachusetts, we can inspect, repair, and certify your fire escape all in one project.</li>
        <li><strong>Emergency services available</strong> — if you've got a situation that can't wait, we're set up to respond quickly.</li>
      </ul>

      <h2>Think Your Fire Escape Might Need Repair?</h2>

      <p>Don't wait for your next inspection to find out. A quick call gets you a free on-site assessment from a licensed fire escape professional.</p>

      <p>Contact us at <a href="tel:16174042589"><strong>+1 617-404-2589</strong></a> or <a href="mailto:info@kingsironworks.com"><strong>info@kingsironworks.com</strong></a> to schedule your assessment.</p>

      <h2>The Bottom Line</h2>

      <p>Fire escapes are built tough, but they're not invincible. New England weather is relentless, and without regular attention, even the best-built fire escape will eventually develop problems.</p>

      <p>The key is catching those problems early. A little rust today is a quick fix. A lot of rust next year is a structural rebuild. A loose railing today is a bolt replacement. A missing railing during an emergency is a tragedy.</p>

      <p>Take five minutes this week to walk your fire escape and look for these five signs. And if anything concerns you — even a little — <a href="/contact">give us a call</a>. That's what we're here for.</p>
    `,
  },
  {
    slug: "historic-ironwork-restoration-beacon-hill",
    title:
      "Historic Ironwork Restoration in Beacon Hill: Preserving Boston's Architectural Heritage",
    excerpt:
      "Beacon Hill's historic ironwork tells the story of Boston's earliest architecture. Learn how period-accurate restoration preserves your property's value and meets commission requirements.",
    category: "restoration",
    featuredImage: `${IMG_BASE}/buMcGDTPsdJzspea.jpg`,
    publishedDate: "2026-02-25",
    readTime: "7 min read",
    tags: [
      "beacon hill",
      "historic restoration",
      "ironwork",
      "boston",
      "preservation",
    ],
    content: `
      <p>Walk down any street in Beacon Hill and you'll notice something that most people never stop to think about: the ironwork. The railings lining the front stoops. The fences framing the sidewalks. The window guards, the balconettes, the ornamental details that give these buildings their character.</p>

      <p>Most of it has been there for well over a century. Some of it dates back to the early 1800s, when Beacon Hill was first being developed around the new Massachusetts State House. And while the brick and granite get most of the attention, it's the ironwork that often defines the streetscape — the thing that makes Beacon Hill look and feel like Beacon Hill.</p>

      <p>But here's the challenge: when historic ironwork deteriorates, you can't just replace it with something off the shelf. Many of the original designs were hand-forged or cast from molds that no longer exist. The patterns are unique to specific blocks, specific buildings, sometimes specific eras of Boston's development. And in a protected historic district like Beacon Hill, any exterior restoration has to go through the Architectural Commission — which has very specific standards about what's acceptable.</p>

      <h2>Why Beacon Hill's Ironwork Matters More Than You Think</h2>

      <p>Beacon Hill's ironwork isn't decoration — it's architecture. The neighborhood's development spans several major architectural periods, and the ironwork tells that story as clearly as the buildings themselves.</p>

      <p>The earliest homes on the Hill, built in the <strong>Federal period</strong> (roughly 1790s–1830s), feature ironwork with clean, restrained lines — simple geometric patterns, slender balusters, and delicate scrollwork influenced by neoclassical design. As the neighborhood expanded through the <strong>Greek Revival period</strong> (1830s–1850s), ironwork became a bit more structured and formal, with anthemion (honeysuckle) motifs, lyre shapes, and heavier proportions.</p>

      <p>By the mid-to-late 1800s, <strong>Victorian-era</strong> influences brought more elaborate designs — ornate cast iron fences with floral patterns, acorn finials, and the kind of intricate detail that was made possible by industrial casting techniques. Many of the iconic black iron fences you see along streets like Chestnut, Mount Vernon, and Louisburg Square date from this period.</p>

      <p>Each of these styles reflects a specific moment in Boston's history. When they're properly maintained, they add enormous character and value to a property. When they're neglected or replaced with something generic, it diminishes not just the individual building but the entire streetscape.</p>

      <h2>Working with the Beacon Hill Architectural Commission</h2>

      <p>If you own a building in the Historic Beacon Hill District, any exterior work that's visible from a public way requires review by the <strong>Beacon Hill Architectural Commission (BHAC)</strong>. That includes ironwork — railings, fences, gates, window guards, fire escapes, and any other metal features on the exterior of your building.</p>

      <p>The commission meets monthly (third Thursday) to review applications, and their guidelines are clear on ironwork:</p>

      <ul>
        <li>Original or early architectural ironwork must be retained unless it's truly beyond repair</li>
        <li>If replacement is necessary, the new work must match the original in material, style, and design</li>
        <li>New iron features must be compatible with the architectural style of the building</li>
        <li>All work must receive a <strong>Certificate of Appropriateness</strong> before any installation begins</li>
      </ul>

      <p><strong>Violations can result in fines of up to $1,000 per day.</strong></p>

      <p>This is where a lot of property owners run into trouble. They hire a general contractor or a standard iron shop, the work gets done, and then they get a call from the commission because the replacement doesn't match the historical character of the district. That means removing what was just installed and starting over — at double the cost.</p>

      <p>The better approach is to work with a shop that understands the commission's requirements from the start — one that can document the original design, fabricate a period-accurate replacement, and present the work to the commission for approval before installation begins.</p>

      <h2>What Historic Ironwork Restoration Actually Involves</h2>

      <p>Restoring historic ironwork isn't the same as building new ironwork. It requires a different set of skills, a different approach, and often a different set of tools. Here's what a typical restoration project looks like:</p>

      <h3>1. Documentation and Assessment</h3>
      <p>Before we touch anything, we document the existing ironwork thoroughly — photographs, measurements, sketches of design details, and notes on the condition of each component. If the original design is partially damaged or missing, we research similar pieces from the same era and neighborhood to establish an accurate reference.</p>

      <h3>2. Determining Repair vs. Replacement</h3>
      <p>Whenever possible, we preserve the original material. The commission strongly prefers retention over replacement, and frankly, so do we — original ironwork has a character and patina that's difficult to replicate. But when a piece is structurally compromised, corroded beyond safe use, or missing entirely, replacement becomes necessary.</p>

      <h3>3. Pattern and Design Replication</h3>
      <p>This is where our Everett facility really comes into play. Many of the patterns found on Beacon Hill ironwork haven't been commercially produced in over a hundred years. Finials, rosettes, scrollwork details, and cast ornamental elements often have to be recreated from scratch. We use the original pieces (or detailed reference images) to create new patterns and fabricate matching components using both traditional forging techniques and modern precision tools.</p>

      <h3>4. Material Matching</h3>
      <p>Historic Boston ironwork is a mix of wrought iron and cast iron, and the two behave very differently. <strong>Wrought iron</strong> is hand-forged — it's malleable, fibrous, and has a distinctive grain. <strong>Cast iron</strong> is poured into molds — it's heavier, more brittle, and capable of much finer decorative detail. A proper restoration uses the correct material for each component, not a one-size-fits-all approach.</p>

      <h3>5. Surface Preparation and Finishing</h3>
      <p>Before any paint goes on, all <a href="/blog/warning-signs-fire-escape-needs-repair">rust and old coatings are removed</a> down to clean metal. We apply a rust-inhibitive primer followed by a high-quality enamel finish — typically satin or semi-gloss black, which is the traditional standard for Beacon Hill ironwork. The finish isn't just cosmetic; it's the protective barrier that will keep the restoration looking good and structurally sound for decades.</p>

      <h3>6. Commission Review and Installation</h3>
      <p>With the fabrication complete, we coordinate the commission approval (if not already obtained during the design phase) and schedule the installation. Our crews are experienced in working on Beacon Hill's narrow streets and tight building access.</p>

      <h2>Beyond Beacon Hill: South End, Back Bay, and More</h2>

      <p>While Beacon Hill gets much of the attention, it's not the only Boston neighborhood with significant historic ironwork. The South End's Victorian row houses along Union Park and Tremont Street are known for their ornate cast iron fences and window details. Back Bay's Commonwealth Avenue brownstones feature some of the city's most elegant railing work. Cambridge, Somerville, and Charlestown all have their own historic districts with ironwork that deserves the same level of care.</p>

      <p>The principles are the same across all of these neighborhoods: understand the original design, respect the architectural period, use appropriate materials and techniques, and work within the regulatory framework.</p>

      <h2>The Real Value of Getting It Right</h2>

      <p>We understand that historic restoration can feel expensive compared to just putting up something new. But consider what's actually at stake:</p>

      <ul>
        <li><strong>Property value.</strong> In a neighborhood like Beacon Hill, authentic period details are a major part of what drives property values. Buyers and appraisers notice the difference between original (or properly restored) ironwork and cheap replacements.</li>
        <li><strong>Commission compliance.</strong> Non-compliant work can result in daily fines, forced removal, and the cost of doing it all over again correctly. Getting it right the first time is always cheaper.</li>
        <li><strong>Neighborhood character.</strong> Beacon Hill's designation as a historic district exists because of the collective commitment of its property owners. Every building that maintains its authentic details contributes to the character that makes the neighborhood special — and valuable.</li>
        <li><strong>Longevity.</strong> Properly restored ironwork, using the right materials and protective coatings, will last for generations. A cheap replacement might need to be redone in ten years.</li>
      </ul>

      <h2>Own a Building in a Boston Historic District?</h2>

      <p>Whether you need to restore original ironwork, replicate a missing design, or navigate the commission approval process — we've done it hundreds of times and we'd love to help.</p>

      <p>Contact us at <a href="tel:16174042589"><strong>+1 617-404-2589</strong></a> or <a href="mailto:info@kingsironworks.com"><strong>info@kingsironworks.com</strong></a> to schedule a free assessment.</p>

      <h2>The Bottom Line</h2>

      <p>Beacon Hill's ironwork is one of those things that's easy to take for granted until it's gone. The railings, fences, and ornamental details that line these streets have been there for over a century because someone, at every generation, made the choice to maintain them properly.</p>

      <p>If your building's ironwork is showing its age — rust, missing pieces, loose connections, or peeling paint — now is the time to address it. Not with a quick patch or a generic replacement, but with the kind of thoughtful, period-accurate restoration that these buildings deserve.</p>

      <p>That's what we do, and we've been doing it across Boston's historic neighborhoods since 2004. <a href="/contact">Give us a call</a> and let's talk about your building.</p>
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
