import { useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  detectUserLocation,
  getLocationCode,
  getLocationLandingPage,
  hasGeoRedirected,
  markGeoRedirected,
} from '@/lib/geoDetection';

/**
 * GeoRedirect Component
 * Automatically redirects users to their location-specific landing page
 * Only redirects once per session to avoid redirect loops
 */
export default function GeoRedirect() {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // Only redirect if:
    // 1. User is on the home page
    // 2. Haven't already redirected in this session
    // 3. Not already on a location-specific page
    const isHomePage = location === '/';
    const alreadyRedirected = hasGeoRedirected();
    const isLocationPage = location === '/cape-cod' || location === '/worcester' || location === '/miami';

    if (!isHomePage || alreadyRedirected || isLocationPage) {
      return;
    }

    // Perform geo-detection and redirect
    (async () => {
      try {
        const geoLocation = await detectUserLocation();
        const locationCode = getLocationCode(geoLocation);
        const targetPage = getLocationLandingPage(locationCode);

        // Only redirect if target is different from current page
        if (targetPage !== location && targetPage !== '/') {
          markGeoRedirected();
          setLocation(targetPage);
        } else {
          // Mark as redirected even if staying on home page
          markGeoRedirected();
        }
      } catch (error) {
        console.error('Geo-redirect failed:', error);
        // Mark as redirected to prevent retry loops
        markGeoRedirected();
      }
    })();
  }, [location, setLocation]);

  // This component doesn't render anything
  return null;
}
