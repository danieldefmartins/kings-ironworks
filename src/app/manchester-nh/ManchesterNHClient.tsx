"use client";

import CityLandingClient, { Award, Shield, Wrench, Clock } from "@/components/CityLandingClient";

export default function ManchesterNHClient() {
  return (
    <CityLandingClient
      cityName="Manchester"
      stateName="NH"
      stateFullName="New Hampshire"
      services={[
        {
          title: "Custom Staircases",
          description: "Curved, floating, spiral, and traditional staircases custom-designed for Manchester homes",
          icon: Award,
        },
        {
          title: "Railings & Balustrades",
          description: "Interior and exterior railings — glass panel, cable, ornamental iron, and modern rod styles",
          icon: Shield,
        },
        {
          title: "Gates & Fencing",
          description: "Driveway gates, pedestrian gates, and decorative iron fencing for Manchester properties",
          icon: Wrench,
        },
        {
          title: "Structural Steel",
          description: "Structural steel and custom ironwork for Manchester area projects",
          icon: Clock,
        },
      ]}
      towns={[
        "Bedford", "Goffstown", "Hooksett", "Auburn", "Candia",
        "Derry", "Londonderry", "Litchfield", "Bow", "Dunbarton",
      ]}
    />
  );
}
