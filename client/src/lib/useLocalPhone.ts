import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { PHONE_NUMBERS } from './constants';

type PhoneEntry = typeof PHONE_NUMBERS[keyof typeof PHONE_NUMBERS];

/**
 * Maps route paths to their corresponding phone numbers.
 * Used to show local phone numbers when users are browsing location pages.
 */
const ROUTE_PHONE_MAP: Record<string, PhoneEntry> = {
  '/cape-cod': PHONE_NUMBERS.CAPE_COD,
  '/worcester': PHONE_NUMBERS.WORCESTER,
  '/miami': PHONE_NUMBERS.MIAMI,
  '/new-hampshire': PHONE_NUMBERS.NEW_HAMPSHIRE,
  '/maine': PHONE_NUMBERS.MAINE,
  '/rhode-island': PHONE_NUMBERS.RHODE_ISLAND,
  '/new-york': PHONE_NUMBERS.NEW_YORK,
  '/connecticut': PHONE_NUMBERS.CONNECTICUT,
};

/**
 * Maps geo location codes (from sessionStorage) to phone numbers.
 */
const GEO_PHONE_MAP: Record<string, PhoneEntry> = {
  'cape-cod': PHONE_NUMBERS.CAPE_COD,
  'worcester': PHONE_NUMBERS.WORCESTER,
  'miami': PHONE_NUMBERS.MIAMI,
  'new-hampshire': PHONE_NUMBERS.NEW_HAMPSHIRE,
  'maine': PHONE_NUMBERS.MAINE,
  'rhode-island': PHONE_NUMBERS.RHODE_ISLAND,
  'new-york': PHONE_NUMBERS.NEW_YORK,
  'connecticut': PHONE_NUMBERS.CONNECTICUT,
  'boston': PHONE_NUMBERS.BOSTON,
};

/**
 * Hook that returns the appropriate local phone number based on:
 * 1. Current route (if on a location landing page)
 * 2. Detected geo location (stored in sessionStorage by GeoRedirect)
 * 3. Falls back to MAIN number
 */
export function useLocalPhone(): PhoneEntry {
  const [location] = useLocation();
  const [phone, setPhone] = useState<PhoneEntry>(PHONE_NUMBERS.MAIN);

  useEffect(() => {
    // Priority 1: Current route determines phone
    const routePhone = ROUTE_PHONE_MAP[location];
    if (routePhone) {
      setPhone(routePhone);
      return;
    }

    // Priority 2: Geo-detected location from sessionStorage
    const geoCode = sessionStorage.getItem('geo_location_code');
    if (geoCode) {
      const geoPhone = GEO_PHONE_MAP[geoCode];
      if (geoPhone) {
        setPhone(geoPhone);
        return;
      }
    }

    // Fallback: main number
    setPhone(PHONE_NUMBERS.MAIN);
  }, [location]);

  return phone;
}
