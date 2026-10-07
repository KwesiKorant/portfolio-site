"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";

export interface MouseScrubSectionHandle {
  handleWheelScrub: (deltaY: number) => "stay" | "overscroll-down" | "overscroll-up";
  setArrivalDirection: (direction: "forward" | "reverse") => void;
  resetScrubProgress: () => void;
}

export interface MouseScrubSectionProps {
  onRegisterHandle?: (handle: MouseScrubSectionHandle | null) => void;
}

export const MouseScrubSection: React.FC<MouseScrubSectionProps> = ({
  onRegisterHandle,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const progressTextRef = useRef<HTMLSpanElement | null>(null);
  const durationTextRef = useRef<HTMLSpanElement | null>(null);

  const [duration, setDuration] = useState<number>(0);
  const [isAutoOrbit, setIsAutoOrbit] = useState<boolean>(false);
  const mobileProgressBarRef = useRef<HTMLDivElement | null>(null);
  const mobileProgressTextRef = useRef<HTMLSpanElement | null>(null);
  const cachedBounds = useRef<{ left: number; width: number } | null>(null);
  const isInViewRef = useRef<boolean>(true);
  const lastEntryTimeRef = useRef<number>(Date.now());

  // Precision tracking refs to eliminate vertical movement jitter
  const lastClientX = useRef<number>(-1);
  const lastClientY = useRef<number>(-1);
  const lastCommittedTimeRef = useRef<number>(-1);

  // Asymmetric scroll-scrub state refs
  const hasCompletedForwardScrubRef = useRef<boolean>(false);
  const arrivedFromReverseRef = useRef<boolean>(false);
  const overscrollDownAccumulatorRef = useRef<number>(0);
  const overscrollUpAccumulatorRef = useRef<number>(0);
  const overscrollResetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastWheelScrubTimeRef = useRef<number>(0);

  // Touch scrubbing state with directional intent separation
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTimeRef = useRef<number>(0);
  const isTouchDragging = useRef<boolean>(false);
  const touchIntent = useRef<"horizontal" | "vertical" | null>(null);

  // Easing values for zero-reflow rAF loop
  const targetTimeRef = useRef<number>(0);
  const displayedTimeRef = useRef<number>(0);
  const rafId = useRef<number | null>(null);
  const isSettled = useRef<boolean>(true);
  const autoOrbitRafId = useRef<number | null>(null);

  // Cache container bounds on mount and window resize
  const updateCachedBounds = useCallback(() => {
    if (containerRef.current) {
      const r = containerRef.current.getBoundingClientRect();
      cachedBounds.current = { left: r.left, width: r.width };
    }
  }, []);

  useEffect(() => {
    updateCachedBounds();
    window.addEventListener("resize", updateCachedBounds, { passive: true });
    return () => window.removeEventListener("resize", updateCachedBounds);
  }, [updateCachedBounds]);

  // Viewport culling discipline: pause render loop when offscreen
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const wasInView = isInViewRef.current;
        isInViewRef.current = entry.isIntersecting;
        if (entry.isIntersecting && !wasInView) {
          lastEntryTimeRef.current = Date.now();
          updateCachedBounds();
          isSettled.current = true;
          lastClientX.current = -1;
          lastClientY.current = -1;
        }
        if (!entry.isIntersecting) {
          if (rafId.current) {
            cancelAnimationFrame(rafId.current);
            rafId.current = null;
          }
          if (autoOrbitRafId.current) {
            cancelAnimationFrame(autoOrbitRafId.current);
            autoOrbitRafId.current = null;
          }
          isSettled.current = true;
          // Automatically disengage auto-orbit when navigating away so state, UI button, and mouse scrubbing are not bricked on return
          setIsAutoOrbit(false);
        }
      },
      { threshold: 0.05 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [updateCachedBounds]);

  // Anticipatory background pre-buffering: start buffering turntable video when user approaches within 800px (e.g. Stage 3)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof window === "undefined") return;

    const preloadObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const video = videoRef.current;
          if (video && video.preload !== "auto") {
            video.preload = "auto";
            video.load();
          }
          preloadObserver.disconnect();
        }
      },
      { rootMargin: "800px 0px 800px 0px" },
    );

    preloadObserver.observe(el);
    return () => preloadObserver.disconnect();
  }, []);

  // Wait for loadedmetadata before calculating targetTime
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
        if (durationTextRef.current) {
          durationTextRef.current.textContent = `${video.duration.toFixed(2)}s`;
        }
      }
    };

    if (video.readyState >= 1 && video.duration) {
      handleLoadedMetadata();
    } else {
      video.addEventListener("loadedmetadata", handleLoadedMetadata);
      return () =>
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    }
  }, []);

  // Single rAF easing loop (Direct DOM mutations, zero React state re-renders)
  const easeScrub = useCallback(() => {
    if (!isInViewRef.current) {
      isSettled.current = true;
      rafId.current = null;
      return;
    }

    const video = videoRef.current;
    if (!video || !video.duration) {
      isSettled.current = true;
      rafId.current = null;
      return;
    }

    const diff = targetTimeRef.current - displayedTimeRef.current;
    const absDiff = Math.abs(diff);

    // If difference is sub-millisecond, snap to exact target and settle
    if (absDiff < 0.002) {
      displayedTimeRef.current = targetTimeRef.current;
      isSettled.current = true;
      rafId.current = null;
    } else {
      // Responsive, critically damped easing:
      // 0.36 provides immediate, tactile tracking while smoothing pointer jitter
      displayedTimeRef.current += diff * 0.36;
      rafId.current = requestAnimationFrame(easeScrub);
    }

    // Hardware Seek Throttling:
    // With 24 FPS All-Intra video (each frame ~0.0416s), committing currentTime
    // when diff < 0.02s causes the browser to abort and restart in-flight seeks.
    // Commit only if target has shifted by at least 0.025s (over half a frame) OR when settled.
    const timeDelta = Math.abs(
      displayedTimeRef.current - lastCommittedTimeRef.current,
    );
    if (timeDelta >= 0.025 || isSettled.current) {
      lastCommittedTimeRef.current = displayedTimeRef.current;
      try {
        video.currentTime = displayedTimeRef.current;
      } catch {
        // Safe seek catch
      }
    }

    // Update progress bar via compositor-only transform scaleX (runs at full 120 FPS!)
    const progressRatio = Math.max(
      0,
      Math.min(1, displayedTimeRef.current / video.duration),
    );
    if (progressBarRef.current) {
      progressBarRef.current.style.transform = `scaleX(${progressRatio.toFixed(4)})`;
    }
    if (mobileProgressBarRef.current) {
      mobileProgressBarRef.current.style.transform = `scaleX(${progressRatio.toFixed(4)})`;
    }
    if (progressTextRef.current) {
      progressTextRef.current.textContent = `${(progressRatio * 100).toFixed(1)}%`;
    }
    if (mobileProgressTextRef.current) {
      mobileProgressTextRef.current.textContent = `${(progressRatio * 100).toFixed(1)}%`;
    }
  }, []);

  // Auto-Orbit Continuous Loop: Hardware 60 FPS native playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isAutoOrbit) {
      if (!video.paused) {
        video.pause();
      }
      video.playbackRate = 1.0;
      if (autoOrbitRafId.current) {
        cancelAnimationFrame(autoOrbitRafId.current);
        autoOrbitRafId.current = null;
      }
      targetTimeRef.current = video.currentTime;
      displayedTimeRef.current = video.currentTime;
      lastCommittedTimeRef.current = video.currentTime;
      return;
    }

    video.loop = true;
    video.playbackRate = 1.6; // Kinetic 60 FPS auto-orbit speed (~2.5s full 360 rotation)
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn("Auto-orbit playback error:", err);
      });
    }

    // Lightweight RAF ticker to update the progress bar UI smoothly while playing
    const updateProgressLoop = () => {
      if (video && video.duration) {
        const progressRatio = Math.max(
          0,
          Math.min(1, video.currentTime / video.duration),
        );
        if (progressBarRef.current) {
          progressBarRef.current.style.transform = `scaleX(${progressRatio.toFixed(4)})`;
        }
        if (mobileProgressBarRef.current) {
          mobileProgressBarRef.current.style.transform = `scaleX(${progressRatio.toFixed(4)})`;
        }
        if (progressTextRef.current) {
          progressTextRef.current.textContent = `${(progressRatio * 100).toFixed(1)}%`;
        }
        if (mobileProgressTextRef.current) {
          mobileProgressTextRef.current.textContent = `${(progressRatio * 100).toFixed(1)}%`;
        }
      }
      autoOrbitRafId.current = requestAnimationFrame(updateProgressLoop);
    };

    autoOrbitRafId.current = requestAnimationFrame(updateProgressLoop);

    return () => {
      if (autoOrbitRafId.current) {
        cancelAnimationFrame(autoOrbitRafId.current);
        autoOrbitRafId.current = null;
      }
      if (!video.paused) {
        video.pause();
      }
    };
  }, [isAutoOrbit]);

  // Cancel rAF loop on unmount
  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      if (autoOrbitRafId.current) cancelAnimationFrame(autoOrbitRafId.current);
    };
  }, []);

  // Directional mouse tracking with vertical-jitter suppression
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isAutoOrbit) return;

    // Option 2: Lock mouse hover scrubbing until forward scroll discovery is completed.
    // Vertical trackpad/wheel scroll strictly owns the turntable journey from 0° -> 360°.
    if (!hasCompletedForwardScrubRef.current) {
      lastClientX.current = -1;
      lastClientY.current = -1;
      return;
    }

    // Ignore mouse tracking when hovering over interactive UI controls (buttons, links, inputs)
    const target = e.target as HTMLElement | null;
    if (target && target.closest("button, a, input, select")) {
      return;
    }

    const video = videoRef.current;
    if (!video || !video.duration) return;

    if (!cachedBounds.current) {
      updateCachedBounds();
    }
    const bounds = cachedBounds.current;
    if (!bounds || bounds.width <= 0) return;

    // First coordinate sample
    if (lastClientX.current === -1) {
      lastClientX.current = e.clientX;
      lastClientY.current = e.clientY;
      return;
    }

    const dx = Math.abs(e.clientX - lastClientX.current);
    const dy = Math.abs(e.clientY - lastClientY.current);

    // Directional Intent Guard:
    // If movement is predominantly vertical (dy significantly greater than dx) AND horizontal movement is tiny (< 3.5px),
    // ignore it as natural hand tremor during vertical motion to prevent video decoder thrashing.
    if (dy > dx * 1.5 && dx < 3.5) {
      lastClientY.current = e.clientY;
      return;
    }

    // Ignore small mouse moves if user recently scrolled with trackpad/wheel to prevent cursor wiggle from overriding scroll scrub
    if (Date.now() - lastWheelScrubTimeRef.current < 250) {
      if (Math.abs(e.clientX - lastClientX.current) < 15) {
        return;
      }
    }

    lastClientX.current = e.clientX;
    lastClientY.current = e.clientY;

    const mouseX = e.clientX - bounds.left;
    const ratio = Math.max(0, Math.min(1, mouseX / bounds.width));
    const newTarget = ratio * video.duration;

    // Minimum target threshold: ignore sub-pixel noise
    if (Math.abs(newTarget - targetTimeRef.current) < 0.005) return;

    targetTimeRef.current = newTarget;

    if (isSettled.current || !rafId.current) {
      isSettled.current = false;
      rafId.current = requestAnimationFrame(easeScrub);
    }
  };

  // High-performance touch scrubbing with directional intent guard
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, select")) return;

    if (isAutoOrbit) {
      setIsAutoOrbit(false);
    }
    const video = videoRef.current;
    if (video) {
      if (!video.paused) video.pause();
      targetTimeRef.current = video.currentTime;
      displayedTimeRef.current = video.currentTime;
      lastCommittedTimeRef.current = video.currentTime;
    }
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartTimeRef.current = targetTimeRef.current;
    isTouchDragging.current = true;
    touchIntent.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isTouchDragging.current || e.touches.length !== 1) return;
    const video = videoRef.current;
    if (!video || !video.duration) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const totalDx = currentX - (touchStartX.current ?? currentX);
    const totalDy = currentY - (touchStartY.current ?? currentY);

    if (touchIntent.current === null) {
      const dist = Math.hypot(totalDx, totalDy);
      if (dist > 8) {
        if (Math.abs(totalDx) >= Math.abs(totalDy) * 1.15) {
          touchIntent.current = "horizontal";
          setIsAutoOrbit(false);
        } else {
          touchIntent.current = "vertical";
        }
      }
    }

    if (touchIntent.current === "horizontal") {
      const scrubWidth = Math.max(260, window.innerWidth * 0.72);
      const deltaRatio = -totalDx / scrubWidth;
      let newTime =
        ((touchStartTimeRef.current ?? 0) + deltaRatio * video.duration) %
        video.duration;
      if (newTime < 0) newTime += video.duration;

      targetTimeRef.current = newTime;
      if (isSettled.current || !rafId.current) {
        isSettled.current = false;
        rafId.current = requestAnimationFrame(easeScrub);
      }
    }
  };

  const handleTouchEnd = () => {
    isTouchDragging.current = false;
    touchIntent.current = null;
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleReset = () => {
    setIsAutoOrbit(false);
    targetTimeRef.current = 0;
    hasCompletedForwardScrubRef.current = false;
    lastClientX.current = -1;
    lastClientY.current = -1;
    if (isSettled.current || !rafId.current) {
      isSettled.current = false;
      rafId.current = requestAnimationFrame(easeScrub);
    }
  };

  // Asymmetric Scroll-Scrub Controller:
  // Downward entry requires 360° rotation discovery before overscrolling to Finale;
  // Reverse entry from Finale omits mandatory scrub for frictionless return to 3D Canvas.
  const handleWheelScrub = useCallback(
    (deltaY: number): "stay" | "overscroll-down" | "overscroll-up" => {
      lastWheelScrubTimeRef.current = Date.now();

      // Disengage auto-orbit if active so scroll scrub takes priority
      if (isAutoOrbit) {
        setIsAutoOrbit(false);
      }

      // Detect device signature: continuous trackpad vs notched mouse wheel
      const isTrackpad =
        Math.abs(deltaY) % 100 !== 0 &&
        Math.abs(deltaY) % 120 !== 0;

      // Reset overscroll accumulators on scroll quiet
      if (overscrollResetTimerRef.current) clearTimeout(overscrollResetTimerRef.current);
      overscrollResetTimerRef.current = setTimeout(() => {
        overscrollDownAccumulatorRef.current = 0;
        overscrollUpAccumulatorRef.current = 0;
      }, isTrackpad ? 240 : 180);

      // CASE A: REVERSE JOURNEY (Arrived upward from Stage 3 Finale into Stage 2)
      // Per asymmetric journey specification: omit mandatory scrub when returning up
      if (arrivedFromReverseRef.current) {
        if (deltaY < 0) {
          // Scrolling UP -> glide straight back to Stage 1 (3D Space)
          overscrollUpAccumulatorRef.current += Math.abs(deltaY);
          const reverseUpThreshold = isTrackpad ? 120 : 90;
          if (overscrollUpAccumulatorRef.current >= reverseUpThreshold) {
            overscrollUpAccumulatorRef.current = 0;
            return "overscroll-up";
          }
        } else {
          // Scrolling DOWN -> return to Finale
          overscrollDownAccumulatorRef.current += deltaY;
          const reverseDownThreshold = isTrackpad ? 140 : 100;
          if (overscrollDownAccumulatorRef.current >= reverseDownThreshold) {
            overscrollDownAccumulatorRef.current = 0;
            return "overscroll-down";
          }
        }
        return "stay";
      }

      // CASE B: FORWARD JOURNEY (Arrived downward from Stage 1 into Stage 2)
      const video = videoRef.current;
      if (!video || !video.duration) {
        // Fallback before video metadata loads
        if (deltaY > 0) {
          overscrollDownAccumulatorRef.current += deltaY;
          if (overscrollDownAccumulatorRef.current >= (isTrackpad ? 180 : 120)) {
            overscrollDownAccumulatorRef.current = 0;
            return "overscroll-down";
          }
        } else {
          overscrollUpAccumulatorRef.current += Math.abs(deltaY);
          if (overscrollUpAccumulatorRef.current >= (isTrackpad ? 140 : 100)) {
            overscrollUpAccumulatorRef.current = 0;
            return "overscroll-up";
          }
        }
        return "stay";
      }

      // If user already completed forward scrub earlier in this session,
      // allow fluid bypass while still scrubbing video interactively
      if (hasCompletedForwardScrubRef.current) {
        const scrubDelta = (deltaY / 420) * video.duration;
        targetTimeRef.current = Math.max(0, Math.min(video.duration, targetTimeRef.current + scrubDelta));
        if (isSettled.current || !rafId.current) {
          isSettled.current = false;
          rafId.current = requestAnimationFrame(easeScrub);
        }

        if (deltaY > 0) {
          overscrollDownAccumulatorRef.current += deltaY;
          const repeatDownThreshold = isTrackpad ? 180 : 120;
          if (overscrollDownAccumulatorRef.current >= repeatDownThreshold) {
            overscrollDownAccumulatorRef.current = 0;
            return "overscroll-down";
          }
        } else {
          overscrollUpAccumulatorRef.current += Math.abs(deltaY);
          const repeatUpThreshold = isTrackpad ? 140 : 100;
          if (overscrollUpAccumulatorRef.current >= repeatUpThreshold) {
            overscrollUpAccumulatorRef.current = 0;
            return "overscroll-up";
          }
        }
        return "stay";
      }

      // FIRST-TIME FORWARD DISCOVERY:
      // Mandatory 360° scrub forward, with fluid mid-scrub reversal support
      if (deltaY > 0) {
        // Scrolling DOWN
        const isAtEnd = targetTimeRef.current >= video.duration * 0.96;
        if (!isAtEnd) {
          // Advance rotation smoothly (~420px total scroll travel for full 360°)
          overscrollDownAccumulatorRef.current = 0;
          const scrubDelta = (deltaY / 420) * video.duration;
          targetTimeRef.current = Math.min(video.duration, targetTimeRef.current + scrubDelta);
          if (targetTimeRef.current >= video.duration * 0.96) {
            hasCompletedForwardScrubRef.current = true;
          }
          if (isSettled.current || !rafId.current) {
            isSettled.current = false;
            rafId.current = requestAnimationFrame(easeScrub);
          }
          return "stay";
        } else {
          // Video reached end: mark scrub complete and accumulate overscroll detent to Finale
          hasCompletedForwardScrubRef.current = true;
          overscrollDownAccumulatorRef.current += deltaY;
          const finishDownThreshold = isTrackpad ? 160 : 110;
          if (overscrollDownAccumulatorRef.current >= finishDownThreshold) {
            overscrollDownAccumulatorRef.current = 0;
            return "overscroll-down";
          }
          return "stay";
        }
      } else {
        // Scrolling UP (Mid-Scrub Reversal)
        const isAtStart = targetTimeRef.current <= 0.04;
        if (!isAtStart) {
          // Rewind video back toward 0%
          overscrollUpAccumulatorRef.current = 0;
          const scrubDelta = (deltaY / 420) * video.duration; // deltaY is negative
          targetTimeRef.current = Math.max(0, targetTimeRef.current + scrubDelta);
          if (isSettled.current || !rafId.current) {
            isSettled.current = false;
            rafId.current = requestAnimationFrame(easeScrub);
          }
          return "stay";
        } else {
          // Video is fully rewound to 0%: accumulate upward overscroll to return to Stage 1
          overscrollUpAccumulatorRef.current += Math.abs(deltaY);
          const exitUpThreshold = isTrackpad ? 140 : 100;
          if (overscrollUpAccumulatorRef.current >= exitUpThreshold) {
            overscrollUpAccumulatorRef.current = 0;
            return "overscroll-up";
          }
          return "stay";
        }
      }
    },
    [isAutoOrbit, easeScrub]
  );

  // Register imperative handle with parent page orchestrator
  useEffect(() => {
    if (onRegisterHandle) {
      onRegisterHandle({
        handleWheelScrub,
        setArrivalDirection: (direction: "forward" | "reverse") => {
          arrivedFromReverseRef.current = direction === "reverse";
          overscrollDownAccumulatorRef.current = 0;
          overscrollUpAccumulatorRef.current = 0;
          lastClientX.current = -1;
          lastClientY.current = -1;
          if (direction === "forward" && !hasCompletedForwardScrubRef.current) {
            targetTimeRef.current = 0;
            if (isSettled.current || !rafId.current) {
              isSettled.current = false;
              rafId.current = requestAnimationFrame(easeScrub);
            }
          }
        },
        resetScrubProgress: () => {
          targetTimeRef.current = 0;
          hasCompletedForwardScrubRef.current = false;
          if (isSettled.current || !rafId.current) {
            isSettled.current = false;
            rafId.current = requestAnimationFrame(easeScrub);
          }
        },
      });
    }
    return () => {
      if (onRegisterHandle) {
        onRegisterHandle(null);
      }
      if (overscrollResetTimerRef.current) {
        clearTimeout(overscrollResetTimerRef.current);
      }
    };
  }, [onRegisterHandle, handleWheelScrub, easeScrub]);

  const handleToSpatial = () => {
    const el = document.getElementById("section-spatial");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleToFinale = () => {
    const el = document.getElementById("section-finale");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      ref={containerRef}
      id="section-scrub"
      className="relative w-full h-[100dvh] max-h-[100dvh] flex flex-col justify-between p-2.5 xs:p-3 sm:p-6 lg:p-12 overflow-hidden bg-[#050508] select-none [contain:layout_style_paint] touch-pan-y"
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label="Kinetic Frame Interaction Section"
    >
      {/* Video Element: Responsive framing for mobile/tablet (docked in upper chamber, lowered ~10-25% and scaled ~5-10% strictly on mobile) and desktop (ambient background) */}
      <div className="absolute top-[11dvh] sm:top-14 md:top-16 lg:top-0 inset-x-0 w-full aspect-video max-h-[29dvh] sm:max-h-[36dvh] md:max-h-[38dvh] lg:h-full lg:max-h-none lg:aspect-auto overflow-hidden [mask-image:linear-gradient(to_bottom,black_88%,transparent_100%)] lg:[mask-image:none] pointer-events-none z-0 flex items-center justify-center">
        <video
          ref={videoRef}
          muted
          playsInline
          preload="none"
          className="w-full h-full object-contain scale-[1.07] sm:scale-100 lg:scale-100 origin-center lg:object-cover object-center pointer-events-none"
        >
          <source src="/turntable_scrub.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Atmospheric Vignette & Subtle Center Spotlight */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-transparent to-[#050508]/80 pointer-events-none z-[1]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#050508]/80 via-transparent to-[#050508]/80 pointer-events-none z-[1]" />

      {/* Top Navigation Bar: Smooth scroll transition back to 3D Spatial Deck */}
      <div className="relative z-20 flex justify-between items-center w-full font-mono text-[9px] sm:text-[10px] text-zinc-400 shrink-0">
        <button
          onClick={handleToSpatial}
          onTouchStart={(e) => e.stopPropagation()}
          className="group cursor-pointer min-h-[38px] xs:min-h-[40px] flex items-center gap-1.5 sm:gap-2 text-zinc-300 hover:text-white px-3 sm:px-3.5 py-1.5 rounded-full border border-white/12 hover:border-accent-lime/50 bg-[#080a12] hover:bg-[#0c0e18] transition-all shadow-md pointer-events-auto active:scale-95"
          title="Return to 3D Spatial Deck"
        >
          <span className="text-accent-lime text-xs group-hover:-translate-y-0.5 transition-transform font-bold">
            &uarr;
          </span>
          <span>3D SPATIAL DECK</span>
        </button>

        {/* Interactive scrubber cue */}
        <div className="flex items-center gap-1.5 text-zinc-400 text-[8px] sm:text-[9px] font-mono bg-[#080a12] border border-white/10 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-lime animate-pulse" />
          <span className="hidden sm:inline">KINETIC 360° TURNTABLE //</span>
          <span>SWIPE &harr; TO SCRUB</span>
        </div>
      </div>

      {/* MOBILE & TABLET PORTRAIT VIEW (< lg): Dedicated Turntable Display & Hardware Console */}
      <div className="flex lg:hidden flex-col items-center justify-between flex-1 w-full min-h-0 pt-0 pb-1 relative z-20">
        {/* Upper Robot Chamber: Generous Viewport Spacing directly framing the 360° Turntable */}
        <div className="relative w-full h-[37dvh] sm:h-[39dvh] md:h-[41dvh] pointer-events-none shrink-0" />

        {/* Integrated Console Deck: Positioned right below the video with sleek pill HUD and curved inner content */}
        <div className="w-full max-w-md sm:max-w-xl md:max-w-2xl flex-1 flex flex-col justify-between pointer-events-auto relative z-20 space-y-2 sm:space-y-3 mt-2 sm:mt-4 pb-0.5 min-h-0">
          {/* Integrated Hardware Scrubbing HUD - Sleek Pill Outer */}
          <div className="w-full px-3 xs:px-4 py-1.5 xs:py-2 rounded-full bg-[#080a12]/95 border border-accent-lime/30 flex items-center justify-between gap-2 xs:gap-3 text-zinc-300 font-mono shadow-[0_6px_28px_rgba(0,0,0,0.85)] backdrop-blur-md">
            <button
              onClick={() => setIsAutoOrbit((prev) => !prev)}
              onTouchStart={(e) => e.stopPropagation()}
              className={`min-h-[36px] xs:min-h-[38px] px-3 xs:px-3.5 py-1 xs:py-1.5 rounded-lg border text-[8.5px] xs:text-[9.5px] sm:text-[10.5px] font-bold tracking-wider flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0 ${
                isAutoOrbit
                  ? "bg-accent-lime/25 border-accent-lime text-accent-lime shadow-[0_0_12px_rgba(204,255,0,0.35)]"
                  : "bg-white/[0.08] hover:bg-white/[0.14] border-white/20 text-white"
              }`}
            >
              <span>{isAutoOrbit ? "■ STOP" : "▶ AUTO-ORBIT"}</span>
            </button>

            {/* Scrub track & progress */}
            <div className="flex-1 flex flex-col gap-0.5 px-0.5 min-w-0">
              <div className="flex justify-between items-center text-[7.5px] xs:text-[8px] sm:text-[9px] text-zinc-400 font-mono">
                <span className="text-zinc-400 truncate">TURNTABLE BASE</span>
                <span
                  ref={mobileProgressTextRef}
                  className="text-accent-lime font-bold shrink-0 ml-1"
                >
                  0.0%
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden">
                <div
                  ref={mobileProgressBarRef}
                  className="h-full w-full bg-accent-lime rounded-full origin-left will-change-transform"
                  style={{ transform: "scaleX(0)" }}
                />
              </div>
            </div>

            <button
              onClick={handleReset}
              onTouchStart={(e) => e.stopPropagation()}
              className="min-h-[36px] xs:min-h-[38px] px-2.5 xs:px-3 py-1 xs:py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-zinc-300 hover:text-white text-[8.5px] xs:text-[9px] sm:text-[10px] font-bold cursor-pointer active:scale-95 shrink-0"
              title="Reset rotation to 0°"
            >
              RESET 0°
            </button>
          </div>

          {/* AI-Augmented Methodology Pillars: High-Craft Restraint with slightly curved inner content */}
          <div className="flex-1 min-h-0 flex flex-col justify-center space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between text-[7.5px] xs:text-[8px] sm:text-[9px] font-mono text-zinc-400 uppercase tracking-widest px-0.5">
              <span className="text-accent-lime font-bold">
                01 // METHODOLOGY
              </span>
              <span>4 CORE PILLARS</span>
            </div>
            <div className="font-display text-[14px] xs:text-[16px] sm:text-[19px] font-bold text-white tracking-tight leading-snug">
              The AI-Augmented Engineering Workflow
            </div>
            <p className="font-sans text-[9px] xs:text-[10px] sm:text-[11.5px] text-zinc-300 leading-snug">
              Harnessing autonomous AI agents as an engineering force-multiplier
              to rapidly scaffold systems and deliver enterprise-grade software
              at 10x velocity.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 pt-0.5 font-mono text-[8px] xs:text-[8.5px] sm:text-[9.5px]">
              <div className="p-2 sm:p-2.5 rounded-lg bg-white/[0.04] border border-white/10">
                <span className="text-accent-lime uppercase block text-[7.5px] xs:text-[8px] sm:text-[8.5px] font-bold mb-0.5 truncate">
                  01 • AI SCAFFOLDING
                </span>
                <span className="text-zinc-200 block leading-tight text-[7.5px] xs:text-[8px] sm:text-[9px]">
                  Rapid prototype generation & boilerplate reduction
                </span>
              </div>
              <div className="p-2 sm:p-2.5 rounded-lg bg-white/[0.04] border border-white/10">
                <span className="text-accent-lime uppercase block text-[7.5px] xs:text-[8px] sm:text-[8.5px] font-bold mb-0.5 truncate">
                  02 • ARCH RIGOR
                </span>
                <span className="text-zinc-200 block leading-tight text-[7.5px] xs:text-[8px] sm:text-[9px]">
                  Human ownership of schema &amp; financial math
                </span>
              </div>
              <div className="p-2 sm:p-2.5 rounded-lg bg-white/[0.04] border border-white/10">
                <span className="text-accent-lime uppercase block text-[7.5px] xs:text-[8px] sm:text-[8.5px] font-bold mb-0.5 truncate">
                  03 • FRONTEND POLISH
                </span>
                <span className="text-zinc-200 block leading-tight text-[7.5px] xs:text-[8px] sm:text-[9px]">
                  120 FPS compositor &amp; zero DOM reflows
                </span>
              </div>
              <div className="p-2 sm:p-2.5 rounded-lg bg-white/[0.04] border border-white/10">
                <span className="text-accent-lime uppercase block text-[7.5px] xs:text-[8px] sm:text-[8.5px] font-bold mb-0.5 truncate">
                  04 • MECH SYMPATHY
                </span>
                <span className="text-zinc-200 block leading-tight text-[7.5px] xs:text-[8px] sm:text-[9px]">
                  All-Intra seek &amp; directional intent filter
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Cue to Finale & Contact - Pill Outer */}
          <div className="flex items-center justify-between pt-1.5 pb-0.5 font-mono text-[8.5px] xs:text-[9px] sm:text-[9.5px] text-zinc-300 shrink-0">
            <span className="text-zinc-400 font-mono tracking-wide">
              KINETIC TURNTABLE // 60 FPS
            </span>
            <button
              onClick={handleToFinale}
              onTouchStart={(e) => e.stopPropagation()}
              className="min-h-[38px] xs:min-h-[40px] text-zinc-200 hover:text-white font-medium flex items-center gap-1.5 cursor-pointer active:scale-95 px-3.5 sm:px-4 py-1.5 rounded-full bg-[#080a12] hover:bg-[#0c0e18] border border-white/15 hover:border-accent-lime/50 shadow-md transition-all"
            >
              <span>FINALE &amp; CONTACT</span>
              <span className="text-accent-lime text-xs">&darr;</span>
            </button>
          </div>
        </div>
      </div>

      {/* DESKTOP & LANDSCAPE VIEW (>= lg): Canonical Command Console with Center Robot Focus */}
      <div className="hidden lg:flex flex-row justify-between items-center gap-6 xl:gap-8 w-full my-auto py-4 xl:py-6 relative z-10 pointer-events-none">
        {/* Left: AI-Augmented Engineering Console */}
        <div className="w-full max-w-lg p-5 xl:p-6 rounded-2xl bg-[#080a12]/85 border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.85)] pointer-events-auto">
          {/* Pill Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-lime/10 border border-accent-lime/30 text-accent-lime font-mono text-[9px] xl:text-[9.5px] tracking-widest uppercase mb-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-lime shadow-[0_0_8px_#ccff00] animate-pulse" />
            <span>METHODOLOGY // 10X VELOCITY</span>
          </div>

          <h2 className="font-display text-xl xl:text-2xl font-bold text-white tracking-tight leading-snug mb-2 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
            The AI-Augmented Engineering Workflow
          </h2>

          <p className="font-sans text-xs xl:text-[13px] text-zinc-300 leading-relaxed mb-3.5 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
            Harnessing autonomous AI agents as an engineering force-multiplier
            to rapidly scaffold systems and deliver enterprise-grade software at
            10x velocity.
          </p>

          {/* 2 Curated Focus Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3.5">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-accent-lime/40 transition-colors">
              <div className="text-accent-lime font-mono text-[9px] xl:text-[9.5px] font-bold uppercase mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-lime shadow-[0_0_6px_#ccff00]" />
                <span>01 • AI SCAFFOLDING</span>
              </div>
              <p className="text-zinc-200 text-[11px] xl:text-xs leading-snug">
                Rapid prototype generation &amp; boilerplate reduction
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-accent-lime/40 transition-colors">
              <div className="text-accent-lime font-mono text-[9px] xl:text-[9.5px] font-bold uppercase mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-lime shadow-[0_0_6px_#ccff00]" />
                <span>02 • ARCH RIGOR</span>
              </div>
              <p className="text-zinc-200 text-[11px] xl:text-xs leading-snug">
                Human ownership of schema &amp; financial math
              </p>
            </div>
          </div>

          {/* Real-time scrub gauge */}
          <div className="space-y-1.5 font-mono text-[9px] xl:text-[9.5px] mb-3.5 p-2.5 xl:p-3 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="flex justify-between text-zinc-300">
              <span className="font-medium text-zinc-400">
                TURNTABLE ROTATION:
              </span>
              <span
                ref={progressTextRef}
                className="text-accent-lime font-bold"
              >
                0.0%
              </span>
            </div>
            <div className="w-full h-2 bg-white/15 rounded-full overflow-hidden">
              <div
                ref={progressBarRef}
                className="h-full w-full bg-accent-lime rounded-full origin-left will-change-transform"
                style={{ transform: "scaleX(0)" }}
              />
            </div>
            <div className="flex justify-between text-[8px] xl:text-[8.5px] text-zinc-400 pt-0.5 font-medium">
              <span>0.00s</span>
              <span ref={durationTextRef}>
                {duration ? `${duration.toFixed(2)}s` : "4.00s"}
              </span>
            </div>
          </div>

          {/* Dedicated Auto-Orbit Control Deck (Only Auto Orbit) */}
          <div className="pt-2 border-t border-white/10">
            <button
              onClick={() => setIsAutoOrbit((prev) => !prev)}
              className={`w-full min-h-[44px] font-mono text-[10px] xl:text-[11px] px-4 py-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 ${
                isAutoOrbit
                  ? "bg-accent-lime/25 border-accent-lime text-accent-lime font-bold shadow-[0_0_15px_rgba(204,255,0,0.3)]"
                  : "bg-white/[0.06] hover:bg-white/[0.12] border-white/20 text-white font-medium"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-accent-lime animate-pulse" />
              <span>{isAutoOrbit ? "■ STOP AUTO-ORBIT" : "▶ AUTO-ORBIT"}</span>
            </button>
          </div>
        </div>

        {/* Right: Companion Workflow & Production Delivery Card */}
        <div className="hidden xl:flex flex-col items-end gap-2 text-right pointer-events-auto">
          <div className="p-4 rounded-2xl bg-[#080a12]/85 border border-white/15 text-zinc-300 font-mono text-[10px] shadow-xl max-w-[270px]">
            <div className="text-accent-lime font-bold mb-1.5 flex items-center gap-1.5 justify-end">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-lime shadow-[0_0_8px_#ccff00] animate-pulse" />
              <span>03 • PRODUCTION SHIP</span>
            </div>
            <div className="font-display text-xs text-white font-bold tracking-tight mb-1 text-right">
              Deterministic Delivery
            </div>
            <p className="text-zinc-400 text-[9.5px] leading-relaxed font-sans text-right">
              Bridging machine velocity with human verification enforcing
              relational integrity, offline-first data sync, and 120 FPS
              compositor craft across shipped client systems.
            </p>
          </div>
        </div>
      </div>

      {/* Desktop Footer Navigation Bar */}
      <div className="hidden lg:flex justify-end items-center w-full font-mono text-[9.5px] sm:text-[10px] text-zinc-400 pt-3 xl:pt-6 relative z-20">
        <button
          onClick={handleToFinale}
          className="group cursor-pointer min-h-[44px] flex items-center gap-1.5 sm:gap-2 text-zinc-300 hover:text-white px-4 py-2 rounded-xl border border-white/12 hover:border-accent-lime/50 bg-[#080a12] hover:bg-[#0c0e18] transition-all shadow-md active:scale-95"
        >
          <span>SCROLL DOWN FOR FINALE</span>
          <span className="text-accent-lime text-xs group-hover:translate-y-0.5 transition-transform">
            &darr;
          </span>
        </button>
      </div>

      {/* Seamless bottom fade handoff into Stage 05 (Desktop only - mobile console is docked) */}
      <div className="hidden lg:block absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#050508] via-[#050508]/85 to-transparent pointer-events-none z-10" />
    </section>
  );
};
