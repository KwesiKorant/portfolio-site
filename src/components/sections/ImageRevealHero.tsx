"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";

interface ImageRevealHeroProps {
  onScrollNext?: () => void;
  onEnterPortal?: () => void;
  onSelectProject?: (projectId: string) => void;
}

export const ImageRevealHero: React.FC<ImageRevealHeroProps> = ({
  onScrollNext,
  onEnterPortal,
  onSelectProject,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const frontImageRef = useRef<HTMLDivElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [hasCustomAssets, setHasCustomAssets] = useState(true);

  const wheelAccumulator = useRef(0);
  const wheelResetTimer = useRef<NodeJS.Timeout | null>(null);

  // Wheel listener to trigger seamless portal gateway on downward scroll from Stage 01
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const heroEl = document.getElementById("section-hero");
      if (!heroEl) return;
      const rect = heroEl.getBoundingClientRect();
      const isHeroActive =
        rect.top >= -50 && rect.bottom >= window.innerHeight * 0.5;

      if (isHeroActive && e.deltaY > 0) {
        e.preventDefault();
        wheelAccumulator.current += e.deltaY;
        if (wheelResetTimer.current) clearTimeout(wheelResetTimer.current);
        wheelResetTimer.current = setTimeout(() => {
          wheelAccumulator.current = 0;
        }, 300);

        if (wheelAccumulator.current > 15) {
          wheelAccumulator.current = 0;
          if (onEnterPortal) {
            onEnterPortal();
          } else if (onScrollNext) {
            onScrollNext();
          }
        }
      }
    };
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", handleWheel);
      if (wheelResetTimer.current) clearTimeout(wheelResetTimer.current);
    };
  }, [onEnterPortal, onScrollNext]);

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

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartY.current !== null && e.changedTouches.length === 1) {
      const deltaY = touchStartY.current - e.changedTouches[0].clientY;
      const deltaX = Math.abs((touchStartX.current || 0) - e.changedTouches[0].clientX);
      // Intentional swipe up on hero triggers cinematic portal warp into Stage 03
      if (deltaY > 60 && deltaY > deltaX * 1.2) {
        if (onEnterPortal) {
          onEnterPortal();
        } else if (onScrollNext) {
          onScrollNext();
        }
      }
    }
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
        {/* REVEAL LAYER (Underneath: Cybernetic / Digital Twin) */}
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          {hasCustomAssets ? (
            <picture className="w-full h-full block">
              <source srcSet="/hero-reveal.webp" type="image/webp" />
              <img
                src="/hero-reveal.jpg"
                alt="Kwesi Digital Twin"
                className="w-full h-full object-cover object-[50%_16%] lg:object-center"
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
              <source srcSet="/hero-front.webp" type="image/webp" />
              <img
                src="/hero-front.jpg"
                alt="Kwesi Portrait"
                className="w-full h-full object-cover object-[50%_16%] lg:object-center"
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

      {/* Atmospheric Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-transparent to-[#050508]/60 pointer-events-none z-[1]" />

      {/* MOBILE VIEW (< lg): Unobstructed Portrait Chamber + Docked Editorial Console */}
      <div className="flex lg:hidden flex-col justify-between items-center flex-1 w-full min-h-0 pt-1 pb-1 relative z-20 pointer-events-none">
        {/* Top Chamber: Clean, unobstructed x-ray reveal area with floating prompt */}
        <div className="relative flex-1 w-full flex flex-col justify-start items-center pt-2 min-h-0 pointer-events-none">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#080a12] border border-white/15 font-mono text-[8.5px] text-zinc-300 shadow-[0_4px_16px_rgba(0,0,0,0.6)] pointer-events-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-lime shadow-[0_0_8px_#ccff00] animate-pulse" />
            <span>TOUCH &amp; DRAG TO SCAN // X-RAY LENS</span>
          </div>
        </div>

        {/* Lower Console: Docked Editorial Telemetry Sheet */}
        <div className="w-full max-w-sm rounded-2xl bg-[#080a12] border border-white/15 p-3 xs:p-3.5 mb-0.5 sm:mb-2 flex flex-col pointer-events-auto relative z-20 shrink-0 shadow-[0_15px_45px_rgba(0,0,0,0.85)]">
          {/* Header row: Role tag + 120 FPS spec */}
          <div className="flex items-center justify-between gap-2 mb-1.5 font-mono text-[8px] xs:text-[8.5px]">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent-lime/10 border border-accent-lime/30 text-accent-lime font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-lime shadow-[0_0_6px_#ccff00] animate-pulse" />
              <span>DESIGN ENGINEER // CTO</span>
            </div>
            <span className="text-zinc-400 px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/10 font-medium">
              120 FPS ENGINE
            </span>
          </div>

          {/* Name */}
          <h1 className="font-display text-[17px] xs:text-[19px] font-black tracking-tight text-white leading-tight mb-1">
            KWESI ANKOMAH-KORANTENG
          </h1>

          {/* Subtitle */}
          <p className="font-sans text-[9.5px] xs:text-[10px] text-zinc-200 leading-snug line-clamp-2 mb-2">
            Bridging tactile digital craft, 120 FPS compositor architecture, and scalable product engineering.
          </p>

          {/* Venture Highlights Strip */}
          <div className="grid grid-cols-3 gap-1 mb-2 font-mono text-[7.5px]">
            <div
              onClick={() => onSelectProject && onSelectProject("hyperscale")}
              className="p-1.5 rounded-lg bg-black/50 border border-white/10 cursor-pointer active:scale-95 transition-all"
              title="Inspect Arcfield Discover in 3D Dimension"
            >
              <div className="text-accent-lime font-semibold uppercase text-[6.5px] truncate">01 • CTO MVP</div>
              <div className="text-white font-sans font-medium text-[8px] truncate">Arcfield Discover</div>
            </div>
            <div
              onClick={() => onSelectProject && onSelectProject("edge-gateway")}
              className="p-1.5 rounded-lg bg-black/50 border border-white/10 cursor-pointer active:scale-95 transition-all"
              title="Inspect Nayak Furniture ERP"
            >
              <div className="text-accent-lime font-semibold uppercase text-[6.5px] truncate">02 • ENTERPRISE</div>
              <div className="text-white font-sans font-medium text-[8px] truncate">Nayak POS ERP</div>
            </div>
            <div
              onClick={() => onSelectProject && onSelectProject("event-stream")}
              className="p-1.5 rounded-lg bg-black/50 border border-white/10 cursor-pointer active:scale-95 transition-all"
              title="Inspect 120 FPS Compositor Architecture"
            >
              <div className="text-accent-lime font-semibold uppercase text-[6.5px] truncate">03 • FLAGSHIP</div>
              <div className="text-white font-sans font-medium text-[8px] truncate">120 FPS Engine</div>
            </div>
          </div>

          {/* Bottom Action & CTA Row */}
          <div className="flex items-center justify-between pt-1.5 border-t border-white/10 font-mono text-[8.5px]">
            <span className="text-zinc-400">STAGE 01 OF 05</span>
            <button
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
              className="group cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-lime/15 hover:bg-accent-lime/25 border border-accent-lime/40 text-accent-lime font-bold shadow-[0_0_12px_rgba(204,255,0,0.2)] transition-all active:scale-95"
              aria-label="Scroll to Portal Section"
            >
              <span>ENTER PORTAL GATE</span>
              <span className="text-xs group-hover:translate-y-0.5 transition-transform">&darr;</span>
            </button>
          </div>
        </div>
      </div>

      {/* DESKTOP VIEW (>= lg): Canonical Editorial Hero - 100% Preserved */}
      <div className="hidden lg:flex flex-col justify-center my-auto py-6 sm:py-10 w-full max-w-2xl lg:max-w-3xl pointer-events-none relative z-10">
        {/* Role tag pill */}
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#080a12] border border-accent-lime/40 mb-4 sm:mb-5 text-accent-lime font-mono text-[11px] tracking-wider font-semibold shadow-[0_0_20px_rgba(204,255,0,0.15)] self-start">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-lime shadow-[0_0_8px_#ccff00] animate-pulse" />
          <span>DESIGN ENGINEER // CREATIVE TECHNOLOGIST</span>
        </div>

        {/* Captivating Bold Header */}
        <h1 className="font-display text-[32px] sm:text-5xl md:text-7xl lg:text-[76px] font-black tracking-tight text-white leading-[0.94] drop-shadow-[0_4px_36px_rgba(0,0,0,0.95)] mb-3.5 sm:mb-4 break-words">
          KWESI ANKOMAH-KORANTENG
        </h1>

        {/* Punchy Subtitle */}
        <p className="font-sans text-sm sm:text-lg md:text-xl text-zinc-100 font-medium leading-relaxed max-w-2xl drop-shadow-[0_2px_16px_rgba(0,0,0,0.95)] mb-3.5 sm:mb-4">
          Bridging tactile digital craft, 120 FPS compositor architecture, and scalable product engineering.
        </p>

        {/* Engaging Contextual Narrative */}
        <p className="font-sans text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-xl drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] mb-4 sm:mb-5">
          Ghanaian software engineer, Co-founder &amp; CTO at Arcfield Systems. Designing software with deep mechanical sympathy from commercial inventory ERPs and hyperlocal discovery platforms to hardware-accelerated 3D spatial web canvases.
        </p>

        {/* Venture & Capabilities Highlight Strip: 3-column grid on desktop */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5 max-w-xl mb-4 sm:mb-5">
          <div
            onClick={() => onSelectProject && onSelectProject("hyperscale")}
            className={`p-2.5 sm:py-2.5 sm:px-3.5 rounded-xl bg-[#0a0c14] border border-white/12 transition-all active:scale-[0.98] ${
              onSelectProject
                ? "pointer-events-auto cursor-pointer hover:border-accent-lime/60 hover:bg-black/85"
                : ""
            }`}
            title="Inspect Arcfield Discover in 3D Dimension"
          >
            <div className="font-mono text-[8px] sm:text-[9px] text-accent-lime tracking-widest uppercase mb-0.5">
              STARTUP // CTO
            </div>
            <div className="font-sans text-[11.5px] sm:text-xs font-semibold text-white truncate">
              Arcfield Discover
            </div>
            <div className="font-sans text-[9.5px] sm:text-[10.5px] text-zinc-400 truncate">
              Business &amp; Service Discovery MVP
            </div>
          </div>

          <div
            onClick={() => onSelectProject && onSelectProject("edge-gateway")}
            className={`p-2.5 sm:py-2.5 sm:px-3.5 rounded-xl bg-[#0a0c14] border border-white/12 transition-all active:scale-[0.98] ${
              onSelectProject
                ? "pointer-events-auto cursor-pointer hover:border-accent-lime/60 hover:bg-black/85"
                : ""
            }`}
            title="Inspect Nayak Furniture ERP Screenshots & Specs"
          >
            <div className="font-mono text-[8px] sm:text-[9px] text-accent-lime tracking-widest uppercase mb-0.5">
              ENTERPRISE POS
            </div>
            <div className="font-sans text-[11.5px] sm:text-xs font-semibold text-white truncate">
              Nayak Furniture ERP
            </div>
            <div className="font-sans text-[9.5px] sm:text-[10.5px] text-zinc-400 truncate">
              Inventory &amp; P&amp;L Engine
            </div>
          </div>

          <div
            onClick={() => onSelectProject && onSelectProject("event-stream")}
            className={`p-2.5 sm:py-2.5 sm:px-3.5 rounded-xl bg-[#0a0c14] border border-white/12 transition-all active:scale-[0.98] ${
              onSelectProject
                ? "pointer-events-auto cursor-pointer hover:border-accent-lime/60 hover:bg-black/85"
                : ""
            }`}
            title="Inspect 120 FPS Compositor Architecture"
          >
            <div className="font-mono text-[8px] sm:text-[9px] text-accent-lime tracking-widest uppercase mb-0.5">
              CORE SPECIALTY
            </div>
            <div className="font-sans text-[11.5px] sm:text-xs font-semibold text-white truncate">
              120 FPS Compositor
            </div>
            <div className="font-sans text-[9.5px] sm:text-[10.5px] text-zinc-400 truncate">
              Zero-Reflow Spatial UI
            </div>
          </div>
        </div>

        {/* Focus Badges */}
        <div className="flex flex-wrap gap-2 font-mono text-[9px] sm:text-[10px] max-w-full">
          <span className="px-2.5 sm:px-3 py-1 rounded-lg bg-[#0a0c14] border border-white/20 text-zinc-200 shadow-md">
            120 FPS COMPOSITOR
          </span>
          <span className="px-2.5 sm:px-3 py-1 rounded-lg bg-[#0a0c14] border border-white/20 text-zinc-200 shadow-md">
            THREE.JS // WEBGL
          </span>
          <span className="px-2.5 sm:px-3 py-1 rounded-lg bg-[#0a0c14] border border-accent-lime/30 text-accent-lime shadow-md">
            ACCRA // REMOTE
          </span>
        </div>
      </div>

      {/* Desktop Hero Bottom Bar & Downward Scroll Cue */}
      <div className="hidden lg:flex relative z-10 justify-end items-center w-full pt-4">
        <button
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
          className="group cursor-pointer flex items-center gap-2 sm:gap-3 px-3.5 sm:px-5 py-2 sm:py-3 rounded-xl bg-[#0a0c14]/90 hover:bg-accent-lime/10 border border-white/15 hover:border-accent-lime text-zinc-200 hover:text-white transition-all shadow-lg active:scale-95"
          aria-label="Scroll to Portal Section"
        >
          <span className="font-mono text-[10px] sm:text-xs tracking-wider font-semibold">
            ENTER PORTAL GATE
          </span>
          <span className="text-accent-lime text-xs sm:text-sm group-hover:translate-y-1 transition-transform">
            &darr;
          </span>
        </button>
      </div>

      {/* Seamless bottom fade handoff into Stage 02 (Desktop only - mobile console is docked) */}
      <div className="hidden lg:block absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#050508] to-transparent pointer-events-none z-10" />
    </section>
  );
};
