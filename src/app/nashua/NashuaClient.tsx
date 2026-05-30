"use client";

import CityLandingClient, { Award, Shield, Wrench, Clock } from "@/components/CityLandingClient";

export default function NashuaClient() {
  return (
    <CityLandingClient
      cityName="Nashua"
      stateName="NH"
      stateFullName="New Hampshire"
      services={[
        {
          title: "Custom Staircases",
          description: "Curved, floating, spiral, and traditional staircases custom-designed for Nashua homes",
          icon: Award,
        },
        {
          title: "Railings & Balustrades",
          description: "Interior and exterior railings — glass panel, cable, ornamental iron, and modern rod styles",
          icon: Shield,
        },
        {
          title: "Gates & Fencing",
          description: "Driveway gates, pedestrian gates, and decorative iron fencing for Nashua properties",
          icon: Wrench,
        },
        {
          title: "Structural Steel",
          description: "Commercial and residential structural steel for Greater Nashua",
          icon: Clock,
        },
      ]}
      towns={[
        "Hudson", "Litchfield", "Merrimack", "Milford", "Amherst",
        "Hollis", "Brookline", "Pelham", "Windham", "Londonderry",
      ]}
    />
  );
}
