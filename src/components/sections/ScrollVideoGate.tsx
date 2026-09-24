"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { playSurgePulse, playKeyClick } from "@/lib/soundEngine";

interface ScrollVideoGateProps {
  onComplete?: () => void;
}

export const ScrollVideoGate: React.FC<ScrollVideoGateProps> = ({ onComplete }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Play video to completion on single downward gesture
  const triggerPlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video || isPlaying || isCompleted) return;

    setIsPlaying(true);
    setHasStarted(true);
    playSurgePulse();

    video
      .play()
      .then(() => {
        // Video is playing
      })
      .catch((err) => {
        console.warn("Video playback interrupted or blocked:", err);
        setIsPlaying(false);
      });
  }, [isPlaying, isCompleted]);

  // Handle video ended
  const handleEnded = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.pause();
    }
    setIsPlaying(false);
    setIsCompleted(true);

    if (onComplete) {
      onComplete();
    }
  }, [onComplete]);

  // Intercept scroll/wheel gestures when gate is in view
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Downward gesture triggers playback
      if (e.deltaY > 15 && !hasStarted && !isCompleted) {
        e.preventDefault();
        triggerPlayback();
      } else if (isPlaying) {
        // Lock input while playing
        e.preventDefault();
      }
    };

    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const deltaY = touchStartY - e.touches[0].clientY;
      if (deltaY > 20 && !hasStarted && !isCompleted) {
        e.preventDefault();
        triggerPlayback();
      } else if (isPlaying) {
        e.preventDefault();
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
    };
  }, [hasStarted, isPlaying, isCompleted, triggerPlayback]);

  const handleContinue = () => {
    playKeyClick();
    const spatialEl = document.getElementById("section-spatial");
    spatialEl?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      ref={containerRef}
      id="section-portal"
      className="relative w-full h-[100dvh] flex flex-col justify-between p-6 md:p-12 overflow-hidden bg-[#050508] select-none [contain:layout_style_paint]"
      aria-label="Scroll-Triggered Video Section"
    >
      {/* Direct Video Render */}
      <video
        ref={videoRef}
        muted
        playsInline
        preload="auto"
        onEnded={handleEnded}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
        /* object-fit: contain option commented: className="absolute inset-0 w-full h-full object-contain pointer-events-none z-0" */
      >
        <source src="/portal_warp.mp4" type="video/mp4" />
        <source src="/hero_loop.webm" type="video/webm" />
        <source src="/hero_loop.mp4" type="video/mp4" />
      </video>

      {/* Dark gradient overlay to blend video with obsidian background */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-transparent to-[#050508]/80 pointer-events-none z-[1]" />

      {/* Header Info */}
      <div className="relative z-10 flex justify-between items-center w-full">
        <div className="flex items-center gap-2.5 font-mono text-[11px] tracking-widest text-zinc-300">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-lime" />
          <span>STAGE 02 // PORTAL GATE</span>
        </div>
        <div className="font-mono text-[10px] text-zinc-400 px-3 py-1 rounded bg-black/60 border border-white/10">
          {isPlaying
            ? "WARP SEQUENCE IN PROGRESS [LOCKED]"
            : isCompleted
            ? "WARP COMPLETE [FROZEN ON FINAL FRAME]"
            : "ARMED &bull; SCROLL DOWN TO WARP"}
        </div>
      </div>

      {/* Center Callout if not started */}
      {!hasStarted && (
        <div className="relative z-10 m-auto text-center max-w-lg p-6 rounded-2xl bg-black/75 border border-white/15 backdrop-blur-md shadow-2xl">
          <div className="font-mono text-[10px] text-accent-lime tracking-widest uppercase mb-2">
            SINGLE-GESTURE GATEWAY
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-3">
            Enter the Spatial Dimension
          </h2>
          <p className="font-sans text-xs text-zinc-300 mb-5 leading-relaxed">
            A single downward scroll gesture initiates the dimensional warp sequence. Playback runs unskippable to the final frame.
          </p>
          <button
            onClick={triggerPlayback}
            className="cursor-pointer px-5 py-2.5 rounded-xl bg-accent-lime text-black font-mono font-bold text-xs tracking-wider shadow-[0_0_20px_rgba(204,255,0,0.3)] hover:bg-[#b5e600] transition-all"
          >
            TRIGGER WARP NOW
          </button>
        </div>
      )}

      {/* Footer Controls */}
      <div className="relative z-10 flex justify-between items-end w-full">
        <div className="font-mono text-[10px] text-zinc-400">
          STATUS: {isCompleted ? "SYNCHRONIZED" : isPlaying ? "STREAMING" : "IDLE"}
        </div>

        {isCompleted && (
          <button
            onClick={handleContinue}
            className="cursor-pointer flex items-center gap-3 px-5 py-3 rounded-xl bg-accent-lime text-black font-mono font-bold text-xs tracking-wider shadow-[0_0_25px_rgba(204,255,0,0.35)] hover:bg-[#b5e600] transition-all"
          >
            <span>PROCEED INTO SPATIAL DECK</span>
            <span>&darr;</span>
          </button>
        )}
      </div>
    </section>
  );
};
