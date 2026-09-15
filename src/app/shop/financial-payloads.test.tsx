import React from "react";
import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ worker: vi.fn(), prices: vi.fn() }));
vi.stubGlobal("React", React);
vi.mock("@/lib/shop/session", () => ({ getSessionWorker: m.worker }));
vi.mock("next/navigation", () => ({ redirect: () => {throw new Error("redirect");}, notFound: () => {throw new Error("not found");} }));
vi.mock("@/lib/shop/db", () => ({
  getJob: async () => ({id:"job",customer_name:"Customer",contract_amount:98765,deposit_amount:12345,deposit_note:"private",subcontractor_amount_paid:555,subcontractor_split_pct:50,subcontractor_paid_on:"2026-09-01",subcontractor_notes:"confidential payment terms"}),
  getMeasureSheets: async () => [], getMeasureSheet: async () => ({job_id:"job",data:{}}), getMeasureRevision: async () => ({id:"rev",data:{}}),
  listWorkers: async () => [], getOrgSettings: async () => ({tolerances:{}}), getSheetHistory: async () => [], getCarryover: async () => null, audit: async () => {},
  listCatalog: async () => [{id:"steel",display:"Steel",unit_cost:98765}], listInventory: async () => [], listSupplierPrices: m.prices, signPhotoUrls: async () => new Map(),
}));
vi.mock("./ShopTopBar", () => ({default: () => null}));
vi.mock("./inventory/InventoryClient", () => ({default: () => null}));
vi.mock("./job/[id]/measure/MeasureListClient", () => ({default: () => null}));
vi.mock("./job/[id]/measure/[sheetId]/MeasureEditor", () => ({default: () => null}));
vi.mock("./job/[id]/measure/[sheetId]/rev/[revNo]/RevisionClient", () => ({default: () => null, RevisionSheet: () => null}));
import Inventory from "./inventory/page";
import Measures from "./job/[id]/measure/page";
import Editor from "./job/[id]/measure/[sheetId]/page";
import Revision from "./job/[id]/measure/[sheetId]/rev/[revNo]/page";
beforeEach(() => {vi.clearAllMocks();m.worker.mockResolvedValue({id:"crew",name:"Crew",is_admin:false,can_see_prices:false});m.prices.mockResolvedValue([{catalog_id:"steel",unit_price:4567}]);});
it.each([Measures, Editor, Revision])("redacts pricing in measurement client props", async Page => {
  const result = await Page({params:Promise.resolve({id:"job",sheetId:"sheet",revNo:"1"})});
  const payload = JSON.stringify(result, (_key, value) => React.isValidElement(value) ? value.props : value);
  for (const secret of ["98765", "12345", "private", "555", "2026-09-01", "confidential payment terms"]) expect(payload).not.toContain(secret);
  expect(payload).toContain("Customer");
});
it("does not fetch supplier pricing or send catalog costs to crew", async () => {
  const payload=JSON.stringify(await Inventory());
  expect(m.prices).not.toHaveBeenCalled(); expect(payload).not.toContain("98765"); expect(payload).toContain("Steel");
});
it("retains supplier and catalog costs for owners", async () => {
  m.worker.mockResolvedValue({id:"owner",name:"Daniel",is_admin:true,can_see_prices:true});
  const payload=JSON.stringify(await Inventory());
  expect(m.prices).toHaveBeenCalledOnce(); expect(payload).toContain("98765"); expect(payload).toContain("4567");
});
