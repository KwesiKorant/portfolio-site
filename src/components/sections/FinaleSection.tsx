"use client";

import React, { useState } from "react";

export const FinaleSection: React.FC = () => {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const email = "kwesi@engineer.design";

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
      id="section-finale"
      className="relative w-full min-h-[100dvh] flex flex-col justify-between py-12 md:py-16 px-6 sm:px-10 md:px-16 lg:px-24 bg-[#050508] select-none [contain:layout_style_paint] overflow-hidden"
      aria-label="Engineer Dossier & Finale"
    >
      {/* Compact Wavy Mesh Grid Background (Curvy wave lines repeating densely edge-to-edge) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <svg
          className="w-full h-full opacity-65"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="wavy-cyber-grid"
              width="28"
              height="28"
              patternUnits="userSpaceOnUse"
            >
              {/* Horizontal sinusoidal wave line (Curvy like waves/ripples) */}
              <path
                d="M 0 14 Q 7 7 14 14 T 28 14"
                fill="none"
                stroke="rgba(204, 255, 0, 0.40)"
                strokeWidth="0.85"
              />
              {/* Vertical sinusoidal wave line */}
              <path
                d="M 14 0 Q 7 7 14 14 T 14 28"
                fill="none"
                stroke="rgba(140, 200, 255, 0.28)"
                strokeWidth="0.75"
              />
            </pattern>
            {/* Smooth radial vignette */}
            <radialGradient id="wavy-fade" cx="50%" cy="40%" r="75%">
              <stop offset="0%" stopColor="#fff" stopOpacity="1" />
              <stop offset="65%" stopColor="#fff" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0.25" />
            </radialGradient>
            <mask id="wavy-grid-mask">
              <rect width="100%" height="100%" fill="url(#wavy-fade)" />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="url(#wavy-cyber-grid)"
            mask="url(#wavy-grid-mask)"
          />
        </svg>

        {/* Ambient bottom depth fade */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#050508]/90 pointer-events-none" />
      </div>

      {/* Broad Blending Light Glow: Seeping from the top into the stage, extending deep onto the page */}
      <div className="absolute -top-36 left-1/2 -translate-x-1/2 w-[1900px] max-w-[98vw] h-[800px] bg-[radial-gradient(ellipse_at_top,rgba(204,255,0,0.22)_0%,rgba(204,255,0,0.08)_38%,rgba(140,200,255,0.035)_60%,transparent_82%)] pointer-events-none z-0" />

      {/* Extended vertical ambient light wash extending ~550px down from the top edge */}
      <div className="absolute top-0 inset-x-0 h-[560px] bg-gradient-to-b from-accent-lime/[0.10] via-accent-lime/[0.03] to-transparent pointer-events-none z-0" />

      {/* Top Border Blending Hairline */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent-lime/65 to-transparent pointer-events-none z-[1]" />

      {/* Secondary ambient depth aura in center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(204,255,0,0.05)_0%,transparent_70%)] pointer-events-none z-0" />

      {/* Top Header Strip: Directly on the page */}
      <div className="relative z-10 flex flex-wrap justify-between items-center gap-4 pb-6 border-b border-white/10 w-full">
        <div className="flex items-center gap-2.5 font-mono text-[11px] tracking-widest text-zinc-300">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-lime shadow-[0_0_8px_#ccff00]" />
          <span>STAGE 05 // SYSTEM TRANSMISSION &amp; DOSSIER</span>
        </div>
        <div className="flex gap-2 font-mono text-[10px]">
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
      </div>

      {/* Main Content Body: Fully structured page layout */}
      <div className="relative z-10 w-full max-w-5xl my-auto py-8 md:py-14">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-accent-lime/10 border border-accent-lime/30 font-mono text-[10px] text-accent-lime tracking-widest uppercase mb-6 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-lime animate-pulse" />
          <span>DIRECT CONTACT // AVAILABILITY: IMMEDIATE</span>
        </div>

        <h2 className="font-display text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white mb-6 leading-[1.12]">
          Bridging creative engineering &amp; high-performance systems.
        </h2>

        <p className="font-sans text-sm sm:text-base md:text-lg text-zinc-300 leading-relaxed max-w-3xl mb-10">
          Specializing in hardware-accelerated web experiences, 120 FPS compositor architecture, and spatial interface engineering. Available for design engineering roles, technical advisory, and high-impact creative builds.
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
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-3 rounded-xl font-mono text-xs text-zinc-300 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/12 hover:border-white/25 transition-all cursor-pointer backdrop-blur-sm"
          >
            GITHUB ↗
          </a>

          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-3 rounded-xl font-mono text-xs text-zinc-300 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/12 hover:border-white/25 transition-all cursor-pointer backdrop-blur-sm"
          >
            LINKEDIN ↗
          </a>
        </div>

        {/* Technical System Footprint Grid */}
        <div className="p-4 sm:p-5 rounded-2xl bg-black/60 border border-white/10 font-mono text-[10px] text-zinc-400 space-y-2.5 backdrop-blur-md max-w-2xl">
          <div className="flex justify-between flex-wrap gap-2">
            <span className="text-zinc-500">SECURITY // PGP:</span>
            <span className="text-zinc-300 font-mono">4A7F 90B2 C811 09E4 22D1</span>
          </div>
          <div className="flex justify-between flex-wrap gap-2">
            <span className="text-zinc-500">COMPOSITOR STANDARD:</span>
            <span className="text-accent-lime">120 FPS ZERO REFLOW MANDATE</span>
          </div>
          <div className="flex justify-between flex-wrap gap-2">
            <span className="text-zinc-500">LOCATION:</span>
            <span className="text-zinc-300">REMOTE // WORLDWIDE INGRESS</span>
          </div>
        </div>
      </div>

      {/* Footer Bottom Strip: Directly on the page */}
      <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center gap-3 pt-6 border-t border-white/10 w-full font-mono text-[10px] text-zinc-500">
        <div>&copy; 2026 KWESI &bull; ALL RIGHTS RESERVED</div>
        <div className="flex items-center gap-3">
          <span>THREE.JS ENGINE</span>
          <span>&bull;</span>
          <span>NEXT.JS APP ROUTER</span>
          <span>&bull;</span>
          <span>ALL-INTRA KINEMATICS</span>
        </div>
      </div>
    </footer>
  );
};
