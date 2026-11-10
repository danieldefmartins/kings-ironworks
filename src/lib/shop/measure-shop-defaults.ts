// The shop's usual parts, in ONE place. A one-tap answer ("Wall clip"), the
// forms and the 3D drawing all read these, so changing a number here changes
// what is recorded, what is offered and what is drawn.
//
// Everything stays editable on the sheet: these only fill what is still blank.

import type { AttachMethod, MeasureData, Termination, TermHardware } from "./measure";
import type { SiteObject } from "./measure-site";

type HardwareDefaults = Pick<TermHardware, "profile" | "thickness" | "holeDia" | "holeSpacing" | "orientation" | "fastener" | "qty" | "shopField">;

export const SHOP_DEFAULTS = {
  /** Rail end to a wall or column: 1-1/2" x 1/4" flat bar folded into a clip. A 1" tab screws to the wall; the rail sits 1-1/2" off it. */
  wallClip: {
    profile: 'Flat bar 1 1/2" x 1/4", folded: 1" tab on the wall, 1 1/2" off the wall',
    thickness: "1/4",
    holeDia: "",
    holeSpacing: "",
    orientation: '1" tab flat on the wall, rail welded to the 1 1/2" leg',
    fastener: "Screw",
    qty: "1",
    shopField: "shop_weld",
  } satisfies HardwareDefaults,
  /** Rail end to a wall: flat plate, four anchors. */
  wallPlate: {
    profile: 'Plate 4" x 4" x 1/4"',
    thickness: "1/4",
    holeDia: "7/16",
    holeSpacing: "2 1/2",
    orientation: "Flat on the wall, rail centred",
    fastener: '3/8" x 3" anchor',
    qty: "4",
    shopField: "shop_weld",
  } satisfies HardwareDefaults,
  /** Sizes the drawing uses, in inches. */
  draw: {
    /** `tab` lies on the wall, `standoff` is the gap it holds the rail off the wall, `width` is the flat bar. */
    clip: { tab: 1, standoff: 1.5, width: 1.5, thickness: 0.25 },
    plate: { width: 4, height: 4, thickness: 0.25 },
    /** A post whose material is not chosen yet is still drawn as a post. */
    post: { size: 1.5, previewHeight: 36 },
    basePlate: { size: 5, thickness: 0.375 },
  },
  /** One-tap sizes for a column the shop makes (shaft width, inches). */
  columnSizes: ["4", "6", "8", "10", "12"],
} as const;

const HARDWARE_BY_METHOD: Partial<Record<AttachMethod, HardwareDefaults>> = {
  clip: SHOP_DEFAULTS.wallClip,
  wall_plate: SHOP_DEFAULTS.wallPlate,
};

/** Fill the blank hardware fields of a rail end with the shop's usual part for its method. */
export function applyShopHardware(t: Termination): void {
  const defaults = HARDWARE_BY_METHOD[t.method];
  if (!defaults) return;
  const hw = t.hardware as unknown as Record<string, string>;
  for (const [key, value] of Object.entries(defaults)) if (!hw[key]?.trim()) hw[key] = value;
}

/** One line a fabricator can read: the usual clip, its holes and fasteners. */
export function shopClipText(): string {
  const c = SHOP_DEFAULTS.wallClip;
  return `${c.profile} · ${c.qty} x ${c.fastener.toLowerCase()}`;
}

/** A rail end that attaches to a drawn column takes the column's numbers: they are entered once. */
export function linkColumn(t: Termination, column: SiteObject): void {
  t.columnId = column.id;
  t.columnW = column.length;
  t.columnD = column.section === "round" ? column.length : column.depth;
  t.molding = column.baseProjection ?? "";
  t.moldingHeight = column.baseHeight ?? "";
}

/** Re-read every linked rail end after a column changed (or was removed). */
export function syncLinkedColumns(d: MeasureData): void {
  for (const sp of d.spans) for (const end of ["start", "end"] as const) {
    const t = sp[end];
    if (!t.columnId) continue;
    const column = d.site?.objects.find((o) => o.id === t.columnId && (o.kind === "column" || o.kind === "post"));
    if (column && t.attachTo === "existing_post") linkColumn(t, column);
    else delete t.columnId;
  }
}

/** Columns a rail end can attach to. */
export function siteColumns(d: MeasureData): SiteObject[] {
  return (d.site?.objects || []).filter((o) => o.kind === "column" || o.kind === "post");
}
