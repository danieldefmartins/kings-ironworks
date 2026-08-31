"use client";

// The cross-section of the steel, drawn. A fabricator recognises a shape
// faster than a string — "L2 x 2 x 1/4" is a lookup, an angle is a glance.
// Hollow sections show their wall; solids are filled. One weight throughout.

export default function ProfileIcon({
  category,
  className = "h-7 w-7",
}: {
  category: string;
  className?: string;
}) {
  const common = {
    viewBox: "0 0 24 24",
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (category) {
    case "tube_square":
      return (
        <svg {...common}>
          <rect x={4} y={4} width={16} height={16} rx={1.5} />
          <rect x={7} y={7} width={10} height={10} rx={1} />
        </svg>
      );
    case "tube_rect":
      return (
        <svg {...common}>
          <rect x={2.5} y={7} width={19} height={10} rx={1.5} />
          <rect x={5.5} y={10} width={13} height={4} rx={0.8} />
        </svg>
      );
    case "pipe_round":
    case "tube_round":
      return (
        <svg {...common}>
          <circle cx={12} cy={12} r={8} />
          <circle cx={12} cy={12} r={5} />
        </svg>
      );
    case "flat_bar":
      return (
        <svg {...common}>
          <rect x={3} y={9.5} width={18} height={5} rx={1} fill="currentColor" stroke="none" />
        </svg>
      );
    case "plate":
      return (
        <svg {...common}>
          <rect x={2.5} y={10.5} width={19} height={3} rx={0.8} fill="currentColor" stroke="none" />
        </svg>
      );
    case "solid_square":
      return (
        <svg {...common}>
          <rect x={6} y={6} width={12} height={12} rx={1.2} fill="currentColor" stroke="none" />
        </svg>
      );
    case "solid_round":
      return (
        <svg {...common}>
          <circle cx={12} cy={12} r={6.5} fill="currentColor" stroke="none" />
        </svg>
      );
    case "angle":
      // an L, seen end-on
      return (
        <svg {...common}>
          <path d="M5 4v16h14v-3.5H8.5V4H5Z" />
        </svg>
      );
    case "channel":
      // a C, seen end-on
      return (
        <svg {...common}>
          <path d="M18 4H6v16h12v-3.5H9.5v-9H18V4Z" />
        </svg>
      );
    case "beam":
      return (
        <svg {...common}>
          <path d="M5 4h14M5 20h14M12 4v16" />
        </svg>
      );
    case "grating":
      return (
        <svg {...common}>
          <rect x={3.5} y={5.5} width={17} height={13} rx={1} />
          <path d="M8 5.5v13M12 5.5v13M16 5.5v13M3.5 12h17" />
        </svg>
      );
    case "hardware":
      // a bolt: hex head and shank
      return (
        <svg {...common}>
          <path d="M9 4.5h6l3 3v4l-3 3H9l-3-3v-4l3-3Z" />
          <path d="M12 14.5V20" />
        </svg>
      );
    case "consumable":
      // a paint can
      return (
        <svg {...common}>
          <rect x={5.5} y={8} width={13} height={11} rx={1.5} />
          <path d="M5.5 8c0-1.5 2.9-2.5 6.5-2.5S18.5 6.5 18.5 8" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <rect x={5} y={5} width={14} height={14} rx={2} />
        </svg>
      );
  }
}

// Human name for a cross-section, so the middle step reads as a choice of
// profile rather than a database enum.
export function categoryLabel(category: string): string {
  return {
    tube_square: "Square tube",
    tube_rect: "Rectangular tube",
    pipe_round: "Round pipe",
    tube_round: "Round tube",
    flat_bar: "Flat bar",
    solid_square: "Square solid",
    solid_round: "Round solid",
    angle: "Angle",
    channel: "Channel",
    beam: "Beam",
    plate: "Plate",
    grating: "Grating",
    hardware: "Hardware",
    consumable: "Finish",
  }[category] || category;
}
