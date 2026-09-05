import { useEffect, useRef, useState } from "react";

/**
 * Animated count-up hook for metric values.
 * Smoothly animates from 0 to the target value over `duration` ms.
 */
export function useCountUp(target: number, duration = 1200, startOnMount = true): number {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    if (!startOnMount || target === 0) {
      setValue(target);
      return;
    }

    const from = prevTarget.current;
    prevTarget.current = target;
    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (target - from) * eased);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setValue(target);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration, startOnMount]);

  return value;
}
