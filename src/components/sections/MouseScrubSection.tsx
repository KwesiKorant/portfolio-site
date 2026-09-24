"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { playCardHover } from "@/lib/soundEngine";

export const MouseScrubSection: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [duration, setDuration] = useState<number>(0);
  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // Easing values for zero-reflow rAF loop
  const targetTimeRef = useRef<number>(0);
  const displayedTimeRef = useRef<number>(0);
  const rafId = useRef<number | null>(null);
  const isSettled = useRef<boolean>(true);

  // Wait for loadedmetadata before calculating targetTime
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
    };

    if (video.readyState >= 1 && video.duration) {
      handleLoadedMetadata();
    } else {
      video.addEventListener("loadedmetadata", handleLoadedMetadata);
      return () => video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    }
  }, []);

  // Single rAF easing loop
  const easeScrub = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.duration) return;

    const diff = targetTimeRef.current - displayedTimeRef.current;

    // Critically damped frame seek interpolation
    displayedTimeRef.current += diff * 0.16;

    // Write currentTime at most once per rAF frame
    try {
      video.currentTime = displayedTimeRef.current;
    } catch {
      // Ignore rapid seek aborts
    }

    setCurrentProgress(displayedTimeRef.current / video.duration);

    if (Math.abs(diff) > 0.02) {
      rafId.current = requestAnimationFrame(easeScrub);
    } else {
      isSettled.current = true;
    }
  }, []);

  // Mousemove updates targetTime from mouse X
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, mouseX / rect.width));

    targetTimeRef.current = ratio * video.duration;

    if (isSettled.current) {
      isSettled.current = false;
      rafId.current = requestAnimationFrame(easeScrub);
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    playCardHover();
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
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
        /* object-fit: contain option commented: className="absolute inset-0 w-full h-full object-contain pointer-events-none z-0" */
      >
        <source src="/turntable_scrub.mp4" type="video/mp4" />
        <source src="/hero_loop.webm" type="video/webm" />
        <source src="/hero_loop.mp4" type="video/mp4" />
      </video>

      {/* Atmospheric Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-transparent to-[#050508]/70 pointer-events-none z-[1]" />

      {/* Header Info */}
      <div className="relative z-10 flex justify-between items-center w-full">
        <div className="flex items-center gap-2.5 font-mono text-[11px] tracking-widest text-zinc-300">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-lime" />
          <span>STAGE 04 // INTERACTION TURNTABLE</span>
        </div>
        <div className="font-mono text-[10px] text-zinc-400 px-3 py-1 rounded bg-black/60 border border-white/10">
          MOUSE X &rarr; CONTINUOUS VIDEO SEEK
        </div>
      </div>

      {/* HUD Telemetry Overlay */}
      <div className="relative z-10 max-w-md p-6 rounded-2xl bg-[#0c0d14]/90 border border-white/15 backdrop-blur-md shadow-2xl">
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
            <span className="text-accent-lime font-bold">
              {(currentProgress * 100).toFixed(1)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-lime rounded-full transition-none"
              style={{ width: `${(currentProgress * 100).toFixed(1)}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-zinc-500 pt-1">
            <span>0.00s</span>
            <span>{duration ? `${duration.toFixed(2)}s` : "--"}</span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="relative z-10 flex justify-between items-end w-full font-mono text-[10px] text-zinc-400">
        <div>STATE: {isHovered ? "ACTIVE // SCRUBBING" : "IDLE // MOVE MOUSE"}</div>
        <div className="text-accent-lime font-semibold">SCROLL DOWN FOR FINALE &darr;</div>
      </div>
    </section>
  );
};
