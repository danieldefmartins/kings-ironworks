"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PhoneLink } from "@/components/PhoneLink";
import { useLocalPhone } from "@/hooks/useLocalPhone";
import GHLFormPlaceholder from "@/components/GHLFormPlaceholder";
import Link from "next/link";
import {
  ArrowRight, Award, CheckCircle2, Clock, Phone, Ruler, Shield, Snowflake, Sparkles,
} from "lucide-react";

const IMG = "/images/portfolio-organized/Staircases/Exterior-Entry/king-iron-works-staircase-exterior";

// The tread is the decision the whole stair is built around, so it leads. Each
// one is a real option we fabricate the pan for — the frame is identical, the
// pan depth changes to suit what drops into it.
const TREADS = [
  {
    name: "Porcelain",
    tagline: "The one in these photos",
    body: "Large-format porcelain pavers set into a steel pan. Doesn't fade, doesn't stain, doesn't absorb water — so it can't spall when it freezes. Matches the patio you already have.",
    best: "Best for: modern builds that continue the terrace material up the steps",
  },
  {
    name: "Wood",
    tagline: "Warmth against the steel",
    body: "Ipe, mahogany, or cedar, screwed down from below so nothing shows on top. The steel does the structural work, so the wood is only a surface — it can be replaced in an afternoon, decades from now.",
    best: "Best for: shingle, cedar, and craftsman homes",
  },
  {
    name: "Concrete",
    tagline: "Quiet and monolithic",
    body: "Precast or poured-in-place concrete treads in the pan. Heavy underfoot in the way people read as solid, and it takes an integral color or a broom finish for grip.",
    best: "Best for: contemporary and industrial exteriors",
  },
  {
    name: "Bar Grating",
    tagline: "Nothing to shovel",
    body: "Snow and rain fall straight through. No standing water, no ice sheet on the tread, no sweeping. The most maintenance-free tread we build, and the one fire departments and inspectors like best.",
    best: "Best for: north-facing entries, roof decks, and anywhere ice collects",
  },
  {
    name: "Composite",
    tagline: "The deck-board match",
    body: "Trex, Azek, and the rest — the same board as your deck, carried onto the stair so the two read as one structure. No sealing, no splinters, no annual coat of anything.",
    best: "Best for: matching an existing composite deck exactly",
  },
];

// Coatings. The galvanizing copy is deliberately specific: it is the one claim
// on this page a customer might check, and the honest number is better than the
// round one anyway.
const FINISHES = [
  {
    name: "Standard Epoxy Paint",
    lead: "Our standard finish",
    body: "An industrial epoxy primer under a UV-stable topcoat, sprayed in our shop under controlled conditions. Any color. The most economical way to get a deep, even black — or anything else you want.",
    points: ["Included in the base price", "Unlimited color choice", "Touch-up is simple and DIY-able"],
  },
  {
    name: "Hot-Dip Galvanizing",
    lead: "The longest-lasting option",
    body: "The finished steel is dipped in molten zinc at about 840°F. The zinc doesn't sit on the surface like paint — it grows into the steel as a series of zinc-iron alloy layers that are metallurgically bonded to it.",
    points: ["Protects even where it gets scratched", "Decades before first maintenance", "Can be painted over for color"],
  },
  {
    name: "Powder Coating",
    lead: "The toughest color",
    body: "Dry pigment applied electrostatically and baked on. The result is thicker and far harder than wet paint, in any RAL color and in matte, satin, gloss, or textured. Galvanize first and powder coat over it for the best of both.",
    points: ["Chip and scratch resistant", "Any RAL color, any sheen", "Best paired over galvanizing"],
  },
];

const FAQS = [
  {
    q: "How long does hot-dip galvanizing actually last before it rusts?",
    a: "Longer than most people expect. The American Galvanizers Association publishes time-to-first-maintenance data — the point at which about 5% of the surface shows rust — and for a standard structural coating thickness in a suburban New England environment that figure is measured in many decades, not years. Coastal salt air and direct road-salt spray are the harshest cases and shorten it, which is why we specify galvanizing most strongly for stairs near the ocean or on a salted street. What matters more than any single number is how it fails: paint fails at the first scratch, galvanizing does not.",
  },
  {
    q: "Why doesn't a scratch in galvanizing rust?",
    a: "Because zinc is more electrochemically active than iron. When steel is exposed at a scratch or a drilled hole, the surrounding zinc corrodes first and protects the bare steel — the coating gives itself up rather than letting the steel go. That's called cathodic protection, and it's the reason galvanizing behaves so differently from paint, which simply stops covering the metal at the point it's damaged.",
  },
  {
    q: "Can I have a galvanized stair that isn't silver?",
    a: "Yes. Galvanizing weathers to a matte gray, which some clients want and others don't. A duplex system — galvanize first, then powder coat over it — gives you any color you like on top of the zinc, and the two together last longer than either one alone because the paint slows the zinc's weathering and the zinc protects the steel wherever the paint is damaged.",
  },
  {
    q: "Will it be slippery in winter?",
    a: "That depends entirely on the tread you choose, which is why we ask early. Bar grating sheds snow and ice better than anything else. Porcelain is specified with a textured, outdoor-rated surface rather than a polished indoor tile. Concrete takes a broom finish. Wood and composite fall in between. We'll tell you honestly which one suits your exposure.",
  },
  {
    q: "Do you handle permits and engineering?",
    a: "Yes. Exterior stairs are governed by rise, run, guard height, and baluster spacing, and an entry stair is one of the first things an inspector looks at. We build to the Massachusetts code as a matter of course and provide stamped drawings when the building department asks for them.",
  },
  {
    q: "How long does the whole thing take?",
    a: "Typically four to eight weeks from approved drawings to installation, depending on the finish. Galvanizing and powder coating add time because the steel travels out to the coater and back. Install itself is usually a single day.",
  },
];

export default function ExteriorStaircaseClient() {
  const phone = useLocalPhone();

  return (
    <div className="min-h-screen">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[88vh] flex items-center bg-sidebar text-sidebar-foreground overflow-hidden pt-4">
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/carousel/exterior-staircase-16x9.jpg"
            alt="Custom exterior steel staircase with porcelain treads and horizontal bar railing"
            className="w-full h-full object-cover opacity-45"
          />
        </div>
        <div className="container relative z-10">
          <div className="max-w-4xl">
            <div className="inline-block px-4 py-2 bg-accent text-accent-foreground text-sm font-display font-bold tracking-wider mb-6">
              ONE OF ONE · BUILT IN EVERETT, MA
            </div>
            <h1 className="text-display text-3xl md:text-7xl lg:text-8xl mb-4 md:mb-6 leading-tight">
              THE EXTERIOR STAIRCASE THAT MAKES THE HOUSE
            </h1>
            <p className="text-base md:text-2xl text-sidebar-foreground/90 mb-6 md:mb-8 max-w-3xl leading-relaxed">
              Sculpted steel stringers, open risers, and a tread you choose — porcelain, wood,
              concrete, grating, or composite. Fabricated one at a time for your opening, your
              rise, and your finish. Not a catalog stair cut to fit.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <PhoneLink tel={phone.tel}>
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-lg px-8 py-6 group">
                  <Phone className="mr-2 w-6 h-6 group-hover:animate-bounce" />
                  CALL NOW: {phone.display}
                </Button>
              </PhoneLink>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="border-sidebar-foreground/30 text-sidebar-foreground hover:bg-sidebar-foreground/10 text-lg px-8 py-6">
                  FREE DESIGN CONSULTATION <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2"><Shield className="w-5 h-5 text-accent" /><span>Licensed &amp; Insured</span></div>
              <div className="flex items-center gap-2"><Clock className="w-5 h-5 text-accent" /><span>25+ Years</span></div>
              <div className="flex items-center gap-2"><Award className="w-5 h-5 text-accent" /><span>Veteran Owned</span></div>
              <div className="flex items-center gap-2 px-3 py-1 bg-accent/20 border-2 border-accent"><span className="font-display font-bold">10% MILITARY DISCOUNT</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── What makes it different ──────────────────────────────────────── */}
      <section className="bg-card py-24">
        <div className="container">
          <div className="max-w-3xl mb-16">
            <div className="text-accent font-display font-bold tracking-wider mb-3">THE DESIGN</div>
            <h2 className="text-display text-4xl md:text-5xl mb-6">
              MOST EXTERIOR STAIRS ARE A WAY UP. THIS ONE IS ARCHITECTURE.
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              The difference is in three details you can see from the street — and one you can&apos;t.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center mb-20">
            <div className="h-[420px] md:h-[560px] overflow-hidden bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${IMG}-frame-open-riser-underside.jpg`}
                alt="Sculpted steel stringer flaring out at the base of the staircase"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-8">
              <div>
                <h3 className="text-heading text-2xl mb-3">The stringer flares, it doesn&apos;t just stop</h3>
                <p className="text-muted-foreground leading-relaxed">
                  A stock stair ends in a square cut on a concrete pad. Ours sweeps out and down
                  to the ground in one continuous plate, so the stair looks like it grew out of
                  the terrace instead of being set on top of it. It is the single detail people
                  notice first and can never quite name.
                </p>
              </div>
              <div>
                <h3 className="text-heading text-2xl mb-3">Open risers, so the entry stays bright</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Nothing between the treads. Light passes through to the planting below, the stair
                  reads as light rather than as a wall, and there is no closed pocket for leaves and
                  snow to pack into.
                </p>
              </div>
              <div>
                <h3 className="text-heading text-2xl mb-3">A pan built for your tread, not a bolt-on</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Every tread is a steel pan welded to the stringer at the depth of the material
                  going into it. Porcelain, stone, wood, concrete, grating, or composite — the pan
                  is cut for that material, so the finished surface sits flush and level with
                  nothing exposed at the nose.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { icon: Ruler, title: "Measured, not ordered", body: "We field-measure your opening. Every rise is equal, which is code and is also the difference between a stair that feels right and one that trips you." },
              { icon: Snowflake, title: "Built for the freeze", body: "New England takes stairs apart through water and ice. Sealed welds, drainage that works, and a coating chosen for your exposure." },
              { icon: Sparkles, title: "Finished in our shop", body: "Cut, welded, ground, and coated at our Everett facility — not assembled in your driveway from parts." },
              { icon: CheckCircle2, title: "Code and inspection", body: "Rise, run, guard height, and baluster spacing to Massachusetts code. Stamped drawings when your town wants them." },
            ].map((f) => (
              <Card key={f.title} className="p-7 border border-border hover:border-accent transition-colors">
                <div className="w-14 h-14 bg-accent/20 flex items-center justify-center mb-5"><f.icon className="w-7 h-7 text-accent" /></div>
                <h3 className="text-heading text-xl mb-3">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Treads ───────────────────────────────────────────────────────── */}
      <section className="bg-sidebar text-sidebar-foreground py-24">
        <div className="container">
          <div className="max-w-3xl mb-14">
            <div className="text-accent font-display font-bold tracking-wider mb-3">STEP FINISHES</div>
            <h2 className="text-display text-4xl md:text-5xl mb-6">FIVE TREADS. ONE FRAME.</h2>
            <p className="text-lg text-sidebar-foreground/80 leading-relaxed">
              The steel underneath is the same on every one of these. What changes is what drops
              into the pan — and that single choice sets the whole character of the entry.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TREADS.map((t) => (
              <Card key={t.name} className="p-8 bg-card border border-border hover:border-accent transition-colors flex flex-col">
                <div className="text-accent font-display font-bold text-sm tracking-wider mb-2">{t.tagline.toUpperCase()}</div>
                <h3 className="text-heading text-3xl mb-4">{t.name}</h3>
                <p className="text-muted-foreground leading-relaxed mb-5 flex-1">{t.body}</p>
                <p className="text-sm text-foreground/70 border-t border-border pt-4">{t.best}</p>
              </Card>
            ))}
            <Card className="p-8 bg-accent text-accent-foreground flex flex-col justify-center">
              <h3 className="text-heading text-2xl mb-3">Not sure which?</h3>
              <p className="mb-6 leading-relaxed">
                Tell us which way the entry faces and how much sun it gets. That answer alone
                usually narrows it to two.
              </p>
              <Link href="/contact"><Button variant="outline" className="w-full border-accent-foreground/40 hover:bg-accent-foreground/10">ASK US <ArrowRight className="ml-2 w-4 h-4" /></Button></Link>
            </Card>
          </div>
        </div>
      </section>

      {/* ── Finishes & colors ────────────────────────────────────────────── */}
      <section className="bg-card py-24">
        <div className="container">
          <div className="max-w-3xl mb-14">
            <div className="text-accent font-display font-bold tracking-wider mb-3">COLOR &amp; PROTECTION</div>
            <h2 className="text-display text-4xl md:text-5xl mb-6">ANY COLOR. THREE WAYS TO PROTECT IT.</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Black is what most people picture, and it is what you see in these photos. It is not
              the only option — the coating is a separate decision from the color, and the right
              one depends on how much weather your stair actually takes.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
            {FINISHES.map((f) => (
              <Card key={f.name} className="p-8 border border-border hover:border-accent transition-colors flex flex-col">
                <div className="text-accent font-display font-bold text-sm tracking-wider mb-2">{f.lead.toUpperCase()}</div>
                <h3 className="text-heading text-2xl mb-4">{f.name}</h3>
                <p className="text-muted-foreground leading-relaxed mb-5 flex-1">{f.body}</p>
                <ul className="space-y-2">
                  {f.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>

          {/* The galvanizing explainer — the claim customers actually test. */}
          <div className="bg-sidebar text-sidebar-foreground p-8 md:p-12">
            <div className="max-w-3xl">
              <h3 className="text-display text-2xl md:text-4xl mb-6">
                WHAT GALVANIZING ACTUALLY DOES ABOUT RUST
              </h3>
              <div className="space-y-5 text-sidebar-foreground/85 leading-relaxed">
                <p>
                  Paint is a raincoat. It covers the steel, and it works right up until something
                  cuts through it — a shovel, a dropped planter, a drilled hole. From that scratch,
                  rust creeps underneath and lifts the paint off from below.
                </p>
                <p>
                  Hot-dip galvanizing is not a coating on the steel so much as a change to it. The
                  finished stair is lowered into a kettle of molten zinc at roughly 840°F, and the
                  zinc and iron grow together into alloy layers that are bonded to the steel
                  itself — harder, in fact, than the steel underneath.
                </p>
                <p>
                  <strong className="text-sidebar-foreground">Then comes the part that matters.</strong>{" "}
                  Zinc is more electrochemically active than iron. Scratch a galvanized stair down
                  to bare metal and the surrounding zinc corrodes first, giving itself up to protect
                  the steel you exposed. The bare spot does not rust. Paint cannot do this at any
                  price, and it is the whole reason galvanizing is specified on bridges and
                  transmission towers.
                </p>
                <p>
                  <strong className="text-sidebar-foreground">So how long?</strong>{" "}
                  The American
                  Galvanizers Association tracks &ldquo;time to first maintenance&rdquo; — when
                  roughly 5% of the surface first shows rust. For a standard structural coating in
                  a suburban New England setting, that is measured in decades, comfortably beyond
                  the fifteen or twenty years most homeowners are thinking about when they ask.
                  Salt shortens it: an oceanfront stair or one on a heavily salted street works
                  harder than one behind a house in Newton. That is exactly why we ask where the
                  stair is going before we recommend a finish, and why we suggest galvanizing under
                  powder coat for the harshest exposures — the two together outlast either one alone.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Gallery ──────────────────────────────────────────────────────── */}
      <section className="bg-sidebar text-sidebar-foreground py-24">
        <div className="container">
          <div className="max-w-3xl mb-12">
            <div className="text-accent font-display font-bold tracking-wider mb-3">THIS PROJECT</div>
            <h2 className="text-display text-4xl md:text-5xl mb-6">FROM BARE STEEL TO FINISHED ENTRY</h2>
            <p className="text-lg text-sidebar-foreground/80 leading-relaxed">
              The same staircase, photographed through fabrication and after the porcelain went in.
              The frame is the product; the tread is the finish.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              ["porcelain-treads-twin-run", "Twin runs with porcelain treads and horizontal bar rail"],
              ["porcelain-sunlit-entry", "Finished entry stair with porcelain treads"],
              ["porcelain-treads-head-on", "Head-on view of porcelain treads and open risers"],
              ["porcelain-treads-entry-angle", "Angled view of the finished exterior staircase"],
              ["frame-installed-landing", "Steel frame and railing installed before treads"],
              ["frame-open-riser-underside", "Sculpted stringer flaring to the ground"],
            ].map(([slug, alt]) => (
              <div key={slug} className="overflow-hidden bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${IMG}-${slug}.jpg`} alt={alt} loading="lazy" className="w-full h-full object-cover aspect-[3/4] hover:scale-105 transition-transform duration-500" />
              </div>
            ))}
          </div>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <video
              className="w-full bg-black"
              src={`${IMG}-walkaround.mp4`}
              poster={`${IMG}-porcelain-sunlit-entry.jpg`}
              controls
              muted
              playsInline
              preload="none"
            />
            <div>
              <h3 className="text-heading text-2xl mb-4">Walk around it</h3>
              <p className="text-sidebar-foreground/80 leading-relaxed mb-6">
                Twelve seconds, no narration. Watch how the stringer carries the line of the stair
                down and out, and how much light still reaches the planting underneath.
              </p>
              <Link href="/portfolio/exterior-entry-staircases">
                <Button variant="outline" className="border-sidebar-foreground/30 text-sidebar-foreground hover:bg-sidebar-foreground/10">
                  SEE THE FULL GALLERY <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="bg-card py-24">
        <div className="container max-w-4xl">
          <h2 className="text-display text-4xl md:text-5xl mb-12">STRAIGHT ANSWERS</h2>
          <div className="space-y-8">
            {FAQS.map((f) => (
              <div key={f.q} className="border-b border-border pb-8">
                <h3 className="text-heading text-xl md:text-2xl mb-4">{f.q}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="bg-sidebar text-sidebar-foreground py-24">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-display text-4xl md:text-5xl mb-6">START WITH A DRAWING, NOT A GUESS</h2>
            <p className="text-xl text-sidebar-foreground/80 mb-8">
              We come out, measure the opening, and show you the stair in your own doorway before
              anything is cut. On-site measurement, design consultation, and a detailed quote — no cost.
            </p>
            <div className="max-w-2xl mx-auto mt-8"><GHLFormPlaceholder service="Exterior Staircase" /></div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Link href="/contact"><Button size="lg" className="bg-accent hover:bg-accent/90 text-lg px-8 py-6">REQUEST FREE CONSULTATION<ArrowRight className="ml-2 w-5 h-5" /></Button></Link>
              <PhoneLink tel={phone.tel}><Button size="lg" variant="outline" className="border-sidebar-foreground/30 text-sidebar-foreground hover:bg-sidebar-foreground/10 text-lg px-8 py-6"><Phone className="mr-2 w-5 h-5" />{phone.display}</Button></PhoneLink>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
