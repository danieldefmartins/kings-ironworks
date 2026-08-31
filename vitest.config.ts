import { defineConfig } from "vitest/config";
import path from "node:path";

// The shop tool's lifecycle tests. Deliberately narrow: they cover the save
// path (useSheetSync) and the durable queue behind it, and nothing else.
//
// Two files, split by what each needs to control:
//   useSheetSync.debounce.test.tsx  fake timers, and only setTimeout/setInterval
//   useSheetSync.test.tsx           real clock, controlled promises, real events
//
// The pointer and camera workflows are not faked here at all — see
// docs/shop-tablet-smoke.md for the checks that need a real tablet.
export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
    restoreMocks: true,
    testTimeout: 10000,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
