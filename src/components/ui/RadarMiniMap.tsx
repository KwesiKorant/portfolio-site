import React, { forwardRef, useCallback, useRef } from "react";
import { WORLD_BOUNDS } from "@/data/nodeGraph";

interface RadarMiniMapProps {
  onWarpToCoords: (wx: number, wy: number) => void;
}

export const RadarMiniMap = forwardRef<HTMLCanvasElement, RadarMiniMapProps>(
  ({ onWarpToCoords }, canvasRef) => {
    const isDraggingRef = useRef(false);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const updateCoordsFromPointer = useCallback(
      (clientX: number, clientY: number) => {
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        // The canvas is inside the container with 8px padding and 22px top offset
        const clickX = clientX - (rect.left + 8);
        const clickY = clientY - (rect.top + 22);

        const canvasW = Math.max(10, container.clientWidth - 16);
        const canvasH = Math.max(10, container.clientHeight - 36);

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

    const handlePointerDown = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        isDraggingRef.current = true;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // ignore
        }
        updateCoordsFromPointer(e.clientX, e.clientY);
      },
      [updateCoordsFromPointer]
    );

    const handlePointerMove = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDraggingRef.current) return;
        updateCoordsFromPointer(e.clientX, e.clientY);
      },
      [updateCoordsFromPointer]
    );

    const handlePointerUp = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        if (isDraggingRef.current) {
          isDraggingRef.current = false;
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {
            // ignore
          }
        }
      },
      []
    );

    return (
      <div
        ref={containerRef}
        className="relative w-[124px] xs:w-[136px] sm:w-[155px] h-[116px] sm:h-[122px] bg-[#070912]/90 border border-white/18 hover:border-accent-lime/60 rounded-xl p-1.5 sm:p-2 cursor-crosshair transition-all select-none group touch-none"
        id="radar-container"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        title="Click or drag coordinates to smoothly steer camera in 3D"
      >
        <div className="font-mono text-[9px] tracking-widest text-zinc-300 uppercase mb-1.5 flex justify-between items-center pointer-events-none">
          <span className="font-bold text-accent-lime flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-lime shadow-[0_0_8px_#ccff00] animate-pulse" />
            RADAR 3D
          </span>
          <span className="px-1.5 py-0.2 rounded bg-accent-lime/15 border border-accent-lime/35 text-[8px] text-accent-lime font-semibold">
            DRAG // WARP
          </span>
        </div>
        <canvas
          ref={canvasRef}
          id="radar-canvas"
          width={135}
          height={86}
          className="w-full h-[calc(100%-18px)] block rounded-lg border border-white/10 bg-black/60 pointer-events-none"
        />
      </div>
    );
  }
);

RadarMiniMap.displayName = "RadarMiniMap";
