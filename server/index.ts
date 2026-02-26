import express from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface OGData {
  title: string;
  description: string;
  image: string;
  path: string;
}

const IMG_BASE = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663313028198";

const locationOG: Record<string, OGData> = {
  "/": {
    title: "King Iron Works - Boston's Premier Historic Ironwork & Fire Escape Specialists",
    description:
      "20+ years of expertise in historic building restoration, licensed fire escape services, and custom ironwork fabrication. Serving Boston, New England, New York, and Florida.",
    image: `${IMG_BASE}/buMcGDTPsdJzspea.jpg`,
    path: "/",
  },
  "/cape-cod": {
    title: "Cape Cod Ironwork & Fire Escape Services | King Iron Works",
    description:
      "Cape Cod's premier ironwork specialists. Licensed fire escape installation, custom gates, railings, and historic restoration. Serving all of Cape Cod and the Islands.",
    image: `${IMG_BASE}/IrppZGXOKBxchPDP.JPG`,
    path: "/cape-cod",
  },
  "/worcester": {
    title: "Worcester Ironwork & Fire Escape Services | King Iron Works",
    description:
      "Central Massachusetts' trusted ironwork specialists. Licensed fire escape installation, custom gates, railings, and historic restoration. Serving Worcester and surrounding areas.",
    image: `${IMG_BASE}/LIIMwNaIvkbuwmQE.JPG`,
    path: "/worcester",
  },
  "/miami": {
    title: "Miami Ironwork & Fire Escape Services | King Iron Works",
    description:
      "South Florida's trusted ironwork specialists. Hurricane-rated gates, railings, fire escapes, and custom fabrication. Serving Miami-Dade and Broward Counties.",
    image: `${IMG_BASE}/AzTrmVJOTgNkaNYM.JPG`,
    path: "/miami",
  },
  "/new-hampshire": {
    title: "New Hampshire Ironwork & Fire Escape Services | King Iron Works",
    description:
      "New Hampshire's trusted ironwork specialists. Custom gates, railings, fire escapes, and structural steel. Serving Manchester, Nashua, Concord, and all of NH.",
    image: `${IMG_BASE}/ldKpYAFGAsEGkCVX.JPG`,
    path: "/new-hampshire",
  },
  "/maine": {
    title: "Maine Ironwork & Fire Escape Services | King Iron Works",
    description:
      "Maine's trusted ironwork specialists. Custom gates, railings, fire escapes, and historic restoration. Serving Portland, Bangor, Augusta, and all of Maine.",
    image: `${IMG_BASE}/gujHFKlEnadUYTxL.JPG`,
    path: "/maine",
  },
  "/rhode-island": {
    title: "Rhode Island Ironwork & Fire Escape Services | King Iron Works",
    description:
      "Rhode Island's premier ironwork specialists. Custom gates, railings, fire escapes, and historic restoration. Serving Providence, Newport, and all of RI.",
    image: `${IMG_BASE}/NgBghqHCKpNCJSJs.jpg`,
    path: "/rhode-island",
  },
  "/new-york": {
    title: "New York Ironwork & Fire Escape Services | King Iron Works",
    description:
      "New York's trusted ironwork specialists. Fire escapes, structural steel, custom fabrication, and building restoration. Serving NYC, Long Island, and all of NY.",
    image: "/images/new-york-ironwork.jpg",
    path: "/new-york",
  },
  "/connecticut": {
    title: "Connecticut Ironwork & Fire Escape Services | King Iron Works",
    description:
      "Connecticut's trusted ironwork specialists. Custom gates, railings, fire escapes, and historic restoration. Serving Hartford, New Haven, Stamford, and all of CT.",
    image: `${IMG_BASE}/aoFXjvosIbfREama.JPG`,
    path: "/connecticut",
  },
  "/services": {
    title: "Our Services | King Iron Works",
    description:
      "Comprehensive ironwork solutions: fire escape installation & certification, historic building restoration, custom gates, railings, structural steel, and more.",
    image: `${IMG_BASE}/aqPLHeShxXujREPn.JPG`,
    path: "/services",
  },
  "/portfolio": {
    title: "Our Work | King Iron Works",
    description:
      "Browse our portfolio of custom ironwork, fire escape installations, historic restorations, and structural steel projects across the Northeast and Florida.",
    image: `${IMG_BASE}/apLcldtAeVXzDTCh.JPG`,
    path: "/portfolio",
  },
  "/contact": {
    title: "Contact Us | King Iron Works",
    description:
      "Get a free consultation and quote for your ironwork project. Serving Massachusetts, New Hampshire, Maine, Rhode Island, Connecticut, New York, and Florida.",
    image: `${IMG_BASE}/buMcGDTPsdJzspea.jpg`,
    path: "/contact",
  },
  "/locations": {
    title: "Our Locations | King Iron Works",
    description:
      "King Iron Works serves the Northeast and Florida with nine locations. Find your nearest office for ironwork, fire escapes, and custom fabrication.",
    image: `${IMG_BASE}/wFpGlEabFZwcJrgX.jpg`,
    path: "/locations",
  },
  "/about": {
    title: "About Us | King Iron Works",
    description:
      "20+ years of ironwork expertise. Veteran-owned, licensed, and insured. Learn about King Iron Works' history, team, and commitment to quality craftsmanship.",
    image: `${IMG_BASE}/ZtrYnxwJFDZSmXOw.jpg`,
    path: "/about",
  },
  "/blog": {
    title: "Blog | King Iron Works",
    description:
      "Expert insights on fire escapes, ironwork restoration, building codes, and custom fabrication from Boston's premier ironwork specialists.",
    image: `${IMG_BASE}/VrmKyMuovdgoFRfz.JPG`,
    path: "/blog",
  },
};

// Blog post data for server-side OG tags
const blogPostOG: Record<string, OGData> = {
  "massachusetts-fire-escape-inspection-requirements-2026": {
    title:
      "Massachusetts Fire Escape Inspection Requirements: The Complete 2026 Guide | King Iron Works",
    description:
      "Massachusetts law mandates fire escape inspections every five years. Learn what's required, who can inspect, consequences of non-compliance, and how to prepare.",
    image: `${IMG_BASE}/VrmKyMuovdgoFRfz.JPG`,
    path: "/blog/massachusetts-fire-escape-inspection-requirements-2026",
  },
  "warning-signs-fire-escape-needs-repair": {
    title:
      "5 Warning Signs Your Fire Escape Needs Immediate Repair | King Iron Works",
    description:
      "Rust, loose railings, sagging platforms? Learn the 5 warning signs that mean your fire escape needs repair now — before it becomes a safety hazard or code violation.",
    image: `${IMG_BASE}/PmBUKqXwdDkeqflj.JPG`,
    path: "/blog/warning-signs-fire-escape-needs-repair",
  },
  "historic-ironwork-restoration-beacon-hill": {
    title:
      "Historic Ironwork Restoration in Beacon Hill: Preserving Boston's Architectural Heritage | King Iron Works",
    description:
      "Beacon Hill's historic ironwork tells the story of Boston's earliest architecture. Learn how period-accurate restoration preserves your property's value and meets commission requirements.",
    image: `${IMG_BASE}/buMcGDTPsdJzspea.jpg`,
    path: "/blog/historic-ironwork-restoration-beacon-hill",
  },
  "failed-fire-escape-inspection-boston": {
    title:
      "What Happens If Your Boston Building Fails a Fire Escape Inspection? | King Iron Works",
    description:
      "Failed your fire escape inspection in Massachusetts? Here's exactly what happens next — fines, legal exposure, insurance risk, mortgage complications, and how to get back into compliance fast.",
    image: `${IMG_BASE}/VrmKyMuovdgoFRfz.JPG`,
    path: "/blog/failed-fire-escape-inspection-boston",
  },
};

function buildOGTags(og: OGData, baseUrl: string): string {
  const url = `${baseUrl}${og.path}`;
  const image = og.image.startsWith("http") ? og.image : `${baseUrl}${og.image}`;
  return [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="King Iron Works" />`,
    `<meta property="og:title" content="${og.title}" />`,
    `<meta property="og:description" content="${og.description}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${og.title}" />`,
    `<meta name="twitter:description" content="${og.description}" />`,
    `<meta name="twitter:image" content="${image}" />`,
  ].join("\n    ");
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  // Read index.html template once at startup
  const indexHtmlPath = path.join(staticPath, "index.html");
  let indexHtml = "";
  try {
    indexHtml = fs.readFileSync(indexHtmlPath, "utf-8");
  } catch {
    console.warn("index.html not found at startup, will retry on request");
  }

  // Reject malformed URLs before they hit any middleware
  app.use((req, res, next) => {
    try {
      decodeURIComponent(req.path);
      next();
    } catch {
      res.status(400).send("Bad Request");
    }
  });

  // Serve static files (but not index.html for routes - we handle that below)
  app.use(express.static(staticPath, { index: false }));

  // Handle all routes - inject OG tags into index.html
  app.get("*", (_req, res) => {
    // Re-read if not loaded at startup (dev mode)
    if (!indexHtml) {
      try {
        indexHtml = fs.readFileSync(indexHtmlPath, "utf-8");
      } catch {
        return res.status(500).send("index.html not found");
      }
    }

    const reqPath = _req.path;
    const baseUrl = `${_req.protocol}://${_req.get("host")}`;

    // Check for blog post slugs
    let og: OGData | undefined;
    const blogMatch = reqPath.match(/^\/blog\/(.+)$/);
    if (blogMatch && blogPostOG[blogMatch[1]]) {
      og = blogPostOG[blogMatch[1]];
    } else {
      og = locationOG[reqPath] || locationOG["/"];
    }

    const ogTags = buildOGTags(og!, baseUrl);

    // Inject OG tags right before </head>
    const html = indexHtml.replace("</head>", `    ${ogTags}\n  </head>`);

    // Also replace the <title> tag with the location-specific title
    const titleHtml = html.replace(
      /<title>.*?<\/title>/,
      `<title>${og!.title}</title>`,
    );

    res.setHeader("Content-Type", "text/html");
    res.send(titleHtml);
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
