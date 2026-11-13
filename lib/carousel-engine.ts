export interface CarouselIndices {
  prevIndex: number;
  activeIndex: number;
  nextIndex: number;
  total: number;
}

export interface AutoplayGateInput {
  isManuallyPaused: boolean;
  isHovered: boolean;
  isFocusWithin: boolean;
  isDragging: boolean;
  isInViewport: boolean;
  prefersReducedMotion: boolean;
  isModalOpen?: boolean;
}

export interface HeroEntranceStage {
  id: 'header' | 'eyebrow' | 'heading' | 'description' | 'ctas' | 'stack' | 'showcase';
  delaySec: number;
  durationSec: number;
}

export const HERO_ENTRANCE_CHOREOGRAPHY: readonly HeroEntranceStage[] = [
  { id: 'header', delaySec: 0.0, durationSec: 0.45 },
  { id: 'eyebrow', delaySec: 0.05, durationSec: 0.5 },
  { id: 'heading', delaySec: 0.1, durationSec: 0.65 },
  { id: 'description', delaySec: 0.18, durationSec: 0.55 },
  { id: 'ctas', delaySec: 0.24, durationSec: 0.55 },
  { id: 'stack', delaySec: 0.3, durationSec: 0.55 },
  { id: 'showcase', delaySec: 0.14, durationSec: 0.68 },
] as const;

/**
 * Computes circular previous, active, and next indices for the 3-project showcase carousel.
 * Guarantees seamless wrap-around without out-of-bounds indices.
 */
export function computeCarouselIndices(activeIndex: number, total = 3): CarouselIndices {
  const safeTotal = Math.max(1, Math.floor(total));
  const normalizedActive = ((Math.floor(activeIndex) % safeTotal) + safeTotal) % safeTotal;
  const prevIndex = (normalizedActive - 1 + safeTotal) % safeTotal;
  const nextIndex = (normalizedActive + 1) % safeTotal;

  return {
    prevIndex,
    activeIndex: normalizedActive,
    nextIndex,
    total: safeTotal,
  };
}

/**
 * Steps the carousel index forward (+1) or backward (-1) with circular wrapping.
 */
export function stepCarouselIndex(
  currentIndex: number,
  direction: 1 | -1,
  total = 3
): { nextActiveIndex: number; direction: 1 | -1 } {
  const safeTotal = Math.max(1, Math.floor(total));
  const step = direction >= 0 ? 1 : -1;
  const nextActiveIndex = ((Math.floor(currentIndex) + step) % safeTotal + safeTotal) % safeTotal;
  return {
    nextActiveIndex,
    direction: step,
  };
}

export const CAROUSEL_SWIPE_TRANSITION_SEC = 0.35;
export const CAROUSEL_SWIPE_EASING = 'easeOut' as const;
export const CAROUSEL_SWIPE_OFFSET_PX = 20;
export const DEFAULT_SWIPE_THRESHOLD_PX = 28;

/**
 * Evaluates whether a touch/pointer swipe gesture is predominantly horizontal and exceeds
 * the distance or velocity threshold, ensuring vertical page scrolling is never hijacked.
 */
export function resolveSwipeAction(
  deltaX: number,
  deltaY: number,
  thresholdPx = DEFAULT_SWIPE_THRESHOLD_PX
): 'next' | 'prev' | 'none' {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  // Never trigger horizontal slide if the gesture is primarily vertical scrolling
  if (absX < thresholdPx || absX <= absY * 1.15) {
    return 'none';
  }

  // Swiping left (negative deltaX) advances to the next project; swiping right goes to previous
  return deltaX < 0 ? 'next' : 'prev';
}

/**
 * Pure state machine deciding whether the project showcase carousel timer should tick.
 */
export function shouldCarouselAutoplayRun(input: AutoplayGateInput): boolean {
  if (input.prefersReducedMotion) return false;
  if (input.isManuallyPaused) return false;
  if (!input.isInViewport) return false;
  if (input.isHovered) return false;
  if (input.isFocusWithin) return false;
  if (input.isDragging) return false;
  if (input.isModalOpen) return false;
  return true;
}
