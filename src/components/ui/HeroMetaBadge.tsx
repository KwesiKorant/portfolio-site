"use client";

import React, { forwardRef } from "react";

interface HeroMetaBadgeProps {
  onResetView?: () => void;
}

export const HeroMetaBadge = forwardRef<HTMLDivElement, HeroMetaBadgeProps>(
  ({ onResetView }, ref) => {
    return (
      <div
        ref={ref}
        className="absolute top-0 left-0 pointer-events-auto bg-[#0a0a0e]/95 backdrop-blur-xl border border-accent-lime/45 hover:border-accent-lime rounded-xl px-4.5 py-2.5 flex items-center gap-3 font-mono text-[11px] text-zinc-100 shadow-[0_10px_35px_rgba(0,0,0,0.85),0_0_20px_rgba(204,255,0,0.18)] whitespace-nowrap will-change-transform origin-center cursor-pointer transition-[border-color,box-shadow] duration-150 select-none"
        style={{ opacity: 0 }}
        onClick={onResetView}
        title="Active Gateway • Click to center view"
      >
        <span className="status-pulse" />
        <span>
          <strong className="text-white font-semibold">GATEWAY:</strong> KWESI // EDGE_CLIENT (ACTIVE)
        </span>
        <span className="text-zinc-500">&bull;</span>
        <span className="text-accent-lime font-medium">3D PERSPECTIVE FLIGHT</span>
      </div>
    );
  }
);

HeroMetaBadge.displayName = "HeroMetaBadge";
