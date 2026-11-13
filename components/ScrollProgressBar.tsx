'use client';

import React, { useEffect, useRef } from 'react';

export const ScrollProgressBar = React.memo(function ScrollProgressBar() {
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    let rafId = 0;
    let ticking = false;

    const updateProgress = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const progress = docHeight > 0 ? Math.min(1, Math.max(0, scrollTop / docHeight)) : 0;
      bar.style.transform = `scaleX(${progress})`;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        rafId = window.requestAnimationFrame(updateProgress);
      }
    };

    updateProgress();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      data-testid="scroll-progress-container"
      className="fixed top-0 left-0 right-0 z-50 h-[2px] w-full bg-transparent pointer-events-none overflow-hidden"
    >
      <div
        ref={barRef}
        data-testid="scroll-progress-bar"
        style={{ transform: 'scaleX(0)', transformOrigin: '0% 50%' }}
        className="h-full w-full bg-gradient-to-r from-[#FF4B1F] via-[#F04424] to-[#9B63F5] will-change-transform"
      />
    </div>
  );
});
