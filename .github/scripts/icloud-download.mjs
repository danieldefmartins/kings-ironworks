/**
 * King Iron Works — iCloud Photo Pipeline
 *
 * Downloads photos from iCloud shared links, then:
 * 1. AI curation: scores quality, rejects bad shots, names files descriptively
 * 2. Auto-categorization: sorts into railings/, staircases/, gates/, etc.
 * 3. Brand effects: warm color grade, contrast, subtle vignette, logo watermark
 * 4. Web optimization: resize, JPEG compression, proper naming
 */

import axios from 'axios';
import sharp from 'sharp';
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

// ─── Config ────────────────────────────────────────────────────────────
const ICLOUD_LINK = process.env.ICLOUD_LINK;
const DEST_FOLDER = process.env.DEST_FOLDER || '';
const MAX_WIDTH = parseInt(process.env.MAX_WIDTH || '1920', 10);
const QUALITY = parseInt(process.env.QUALITY || '85', 10);
const ENABLE_AI = process.env.ENABLE_AI !== 'false';
const APPLY_EFFECTS = process.env.APPLY_EFFECTS !== 'false';
const MIN_SCORE = parseInt(process.env.MIN_SCORE || '5', 10);
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const LOGO_PATH = process.env.LOGO_PATH || 'client/public/images/ughTFDIjdTrgGjGJ.jpeg';
const BASE_DIR = 'client/public/images';

if (!ICLOUD_LINK) {
  console.error('Error: ICLOUD_LINK is required');
  process.exit(1);
}

// ─── Curation report ───────────────────────────────────────────────────
const report = { accepted: [], rejected: [], errors: [] };

// ─── iCloud API ────────────────────────────────────────────────────────

function extractToken(link) {
  const match = link.match(/(?:photos\/|photos\/#)(.+?)(?:\?|$)/);
  if (!match) throw new Error(`Could not extract token from: ${link}`);
  return match[1];
}

async function getBaseUrl(token) {
  const res = await axios.post(
    `https://p46-sharedstreams.icloud.com/${token}/sharedstreams/partition`,
    { streamCtag: null },
    { headers: { 'Content-Type': 'application/json', Origin: 'https://www.icloud.com' } }
  );
  const host = res.data?.X_Apple_MMe_Host;
  return host
    ? `https://${host}/${token}/sharedstreams`
    : `https://p46-sharedstreams.icloud.com/${token}/sharedstreams`;
}

async function fetchPhotoList(baseUrl) {
  const res = await axios.post(
    `${baseUrl}/webstream`, { streamCtag: null },
    { headers: { 'Content-Type': 'application/json', Origin: 'https://www.icloud.com' } }
  );
  return res.data?.photos || [];
}

async function getDownloadUrls(baseUrl, guids) {
  const res = await axios.post(
    `${baseUrl}/webasseturls`, { photoGuids: guids },
    { headers: { 'Content-Type': 'application/json', Origin: 'https://www.icloud.com' } }
  );
  return res.data?.items || {};
}

function getBestDerivative(photo) {
  let best = null, maxPx = 0;
  for (const d of Object.values(photo.derivatives || {})) {
    const px = (parseInt(d.width) || 0) * (parseInt(d.height) || 0);
    if (px > maxPx) { maxPx = px; best = d; }
  }
  return best;
}

// ─── AI Curation (Claude) ──────────────────────────────────────────────

const CATEGORIES = [
  'railings', 'staircases', 'gates', 'fire-escapes', 'fences',
  'balconies', 'doors', 'custom-fabrication', 'structural', 'decorative', 'general'
];

async function analyzePhoto(imageBuffer) {
  if (!ANTHROPIC_API_KEY) {
    console.log('  No API key — skipping AI analysis');
    return { score: 7, category: 'general', filename: '', keep: true, reason: 'No AI key' };
  }

  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  // Resize to thumbnail for API (saves tokens)
  const thumbnail = await sharp(imageBuffer)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 70 })
    .toBuffer();

  const base64 = thumbnail.toString('base64');

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: base64 }
        },
        {
          type: 'text',
          text: `You are a photo curator for King Iron Works, a premium ironwork fabrication company in Boston.

Analyze this photo and respond with ONLY valid JSON (no markdown, no backticks):

{
  "score": <1-10 quality score>,
  "category": "<one of: ${CATEGORIES.join(', ')}>",
  "filename": "<short-descriptive-filename-no-extension>",
  "keep": <true/false>,
  "reason": "<brief reason>"
}

Scoring criteria:
- 9-10: Stunning, portfolio-worthy. Great lighting, composition, sharp focus, showcases craftsmanship
- 7-8: Good quality, usable for website. Clear subject, decent lighting
- 5-6: Acceptable but not great. Minor issues with lighting, angle, or focus
- 3-4: Poor quality. Dark, blurry, bad angle, cluttered background
- 1-2: Unusable. Extremely dark, blurry, irrelevant content

Set keep=false for: blurry photos, extremely dark/overexposed, duplicates of better shots, photos of paperwork/screens/unrelated items, test shots.

For filename: use lowercase-kebab-case describing the ironwork shown (e.g. "curved-staircase-railing-beacon-hill", "custom-iron-gate-closeup", "fire-escape-ladder-installation").`
        }
      ]
    }]
  });

  try {
    const text = response.content[0].text.trim();
    return JSON.parse(text);
  } catch (e) {
    console.log('  AI response parse error, keeping photo with defaults');
    return { score: 6, category: 'general', filename: '', keep: true, reason: 'Parse error' };
  }
}

// ─── Brand Effects Pipeline ────────────────────────────────────────────

/**
 * Apply King Iron Works brand treatment:
 * - Warm color grade (amber/molten metal tone)
 * - Slight contrast boost
 * - Subtle vignette
 * - Logo watermark (bottom-right corner)
 */
async function applyBrandEffects(imageBuffer) {
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width;
  const height = metadata.height;

  // Step 1: Warm color grade + contrast
  // Slight warm tint by adjusting channels, boost contrast with modulate
  let pipeline = sharp(imageBuffer)
    .modulate({
      brightness: 1.02,    // Slight brightness lift
      saturation: 1.08,    // Slight saturation boost for richer metals
    })
    .linear(1.08, -10)     // Contrast: multiply + offset
    .tint({ r: 245, g: 235, b: 220 }); // Warm cream tint

  let processed = await pipeline.jpeg({ quality: 98 }).toBuffer();

  // Step 2: Vignette overlay
  // Create a radial gradient vignette using SVG
  const vignetteSvg = `
    <svg width="${width}" height="${height}">
      <defs>
        <radialGradient id="v" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stop-color="black" stop-opacity="0"/>
          <stop offset="70%" stop-color="black" stop-opacity="0"/>
          <stop offset="100%" stop-color="black" stop-opacity="0.35"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#v)"/>
    </svg>`;

  processed = await sharp(processed)
    .composite([{
      input: Buffer.from(vignetteSvg),
      blend: 'over'
    }])
    .jpeg({ quality: 98 })
    .toBuffer();

  // Step 3: Logo watermark (bottom-right corner)
  if (existsSync(LOGO_PATH)) {
    try {
      const watermarkWidth = Math.round(width * 0.15); // 15% of image width
      const watermarkBuffer = await sharp(LOGO_PATH)
        .resize(watermarkWidth, null, { fit: 'inside' })
        .ensureAlpha()
        .composite([{
          // Make it semi-transparent by overlaying with a transparent layer
          input: Buffer.from([255, 255, 255, Math.round(255 * 0.4)]),
          raw: { width: 1, height: 1, channels: 4 },
          tile: true,
          blend: 'dest-in'
        }])
        .png()
        .toBuffer();

      const margin = Math.round(width * 0.025); // 2.5% margin

      processed = await sharp(processed)
        .composite([{
          input: watermarkBuffer,
          gravity: 'southeast',
          blend: 'over',
          top: height - (await sharp(watermarkBuffer).metadata()).height - margin,
          left: width - watermarkWidth - margin
        }])
        .jpeg({ quality: 98 })
        .toBuffer();
    } catch (e) {
      console.log(`  Watermark error (skipping): ${e.message}`);
    }
  }

  return processed;
}

// ─── Main Pipeline ─────────────────────────────────────────────────────

function sanitize(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase();
}

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   King Iron Works — Photo Pipeline       ║');
  console.log('╚══════════════════════════════════════════╝\n');
  console.log(`Link:       ${ICLOUD_LINK}`);
  console.log(`AI Curation: ${ENABLE_AI ? 'ON' : 'OFF'}`);
  console.log(`Effects:    ${APPLY_EFFECTS ? 'ON' : 'OFF'}`);
  console.log(`Min Score:  ${MIN_SCORE}/10`);
  console.log(`Max Width:  ${MAX_WIDTH > 0 ? MAX_WIDTH + 'px' : 'original'}`);
  console.log(`Quality:    ${QUALITY}%\n`);

  // ── iCloud download ──────────────────────────────────
  const token = extractToken(ICLOUD_LINK);
  console.log('Finding iCloud server...');
  const baseUrl = await getBaseUrl(token);

  console.log('Fetching photo list...');
  const photos = await fetchPhotoList(baseUrl);
  console.log(`Found ${photos.length} photos\n`);

  if (photos.length === 0) {
    console.log('No photos found.');
    return;
  }

  const guids = [];
  const photoMap = new Map();
  for (const p of photos) {
    const best = getBestDerivative(p);
    if (best) {
      guids.push(best.checksum);
      photoMap.set(best.checksum, { caption: p.caption || '', checksum: best.checksum });
    }
  }

  console.log('Getting download URLs...');
  const urlMap = await getDownloadUrls(baseUrl, guids);
  console.log(`Got ${Object.keys(urlMap).length} URLs\n`);

  // ── Process each photo ───────────────────────────────
  console.log('Processing photos...\n');
  let processed = 0;

  for (const [checksum, urlInfo] of Object.entries(urlMap)) {
    const info = photoMap.get(checksum) || { caption: checksum, checksum };
    const photoNum = processed + 1;
    console.log(`[${photoNum}/${Object.keys(urlMap).length}] Downloading...`);

    let imageBuffer;
    try {
      const url = `https://${urlInfo.url_location}${urlInfo.url_path}`;
      const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
      imageBuffer = Buffer.from(res.data);
    } catch (e) {
      console.log(`  Download error: ${e.message}`);
      report.errors.push({ checksum, error: e.message });
      continue;
    }

    // ── AI Analysis ──────────────────────────────────
    let analysis = { score: 7, category: 'general', filename: '', keep: true, reason: 'AI disabled' };

    if (ENABLE_AI) {
      console.log('  Analyzing with AI...');
      try {
        analysis = await analyzePhoto(imageBuffer);
        console.log(`  Score: ${analysis.score}/10 | Category: ${analysis.category} | ${analysis.keep ? 'KEEP' : 'REJECT'}`);
        if (analysis.reason) console.log(`  Reason: ${analysis.reason}`);
      } catch (e) {
        console.log(`  AI error (keeping): ${e.message}`);
        analysis = { score: 6, category: 'general', filename: '', keep: true, reason: 'AI error' };
      }
    }

    // ── Skip rejected photos ─────────────────────────
    if (!analysis.keep || analysis.score < MIN_SCORE) {
      console.log(`  REJECTED (score ${analysis.score} < ${MIN_SCORE})\n`);
      report.rejected.push({
        checksum, score: analysis.score, reason: analysis.reason,
        category: analysis.category
      });
      continue;
    }

    // ── Determine output path ────────────────────────
    const category = CATEGORIES.includes(analysis.category) ? analysis.category : 'general';
    const outputDir = DEST_FOLDER
      ? join(BASE_DIR, DEST_FOLDER)
      : join(BASE_DIR, category);

    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Build filename
    let filename = analysis.filename || info.caption || checksum;
    filename = sanitize(filename);
    if (!filename) filename = checksum;
    filename = filename.replace(/\.(jpg|jpeg|png|heic|heif|webp)$/i, '');
    filename = `${filename}.jpg`;

    const outputPath = join(outputDir, filename);

    if (existsSync(outputPath)) {
      console.log(`  Skipped (exists): ${filename}\n`);
      continue;
    }

    // ── Apply brand effects ──────────────────────────
    if (APPLY_EFFECTS) {
      console.log('  Applying brand effects...');
      try {
        imageBuffer = await applyBrandEffects(imageBuffer);
      } catch (e) {
        console.log(`  Effects error (using original): ${e.message}`);
      }
    }

    // ── Resize & optimize ────────────────────────────
    console.log('  Optimizing for web...');
    const metadata = await sharp(imageBuffer).metadata();
    let pipeline = sharp(imageBuffer);

    if (MAX_WIDTH > 0 && metadata.width > MAX_WIDTH) {
      pipeline = pipeline.resize(MAX_WIDTH, null, { fit: 'inside', withoutEnlargement: true });
    }

    const outputBuffer = await pipeline.jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();
    writeFileSync(outputPath, outputBuffer);

    const origKB = (imageBuffer.length / 1024).toFixed(0);
    const finalKB = (outputBuffer.length / 1024).toFixed(0);
    console.log(`  Saved: ${outputPath} (${origKB}KB → ${finalKB}KB)\n`);

    report.accepted.push({
      filename, category, score: analysis.score,
      size: `${finalKB}KB`, path: outputPath
    });
    processed++;
  }

  // ── Report ─────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║            Pipeline Complete              ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`  Accepted: ${report.accepted.length}`);
  console.log(`  Rejected: ${report.rejected.length}`);
  console.log(`  Errors:   ${report.errors.length}`);

  if (report.accepted.length > 0) {
    console.log('\n  Accepted photos:');
    for (const p of report.accepted) {
      console.log(`    ✓ ${p.filename} → ${p.category}/ (score: ${p.score}, ${p.size})`);
    }
  }

  if (report.rejected.length > 0) {
    console.log('\n  Rejected photos:');
    for (const p of report.rejected) {
      console.log(`    ✗ Score ${p.score}/10 — ${p.reason}`);
    }
  }

  // Save report for the workflow summary
  const reportMd = [
    `# Photo Pipeline Report`,
    ``,
    `| Metric | Count |`,
    `|--------|-------|`,
    `| Accepted | ${report.accepted.length} |`,
    `| Rejected | ${report.rejected.length} |`,
    `| Errors | ${report.errors.length} |`,
    ``,
    report.accepted.length > 0 ? `## Accepted` : '',
    ...report.accepted.map(p => `- **${p.filename}** → \`${p.category}/\` (score: ${p.score}/10, ${p.size})`),
    '',
    report.rejected.length > 0 ? `## Rejected` : '',
    ...report.rejected.map(p => `- Score ${p.score}/10 — ${p.reason}`),
  ].filter(Boolean).join('\n');

  writeFileSync('/tmp/curation-report.md', reportMd);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
