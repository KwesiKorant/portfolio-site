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
  const cachedBounds = useRef<{ left: number; width: number } | null>(null);
  const isInViewRef = useRef<boolean>(true);

  // Precision tracking refs to eliminate vertical movement jitter
  const lastClientX = useRef<number>(-1);
  const lastClientY = useRef<number>(-1);
  const lastCommittedTimeRef = useRef<number>(-1);

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
        isInViewRef.current = entry.isIntersecting;
        if (!entry.isIntersecting) {
          if (rafId.current) cancelAnimationFrame(rafId.current);
          if (autoOrbitRafId.current) cancelAnimationFrame(autoOrbitRafId.current);
        }
      },
      { threshold: 0.05 }
    );

    observer.observe(el);
    return () => observer.disconnect();
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
      return;
    }

    const video = videoRef.current;
    if (!video || !video.duration) {
      isSettled.current = true;
      return;
    }

    const diff = targetTimeRef.current - displayedTimeRef.current;
    const absDiff = Math.abs(diff);

    // If difference is sub-millisecond, snap to exact target and settle
    if (absDiff < 0.002) {
      displayedTimeRef.current = targetTimeRef.current;
      isSettled.current = true;
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
    if (progressTextRef.current) {
      progressTextRef.current.textContent = `${(progressRatio * 100).toFixed(1)}%`;
    }
  }, []);

  // Auto-Orbit Continuous Loop: fast & fluid rotation (~2.2s for complete 360° turn)
  useEffect(() => {
    if (!isAutoOrbit) {
      if (autoOrbitRafId.current) cancelAnimationFrame(autoOrbitRafId.current);
      return;
    }

    let lastTimestamp = performance.now();

    const loop = (timestamp: number) => {
      const dt = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      const video = videoRef.current;
      if (video && video.duration && isInViewRef.current) {
        // Snappy, energetic orbit: 2.2s per 360° rotation
        const delta = (dt / 2.2) * video.duration;
        targetTimeRef.current = (targetTimeRef.current + delta) % video.duration;
        if (isSettled.current) {
          isSettled.current = false;
          rafId.current = requestAnimationFrame(easeScrub);
        }
      }

      autoOrbitRafId.current = requestAnimationFrame(loop);
    };

    autoOrbitRafId.current = requestAnimationFrame(loop);
    return () => {
      if (autoOrbitRafId.current) cancelAnimationFrame(autoOrbitRafId.current);
    };
  }, [isAutoOrbit, easeScrub]);

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

    if (isSettled.current) {
      isSettled.current = false;
      rafId.current = requestAnimationFrame(easeScrub);
    }
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

    if (isSettled.current) {
      isSettled.current = false;
      rafId.current = requestAnimationFrame(easeScrub);
    }
  };

  const handleReset = () => {
    setIsAutoOrbit(false);
    targetTimeRef.current = 0;
    if (isSettled.current) {
      isSettled.current = false;
      rafId.current = requestAnimationFrame(easeScrub);
    }
  };

  const handleToFinale = () => {
    const el = document.getElementById("section-finale");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      ref={containerRef}
      id="section-scrub"
      className="relative w-full min-h-[100dvh] flex flex-col justify-between p-6 md:p-12 overflow-hidden bg-[#050508] select-none [contain:layout_style_paint]"
      onMouseMove={handleMouseMove}
      aria-label="Kinetic Frame Interaction Section"
    >
      {/* Video Element: Always Paused, Hardware Seek Only */}
      <video
        ref={videoRef}
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
      >
        <source src="/turntable_scrub.mp4" type="video/mp4" />
      </video>

      {/* Atmospheric Vignette & Subtle Center Spotlight */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-transparent to-[#050508]/80 pointer-events-none z-[1]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#050508]/80 via-transparent to-[#050508]/80 pointer-events-none z-[1]" />

      {/* Top Spacer */}
      <div className="relative z-10 w-full" />

      {/* Main Dual-Console View: Left Constructor Console + Center Active Model + Right Concept Panel */}
      <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-6 lg:gap-8 w-full my-auto">
        {/* Left: Autonomous Constructor Console (Translucent glassmorphism with crisp legibility) */}
        <div className="w-full max-w-lg lg:max-w-xl p-6 md:p-8 rounded-2xl bg-[#080a12]/60 border border-white/15 backdrop-blur-md shadow-[0_20px_60px_rgba(0,0,0,0.85)] pointer-events-auto">
          {/* Pill Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-lime/10 border border-accent-lime/30 text-accent-lime font-mono text-[10px] tracking-widest uppercase mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-lime shadow-[0_0_8px_#ccff00] animate-pulse" />
            <span>AUTONOMOUS CONSTRUCTOR // STAGE 04</span>
          </div>

          {/* Title */}
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight mb-2 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
            Synthesizing Kwesi&apos;s Digital Presence
          </h2>

          {/* Narrative context */}
          <p className="font-sans text-xs sm:text-sm text-zinc-200 leading-relaxed mb-4 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
            Behind the interface is an automated robotic constructor actively compiling my website, assembling code pipelines, and projecting holographic assets of my work in real-time.
          </p>

          {/* Technical Specs Grid */}
          <div className="grid grid-cols-2 gap-2 mb-4 font-mono text-[10px]">
            <div className="p-2.5 rounded-xl bg-black/45 border border-white/10 backdrop-blur-sm">
              <span className="text-zinc-400 uppercase block text-[9px] mb-0.5 font-medium">
                CONSTRUCTOR ACTION
              </span>
              <span className="text-accent-lime font-semibold">
                Autonomous Site Build
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/45 border border-white/10 backdrop-blur-sm">
              <span className="text-zinc-400 uppercase block text-[9px] mb-0.5 font-medium">
                TIMELINE ENGINE
              </span>
              <span className="text-white font-semibold">
                120 FPS All-Intra Seek
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/45 border border-white/10 backdrop-blur-sm">
              <span className="text-zinc-400 uppercase block text-[9px] mb-0.5 font-medium">
                INPUT FILTER
              </span>
              <span className="text-white font-semibold">
                Vertical-Isolated Dampening
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/45 border border-white/10 backdrop-blur-sm">
              <span className="text-zinc-400 uppercase block text-[9px] mb-0.5 font-medium">
                PROJECTION
              </span>
              <span className="text-accent-lime font-semibold">
                Holographic Workstation
              </span>
            </div>
          </div>

          {/* Real-time scrub gauge */}
          <div className="space-y-1.5 font-mono text-[10px] mb-5">
            <div className="flex justify-between text-zinc-300">
              <span className="font-medium">ASSEMBLY PROGRESS:</span>
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
              <span>{isAutoOrbit ? "■ STOP ORBIT" : "▶ AUTO-ORBIT 360°"}</span>
            </button>

            <button
              onClick={() => handleStep(-0.05)}
              className="font-mono text-[10.5px] px-3 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-zinc-200 hover:text-white transition-all cursor-pointer"
              title="Step back 5%"
            >
              &larr; STEP
            </button>

            <button
              onClick={() => handleStep(0.05)}
              className="font-mono text-[10.5px] px-3 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-zinc-200 hover:text-white transition-all cursor-pointer"
              title="Step forward 5%"
            >
              STEP &rarr;
            </button>

            <button
              onClick={handleReset}
              className="font-mono text-[10.5px] px-3 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer ml-auto"
              title="Reset rotation to 0°"
            >
              RESET 0&deg;
            </button>
          </div>
        </div>

        {/* Right: The Creative Concept Panel */}
        <div className="w-full max-w-lg lg:max-w-sm p-6 md:p-7 rounded-2xl bg-[#080a12]/60 border border-white/15 backdrop-blur-md shadow-[0_20px_60px_rgba(0,0,0,0.85)] pointer-events-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-lime/10 border border-accent-lime/30 text-accent-lime font-mono text-[9.5px] tracking-widest uppercase mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-lime shadow-[0_0_8px_#ccff00] animate-pulse" />
            <span>THE CREATIVE CONCEPT</span>
          </div>

          <h3 className="font-display text-lg sm:text-xl font-bold text-white tracking-tight leading-snug mb-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            Building the Builder
          </h3>

          <p className="font-sans text-xs text-zinc-200 leading-relaxed mb-4 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
            Modern web design shouldn&apos;t feel like a static template. Stage 04 reveals the digital workshop where my portfolio itself is engineered and constructed:
          </p>

          <div className="space-y-2.5 font-sans text-xs">
            <div className="p-3 rounded-xl bg-black/45 border border-white/10 backdrop-blur-sm">
              <div className="font-mono text-[9.5px] text-accent-lime font-semibold uppercase tracking-wider mb-0.5">
                01 &bull; THE AUTONOMOUS ARCHITECT
              </div>
              <p className="text-zinc-200 text-[11.5px] leading-relaxed">
                The constructor actively projects my photos, UI components, and system telemetry across background holographic screens in real time.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-black/45 border border-white/10 backdrop-blur-sm">
              <div className="font-mono text-[9.5px] text-accent-lime font-semibold uppercase tracking-wider mb-0.5">
                02 &bull; ZERO-REFLOW ALL-INTRA
              </div>
              <p className="text-zinc-200 text-[11.5px] leading-relaxed">
                All 96 frames of the workstation are encoded as hardware-accelerated All-Intra keyframes, enabling fluid horizontal scrubbing without DOM reflow.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-black/45 border border-white/10 backdrop-blur-sm">
              <div className="font-mono text-[9.5px] text-accent-lime font-semibold uppercase tracking-wider mb-0.5">
                03 &bull; DIRECTIONAL FILTERING
              </div>
              <p className="text-zinc-200 text-[11.5px] leading-relaxed">
                Vertical cursor gestures are isolated from timeline scrub targets, preventing hardware decoder thrashing and guaranteeing stutter-free playback.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Navigation Bar: Clean right-aligned scroll cue without bottom-left descriptions */}
      <div className="relative z-20 flex justify-end items-center w-full font-mono text-[10px] text-zinc-400 pt-6">
        <button
          onClick={handleToFinale}
          className="group cursor-pointer flex items-center gap-2 text-accent-lime/90 hover:text-accent-lime px-4 py-2 rounded-xl border border-accent-lime/30 hover:border-accent-lime bg-accent-lime/[0.06] hover:bg-accent-lime/[0.12] transition-all backdrop-blur-sm shadow-md"
        >
          <span>SCROLL DOWN FOR FINALE</span>
          <span className="text-xs group-hover:translate-y-0.5 transition-transform">
            &darr;
          </span>
        </button>
      </div>

      {/* Seamless bottom fade handoff into Stage 05 */}
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#050508] via-[#050508]/85 to-transparent pointer-events-none z-10" />
    </section>
  );
};
