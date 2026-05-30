"use client";

import CityLandingClient, { Award, Shield, Wrench, Clock } from "@/components/CityLandingClient";

export default function EverettClient() {
  return (
    <CityLandingClient
      cityName="Everett"
      stateName="MA"
      stateFullName="Massachusetts"
      services={[
        {
          title: "Custom Staircases",
          description: "Curved, floating, spiral, and traditional staircases custom-designed for Everett homes",
          icon: Award,
        },
        {
          title: "Railings & Balustrades",
          description: "Interior and exterior railings — glass panel, cable, ornamental iron, and modern rod styles",
          icon: Shield,
        },
        {
          title: "Gates & Fencing",
          description: "Driveway gates, pedestrian gates, and decorative iron fencing for Everett properties",
          icon: Wrench,
        },
        {
          title: "Structural Steel",
          description: "Home base — our fabrication shop is right here in Everett, serving the entire region",
          icon: Clock,
        },
      ]}
      towns={[
        "Malden", "Medford", "Somerville", "Chelsea", "Revere",
        "East Boston", "Charlestown", "Cambridge", "Arlington", "Melrose",
      ]}
    />
  );
}
