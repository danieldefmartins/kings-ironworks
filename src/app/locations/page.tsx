import type { Metadata } from "next";
import LocationsClient from "./LocationsClient";

export const metadata: Metadata = {
  title: "Service Locations | King Iron Works - Custom Ironwork Across 9 States",
  description:
    "King Iron Works serves Massachusetts, New Hampshire, Maine, Rhode Island, Connecticut, Vermont, New York, and Florida. Built in Everett, MA — delivered to your door. Call (617) 404-2589.",
  keywords:
    "king iron works locations, ironwork service areas, ironwork northeast, ironwork florida, custom ironwork boston, fire escape service areas",
  alternates: {
    canonical: "https://kingsironworks.com/locations",
  },
  openGraph: {
    title: "Service Locations | King Iron Works",
    description:
      "Built in Everett, MA — delivered to your door. Serving 9 states across the Northeast and Florida.",
    url: "https://kingsironworks.com/locations",
  },
};

export default function LocationsPage() {
  return <LocationsClient />;
}
