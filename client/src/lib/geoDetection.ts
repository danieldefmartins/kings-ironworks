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

  // Cape Cod detection (specific cities first)
  const capeCodeCities = [
    'barnstable', 'bourne', 'brewster', 'chatham', 'dennis', 'eastham',
    'falmouth', 'harwich', 'mashpee', 'orleans', 'provincetown', 'sandwich',
    'truro', 'wellfleet', 'yarmouth', 'hyannis', 'woods hole'
  ];

  if (capeCodeCities.some(cc => cityLower.includes(cc))) {
    return 'cape-cod';
  }

  // New York detection
  const newYorkCities = [
    'new york', 'manhattan', 'brooklyn', 'queens', 'bronx', 'staten island',
    'yonkers', 'buffalo', 'rochester', 'syracuse', 'albany', 'new rochelle',
    'mount vernon', 'schenectady', 'utica', 'white plains', 'troy',
    'niagara falls', 'long island', 'hempstead', 'islip', 'oyster bay'
  ];

  if (newYorkCities.some(nc => cityLower.includes(nc)) ||
      regionLower.includes('new york') || regionLower === 'ny') {
    return 'new-york';
  }

  // Connecticut detection
  const connecticutCities = [
    'hartford', 'new haven', 'stamford', 'bridgeport', 'waterbury',
    'norwalk', 'danbury', 'new britain', 'greenwich', 'fairfield',
    'west hartford', 'milford', 'stratford', 'manchester', 'bristol'
  ];

  if (connecticutCities.some(ct => cityLower.includes(ct)) ||
      regionLower.includes('connecticut') || regionLower === 'ct') {
    return 'connecticut';
  }

  // Rhode Island detection
  const rhodeIslandCities = [
    'providence', 'warwick', 'cranston', 'pawtucket', 'east providence',
    'woonsocket', 'newport', 'central falls', 'west warwick', 'coventry',
    'cumberland', 'north providence', 'south kingstown', 'bristol', 'westerly'
  ];

  if (rhodeIslandCities.some(ri => cityLower.includes(ri)) ||
      regionLower.includes('rhode island') || regionLower === 'ri') {
    return 'rhode-island';
  }

  // New Hampshire detection
  const newHampshireCities = [
    'manchester', 'nashua', 'concord', 'dover', 'rochester', 'keene',
    'portsmouth', 'laconia', 'lebanon', 'claremont', 'berlin', 'franklin',
    'somersworth', 'hampton', 'exeter', 'derry', 'londonderry', 'hudson'
  ];

  if (newHampshireCities.some(nh => cityLower.includes(nh)) ||
      regionLower.includes('new hampshire') || regionLower === 'nh') {
    return 'new-hampshire';
  }

  // Maine detection
  const maineCities = [
    'portland', 'lewiston', 'bangor', 'south portland', 'auburn',
    'biddeford', 'sanford', 'saco', 'westbrook', 'augusta',
    'waterville', 'brewer', 'presque isle', 'bath', 'caribou',
    'ellsworth', 'old orchard beach', 'scarborough', 'brunswick', 'gorham'
  ];

  if (maineCities.some(me => cityLower.includes(me)) ||
      regionLower.includes('maine') || regionLower === 'me') {
    return 'maine';
  }

  // Florida detection - route ALL Florida visitors to Miami landing page
  if (regionLower.includes('florida') || regionLower === 'fl') {
    return 'miami';
  }

  // Specific Miami/South Florida cities for extra certainty
  const miamiCities = [
    'miami', 'miami beach', 'coral gables', 'hialeah', 'homestead',
    'fort lauderdale', 'hollywood', 'pembroke pines', 'boca raton',
    'west palm beach', 'pompano beach', 'davie', 'plantation', 'tampa',
    'orlando', 'jacksonville', 'tallahassee', 'fort myers', 'naples'
  ];

  if (miamiCities.some(mc => cityLower.includes(mc))) {
    return 'miami';
  }

  // Worcester/Central Massachusetts detection
  const worcesterCities = [
    'worcester', 'auburn', 'shrewsbury', 'westborough', 'northborough',
    'southborough', 'marlborough', 'framingham', 'natick', 'milford',
    'grafton', 'millbury', 'leicester', 'spencer', 'oxford'
  ];

  if (worcesterCities.some(wc => cityLower.includes(wc))) {
    return 'worcester';
  }

  // Boston/Greater Boston detection (default for Massachusetts)
  const bostonCities = [
    'boston', 'cambridge', 'somerville', 'brookline', 'newton', 'quincy',
    'waltham', 'medford', 'malden', 'everett', 'revere', 'chelsea',
    'lowell', 'lynn', 'salem'
  ];

  if (bostonCities.some(bc => cityLower.includes(bc)) ||
      regionLower.includes('massachusetts') || regionLower === 'ma') {
    return 'boston';
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
