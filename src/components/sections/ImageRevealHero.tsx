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

  const handlePointerLeave = () => {
    setIsHovered(false);
    if (rafId.current) cancelAnimationFrame(rafId.current);
    isMoving.current = false;
  };

  return (
    <section
      ref={containerRef}
      id="section-hero"
      className="relative w-full min-h-[100dvh] flex flex-col justify-between p-6 md:p-12 overflow-hidden bg-[#050508] select-none [contain:layout_style_paint]"
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
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
                className="w-full h-full object-cover object-center"
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
            /* Radial mask: reveals the underlying layer centered on (--reveal-x, --reveal-y) */
            WebkitMaskImage: isHovered
              ? "radial-gradient(circle 280px at var(--reveal-x, 50%) var(--reveal-y, 50%), transparent 0%, transparent 45%, rgba(0,0,0,0.8) 75%, black 100%)"
              : "none",
            maskImage: isHovered
              ? "radial-gradient(circle 280px at var(--reveal-x, 50%) var(--reveal-y, 50%), transparent 0%, transparent 45%, rgba(0,0,0,0.8) 75%, black 100%)"
              : "none",
          }}
        >
          {hasCustomAssets ? (
            <picture className="w-full h-full block">
              <source srcSet="/hero-front.webp" type="image/webp" />
              <img
                src="/hero-front.jpg"
                alt="Kwesi Portrait"
                className="w-full h-full object-cover object-center"
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

      {/* Captivating Editorial Hero Content */}
      <div className="relative z-10 my-auto py-8 sm:py-12 max-w-2xl lg:max-w-3xl pointer-events-none">
        {/* Role tag pill */}
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-black/70 border border-accent-lime/40 backdrop-blur-md mb-5 text-accent-lime font-mono text-[11px] tracking-wider font-semibold shadow-[0_0_20px_rgba(204,255,0,0.15)]">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-lime shadow-[0_0_8px_#ccff00] animate-pulse" />
          <span>DESIGN ENGINEER // CREATIVE TECHNOLOGIST</span>
        </div>

        {/* Captivating Bold Header */}
        <h1 className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-[76px] font-black tracking-tight text-white leading-[0.94] drop-shadow-[0_4px_36px_rgba(0,0,0,0.95)] mb-4">
          KWESI ANKOMAH-KORANTENG
        </h1>

        {/* Punchy Subtitle */}
        <p className="font-sans text-base sm:text-lg md:text-xl text-zinc-100 font-medium leading-relaxed max-w-2xl drop-shadow-[0_2px_16px_rgba(0,0,0,0.95)] mb-4">
          Bridging tactile digital craft, 120 FPS compositor architecture, and scalable product engineering.
        </p>

        {/* Engaging Contextual Narrative */}
        <p className="font-sans text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-xl drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] mb-5">
          Ghanaian software engineer, Co-founder &amp; CTO at Arcfield Systems. Designing software with deep mechanical sympathy from commercial inventory ERPs and hyperlocal discovery platforms to hardware-accelerated 3D spatial web canvases.
        </p>

        {/* Venture & Capabilities Highlight Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-xl mb-5">
          <div
            onClick={() => onSelectProject && onSelectProject("hyperscale")}
            className={`px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/12 backdrop-blur-md transition-all ${
              onSelectProject
                ? "pointer-events-auto cursor-pointer hover:border-accent-lime/60 hover:bg-black/85"
                : ""
            }`}
            title="Inspect Arcfield Discover in 3D Dimension"
          >
            <div className="font-mono text-[9px] text-accent-lime tracking-widest uppercase mb-0.5">
              STARTUP // CTO
            </div>
            <div className="font-sans text-xs font-semibold text-white">
              Arcfield Discover
            </div>
            <div className="font-sans text-[10.5px] text-zinc-400">
              Business &amp; Service Discovery MVP
            </div>
          </div>

          <div
            onClick={() => onSelectProject && onSelectProject("edge-gateway")}
            className={`px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/12 backdrop-blur-md transition-all ${
              onSelectProject
                ? "pointer-events-auto cursor-pointer hover:border-accent-lime/60 hover:bg-black/85"
                : ""
            }`}
            title="Inspect Nayak Furniture ERP Screenshots & Specs"
          >
            <div className="font-mono text-[9px] text-accent-lime tracking-widest uppercase mb-0.5">
              ENTERPRISE POS
            </div>
            <div className="font-sans text-xs font-semibold text-white">
              Nayak Furniture ERP
            </div>
            <div className="font-sans text-[10.5px] text-zinc-400">
              Inventory &amp; P&amp;L Engine
            </div>
          </div>

          <div
            onClick={() => onSelectProject && onSelectProject("event-stream")}
            className={`px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/12 backdrop-blur-md transition-all ${
              onSelectProject
                ? "pointer-events-auto cursor-pointer hover:border-accent-lime/60 hover:bg-black/85"
                : ""
            }`}
            title="Inspect 120 FPS Compositor Architecture"
          >
            <div className="font-mono text-[9px] text-accent-lime tracking-widest uppercase mb-0.5">
              CORE SPECIALTY
            </div>
            <div className="font-sans text-xs font-semibold text-white">
              120 FPS Compositor
            </div>
            <div className="font-sans text-[10.5px] text-zinc-400">
              Zero-Reflow Spatial UI
            </div>
          </div>
        </div>

        {/* Focus Badges */}
        <div className="flex flex-wrap gap-2 font-mono text-[10px]">
          <span className="px-3 py-1 rounded-lg bg-black/70 border border-white/20 text-zinc-200 backdrop-blur-md shadow-md">
            120 FPS COMPOSITOR MANDATE
          </span>
          <span className="px-3 py-1 rounded-lg bg-black/70 border border-white/20 text-zinc-200 backdrop-blur-md shadow-md">
            THREE.JS // WEBGL SPATIAL
          </span>
          <span className="px-3 py-1 rounded-lg bg-black/70 border border-accent-lime/30 text-accent-lime backdrop-blur-md shadow-md">
            ACCRA, GHANA // REMOTE
          </span>
        </div>
      </div>

      {/* Hero Bottom Bar & Downward Scroll Cue */}
      <div className="relative z-10 flex justify-end items-center w-full pt-8">
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
          className="group cursor-pointer flex items-center gap-3 px-5 py-3 rounded-xl bg-white/[0.04] hover:bg-accent-lime/10 border border-white/15 hover:border-accent-lime text-zinc-200 hover:text-white transition-all shadow-lg backdrop-blur-sm"
          aria-label="Scroll to Portal Section"
        >
          <span className="font-mono text-xs tracking-wider font-semibold">
            ENTER PORTAL GATE
          </span>
          <span className="text-accent-lime text-sm group-hover:translate-y-1 transition-transform">
            &darr;
          </span>
        </button>
      </div>

      {/* Seamless bottom fade handoff into Stage 02 */}
      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#050508] to-transparent pointer-events-none z-10" />
    </section>
  );
};
