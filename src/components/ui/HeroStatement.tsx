import React, { forwardRef } from "react";

export const HeroStatement = forwardRef<HTMLDivElement>((props, ref) => {
  return (
    <div
      ref={ref}
      className="absolute top-0 left-0 pointer-events-auto w-[640px] max-w-[90vw] text-center flex flex-col items-center [contain:layout_style_paint] will-change-transform origin-center"
      style={{ opacity: 0 }}
      {...props}
    >
      <div className="inline-flex items-center gap-1.5 sm:gap-2 font-mono text-[9px] sm:text-[10.5px] tracking-[0.14em] uppercase text-accent-lime mb-2.5 px-3 sm:px-3.5 py-1 bg-accent-lime/10 border border-accent-lime/45 rounded-full shadow-[0_0_20px_rgba(204,255,0,0.18)] backdrop-blur-md">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-lime shadow-[0_0_10px_#ccff00] animate-pulse" />
        <span className="font-medium">DESIGN ENGINEER &bull; CREATIVE TECHNOLOGIST</span>
      </div>

      <h1 className="font-display font-bold leading-[0.98] tracking-tight uppercase mb-2.5">
        <span className="block text-3xl sm:text-5xl md:text-6xl lg:text-[62px] text-white drop-shadow-[0_4px_32px_rgba(0,0,0,0.9)]">
          I&apos;M KWESI
        </span>
        <span className="block text-2xl sm:text-4xl md:text-5xl lg:text-[48px] bg-gradient-to-br from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent drop-shadow-[0_2px_20px_rgba(255,255,255,0.08)]">
          AND THIS IS WHAT I DO
        </span>
      </h1>

      <p className="font-sans text-xs sm:text-[13.5px] leading-relaxed text-zinc-300 max-w-[90vw] sm:max-w-[540px] px-2 sm:px-0">
        Crafting tactile, hardware-accelerated web experiences, 120 FPS compositor
        architectures, and resilient full-stack systems.
      </p>
    </div>
  );
});

HeroStatement.displayName = "HeroStatement";
