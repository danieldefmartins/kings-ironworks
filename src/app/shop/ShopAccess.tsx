"use client";
import { createContext, useContext } from "react";
export const ShopAccess = createContext(false);
export const useShopOwner = () => useContext(ShopAccess);
// Preserve the measuring workspace and its existing navigation for its own pass.
export function isMeasuringPath(path: string) {
  return /^\/shop\/(leads|new-measure)(\/|$)/.test(path) || /^\/shop\/job\/[^/]+\/measure(\/|$)/.test(path);
}
