import React, { forwardRef } from "react";
import { ClusterType } from "@/types/graph";
import { RadarMiniMap } from "./RadarMiniMap";

interface HUDProps {
  activeCluster: ClusterType;
  onSelectCluster: (cluster: ClusterType) => void;
  onOpenGuide: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onNetworkSurge: () => void;
  onResetCamera: () => void;
  onWarpToCoords: (wx: number, wy: number) => void;
  radarCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export const HUD = forwardRef<HTMLDivElement, HUDProps>(
  (
    {
      activeCluster,
      onSelectCluster,
      onOpenGuide,
      onZoomIn,
      onZoomOut,
      onNetworkSurge,
      onResetCamera,
      onWarpToCoords,
      radarCanvasRef,
    },
    telemetryRef
  ) => {
    return (
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-5 md:p-6 z-10">
        <header className="flex justify-between items-center gap-4">
          <div
            className="flex items-center gap-2.5 font-mono text-[11px] tracking-widest uppercase font-semibold text-zinc-200 hover:text-white pointer-events-auto cursor-pointer select-none px-4 py-2 rounded-xl border border-white/15 hover:border-accent-lime/50 bg-[#0c0d14]/90 backdrop-blur-md transition-all shadow-md"
            onClick={() => onSelectCluster("root")}
            role="button"
            tabIndex={0}
          >
            <span className="status-pulse" />
            <span>KWESI // 3D SPATIAL KERNEL</span>
          </div>

          <nav
            className="hidden md:flex items-center gap-1.5 bg-[#0c0d14]/90 backdrop-blur-md border border-white/15 rounded-xl p-1.5 pointer-events-auto shadow-[0_8px_30px_rgba(0,0,0,0.6)]"
            aria-label="Spatial clusters"
          >
            <button
              className={`font-mono text-[10px] tracking-wider px-3.5 py-1.5 rounded-lg cursor-pointer inline-flex items-center transition-all ${
                activeCluster === "root"
                  ? "text-white bg-accent-lime/15 border border-accent-lime shadow-[0_0_15px_rgba(204,255,0,0.25)] font-semibold"
                  : "text-zinc-300 hover:text-white hover:bg-white/[0.08] border border-transparent hover:border-white/12"
              }`}
              onClick={() => onSelectCluster("root")}
            >
              [01 // ROOT <kbd>1</kbd>]
            </button>
            <button
              className={`font-mono text-[10px] tracking-wider px-3.5 py-1.5 rounded-lg cursor-pointer inline-flex items-center transition-all ${
                activeCluster === "arch"
                  ? "text-white bg-accent-lime/15 border border-accent-lime shadow-[0_0_15px_rgba(204,255,0,0.25)] font-semibold"
                  : "text-zinc-300 hover:text-white hover:bg-white/[0.08] border border-transparent hover:border-white/12"
              }`}
              onClick={() => onSelectCluster("arch")}
            >
              [02 // ARCH <kbd>2</kbd>]
            </button>
            <button
              className={`font-mono text-[10px] tracking-wider px-3.5 py-1.5 rounded-lg cursor-pointer inline-flex items-center transition-all ${
                activeCluster === "projects"
                  ? "text-white bg-accent-lime/15 border border-accent-lime shadow-[0_0_15px_rgba(204,255,0,0.25)] font-semibold"
                  : "text-zinc-300 hover:text-white hover:bg-white/[0.08] border border-transparent hover:border-white/12"
              }`}
              onClick={() => onSelectCluster("projects")}
            >
              [03 // PROJECTS <kbd>3</kbd>]
            </button>
            <button
              className={`font-mono text-[10px] tracking-wider px-3.5 py-1.5 rounded-lg cursor-pointer inline-flex items-center transition-all ${
                activeCluster === "stack"
                  ? "text-white bg-accent-lime/15 border border-accent-lime shadow-[0_0_15px_rgba(204,255,0,0.25)] font-semibold"
                  : "text-zinc-300 hover:text-white hover:bg-white/[0.08] border border-transparent hover:border-white/12"
              }`}
              onClick={() => onSelectCluster("stack")}
            >
              [04 // STACK <kbd>4</kbd>]
            </button>
            <button
              className={`font-mono text-[10px] tracking-wider px-3.5 py-1.5 rounded-lg cursor-pointer inline-flex items-center transition-all ${
                activeCluster === "dossier"
                  ? "text-white bg-accent-lime/15 border border-accent-lime shadow-[0_0_15px_rgba(204,255,0,0.25)] font-semibold"
                  : "text-zinc-300 hover:text-white hover:bg-white/[0.08] border border-transparent hover:border-white/12"
              }`}
              onClick={() => onSelectCluster("dossier")}
            >
              [05 // DOSSIER <kbd>5</kbd>]
            </button>
          </nav>

          <div className="flex items-center gap-3.5 pointer-events-auto">
            <button
              className="bg-accent-lime/10 border border-accent-lime/45 text-accent-lime font-mono text-[11px] px-3.5 py-1.5 rounded-xl cursor-pointer flex items-center gap-2 hover:bg-accent-lime/20 hover:border-accent-lime hover:text-white transition-all shadow-sm"
              onClick={onOpenGuide}
              title="View Navigation Guide"
            >
              <span>PRO GUIDE</span>
              <kbd>?</kbd>
            </button>
            <div
              className="font-mono text-[11px] tracking-wider text-zinc-300 text-right bg-[#0c0d14]/90 border border-white/15 px-3.5 py-1.5 rounded-xl backdrop-blur-md shadow-sm"
              ref={telemetryRef}
              id="telemetry"
            >
              POS: [0, 40, 1100] | 120 FPS
            </div>
          </div>
        </header>

        <footer className="flex justify-between items-end gap-5">
          <div className="font-mono text-[11px] text-zinc-400 flex flex-col gap-1.5 bg-[#0c0d14]/90 border border-white/15 px-4 py-2.5 rounded-xl backdrop-blur-md shadow-md">
            <div>
              <strong className="text-zinc-200 font-medium">CAMERA:</strong> 3D PERSPECTIVE WARP-DOLLY
            </div>
            <div>
              <strong className="text-zinc-200 font-medium">GRAPH:</strong> 8 MULTI-DEPTH NODES &bull; ELECTRIC LIME TRACES
            </div>
          </div>

          {/* Center spacer: leaves bottom-center completely clear for ProHintsBanner */}
          <div className="flex-1 pointer-events-none" />

          {/* Right: Radar Mini-Map + Tactile Controls Grouped Together */}
          <div className="flex items-end gap-2.5 pointer-events-auto">
            <RadarMiniMap
              ref={radarCanvasRef}
              onWarpToCoords={onWarpToCoords}
            />

            <div className="flex flex-col gap-1.5">
              <div className="flex gap-1.5">
                <button
                  className="w-[38px] h-[38px] flex items-center justify-center bg-[#0c0d14]/90 backdrop-blur-md border border-white/15 rounded-xl text-zinc-300 font-mono text-[15px] hover:border-accent-lime/60 hover:text-white hover:bg-white/[0.1] active:scale-95 transition-all cursor-pointer shadow-md"
                  onClick={onZoomIn}
                  title="Dolly Forward (+)"
                >
                  +
                </button>
                <button
                  className="w-[38px] h-[38px] flex items-center justify-center bg-[#0c0d14]/90 backdrop-blur-md border border-white/15 rounded-xl text-zinc-300 font-mono text-[15px] hover:border-accent-lime/60 hover:text-white hover:bg-white/[0.1] active:scale-95 transition-all cursor-pointer shadow-md"
                  onClick={onZoomOut}
                  title="Dolly Backward (-)"
                >
                  &minus;
                </button>
              </div>
              <div className="flex gap-1.5">
                <button
                  className="w-[38px] h-[38px] flex items-center justify-center bg-[#0c0d14]/90 backdrop-blur-md border border-white/15 rounded-xl text-zinc-300 font-mono text-[15px] hover:border-accent-lime/60 hover:text-white hover:bg-white/[0.1] active:scale-95 transition-all cursor-pointer shadow-md"
                  onClick={onNetworkSurge}
                  title="Trigger Network Surge (Space)"
                >
                  &#9889;
                </button>
                <button
                  className="w-[38px] h-[38px] flex items-center justify-center bg-[#0c0d14]/90 backdrop-blur-md border border-white/15 rounded-xl text-zinc-300 font-mono text-[15px] hover:border-accent-lime/60 hover:text-white hover:bg-white/[0.1] active:scale-95 transition-all cursor-pointer shadow-md"
                  onClick={onResetCamera}
                  title="Reset View (1)"
                >
                  &#8635;
                </button>
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  }
);

HUD.displayName = "HUD";
