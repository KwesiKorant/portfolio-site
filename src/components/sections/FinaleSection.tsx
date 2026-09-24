"use client";

import React, { useState } from "react";
import { playCopySuccess, playKeyClick } from "@/lib/soundEngine";

export const FinaleSection: React.FC = () => {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const email = "kwesi@engineer.design";

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(email).then(() => {
      playCopySuccess();
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2400);
    });
  };

  const handleBackToTop = () => {
    playKeyClick();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToSpatial = () => {
    playKeyClick();
    const el = document.getElementById("section-spatial");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer
      id="section-finale"
      className="relative w-full min-h-[100dvh] flex flex-col justify-between p-6 md:p-14 overflow-hidden bg-[#050508] border-t border-white/10 select-none [contain:layout_style_paint]"
      aria-label="Engineer Dossier & Finale"
    >
      {/* Background Matrix Grid Lines */}
      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] [background-size:4rem_4rem] pointer-events-none" />

      {/* Top Bar */}
      <div className="relative z-10 flex justify-between items-center w-full">
        <div className="flex items-center gap-2.5 font-mono text-[11px] tracking-widest text-zinc-300">
          <span className="w-2 h-2 rounded-full bg-accent-lime shadow-[0_0_8px_#ccff00]" />
          <span>STAGE 05 // SYSTEM FINALE &amp; UPLINK</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleToSpatial}
            className="font-mono text-[10px] text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg border border-white/12 hover:border-accent-lime/50 bg-white/[0.04] transition-all cursor-pointer"
          >
            &uarr; SPATIAL DECK
          </button>
          <button
            onClick={handleBackToTop}
            className="font-mono text-[10px] text-accent-lime px-3 py-1.5 rounded-lg border border-accent-lime/40 hover:bg-accent-lime/10 transition-all cursor-pointer"
          >
            TOP // HERO
          </button>
        </div>
      </div>

      {/* Main Dossier Content */}
      <div className="relative z-10 max-w-4xl py-12">
        <div className="font-mono text-xs text-accent-lime tracking-widest uppercase mb-3 font-semibold">
          DIRECT CONTACT &bull; AVAILABILITY: IMMEDIATE
        </div>

        <h2 className="font-display text-4xl md:text-6xl font-bold tracking-tight text-white mb-6">
          Let&apos;s build something extraordinary.
        </h2>

        <p className="font-sans text-base md:text-lg text-zinc-300 leading-relaxed max-w-2xl mb-10">
          Specializing in hardware-accelerated web experiences, high-performance spatial tools, and resilient distributed state. Available for design engineering roles, technical advisory, and high-impact creative web builds.
        </p>

        {/* Interactive Action Hub */}
        <div className="flex flex-wrap items-center gap-4 mb-10">
          <button
            onClick={handleCopyEmail}
            className={`cursor-pointer px-6 py-3.5 rounded-xl font-mono text-xs tracking-wider font-bold transition-all flex items-center gap-2.5 shadow-xl ${
              copiedEmail
                ? "bg-accent-lime text-black shadow-[0_0_20px_rgba(204,255,0,0.4)]"
                : "bg-white text-black hover:bg-zinc-200"
            }`}
          >
            <span>{copiedEmail ? "✓" : "✉"}</span>
            <span>{copiedEmail ? "EMAIL COPIED TO CLIPBOARD" : email}</span>
          </button>

          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3.5 rounded-xl font-mono text-xs text-zinc-200 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 hover:border-white/30 transition-all cursor-pointer"
          >
            GITHUB // REPOSITORIES
          </a>

          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3.5 rounded-xl font-mono text-xs text-zinc-200 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 hover:border-white/30 transition-all cursor-pointer"
          >
            LINKEDIN // PROFILE
          </a>
        </div>

        {/* Security / System Footprint */}
        <div className="p-4 rounded-xl bg-black/60 border border-white/10 max-w-xl font-mono text-[10px] text-zinc-400 space-y-1">
          <div className="flex justify-between">
            <span className="text-zinc-500">SECURITY // PGP:</span>
            <span className="text-zinc-300">4A7F 90B2 C811 09E4 22D1</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">ENGINEERING DISCIPLINE:</span>
            <span className="text-accent-lime">ZERO REFLOW COMPOSITOR MANDATE</span>
          </div>
        </div>
      </div>

      {/* Footer Bottom Strip */}
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-white/10 font-mono text-[10px] text-zinc-500">
        <div>&copy; 2026 KWESI &bull; ALL RIGHTS RESERVED</div>
        <div>CRAFTED WITH THREE.JS &bull; NEXT.JS &bull; WEB AUDIO API</div>
      </div>
    </footer>
  );
};
