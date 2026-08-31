// What a job is made of, by what kind of job it is.
//
// A blank "add material" box asks a worker to recall the whole catalog from
// memory, every time. But a spiral staircase is always the same handful of
// parts — a round center column, treads, a helical rail — and it never has a
// gate leaf or a well grate. So the screen should offer the parts this job
// actually has, in the order they get ordered, and nothing else.
//
// Two rules:
//   ROLES, NOT A LIST   you pick "Treads", then what they are made of. The
//                       role is the thing the shop reasons about.
//   TYPICAL IS PRESET   each role names its most common answer, so the normal
//                       job is a tap rather than a decision.
// Free text still exists for anything unusual — this narrows the common case,
// it does not fence anyone in.

export interface MaterialRole {
  key: string;          // stable id, also the i18n key: matrole_<key>
  label: string;        // English fallback
  options: string[];    // what it is usually made of, commonest first
  typical?: string;     // preselected
  unit?: string;        // how it is counted
}

const RAIL_ROLES: MaterialRole[] = [
  { key: "post", label: "Posts", unit: "ea", typical: '1-1/2" sq tube',
    options: ['1-1/2" sq tube', '2" sq tube', '1-1/2" Sch40 pipe', '1-1/4" Sch40 pipe', '1-1/2" flat bar', '2" flat bar', '2-1/2" flat bar'] },
  { key: "toprail", label: "Top rail", unit: "ft", typical: "Molded cap rail",
    options: ["Molded cap rail", '1-1/2" sq tube', '1-1/2" Sch40 pipe', 'Flat bar 2 x 3/8', '1-1/4" Sch40 pipe'] },
  { key: "picket", label: "Pickets", unit: "ea", typical: '1/2" sq solid',
    options: ['1/2" sq solid', '5/8" sq solid', '3/4" sq tube', '1" sq tube', '1/2" round solid', '5/8" round solid', '3/4" round tube'] },
  { key: "bottomrail", label: "Bottom rail / shoe", unit: "ft", typical: 'Flat bar 1-1/2 x 3/8',
    options: ['1" x 1/2" channel', 'Flat bar 1-1/2 x 3/8', "Shoe rail", "None (pickets into treads)"] },
  { key: "plate", label: "Base plates", unit: "ea", typical: '4" x 4" x 1/4"',
    options: ['4" x 4" x 1/4"', '5" x 5" x 1/4"', '6" x 6" x 3/8"', 'Core-drill (no plate)'] },
  { key: "anchor", label: "Anchors", unit: "ea", typical: '1/2" wedge anchor',
    options: ['1/2" wedge anchor', '3/8" wedge anchor', '1/2" epoxy anchor', "Lag into wood", "Through-bolt"] },
];

const FINISH_ROLE: MaterialRole = {
  key: "finish", label: "Finish", unit: "job", typical: "DTM black",
  options: ["DTM black", "DTM + epoxy primer", "Galvanized", "Powder coat"],
};

// A spiral is a column, a stack of treads and a helical rail. Nothing else.
const SPIRAL_ROLES: MaterialRole[] = [
  { key: "column", label: "Center column", unit: "ea", typical: '4" Sch40 round pipe',
    options: ['4" Sch40 round pipe', '4-1/2" Sch40 round pipe', '5" Sch40 round pipe', '3-1/2" Sch40 round pipe'] },
  { key: "tread", label: "Treads", unit: "ea", typical: 'Steel plate 1/4"',
    options: ['Steel plate 1/4"', 'Steel plate 3/16"', "Bar grating", "Wood (by others)", "Composite (by others)", "Checker plate"] },
  { key: "treadsupport", label: "Tread supports", unit: "ea", typical: "Welded to column",
    options: ["Welded to column", "Collar + gusset", "Sleeve collar"] },
  { key: "helicalrail", label: "Helical handrail", unit: "ft", typical: '1-1/2" Sch40 pipe',
    options: ['1-1/2" Sch40 pipe', '1-1/4" Sch40 pipe', "Molded cap rail", 'Flat bar 2 x 3/8'] },
  ...RAIL_ROLES.filter((r) => r.key === "picket" || r.key === "plate" || r.key === "anchor"),
];

const STAIR_ROLES: MaterialRole[] = [
  { key: "stringer", label: "Stringers", unit: "ea", typical: 'C10 channel',
    options: ["C10 channel", "C8 channel", 'HSS 4 x 2 x 1/4', "Plate stringer 1/2\"", "Mono-stringer tube"] },
  { key: "tread", label: "Treads", unit: "ea", typical: "Bar grating",
    options: ["Bar grating", 'Steel plate 1/4"', "Checker plate", "Wood (by others)", "Composite (by others)", "Pan tread (concrete fill)"] },
  ...RAIL_ROLES,
];

const WELL_ROLES: MaterialRole[] = [
  { key: "wellframe", label: "Well frame", unit: "ft", typical: 'L2 x 2 x 1/4 angle',
    options: ['L2 x 2 x 1/4 angle', 'L2-1/2 x 2-1/2 x 1/4 angle', '1-1/2" sq tube', "Flat bar 2 x 3/8"] },
  { key: "grate", label: "Grate / cover", unit: "ea", typical: "Bar grating",
    options: ["Bar grating", "Steel mesh", "Acrylic panel in steel frame", "Checker plate"] },
  { key: "ladder", label: "Ladder", unit: "ea", typical: '1" round rung',
    options: ['1" round rung', '3/4" round rung', "Flat bar side rails + round rungs", "None"] },
  ...RAIL_ROLES.filter((r) => ["post", "toprail", "picket", "anchor"].includes(r.key)),
];

const GATE_ROLES: MaterialRole[] = [
  { key: "leafframe", label: "Leaf frame", unit: "ea", typical: '2" sq tube',
    options: ['2" sq tube', '1-1/2" sq tube', '2" x 1" rect tube'] },
  ...RAIL_ROLES.filter((r) => ["picket", "post", "anchor"].includes(r.key)),
  { key: "hinge", label: "Hinges", unit: "ea", typical: "Weld-on barrel hinge",
    options: ["Weld-on barrel hinge", "Bolt-on hinge", "Self-closing hinge"] },
  { key: "latch", label: "Latch / hardware", unit: "ea", typical: "Gravity latch",
    options: ["Gravity latch", "Magnetic latch", "Drop rod", "Padlock hasp", "Keyed lock"] },
];

const FENCE_ROLES: MaterialRole[] = [
  ...RAIL_ROLES.filter((r) => ["post", "picket", "toprail", "bottomrail", "anchor"].includes(r.key)),
  { key: "footing", label: "Footings", unit: "ea", typical: "Concrete set",
    options: ["Concrete set", "Core-drill + grout", "Base plate on existing"] },
];

const STRUCTURAL_ROLES: MaterialRole[] = [
  { key: "beam", label: "Beams", unit: "ea", typical: "W8 x 15",
    options: ["W8 x 15", "W10 x 22", "C8 channel", "C10 channel", 'HSS 6 x 6 x 1/4'] },
  { key: "column", label: "Columns", unit: "ea", typical: 'HSS 4 x 4 x 1/4',
    options: ['HSS 4 x 4 x 1/4', 'HSS 6 x 6 x 1/4', '4" Sch40 round pipe', "W6 x 20"] },
  { key: "plate", label: "Plates / connections", unit: "ea", typical: '1/2" plate',
    options: ['1/2" plate', '3/8" plate', '3/4" plate', "Clip angle"] },
  { key: "bolt", label: "Bolts", unit: "ea", typical: "3/4\" A325",
    options: ['3/4" A325', '5/8" A325', '1/2" A325', "Weld only"] },
];

const FIRE_ROLES: MaterialRole[] = [
  { key: "balconyframe", label: "Balcony frame", unit: "ea", typical: 'L3 x 3 x 1/4 angle',
    options: ['L3 x 3 x 1/4 angle', 'C6 channel', 'HSS 3 x 3 x 1/4'] },
  { key: "tread", label: "Treads / deck", unit: "ea", typical: "Bar grating",
    options: ["Bar grating", "Checker plate", "Flat bar deck"] },
  { key: "ladder", label: "Drop ladder", unit: "ea", typical: "Counterbalanced drop ladder",
    options: ["Counterbalanced drop ladder", "Fixed ladder", "Swing-down ladder"] },
  ...RAIL_ROLES.filter((r) => ["post", "toprail", "picket", "anchor"].includes(r.key)),
];

// Matched in order, first hit wins. Project types in the wild are free text
// ("Window Wells & Railings", "Exterior Spiral Staircase"), so this reads
// keywords rather than expecting an enum.
const KITS: { test: RegExp; roles: MaterialRole[] }[] = [
  { test: /spiral/i, roles: SPIRAL_ROLES },
  { test: /fire\s*escape/i, roles: FIRE_ROLES },
  { test: /window\s*well|egress/i, roles: WELL_ROLES },
  { test: /gate/i, roles: GATE_ROLES },
  { test: /fence/i, roles: FENCE_ROLES },
  { test: /stair|staircase|steps/i, roles: STAIR_ROLES },
  { test: /structural|beam|column|welding/i, roles: STRUCTURAL_ROLES },
  { test: /rail/i, roles: RAIL_ROLES },
];

export function materialKitFor(projectType: string | null | undefined): MaterialRole[] {
  const t = (projectType || "").trim();
  const hit = t ? KITS.find((k) => k.test.test(t)) : null;
  // Unknown or "TBD" jobs get the railing kit, which is the commonest work,
  // plus finish. Better a sensible guess than an empty box.
  return [...(hit ? hit.roles : RAIL_ROLES), FINISH_ROLE];
}

// A line the shop can order from: "6 × 1/2\" sq solid — Pickets".
export function materialLine(role: MaterialRole, option: string): string {
  return `${option} — ${role.label}`;
}
