import React, { forwardRef } from "react";

export const HeroStatement = forwardRef<HTMLDivElement>((props, ref) => {
  return (
    <div
      ref={ref}
      className="absolute top-0 left-0 pointer-events-auto w-[640px] max-w-[90vw] text-center flex flex-col items-center [contain:layout_style_paint] origin-center"
      style={{ opacity: 0 }}
      {...props}
    >
      <div className="inline-flex items-center gap-1.5 sm:gap-2 font-mono text-[7.5px] sm:text-[10.5px] tracking-[0.14em] uppercase text-accent-lime mb-1.5 sm:mb-2.5 px-2.5 sm:px-3.5 py-0.5 sm:py-1 bg-[#0a0c16]/90 border border-accent-lime/45 rounded-full shadow-[0_0_20px_rgba(204,255,0,0.18)]">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-lime shadow-[0_0_10px_#ccff00] animate-pulse" />
        <span className="font-medium">DESIGN ENGINEER &bull; CREATIVE TECHNOLOGIST</span>
      </div>

      <h1 className="font-display font-bold leading-[0.98] tracking-tight uppercase mb-1.5 sm:mb-2.5">
        <span className="block text-[21px] xs:text-[23px] sm:text-5xl md:text-6xl lg:text-[62px] text-white drop-shadow-[0_4px_32px_rgba(0,0,0,0.9)]">
          I&apos;M KWESI
        </span>
        <span className="block text-[15px] xs:text-[17px] sm:text-4xl md:text-5xl lg:text-[48px] bg-gradient-to-br from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent drop-shadow-[0_2px_20px_rgba(255,255,255,0.08)]">
          AND THIS IS WHAT I DO
        </span>
      </h1>

      <p className="font-sans text-[10px] xs:text-[11px] sm:text-[13.5px] leading-relaxed text-zinc-300 max-w-[280px] xs:max-w-[320px] sm:max-w-[540px] px-1 sm:px-0">
        Crafting tactile, hardware-accelerated web experiences, 120 FPS compositor
        architectures, and resilient full-stack systems.
      </p>
    </div>
  );
});

HeroStatement.displayName = "HeroStatement";
