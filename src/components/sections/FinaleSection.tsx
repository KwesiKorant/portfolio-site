"use client";

import React, { useState, useRef, useEffect } from "react";
import { playCopySuccess, playKeyClick } from "@/lib/soundEngine";

export const FinaleSection: React.FC = () => {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [mobileTab, setMobileTab] = useState<"uplink" | "telemetry">("uplink");
  const containerRef = useRef<HTMLElement | null>(null);
  const [isInView, setIsInView] = useState(false);
  const email = "junykorant@gmail.com";

  // Viewport Culling: Pause continuous CSS animations when off-screen
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleCopyEmail = () => {
    playCopySuccess();
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(email).then(() => {
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2400);
      }).catch(() => {
        fallbackCopy(email);
      });
    } else {
      fallbackCopy(email);
    }
  };

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    } catch {
      // Ignore
    }
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2400);
  };

  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToScrub = () => {
    const el = document.getElementById("section-scrub");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Wheel navigation: Smooth scroll transition back to Stage 04 when scrolling up from Stage 05
  useEffect(() => {
    let overscrollUp = 0;
    let overscrollTimer: NodeJS.Timeout | null = null;
    let isNavigating = false;

    const handleWheel = (e: WheelEvent) => {
      if (!isInView) return;
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // Ensure Stage 05 is the predominant section in view
      if (rect.top > window.innerHeight * 0.4) return;

      const target = e.target as HTMLElement | null;
      if (target?.closest("button, a, input, select, textarea")) {
        return;
      }

      // Scrolling UP towards Stage 04 (AI Augmented Workflow)
      if (e.deltaY < 0 && window.scrollY <= el.offsetTop + 100) {
        e.preventDefault();
        overscrollUp += Math.abs(e.deltaY);
        if (overscrollUp > 120 && !isNavigating) {
          isNavigating = true;
          const scrubEl = document.getElementById("section-scrub");
          if (scrubEl) {
            scrubEl.scrollIntoView({ behavior: "smooth", block: "start" });
          }
          setTimeout(() => {
            isNavigating = false;
            overscrollUp = 0;
          }, 1100);
        }
      }

      if (overscrollTimer) clearTimeout(overscrollTimer);
      overscrollTimer = setTimeout(() => {
        overscrollUp = 0;
      }, 350);
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", handleWheel);
      if (overscrollTimer) clearTimeout(overscrollTimer);
    };
  }, [isInView]);

  return (
    <footer
      ref={containerRef}
      id="section-finale"
      className="relative w-full h-[100dvh] max-h-[100dvh] flex flex-col justify-between p-3 xs:p-4 sm:p-6 lg:p-12 overflow-hidden bg-[#050508] select-none [contain:layout_style_paint]"
      aria-label="Engineer Dossier & Terminal Finale"
    >
      {/* Dynamic Multi-Directional Wavy Keyframes (Zero-Reflow Compositor Only) */}
      <style>{`
        @keyframes waveFlowSE {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(64px, 64px, 0); }
        }
        @keyframes waveFlowSW {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-64px, 64px, 0); }
        }
        @keyframes waveFlowNW {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-64px, -64px, 0); }
        }
        @keyframes waveFlowNE {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(64px, -64px, 0); }
        }
        @media (max-width: 768px) {
          .anim-wave-sw, .anim-wave-nw, .anim-wave-ne {
            display: none !important;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .anim-wave-se, .anim-wave-sw, .anim-wave-nw, .anim-wave-ne {
            animation: none !important;
          }
        }
      `}</style>

      {/* Multi-Directional Wavy Cyber Mesh Background with Seamless Alpha Blend from Stage 04 */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none z-0"
        style={{
          maskImage:
            "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.35) 90px, black 220px, black 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.35) 90px, black 220px, black 100%)",
        }}
      >
        {/* Layer 1: South-East Drifting Waves (Electric Lime Flow) */}
        <div
          className="absolute -inset-16 anim-wave-se opacity-40"
          style={{
            animation: "waveFlowSE 18s linear infinite",
            animationPlayState: isInView ? "running" : "paused",
            willChange: "transform",
          }}
        >
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="wavy-layer-se"
                width="32"
                height="32"
                patternUnits="userSpaceOnUse"
              >
                {/* Horizontal wave line */}
                <path
                  d="M 0 16 Q 8 8 16 16 T 32 16"
                  fill="none"
                  stroke="rgba(204, 255, 0, 0.40)"
                  strokeWidth="0.85"
                />
                {/* Vertical wave line */}
                <path
                  d="M 16 0 Q 8 8 16 16 T 16 32"
                  fill="none"
                  stroke="rgba(204, 255, 0, 0.22)"
                  strokeWidth="0.75"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#wavy-layer-se)" />
          </svg>
        </div>

        {/* Layer 2: South-West Drifting Counter-Waves (Cyan / Ice Cross-Current) */}
        <div
          className="absolute -inset-16 anim-wave-sw opacity-35"
          style={{
            animation: "waveFlowSW 24s linear infinite",
            animationPlayState: isInView ? "running" : "paused",
            willChange: "transform",
          }}
        >
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="wavy-layer-sw"
                width="32"
                height="32"
                patternUnits="userSpaceOnUse"
              >
                {/* Inverse phase horizontal wave */}
                <path
                  d="M 0 16 Q 8 24 16 16 T 32 16"
                  fill="none"
                  stroke="rgba(140, 210, 255, 0.30)"
                  strokeWidth="0.75"
                />
                {/* Inverse phase vertical wave */}
                <path
                  d="M 16 0 Q 24 8 16 16 T 16 32"
                  fill="none"
                  stroke="rgba(140, 210, 255, 0.20)"
                  strokeWidth="0.7"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#wavy-layer-sw)" />
          </svg>
        </div>

        {/* Layer 3: North-West Drifting Wave (Subtle Emerald Under-current) */}
        <div
          className="absolute -inset-16 anim-wave-nw opacity-25"
          style={{
            animation: "waveFlowNW 28s linear infinite",
            animationPlayState: isInView ? "running" : "paused",
            willChange: "transform",
          }}
        >
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="wavy-layer-nw"
                width="32"
                height="32"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 0 16 Q 8 10 16 16 T 32 16"
                  fill="none"
                  stroke="rgba(52, 211, 153, 0.28)"
                  strokeWidth="0.7"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#wavy-layer-nw)" />
          </svg>
        </div>

        {/* Layer 4: North-East Drifting Swell (Translucent Ambient Highlight) */}
        <div
          className="absolute -inset-16 anim-wave-ne opacity-20"
          style={{
            animation: "waveFlowNE 34s linear infinite",
            animationPlayState: isInView ? "running" : "paused",
            willChange: "transform",
          }}
        >
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="wavy-layer-ne"
                width="32"
                height="32"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 0 16 Q 16 6 32 16"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.22)"
                  strokeWidth="0.65"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#wavy-layer-ne)" />
          </svg>
        </div>

        {/* Deep bottom grounding fade */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050508]/40 to-[#030305]/95 pointer-events-none" />
      </div>

      {/* Vertical Tunnel Light Shaft (Volumetric downlight from overhead tunnel, scaled +15% wider and +25% longer) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[994px] max-w-[96vw] h-[990px] pointer-events-none z-0 overflow-visible">
        {/* Overhead tunnel mouth / aperture rim */}
        <div className="absolute -top-[55px] left-1/2 -translate-x-1/2 w-[280px] xs:w-[340px] sm:w-[524px] h-[50px] rounded-[100%] bg-black/85 border border-accent-lime/20 shadow-[0_4px_28px_rgba(204,255,0,0.18)]" />
        <div className="absolute -top-[45px] left-1/2 -translate-x-1/2 w-[220px] xs:w-[280px] sm:w-[414px] h-[25px] rounded-[100%] bg-accent-lime/20 blur-md" />
        <div className="absolute -top-[39px] left-1/2 -translate-x-1/2 w-[140px] xs:w-[170px] sm:w-[235px] h-[14px] rounded-[100%] bg-white/40 blur-sm" />

        {/* Volumetric Vertical Light Column (Organic Gaussian falloff, zero hard cutoffs) */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[718px] sm:w-[856px] h-[935px]"
          style={{
            background:
              "radial-gradient(ellipse 50% 85% at 50% 0%, rgba(204,255,0,0.13) 0%, rgba(204,255,0,0.05) 45%, rgba(204,255,0,0.01) 72%, transparent 90%)",
            maskImage:
              "linear-gradient(to bottom, black 0%, black 45%, rgba(0,0,0,0.5) 75%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, black 0%, black 45%, rgba(0,0,0,0.5) 75%, transparent 100%)",
          }}
        />

        {/* Inner focused vertical light column */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[360px] sm:w-[442px] h-[770px]"
          style={{
            background:
              "radial-gradient(ellipse 45% 90% at 50% 0%, rgba(220,255,100,0.16) 0%, rgba(204,255,0,0.06) 45%, transparent 80%)",
            filter: "blur(24px)",
          }}
        />

        {/* Core tunnel downlight ray */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[152px] sm:w-[207px] h-[578px]"
          style={{
            background:
              "radial-gradient(ellipse 50% 90% at 50% 0%, rgba(255,255,255,0.20) 0%, rgba(204,255,0,0.08) 50%, transparent 85%)",
            filter: "blur(16px)",
          }}
        />

        {/* Subtle vertical atmospheric streaks */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[470px] sm:w-[580px] h-[688px] opacity-35 mix-blend-screen"
          style={{
            background:
              "repeating-linear-gradient(90deg, transparent 0px, transparent 18px, rgba(204,255,0,0.04) 18px, rgba(204,255,0,0.04) 22px, transparent 22px, transparent 40px)",
            maskImage:
              "radial-gradient(ellipse 50% 80% at 50% 0%, black 15%, transparent 80%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 50% 80% at 50% 0%, black 15%, transparent 80%)",
          }}
        />
      </div>

      {/* Tiny top blend: eliminates the hard line page cut at the top middle where the Vertical Tunnel Light Shaft appears */}
      <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-[#050508] via-[#050508]/80 to-transparent pointer-events-none z-[1]" />

      {/* Top Navigation Bar: Smooth return links and stage indicator */}
      <div className="relative z-20 flex justify-between items-center gap-1.5 sm:gap-2 font-mono text-[9px] sm:text-[10px] pb-2 sm:pb-4 w-full shrink-0">
        <div className="flex items-center gap-1.5 text-zinc-400 text-[8px] sm:text-[9.5px] font-mono bg-[#080a12] border border-white/10 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-lime animate-pulse" />
          <span>STAGE 05 // DOSSIER &amp; UPLINK</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleToScrub}
            className="text-zinc-400 hover:text-white px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg border border-white/12 hover:border-accent-lime/40 bg-[#0a0c14]/90 hover:bg-white/[0.08] transition-all cursor-pointer active:scale-95"
            title="Return to Stage 04 AI Workflow"
          >
            &uarr; <span className="hidden sm:inline">STAGE 04 //</span> SCRUB
          </button>
          <button
            onClick={handleBackToTop}
            className="text-accent-lime/90 hover:text-accent-lime px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg border border-accent-lime/30 hover:border-accent-lime bg-accent-lime/[0.05] hover:bg-accent-lime/[0.1] transition-all cursor-pointer active:scale-95"
          >
            &uarr; TOP HERO
          </button>
        </div>
      </div>

      {/* MOBILE VIEW (< lg): Ambient Wavy Chamber + Segmented Dossier & Uplink Dock */}
      <div className="flex lg:hidden flex-col justify-between items-center flex-1 w-full min-h-0 pt-1 pb-1 relative z-20">
        {/* Upper Ambient Chamber */}
        <div className="relative flex-1 w-full flex flex-col justify-end items-center pb-2 min-h-0 text-center px-1">
          <div className="w-full max-w-sm">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-lime/10 border border-accent-lime/30 font-mono text-[7.5px] xs:text-[8px] text-accent-lime tracking-widest uppercase mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-lime shadow-[0_0_6px_#ccff00] animate-pulse" />
              <span>DIRECT CONTACT // OPEN FOR ROLES</span>
            </div>
            <h2 className="font-display text-[15px] xs:text-[17px] font-bold text-white tracking-tight leading-snug drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
              Bridging tactile design engineering &amp; scalable software.
            </h2>
            <p className="font-sans text-[8.5px] xs:text-[9.5px] text-zinc-300 leading-tight mt-1 line-clamp-2 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
              Kwesi Ankomah-Koranteng, Co-founder &amp; CTO at Arcfield Systems. Crafting hardware-accelerated web experiences &amp; resilient systems.
            </p>
          </div>
        </div>

        {/* Lower Console: Segmented Dossier & Uplink Dock */}
        <div className="w-full max-w-sm rounded-2xl bg-[#080a12]/60 border border-white/15 p-3 xs:p-3.5 mb-0.5 sm:mb-2 flex flex-col pointer-events-auto relative z-20 shrink-0 shadow-[0_15px_45px_rgba(0,0,0,0.85)]">
          {/* Segmented Controller Tab Switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/60 border border-white/10 mb-2 font-mono text-[8.5px]">
            <button
              onClick={() => setMobileTab("uplink")}
              className={`py-1.5 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                mobileTab === "uplink"
                  ? "bg-accent-lime/20 border border-accent-lime/60 text-accent-lime shadow-[0_0_10px_rgba(204,255,0,0.2)]"
                  : "text-zinc-400 hover:text-zinc-200 border border-transparent"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              <span>01 // DIRECT UPLINK</span>
            </button>
            <button
              onClick={() => setMobileTab("telemetry")}
              className={`py-1.5 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                mobileTab === "telemetry"
                  ? "bg-accent-lime/20 border border-accent-lime/60 text-accent-lime shadow-[0_0_10px_rgba(204,255,0,0.2)]"
                  : "text-zinc-400 hover:text-zinc-200 border border-transparent"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              <span>02 // TELEMETRY</span>
            </button>
          </div>

          {/* Tab Content Container */}
          <div className="min-h-[165px] max-h-[195px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pr-0.5">
            {mobileTab === "uplink" ? (
              <div className="space-y-1.5">
                {/* 1. Email */}
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className={`w-full text-left p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 group active:scale-[0.98] ${
                    copiedEmail
                      ? "bg-accent-lime/15 border-accent-lime shadow-[0_0_15px_rgba(204,255,0,0.2)]"
                      : "bg-black/50 hover:bg-black/75 border-white/10 hover:border-accent-lime/50"
                  }`}
                  title="Click to copy email address"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-accent-lime/10 border border-accent-lime/30 flex items-center justify-center shrink-0">
                      <svg className="w-3.5 h-3.5 text-accent-lime" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect width="20" height="16" x="2" y="4" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-[7.5px] uppercase tracking-wider text-zinc-400">
                        EMAIL // INBOX
                      </div>
                      <div className="font-mono text-[10px] text-white truncate font-medium">
                        {email}
                      </div>
                    </div>
                  </div>
                  <span className={`font-mono text-[8px] px-2 py-0.5 rounded-md transition-colors shrink-0 ${
                    copiedEmail
                      ? "bg-accent-lime text-black font-bold"
                      : "bg-white/[0.08] text-zinc-300 group-hover:text-accent-lime"
                  }`}>
                    {copiedEmail ? "COPIED ✓" : "COPY"}
                  </span>
                </button>

                {/* 2. WhatsApp */}
                <a
                  href="https://wa.me/233204563873"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => playKeyClick()}
                  className="w-full text-left p-2 rounded-xl border border-white/10 bg-black/50 hover:bg-emerald-500/[0.1] hover:border-emerald-400/50 transition-all cursor-pointer flex items-center justify-between gap-2 group active:scale-[0.98]"
                  title="Direct WhatsApp chat"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-[#25D366]/15 border border-[#25D366]/30 flex items-center justify-center shrink-0">
                      <svg className="w-3.5 h-3.5 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-[7.5px] uppercase tracking-wider text-zinc-400">
                        WHATSAPP // MESSAGING
                      </div>
                      <div className="font-mono text-[10px] text-white truncate font-medium">
                        +233 20 456 3873
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-[8px] px-2 py-0.5 rounded-md bg-white/[0.08] text-zinc-300 group-hover:text-emerald-300 transition-colors shrink-0">
                    CHAT ↗
                  </span>
                </a>

                {/* 3. LinkedIn & GitHub row */}
                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                  <a
                    href="https://www.linkedin.com/in/kaykorant"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => playKeyClick()}
                    className="p-1.5 rounded-xl border border-white/10 bg-black/50 hover:bg-[#0A66C2]/[0.15] hover:border-[#0A66C2]/60 transition-all flex items-center justify-between gap-1 group active:scale-[0.98]"
                    title="Connect on LinkedIn"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-5 h-5 rounded-md bg-[#0A66C2]/20 flex items-center justify-center shrink-0">
                        <svg className="w-3 h-3 text-[#38bdf8]" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                        </svg>
                      </div>
                      <div className="font-mono text-[8px] text-white truncate font-medium">LINKEDIN</div>
                    </div>
                    <span className="font-mono text-[7px] text-zinc-400 group-hover:text-sky-300">↗</span>
                  </a>

                  <a
                    href="https://github.com/KwesiKorant"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => playKeyClick()}
                    className="p-1.5 rounded-xl border border-white/10 bg-black/50 hover:bg-white/[0.12] hover:border-white/30 transition-all flex items-center justify-between gap-1 group active:scale-[0.98]"
                    title="Explore GitHub Repositories"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-5 h-5 rounded-md bg-white/[0.1] flex items-center justify-center shrink-0">
                        <svg className="w-3 h-3 text-zinc-100" viewBox="0 0 24 24" fill="currentColor">
                          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                        </svg>
                      </div>
                      <div className="font-mono text-[8px] text-white truncate font-medium">GITHUB</div>
                    </div>
                    <span className="font-mono text-[7px] text-zinc-400 group-hover:text-white">↗</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-1 font-mono text-[8px]">
                <div className="p-1.5 rounded-lg bg-black/45 border border-white/10 flex justify-between items-center">
                  <span className="text-zinc-400 font-semibold">ENGINEER:</span>
                  <span className="text-zinc-100 font-medium">KWESI ANKOMAH-KORANTENG</span>
                </div>
                <div className="p-1.5 rounded-lg bg-black/45 border border-white/10 flex justify-between items-center">
                  <span className="text-zinc-400 font-semibold">TARGET ROLE:</span>
                  <span className="text-accent-lime font-medium">DESIGN ENG // CREATIVE TECH</span>
                </div>
                <div className="p-1.5 rounded-lg bg-black/45 border border-white/10 flex justify-between items-center">
                  <span className="text-zinc-400 font-semibold">STARTUP:</span>
                  <span className="text-zinc-200 font-medium">ARCFIELD // CO-FOUNDER &amp; CTO</span>
                </div>
                <div className="p-1.5 rounded-lg bg-black/45 border border-white/10 flex justify-between items-center">
                  <span className="text-zinc-400 font-semibold">COMPOSITOR:</span>
                  <span className="text-accent-lime font-medium">120 FPS ZERO REFLOW</span>
                </div>
                <div className="p-1.5 rounded-lg bg-black/45 border border-white/10 flex justify-between items-center">
                  <span className="text-zinc-400 font-semibold">LOCATION:</span>
                  <span className="text-zinc-200 font-medium">GHANA // WORLDWIDE REMOTE</span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Dock Status & Back to Top */}
          <div className="flex items-center justify-between pt-2 mt-1.5 border-t border-white/10 font-mono text-[8.5px] text-zinc-300">
            <span className="text-zinc-400">&copy; 2026 KWESI</span>
            <button
              onClick={handleBackToTop}
              className="text-accent-lime font-bold flex items-center gap-1 hover:underline cursor-pointer active:scale-95 px-2 py-0.5 rounded bg-accent-lime/10 border border-accent-lime/30 shadow-[0_0_8px_rgba(204,255,0,0.15)]"
            >
              <span>RETURN TO TOP</span>
              <span className="text-xs">&uarr;</span>
            </button>
          </div>
        </div>
      </div>

      {/* DESKTOP VIEW (>= lg): Canonical Two-Column Grid - 100% Preserved */}
      <div className="hidden lg:grid relative z-10 w-full max-w-6xl mx-auto my-auto py-4 sm:py-8 md:py-12 grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-10 items-stretch">
        {/* Left Column: Mission Narrative & Transparent Telemetry Card at Bottom Left */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4 sm:space-y-6">
          <div>
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 rounded-full bg-accent-lime/10 border border-accent-lime/30 font-mono text-[8.5px] sm:text-[10px] text-accent-lime tracking-widest uppercase mb-2.5 sm:mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-lime shadow-[0_0_8px_#ccff00] animate-pulse" />
              <span>DIRECT CONTACT // OPEN FOR DESIGN ENGINEERING ROLES</span>
            </div>

            <h2 className="font-display text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-2.5 sm:mb-5 leading-[1.15]">
              Bridging tactile design engineering &amp; scalable software.
            </h2>

            <p className="font-sans text-[11.5px] sm:text-sm md:text-base text-zinc-300 leading-relaxed max-w-2xl">
              Kwesi Ankomah-Koranteng, Ghanaian software engineer, Co-founder &amp; CTO at Arcfield Systems. Crafting hardware-accelerated web experiences, 120 FPS compositor architectures, and resilient full-stack systems. Open for Design Engineering roles, creative technologist positions, and high-impact software builds.
            </p>
          </div>

          {/* Technical System Footprint Grid: Applied Stage 4 Card Transparency Effect */}
          <div className="p-3 sm:p-5 rounded-2xl bg-[#080a12]/60 border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.5)] font-mono text-[9px] sm:text-[10px] text-zinc-300 space-y-1.5 sm:space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 sm:pb-2 mb-1 border-b border-white/10">
              <div className="flex items-center gap-1.5 sm:gap-2 text-accent-lime font-mono text-[8px] sm:text-[9px] tracking-wider uppercase font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-lime shadow-[0_0_8px_#ccff00] animate-pulse" />
                <span>SYSTEM TELEMETRY // FOOTPRINT</span>
              </div>
              <span className="font-mono text-[7.5px] sm:text-[8.5px] text-zinc-400 px-1.5 sm:px-2 py-0.5 rounded bg-white/[0.05] border border-white/10">
                VERIFIED SPEC
              </span>
            </div>

            <div className="space-y-1.5 pt-0.5">
              <div className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white/[0.03] border border-white/10 flex justify-between items-center flex-wrap gap-1 sm:gap-2 transition-colors hover:bg-white/[0.06] text-[8.5px] sm:text-[10px]">
                <span className="text-zinc-400 font-semibold">ENGINEER:</span>
                <span className="text-zinc-100 font-mono font-medium">KWESI ANKOMAH-KORANTENG</span>
              </div>
              <div className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white/[0.03] border border-white/10 flex justify-between items-center flex-wrap gap-1 sm:gap-2 transition-colors hover:bg-white/[0.06] text-[8.5px] sm:text-[10px]">
                <span className="text-zinc-400 font-semibold">TARGET ROLE:</span>
                <span className="text-accent-lime font-mono font-medium">DESIGN ENGINEER // CREATIVE TECHNOLOGIST</span>
              </div>
              <div className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white/[0.03] border border-white/10 flex justify-between items-center flex-wrap gap-1 sm:gap-2 transition-colors hover:bg-white/[0.06] text-[8.5px] sm:text-[10px]">
                <span className="text-zinc-400 font-semibold">STARTUP // ROLE:</span>
                <span className="text-zinc-200 font-mono font-medium">ARCFIELD SYSTEMS // CO-FOUNDER &amp; CTO</span>
              </div>
              <div className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white/[0.03] border border-white/10 flex justify-between items-center flex-wrap gap-1 sm:gap-2 transition-colors hover:bg-white/[0.06] text-[8.5px] sm:text-[10px]">
                <span className="text-zinc-400 font-semibold">COMPOSITOR STANDARD:</span>
                <span className="text-accent-lime font-medium">120 FPS ZERO REFLOW MANDATE</span>
              </div>
              <div className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white/[0.03] border border-white/10 flex justify-between items-center flex-wrap gap-1 sm:gap-2 transition-colors hover:bg-white/[0.06] text-[8.5px] sm:text-[10px]">
                <span className="text-zinc-400 font-semibold">LOCATION:</span>
                <span className="text-zinc-200">GHANA // WORLDWIDE REMOTE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Contact Card with Original Brand Icons */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="p-3.5 sm:p-6 md:p-7 rounded-2xl bg-[#080a12]/60 border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col justify-between h-full">
            <div>
              {/* Header Stating Contact */}
              <div className="flex items-center justify-between gap-2.5 mb-2">
                <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-accent-lime/10 border border-accent-lime/30 font-mono text-[8.5px] sm:text-[9px] text-accent-lime tracking-widest uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-lime shadow-[0_0_8px_#ccff00] animate-pulse" />
                  <span>DIRECT CHANNELS</span>
                </div>
                <span className="font-mono text-[8.5px] sm:text-[9px] text-emerald-400 flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  AVAILABLE
                </span>
              </div>

              <h3 className="font-display text-xl sm:text-3xl font-bold tracking-tight text-white mb-1.5 sm:mb-2">
                CONTACT
              </h3>
              <p className="font-sans text-[11px] sm:text-xs text-zinc-300 leading-relaxed mb-3.5 sm:mb-5">
                Initiate a direct conversation, request an engineering walkthrough, or discuss high-impact roles.
              </p>

              {/* 4 Social Channels with Original Icons */}
              <div className="space-y-2 sm:space-y-2.5">
                {/* 1. Email */}
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className={`w-full text-left p-2.5 sm:p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 sm:gap-3 group ${
                    copiedEmail
                      ? "bg-accent-lime/15 border-accent-lime shadow-[0_0_20px_rgba(204,255,0,0.25)]"
                      : "bg-white/[0.03] hover:bg-white/[0.07] border-white/10 hover:border-accent-lime/50"
                  }`}
                  title="Click to copy email address"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-accent-lime/10 border border-accent-lime/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {/* Original Mail SVG Icon */}
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent-lime" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect width="20" height="16" x="2" y="4" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-[8px] sm:text-[9px] uppercase tracking-wider text-zinc-400 group-hover:text-accent-lime transition-colors">
                        EMAIL // INBOX
                      </div>
                      <div className="font-mono text-[11px] sm:text-xs text-white truncate font-medium">
                        {email}
                      </div>
                    </div>
                  </div>
                  <span className={`font-mono text-[9px] sm:text-[10px] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md transition-colors shrink-0 ${
                    copiedEmail
                      ? "bg-accent-lime text-black font-bold"
                      : "bg-white/[0.06] text-zinc-300 group-hover:text-white group-hover:bg-accent-lime/20 group-hover:text-accent-lime"
                  }`}>
                    {copiedEmail ? "COPIED ✓" : "COPY"}
                  </span>
                </button>

                {/* 2. WhatsApp */}
                <a
                  href="https://wa.me/233204563873"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => playKeyClick()}
                  className="w-full text-left p-2.5 sm:p-3.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-emerald-500/[0.08] hover:border-emerald-400/50 transition-all cursor-pointer flex items-center justify-between gap-2.5 sm:gap-3 group"
                  title="Direct WhatsApp chat"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#25D366]/15 border border-[#25D366]/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {/* Original WhatsApp Brand Icon */}
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-[8px] sm:text-[9px] uppercase tracking-wider text-zinc-400 group-hover:text-emerald-400 transition-colors">
                        WHATSAPP // MESSAGING
                      </div>
                      <div className="font-mono text-[11px] sm:text-xs text-white truncate font-medium">
                        +233 20 456 3873
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-[9px] sm:text-[10px] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md bg-white/[0.06] text-zinc-300 group-hover:bg-emerald-500/20 group-hover:text-emerald-300 transition-colors shrink-0 flex items-center gap-1">
                    CHAT ↗
                  </span>
                </a>

                {/* 3. LinkedIn */}
                <a
                  href="https://www.linkedin.com/in/kaykorant"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => playKeyClick()}
                  className="w-full text-left p-2.5 sm:p-3.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-[#0A66C2]/[0.1] hover:border-[#0A66C2]/60 transition-all cursor-pointer flex items-center justify-between gap-2.5 sm:gap-3 group"
                  title="Connect on LinkedIn"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#0A66C2]/15 border border-[#0A66C2]/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {/* Original LinkedIn Brand Icon */}
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#38bdf8]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-[8px] sm:text-[9px] uppercase tracking-wider text-zinc-400 group-hover:text-[#38bdf8] transition-colors">
                        LINKEDIN // PROFILE
                      </div>
                      <div className="font-mono text-[11px] sm:text-xs text-white truncate font-medium">
                        linkedin.com/in/kaykorant
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-[9px] sm:text-[10px] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md bg-white/[0.06] text-zinc-300 group-hover:bg-[#0A66C2]/20 group-hover:text-sky-300 transition-colors shrink-0 flex items-center gap-1">
                    CONNECT ↗
                  </span>
                </a>

                {/* 4. GitHub */}
                <a
                  href="https://github.com/KwesiKorant"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => playKeyClick()}
                  className="w-full text-left p-2.5 sm:p-3.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/30 transition-all cursor-pointer flex items-center justify-between gap-2.5 sm:gap-3 group"
                  title="Explore GitHub Repositories"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/[0.08] border border-white/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {/* Original GitHub Octocat Icon */}
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-100" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-[8px] sm:text-[9px] uppercase tracking-wider text-zinc-400 group-hover:text-white transition-colors">
                        GITHUB // CODEBASE
                      </div>
                      <div className="font-mono text-[11px] sm:text-xs text-white truncate font-medium">
                        github.com/KwesiKorant
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-[9px] sm:text-[10px] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md bg-white/[0.06] text-zinc-300 group-hover:bg-white/[0.15] group-hover:text-white transition-colors shrink-0 flex items-center gap-1">
                    SOURCE ↗
                  </span>
                </a>
              </div>
            </div>

            {/* Footer status inside Contact Card */}
            <div className="pt-3.5 sm:pt-5 mt-3.5 sm:mt-5 border-t border-white/10 flex items-center justify-between text-zinc-400 font-mono text-[8.5px] sm:text-[9.5px]">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-lime/80" />
                SLA: &lt; 24H RESPONSE
              </span>
              <span className="text-zinc-500">DIRECT // SECURE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grounded Terminal Footer Strip (Definitive End of Site) - Desktop canonical */}
      <div className="hidden lg:block relative z-10 w-full pt-5 sm:pt-8 border-t border-white/10 space-y-2.5 sm:space-y-4">
        <div className="flex justify-end items-center gap-4 font-mono text-[9px] sm:text-[10px]">
          <button
            onClick={handleBackToTop}
            className="cursor-pointer group flex items-center gap-2 text-zinc-400 hover:text-accent-lime transition-colors"
          >
            <span>RETURN TO TOP</span>
            <span className="text-xs group-hover:-translate-y-0.5 transition-transform">&uarr;</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 sm:gap-3 font-mono text-[8.5px] sm:text-[10px] text-zinc-500">
          <div>&copy; 2026 KWESI ANKOMAH-KORANTENG &bull; ALL RIGHTS RESERVED</div>
          <div className="flex items-center flex-wrap gap-2 sm:gap-3">
            <span>THREE.JS WEBGL</span>
            <span>&bull;</span>
            <span>NEXT.JS 15</span>
            <span>&bull;</span>
            <span>120 FPS ZERO REFLOW</span>
            <span>&bull;</span>
            <span>ALL-INTRA KINEMATICS</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
