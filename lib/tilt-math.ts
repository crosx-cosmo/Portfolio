export interface RectBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface TiltSpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
  restDelta: number;
  restSpeed: number;
}

/**
 * Specifically tuned Framer Motion spring configuration for weightless, fluid
 * 3D card tilt. Near-critically damped (zeta ~= 1.02) so motion glides
 * effortlessly without oscillation bounce and settles cleanly to free CPU/GPU.
 */
export const WEIGHTLESS_TILT_SPRING: TiltSpringConfig = {
  stiffness: 150,
  damping: 20,
  mass: 0.4,
  restDelta: 0.001,
  restSpeed: 0.001,
};

export interface SectionParallaxKeyframes {
  inputRange: [number, number, number, number];
  yRange: [number, number, number, number];
  scaleRange: [number, number, number, number];
  opacityRange: [number, number, number, number];
}

/**
 * Returns Framer Motion `useTransform` keyframe stops for subtle, high-performance
 * section parallax entry/exit, or identity stops when `prefers-reduced-motion` is active.
 */
export function getSectionParallaxKeyframes(
  reducedMotion = false,
  offsetPx = 28
): SectionParallaxKeyframes {
  const inputRange: [number, number, number, number] = [0, 0.22, 0.82, 1];
  if (reducedMotion) {
    return {
      inputRange,
      yRange: [0, 0, 0, 0],
      scaleRange: [1, 1, 1, 1],
      opacityRange: [1, 1, 1, 1],
    };
  }

  return {
    inputRange,
    yRange: [offsetPx, 0, 0, -Math.round(offsetPx * 0.45)],
    scaleRange: [0.988, 1, 1, 0.995],
    opacityRange: [0.86, 1, 1, 0.94],
  };
}

export interface TiltResult {
  normX: number; // -0.5 to 0.5
  normY: number; // -0.5 to 0.5
  rotateX: number; // degrees
  rotateY: number; // degrees
  parallaxX: number; // px
  parallaxY: number; // px
  glareX: number; // 0 to 100 (%)
  glareY: number; // 0 to 100 (%)
}

/**
 * Computes subtle, clamped 3D perspective tilt angles, depth parallax offsets,
 * and glare coordinates from pointer coordinates relative to a card bounding box.
 */
export function computeCardTilt(
  clientX: number,
  clientY: number,
  rect: RectBounds,
  maxTiltDeg = 3.6,
  maxParallaxPx = 4
): TiltResult {
  if (rect.width <= 0 || rect.height <= 0) {
    return {
      normX: 0,
      normY: 0,
      rotateX: 0,
      rotateY: 0,
      parallaxX: 0,
      parallaxY: 0,
      glareX: 50,
      glareY: 50,
    };
  }

  const rawX = (clientX - rect.left) / rect.width - 0.5;
  const rawY = (clientY - rect.top) / rect.height - 0.5;

  const normX = Math.max(-0.5, Math.min(0.5, rawX));
  const normY = Math.max(-0.5, Math.min(0.5, rawY));

  const rotateX = Number((-normY * 2 * maxTiltDeg).toFixed(3));
  const rotateY = Number((normX * 2 * maxTiltDeg).toFixed(3));

  const parallaxX = Number((normX * 2 * maxParallaxPx).toFixed(2));
  const parallaxY = Number((normY * 2 * maxParallaxPx).toFixed(2));

  const glareX = Math.round((normX + 0.5) * 100);
  const glareY = Math.round((normY + 0.5) * 100);

  return {
    normX,
    normY,
    rotateX,
    rotateY,
    parallaxX,
    parallaxY,
    glareX,
    glareY,
  };
}
