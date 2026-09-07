// Server-only private artifacts. The desktop worker never receives a database key.
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://scasgwrikoqdwlwlwcff.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
export async function drawingUploadUrl(path: string) {
  const res = await fetch(`${url}/storage/v1/object/upload/sign/shop-drawings/${path}`, { method: 'POST', headers, body: '{}', cache: 'no-store' });
  if (!res.ok) throw new Error('Could not prepare drawing upload');
  const data = await res.json();
  return `${url}/storage/v1${data.url}` as string;
}
export async function drawingDownloadUrl(path: string) {
  const res = await fetch(`${url}/storage/v1/object/sign/shop-drawings/${path}`, { method: 'POST', headers, body: JSON.stringify({ expiresIn: 300 }), cache: 'no-store' });
  if (!res.ok) throw new Error('Drawing file is unavailable');
  const data = await res.json();
  return `${url}/storage/v1${data.signedURL}` as string;
}
export async function drawingObjectExists(path: string) {
  const res = await fetch(`${url}/storage/v1/object/info/shop-drawings/${path}`, { headers, cache: 'no-store' });
  return res.ok;
}
