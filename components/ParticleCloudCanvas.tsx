'use client';

import React, { useEffect, useRef } from 'react';

interface SmokeWisp {
  t: number; // 0 (bottom ignition base) -> 1 (upper canopy)
  speed: number;
  lateralOffset: number;
  phase: number;
  scale: number;
}

interface PlumeDot {
  t: number; // 0 -> 1 along diagonal fire-smoke spine
  speed: number;
  spreadNorm: number; // -1 to 1 perpendicular to spine
  turbulenceAmp: number;
  phase: number;
  size: number;
  bucket: number; // 0..5 color/alpha batch bucket
}

interface AmbientStarDot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  bucket: number;
}

interface ParticleCloudCanvasProps {
  isDark?: boolean;
}

export const ParticleCloudCanvas = React.memo(function ParticleCloudCanvas({
  isDark = true,
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

    let isVisible = true;
    let lastTime = performance.now();
    let elapsed = 0;

    let width = (canvas.width = canvas.clientWidth || 1280);
    let height = (canvas.height = canvas.clientHeight || 640);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
    const lowPower = cores <= 4;

    const seeded = (seed: number) => {
      const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
      return x - Math.floor(x);
    };

    // Pre-render turbulent stippled fire-smoke cluster sprites onto offscreen canvases
    // Renders the bright white-cyan lower fire-smoke bursts and electric blue/violet rising clouds at 60 FPS
    const buildSmokeSprites = (dark: boolean): HTMLCanvasElement[] => {
      const configs = dark
        ? [
            // 0: White-hot & cyan-blue lower fire-smoke burst (matches bottom of plume in screenshot)
            {
              innerGlow: 'rgba(255, 255, 255, 0.42)',
              coreGlow: 'rgba(147, 197, 253, 0.30)',
              midGlow: 'rgba(59, 130, 246, 0.16)',
              dotPrimary: 'rgba(255, 255, 255, 0.96)',
              dotSecondary: 'rgba(186, 230, 253, 0.90)',
              dotCount: 72,
            },
            // 1: Electric blue mid-plume smoke cluster
            {
              innerGlow: 'rgba(96, 165, 250, 0.28)',
              coreGlow: 'rgba(59, 130, 246, 0.22)',
              midGlow: 'rgba(79, 70, 229, 0.12)',
              dotPrimary: 'rgba(147, 197, 253, 0.92)',
              dotSecondary: 'rgba(59, 130, 246, 0.82)',
              dotCount: 64,
            },
            // 2: Deep purple-indigo upper smoke nebula
            {
              innerGlow: 'rgba(139, 92, 246, 0.20)',
              coreGlow: 'rgba(99, 102, 241, 0.15)',
              midGlow: 'rgba(67, 56, 202, 0.07)',
              dotPrimary: 'rgba(167, 139, 250, 0.80)',
              dotSecondary: 'rgba(99, 102, 241, 0.68)',
              dotCount: 54,
            },
          ]
        : [
            {
              innerGlow: 'rgba(37, 68, 232, 0.24)',
              coreGlow: 'rgba(59, 130, 246, 0.16)',
              midGlow: 'rgba(79, 70, 229, 0.08)',
              dotPrimary: 'rgba(29, 78, 216, 0.88)',
              dotSecondary: 'rgba(59, 130, 246, 0.78)',
              dotCount: 64,
            },
            {
              innerGlow: 'rgba(59, 91, 245, 0.18)',
              coreGlow: 'rgba(79, 70, 229, 0.12)',
              midGlow: 'rgba(99, 102, 241, 0.06)',
              dotPrimary: 'rgba(37, 99, 235, 0.82)',
              dotSecondary: 'rgba(79, 70, 229, 0.70)',
              dotCount: 56,
            },
            {
              innerGlow: 'rgba(109, 40, 217, 0.14)',
              coreGlow: 'rgba(99, 102, 241, 0.09)',
              midGlow: 'rgba(79, 70, 229, 0.04)',
              dotPrimary: 'rgba(109, 40, 217, 0.72)',
              dotSecondary: 'rgba(99, 102, 241, 0.58)',
              dotCount: 48,
            },
          ];

      return configs.map((cfg, idx) => {
        const size = 120;
        const off = document.createElement('canvas');
        off.width = size;
        off.height = size;
        const octx = off.getContext('2d');
        if (!octx) return off;

        const half = size / 2;
        // Asymmetric multi-lobe smoke puff so it looks like organic turbulent fire-smoke, not a flat circle
        for (let lobe = 0; lobe < 3; lobe++) {
          const lx = half + (seeded(idx * 30 + lobe * 7) - 0.5) * 22;
          const ly = half + (seeded(idx * 30 + lobe * 13) - 0.5) * 22;
          const lRadius = half * (0.58 + lobe * 0.12);
          const grad = octx.createRadialGradient(lx, ly, 1, lx, ly, lRadius);
          grad.addColorStop(0, lobe === 0 ? cfg.innerGlow : cfg.coreGlow);
          grad.addColorStop(0.45, cfg.midGlow);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          octx.fillStyle = grad;
          octx.fillRect(0, 0, size, size);
        }

        // Dense stippled micro-dots embedded inside each smoke puff
        for (let i = 0; i < cfg.dotCount; i++) {
          const r1 = seeded(idx * 300 + i * 3 + 1);
          const r2 = seeded(idx * 300 + i * 3 + 2);
          const r3 = seeded(idx * 300 + i * 3 + 3);
          const angle = r1 * Math.PI * 2;
          const dist = Math.pow(r2, 0.62) * (half * 0.84);
          const dx = half + Math.cos(angle) * dist;
          const dy = half + Math.sin(angle) * dist;
          const dotSize = r3 > 0.76 ? 2.2 : r3 > 0.32 ? 1.5 : 1.05;

          octx.fillStyle = i % 2 === 0 ? cfg.dotPrimary : cfg.dotSecondary;
          octx.fillRect(dx, dy, dotSize, dotSize);
        }

        return off;
      });
    };

    const darkSprites = buildSmokeSprites(true);
    const lightSprites = buildSmokeSprites(false);

    let wisps: SmokeWisp[] = [];
    let plumeDots: PlumeDot[] = [];
    let ambientDots: AmbientStarDot[] = [];

    const initSystem = () => {
      const isMobile = width < 640;
      const isTablet = width >= 640 && width < 1024;

      const wispCount = isMobile ? 20 : isTablet ? 28 : lowPower ? 32 : 40;
      const plumeDotCount = isMobile ? 420 : isTablet ? 780 : lowPower ? 1050 : 1400;
      const ambientCount = isMobile ? 80 : isTablet ? 140 : 220;

      wisps = Array.from({ length: wispCount }, (_, i) => {
        const r1 = seeded(i + 17);
        const r2 = seeded(i + 89);
        const r3 = seeded(i + 233);
        // Concentrate more wisps in the lower-to-mid fire-smoke core (t = 0.02..0.78)
        const t = Math.pow(r1, 1.35) * 0.86;
        return {
          t,
          speed: 0.052 + r2 * 0.044,
          lateralOffset: (r3 - 0.5) * 1.9,
          phase: r1 * Math.PI * 2,
          scale: (0.62 + r2 * 0.82) * (isMobile ? 0.72 : 1),
        };
      });

      plumeDots = Array.from({ length: plumeDotCount }, (_, i) => {
        const r1 = seeded(i * 1.7 + 31);
        const r2 = seeded(i * 2.3 + 113);
        const r3 = seeded(i * 3.1 + 277);
        const r4 = seeded(i * 4.7 + 503);

        const t = r1;
        // Gaussian-like spread concentrated along the diagonal spine with wide feathered edges
        const gaussian = r2 + r3 - 1.0; // -1 to +1

        let bucket = 3;
        const absSpread = Math.abs(gaussian);
        if (t < 0.36 && absSpread < 0.34) {
          bucket = r4 > 0.32 ? 0 : 1; // 0: White-hot fire core, 1: Ice-cyan spark
        } else if (t < 0.62 && absSpread < 0.48) {
          bucket = r4 > 0.52 ? 1 : 2; // 1: Ice-cyan, 2: Bright electric blue
        } else if (absSpread < 0.58) {
          bucket = r4 > 0.42 ? 2 : 3; // 2: Bright electric blue, 3: Mid cobalt blue
        } else {
          bucket = r4 > 0.45 ? 4 : 5; // 4: Royal indigo, 5: Deep purple-violet dust
        }

        return {
          t,
          speed: 0.036 + r4 * 0.052,
          spreadNorm: gaussian,
          turbulenceAmp: 9 + r3 * 28,
          phase: r2 * Math.PI * 2,
          size:
            bucket === 0
              ? 1.95 + r4 * 0.95
              : bucket <= 2
              ? 1.45 + r3 * 0.85
              : 1.15 + r2 * 0.75,
          bucket,
        };
      });

      ambientDots = Array.from({ length: ambientCount }, (_, i) => {
        const r1 = seeded(i + 901);
        const r2 = seeded(i + 1201);
        const r3 = seeded(i + 1501);
        return {
          x: width * (0.28 + r1 * 0.42),
          y: height * (0.03 + r2 * 0.92),
          vx: (r3 - 0.45) * 9,
          vy: -(7 + r1 * 11),
          size: 1.0 + r2 * 1.15,
          bucket: i % 4 === 0 ? 1 : i % 3 === 0 ? 2 : i % 2 === 0 ? 4 : 5,
        };
      });
    };

    initSystem();

    // Diagonal rising spine within the Upper Hero Stage:
    // Starts at bottom-center (0.44W, 0.89H — right beside Book a Free Call / View Projects)
    // and billows diagonally upward & right toward (0.58W, 0.06H)
    const getSpinePoint = (t: number, time: number) => {
      const baseX = width * (0.44 + t * 0.145 + Math.sin(t * Math.PI * 1.3) * 0.022);
      const baseY = height * (0.89 - t * 0.83);
      const waveX = Math.sin(t * 5.4 - time * 1.9) * (9 + t * 18);
      const waveY = Math.cos(t * 4.6 - time * 1.5) * (4 + t * 8);
      return {
        x: baseX + waveX,
        y: baseY + waveY,
      };
    };

    const DARK_BUCKETS = [
      'rgba(255, 255, 255, 0.96)', // 0: White-hot core dots
      'rgba(186, 230, 253, 0.92)', // 1: Ice-cyan spark dots
      'rgba(82, 152, 255, 0.88)',  // 2: Bright electric blue dots
      'rgba(59, 118, 246, 0.68)',  // 3: Mid cobalt blue dots
      'rgba(116, 102, 252, 0.72)', // 4: Royal indigo dots
      'rgba(152, 92, 255, 0.56)',  // 5: Deep purple-violet smoke dust
    ];

    const LIGHT_BUCKETS = [
      'rgba(29, 78, 216, 0.92)',   // 0: Deep cobalt core
      'rgba(37, 99, 235, 0.85)',   // 1: Electric royal blue
      'rgba(59, 91, 245, 0.78)',   // 2: Vivid blue
      'rgba(79, 70, 229, 0.60)',   // 3: Indigo mid
      'rgba(109, 40, 217, 0.56)',  // 4: Royal purple
      'rgba(124, 58, 237, 0.44)',  // 5: Violet dust
    ];

    const bucketCoords: number[][] = [[], [], [], [], [], []];
    const bucketSizes: number[][] = [[], [], [], [], [], []];

    const renderFrame = (now: number) => {
      if (!isVisible) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      if (!prefersReducedMotion) {
        elapsed += dt;
      }

      const dark = isDarkRef.current;
      ctx.clearRect(0, 0, width, height);

      // 1. Seamless radial atmospheric glow along the center plume (zero hard clip lines, zero code-editor bleed)
      const glowRadius = Math.min(width * 0.22, height * 0.46);
      const spineGlow = ctx.createRadialGradient(
        width * 0.48,
        height * 0.58,
        6,
        width * 0.49,
        height * 0.52,
        glowRadius
      );
      if (dark) {
        spineGlow.addColorStop(0, 'rgba(59, 125, 255, 0.22)');
        spineGlow.addColorStop(0.48, 'rgba(99, 78, 245, 0.10)');
        spineGlow.addColorStop(1, 'rgba(5, 6, 11, 0)');
      } else {
        spineGlow.addColorStop(0, 'rgba(37, 68, 232, 0.13)');
        spineGlow.addColorStop(0.48, 'rgba(99, 72, 245, 0.055)');
        spineGlow.addColorStop(1, 'rgba(245, 243, 238, 0)');
      }
      ctx.fillStyle = spineGlow;
      ctx.fillRect(0, 0, width, height);

      // 2. Render rising stippled fire-smoke cluster sprites along the diagonal plume
      const sprites = dark ? darkSprites : lightSprites;
      for (let i = 0; i < wisps.length; i++) {
        const w = wisps[i];
        if (!prefersReducedMotion) {
          w.t += w.speed * dt;
          if (w.t > 0.92) {
            w.t = 0.02;
          }
        }

        const spine = getSpinePoint(w.t, elapsed);
        const plumeRadius = width * (0.018 + Math.pow(w.t, 1.05) * 0.095);
        const curlX =
          Math.sin(w.t * 6.8 - elapsed * 2.2 + w.phase) * plumeRadius * w.lateralOffset;
        const curlY = Math.cos(w.t * 5.2 - elapsed * 1.8 + w.phase) * (plumeRadius * 0.36);

        const wx = spine.x + curlX;
        const wy = spine.y + curlY;

        // Smooth attenuation near the right-hand code editor (x > 0.58W -> 0.66W)
        const rightFade = wx > width * 0.58 ? Math.max(0, 1 - (wx - width * 0.58) / (width * 0.08)) : 1;
        const verticalFade = Math.min(w.t / 0.09, (0.92 - w.t) / 0.22, 1);
        const alpha = verticalFade * rightFade * (w.t < 0.36 ? 0.96 : 0.78);

        if (alpha > 0.02) {
          const spriteIdx = w.t < 0.30 ? 0 : w.t < 0.62 ? 1 : 2;
          const sprite = sprites[spriteIdx];
          const drawSize = 108 * w.scale * (0.72 + w.t * 0.68);
          ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
          ctx.drawImage(sprite, wx - drawSize * 0.5, wy - drawSize * 0.5, drawSize, drawSize);
        }
      }
      ctx.globalAlpha = 1;

      for (let b = 0; b < 6; b++) {
        bucketCoords[b].length = 0;
        bucketSizes[b].length = 0;
      }

      // 3. Update & bucket ~1,400 rising fire-smoke multi-dots
      const maxSpreadWidth = width * 0.16;
      const minSpreadWidth = width * 0.015;
      const rightCutoff = width * 0.65; // Stops before the right-hand code terminal

      for (let i = 0; i < plumeDots.length; i++) {
        const p = plumeDots[i];
        if (!prefersReducedMotion) {
          p.t += p.speed * dt;
          if (p.t >= 1.0) {
            p.t -= 1.0;
          }
        }

        const spine = getSpinePoint(p.t, elapsed);
        const currentSpread = minSpreadWidth + Math.pow(p.t, 0.90) * maxSpreadWidth;

        const turbX = Math.sin(p.t * 8.2 - elapsed * 2.5 + p.phase) * p.turbulenceAmp;
        const turbY = Math.cos(p.t * 6.6 - elapsed * 2.0 + p.phase) * (p.turbulenceAmp * 0.55);

        const px = spine.x + p.spreadNorm * currentSpread * 0.85 + turbX;
        const py = spine.y + p.spreadNorm * currentSpread * 0.42 + turbY;

        if (px > width * 0.25 && px < rightCutoff && py > 6 && py < height - 10) {
          let activeBucket = p.bucket;
          if (p.t < 0.28 && Math.abs(p.spreadNorm) < 0.30) {
            activeBucket = i % 3 === 0 ? 0 : 1;
          } else if (p.t > 0.68 && activeBucket < 3) {
            activeBucket = i % 2 === 0 ? 3 : 4;
          }

          bucketCoords[activeBucket].push(px, py);
          bucketSizes[activeBucket].push(p.size);
        }
      }

      // 4. Update & bucket ambient cosmic dust dots
      for (let i = 0; i < ambientDots.length; i++) {
        const a = ambientDots[i];
        if (!prefersReducedMotion) {
          a.x += a.vx * dt;
          a.y += a.vy * dt;
          if (a.y < 8) a.y = height - 14;
          if (a.x < width * 0.25) a.x = width * 0.63;
          if (a.x > width * 0.64) a.x = width * 0.28;
        }
        bucketCoords[a.bucket].push(a.x, a.y);
        bucketSizes[a.bucket].push(a.size);
      }

      // 5. Execute 6 single batched GPU path fills for all ~1,600 dots
      const palette = dark ? DARK_BUCKETS : LIGHT_BUCKETS;
      for (let b = 5; b >= 0; b--) {
        const coords = bucketCoords[b];
        const sizes = bucketSizes[b];
        const count = sizes.length;
        if (count === 0) continue;

        ctx.beginPath();
        ctx.fillStyle = palette[b];
        for (let j = 0; j < count; j++) {
          const x = coords[j * 2];
          const y = coords[j * 2 + 1];
          const s = sizes[j];
          ctx.rect(x, y, s, s);
        }
        ctx.fill();
      }

      if (!prefersReducedMotion && isVisible) {
        timerId = window.setTimeout(() => renderFrame(performance.now()), 16);
      }
    };

    let timerId = 0;
    renderFrame(performance.now());

    const handleResize = () => {
      const nextW = canvas.clientWidth;
      const nextH = canvas.clientHeight;
      if (nextW > 0 && nextH > 0 && (Math.abs(nextW - width) > 20 || Math.abs(nextH - height) > 20)) {
        width = canvas.width = nextW;
        height = canvas.height = nextH;
        initSystem();
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        isVisible = entry.isIntersecting;
        window.clearTimeout(timerId);
        if (isVisible && !prefersReducedMotion) {
          lastTime = performance.now();
          renderFrame(lastTime);
        }
      },
      { threshold: 0.05 }
    );

    observer.observe(canvas);
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      window.clearTimeout(timerId);
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-testid="hero-particle-canvas"
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-[560px] sm:h-[620px] lg:h-[640px] w-full"
    />
  );
});
