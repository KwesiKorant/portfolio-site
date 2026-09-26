"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";

interface ImageRevealHeroProps {
  onScrollNext?: () => void;
  onEnterPortal?: () => void;
}

export const ImageRevealHero: React.FC<ImageRevealHeroProps> = ({ onScrollNext, onEnterPortal }) => {
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

      {/* Hero Foreground Header */}
      <div className="relative z-10 flex justify-between items-center w-full">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-accent-lime shadow-[0_0_10px_#ccff00]" />
          <span className="font-mono text-xs tracking-widest uppercase font-semibold text-zinc-200">
            KWESI ANKOMAH-KORANTENG // DESIGN ENGINEER
          </span>
        </div>
        <div className="font-mono text-[11px] text-zinc-400 border border-white/12 px-3 py-1 rounded-lg bg-black/40 backdrop-blur-md">
          STAGE 01 // IMAGE REVEAL
        </div>
      </div>

      {/* Hero Bottom Bar & Downward Scroll Cue */}
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-6 w-full pt-12">
        <div className="max-w-md">
          <div className="font-mono text-[10px] text-accent-lime tracking-widest uppercase mb-1 font-semibold">
            01 &bull; CURSOR SPOTLIGHT
          </div>
          <p className="font-sans text-xs text-zinc-400 leading-relaxed">
            Move your cursor across the portrait to peer into the digital twin schematic. Scroll down to trigger the portal transition into the 3D spatial dimension.
          </p>
        </div>

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
          className="group cursor-pointer flex items-center gap-3 px-5 py-3 rounded-xl bg-white/[0.04] hover:bg-accent-lime/10 border border-white/15 hover:border-accent-lime text-zinc-200 hover:text-white transition-all shadow-lg"
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
