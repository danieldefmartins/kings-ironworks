// White-label: the printed sheet, its photo log and the customer sign-off
// screen all speak for the organization, not for KIW.
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Job } from "@/lib/shop/shared";
import { newMeasureData, type MeasureSheet } from "@/lib/shop/measure";
import type { OrgBranding } from "@/lib/shop/org-brand";
import { BrandProvider } from "@/app/shop/brand/BrandContext";
import PrintSheet from "./PrintSheet";
import CustomerSignoff from "./sections/CustomerSignoff";
import BrandingCard from "@/app/shop/admin/settings/BrandingCard";

vi.mock("qrcode", () => ({ default: { toString: () => Promise.resolve("<svg></svg>") } }));
afterEach(cleanup);
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const ACME: OrgBranding = {
  name: "ACME RAIL & STAIR",
  address: "500 Test Ave, Springfield, IL 62701",
  phone: "(555) 010-0199",
  website: "acmerail.test",
  license: "IL-HIC-778812",
  accent: "#0e7490",
  logo: PNG,
};

const job = { id: "job-1", job_number: "ACME-42", customer_name: "Test Customer", address: "1 Elm St" } as Job;
const sheet = (): MeasureSheet => ({
  id: "sheet-1", job_id: job.id, name: "Front stair", shape: "straight",
  status: "in_progress", data: newMeasureData("straight", 3), review_comment: null, submitted_by: null,
  submitted_at: null, approved_by: null, approved_at: null, current_rev: 0,
  created_by: "w1", updated_by: "w1", created_at: "2026-08-01T00:00:00.000Z", updated_at: "2026-08-01T00:00:00.000Z",
});

it("prints the organization's letterhead, licence, logo and accent — and no KIW", () => {
  const s = sheet();
  const { container } = render(
    <PrintSheet job={job} sheet={s} data={s.data} lang="en" workerName="T" posts={[]} visible branding={ACME} />
  );
  const head = screen.getByTestId("print-letterhead");
  expect(head.textContent).toContain("ACME RAIL & STAIR");
  expect(head.textContent).toContain("Lic. # IL-HIC-778812");
  expect(head.querySelector("img")!.getAttribute("src")).toBe(PNG);
  expect((container.firstChild as HTMLElement).style.getPropertyValue("--brand-accent")).toBe("#0e7490");
  expect(container.textContent).not.toMatch(/KING IRON|KIW|kingsironworks/i);
});

it("KIW keeps its own letterhead when no branding is set", () => {
  const s = sheet();
  render(<PrintSheet job={job} sheet={s} data={s.data} lang="en" workerName="T" posts={[]} visible />);
  expect(screen.getByTestId("print-letterhead").textContent).toContain("KING IRON WORKS");
});

it("the customer sign-off screen shows the organization's brand", () => {
  const s = sheet();
  render(
    <BrandProvider branding={{ ...ACME, logo: undefined }}>
      <CustomerSignoff lang="en" data={s.data} shape="straight" set={() => undefined} />
    </BrandProvider>
  );
  fireEvent.click(screen.getByRole("button", { name: /sign/i }));
  const b = screen.getByTestId("signoff-brand");
  expect(b.textContent).toContain("ACME RAIL & STAIR");
  expect(b.textContent).toContain("ARS"); // initials badge when there is no logo
});

it("branding settings edit every field and preview live", () => {
  const onChange = vi.fn();
  render(<BrandingCard lang="en" value={ACME} onChange={onChange} />);
  expect(screen.getByTestId("print-letterhead").textContent).toContain("ACME RAIL & STAIR");
  fireEvent.change(screen.getByLabelText("License #"), { target: { value: "NEW-1" } });
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ license: "NEW-1", name: "ACME RAIL & STAIR" }));
  fireEvent.click(screen.getByRole("radio", { name: "#b8860b" }));
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ accent: "#b8860b" }));
  fireEvent.click(screen.getByRole("button", { name: "Remove" }));
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ logo: "" }));
});

it("branding settings speak Portuguese", () => {
  render(<BrandingCard lang="pt" value={ACME} onChange={() => undefined} />);
  expect(screen.getByText("Cor de destaque")).toBeTruthy();
  expect(screen.getByText("Lic. # IL-HIC-778812".replace("Lic. #", "Licença nº"))).toBeTruthy();
});
