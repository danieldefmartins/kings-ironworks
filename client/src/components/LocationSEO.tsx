import { useEffect } from 'react';

interface LocationSEOProps {
  location: 'cape-cod' | 'miami' | 'boston';
}

/**
 * Location-specific SEO metadata
 * Updates page title and meta description for location landing pages
 */
export default function LocationSEO({ location }: LocationSEOProps) {
  useEffect(() => {
    const seoData = {
      'cape-cod': {
        title: 'Cape Cod Ironwork & Fire Escape Services | Kings Ironworks',
        description: 'Cape Cod\'s premier ironwork specialists. Licensed fire escape installation, custom gates, railings, and historic restoration. Serving all of Cape Cod and the Islands. Call +1 508-955-5006',
        keywords: 'cape cod ironwork, fire escape cape cod, custom gates cape cod, railings cape cod, historic restoration cape cod, ironwork massachusetts',
      },
      'miami': {
        title: 'Miami Ironwork & Fire Escape Services | Kings Ironworks',
        description: 'South Florida\'s trusted ironwork specialists. Hurricane-rated gates, railings, fire escapes, and custom fabrication. Serving Miami-Dade and Broward Counties. Call +1 754-240-0082',
        keywords: 'miami ironwork, fire escape miami, custom gates miami, railings miami, hurricane rated ironwork, ironwork florida, south florida ironwork',
      },
      'boston': {
        title: 'Boston Ironwork & Fire Escape Services | Kings Ironworks',
        description: 'Boston\'s premier historic ironwork restoration and licensed fire escape specialists. Custom artisan fabrication for over 20 years. Serving Greater Boston, Worcester, and Cape Cod. Call +1 617-404-2589',
        keywords: 'boston ironwork, fire escape boston, historic restoration boston, custom ironwork massachusetts, licensed fire escape installer',
      },
    };

    const data = seoData[location];

    // Update page title
    document.title = data.title;

    // Update or create meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', data.description);

    // Update or create meta keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', data.keywords);

    // Cleanup function to reset title when component unmounts
    return () => {
      document.title = 'Kings Ironworks - Boston\'s Premier Historic Ironwork & Fire Escape Specialists';
    };
  }, [location]);

  return null;
}
