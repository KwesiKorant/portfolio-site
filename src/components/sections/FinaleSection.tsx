"use client";

import React, { useState, useRef, useEffect } from "react";

export const FinaleSection: React.FC = () => {
  const [copiedEmail, setCopiedEmail] = useState(false);
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
    navigator.clipboard.writeText(email).then(() => {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2400);
    });
  };

  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToSpatial = () => {
    const el = document.getElementById("section-spatial");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer
      ref={containerRef}
      id="section-finale"
      className="relative w-full min-h-[100dvh] flex flex-col justify-between py-12 md:py-16 px-6 sm:px-10 md:px-16 lg:px-24 bg-[#050508] select-none [contain:layout_style_paint] overflow-hidden"
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
        <div className="absolute -top-[55px] left-1/2 -translate-x-1/2 w-[414px] sm:w-[524px] h-[50px] rounded-[100%] bg-black/85 border border-accent-lime/20 shadow-[0_4px_28px_rgba(204,255,0,0.18)]" />
        <div className="absolute -top-[45px] left-1/2 -translate-x-1/2 w-[332px] sm:w-[414px] h-[25px] rounded-[100%] bg-accent-lime/20 blur-md" />
        <div className="absolute -top-[39px] left-1/2 -translate-x-1/2 w-[180px] sm:w-[235px] h-[14px] rounded-[100%] bg-white/40 blur-sm" />

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

      {/* Top Navigation Actions: Cleanly anchored without stage header bar */}
      <div className="relative z-10 flex justify-end items-center gap-2 font-mono text-[10px] pb-4 w-full">
        <button
          onClick={handleToSpatial}
          className="text-zinc-400 hover:text-white px-3.5 py-1.5 rounded-lg border border-white/12 hover:border-accent-lime/40 bg-white/[0.03] hover:bg-white/[0.08] transition-all cursor-pointer backdrop-blur-sm"
        >
          &uarr; SPATIAL DECK
        </button>
        <button
          onClick={handleBackToTop}
          className="text-accent-lime/90 hover:text-accent-lime px-3.5 py-1.5 rounded-lg border border-accent-lime/30 hover:border-accent-lime bg-accent-lime/[0.05] hover:bg-accent-lime/[0.1] transition-all cursor-pointer backdrop-blur-sm"
        >
          &uarr; TOP HERO
        </button>
      </div>

      {/* Main Content Body */}
      <div className="relative z-10 w-full max-w-5xl my-auto py-8 md:py-14">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-accent-lime/10 border border-accent-lime/30 font-mono text-[10px] text-accent-lime tracking-widest uppercase mb-6 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-lime animate-pulse" />
          <span>DIRECT CONTACT // OPEN FOR DESIGN ENGINEERING ROLES</span>
        </div>

        <h2 className="font-display text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white mb-6 leading-[1.12]">
          Bridging tactile design engineering &amp; scalable software.
        </h2>

        <p className="font-sans text-sm sm:text-base md:text-lg text-zinc-300 leading-relaxed max-w-3xl mb-10">
          Kwesi Ankomah-Koranteng &mdash; Ghanaian software engineer and Co-founder &amp; CTO at Arcfield Systems. Crafting hardware-accelerated web experiences, 120 FPS compositor architectures, and resilient full-stack systems. Open for Design Engineering roles, creative technologist positions, and high-impact software builds.
        </p>

        {/* Tactile Action Hub */}
        <div className="flex flex-wrap items-center gap-3.5 mb-10">
          {/* Email Copy Pill */}
          <button
            onClick={handleCopyEmail}
            className={`cursor-pointer px-5 py-3 rounded-xl font-mono text-xs tracking-wider transition-all flex items-center gap-2.5 border backdrop-blur-md ${
              copiedEmail
                ? "bg-accent-lime/15 border-accent-lime text-accent-lime shadow-[0_0_20px_rgba(204,255,0,0.25)]"
                : "bg-white/[0.04] hover:bg-white/[0.08] border-white/15 hover:border-accent-lime/50 text-zinc-200 hover:text-white"
            }`}
          >
            <span className="text-accent-lime">{copiedEmail ? "✓" : "✉"}</span>
            <span>{copiedEmail ? "EMAIL COPIED TO CLIPBOARD" : email}</span>
          </button>

          <a
            href="https://wa.me/233204563873"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-3 rounded-xl font-mono text-xs text-zinc-300 hover:text-white bg-white/[0.03] hover:bg-emerald-500/10 border border-white/12 hover:border-emerald-400/50 transition-all cursor-pointer backdrop-blur-sm flex items-center gap-2"
          >
            <span className="text-emerald-400">💬</span>
            <span>WHATSAPP ↗</span>
          </a>

          <a
            href="https://www.linkedin.com/in/kaykorant"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-3 rounded-xl font-mono text-xs text-zinc-300 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/12 hover:border-white/25 transition-all cursor-pointer backdrop-blur-sm"
          >
            LINKEDIN ↗
          </a>

          <a
            href="https://github.com/KwesiKorant"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-3 rounded-xl font-mono text-xs text-zinc-300 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/12 hover:border-white/25 transition-all cursor-pointer backdrop-blur-sm"
          >
            GITHUB ↗
          </a>
        </div>

        {/* Technical System Footprint Grid */}
        <div className="p-4 sm:p-5 rounded-2xl bg-black/60 border border-white/10 font-mono text-[10px] text-zinc-400 space-y-2.5 backdrop-blur-md max-w-2xl">
          <div className="flex justify-between flex-wrap gap-2">
            <span className="text-zinc-500">ENGINEER:</span>
            <span className="text-zinc-200 font-mono">KWESI ANKOMAH-KORANTENG</span>
          </div>
          <div className="flex justify-between flex-wrap gap-2">
            <span className="text-zinc-500">TARGET ROLE:</span>
            <span className="text-accent-lime font-mono">DESIGN ENGINEER // CREATIVE TECHNOLOGIST</span>
          </div>
          <div className="flex justify-between flex-wrap gap-2">
            <span className="text-zinc-500">STARTUP // ROLE:</span>
            <span className="text-zinc-300 font-mono">ARCFIELD SYSTEMS // CO-FOUNDER &amp; CTO</span>
          </div>
          <div className="flex justify-between flex-wrap gap-2">
            <span className="text-zinc-500">COMPOSITOR STANDARD:</span>
            <span className="text-accent-lime">120 FPS ZERO REFLOW MANDATE</span>
          </div>
          <div className="flex justify-between flex-wrap gap-2">
            <span className="text-zinc-500">LOCATION:</span>
            <span className="text-zinc-300">GHANA // WORLDWIDE REMOTE</span>
          </div>
        </div>
      </div>

      {/* Grounded Terminal Footer Strip (Definitive End of Site) */}
      <div className="relative z-10 w-full pt-8 border-t border-white/10 space-y-4">
        <div className="flex justify-end items-center gap-4 font-mono text-[10px]">
          <button
            onClick={handleBackToTop}
            className="cursor-pointer group flex items-center gap-2 text-zinc-400 hover:text-accent-lime transition-colors"
          >
            <span>RETURN TO TOP</span>
            <span className="text-xs group-hover:-translate-y-0.5 transition-transform">&uarr;</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 font-mono text-[10px] text-zinc-500">
          <div>&copy; 2026 KWESI ANKOMAH-KORANTENG &bull; ALL RIGHTS RESERVED</div>
          <div className="flex items-center flex-wrap gap-3">
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
