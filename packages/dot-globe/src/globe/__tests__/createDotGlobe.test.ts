import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Points } from "three";
import { createDotGlobe, type DotGlobeController } from "../createDotGlobe.js";
import type { ResolvedDotGlobeOptions } from "../dotGlobeTypes.js";

const clock = vi.hoisted(() => ({ now: 0, renderCost: 0 }));
let rendered: Points;
let canvas: TestCanvas;

vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  return {
    ...actual,
    WebGLRenderer: class {
      domElement = (canvas = new TestCanvas());
      setClearColor() {}
      setPixelRatio() {}
      setSize() {}
      dispose() {}
      render(points: Points) {
        rendered = points;
        clock.now += clock.renderCost;
      }
    },
  };
});

class TestCanvas extends EventTarget {
  style = {};
  captured = new Set<number>();
  setAttribute() {}
  remove() {}
  setPointerCapture(id: number) {
    this.captured.add(id);
  }
  hasPointerCapture(id: number) {
    return this.captured.has(id);
  }
  releasePointerCapture(id: number) {
    this.captured.delete(id);
    pointer("lostpointercapture", 0, clock.now);
  }
}

const options: ResolvedDotGlobeOptions = {
  autoRotate: true,
  backsideOpacity: 0.14,
  color: "#7382a3",
  initialRotation: { latitude: 0, longitude: 0 },
  interactive: true,
  landOpacity: 0.84,
  oceanOpacity: 0,
  pointSize: 2.4,
  quality: "low",
  rotationSpeed: 1.4,
};

let controller: DotGlobeController;
let frames: Map<number, FrameRequestCallback>;
let documentState: EventTarget & { visibilityState: string };
let intersection: IntersectionObserverCallback;
let reducedMotion: EventTarget & { matches: boolean };

function mount(overrides: Partial<ResolvedDotGlobeOptions> = {}) {
  const container = Object.assign(new EventTarget(), {
    clientWidth: 400,
    clientHeight: 400,
    append() {},
  });
  controller = createDotGlobe({
    container: container as unknown as HTMLElement,
    options: { ...options, ...overrides },
    onError: (error) => {
      throw error;
    },
  })!;
}

function frame(time: number) {
  clock.now = time;
  const callbacks = [...frames.values()];
  frames.clear();
  callbacks.forEach((callback) => callback(time));
}

function pointer(type: string, x: number, time: number) {
  const event = Object.assign(new Event(type), {
    pointerId: 1,
    isPrimary: true,
    pointerType: "mouse",
    button: 0,
    clientX: x,
    clientY: 0,
  });
  Object.defineProperty(event, "timeStamp", { value: time });
  canvas.dispatchEvent(event);
}

beforeEach(() => {
  clock.now = 0;
  clock.renderCost = 0;
  frames = new Map();
  let nextId = 0;
  documentState = Object.assign(new EventTarget(), {
    visibilityState: "visible",
  });
  reducedMotion = Object.assign(new EventTarget(), { matches: false });
  vi.spyOn(performance, "now").mockImplementation(() => clock.now);
  vi.stubGlobal("window", { devicePixelRatio: 1 });
  vi.stubGlobal("document", documentState);
  vi.stubGlobal("matchMedia", () => reducedMotion);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++nextId, callback);
    return nextId;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        intersection = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  controller?.dispose();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("globe animation clock", () => {
  it.each([30, 60, 120])(
    "rotates 14 degrees in ten seconds at %i Hz despite render cost",
    (hz) => {
      clock.renderCost = 5;
      mount();
      frame(0);
      const start = rendered.rotation.y;
      for (let i = 1; i <= hz * 10; i += 1) frame((i * 1000) / hz);
      expect(((rendered.rotation.y - start) * 180) / Math.PI).toBeCloseTo(
        14,
        6,
      );
    },
  );

  it.each(["visibility", "intersection", "rotation", "reduced-motion"])(
    "does not catch up after %s pauses",
    (reason) => {
      mount();
      frame(0);
      frame(20);
      const before = rendered.rotation.y;
      const change = (active: boolean) => {
        if (reason === "visibility") {
          documentState.visibilityState = active ? "visible" : "hidden";
          documentState.dispatchEvent(new Event("visibilitychange"));
        } else if (reason === "intersection") {
          intersection(
            [{ isIntersecting: active } as IntersectionObserverEntry],
            {} as IntersectionObserver,
          );
        } else if (reason === "rotation") {
          controller.setOptions({ ...options, autoRotate: active });
        } else {
          reducedMotion.matches = !active;
          reducedMotion.dispatchEvent(new Event("change"));
        }
      };
      change(false);
      clock.now = 5000;
      change(true);
      frame(5010);
      expect(rendered.rotation.y).toBe(before);
      frame(5030);
      expect(rendered.rotation.y).toBeGreaterThan(before);
    },
  );

  it("caps a delayed active frame at 50ms", () => {
    mount();
    frame(0);
    frame(1000);
    expect((rendered.rotation.y * 180) / Math.PI).toBeCloseTo(0.07, 8);
  });
});

describe("globe pointer state", () => {
  it("cancels a disabled drag and requires a fresh press after re-enabling", () => {
    mount({ autoRotate: false });
    pointer("pointerdown", 0, 0);
    pointer("pointermove", 30, 20);
    const before = rendered.rotation.y;
    controller.setOptions({
      ...options,
      autoRotate: false,
      interactive: false,
    });
    expect(canvas.hasPointerCapture(1)).toBe(false);
    pointer("pointermove", 230, 40);
    controller.setOptions({ ...options, autoRotate: false });
    pointer("pointermove", 231, 60);
    frame(100);
    frame(120);
    expect(rendered.rotation.y).toBe(before);
    pointer("pointerdown", 231, 140);
    pointer("pointermove", 233, 160);
    expect(rendered.rotation.y - before).toBeCloseTo(0.01, 10);
  });

  it.each([30, 60, 120])(
    "uses actual time for equal-speed %i Hz pointer events",
    (hz) => {
      mount({ autoRotate: false });
      pointer("pointerdown", 0, 0);
      for (let i = 1; i <= hz; i += 1)
        pointer("pointermove", (120 * i) / hz, (1000 * i) / hz);
      pointer("pointerup", 120, 1000);
      frame(1000);
      const released = rendered.rotation.y;
      frame(1020);
      expect(rendered.rotation.y - released).toBeCloseTo(0.012, 10);
    },
  );

  it.each([0, -10])(
    "does not create inertia from a %i ms event interval",
    (interval) => {
      mount({ autoRotate: false });
      pointer("pointerdown", 0, 20);
      pointer("pointermove", 10, 20 + interval);
      pointer("pointerup", 10, 40);
      const before = rendered.rotation.y;
      frame(50);
      frame(70);
      expect(rendered.rotation.y).toBe(before);
    },
  );
});
