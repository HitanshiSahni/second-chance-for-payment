import { useEffect, useRef } from "react";

/**
 * Robust scroll-reveal hook using IntersectionObserver and MutationObserver.
 * Automatically discovers static and dynamically-rendered `.scroll-reveal` elements
 * and triggers entrance animations when they enter the viewport.
 */
export function useScrollReveal(containerRef: React.RefObject<HTMLElement | null>) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const mutationRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const revealIfInView = (el: Element) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight + 80 && rect.bottom > -80) {
        el.classList.add("revealed");
        return true;
      }
      return false;
    };

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.02, rootMargin: "50px 0px 100px 0px" }
    );

    const observeUnrevealed = () => {
      if (!container) return;
      const elements = container.querySelectorAll(".scroll-reveal:not(.revealed)");
      elements.forEach((el) => {
        if (revealIfInView(el)) {
          // Already visible in viewport, revealed immediately
        } else {
          observerRef.current?.observe(el);
        }
      });
    };

    // Initial pass
    observeUnrevealed();

    // Observe DOM mutations for dynamic content (API fetches, tab switches, batch results)
    mutationRef.current = new MutationObserver(() => {
      observeUnrevealed();
    });

    mutationRef.current.observe(container, {
      childList: true,
      subtree: true,
    });

    return () => {
      observerRef.current?.disconnect();
      mutationRef.current?.disconnect();
    };
  }, [containerRef]);
}
