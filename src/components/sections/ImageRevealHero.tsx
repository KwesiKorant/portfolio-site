"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";

interface ImageRevealHeroProps {
  onScrollNext?: () => void;
  onEnterPortal?: () => void;
  onWarmupPortal?: () => void;
  onSelectProject?: (projectId: string) => void;
}

export const ImageRevealHero: React.FC<ImageRevealHeroProps> = ({
  onScrollNext,
  onEnterPortal,
  onWarmupPortal,
  onSelectProject,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const frontImageRef = useRef<HTMLDivElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [hasCustomAssets, setHasCustomAssets] = useState(true);

  // Mouse coordinate refs for zero-reflow rAF throttle
  const targetX = useRef<number>(0);
  const targetY = useRef<number>(0);
  const currentX = useRef<number>(0);
  const currentY = useRef<number>(0);
  const rafId = useRef<number | null>(null);
  const isMoving = useRef<boolean>(false);
  const cachedRect = useRef<{ left: number; top: number; width: number; height: number } | null>(null);

  // Touch coordinates for mobile lens reveal and swipe-up navigation
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchLeaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Cache container bounds on mount and window resize (Zero layout thrashing)
  const updateCachedBounds = useCallback(() => {
    if (containerRef.current) {
      const r = containerRef.current.getBoundingClientRect();
      cachedRect.current = { left: r.left, top: r.top, width: r.width, height: r.height };
    }
  }, []);

  useEffect(() => {
    updateCachedBounds();
    window.addEventListener("resize", updateCachedBounds, { passive: true });
    return () => window.removeEventListener("resize", updateCachedBounds);
  }, [updateCachedBounds]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (touchLeaveTimer.current) clearTimeout(touchLeaveTimer.current);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  // Update CSS variables --reveal-x and --reveal-y inside single rAF loop
  const updateMask = useCallback(() => {
    const frontEl = frontImageRef.current;
    if (!frontEl) return;

    // Critically damped spring-like lerp for silky smooth cursor tracking
    const dx = targetX.current - currentX.current;
    const dy = targetY.current - currentY.current;

    currentX.current += dx * 0.28;
    currentY.current += dy * 0.28;

    frontEl.style.setProperty("--reveal-x", `${currentX.current.toFixed(1)}px`);
    frontEl.style.setProperty("--reveal-y", `${currentY.current.toFixed(1)}px`);

    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
      rafId.current = requestAnimationFrame(updateMask);
    } else {
      isMoving.current = false;
    }
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return; // Touch handled cleanly by handleTouchMove
    if (!cachedRect.current) {
      updateCachedBounds();
    }
    const rect = cachedRect.current;
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    targetX.current = x;
    targetY.current = y;

    // If first entry or not hovered yet, snap instantly to cursor position to eliminate any initial drag lag
    if (!isHovered) {
      setIsHovered(true);
      currentX.current = x;
      currentY.current = y;
      if (frontImageRef.current) {
        frontImageRef.current.style.setProperty("--reveal-x", `${x.toFixed(1)}px`);
        frontImageRef.current.style.setProperty("--reveal-y", `${y.toFixed(1)}px`);
      }
    }

    if (!isMoving.current) {
      isMoving.current = true;
      rafId.current = requestAnimationFrame(updateMask);
    }
  };

  const handlePointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    updateCachedBounds();
    const rect = cachedRect.current;
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      targetX.current = x;
      targetY.current = y;
      currentX.current = x;
      currentY.current = y;
      if (frontImageRef.current) {
        frontImageRef.current.style.setProperty("--reveal-x", `${x.toFixed(1)}px`);
        frontImageRef.current.style.setProperty("--reveal-y", `${y.toFixed(1)}px`);
      }
    }
    setIsHovered(true);
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return; // Touch handled cleanly by handleTouchEnd
    setIsHovered(false);
    if (rafId.current) cancelAnimationFrame(rafId.current);
    isMoving.current = false;
  };

  // Dedicated Mobile Touch Handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      if (touchLeaveTimer.current) clearTimeout(touchLeaveTimer.current);
      touchStartY.current = e.touches[0].clientY;
      touchStartX.current = e.touches[0].clientX;

      if (!cachedRect.current) {
        updateCachedBounds();
      }
      const rect = cachedRect.current;
      if (rect) {
        const x = e.touches[0].clientX - rect.left;
        const y = e.touches[0].clientY - rect.top;
        targetX.current = x;
        targetY.current = y;
        currentX.current = x;
        currentY.current = y;
        setIsHovered(true);
        if (frontImageRef.current) {
          frontImageRef.current.style.setProperty("--reveal-x", `${x.toFixed(1)}px`);
          frontImageRef.current.style.setProperty("--reveal-y", `${y.toFixed(1)}px`);
        }
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      const rect = cachedRect.current;
      if (!rect) return;
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;
      targetX.current = x;
      targetY.current = y;
      if (!isMoving.current) {
        isMoving.current = true;
        rafId.current = requestAnimationFrame(updateMask);
      }
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
    touchStartX.current = null;

    // Smoothly hold lens for 1.2s after touch release before returning to idle
    if (touchLeaveTimer.current) clearTimeout(touchLeaveTimer.current);
    touchLeaveTimer.current = setTimeout(() => {
      setIsHovered(false);
      if (rafId.current) cancelAnimationFrame(rafId.current);
      isMoving.current = false;
    }, 1200);
  };

  return (
    <section
      ref={containerRef}
      id="section-hero"
      className="relative w-full h-[100dvh] max-h-[100dvh] flex flex-col justify-between p-3 xs:p-4 sm:p-8 md:p-12 overflow-hidden bg-[#050508] select-none [contain:layout_style_paint]"
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label="Image Reveal Hero"
    >
      {/* Visual Asset Stack: bottom = REVEAL, top = FRONT */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 w-full h-full overflow-hidden [mask-image:linear-gradient(to_bottom,black_65%,transparent_98%)] sm:[mask-image:none]">
          {/* REVEAL LAYER (Underneath: Cybernetic / Digital Twin) */}
          <div className="absolute inset-0 w-full h-full overflow-hidden">
            {hasCustomAssets ? (
              <picture className="w-full h-full block">
                <source
                  media="(max-width: 640px)"
                  srcSet="/hero-reveal-mobile.webp"
                  type="image/webp"
                />
                <source
                  media="(max-width: 640px)"
                  srcSet="/hero-reveal-mobile.jpg"
                  type="image/jpeg"
                />
                <source srcSet="/hero-reveal.webp" type="image/webp" />
                <img
                  src="/hero-reveal.jpg"
                  alt="Kwesi Digital Twin"
                  className="w-full h-full object-cover object-[50%_12%] sm:object-center"
                  loading="eager"
                  decoding="async"
                />
              </picture>
            ) : (
              /* High-Craft Procedural Fallback */
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#06b6d4]/20 via-[#050508] to-[#ccff00]/15 relative">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ccff00_1px,transparent_1px)] [background-size:24px_24px]" />
                <div className="text-center font-mono text-xs text-accent-lime/60 tracking-widest uppercase">
                  [REVEAL LAYER // DIGITAL SCHEMATIC & TELEMETRY ACTIVATED]
                </div>
              </div>
            )}
          </div>

          {/* FRONT LAYER (Top: Editorial Photography with CSS Radial Gradient Mask) */}
          <div
            ref={frontImageRef}
            className={`absolute inset-0 w-full h-full overflow-hidden transition-[mask-size,opacity] duration-300 ${
              isHovered ? "mask-active" : "mask-idle"
            }`}
            style={{
              /* Responsive radial mask: clamp(180px, 48vw, 280px) ensures mobile screens have a focused x-ray circle while desktop preserves the exact 280px radius */
              WebkitMaskImage: isHovered
                ? "radial-gradient(circle clamp(180px, 46vw, 280px) at var(--reveal-x, 50%) var(--reveal-y, 50%), transparent 0%, transparent 45%, rgba(0,0,0,0.8) 75%, black 100%)"
                : "none",
              maskImage: isHovered
                ? "radial-gradient(circle clamp(180px, 46vw, 280px) at var(--reveal-x, 50%) var(--reveal-y, 50%), transparent 0%, transparent 45%, rgba(0,0,0,0.8) 75%, black 100%)"
                : "none",
            }}
          >
            {hasCustomAssets ? (
              <picture className="w-full h-full block">
                <source
                  media="(max-width: 640px)"
                  srcSet="/hero-front-mobile.webp"
                  type="image/webp"
                />
                <source
                  media="(max-width: 640px)"
                  srcSet="/hero-front-mobile.jpg"
                  type="image/jpeg"
                />
                <source srcSet="/hero-front.webp" type="image/webp" />
                <img
                  src="/hero-front.jpg"
                  alt="Kwesi Portrait"
                  className="w-full h-full object-cover object-[50%_12%] sm:object-center"
                  loading="eager"
                  decoding="async"
                />
              </picture>
            ) : (
              /* High-Craft Editorial Portrait Fallback */
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#12131c] via-[#090a0f] to-[#050508]">
              <div className="max-w-2xl px-6 text-center">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.05] border border-white/12 text-zinc-300 font-mono text-[11px] mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-lime animate-pulse" />
                  <span>INTERACTIVE X-RAY LENS &bull; MOVE CURSOR TO REVEAL</span>
                </div>
                <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white mb-4">
                  KWESI ANKOMAH-KORANTENG
                </h1>
                <p className="font-sans text-base md:text-xl text-zinc-300 max-w-xl mx-auto leading-relaxed">
                  Design Engineer &amp; Creative Technologist crafting tactile, hardware-accelerated web experiences and resilient product systems.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Atmospheric Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-transparent to-[#050508]/60 pointer-events-none z-[1]" />

      {/* MOBILE VIEW (< lg): Unobstructed Portrait Chamber + Structured Editorial Canvas Docked to Bottom */}
      <div className="flex lg:hidden flex-col justify-between w-full h-full relative z-20 pointer-events-none">
        {/* Top Header Row: Floating Identity & Interactive X-Ray Cue */}
        <div className="w-full flex items-center justify-between pt-1 px-1 pointer-events-auto shrink-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#080a12]/70 border border-accent-lime/30 font-mono text-[8px] xs:text-[8.5px] text-accent-lime font-semibold shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-lime shadow-[0_0_6px_#ccff00] animate-pulse" />
            <span>DESIGN ENGINEER // CTO</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#080a12]/70 border border-white/15 font-mono text-[8px] xs:text-[8.5px] text-zinc-300 shadow-sm">
            <span className="w-1 h-1 rounded-full bg-accent-cyan" />
            <span>TOUCH &amp; DRAG TO SCAN</span>
          </div>
        </div>

        {/* Upper Portrait Chamber: Holds the vertical viewport clear so the portrait head and face are completely unobstructed on mobile & tablet */}
        <div className="w-full h-[53.5dvh] sm:h-[53dvh] md:h-[54dvh] pointer-events-none shrink-0" />

        {/* Middle Text & Invitation: Elegant, scannable editorial block */}
        <div className="w-full max-w-sm xs:max-w-md sm:max-w-xl flex flex-col justify-start space-y-2 xs:space-y-2.5 sm:space-y-3.5 items-start text-left pointer-events-auto relative z-20 px-1 shrink-0">
          {/* Identity & Thesis Block */}
          <div className="w-full space-y-1 sm:space-y-1.5">
            <div className="flex items-center gap-2 font-mono text-[8.5px] xs:text-[9.5px] sm:text-[11px]">
              <span className="text-accent-lime font-bold tracking-wider uppercase">ARCHITECT // CTO</span>
              <span className="text-zinc-600">&bull;</span>
              <span className="text-zinc-300 font-mono tracking-wide">ARCFIELD SYSTEMS</span>
            </div>

            {/* Enlarged Name - Prominent Editorial Display */}
            <h1 className="font-display text-[26px] xs:text-[30px] sm:text-[40px] font-black tracking-tight text-white leading-[1.02] drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)] text-left">
              KWESI ANKOMAH-KORANTENG
            </h1>

            {/* Punchy Thesis */}
            <p className="font-sans text-[11px] xs:text-[12.5px] sm:text-[14.5px] text-zinc-300 leading-snug sm:leading-relaxed max-w-sm sm:max-w-lg text-left drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
              Crafting tactile digital craft, hardware-accelerated compositor architecture, and resilient enterprise software.
            </p>
          </div>

          {/* Curated Architecture Cue: Inviting, high-contrast, uncluttered */}
          <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[8.5px] xs:text-[9.5px] sm:text-[11px] text-zinc-300">
            <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-white/[0.06] border border-white/15 text-zinc-200 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-lime animate-pulse" />
              <span>6 SHIPPED SYSTEMS</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-white/[0.06] border border-white/15 text-zinc-300 shadow-sm">
              <span>120 FPS ZERO REFLOW</span>
            </span>
            <span className="text-zinc-500 hidden sm:inline">&bull;</span>
            <span className="text-zinc-400 hidden sm:inline font-mono">ACCRA // GLOBAL REMOTE</span>
          </div>
        </div>

        {/* Bottom Bar: Touch Target Compliant (min-h-[46px]) */}
        <div className="w-full flex items-center justify-between pt-3 pb-1 xs:pb-2 border-t border-white/10 font-mono text-[9px] xs:text-[9.5px] sm:text-[11px] text-zinc-300 pointer-events-auto mt-auto shrink-0">
          <span className="text-zinc-400 font-mono tracking-wide">ACCRA // GLOBAL REMOTE</span>
          <button
            onPointerEnter={onWarmupPortal}
            onTouchStart={onWarmupPortal}
            onClick={() => {
              if (onEnterPortal) {
                onEnterPortal();
              } else if (onScrollNext) {
                onScrollNext();
              } else {
                const el = document.getElementById("section-spatial");
                el?.scrollIntoView({ behavior: "smooth" });
              }
            }}
            className="group cursor-pointer flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 min-h-[46px] rounded-xl bg-[#080a12] hover:bg-[#0c0e18] border border-white/15 hover:border-accent-lime/50 text-zinc-200 hover:text-white font-medium shadow-md transition-all active:scale-95"
            aria-label="Scroll to Portal Section"
          >
            <span>ENTER PORTAL GATE</span>
            <span className="text-accent-lime text-xs sm:text-sm group-hover:translate-y-0.5 transition-transform">&darr;</span>
          </button>
        </div>
      </div>

      {/* DESKTOP VIEW (>= lg): Canonical Editorial Hero */}
      <div className="hidden lg:flex flex-col justify-between w-full h-full relative z-20 pointer-events-none">
        {/* Middle Text: Elegant, scannable editorial block vertically centered */}
        <div className="my-auto w-full max-w-2xl lg:max-w-3xl flex flex-col justify-center space-y-3 lg:space-y-4 items-start text-left pointer-events-auto relative z-20">
          {/* Identity & Company Tag */}
          <div className="flex items-center gap-2.5 font-mono text-xs lg:text-[13px] text-zinc-300">
            <span className="text-accent-lime font-bold tracking-wider uppercase">DESIGN ENGINEER // CREATIVE TECHNOLOGIST</span>
            <span className="text-zinc-600">&bull;</span>
            <span className="text-zinc-300 font-mono tracking-wide">ARCFIELD SYSTEMS</span>
          </div>

          {/* Captivating Bold Header */}
          <h1 className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-[76px] font-black tracking-tight text-white leading-[0.94] drop-shadow-[0_4px_36px_rgba(0,0,0,0.95)] break-words">
            KWESI ANKOMAH-KORANTENG
          </h1>

          {/* Punchy Thesis */}
          <p className="font-sans text-base sm:text-lg md:text-xl text-zinc-200 font-medium leading-relaxed max-w-2xl drop-shadow-[0_2px_16px_rgba(0,0,0,0.95)]">
            Crafting tactile digital craft, hardware-accelerated compositor architecture, and resilient enterprise software.
          </p>

          {/* Curated Architecture Cues */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 font-mono text-xs text-zinc-300">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white/[0.06] border border-white/15 text-zinc-200 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-lime animate-pulse" />
              <span>6 SHIPPED SYSTEMS</span>
            </span>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white/[0.06] border border-white/15 text-zinc-300 shadow-sm">
              <span>120 FPS ZERO REFLOW</span>
            </span>
            <span className="text-zinc-500">&bull;</span>
            <span className="text-zinc-400 font-mono">ACCRA // GLOBAL REMOTE</span>
          </div>
        </div>

        {/* Bottom Bar: Downward Scroll Cue */}
        <div className="w-full flex items-center justify-end pt-4 font-mono text-xs text-zinc-300 pointer-events-auto shrink-0">
          <button
            onPointerEnter={onWarmupPortal}
            onFocus={onWarmupPortal}
            onClick={() => {
              if (onEnterPortal) {
                onEnterPortal();
              } else if (onScrollNext) {
                onScrollNext();
              } else {
                const el = document.getElementById("section-spatial");
                el?.scrollIntoView({ behavior: "smooth" });
              }
            }}
            className="group cursor-pointer flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-[#080a12] hover:bg-[#0c0e18] border border-white/15 hover:border-accent-lime/50 text-zinc-200 hover:text-white font-medium shadow-md transition-all active:scale-95"
            aria-label="Scroll to Portal Section"
          >
            <span className="font-mono text-xs tracking-wider">
              ENTER PORTAL GATE
            </span>
            <span className="text-accent-lime text-sm group-hover:translate-y-0.5 transition-transform">
              &darr;
            </span>
          </button>
        </div>
      </div>

      {/* Seamless bottom fade handoff into Stage 02 (Desktop only - mobile console is docked) */}
      <div className="hidden lg:block absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#050508] to-transparent pointer-events-none z-10" />
    </section>
  );
};
