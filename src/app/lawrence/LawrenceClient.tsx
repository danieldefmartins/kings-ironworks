"use client";

import CityLandingClient, { Award, Shield, Wrench, Clock } from "@/components/CityLandingClient";

export default function LawrenceClient() {
  return (
    <CityLandingClient
      cityName="Lawrence"
      stateName="MA"
      stateFullName="Massachusetts"
      services={[
        {
          title: "Custom Staircases",
          description: "Curved, floating, spiral, and traditional staircases custom-designed for Lawrence homes",
          icon: Award,
        },
        {
          title: "Railings & Balustrades",
          description: "Interior and exterior railings — glass panel, cable, ornamental iron, and modern rod styles",
          icon: Shield,
        },
        {
          title: "Gates & Fencing",
          description: "Driveway gates, pedestrian gates, and decorative iron fencing for Lawrence properties",
          icon: Wrench,
        },
        {
          title: "Structural Steel",
          description: "Structural steel fabrication and fire escape services for Lawrence area buildings",
          icon: Clock,
        },
      ]}
      towns={[
        "Methuen", "Andover", "North Andover", "Haverhill", "Georgetown",
        "Boxford", "Merrimac", "Amesbury", "Newburyport", "Salisbury",
      ]}
    />
  );
}
