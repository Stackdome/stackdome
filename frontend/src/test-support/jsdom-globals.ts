/**
 * Browser APIs jsdom does not implement, stubbed for the unit project.
 *
 * These are not wiring seams — nothing in the product is optional here. jsdom
 * simply has no layout engine, so an API that reports geometry has nothing to
 * report. A component is entitled to call `new ResizeObserver(...)`
 * unconditionally, and a test environment that throws on it is testing jsdom's
 * feature list rather than the product.
 *
 * Anything that measures is exercised for real in the **story** project, which
 * runs in headless Chromium where these are native.
 *
 * The unit project runs some specs in the node environment (pure logic, no
 * `@vitest-environment jsdom` pragma), so every stub is gated on there being a
 * window at all.
 */
if (typeof window !== "undefined") {
  class ResizeObserverStub implements ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver ??= ResizeObserverStub;
}
