/**
 * King Iron Works — iCloud Photo Pipeline
 *
 * Downloads photos from iCloud shared links using CloudKit API,
 * then applies AI curation and brand effects.
 *
 * Supports both legacy Shared Albums (sharedstreams) and
 * newer iCloud Shared Library links (CMM/CloudKit).
 */

import axios from 'axios';
import sharp from 'sharp';
import { mkdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import puppeteer from 'puppeteer';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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

const report = { accepted: [], rejected: [], errors: [] };

// ─── iCloud Photo Fetcher (Puppeteer) ──────────────────────────────────

function extractToken(link) {
  const match = link.match(/(?:photos\/|photos\/#)(.+?)(?:\?|$)/);
  if (!match) throw new Error(`Could not extract token from: ${link}`);
  return match[1];
}

/**
 * Use Puppeteer to load the iCloud share page and intercept
 * all image asset URLs from the network requests.
 */
async function fetchPhotoUrlsViaBrowser(link) {
  console.log('Launching browser to load iCloud share page...');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();

  // Collect all image URLs from network requests
  const imageUrls = new Set();
  const assetRequests = [];

  // Intercept network requests to find photo asset URLs
  page.on('response', async (response) => {
    const url = response.url();
    const contentType = response.headers()['content-type'] || '';

    // Capture CloudKit asset URLs (icloud-content.com)
    if (url.includes('icloud-content.com') && !url.includes('preview')) {
      imageUrls.add(url);
    }

    // Capture CloudKit API responses containing asset download URLs
    if (url.includes('ckdatabasews') && url.includes('records')) {
      try {
        const body = await response.json();
        extractAssetUrls(body, imageUrls);
      } catch (e) { /* ignore non-JSON responses */ }
    }
  });

  // Navigate to the share page
  const shareUrl = link.includes('www.icloud.com')
    ? link
    : link.replace('share.icloud.com/photos/', 'www.icloud.com/photos/#');

  console.log(`Loading: ${shareUrl}`);
  await page.goto(shareUrl, { waitUntil: 'networkidle2', timeout: 60000 });

  // Wait for photos to start loading
  console.log('Waiting for photos to load...');
  await sleep(5000);

  // Scroll to trigger lazy loading of more photos
  let previousCount = 0;
  let scrollAttempts = 0;
  const maxScrolls = 30;

  while (scrollAttempts < maxScrolls) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
    await sleep(2000);

    const currentCount = imageUrls.size;
    console.log(`  Found ${currentCount} image URLs so far...`);

    if (currentCount === previousCount) {
      scrollAttempts++;
      if (scrollAttempts >= 3) break; // Stop after 3 scrolls with no new images
    } else {
      scrollAttempts = 0;
    }
    previousCount = currentCount;
  }

  // Also try to extract URLs from the page's image elements
  const pageImageUrls = await page.evaluate(() => {
    const imgs = document.querySelectorAll('img[src*="icloud-content"]');
    return Array.from(imgs).map(img => img.src);
  });

  for (const url of pageImageUrls) {
    imageUrls.add(url);
  }

  await browser.close();

  console.log(`\nTotal unique image URLs found: ${imageUrls.size}\n`);
  return Array.from(imageUrls);
}

/**
 * Recursively extract download URLs from CloudKit API responses
 */
function extractAssetUrls(data, urlSet) {
  if (!data || typeof data !== 'object') return;

  if (data.downloadURL && typeof data.downloadURL === 'string') {
    urlSet.add(data.downloadURL);
  }

  if (Array.isArray(data)) {
    for (const item of data) extractAssetUrls(item, urlSet);
  } else {
    for (const val of Object.values(data)) extractAssetUrls(val, urlSet);
  }
}

/**
 * Fallback: Try legacy sharedstreams API for older shared albums
 */
async function tryLegacySharedStreams(token) {
  console.log('Trying legacy shared streams API...');
  try {
    const partRes = await axios.post(
      `https://p46-sharedstreams.icloud.com/${token}/sharedstreams/partition`,
      { streamCtag: null },
      { headers: { 'Content-Type': 'application/json', Origin: 'https://www.icloud.com' }, timeout: 10000 }
    );

    const host = partRes.data?.X_Apple_MMe_Host;
    const baseUrl = host
      ? `https://${host}/${token}/sharedstreams`
      : `https://p46-sharedstreams.icloud.com/${token}/sharedstreams`;

    const streamRes = await axios.post(
      `${baseUrl}/webstream`, { streamCtag: null },
      { headers: { 'Content-Type': 'application/json', Origin: 'https://www.icloud.com' }, timeout: 10000 }
    );

    const photos = streamRes.data?.photos || [];
    if (photos.length === 0) return [];

    // Get best derivatives
    const guids = [];
    for (const p of photos) {
      let best = null, maxPx = 0;
      for (const d of Object.values(p.derivatives || {})) {
        const px = (parseInt(d.width) || 0) * (parseInt(d.height) || 0);
        if (px > maxPx) { maxPx = px; best = d; }
      }
      if (best) guids.push(best.checksum);
    }

    const urlRes = await axios.post(
      `${baseUrl}/webasseturls`, { photoGuids: guids },
      { headers: { 'Content-Type': 'application/json', Origin: 'https://www.icloud.com' }, timeout: 10000 }
    );

    const items = urlRes.data?.items || {};
    return Object.values(items).map(i => `https://${i.url_location}${i.url_path}`);
  } catch (e) {
    console.log(`Legacy API failed: ${e.message}`);
    return [];
  }
}

// ─── AI Curation (Claude) ──────────────────────────────────────────────

const CATEGORIES = [
  'railings', 'staircases', 'gates', 'fire-escapes', 'fences',
  'balconies', 'doors', 'custom-fabrication', 'structural', 'decorative', 'general'
];

async function analyzePhoto(imageBuffer) {
  if (!ANTHROPIC_API_KEY) {
    return { score: 7, category: 'general', filename: '', keep: true, reason: 'No AI key' };
  }

  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const thumbnail = await sharp(imageBuffer)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 70 })
    .toBuffer();

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: thumbnail.toString('base64') } },
        { type: 'text', text: `You are a photo curator for King Iron Works, a premium ironwork fabrication company in Boston.

Analyze this photo and respond with ONLY valid JSON (no markdown, no backticks):

{"score": <1-10>, "category": "<one of: ${CATEGORIES.join(', ')}>", "filename": "<short-descriptive-kebab-case-name>", "keep": <true/false>, "reason": "<brief reason>"}

Scoring: 9-10 stunning portfolio-worthy, 7-8 good website quality, 5-6 acceptable, 3-4 poor, 1-2 unusable.
Set keep=false for: blurry, extremely dark/overexposed, paperwork/screens, test shots, irrelevant content.
Filename: describe the ironwork shown (e.g. "curved-staircase-railing-beacon-hill").` }
      ]
    }]
  });

  try {
    return JSON.parse(response.content[0].text.trim());
  } catch (e) {
    return { score: 6, category: 'general', filename: '', keep: true, reason: 'Parse error' };
  }
}

// ─── Brand Effects ─────────────────────────────────────────────────────

async function applyBrandEffects(imageBuffer) {
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width;
  const height = metadata.height;

  // Warm color grade + contrast boost
  let processed = await sharp(imageBuffer)
    .modulate({ brightness: 1.02, saturation: 1.08 })
    .linear(1.08, -10)
    .tint({ r: 245, g: 235, b: 220 })
    .jpeg({ quality: 98 })
    .toBuffer();

  // Subtle vignette
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
    .composite([{ input: Buffer.from(vignetteSvg), blend: 'over' }])
    .jpeg({ quality: 98 })
    .toBuffer();

  // Logo watermark
  if (existsSync(LOGO_PATH)) {
    try {
      const wmWidth = Math.round(width * 0.15);
      const watermark = await sharp(LOGO_PATH)
        .resize(wmWidth, null, { fit: 'inside' })
        .ensureAlpha()
        .composite([{
          input: Buffer.from([255, 255, 255, Math.round(255 * 0.4)]),
          raw: { width: 1, height: 1, channels: 4 },
          tile: true, blend: 'dest-in'
        }])
        .png().toBuffer();

      const margin = Math.round(width * 0.025);
      processed = await sharp(processed)
        .composite([{ input: watermark, gravity: 'southeast' }])
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
  console.log(`Link:        ${ICLOUD_LINK}`);
  console.log(`AI Curation: ${ENABLE_AI ? 'ON' : 'OFF'}`);
  console.log(`Effects:     ${APPLY_EFFECTS ? 'ON' : 'OFF'}`);
  console.log(`Min Score:   ${MIN_SCORE}/10`);
  console.log(`Max Width:   ${MAX_WIDTH > 0 ? MAX_WIDTH + 'px' : 'original'}`);
  console.log(`Quality:     ${QUALITY}%\n`);

  const token = extractToken(ICLOUD_LINK);

  // Try legacy API first (faster), fall back to browser
  let imageUrls = await tryLegacySharedStreams(token);

  if (imageUrls.length === 0) {
    console.log('Legacy API unavailable — using browser-based extraction...\n');
    imageUrls = await fetchPhotoUrlsViaBrowser(ICLOUD_LINK);
  }

  if (imageUrls.length === 0) {
    console.log('No photos could be extracted from this link.');
    console.log('Tip: Make sure the iCloud link is set to "Anyone with the link" access.');
    process.exit(0);
  }

  console.log(`Processing ${imageUrls.length} photos...\n`);

  let processed = 0;
  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    console.log(`[${i + 1}/${imageUrls.length}] Downloading...`);

    let imageBuffer;
    try {
      const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
      imageBuffer = Buffer.from(res.data);

      // Verify it's an image
      const meta = await sharp(imageBuffer).metadata();
      if (!meta.width || meta.width < 100) {
        console.log('  Skipped (too small or not an image)\n');
        continue;
      }
    } catch (e) {
      console.log(`  Download error: ${e.message}\n`);
      report.errors.push({ url: url.substring(0, 80), error: e.message });
      continue;
    }

    // AI Analysis
    let analysis = { score: 7, category: 'general', filename: '', keep: true, reason: 'AI disabled' };
    if (ENABLE_AI) {
      console.log('  Analyzing with AI...');
      try {
        analysis = await analyzePhoto(imageBuffer);
        console.log(`  Score: ${analysis.score}/10 | Category: ${analysis.category} | ${analysis.keep ? 'KEEP' : 'REJECT'}`);
      } catch (e) {
        console.log(`  AI error (keeping): ${e.message}`);
      }
    }

    if (!analysis.keep || analysis.score < MIN_SCORE) {
      console.log(`  REJECTED (score ${analysis.score} < ${MIN_SCORE})\n`);
      report.rejected.push({ score: analysis.score, reason: analysis.reason, category: analysis.category });
      continue;
    }

    // Output path
    const category = CATEGORIES.includes(analysis.category) ? analysis.category : 'general';
    const outputDir = DEST_FOLDER ? join(BASE_DIR, DEST_FOLDER) : join(BASE_DIR, category);
    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

    let filename = analysis.filename || `photo-${i + 1}`;
    filename = sanitize(filename).replace(/\.(jpg|jpeg|png|heic|heif|webp)$/i, '') + '.jpg';
    const outputPath = join(outputDir, filename);

    if (existsSync(outputPath)) {
      console.log(`  Skipped (exists): ${filename}\n`);
      continue;
    }

    // Brand effects
    if (APPLY_EFFECTS) {
      console.log('  Applying brand effects...');
      try { imageBuffer = await applyBrandEffects(imageBuffer); }
      catch (e) { console.log(`  Effects error (using original): ${e.message}`); }
    }

    // Resize & optimize
    const meta = await sharp(imageBuffer).metadata();
    let pipeline = sharp(imageBuffer);
    if (MAX_WIDTH > 0 && meta.width > MAX_WIDTH) {
      pipeline = pipeline.resize(MAX_WIDTH, null, { fit: 'inside', withoutEnlargement: true });
    }

    const outputBuffer = await pipeline.jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();
    writeFileSync(outputPath, outputBuffer);

    const finalKB = (outputBuffer.length / 1024).toFixed(0);
    console.log(`  Saved: ${outputPath} (${finalKB}KB)\n`);

    report.accepted.push({ filename, category, score: analysis.score, size: `${finalKB}KB`, path: outputPath });
    processed++;
  }

  // Report
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║            Pipeline Complete              ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`  Accepted: ${report.accepted.length}`);
  console.log(`  Rejected: ${report.rejected.length}`);
  console.log(`  Errors:   ${report.errors.length}`);

  if (report.accepted.length > 0) {
    console.log('\n  Accepted:');
    for (const p of report.accepted) console.log(`    + ${p.filename} -> ${p.category}/ (${p.score}/10, ${p.size})`);
  }
  if (report.rejected.length > 0) {
    console.log('\n  Rejected:');
    for (const p of report.rejected) console.log(`    - Score ${p.score}/10: ${p.reason}`);
  }

  const reportMd = [
    `# Photo Pipeline Report`, '',
    `| Metric | Count |`, `|--------|-------|`,
    `| Accepted | ${report.accepted.length} |`,
    `| Rejected | ${report.rejected.length} |`,
    `| Errors | ${report.errors.length} |`, '',
    ...report.accepted.map(p => `- **${p.filename}** -> \`${p.category}/\` (${p.score}/10, ${p.size})`),
    '', ...report.rejected.map(p => `- Rejected: score ${p.score}/10 — ${p.reason}`)
  ].join('\n');

  writeFileSync('/tmp/curation-report.md', reportMd);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
