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
    // Declares the argument the real constructor takes, so callers are not
    // passing something into a signature that says it accepts nothing. It is
    // never invoked: jsdom lays nothing out, so there is no resize to report.
    constructor(_callback: ResizeObserverCallback) {}
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver ??= ResizeObserverStub;

  /**
   * `matchMedia` — same argument, one rung up.
   *
   * jsdom ships no media-query engine, and a component is entitled to ask
   * `prefers-reduced-motion` or `prefers-color-scheme` unconditionally: the
   * question is how the product behaves, not whether the test environment
   * implements CSSOM View. Two test files had already hand-rolled this stub with
   * the same comment; the third one to need it is the sign it belongs here.
   *
   * **Everything reports false**, which is the honest default: no reduced-motion
   * preference, not mobile, light. A spec that cares about the other answer
   * overrides this for its own case rather than reading a global.
   */
  globalThis.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}
