import {
  Archive,
  Banknote,
  Boxes,
  Clock3,
  DollarSign,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

// One list, two surfaces. The top-bar dropdown gets you there from any screen;
// the hub at /shop/admin lays the same things out as tiles so you can see what
// exists without opening a menu to find out. They read from here so a feature
// added to one can never quietly go missing from the other.
export interface AdminDest {
  href: string;
  /** i18n key for the label. */
  key: string;
  /** i18n key for the one-line description under it. */
  hintKey: string;
  icon: LucideIcon;
  /** Tailwind text colour for the icon, so the tiles are scannable by colour. */
  tone: string;
}

export const ADMIN_DESTS: AdminDest[] = [
  {
    href: "/shop/admin/time",
    key: "admNavPayroll",
    hintKey: "admNavPayrollHint",
    icon: Clock3,
    tone: "text-emerald-400",
  },
  {
    href: "/shop/admin/labor#jobcosts",
    key: "admNavJobCosts",
    hintKey: "admNavJobCostsHint",
    icon: DollarSign,
    tone: "text-amber-400",
  },
  {
    href: "/shop/admin/labor#deposits",
    key: "admNavDeposits",
    hintKey: "admNavDepositsHint",
    icon: Banknote,
    tone: "text-emerald-300",
  },
  {
    href: "/shop/admin/labor#sessions",
    key: "admNavHistory",
    hintKey: "admNavHistoryHint",
    icon: Archive,
    tone: "text-sky-400",
  },
  {
    href: "/shop/admin/labor#rates",
    key: "admNavRates",
    hintKey: "admNavRatesHint",
    icon: Users,
    tone: "text-violet-400",
  },
  {
    href: "/shop/inventory",
    key: "tileInventory",
    hintKey: "admNavInventoryHint",
    icon: Boxes,
    tone: "text-orange-400",
  },
  {
    href: "/shop/admin/settings",
    key: "admNavSettings",
    hintKey: "admNavSettingsHint",
    icon: Settings,
    tone: "text-neutral-300",
  },
];
