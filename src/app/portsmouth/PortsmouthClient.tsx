"use client";

import CityLandingClient, { Award, Shield, Wrench, Clock } from "@/components/CityLandingClient";

export default function PortsmouthClient() {
  return (
    <CityLandingClient
      cityName="Portsmouth"
      stateName="NH"
      stateFullName="New Hampshire"
      services={[
        {
          title: "Custom Staircases",
          description: "Curved, floating, spiral, and traditional staircases custom-designed for Portsmouth homes",
          icon: Award,
        },
        {
          title: "Railings & Balustrades",
          description: "Interior and exterior railings — glass panel, cable, ornamental iron, and modern rod styles",
          icon: Shield,
        },
        {
          title: "Gates & Fencing",
          description: "Driveway gates, pedestrian gates, and decorative iron fencing for Portsmouth properties",
          icon: Wrench,
        },
        {
          title: "Structural Steel",
          description: "Structural steel and marine-grade ironwork for Seacoast NH properties",
          icon: Clock,
        },
      ]}
      towns={[
        "Rye", "North Hampton", "Hampton", "Exeter", "Newmarket",
        "Stratham", "Greenland", "Newington", "Dover", "Durham",
      ]}
    />
  );
}
