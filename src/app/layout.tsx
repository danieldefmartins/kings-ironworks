import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import StickyMobileCTA from "@/components/StickyMobileCTA";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "King Iron Works | Custom Ironwork & Fire Escape Specialists",
    template: "%s | King Iron Works",
  },
  description:
    "Custom ironwork, fire escape installation & repair, structural steel, and historic restoration. 20+ years serving New England, New York & Florida. Licensed & insured.",
  keywords: [
    "custom ironwork",
    "fire escape repair",
    "fire escape installation",
    "iron railings",
    "custom staircases",
    "structural steel",
    "historic restoration",
    "iron gates",
    "iron fences",
    "balcony railings",
    "cable railings",
    "deck railings",
    "window guards",
    "fire escape Boston",
    "ironwork Massachusetts",
    "custom metalwork",
  ],
  metadataBase: new URL("https://kingsironworks.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://kingsironworks.com",
    siteName: "King Iron Works",
    title: "King Iron Works | Custom Ironwork & Fire Escape Specialists",
    description:
      "Custom ironwork, fire escape installation & repair, structural steel, and historic restoration. 20+ years, 1000+ projects. Serving 9 states.",
    images: [
      {
        url: "/images/homepage/project2-hero.jpg",
        width: 1200,
        height: 630,
        alt: "King Iron Works — Custom Ornamental Ironwork",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "King Iron Works | Custom Ironwork & Fire Escape Specialists",
    description:
      "Custom ironwork, fire escapes, structural steel, and historic restoration. 20+ years serving NE, NY & FL.",
    images: ["/images/homepage/project2-hero.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://kingsironworks.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              "@id": "https://kingsironworks.com",
              name: "King Iron Works",
              image: "https://kingsironworks.com/images/homepage/project2-hero.jpg",
              url: "https://kingsironworks.com",
              telephone: "+1-617-404-2589",
              email: "info@kingsironworks.com",
              address: {
                "@type": "PostalAddress",
                streetAddress: "69 Norman St, Unit 20",
                addressLocality: "Everett",
                addressRegion: "MA",
                postalCode: "02149",
                addressCountry: "US",
              },
              geo: {
                "@type": "GeoCoordinates",
                latitude: 42.4084,
                longitude: -71.0537,
              },
              openingHoursSpecification: [
                {
                  "@type": "OpeningHoursSpecification",
                  dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                  opens: "07:00",
                  closes: "17:00",
                },
              ],
              priceRange: "$$$",
              description:
                "Custom ironwork, fire escape installation & repair, structural steel, and historic restoration. 20+ years serving New England, New York & Florida.",
              foundingDate: "2004",
              areaServed: [
                { "@type": "State", name: "Massachusetts" },
                { "@type": "State", name: "New Hampshire" },
                { "@type": "State", name: "Maine" },
                { "@type": "State", name: "Connecticut" },
                { "@type": "State", name: "Rhode Island" },
                { "@type": "State", name: "Vermont" },
                { "@type": "State", name: "New York" },
                { "@type": "State", name: "Florida" },
              ],
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.9",
                reviewCount: "200",
                bestRating: "5",
              },
              hasOfferCatalog: {
                "@type": "OfferCatalog",
                name: "Ironwork Services",
                itemListElement: [
                  { "@type": "Offer", itemOffered: { "@type": "Service", name: "Custom Staircases" } },
                  { "@type": "Offer", itemOffered: { "@type": "Service", name: "Fire Escape Installation & Repair" } },
                  { "@type": "Offer", itemOffered: { "@type": "Service", name: "Interior & Exterior Railings" } },
                  { "@type": "Offer", itemOffered: { "@type": "Service", name: "Custom Gates & Fences" } },
                  { "@type": "Offer", itemOffered: { "@type": "Service", name: "Structural Steel" } },
                  { "@type": "Offer", itemOffered: { "@type": "Service", name: "Historic Building Restoration" } },
                ],
              },
            }),
          }}
        />
      </head>
      {/* Google Tag Manager */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=GT-P3H97K4D"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'GT-P3H97K4D');
          gtag('config', 'G-040FS71NJ6');
          gtag('config', 'AW-817727428');`}
      </Script>
      {/* Google Ads phone conversion tracking */}
      <Script id="google-ads-conversion" strategy="afterInteractive">
        {`function gtag_report_conversion(url) {
          var callback = function () {
            if (typeof(url) != 'undefined') { window.location = url; }
          };
          gtag('event', 'conversion', {
            'send_to': 'AW-817727428/xe4zCLWS9IIcEMSP9oUD',
            'event_callback': callback
          });
          return false;
        }`}
      </Script>
      <body className="font-body antialiased bg-background text-foreground min-h-screen">
        <Navigation />
        {children}
        <Footer />
        <StickyMobileCTA />
        {/* GHL Chat Widget */}
        <Script
          src="https://widgets.leadconnectorhq.com/loader.js"
          data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js"
          data-widget-id="699737916e6009b3eccf3dff"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
