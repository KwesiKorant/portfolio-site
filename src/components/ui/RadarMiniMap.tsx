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

        const canvasW = 124;
        const canvasH = 80;

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
        className="relative w-[140px] h-[110px] bg-[#0c0c10]/95 backdrop-blur-xl border border-white/15 hover:border-accent-lime/50 rounded-xl p-2.5 pointer-events-auto cursor-crosshair transition-colors select-none shadow-[0_8px_24px_rgba(0,0,0,0.7)]"
        id="radar-container"
        onClick={handleClick}
        title="Click anywhere to warp camera in 3D"
      >
        <div className="font-mono text-[9px] tracking-widest text-zinc-400 uppercase mb-1 flex justify-between">
          <span className="font-medium">RADAR MAP</span>
          <span className="text-accent-lime font-semibold">3D</span>
        </div>
        <canvas
          ref={canvasRef}
          id="radar-canvas"
          width={124}
          height={80}
          className="w-full h-[calc(100%-14px)] block"
        />
      </div>
    );
  }
);

RadarMiniMap.displayName = "RadarMiniMap";
