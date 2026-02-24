import { useEffect } from 'react';

interface LocationSEOProps {
  location: 'cape-cod' | 'miami' | 'boston' | 'worcester' | 'new-hampshire' | 'maine' | 'rhode-island' | 'new-york' | 'connecticut';
}

/**
 * Location-specific SEO metadata
 * Updates page title and meta description for location landing pages
 */
export default function LocationSEO({ location }: LocationSEOProps) {
  useEffect(() => {
    const seoData = {
      'cape-cod': {
        title: 'Cape Cod Ironwork & Fire Escape Services | King Iron Works',
        description: 'Cape Cod\'s premier ironwork specialists. Licensed fire escape installation, custom gates, railings, and historic restoration. Serving all of Cape Cod and the Islands. Call +1 508-955-5006',
        keywords: 'cape cod ironwork, fire escape cape cod, custom gates cape cod, railings cape cod, historic restoration cape cod, ironwork massachusetts',
      },
      'miami': {
        title: 'Miami Ironwork & Fire Escape Services | King Iron Works',
        description: 'South Florida\'s trusted ironwork specialists. Hurricane-rated gates, railings, fire escapes, and custom fabrication. Serving Miami-Dade and Broward Counties. Call +1 754-240-0082',
        keywords: 'miami ironwork, fire escape miami, custom gates miami, railings miami, hurricane rated ironwork, ironwork florida, south florida ironwork',
      },
      'boston': {
        title: 'Boston Ironwork & Fire Escape Services | King Iron Works',
        description: 'Boston\'s premier historic ironwork restoration and licensed fire escape specialists. Custom artisan fabrication for over 20 years. Serving Greater Boston, Worcester, and Cape Cod. Call +1 617-404-2589',
        keywords: 'boston ironwork, fire escape boston, historic restoration boston, custom ironwork massachusetts, licensed fire escape installer',
      },
      'worcester': {
        title: 'Worcester Ironwork & Fire Escape Services | King Iron Works',
        description: 'Central Massachusetts\' trusted ironwork specialists. Licensed fire escape installation, custom gates, railings, and historic restoration. Serving Worcester and surrounding areas. Call +1 508-955-5006',
        keywords: 'worcester ironwork, fire escape worcester, custom gates worcester, railings worcester, historic restoration worcester, ironwork central massachusetts',
      },
      'new-hampshire': {
        title: 'New Hampshire Ironwork & Fire Escape Services | King Iron Works',
        description: 'New Hampshire\'s trusted ironwork specialists. Custom gates, railings, fire escapes, and structural steel. Serving Manchester, Nashua, Concord, and all of NH. Call +1 603-691-3012',
        keywords: 'new hampshire ironwork, fire escape new hampshire, custom gates NH, railings new hampshire, structural steel NH, ironwork manchester nh',
      },
      'maine': {
        title: 'Maine Ironwork & Fire Escape Services | King Iron Works',
        description: 'Maine\'s trusted ironwork specialists. Custom gates, railings, fire escapes, and historic restoration. Serving Portland, Bangor, Augusta, and all of Maine. Call +1 207-503-4700',
        keywords: 'maine ironwork, fire escape maine, custom gates maine, railings maine, historic restoration maine, ironwork portland me',
      },
      'rhode-island': {
        title: 'Rhode Island Ironwork & Fire Escape Services | King Iron Works',
        description: 'Rhode Island\'s premier ironwork specialists. Custom gates, railings, fire escapes, and historic restoration. Serving Providence, Newport, and all of RI. Call +1 401-535-7979',
        keywords: 'rhode island ironwork, fire escape rhode island, custom gates RI, railings rhode island, historic restoration providence, ironwork newport ri',
      },
      'new-york': {
        title: 'New York Ironwork & Fire Escape Services | King Iron Works',
        description: 'New York\'s trusted ironwork specialists. Fire escapes, structural steel, custom fabrication, and building restoration. Serving NYC, Long Island, and all of NY. Call +1 917-809-6492',
        keywords: 'new york ironwork, fire escape new york, custom gates NYC, railings new york, structural steel NY, ironwork manhattan, fire escape nyc',
      },
      'connecticut': {
        title: 'Connecticut Ironwork & Fire Escape Services | King Iron Works',
        description: 'Connecticut\'s trusted ironwork specialists. Custom gates, railings, fire escapes, and historic restoration. Serving Hartford, New Haven, Stamford, and all of CT. Call +1 860-740-4242',
        keywords: 'connecticut ironwork, fire escape connecticut, custom gates CT, railings connecticut, historic restoration hartford, ironwork stamford ct',
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
      document.title = 'King Iron Works - Boston\'s Premier Historic Ironwork & Fire Escape Specialists';
    };
  }, [location]);

  return null;
}
