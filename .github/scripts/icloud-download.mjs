/**
 * iCloud Shared Album Downloader
 * Downloads photos from a public iCloud shared link,
 * optimizes them for web, and saves to the repo.
 */

import axios from 'axios';
import sharp from 'sharp';
import { mkdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

const ICLOUD_LINK = process.env.ICLOUD_LINK;
const DEST_FOLDER = process.env.DEST_FOLDER || '';
const MAX_WIDTH = parseInt(process.env.MAX_WIDTH || '1920', 10);
const QUALITY = parseInt(process.env.QUALITY || '85', 10);

const BASE_DIR = 'client/public/images';

if (!ICLOUD_LINK) {
  console.error('Error: ICLOUD_LINK environment variable is required');
  process.exit(1);
}

/**
 * Extract the token from an iCloud shared link
 */
function extractToken(link) {
  const match = link.match(/(?:photos\/|photos\/#)(.+?)(?:\?|$)/);
  if (!match) {
    throw new Error(`Could not extract token from link: ${link}`);
  }
  return match[1];
}

/**
 * Get the base URL for the shared stream API
 */
async function getBaseUrl(token) {
  const response = await axios.post(
    `https://p46-sharedstreams.icloud.com/${token}/sharedstreams/partition`,
    { streamCtag: null },
    {
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://www.icloud.com'
      }
    }
  );

  const hostname = response.data?.X_Apple_MMe_Host;
  if (hostname) {
    return `https://${hostname}/${token}/sharedstreams`;
  }
  return `https://p46-sharedstreams.icloud.com/${token}/sharedstreams`;
}

/**
 * Fetch the list of photos in the shared album
 */
async function fetchPhotoList(baseUrl) {
  const response = await axios.post(
    `${baseUrl}/webstream`,
    { streamCtag: null },
    {
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://www.icloud.com'
      }
    }
  );

  return response.data?.photos || [];
}

/**
 * Get download URLs for photos
 */
async function getDownloadUrls(baseUrl, photoGuids) {
  const response = await axios.post(
    `${baseUrl}/webasseturls`,
    { photoGuids },
    {
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://www.icloud.com'
      }
    }
  );

  return response.data?.items || {};
}

/**
 * Pick the best derivative (highest resolution) from a photo's derivatives
 */
function getBestDerivative(photo) {
  const derivatives = photo.derivatives || {};
  let best = null;
  let maxPixels = 0;

  for (const [key, deriv] of Object.entries(derivatives)) {
    const pixels = (parseInt(deriv.width) || 0) * (parseInt(deriv.height) || 0);
    if (pixels > maxPixels) {
      maxPixels = pixels;
      best = deriv;
    }
  }

  return best;
}

/**
 * Download a single image and optimize it
 */
async function downloadAndOptimize(url, outputPath) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 60000
  });

  let pipeline = sharp(Buffer.from(response.data));
  const metadata = await pipeline.metadata();

  if (MAX_WIDTH > 0 && metadata.width > MAX_WIDTH) {
    pipeline = pipeline.resize(MAX_WIDTH, null, {
      withoutEnlargement: true,
      fit: 'inside'
    });
  }

  pipeline = pipeline.jpeg({ quality: QUALITY, mozjpeg: true });

  const outputBuffer = await pipeline.toBuffer();
  writeFileSync(outputPath, outputBuffer);

  const originalSize = (response.data.byteLength / 1024).toFixed(0);
  const optimizedSize = (outputBuffer.length / 1024).toFixed(0);
  console.log(`  Saved: ${outputPath} (${originalSize}KB -> ${optimizedSize}KB)`);
}

/**
 * Sanitize filename
 */
function sanitizeFilename(name) {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

async function main() {
  console.log('=== iCloud Photo Downloader ===\n');
  console.log(`Link: ${ICLOUD_LINK}`);
  console.log(`Max width: ${MAX_WIDTH > 0 ? MAX_WIDTH + 'px' : 'original'}`);
  console.log(`Quality: ${QUALITY}%`);

  const outputDir = DEST_FOLDER
    ? join(BASE_DIR, DEST_FOLDER)
    : BASE_DIR;

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
    console.log(`Created directory: ${outputDir}`);
  }
  console.log(`Output: ${outputDir}\n`);

  const token = extractToken(ICLOUD_LINK);
  console.log(`Token: ${token}\n`);

  console.log('Finding iCloud server...');
  const baseUrl = await getBaseUrl(token);
  console.log(`Server: ${baseUrl}\n`);

  console.log('Fetching photo list...');
  const photos = await fetchPhotoList(baseUrl);
  console.log(`Found ${photos.length} photos\n`);

  if (photos.length === 0) {
    console.log('No photos found in this shared album.');
    return;
  }

  const photoGuids = [];
  const photoMap = new Map();

  for (const photo of photos) {
    const best = getBestDerivative(photo);
    if (best) {
      photoGuids.push(best.checksum);
      photoMap.set(best.checksum, {
        caption: photo.caption || '',
        dateCreated: photo.dateCreated,
        filename: photo.caption || best.checksum
      });
    }
  }

  console.log('Getting download URLs...');
  const urlMap = await getDownloadUrls(baseUrl, photoGuids);
  console.log(`Got ${Object.keys(urlMap).length} download URLs\n`);

  console.log('Downloading and optimizing...\n');
  let downloaded = 0;
  let errors = 0;

  for (const [checksum, urlInfo] of Object.entries(urlMap)) {
    const info = photoMap.get(checksum) || { filename: checksum };

    let baseName = info.caption || checksum;
    baseName = sanitizeFilename(baseName);
    if (!baseName) baseName = checksum;

    baseName = baseName.replace(/\.(jpg|jpeg|png|heic|heif|webp)$/i, '');
    const filename = `${baseName}.jpg`;
    const outputPath = join(outputDir, filename);

    if (existsSync(outputPath)) {
      console.log(`  Skipped (exists): ${filename}`);
      continue;
    }

    try {
      const url = `https://${urlInfo.url_location}${urlInfo.url_path}`;
      await downloadAndOptimize(url, outputPath);
      downloaded++;
    } catch (err) {
      console.error(`  Error downloading ${filename}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Downloaded: ${downloaded}`);
  console.log(`Errors: ${errors}`);
  console.log(`Skipped: ${Object.keys(urlMap).length - downloaded - errors}`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
