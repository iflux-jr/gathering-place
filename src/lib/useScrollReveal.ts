import { useEffect, useState } from 'react';

/**
 * Where the page is in a scroll, for headers that tuck away while reading and come back
 * when the person scrolls up: 'top' near the top of the page, 'shown' after scrolling up,
 * 'hidden' after scrolling down.
 */
export function useScrollReveal(threshold = 96): 'top' | 'shown' | 'hidden' {
  const [state, setState] = useState<'top' | 'shown' | 'hidden'>('top');
  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        const dy = y - last;
        // A few pixels of slack so a shaky trackpad doesn't flicker the bar
        if (y < threshold) setState('top');
        else if (dy < -6) setState('shown');
        else if (dy > 6) setState('hidden');
        if (Math.abs(dy) > 6 || y < threshold) last = y;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); };
  }, [threshold]);
  return state;
}
