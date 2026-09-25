"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";

interface ScrollVideoGateProps {
  onComplete?: () => void;
}

export const ScrollVideoGate: React.FC<ScrollVideoGateProps> = ({ onComplete }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [warpStatus, setWarpStatus] = useState<"idle" | "forward" | "reverse" | "complete">("idle");
  const isWarpingRef = useRef<boolean>(false);
  const reverseRafRef = useRef<number | null>(null);
  const lastScrollYRef = useRef<number>(0);

  // Forward warp sequence: plays full cinematic hyperspace jump and smoothly glides into Stage 03
  const playForwardAndTransition = useCallback(() => {
    const video = videoRef.current;
    if (!video || isWarpingRef.current) return;

    isWarpingRef.current = true;
    setWarpStatus("forward");

    // Align portal cleanly into view
    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    video.currentTime = 0;
    video.playbackRate = 1.15; // Punchy, energetic 3.4s cinematic flight

    video
      .play()
      .then(() => {
        // Video playing at 24fps native speed
      })
      .catch((err) => {
        console.warn("Video playback blocked, seeking manually:", err);
      });

    // At 2.8s (when the tunnel bursts into the deep space starfield & grid), glide view into Stage 03
    setTimeout(() => {
      const spatialEl = document.getElementById("section-spatial");
      if (spatialEl) {
        spatialEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      setWarpStatus("complete");
      if (onComplete) onComplete();

      // Release lock after smooth scroll settles
      setTimeout(() => {
        isWarpingRef.current = false;
      }, 1200);
    }, 2850);
  }, [onComplete]);

  // Reverse warp sequence: plays backwards through the tunnel and automatically glides to Stage 01
  const playReverseAndTransition = useCallback(() => {
    const video = videoRef.current;
    if (!video || isWarpingRef.current) return;

    isWarpingRef.current = true;
    setWarpStatus("reverse");
    video.pause();

    // Align portal cleanly in view
    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    const startVideoTime = video.duration || 4.0;
    const durationMs = 1800;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      // All-Intra H.264 enables 0ms hardware seek in reverse
      video.currentTime = Math.max(0, startVideoTime * (1 - progress));

      if (progress < 1) {
        reverseRafRef.current = requestAnimationFrame(step);
      } else {
        // Reached portrait frame, smoothly send view to Stage 01
        const heroEl = document.getElementById("section-hero");
        if (heroEl) {
          heroEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        setWarpStatus("idle");

        // Release lock after arrival
        setTimeout(() => {
          isWarpingRef.current = false;
        }, 800);
      }
    };

    reverseRafRef.current = requestAnimationFrame(step);
  }, []);

  // IntersectionObserver detects entrance direction and triggers appropriate cinematic flight
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Track scroll direction
    const handleScrollPos = () => {
      lastScrollYRef.current = window.scrollY;
    };
    window.addEventListener("scroll", handleScrollPos, { passive: true });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isWarpingRef.current) {
            // Check if entering from top (scrolling down) or from bottom (scrolling up)
            const currentScrollY = window.scrollY;
            const containerTop = entry.boundingClientRect.top + currentScrollY;

            if (currentScrollY <= containerTop + 80) {
              // User scrolled DOWN into portal from Stage 01
              playForwardAndTransition();
            } else {
              // User scrolled UP into portal from Stage 03
              playReverseAndTransition();
            }
          }
        });
      },
      { threshold: 0.35 }
    );

    observer.observe(container);

    // Direct wheel interaction while looking at Stage 02
    const handleWheelOnPortal = (e: WheelEvent) => {
      const rect = container.getBoundingClientRect();
      // If portal occupies viewport
      if (rect.top <= 100 && rect.bottom >= window.innerHeight - 100) {
        if (e.deltaY > 25 && !isWarpingRef.current) {
          e.preventDefault();
          playForwardAndTransition();
        } else if (e.deltaY < -25 && !isWarpingRef.current) {
          e.preventDefault();
          playReverseAndTransition();
        }
      }
    };
    window.addEventListener("wheel", handleWheelOnPortal, { passive: false });

    return () => {
      window.removeEventListener("scroll", handleScrollPos);
      window.removeEventListener("wheel", handleWheelOnPortal);
      observer.disconnect();
      if (reverseRafRef.current) cancelAnimationFrame(reverseRafRef.current);
    };
  }, [playForwardAndTransition, playReverseAndTransition]);

  return (
    <section
      ref={containerRef}
      id="section-portal"
      className="relative w-full h-[100dvh] flex flex-col justify-between p-6 md:p-12 overflow-hidden bg-[#050508] select-none [contain:layout_style_paint]"
      aria-label="Cinematic Automatic Portal Gate"
    >
      {/* Direct Video Render (All-Intra H.264, Hardware-Accelerated Seeking) */}
      <video
        ref={videoRef}
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
      >
        <source src="/portal_warp.mp4" type="video/mp4" />
      </video>

      {/* Seamless Edge Blends: Top and bottom gradients dissolve into obsidian void */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050508] via-transparent to-[#050508] pointer-events-none z-[1]" />

      {/* Header Info: High-tech telemetry dock in top corners */}
      <div className="relative z-10 flex justify-between items-center w-full pointer-events-none">
        <div className="flex items-center gap-2.5 font-mono text-[11px] tracking-widest text-zinc-300">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-lime shadow-[0_0_8px_#ccff00]" />
          <span>STAGE 02 // PORTAL GATEWAY</span>
        </div>
        <div className="font-mono text-[10px] text-zinc-300 px-3 py-1.5 rounded-full bg-black/60 border border-white/15 backdrop-blur-md">
          {warpStatus === "forward"
            ? "WARP DRIVE: ENGAGED [ACCELERATING TO STAGE 03]"
            : warpStatus === "reverse"
            ? "WARP DRIVE: REVERSING [STAGE 01 RETURN]"
            : warpStatus === "complete"
            ? "WARP COMPLETE [LANDED IN 3D REALM]"
            : "WARP READY // AUTOMATIC TRANSIT"}
        </div>
      </div>

      {/* Subtle Bottom Controls & Status Dock: Leaves center 100% open for cinematic warp immersion */}
      <div
        className={`relative z-10 mx-auto mb-2 flex items-center gap-3 transition-opacity duration-300 ${
          warpStatus === "forward" || warpStatus === "reverse"
            ? "opacity-0 pointer-events-none"
            : "opacity-100"
        }`}
      >
        <button
          onClick={playForwardAndTransition}
          disabled={isWarpingRef.current}
          className="cursor-pointer px-5 py-2.5 rounded-xl bg-accent-lime text-black font-mono font-bold text-xs tracking-wider shadow-[0_0_24px_rgba(204,255,0,0.35)] hover:bg-[#b5e600] active:scale-95 transition-all disabled:opacity-50"
        >
          WARP TO SPATIAL DECK &darr;
        </button>
        <button
          onClick={playReverseAndTransition}
          disabled={isWarpingRef.current}
          className="cursor-pointer px-4 py-2.5 rounded-xl bg-black/60 hover:bg-white/[0.1] border border-white/15 text-zinc-300 font-mono text-xs tracking-wider backdrop-blur-md active:scale-95 transition-all disabled:opacity-50"
        >
          &uarr; RETURN TO PORTRAIT
        </button>
      </div>

      {/* Footer Info */}
      <div className="relative z-10 flex justify-between items-end w-full font-mono text-[10px] text-zinc-400 pointer-events-none">
        <div>KINETICS: 24 FPS ALL-INTRA RUNTIME</div>
        <div className="text-zinc-500">SEAMLESS HYPERSPACE TRANSIT</div>
      </div>
    </section>
  );
};
