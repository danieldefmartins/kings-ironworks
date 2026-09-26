import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TagControls, { type TagTx } from "./TagControls";
vi.stubGlobal("React", React);
afterEach(cleanup);

const base: TagTx = { id: "11111111-1111-4111-8111-111111111111", description: "TST* VILLAGE BAR & GRIL EVERETT MA", amount: -84.5, category: "Meals", vendor: "village", grp: "review", owner: null, posted_on: "2026-08-12" };

function mockFetch() {
  const f = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
  vi.stubGlobal("fetch", f);
  return f;
}

describe("TagControls", () => {
  it("one tap on Reginaldo files a restaurant as his personal spending", async () => {
    const f = mockFetch();
    const onSaved = vi.fn();
    render(<TagControls tx={base} lang="en" onSaved={onSaved} />);
    fireEvent.click(screen.getByRole("button", { name: "Kayky" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const body = JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.tag).toEqual({ grp: "owner", owner: "reginaldo", category: "Restaurants" });
    expect(body.applyToVendor).toBe(false);
  });

  it("restaurants start with 'same for all' unticked", () => {
    render(<TagControls tx={base} lang="en" sameVendorCount={3} onSaved={() => {}} />);
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
  });

  it("hides Daniel for transactions before he joined in March 2026", () => {
    render(<TagControls tx={{ ...base, posted_on: "2026-02-14" }} lang="en" onSaved={() => {}} />);
    expect(screen.queryByRole("button", { name: "Daniel" })).toBeNull();
    expect(screen.getByRole("button", { name: "Kayky" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "KIW" })).toBeTruthy();
  });

  it("KIW with an unknown kind of expense goes to Uncategorized, and can apply to the whole merchant", async () => {
    const f = mockFetch();
    const onSaved = vi.fn();
    render(<TagControls tx={{ ...base, description: "US CABINET DEPOT 470-7958808 GA", category: "Uncategorized", vendor: "us cabinet" }} lang="en" sameVendorCount={1} onSaved={onSaved} />);
    // "Same for all from this merchant" starts ticked for non-restaurant merchants.
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "KIW" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ vendor: "us cabinet", out: true, wholeVendor: true }));
    const body = JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.tag).toEqual({ grp: "expense", owner: "kiw", category: "Uncategorized" });
    expect(body.applyToVendor).toBe(true);
  });
});
