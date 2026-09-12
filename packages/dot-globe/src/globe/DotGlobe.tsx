import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { createDotGlobe, type DotGlobeController } from "./createDotGlobe.js";
import { resolvePointColor } from "./dotGlobeTheme.js";
import type {
  DotGlobeProps,
  ResolvedDotGlobeOptions,
} from "./dotGlobeTypes.js";

const defaultStyle = {
  aspectRatio: "1",
  display: "block",
  position: "relative",
  width: "100%",
} as const;

/**
 * Renders an interactive, texture-free Earth whose physical land is drawn with staggered latitude-row
 * points.
 */
export const DotGlobe = forwardRef<HTMLDivElement, DotGlobeProps>(
  function DotGlobe(
    {
      "aria-label": ariaLabel = "3D Earth",
      autoRotate = true,
      backsideOpacity = 0.14,
      className,
      color,
      decorative = false,
      initialRotation,
      interactive = true,
      landOpacity = 0.84,
      oceanOpacity = 0,
      pointSize = 2.4,
      quality = "high",
      rotationSpeed = 1.4,
      style,
      tabIndex,
      theme = "light",
      ...containerProps
    },
    forwardedRef,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const controllerRef = useRef<DotGlobeController | undefined>(undefined);
    const [unsupported, setUnsupported] = useState(false);
    useImperativeHandle(
      forwardedRef,
      () => containerRef.current as HTMLDivElement,
      [],
    );

    const options = useMemo<ResolvedDotGlobeOptions>(
      () => ({
        autoRotate,
        backsideOpacity: Math.min(1, Math.max(0, backsideOpacity)),
        color: resolvePointColor(theme, color),
        initialRotation: {
          latitude: initialRotation?.latitude ?? 12,
          longitude: initialRotation?.longitude ?? -18,
        },
        interactive,
        landOpacity: Math.min(1, Math.max(0, landOpacity)),
        oceanOpacity: Math.min(1, Math.max(0, oceanOpacity)),
        pointSize: Math.min(8, Math.max(0.5, pointSize)),
        quality,
        rotationSpeed,
      }),
      [
        autoRotate,
        backsideOpacity,
        color,
        initialRotation?.latitude,
        initialRotation?.longitude,
        interactive,
        landOpacity,
        oceanOpacity,
        pointSize,
        quality,
        rotationSpeed,
        theme,
      ],
    );
    const initialOptionsRef = useRef(options);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;
      setUnsupported(false);
      controllerRef.current = createDotGlobe({
        container,
        onError: () => setUnsupported(true),
        options: initialOptionsRef.current,
      });

      return () => {
        controllerRef.current?.dispose();
        controllerRef.current = undefined;
      };
    }, []);

    useEffect(() => {
      controllerRef.current?.setOptions(options);
    }, [options]);

    return (
      <div
        {...containerProps}
        ref={containerRef}
        aria-hidden={decorative || undefined}
        aria-label={decorative || unsupported ? undefined : ariaLabel}
        className={className}
        data-dot-globe=""
        data-webgl-unsupported={unsupported || undefined}
        role={decorative ? undefined : unsupported ? "status" : "img"}
        style={{ ...defaultStyle, ...style }}
        tabIndex={
          tabIndex ??
          (interactive && !decorative && !unsupported ? 0 : undefined)
        }
      >
        {unsupported ? (
          <span style={{ color: "inherit", font: "inherit" }}>
            WebGL is not available in this browser.
          </span>
        ) : null}
      </div>
    );
  },
);
