// Post suggestion — deck perimeter.
//
// One run per railed side, corner to corner. Fixed posts: each end of the side
// (a corner shared with the next railed side, or the end where the rail dies
// into the house), and both sides of a stair / gate opening — nothing goes in
// the opening itself. The house side carries no rail and no posts. The rest are
// spread evenly within the deck's post spacing. The 3D draws the posts from
// this layout, so counts are all that is stored (rail.runPlan).
import type { MeasureData } from "./measure";
import { deckPlan, type DeckPlan } from "./measure-deck-plan";
import { layoutRuns, type PostRun } from "./measure-post-suggest";
import { distinctPosts, num, planCounts, runMaxSpacing, storeCounts, upHint, type RunAdapter, type RunSuggestion } from "./measure-post-suggest-runs";

export const deckRunId = (sideId: string) => `deck:${sideId}`;

/** The deck's own spacing: the intended spacing, held to the maximum when both are given. */
export function deckSpacing(data: MeasureData, orgDefault?: string | null): number {
  const d = data.deck;
  const own = [num(d?.postSpacing), num(d?.maxPostSpacing)].filter((n): n is number => n !== null);
  return runMaxSpacing(data, orgDefault, own.length ? Math.min(...own) : null);
}

/** The opening on a side, centred (its position along the side is not measured). */
export function deckOpening(L: number, side: { opening: string; openingWidth: string }): [number, number] | null {
  if (!side.opening || side.opening === "none") return null;
  const w = num(side.openingWidth);
  return w !== null && w < L ? [(L - w) / 2, (L + w) / 2] : null;
}

export function deckRuns(plan: DeckPlan): PostRun[] {
  const runs: PostRun[] = [];
  const railedAt = (i: number) => {
    const e = plan.edges[(i + plan.edges.length) % plan.edges.length];
    return !!e?.side?.railed;
  };
  plan.edges.forEach((e, i) => {
    const sd = e.side;
    if (!sd || !sd.railed) return;
    const L = Math.hypot(e.b.x - e.a.x, e.b.y - e.a.y);
    if (!(L > 0)) return;
    const prevRailed = (plan.closed || i > 0) && railedAt(i - 1);
    const nextRailed = (plan.closed || i < plan.edges.length - 1) && railedAt(i + 1);
    const anchors = [{ at: 0, role: prevRailed ? "corner" : "end" }];
    const blocked: number[] = [];
    const op = deckOpening(L, sd);
    if (op) {
      anchors.push({ at: op[0], role: "opening" }, { at: op[1], role: "opening" });
      blocked.push(1);
    }
    anchors.push({ at: L, role: nextRailed ? "corner" : "end" });
    runs.push({ id: deckRunId(sd.id), path: [{ ...e.a, z: plan.top }, { ...e.b, z: plan.top }], anchors, blocked, gaps: blocked });
  });
  return runs;
}

export function deckSuggestion(data: MeasureData, orgDefault?: string | null): RunSuggestion | null {
  const plan = deckPlan(data);
  if (!plan || !plan.complete) return null;
  const runs = deckRuns(plan);
  const maxSpacing = deckSpacing(data, orgDefault);
  const layouts = layoutRuns(runs, { maxSpacing }, planCounts(data));
  const labels: RunSuggestion["labels"] = {};
  for (const e of plan.edges) if (e.side?.railed) labels[deckRunId(e.side.id)] = { key: "side", n: e.side.label || e.index + 1 };
  const walls: RunSuggestion["walls"] = plan.edges.filter((e) => !e.side || !e.side.railed).map((e) => [{ ...e.a, z: 0 }, { ...e.b, z: 0 }]);
  const outline = plan.plan.map((p) => ({ ...p, z: 0 }));
  return {
    layouts, labels, maxSpacing, walls, linked: false,
    // House at the top of the preview, as in the 3D.
    outlines: [upHint(outline[0], { x: 0, y: 1 }), outline],
    approved: !!data.rail.runPlan?.approved,
    total: distinctPosts(layouts).length,
  };
}

export const deckAdapter: RunAdapter = {
  suggest: deckSuggestion,
  setCounts: (d, counts) => storeCounts(d, counts),
  approve: (d, org) => {
    const s = deckSuggestion(d, org);
    if (!s) return;
    storeCounts(d, Object.fromEntries(s.layouts.map((l) => [l.run.id, l.count])));
    d.rail.runPlan = { ...(d.rail.runPlan || {}), approved: true };
  },
};

/** Post positions along each railed side for the 3D: distance from the side's start, and which interval is open. */
export function deckPostStations(data: MeasureData, orgDefault?: string | null): Map<string, { at: number[]; blocked: number[] }> {
  const out = new Map<string, { at: number[]; blocked: number[] }>();
  const plan = deckPlan(data);
  if (!plan) return out;
  // Laid out for whatever is drawn so far, so the 3D has posts while the walk goes on.
  for (const l of layoutRuns(deckRuns(plan), { maxSpacing: deckSpacing(data, orgDefault) }, planCounts(data))) {
    const sideId = l.run.id.slice("deck:".length);
    // Gaps between consecutive posts that fall inside a blocked anchor interval stay open.
    const blocked: number[] = [];
    l.posts.forEach((p, i) => { if (i > 0 && l.run.blocked?.includes(l.posts[i - 1].interval) && p.anchor && p.interval === l.posts[i - 1].interval + 1) blocked.push(i - 1); });
    out.set(sideId, { at: l.posts.map((p) => p.at), blocked });
  }
  return out;
}
