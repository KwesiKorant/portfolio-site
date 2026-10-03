"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";

export const MouseScrubSection: React.FC = () => {
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
      { threshold: 0.05 }
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
      { rootMargin: "800px 0px 800px 0px" }
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
    const timeDelta = Math.abs(displayedTimeRef.current - lastCommittedTimeRef.current);
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
      Math.min(1, displayedTimeRef.current / video.duration)
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
          Math.min(1, video.currentTime / video.duration)
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
      let newTime = ((touchStartTimeRef.current ?? 0) + deltaRatio * video.duration) % video.duration;
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

  const handleStep = (stepRatio: number) => {
    setIsAutoOrbit(false);
    const video = videoRef.current;
    if (!video || !video.duration) return;

    const delta = stepRatio * video.duration;
    targetTimeRef.current = Math.max(
      0,
      Math.min(video.duration, targetTimeRef.current + delta)
    );

    if (isSettled.current || !rafId.current) {
      isSettled.current = false;
      rafId.current = requestAnimationFrame(easeScrub);
    }
  };

  const handleReset = () => {
    setIsAutoOrbit(false);
    targetTimeRef.current = 0;
    if (isSettled.current || !rafId.current) {
      isSettled.current = false;
      rafId.current = requestAnimationFrame(easeScrub);
    }
  };

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
      {/* Video Element: Responsive framing for mobile (aspect-video docked directly above console) and desktop (h-full object-cover) */}
      <div className="absolute top-8 xs:top-9 inset-x-0 w-full aspect-video max-h-[30dvh] xs:max-h-[32dvh] sm:top-0 sm:inset-x-0 sm:h-full sm:max-h-none sm:aspect-auto overflow-hidden [mask-image:linear-gradient(to_bottom,black_88%,transparent_100%)] sm:[mask-image:none] pointer-events-none z-0">
        <video
          ref={videoRef}
          muted
          playsInline
          preload="none"
          className="w-full h-full object-contain scale-[1.10] origin-center sm:scale-100 sm:object-cover object-center lg:object-center pointer-events-none"
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
          className="group cursor-pointer flex items-center gap-1.5 sm:gap-2 text-zinc-300 hover:text-white px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-white/12 hover:border-accent-lime/50 bg-[#080a12] hover:bg-[#0c0e18] transition-all shadow-md pointer-events-auto active:scale-95"
          title="Return to 3D Spatial Deck"
        >
          <span className="text-accent-lime text-xs group-hover:-translate-y-0.5 transition-transform font-bold">&uarr;</span>
          <span>3D SPATIAL DECK</span>
        </button>

        {/* Interactive scrubber cue */}
        <div className="flex items-center gap-1.5 text-zinc-400 text-[8.5px] sm:text-[9.5px] font-mono bg-[#080a12] border border-white/10 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-lime animate-pulse" />
          <span className="hidden sm:inline">KINETIC 360° TURNTABLE //</span>
          <span>SWIPE &harr; TO SCRUB</span>
        </div>
      </div>

      {/* MOBILE VIEW (< lg): Integrated Turntable Apparatus - Direct Base Console Attached to Video */}
      <div className="flex lg:hidden flex-col items-center flex-1 w-full min-h-0 pt-0 pb-1 relative z-20">
        {/* Upper Robot Chamber: Responsive Spacing over Video */}
        <div className="relative w-full aspect-video max-h-[29dvh] xs:max-h-[31dvh] pointer-events-none shrink-0" />

        {/* Integrated Console Deck: Positioned right below the video, fills lower stage seamlessly to eliminate voids */}
        <div className="w-full max-w-sm xs:max-w-md flex-1 flex flex-col justify-between pointer-events-auto relative z-20 space-y-1.5 xs:space-y-2 -mt-1 xs:-mt-2 pb-0.5 min-h-0">
          {/* Integrated Hardware Scrubbing HUD */}
          <div className="w-full px-3 py-2 rounded-xl bg-[#080a12]/90 border border-accent-lime/25 flex items-center justify-between gap-2.5 text-zinc-300 font-mono text-[9.5px] xs:text-[10px] shadow-[0_4px_24px_rgba(0,0,0,0.8)]">
            <button
              onClick={() => setIsAutoOrbit((prev) => !prev)}
              className={`px-2.5 py-1 rounded-md border text-[8.5px] xs:text-[9px] font-bold tracking-wider flex items-center gap-1 transition-all cursor-pointer active:scale-95 ${
                isAutoOrbit
                  ? "bg-accent-lime/25 border-accent-lime text-accent-lime shadow-[0_0_10px_rgba(204,255,0,0.3)]"
                  : "bg-white/[0.08] border-white/20 text-white"
              }`}
            >
              <span>{isAutoOrbit ? "■ STOP" : "▶ AUTO-ORBIT"}</span>
            </button>

            {/* Scrub track & progress */}
            <div className="flex-1 flex flex-col gap-0.5 px-1">
              <div className="flex justify-between items-center text-[7.5px] xs:text-[8px] text-zinc-400 font-mono">
                <span className="text-zinc-400">TURNTABLE BASE</span>
                <span ref={mobileProgressTextRef} className="text-accent-lime font-bold">
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
              className="px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-zinc-300 hover:text-white text-[8.5px] xs:text-[9px] cursor-pointer active:scale-95"
              title="Reset rotation to 0°"
            >
              RESET 0°
            </button>
          </div>

          {/* Hardware Telemetry Deck: Unified Methodology + Shipped Systems Display (Fills Lower Stage Seamlessly with Zero Voids) */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pr-0.5 overscroll-contain">
            {/* Section 1: AI-Augmented Methodology */}
            <div className="space-y-1 xs:space-y-1.5">
              <div className="flex items-center justify-between text-[7px] xs:text-[7.5px] font-mono text-zinc-400 uppercase tracking-widest">
                <span className="text-accent-lime font-bold">01 // METHODOLOGY</span>
                <span>4 CORE PILLARS</span>
              </div>
              <div className="font-display text-[14px] xs:text-[16px] font-bold text-white tracking-tight leading-snug">
                The AI-Augmented Engineering Workflow
              </div>
              <p className="font-sans text-[9px] xs:text-[10px] text-zinc-300 leading-snug">
                Harnessing autonomous AI agents as an engineering force-multiplier to rapidly scaffold systems and deliver enterprise-grade software at 10x velocity.
              </p>
              <div className="grid grid-cols-2 gap-1 xs:gap-1.5 pt-0.5 font-mono text-[7.5px] xs:text-[8px]">
                <div className="p-2 xs:p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                  <span className="text-accent-lime uppercase block text-[7px] xs:text-[7.5px] font-bold mb-0.5 truncate">01 • AI SCAFFOLDING</span>
                  <span className="text-zinc-200 block leading-tight text-[7.5px] xs:text-[8px]">Rapid prototype gen &amp; boilerplate reduction</span>
                </div>
                <div className="p-2 xs:p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                  <span className="text-accent-lime uppercase block text-[7px] xs:text-[7.5px] font-bold mb-0.5 truncate">02 • ARCH RIGOR</span>
                  <span className="text-zinc-200 block leading-tight text-[7.5px] xs:text-[8px]">Human ownership of schema &amp; financial math</span>
                </div>
                <div className="p-2 xs:p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                  <span className="text-accent-lime uppercase block text-[7px] xs:text-[7.5px] font-bold mb-0.5 truncate">03 • FRONTEND POLISH</span>
                  <span className="text-zinc-200 block leading-tight text-[7.5px] xs:text-[8px]">120 FPS compositor &amp; zero DOM reflows</span>
                </div>
                <div className="p-2 xs:p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                  <span className="text-accent-lime uppercase block text-[7px] xs:text-[7.5px] font-bold mb-0.5 truncate">04 • MECH SYMPATHY</span>
                  <span className="text-zinc-200 block leading-tight text-[7.5px] xs:text-[8px]">All-Intra seek &amp; directional intent filter</span>
                </div>
              </div>
            </div>

            {/* Section 2: Real-World Shipped Systems */}
            <div className="space-y-1 xs:space-y-1.5 pt-1.5 border-t border-white/10">
              <div className="flex items-center justify-between text-[7px] xs:text-[7.5px] font-mono text-zinc-400 uppercase tracking-widest">
                <span className="text-accent-lime font-bold">02 // PRODUCTION FOOTPRINT</span>
                <span>3 SHIPPED SYSTEMS</span>
              </div>
              <div className="space-y-1 xs:space-y-1.5">
                <div className="p-2 xs:p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col gap-0.5 xs:gap-1">
                  <div className="flex items-center justify-between font-mono text-[8px] xs:text-[9px]">
                    <span className="text-accent-lime font-bold uppercase truncate mr-1.5">01 • ARCFIELD DISCOVER</span>
                    <span className="px-1.5 py-0.5 rounded bg-accent-lime/10 text-accent-lime text-[6.5px] xs:text-[7px] font-semibold shrink-0">CTO // MVP</span>
                  </div>
                  <p className="text-zinc-300 text-[8.5px] xs:text-[9.5px] leading-snug font-sans">
                    Hyperlocal discovery platform connecting neighborhood enterprises with consumers.
                  </p>
                </div>
                <div className="p-2 xs:p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col gap-0.5 xs:gap-1">
                  <div className="flex items-center justify-between font-mono text-[8px] xs:text-[9px]">
                    <span className="text-accent-lime font-bold uppercase truncate mr-1.5">02 • NAYAK FURNITURE ERP</span>
                    <span className="px-1.5 py-0.5 rounded bg-accent-lime/10 text-accent-lime text-[6.5px] xs:text-[7px] font-semibold shrink-0">PROD READY</span>
                  </div>
                  <p className="text-zinc-300 text-[8.5px] xs:text-[9.5px] leading-snug font-sans">
                    Showroom inventory &amp; POS ERP with automated bill-of-materials margin tracking in GH₵.
                  </p>
                </div>
                <div className="p-2 xs:p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col gap-0.5 xs:gap-1">
                  <div className="flex items-center justify-between font-mono text-[8px] xs:text-[9px]">
                    <span className="text-accent-cyan font-bold uppercase truncate mr-1.5">03 • 120 FPS KINETIC COMPOSITOR</span>
                    <span className="px-1.5 py-0.5 rounded bg-accent-cyan/10 text-accent-cyan text-[6.5px] xs:text-[7px] font-semibold shrink-0">FLAGSHIP</span>
                  </div>
                  <p className="text-zinc-300 text-[8.5px] xs:text-[9.5px] leading-snug font-sans">
                    3D spatial portfolio engine with sub-8ms touch response and zero DOM reflows.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Cue to Finale & Contact */}
          <div className="flex items-center justify-between pt-1.5 pb-0.5 border-t border-white/10 font-mono text-[8.5px] xs:text-[9px] text-zinc-300 shrink-0">
            <span className="text-zinc-400 font-mono tracking-wide">KINETIC TURNTABLE // 60 FPS</span>
            <button
              onClick={handleToFinale}
              className="text-accent-lime font-bold flex items-center gap-1 hover:underline cursor-pointer active:scale-95 px-2.5 py-1 rounded-lg bg-accent-lime/10 border border-accent-lime/30 shadow-[0_0_8px_rgba(204,255,0,0.15)]"
            >
              <span>FINALE &amp; CONTACT</span>
              <span className="text-xs">&darr;</span>
            </button>
          </div>
        </div>
      </div>

      {/* DESKTOP VIEW (>= lg): Canonical Dual-Console View - 100% Preserved */}
      <div className="hidden lg:flex flex-row justify-between items-center gap-8 w-full my-auto py-6 relative z-10 pointer-events-none">
        {/* Left: AI-Augmented Engineering Workflow Console */}
        <div className="w-full max-w-xl p-8 rounded-2xl bg-[#080a12]/60 border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.85)] pointer-events-auto">
          {/* Pill Tag without Stage Number */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-lime/10 border border-accent-lime/30 text-accent-lime font-mono text-[10px] tracking-widest uppercase mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-lime shadow-[0_0_8px_#ccff00] animate-pulse" />
            <span>ENGINEERING PHILOSOPHY // AI-AUGMENTED WORKFLOW</span>
          </div>

          {/* Title */}
          <h2 className="font-display text-3xl font-bold text-white tracking-tight leading-tight mb-2 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
            The AI-Augmented Engineering Workflow
          </h2>

          {/* Narrative Thesis */}
          <p className="font-sans text-sm text-zinc-200 leading-relaxed mb-4 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
            As a startup CTO and design engineer, I don't write software in isolation. I harness autonomous AI agents as an engineering force-multiplier to rapidly scaffold systems, audit edge cases, and test prototypes enabling a solo builder to deliver enterprise-grade software at 10x velocity.
          </p>

          {/* 4-Step Engineering Pipeline Grid */}
          <div className="grid grid-cols-2 gap-2 mb-4 font-mono text-[10px]">
            <div className="p-2.5 rounded-xl bg-[#0a0c14] border border-white/10">
              <span className="text-accent-lime uppercase block text-[9px] mb-0.5 font-semibold">
                01 &bull; AI SCAFFOLDING
              </span>
              <span className="text-zinc-200 text-[10px] leading-tight block">
                Rapid prototype generation &amp; boilerplate reduction
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#0a0c14] border border-white/10">
              <span className="text-accent-lime uppercase block text-[9px] mb-0.5 font-semibold">
                02 &bull; ARCHITECTURAL RIGOR
              </span>
              <span className="text-zinc-200 text-[10px] leading-tight block">
                Human ownership of schema, domain &amp; financial math
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#0a0c14] border border-white/10">
              <span className="text-accent-lime uppercase block text-[9px] mb-0.5 font-semibold">
                03 &bull; FRONTEND POLISH
              </span>
              <span className="text-zinc-200 text-[10px] leading-tight block">
                120 FPS compositor budgets &amp; zero DOM reflows
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#0a0c14] border border-white/10">
              <span className="text-accent-lime uppercase block text-[9px] mb-0.5 font-semibold">
                04 &bull; MECHANICAL SYMPATHY
              </span>
              <span className="text-zinc-200 text-[10px] leading-tight block">
                Hardware All-Intra seek &amp; directional cursor filter
              </span>
            </div>
          </div>

          {/* Real-time scrub gauge */}
          <div className="space-y-1.5 font-mono text-[10px] mb-5">
            <div className="flex justify-between text-zinc-300">
              <span className="font-medium">WORKFLOW SCRUB PROGRESS:</span>
              <span ref={progressTextRef} className="text-accent-lime font-bold">
                0.0%
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden">
              <div
                ref={progressBarRef}
                className="h-full w-full bg-accent-lime rounded-full origin-left will-change-transform"
                style={{ transform: "scaleX(0)" }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-zinc-400 pt-0.5 font-medium">
              <span>0.00s</span>
              <span ref={durationTextRef}>
                {duration ? `${duration.toFixed(2)}s` : "4.00s"}
              </span>
            </div>
          </div>

          {/* Interactive Control Deck */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
            <button
              onClick={() => setIsAutoOrbit((prev) => !prev)}
              className={`font-mono text-[10.5px] px-4 py-2 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                isAutoOrbit
                  ? "bg-accent-lime/25 border-accent-lime text-accent-lime font-bold shadow-[0_0_15px_rgba(204,255,0,0.3)]"
                  : "bg-white/[0.06] hover:bg-white/[0.12] border-white/20 text-white font-medium"
              }`}
            >
              <span>{isAutoOrbit ? "■ STOP" : "▶ AUTO-ORBIT"}</span>
            </button>

            <button
              onClick={() => handleStep(-0.05)}
              className="font-mono text-[10.5px] px-3 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-zinc-200 hover:text-white transition-all cursor-pointer active:scale-95"
              title="Step back 5%"
            >
              &larr; STEP
            </button>

            <button
              onClick={() => handleStep(0.05)}
              className="font-mono text-[10.5px] px-3 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-zinc-200 hover:text-white transition-all cursor-pointer active:scale-95"
              title="Step forward 5%"
            >
              STEP &rarr;
            </button>

            <button
              onClick={handleReset}
              className="font-mono text-[10.5px] px-3 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer ml-auto active:scale-95"
              title="Reset rotation to 0°"
            >
              RESET 0&deg;
            </button>
          </div>
        </div>

        {/* Right: Real-World Leverage & Shipped Production Panel */}
        <div className="w-full max-w-sm p-7 rounded-2xl bg-[#080a12]/60 border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.85)] pointer-events-auto">
          {/* Pill Tag without Stage Number */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-lime/10 border border-accent-lime/30 text-accent-lime font-mono text-[9.5px] tracking-widest uppercase mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-lime shadow-[0_0_8px_#ccff00] animate-pulse" />
            <span>REAL-WORLD LEVERAGE // SHIPPED SYSTEMS</span>
          </div>

          <h3 className="font-display text-xl font-bold text-white tracking-tight leading-snug mb-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            From Concept to Shipped Production
          </h3>

          <p className="font-sans text-xs text-zinc-200 leading-relaxed mb-4 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
            How AI-augmented engineering translates into tangible, shipped software across startups, enterprise applications, and high-performance interfaces:
          </p>

          <div className="space-y-2.5 font-sans text-xs">
            <div className="p-3 rounded-xl bg-[#0a0c14] border border-white/10">
              <div className="font-mono text-[9.5px] text-accent-lime font-semibold uppercase tracking-wider mb-0.5">
                01 &bull; ARCFIELD DISCOVER
              </div>
              <p className="text-zinc-200 text-[11.5px] leading-relaxed">
                Co-founded Arcfield Systems (CTO) - prototyped, designed, and launched a live business and service discovery MVP, enabling local enterprises to list services and users to discover them seamlessly.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#0a0c14] border border-white/10">
              <div className="font-mono text-[9.5px] text-accent-lime font-semibold uppercase tracking-wider mb-0.5">
                02 &bull; NAYAK FURNITURE ERP
              </div>
              <p className="text-zinc-200 text-[11.5px] leading-relaxed">
                Solo engineer delivering full factory inventory, point-of-sale cataloging, and automated P&amp;L financial reports in Ghanaian Cedis (GH₵).
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#0a0c14] border border-white/10">
              <div className="font-mono text-[9.5px] text-accent-lime font-semibold uppercase tracking-wider mb-0.5">
                03 &bull; 120 FPS KINETIC COMPOSITOR
              </div>
              <p className="text-zinc-200 text-[11.5px] leading-relaxed">
                Zero-reflow All-Intra scrubbing engine with directional tremor filtering, spring haptics, and sub-8ms input response.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Footer Navigation Bar */}
      <div className="hidden lg:flex justify-end items-center w-full font-mono text-[9.5px] sm:text-[10px] text-zinc-400 pt-4 sm:pt-6 relative z-20">
        <button
          onClick={handleToFinale}
          className="group cursor-pointer flex items-center gap-1.5 sm:gap-2 text-accent-lime/90 hover:text-accent-lime px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-accent-lime/30 hover:border-accent-lime bg-accent-lime/[0.06] hover:bg-accent-lime/[0.12] transition-all shadow-md active:scale-95"
        >
          <span>SCROLL DOWN FOR FINALE</span>
          <span className="text-xs group-hover:translate-y-0.5 transition-transform">
            &darr;
          </span>
        </button>
      </div>

      {/* Seamless bottom fade handoff into Stage 05 (Desktop only - mobile console is docked) */}
      <div className="hidden lg:block absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#050508] via-[#050508]/85 to-transparent pointer-events-none z-10" />
    </section>
  );
};
