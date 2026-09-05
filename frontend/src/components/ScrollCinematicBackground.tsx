import React, { useEffect, useRef } from "react";

const TOTAL_FRAMES = 100;

function getFramePath(index: number): string {
  const frameNumber = String(index + 1).padStart(3, "0");
  return `/payment-recovery-animation/frame_${frameNumber}.jpg`;
}

export const ScrollCinematicBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<(HTMLImageElement | null)[]>(new Array(TOTAL_FRAMES).fill(null));
  const isLoadedRef = useRef<boolean[]>(new Array(TOTAL_FRAMES).fill(false));
  const lastRenderedIndexRef = useRef<number>(-1);
  const rafIdRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Draw image with object-fit: cover
  const drawImageCover = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    width: number,
    height: number
  ) => {
    const imgWidth = img.naturalWidth || 1280;
    const imgHeight = img.naturalHeight || 720;

    const hRatio = width / imgWidth;
    const vRatio = height / imgHeight;
    const ratio = Math.max(hRatio, vRatio); // cover scale

    const renderWidth = imgWidth * ratio;
    const renderHeight = imgHeight * ratio;
    const offsetX = (width - renderWidth) / 2;
    const offsetY = (height - renderHeight) / 2;

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, offsetX, offsetY, renderWidth, renderHeight);
  };

  // Find the closest loaded image to avoid any blank flash
  const getNearestLoadedImage = (targetIndex: number): HTMLImageElement | null => {
    if (isLoadedRef.current[targetIndex] && imagesRef.current[targetIndex]) {
      return imagesRef.current[targetIndex];
    }

    // Search outward for nearest loaded neighbor
    for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
      const prev = targetIndex - offset;
      if (prev >= 0 && isLoadedRef.current[prev] && imagesRef.current[prev]) {
        return imagesRef.current[prev];
      }
      const next = targetIndex + offset;
      if (next < TOTAL_FRAMES && isLoadedRef.current[next] && imagesRef.current[next]) {
        return imagesRef.current[next];
      }
    }

    return null;
  };

  // Compute frame index from window scroll position
  const getScrollFrameIndex = (): number => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    const docHeight = document.documentElement.scrollHeight || document.body.scrollHeight || 1;
    const winHeight = window.innerHeight || 1;
    const maxScroll = Math.max(docHeight - winHeight, 1);

    const progress = Math.min(Math.max(scrollTop / maxScroll, 0), 1);
    return Math.min(Math.floor(progress * (TOTAL_FRAMES - 1)), TOTAL_FRAMES - 1);
  };

  // Render the current frame to canvas
  const renderCurrentFrame = (force = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const targetIndex = getScrollFrameIndex();

    // Avoid redundant draw calls if frame hasn't changed and not forced
    if (!force && targetIndex === lastRenderedIndexRef.current) {
      return;
    }

    const imgToDraw = getNearestLoadedImage(targetIndex);
    if (!imgToDraw) return;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width || window.innerWidth;
    const height = rect.height || window.innerHeight;

    drawImageCover(ctx, imgToDraw, width, height);
    lastRenderedIndexRef.current = targetIndex;
  };

  // Resize canvas to match viewport with device pixel ratio
  const syncCanvasDimensions = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    renderCurrentFrame(true);
  };

  // Intelligent progressive frame preloader
  useEffect(() => {
    isMountedRef.current = true;

    const loadImage = (index: number): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        if (imagesRef.current[index]) {
          resolve(imagesRef.current[index]!);
          return;
        }
        const img = new Image();
        img.src = getFramePath(index);
        img.onload = () => {
          if (!isMountedRef.current) return;
          imagesRef.current[index] = img;
          isLoadedRef.current[index] = true;
          // If this is frame 0 or the current target frame, render immediately
          if (index === 0 || index === getScrollFrameIndex()) {
            renderCurrentFrame(true);
          }
          resolve(img);
        };
        img.onerror = () => {
          reject(new Error(`Failed to load frame ${index}`));
        };
      });
    };

    // Phase 1: High Priority - Load frame 0 immediately
    loadImage(0).then(() => {
      if (!isMountedRef.current) return;

      // Phase 2: Keyframes across the sequence (every 10th frame)
      const keyframes: number[] = [];
      for (let i = 10; i < TOTAL_FRAMES; i += 10) {
        keyframes.push(i);
      }
      if (!keyframes.includes(TOTAL_FRAMES - 1)) {
        keyframes.push(TOTAL_FRAMES - 1);
      }

      Promise.allSettled(keyframes.map((idx) => loadImage(idx))).then(() => {
        if (!isMountedRef.current) return;

        // Phase 3: Background infill in non-blocking batches of 6
        const remaining: number[] = [];
        for (let i = 1; i < TOTAL_FRAMES; i++) {
          if (!isLoadedRef.current[i]) {
            remaining.push(i);
          }
        }

        const BATCH_SIZE = 6;
        let pointer = 0;

        const loadNextBatch = () => {
          if (!isMountedRef.current || pointer >= remaining.length) return;
          const batch = remaining.slice(pointer, pointer + BATCH_SIZE);
          pointer += BATCH_SIZE;

          Promise.allSettled(batch.map((idx) => loadImage(idx))).then(() => {
            if ("requestIdleCallback" in window) {
              (window as any).requestIdleCallback(loadNextBatch, { timeout: 200 });
            } else {
              setTimeout(loadNextBatch, 50);
            }
          });
        };

        loadNextBatch();
      });
    });

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Setup scroll and resize listeners with RAF throttling
  useEffect(() => {
    syncCanvasDimensions();

    const onScroll = () => {
      if (rafIdRef.current) return;
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        renderCurrentFrame();
      });
    };

    const onResize = () => {
      syncCanvasDimensions();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return (
    <div className="cinematic-bg-container" aria-hidden="true">
      <canvas ref={canvasRef} className="cinematic-bg-canvas" />
      <div className="cinematic-bg-overlay" />
    </div>
  );
};
