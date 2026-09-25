"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";

export const MouseScrubSection: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const progressTextRef = useRef<HTMLSpanElement | null>(null);
  const durationTextRef = useRef<HTMLSpanElement | null>(null);
  const stateLabelRef = useRef<HTMLDivElement | null>(null);

  const [duration, setDuration] = useState<number>(0);
  const cachedBounds = useRef<{ left: number; width: number } | null>(null);
  const lastClientX = useRef<number>(-999);

  // Easing values for zero-reflow rAF loop
  const targetTimeRef = useRef<number>(0);
  const displayedTimeRef = useRef<number>(0);
  const rafId = useRef<number | null>(null);
  const isSettled = useRef<boolean>(true);

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
      return () => video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    }
  }, []);

  // Cancel rAF loop on unmount
  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  // Single rAF easing loop (Direct DOM mutations, zero React state re-renders)
  const easeScrub = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.duration) {
      isSettled.current = true;
      return;
    }

    const diff = targetTimeRef.current - displayedTimeRef.current;
    const absDiff = Math.abs(diff);

    // If difference is sub-millisecond, snap to exact target and settle
    if (absDiff < 0.0005) {
      displayedTimeRef.current = targetTimeRef.current;
      isSettled.current = true;
    } else {
      // Responsive, critically damped easing:
      // 0.32 provides immediate, tactile tracking while smoothing pointer jitter
      displayedTimeRef.current += diff * 0.32;
      rafId.current = requestAnimationFrame(easeScrub);
    }

    // Direct hardware seek to currentTime
    try {
      video.currentTime = displayedTimeRef.current;
    } catch {
      // Ignore rapid seek aborts
    }

    // Update progress bar via compositor-only transform scaleX
    const progressRatio = Math.max(0, Math.min(1, displayedTimeRef.current / video.duration));
    if (progressBarRef.current) {
      progressBarRef.current.style.transform = `scaleX(${progressRatio.toFixed(4)})`;
    }
    if (progressTextRef.current) {
      progressTextRef.current.textContent = `${(progressRatio * 100).toFixed(1)}%`;
    }
  }, []);

  // Mousemove updates targetTime continuously with zero deadband drops (fluid at all angles and speeds)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;

    if (!cachedBounds.current) {
      updateCachedBounds();
    }
    const bounds = cachedBounds.current;
    if (!bounds || bounds.width <= 0) return;

    const mouseX = e.clientX - bounds.left;
    const ratio = Math.max(0, Math.min(1, mouseX / bounds.width));
    const newTarget = ratio * video.duration;

    // Only skip if mouse X has not moved at all
    if (Math.abs(newTarget - targetTimeRef.current) < 0.0001) return;

    targetTimeRef.current = newTarget;

    if (isSettled.current) {
      isSettled.current = false;
      rafId.current = requestAnimationFrame(easeScrub);
    }
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    updateCachedBounds();
    lastClientX.current = e.clientX;
    if (stateLabelRef.current) {
      stateLabelRef.current.textContent = "STATE: ACTIVE // SCRUBBING";
    }
  };

  const handleMouseLeave = () => {
    if (stateLabelRef.current) {
      stateLabelRef.current.textContent = "STATE: IDLE // MOVE MOUSE";
    }
  };

  return (
    <section
      ref={containerRef}
      id="section-scrub"
      className="relative w-full h-[100dvh] flex flex-col justify-between p-6 md:p-12 overflow-hidden bg-[#050508] select-none [contain:layout_style_paint]"
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label="Mouse-Controlled Video Scrub"
    >
      {/* Video Element: Always Paused, Seek Only */}
      <video
        ref={videoRef}
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
      >
        <source src="/turntable_scrub.mp4" type="video/mp4" />
      </video>

      {/* Atmospheric Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-transparent to-[#050508]/70 pointer-events-none z-[1]" />

      {/* Header Info */}
      <div className="relative z-10 flex justify-between items-center w-full pointer-events-none">
        <div className="flex items-center gap-2.5 font-mono text-[11px] tracking-widest text-zinc-300">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-lime" />
          <span>STAGE 04 // INTERACTION TURNTABLE</span>
        </div>
        <div className="font-mono text-[10px] text-zinc-400 px-3 py-1 rounded bg-black/60 border border-white/10">
          MOUSE X &rarr; CONTINUOUS VIDEO SEEK
        </div>
      </div>

      {/* HUD Telemetry Overlay (pointer-events-none so cursor moves across it without hit-test churn) */}
      <div className="relative z-10 max-w-md p-6 rounded-2xl bg-[#0c0d14]/90 border border-white/15 backdrop-blur-md shadow-2xl pointer-events-none">
        <div className="font-mono text-[10px] text-accent-lime tracking-widest uppercase mb-1 font-semibold">
          04 &bull; KINETIC FRAME SCRUB
        </div>
        <h3 className="font-display text-xl font-bold text-white mb-2">
          Hardware-Accelerated Frame Interpolation
        </h3>
        <p className="font-sans text-xs text-zinc-300 leading-relaxed mb-4">
          Move your cursor horizontally across the screen to scrub the encoded artifact. Updates are smoothed with critically damped spring interpolation inside a single requestAnimationFrame loop.
        </p>

        {/* Real-time scrub gauge */}
        <div className="space-y-1.5 font-mono text-[10px]">
          <div className="flex justify-between text-zinc-400">
            <span>SEEK PROGRESS:</span>
            <span ref={progressTextRef} className="text-accent-lime font-bold">
              0.0%
            </span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              ref={progressBarRef}
              className="h-full w-full bg-accent-lime rounded-full origin-left will-change-transform"
              style={{ transform: "scaleX(0)" }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-zinc-500 pt-1">
            <span>0.00s</span>
            <span ref={durationTextRef}>{duration ? `${duration.toFixed(2)}s` : "4.00s"}</span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="relative z-20 flex justify-between items-end w-full font-mono text-[10px] text-zinc-400 pointer-events-none">
        <div ref={stateLabelRef}>STATE: IDLE // MOVE MOUSE</div>
        <div className="text-accent-lime font-semibold">SCROLL DOWN FOR FINALE &darr;</div>
      </div>

      {/* Seamless bottom fade handoff into Stage 05 */}
      <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-[#050508] via-[#050508]/85 to-transparent pointer-events-none z-10" />
    </section>
  );
};
