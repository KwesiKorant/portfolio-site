import React, { forwardRef, useCallback } from "react";
import { WORLD_BOUNDS } from "@/data/nodeGraph";

interface RadarMiniMapProps {
  onWarpToCoords: (wx: number, wy: number) => void;
}

export const RadarMiniMap = forwardRef<HTMLCanvasElement, RadarMiniMapProps>(
  ({ onWarpToCoords }, canvasRef) => {
    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        const container = e.currentTarget;
        const rect = container.getBoundingClientRect();
        // The canvas is inside the container with 8px padding
        const clickX = e.clientX - (rect.left + 8);
        const clickY = e.clientY - (rect.top + 22); // accounts for label height

        const canvasW = 135;
        const canvasH = 86;

        const clampedX = Math.max(0, Math.min(clickX, canvasW));
        const clampedY = Math.max(0, Math.min(clickY, canvasH));

        const wx =
          WORLD_BOUNDS.minX +
          (clampedX / canvasW) * (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX);
        const wy =
          WORLD_BOUNDS.maxY -
          (clampedY / canvasH) * (WORLD_BOUNDS.maxY - WORLD_BOUNDS.minY);

        onWarpToCoords(wx, wy);
      },
      [onWarpToCoords]
    );

    return (
      <div
        className="relative w-[155px] h-[122px] bg-[#070912]/90 border border-white/18 hover:border-accent-lime/60 rounded-xl p-2 cursor-crosshair transition-all select-none group"
        id="radar-container"
        onClick={handleClick}
        title="Click coordinates to warp camera position in 3D"
      >
        <div className="font-mono text-[9px] tracking-widest text-zinc-300 uppercase mb-1.5 flex justify-between items-center">
          <span className="font-bold text-accent-lime flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-lime shadow-[0_0_8px_#ccff00] animate-pulse" />
            RADAR 3D
          </span>
          <span className="px-1.5 py-0.2 rounded bg-accent-lime/15 border border-accent-lime/35 text-[8px] text-accent-lime font-semibold">
            WARP CLICK
          </span>
        </div>
        <canvas
          ref={canvasRef}
          id="radar-canvas"
          width={135}
          height={86}
          className="w-full h-[calc(100%-18px)] block rounded-lg border border-white/10 bg-black/60"
        />
      </div>
    );
  }
);

RadarMiniMap.displayName = "RadarMiniMap";
