"use client";

// The sheet's display units for everything drawn or printed from it. Drawings
// and print sections deep in the tree read dimensions through useShowMeas so a
// typed "36.125" always reads 36 1/8" (or 3' 1/8" on a feet+inches sheet).

import { createContext, useContext } from "react";
import { showMeas } from "@/lib/shop/measure-parse";
import type { Units } from "@/lib/shop/measure";

export const MeasUnits = createContext<Units>("in");

export function useShowMeas() {
  const units = useContext(MeasUnits);
  return (raw: string | undefined | null) => showMeas(raw, units);
}
