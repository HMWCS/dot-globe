import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Matrix4,
  OrthographicCamera,
  Points,
  ShaderMaterial,
  SRGBColorSpace,
  WebGLRenderer,
} from "three";
import { fragmentShader, vertexShader } from "./dotGlobeShader.js";
import type { ResolvedDotGlobeOptions } from "./dotGlobeTypes.js";
import { createPointGrid, type PointGrid } from "./pointGrid.js";
import { createIslandVisibility } from "./islandVisibility.js";

export interface DotGlobeController {
  dispose(): void;
  setOptions(options: ResolvedDotGlobeOptions): void;
}

interface CreateDotGlobeOptions {
  container: HTMLElement;
  onError(error: unknown): void;
  options: ResolvedDotGlobeOptions;
}

const degreesToRadians = Math.PI / 180;
const motionEpsilon = 0.0001;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function createGeometry(grid: PointGrid, visibility: Float32Array) {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(grid.positions, 3));
  geometry.setAttribute("aLand", new BufferAttribute(grid.land, 1));
  geometry.setAttribute(
    "aVisible",
    new BufferAttribute(visibility, 1).setUsage(DynamicDrawUsage),
  );
  return geometry;
}

/** Creates the framework-neutral WebGL renderer used by the React wrapper. */
export function createDotGlobe({
  container,
  onError,
  options: initialOptions,
}: CreateDotGlobeOptions): DotGlobeController | undefined {
  let renderer: WebGLRenderer;

  try {
    renderer = new WebGLRenderer({ alpha: true, antialias: true });
  } catch (error) {
    onError(error);
    return undefined;
  }

  let options = initialOptions;
  let disposed = false;
  let frameId: number | undefined;
  let previousTime: number | undefined;
  let visible = document.visibilityState !== "hidden";
  let intersecting = true;
  let dragging = false;
  let previousPointerX = 0;
  let previousPointerY = 0;
  let previousPointerTime = 0;
  let activePointerId: number | undefined;
  let longitudeVelocity = 0;
  let latitudeVelocity = 0;
  let width = 1;
  let height = 1;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.cursor = options.interactive ? "grab" : "default";
  canvas.style.height = "100%";
  canvas.style.touchAction = options.interactive ? "none" : "auto";
  canvas.style.width = "100%";
  canvas.setAttribute("aria-hidden", "true");
  container.append(canvas);

  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 3;

  const uniforms = {
    uBacksideOpacity: { value: options.backsideOpacity },
    uColor: { value: new Color(options.color) },
    uLandOpacity: { value: options.landOpacity },
    uOceanOpacity: { value: options.oceanOpacity },
    uPixelRatio: { value: 1 },
    uPointSize: { value: options.pointSize },
  };
  const material = new ShaderMaterial({
    depthTest: true,
    depthWrite: false,
    fragmentShader,
    transparent: true,
    uniforms,
    vertexShader,
  });
  let grid = createPointGrid(options.quality);
  let islandVisibility = createIslandVisibility(grid);
  const points = new Points(
    createGeometry(grid, islandVisibility.values),
    material,
  );
  const viewMatrix = new Matrix4();
  const projectionMatrix = new Matrix4();
  points.rotation.order = "XYZ";
  points.rotation.x = options.initialRotation.latitude * degreesToRadians;
  points.rotation.y = -options.initialRotation.longitude * degreesToRadians;

  function render() {
    points.updateMatrixWorld();
    camera.updateMatrixWorld();
    viewMatrix.multiplyMatrices(camera.matrixWorldInverse, points.matrixWorld);
    projectionMatrix.multiplyMatrices(camera.projectionMatrix, viewMatrix);
    if (
      islandVisibility.update(
        projectionMatrix.elements,
        viewMatrix.elements,
        width,
        height,
        options.pointSize,
      )
    ) {
      const attribute = points.geometry.getAttribute(
        "aVisible",
      ) as BufferAttribute;
      attribute.addUpdateRange(
        grid.basePointCount,
        grid.pointCount - grid.basePointCount,
      );
      attribute.needsUpdate = true;
    }
    renderer.render(points, camera);
  }

  function resize() {
    width = Math.max(1, container.clientWidth);
    height = Math.max(1, container.clientHeight);
    const aspect = width / height;
    const halfHeight = aspect >= 1 ? 1.065 : 1.065 / aspect;
    const halfWidth = halfHeight * aspect;

    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();

    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    uniforms.uPixelRatio.value = pixelRatio;
    render();
  }

  function stopAnimation() {
    if (frameId !== undefined) cancelAnimationFrame(frameId);
    frameId = undefined;
    previousTime = undefined;
  }

  function scheduleFrame() {
    const hasAutomaticMotion =
      !dragging &&
      options.autoRotate &&
      options.rotationSpeed !== 0 &&
      !reducedMotion.matches;
    const hasInertia =
      !dragging &&
      (Math.abs(longitudeVelocity) > motionEpsilon ||
        Math.abs(latitudeVelocity) > motionEpsilon);
    if (
      disposed ||
      !visible ||
      !intersecting ||
      (!hasAutomaticMotion && !hasInertia)
    ) {
      stopAnimation();
      return;
    }
    if (frameId === undefined) frameId = requestAnimationFrame(animate);
  }

  function animate(time: number) {
    frameId = undefined;
    if (disposed || !visible || !intersecting) {
      stopAnimation();
      return;
    }

    // Only consecutive active RAF timestamps include elapsed animation time.
    const deltaSeconds =
      previousTime === undefined
        ? 0
        : Math.min(0.05, Math.max(0, (time - previousTime) / 1000));
    previousTime = time;

    if (!dragging) {
      if (options.autoRotate && !reducedMotion.matches) {
        points.rotation.y +=
          options.rotationSpeed * degreesToRadians * deltaSeconds;
      }
      points.rotation.y += longitudeVelocity * deltaSeconds;
      points.rotation.x = clamp(
        points.rotation.x + latitudeVelocity * deltaSeconds,
        -Math.PI / 2,
        Math.PI / 2,
      );
      const damping = Math.exp(-8 * deltaSeconds);
      longitudeVelocity *= damping;
      latitudeVelocity *= damping;
      if (Math.abs(longitudeVelocity) <= motionEpsilon) longitudeVelocity = 0;
      if (Math.abs(latitudeVelocity) <= motionEpsilon) latitudeVelocity = 0;
    }

    render();
    scheduleFrame();
  }

  function pointerDown(event: PointerEvent) {
    if (
      !options.interactive ||
      activePointerId !== undefined ||
      !event.isPrimary ||
      (event.pointerType === "mouse" && event.button !== 0)
    )
      return;
    activePointerId = event.pointerId;
    dragging = true;
    longitudeVelocity = 0;
    latitudeVelocity = 0;
    previousPointerX = event.clientX;
    previousPointerY = event.clientY;
    previousPointerTime = event.timeStamp;
    canvas.setPointerCapture(event.pointerId);
    scheduleFrame();
  }

  function pointerMove(event: PointerEvent) {
    if (
      !dragging ||
      event.pointerId !== activePointerId ||
      !options.interactive
    )
      return;
    const deltaX = event.clientX - previousPointerX;
    const deltaY = event.clientY - previousPointerY;
    const eventSeconds = (event.timeStamp - previousPointerTime) / 1000;
    previousPointerX = event.clientX;
    previousPointerY = event.clientY;
    previousPointerTime = event.timeStamp;
    const scale = 0.005;

    points.rotation.y += deltaX * scale;
    points.rotation.x = clamp(
      points.rotation.x + deltaY * scale,
      -Math.PI / 2,
      Math.PI / 2,
    );
    longitudeVelocity = eventSeconds > 0 ? (deltaX * scale) / eventSeconds : 0;
    latitudeVelocity = eventSeconds > 0 ? (deltaY * scale) / eventSeconds : 0;
    render();
  }

  function pointerUp(event: PointerEvent) {
    if (!dragging || event.pointerId !== activePointerId) return;
    dragging = false;
    activePointerId = undefined;
    if (canvas.hasPointerCapture(event.pointerId))
      canvas.releasePointerCapture(event.pointerId);
    scheduleFrame();
  }

  function cancelDrag() {
    const pointerId = activePointerId;
    dragging = false;
    activePointerId = undefined;
    longitudeVelocity = 0;
    latitudeVelocity = 0;
    // Clear state before release, which can dispatch lostpointercapture.
    if (pointerId !== undefined && canvas.hasPointerCapture(pointerId))
      canvas.releasePointerCapture(pointerId);
  }

  function keyDown(event: KeyboardEvent) {
    if (!options.interactive) return;
    const step = (event.shiftKey ? 10 : 4) * degreesToRadians;

    switch (event.key) {
      case "ArrowLeft":
        points.rotation.y -= step;
        break;
      case "ArrowRight":
        points.rotation.y += step;
        break;
      case "ArrowUp":
        points.rotation.x = clamp(
          points.rotation.x - step,
          -Math.PI / 2,
          Math.PI / 2,
        );
        break;
      case "ArrowDown":
        points.rotation.x = clamp(
          points.rotation.x + step,
          -Math.PI / 2,
          Math.PI / 2,
        );
        break;
      default:
        return;
    }

    event.preventDefault();
    longitudeVelocity = 0;
    latitudeVelocity = 0;
    render();
    scheduleFrame();
  }

  function visibilityChange() {
    visible = document.visibilityState !== "hidden";
    scheduleFrame();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const intersectionObserver = new IntersectionObserver((entries) => {
    intersecting = entries[0]?.isIntersecting ?? true;
    scheduleFrame();
  });
  intersectionObserver.observe(container);
  document.addEventListener("visibilitychange", visibilityChange);
  container.addEventListener("keydown", keyDown);
  canvas.addEventListener("pointerdown", pointerDown);
  canvas.addEventListener("pointermove", pointerMove);
  canvas.addEventListener("pointerup", pointerUp);
  canvas.addEventListener("pointercancel", pointerUp);
  canvas.addEventListener("lostpointercapture", pointerUp);
  reducedMotion.addEventListener("change", scheduleFrame);
  resize();
  scheduleFrame();

  return {
    dispose() {
      disposed = true;
      stopAnimation();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", visibilityChange);
      container.removeEventListener("keydown", keyDown);
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointercancel", pointerUp);
      canvas.removeEventListener("lostpointercapture", pointerUp);
      reducedMotion.removeEventListener("change", scheduleFrame);
      points.geometry.dispose();
      material.dispose();
      renderer.dispose();
      canvas.remove();
    },
    setOptions(nextOptions) {
      if (options.interactive && !nextOptions.interactive) cancelDrag();
      if (nextOptions.quality !== options.quality) {
        const previousGeometry = points.geometry;
        grid = createPointGrid(nextOptions.quality);
        islandVisibility = createIslandVisibility(grid);
        points.geometry = createGeometry(grid, islandVisibility.values);
        previousGeometry.dispose();
      }
      if (
        nextOptions.initialRotation.longitude !==
          options.initialRotation.longitude ||
        nextOptions.initialRotation.latitude !==
          options.initialRotation.latitude
      ) {
        points.rotation.x =
          nextOptions.initialRotation.latitude * degreesToRadians;
        points.rotation.y =
          -nextOptions.initialRotation.longitude * degreesToRadians;
      }

      options = nextOptions;
      uniforms.uBacksideOpacity.value = options.backsideOpacity;
      uniforms.uColor.value.set(options.color);
      uniforms.uLandOpacity.value = options.landOpacity;
      uniforms.uOceanOpacity.value = options.oceanOpacity;
      uniforms.uPointSize.value = options.pointSize;
      canvas.style.cursor = options.interactive ? "grab" : "default";
      canvas.style.touchAction = options.interactive ? "none" : "auto";
      render();
      scheduleFrame();
    },
  };
}
