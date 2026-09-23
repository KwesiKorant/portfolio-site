import React, { forwardRef } from "react";

export const HeroStatement = forwardRef<HTMLDivElement>((props, ref) => {
  return (
    <div
      ref={ref}
      className="absolute top-0 left-0 pointer-events-auto w-[820px] max-w-[92vw] text-center flex flex-col items-center [contain:layout_style_paint] will-change-transform origin-center"
      style={{ opacity: 0 }}
      {...props}
    >
      <div className="inline-flex items-center gap-2.5 font-mono text-[11px] tracking-[0.14em] uppercase text-accent-lime mb-3.5 px-4.5 py-1.5 bg-accent-lime/10 border border-accent-lime/45 rounded-full shadow-[0_0_20px_rgba(204,255,0,0.18)] backdrop-blur-md">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-lime shadow-[0_0_10px_#ccff00] animate-pulse" />
        <span className="font-medium">FULL-STACK &bull; DISTRIBUTED ARCHITECTURE</span>
      </div>

      <h1 className="font-display font-bold leading-[0.98] tracking-tight uppercase mb-4">
        <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-[82px] text-white drop-shadow-[0_4px_32px_rgba(0,0,0,0.9)]">
          I&apos;M KWESI
        </span>
        <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-[68px] bg-gradient-to-br from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent drop-shadow-[0_2px_20px_rgba(255,255,255,0.08)]">
          AND THIS IS WHAT I DO
        </span>
      </h1>

      <p className="font-sans text-[15px] leading-relaxed text-zinc-300 max-w-[580px] mb-4.5">
        Architecting high-throughput distributed backends, resilient real-time
        pipelines, and hardware-accelerated GPU web interfaces.
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        <span className="font-mono text-[11px] tracking-wider px-3.5 py-1.5 bg-white/[0.05] border border-white/15 rounded-md text-zinc-300 shadow-sm">
          [ RUST &bull; GO &bull; TYPESCRIPT ]
        </span>
        <span className="font-mono text-[11px] tracking-wider px-3.5 py-1.5 bg-white/[0.05] border border-white/15 rounded-md text-zinc-300 shadow-sm">
          [ SUB-5MS P99 SYSTEMS ]
        </span>
        <span className="font-mono text-[11px] tracking-wider px-3.5 py-1.5 bg-white/[0.05] border border-white/15 rounded-md text-zinc-300 shadow-sm">
          [ DISTRIBUTED CRDTs &bull; KERNEL eBPF ]
        </span>
      </div>
    </div>
  );
});

HeroStatement.displayName = "HeroStatement";
