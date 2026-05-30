"use client";

import CityLandingClient, { Award, Shield, Wrench, Clock } from "@/components/CityLandingClient";

export default function LowellClient() {
  return (
    <CityLandingClient
      cityName="Lowell"
      stateName="MA"
      stateFullName="Massachusetts"
      services={[
        {
          title: "Custom Staircases",
          description: "Curved, floating, spiral, and traditional staircases custom-designed for Lowell homes",
          icon: Award,
        },
        {
          title: "Railings & Balustrades",
          description: "Interior and exterior railings — glass panel, cable, ornamental iron, and modern rod styles",
          icon: Shield,
        },
        {
          title: "Gates & Fencing",
          description: "Driveway gates, pedestrian gates, and decorative iron fencing for Lowell properties",
          icon: Wrench,
        },
        {
          title: "Structural Steel",
          description: "Structural steel and commercial ironwork for Greater Lowell properties",
          icon: Clock,
        },
      ]}
      towns={[
        "Chelmsford", "Dracut", "Tewksbury", "Billerica", "Wilmington",
        "Tyngsborough", "Westford", "Littleton", "Acton", "Groton",
      ]}
    />
  );
}
