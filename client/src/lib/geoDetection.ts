/**
 * Geo-detection utilities for location-based routing
 * Detects user location and routes to appropriate landing page
 */

export type LocationCode = 'boston' | 'cape-cod' | 'worcester' | 'miami' | 'new-hampshire' | 'maine' | 'rhode-island' | 'new-york' | 'connecticut' | 'default';

export interface GeoLocation {
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Detect user's location using IP geolocation API
 */
export async function detectUserLocation(): Promise<GeoLocation | null> {
  try {
    // Use ipapi.co for free IP geolocation
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) {
      throw new Error('Geolocation API failed');
    }

    const data = await response.json();
    return {
      city: data.city,
      region: data.region,
      country: data.country_name,
      latitude: data.latitude,
      longitude: data.longitude,
    };
  } catch (error) {
    console.error('Failed to detect location:', error);
    return null;
  }
}

/**
 * Determine which location landing page to show based on geo data
 */
export function getLocationCode(geoLocation: GeoLocation | null): LocationCode {
  if (!geoLocation) {
    return 'default';
  }

  const { city, region } = geoLocation;
  const cityLower = city?.toLowerCase() || '';
  const regionLower = region?.toLowerCase() || '';

  // IMPORTANT: Always check REGION first to avoid city-name collisions.
  // Cities like Manchester, Bristol, Rochester exist in multiple states.
  // The region from the IP API is the most reliable indicator.

  // 1. Check region/state first — this is the most accurate signal
  if (regionLower.includes('florida') || regionLower === 'fl') {
    return 'miami';
  }

  if (regionLower.includes('new york') || regionLower === 'ny') {
    return 'new-york';
  }

  if (regionLower.includes('new hampshire') || regionLower === 'nh') {
    // Check for specific NH coastal/border towns near MA
    const nhCoastalCities = [
      'portsmouth', 'hampton', 'exeter', 'newburyport', 'seabrook',
      'rye', 'north hampton', 'stratham', 'newmarket', 'durham',
      'dover', 'rochester', 'somersworth', 'newington'
    ];
    // All NH cities go to NH page
    return 'new-hampshire';
  }

  if (regionLower.includes('maine') || regionLower === 'me') {
    return 'maine';
  }

  if (regionLower.includes('connecticut') || regionLower === 'ct') {
    return 'connecticut';
  }

  if (regionLower.includes('rhode island') || regionLower === 'ri') {
    return 'rhode-island';
  }

  if (regionLower.includes('vermont') || regionLower === 'vt') {
    return 'default'; // Vermont page exists at /vermont but no specific location code
  }

  if (regionLower.includes('massachusetts') || regionLower === 'ma') {
    // Within MA, check specific sub-regions
    const capeCodeCities = [
      'barnstable', 'bourne', 'brewster', 'chatham', 'dennis', 'eastham',
      'falmouth', 'harwich', 'mashpee', 'orleans', 'provincetown', 'sandwich',
      'truro', 'wellfleet', 'yarmouth', 'hyannis', 'woods hole'
    ];

    if (capeCodeCities.some(cc => cityLower.includes(cc))) {
      return 'cape-cod';
    }

    const worcesterCities = [
      'worcester', 'shrewsbury', 'westborough', 'northborough',
      'southborough', 'marlborough', 'grafton', 'millbury',
      'leicester', 'spencer', 'oxford', 'webster', 'dudley',
      'sturbridge', 'charlton', 'southbridge', 'leominster', 'fitchburg'
    ];

    if (worcesterCities.some(wc => cityLower.includes(wc))) {
      return 'worcester';
    }

    // North Shore MA (near NH border) — still route to Boston/default
    // These are NOT New Hampshire even though they're near the border
    const northShoreCities = [
      'newburyport', 'amesbury', 'salisbury', 'merrimac', 'haverhill',
      'methuen', 'lawrence', 'andover', 'north andover', 'georgetown',
      'rowley', 'ipswich', 'essex', 'gloucester', 'rockport',
      'nahant', 'swampscott', 'marblehead', 'peabody', 'danvers',
      'beverly', 'salem', 'lynn', 'saugus'
    ];

    // All other MA cities go to Boston
    return 'boston';
  }

  // 2. If region didn't match, fall back to city-based detection
  // Only use cities that are UNIQUE to their state (no duplicates)

  const uniqueNYCities = [
    'new york', 'manhattan', 'brooklyn', 'queens', 'bronx', 'staten island',
    'yonkers', 'buffalo', 'syracuse', 'albany', 'schenectady', 'utica',
    'white plains', 'niagara falls', 'long island', 'hempstead'
  ];

  if (uniqueNYCities.some(nc => cityLower.includes(nc))) {
    return 'new-york';
  }

  const uniqueCTCities = [
    'hartford', 'new haven', 'stamford', 'bridgeport', 'waterbury',
    'norwalk', 'danbury', 'new britain', 'greenwich', 'fairfield',
    'west hartford', 'stratford'
  ];

  if (uniqueCTCities.some(ct => cityLower.includes(ct))) {
    return 'connecticut';
  }

  const uniqueMiamiCities = [
    'miami', 'miami beach', 'coral gables', 'hialeah', 'homestead',
    'fort lauderdale', 'pembroke pines', 'boca raton',
    'west palm beach', 'pompano beach', 'tampa', 'orlando', 'jacksonville'
  ];

  if (uniqueMiamiCities.some(mc => cityLower.includes(mc))) {
    return 'miami';
  }

  return 'default';
}

/**
 * Get the appropriate landing page path based on location
 */
export function getLocationLandingPage(locationCode: LocationCode): string {
  const routes: Record<LocationCode, string> = {
    'boston': '/',
    'cape-cod': '/cape-cod',
    'worcester': '/worcester',
    'miami': '/miami',
    'new-hampshire': '/new-hampshire',
    'maine': '/maine',
    'rhode-island': '/rhode-island',
    'new-york': '/new-york',
    'connecticut': '/connecticut',
    'default': '/',
  };

  return routes[locationCode];
}

/**
 * Store the detected location code in sessionStorage for use by other components
 */
export function storeLocationCode(code: LocationCode): void {
  sessionStorage.setItem('geo_location_code', code);
}

/**
 * Retrieve the stored location code
 */
export function getStoredLocationCode(): LocationCode | null {
  return sessionStorage.getItem('geo_location_code') as LocationCode | null;
}

/**
 * Check if geo-redirect has already been performed in this session
 */
export function hasGeoRedirected(): boolean {
  return sessionStorage.getItem('geo_redirected') === 'true';
}

/**
 * Mark that geo-redirect has been performed
 */
export function markGeoRedirected(): void {
  sessionStorage.setItem('geo_redirected', 'true');
}

/**
 * Clear geo-redirect flag (useful for testing)
 */
export function clearGeoRedirect(): void {
  sessionStorage.removeItem('geo_redirected');
}
