"use client";

import CityLandingClient, { Award, Shield, Wrench, Clock } from "@/components/CityLandingClient";

export default function NorthShoreClient() {
  return (
    <CityLandingClient
      cityName="North Shore"
      stateName="MA"
      stateFullName="Massachusetts"
      services={[
        {
          title: "Custom Staircases",
          description: "Curved, floating, spiral, and traditional staircases custom-designed for North Shore homes",
          icon: Award,
        },
        {
          title: "Railings & Balustrades",
          description: "Interior and exterior railings — glass panel, cable, ornamental iron, and modern rod styles",
          icon: Shield,
        },
        {
          title: "Gates & Fencing",
          description: "Driveway gates, pedestrian gates, and decorative iron fencing for North Shore properties",
          icon: Wrench,
        },
        {
          title: "Structural Steel",
          description: "Commercial and residential structural steel for North Shore MA properties",
          icon: Clock,
        },
      ]}
      towns={[
        "Salem", "Beverly", "Peabody", "Danvers", "Marblehead", "Swampscott",
        "Nahant", "Lynn", "Saugus", "Gloucester", "Rockport", "Ipswich",
      ]}
    />
  );
}
