/**
 * Geo-detection utilities for location-based routing
 * Detects user location and routes to appropriate landing page
 */

export type LocationCode = 'boston' | 'cape-cod' | 'miami' | 'default';

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

  // Cape Cod detection
  const capeCodeCities = [
    'barnstable', 'bourne', 'brewster', 'chatham', 'dennis', 'eastham',
    'falmouth', 'harwich', 'mashpee', 'orleans', 'provincetown', 'sandwich',
    'truro', 'wellfleet', 'yarmouth', 'hyannis', 'woods hole'
  ];
  
  if (capeCodeCities.some(cc => cityLower.includes(cc))) {
    return 'cape-cod';
  }

  // Miami/South Florida detection
  const miamiCities = [
    'miami', 'miami beach', 'coral gables', 'hialeah', 'homestead',
    'fort lauderdale', 'hollywood', 'pembroke pines', 'boca raton',
    'west palm beach', 'pompano beach', 'davie', 'plantation'
  ];
  
  if (miamiCities.some(mc => cityLower.includes(mc)) || 
      regionLower.includes('florida') && (cityLower.includes('miami') || regionLower.includes('dade') || regionLower.includes('broward'))) {
    return 'miami';
  }

  // Boston/Greater Boston detection (default for Massachusetts)
  const bostonCities = [
    'boston', 'cambridge', 'somerville', 'brookline', 'newton', 'quincy',
    'waltham', 'medford', 'malden', 'everett', 'revere', 'chelsea',
    'worcester', 'lowell', 'lynn', 'salem'
  ];
  
  if (bostonCities.some(bc => cityLower.includes(bc)) || 
      regionLower.includes('massachusetts') || regionLower.includes('ma')) {
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
    'miami': '/miami',
    'default': '/',
  };
  
  return routes[locationCode];
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
