'use client';

import React, { useEffect, useRef } from 'react';

interface ParticleCloudCanvasProps {
  isDark: boolean;
  variant?: 'hero' | 'cinematic';
  testId?: string;
}

interface SmokeBlob {
  /** Normalized progress along the diagonal plume spine (0 = bottom-left, 1 = top-right) */
  t: number;
  /** Perpendicular offset from spine in normalized units */
  perpOffset: number;
  /** Radius multiplier relative to min(width, height) */
  radiusRatio: number;
  /** Sprite variant index (0..2) */
  spriteIdx: number;
  /** Drift speed along spine */
  driftSpeed: number;
  /** Phase for gentle breathing / undulation */
  phase: number;
  /** Base alpha multiplier */
  alpha: number;
}

interface PlumeParticle {
  /** Progress along diagonal spine (0..1) */
  t: number;
  /** Signed perpendicular distance from spine */
  perp: number;
  /** Tangential velocity along spine */
  speedT: number;
  /** Turbulence phase */
  phase: number;
  /** Turbulence frequency */
  freq: number;
  /** Turbulence amplitude */
  amp: number;
  /** Radius in CSS pixels */
  size: number;
  /** Color bucket index (0..3) for batched fill() */
  bucket: number;
  /** True if ambient background particle, false if concentrated in plume */
  isAmbient: boolean;
}

const DESKTOP_PARTICLE_COUNT = 1400;
const MOBILE_PARTICLE_COUNT = 680;
const SMOKE_BLOB_COUNT = 26;
const SPRITE_SIZE = 256;

/**
 * Computes a point (x, y) and unit normal (nx, ny) along a gentle S-curved
 * rising diagonal spine from bottom-center-left to top-center-right,
 * positioned in the atmospheric channel between the editorial copy and showcase.
 */
function getSpinePoint(
  t: number,
  w: number,
  h: number,
  timeSec: number
): { x: number; y: number; nx: number; ny: number } {
  const startX = w * 0.38;
  const startY = h * 0.95;
  const endX = w * 0.78;
  const endY = h * 0.05;

  const baseX = startX + (endX - startX) * t;
  const baseY = startY + (endY - startY) * t;

  const dx = endX - startX;
  const dy = endY - startY;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  const wave =
    Math.sin(t * Math.PI * 2.1 - timeSec * 0.55) * (Math.min(w, h) * 0.048) +
    Math.cos(t * Math.PI * 1.1 + timeSec * 0.32) * (Math.min(w, h) * 0.025);

  return {
    x: baseX + nx * wave,
    y: baseY + ny * wave,
    nx,
    ny,
  };
}

/**
 * Computes an art-directed readability factor (0.24..1.0) so particles
 * remain luminous and expressive around the hero device showcase and central negative space
 * while softly parting behind primary hero typography and interactive controls.
 */
function computeReadabilityFactor(x: number, y: number, w: number, h: number): number {
  const rx = x / (w || 1);
  const ry = y / (h || 1);

  if (w >= 960) {
    // Left editorial headline & CTA zone protection — keep text crystal clear
    if (rx > 0.02 && rx < 0.44 && ry > 0.12 && ry < 0.74) {
      const cx = (rx - 0.23) / 0.21;
      const cy = (ry - 0.43) / 0.31;
      const distSq = cx * cx + cy * cy;
      if (distSq < 1) {
        return 0.24 + 0.76 * distSq;
      }
    }
    // Center of right device screen — keep screenshot sharp while haloing its perimeter
    if (rx > 0.58 && rx < 0.90 && ry > 0.22 && ry < 0.64) {
      const cx = (rx - 0.74) / 0.16;
      const cy = (ry - 0.43) / 0.21;
      const distSq = cx * cx + cy * cy;
      if (distSq < 1) {
        return 0.48 + 0.52 * distSq;
      }
    }
  } else {
    // Mobile / tablet readability zone around primary headline
    if (rx > 0.05 && rx < 0.95 && ry > 0.08 && ry < 0.38) {
      const cx = (rx - 0.5) / 0.45;
      const cy = (ry - 0.23) / 0.15;
      const distSq = cx * cx + cy * cy;
      if (distSq < 1) {
        return 0.28 + 0.72 * distSq;
      }
    }
  }
  return 1;
}

/**
 * Pre-renders a soft radial smoke + stippled micro-dot texture onto an offscreen canvas
 * so the main animation loop only performs fast GPU-accelerated drawImage() calls.
 * Strictly preserves the signature CROSX DEV STUDIO white + purple/violet particle identity.
 */
function createStippledSmokeSprite(
  isDark: boolean,
  variant: number
): HTMLCanvasElement {
  const off = document.createElement('canvas');
  off.width = SPRITE_SIZE;
  off.height = SPRITE_SIZE;
  const ctx = off.getContext('2d');
  if (!ctx) return off;

  const half = SPRITE_SIZE / 2;

  // 1. Soft atmospheric base glow (white + rich violet/purple/indigo)
  const grad = ctx.createRadialGradient(half, half, 2, half, half, half);
  if (isDark) {
    if (variant === 0) {
      grad.addColorStop(0, 'rgba(147, 51, 234, 0.24)');
      grad.addColorStop(0.42, 'rgba(109, 40, 217, 0.11)');
      grad.addColorStop(0.75, 'rgba(79, 70, 229, 0.04)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    } else if (variant === 1) {
      grad.addColorStop(0, 'rgba(192, 132, 252, 0.20)');
      grad.addColorStop(0.45, 'rgba(126, 34, 206, 0.09)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    } else {
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
      grad.addColorStop(0.38, 'rgba(168, 85, 247, 0.08)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    }
  } else {
    if (variant === 0) {
      grad.addColorStop(0, 'rgba(124, 58, 237, 0.16)');
      grad.addColorStop(0.45, 'rgba(139, 92, 246, 0.08)');
      grad.addColorStop(0.8, 'rgba(196, 181, 253, 0.03)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    } else if (variant === 1) {
      grad.addColorStop(0, 'rgba(99, 102, 241, 0.14)');
      grad.addColorStop(0.48, 'rgba(147, 51, 234, 0.07)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    } else {
      grad.addColorStop(0, 'rgba(109, 40, 217, 0.15)');
      grad.addColorStop(0.4, 'rgba(79, 70, 229, 0.07)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    }
  }

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(half, half, half, 0, Math.PI * 2);
  ctx.fill();

  // 2. Bake fine stippled micro-grains into the sprite for powdery smoke texture
  let seed = (variant + 1) * 9301 + (isDark ? 49297 : 12345);
  const nextRand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const grainCount = 290;
  for (let i = 0; i < grainCount; i++) {
    const angle = nextRand() * Math.PI * 2;
    const r = Math.pow(nextRand(), 0.78) * (half * 0.88);
    const gx = half + Math.cos(angle) * r;
    const gy = half + Math.sin(angle) * r;
    const falloff = 1 - r / half;
    const dotRadius = 0.55 + nextRand() * 1.15;

    if (isDark) {
      ctx.fillStyle =
        i % 3 === 0
          ? `rgba(255, 255, 255, ${(falloff * 0.52).toFixed(3)})`
          : i % 3 === 1
          ? `rgba(216, 180, 254, ${(falloff * 0.46).toFixed(3)})`
          : `rgba(168, 85, 247, ${(falloff * 0.42).toFixed(3)})`;
    } else {
      ctx.fillStyle =
        i % 3 === 0
          ? `rgba(109, 40, 217, ${(falloff * 0.5).toFixed(3)})`
          : i % 3 === 1
          ? `rgba(79, 70, 229, ${(falloff * 0.44).toFixed(3)})`
          : `rgba(255, 255, 255, ${(falloff * 0.65).toFixed(3)})`;
    }

    ctx.fillRect(gx - dotRadius * 0.5, gy - dotRadius * 0.5, dotRadius, dotRadius);
  }

  return off;
}

const SPRITE_CACHE: {
  dark?: HTMLCanvasElement[];
  light?: HTMLCanvasElement[];
} = {};

function getCachedSmokeSprites(isDark: boolean): HTMLCanvasElement[] {
  const key = isDark ? 'dark' : 'light';
  const existing = SPRITE_CACHE[key];
  if (existing && existing.length === 3) {
    return existing;
  }
  const built = [
    createStippledSmokeSprite(isDark, 0),
    createStippledSmokeSprite(isDark, 1),
    createStippledSmokeSprite(isDark, 2),
  ];
  SPRITE_CACHE[key] = built;
  return built;
}

// Preserved white + purple/violet/indigo particle buckets
const DARK_BUCKETS = [
  'rgba(255, 255, 255, 0.90)', // Crisp white starlight core
  'rgba(221, 214, 254, 0.82)', // Soft lavender-white mist
  'rgba(168, 85, 247, 0.78)',  // Vibrant purple nebula
  'rgba(129, 140, 248, 0.70)', // Deep indigo-violet outer plume
];

const LIGHT_BUCKETS = [
  'rgba(88, 28, 135, 0.82)',   // Deep royal purple core
  'rgba(124, 58, 237, 0.76)',  // Vibrant violet plume
  'rgba(79, 70, 229, 0.68)',   // Crisp indigo-purple mist
  'rgba(255, 255, 255, 0.92)', // Luminous white starlight highlights
];

export const ParticleCloudCanvas = React.memo(function ParticleCloudCanvas({
  isDark,
  variant = 'hero',
  testId = 'hero-particle-canvas',
}: ParticleCloudCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDarkRef = useRef(isDark);

  useEffect(() => {
    isDarkRef.current = isDark;
  }, [isDark]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId = 0;
    let isVisible = true;
    let isDocumentHidden = typeof document !== 'undefined' ? document.hidden : false;
    let width = 1280;
    let height = 760;

    let mouseX = -9999;
    let mouseY = -9999;
    let smoothMouseX = -9999;
    let smoothMouseY = -9999;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const darkSprites = getCachedSmokeSprites(true);
    const lightSprites = getCachedSmokeSprites(false);

    let seed = variant === 'cinematic' ? 84213 : 42197;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const blobCount = variant === 'cinematic' ? 14 : SMOKE_BLOB_COUNT;
    const blobs: SmokeBlob[] = Array.from({ length: blobCount }, (_, i) => {
      const t = (i / blobCount + rand() * 0.06) % 1;
      const spreadFactor = 0.03 + Math.sin(t * Math.PI) * 0.08;
      return {
        t,
        perpOffset: (rand() - 0.5) * 2 * spreadFactor,
        radiusRatio: 0.14 + rand() * 0.17,
        spriteIdx: i % 3,
        driftSpeed: 0.014 + rand() * 0.018,
        phase: rand() * Math.PI * 2,
        alpha: 0.55 + rand() * 0.45,
      };
    });

    const isMobileViewport = typeof window !== 'undefined' && window.innerWidth < 768;
    const totalParticles =
      variant === 'cinematic'
        ? isMobileViewport
          ? 360
          : 720
        : isMobileViewport
        ? MOBILE_PARTICLE_COUNT
        : DESKTOP_PARTICLE_COUNT;

    const particles: PlumeParticle[] = Array.from({ length: totalParticles }, (_, i) => {
      const isAmbient = i >= totalParticles * 0.82;
      const t = rand();
      const u1 = Math.max(0.0001, rand());
      const u2 = rand();
      const gaussian = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

      const distFromCore = Math.abs(gaussian);
      let bucket = 0;
      if (distFromCore < 0.55) {
        bucket = rand() < 0.62 ? 0 : 1;
      } else if (distFromCore < 1.25) {
        bucket = rand() < 0.55 ? 1 : 2;
      } else {
        bucket = rand() < 0.6 ? 2 : 3;
      }

      return {
        t,
        perp: isAmbient ? (rand() - 0.5) * 1.45 : gaussian * 0.105,
        speedT: (0.016 + rand() * 0.032) * (isAmbient ? 0.45 : 1),
        phase: rand() * Math.PI * 2,
        freq: 0.6 + rand() * 1.4,
        amp: 3 + rand() * 14,
        size: isAmbient
          ? 0.9 + rand() * 1.1
          : distFromCore < 0.5
          ? 1.0 + rand() * 1.45
          : 0.8 + rand() * 1.15,
        bucket,
        isAmbient,
      };
    });

    let loopActive = false;
    let themeResetTimer = 0;

    const updateDimensions = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(320, rect.width || window.innerWidth);
      height = Math.max(420, rect.height || 680);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    updateDimensions();

    const startTime = performance.now();
    let lastRenderTime = 0;

    const drawScene = (now: number) => {
      const elapsedSec = prefersReducedMotion ? 0 : (now - startTime) * 0.001;
      const dark = isDarkRef.current;
      const minDim = Math.min(width, height);

      if (mouseX < -1000) {
        smoothMouseX = -9999;
        smoothMouseY = -9999;
      } else if (smoothMouseX < -1000) {
        smoothMouseX = mouseX;
        smoothMouseY = mouseY;
      } else {
        smoothMouseX += (mouseX - smoothMouseX) * 0.08;
        smoothMouseY += (mouseY - smoothMouseY) * 0.08;
      }

      ctx.clearRect(0, 0, width, height);

      // 1. Render volumetric stippled smoke/nebula sprites along diagonal spine
      const sprites = dark ? darkSprites : lightSprites;
      for (let i = 0; i < blobs.length; i++) {
        const b = blobs[i];
        const t = (b.t + elapsedSec * b.driftSpeed) % 1;
        const spine = getSpinePoint(t, width, height, elapsedSec);

        const edgeFade = Math.sin(t * Math.PI);
        const breathe = 0.88 + 0.12 * Math.sin(elapsedSec * 0.9 + b.phase);
        const radius = minDim * b.radiusRatio * breathe;

        const bx = spine.x + spine.nx * (b.perpOffset * minDim);
        const by = spine.y + spine.ny * (b.perpOffset * minDim);

        const readability = computeReadabilityFactor(bx, by, width, height);
        ctx.globalAlpha = edgeFade * b.alpha * readability;
        ctx.drawImage(
          sprites[b.spriteIdx],
          bx - radius,
          by - radius,
          radius * 2,
          radius * 2
        );
      }

      ctx.globalAlpha = 1;

      // 2. Batch-render fine powdery particle dots by color bucket (4 draw calls total)
      const palette = dark ? DARK_BUCKETS : LIGHT_BUCKETS;

      for (let bucketIdx = 0; bucketIdx < 4; bucketIdx++) {
        ctx.fillStyle = palette[bucketIdx];
        ctx.beginPath();

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          if (p.bucket !== bucketIdx) continue;

          const t = (p.t + elapsedSec * p.speedT) % 1;
          const spine = getSpinePoint(t, width, height, elapsedSec);

          const envelope = p.isAmbient ? 1 : 0.45 + 0.75 * Math.sin(t * Math.PI);
          const perpPx = p.perp * minDim * envelope;

          const turbX = Math.cos(elapsedSec * p.freq + p.phase) * p.amp;
          const turbY = Math.sin(elapsedSec * p.freq * 1.15 + p.phase) * p.amp;

          let px = spine.x + spine.nx * perpPx + turbX;
          let py = spine.y + spine.ny * perpPx + turbY;

          // Subtle cursor vortex/repulsion
          if (smoothMouseX > -1000) {
            const dx = px - smoothMouseX;
            const dy = py - smoothMouseY;
            const distSq = dx * dx + dy * dy;
            if (distSq < 25600 && distSq > 1) {
              const dist = Math.sqrt(distSq);
              const force = (1 - dist / 160) * 18;
              px += (dx / dist) * force - (dy / dist) * (force * 0.35);
              py += (dy / dist) * force + (dx / dist) * (force * 0.35);
            }
          }

          // Respect readability attenuation by thinning non-core particles over text blocks
          const readability = computeReadabilityFactor(px, py, width, height);
          if (readability < 0.55 && (i & 1) === 1) {
            continue;
          }

          const s = p.size * (0.75 + 0.25 * readability);
          ctx.rect(px - s * 0.5, py - s * 0.5, s, s);
        }

        ctx.fill();
      }
    };

    const scheduleNextFrame = () => {
      if (!loopActive || animationFrameId !== 0) return;
      animationFrameId = window.requestAnimationFrame(renderFrame);
    };

    const renderFrame = (now: number) => {
      animationFrameId = 0;
      if (!loopActive) return;
      if (lastRenderTime === 0 || now - lastRenderTime >= 28) {
        lastRenderTime = now;
        drawScene(now);
      }
      scheduleNextFrame();
    };

    const syncLoopState = () => {
      const shouldRun = isVisible && !isDocumentHidden && !prefersReducedMotion;
      if (shouldRun && !loopActive) {
        loopActive = true;
        scheduleNextFrame();
      } else if (!shouldRun && loopActive) {
        loopActive = false;
        if (animationFrameId !== 0) {
          window.cancelAnimationFrame(animationFrameId);
          animationFrameId = 0;
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isVisible) return;
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouseX = -9999;
      mouseY = -9999;
    };

    const handleResize = () => {
      updateDimensions();
      if (prefersReducedMotion) {
        drawScene(performance.now());
      }
    };

    const handleVisibilityChange = () => {
      isDocumentHidden = document.hidden;
      syncLoopState();
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          isVisible = entry.isIntersecting;
          syncLoopState();
        }
      },
      { threshold: 0.02 }
    );
    observer.observe(canvas);

    drawScene(performance.now());
    syncLoopState();

    // Redraw static reduced-motion canvas cleanly when theme toggles
    if (prefersReducedMotion) {
      themeResetTimer = window.setInterval(() => {
        drawScene(performance.now());
      }, 800);
    }

    return () => {
      loopActive = false;
      if (animationFrameId !== 0) {
        window.cancelAnimationFrame(animationFrameId);
      }
      if (themeResetTimer !== 0) {
        window.clearInterval(themeResetTimer);
      }
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [variant]);

  return (
    <canvas
      ref={canvasRef}
      data-testid={testId}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full z-0"
    />
  );
});
