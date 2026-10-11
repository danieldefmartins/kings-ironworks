import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { newMeasureData } from "@/lib/shop/measure";
import { shotList } from "@/lib/shop/measure-shots";
import ShotList from "./sections/ShotList";
import ShotCamera from "./overlays/ShotCamera";
import PhotoLogPrint from "./PhotoLogPrint";

afterEach(cleanup);

const photo = (slot: string, extra = {}) => ({ slot, path: `job/${slot}.jpg`, takenAt: "2026-10-11T12:00:00.000Z", ...extra });

it("shows progress and opens the camera on the tapped shot with the whole list", () => {
  const d = newMeasureData("opening", 0);
  d.photos.push(photo("op_straight", { lat: 42.4084, lng: -71.0537 }));
  const onShoot = vi.fn();
  const { container } = render(<ShotList lang="en" data={d} shape="opening" onShoot={onShoot} />);
  const total = shotList("opening").length;
  expect(screen.getByText(`1 of ${total} shots`)).toBeTruthy();
  expect(screen.getByText("3 required left")).toBeTruthy();
  expect(screen.getByText(/42\.40840° N, 71\.05370° W/)).toBeTruthy();
  fireEvent.click(container.querySelector('[data-shot="op_jamb_left"]')!);
  expect(onShoot).toHaveBeenCalledWith(expect.objectContaining({ slot: "op_jamb_left", filled: ["op_straight"] }));
  expect(onShoot.mock.calls[0][0].shots).toHaveLength(total);
  // the primary button goes to the next required shot
  fireEvent.click(screen.getByText(/Take next shot/));
  expect(onShoot.mock.calls[1][0].slot).toBe("op_jamb_left");
});

it("speaks Portuguese and Spanish", () => {
  const d = newMeasureData("gate", 0);
  render(<ShotList lang="pt" data={d} shape="gate" onShoot={() => undefined} />);
  expect(screen.getByText("De dentro, olhando para fora")).toBeTruthy();
  cleanup();
  render(<ShotList lang="es" data={d} shape="gate" onShoot={() => undefined} />);
  expect(screen.getByText("Desde adentro, mirando hacia afuera")).toBeTruthy();
});

it("camera shows the shot name, its ghost and hint, and walks to the next shot", () => {
  const shots = shotList("straight");
  render(
    <ShotCamera
      lang="en"
      jobId="job"
      sheetName="Front stair"
      req={{ slot: "mount_surface", label: "x", shots, filled: [] }}
      set={() => undefined}
      onClose={() => undefined}
    />
  );
  const cam = screen.getByTestId("shot-camera");
  expect(cam.textContent).toContain("Where it mounts, close up");
  expect(cam.textContent).toContain("Tape in frame");
  expect(cam.textContent).toContain("Fill the frame. Tape readable.");
  expect(cam.querySelector('[data-ghost="closeup"]')).toBeTruthy();
  // no live camera in jsdom: the shutter falls back to the OS camera
  expect(screen.getByLabelText("Open camera").querySelector('input[capture="environment"]')).toBeTruthy();
  fireEvent.click(screen.getByLabelText("Next shot"));
  // after mount_surface the next missing REQUIRED shot wraps to the top
  expect(cam.textContent).toContain("Overall from bottom");
});

it("prints a photo log with time and GPS, listing missing required shots", () => {
  const d = newMeasureData("gate", 0);
  d.photos.push(photo("gate_opening", { lat: 42.4, lng: -71.05, acc: 6 }));
  render(<PhotoLogPrint data={d} shape="gate" lang="en" />);
  const log = screen.getByTestId("photo-log-print");
  expect(log.textContent).toContain("Photo log");
  expect(log.textContent).toContain("42.40000° N, 71.05000° W ±6 m");
  expect(log.textContent).toContain("Missing");
  // recommended shots that were not taken are left off the printed log
  expect(log.textContent).not.toContain("Latch post");
});
