import React, { forwardRef, useState, useEffect } from "react";
import { ClusterType } from "@/types/graph";
import { RadarMiniMap } from "./RadarMiniMap";
import {
  isSoundMuted,
  toggleSound,
  subscribeSoundMute,
  playKeyClick,
} from "@/lib/soundEngine";

interface HUDProps {
  activeCluster: ClusterType;
  onSelectCluster: (cluster: ClusterType) => void;
  onOpenGuide: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetCamera: () => void;
  onWarpToCoords: (wx: number, wy: number) => void;
  radarCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  onReturnToHero?: () => void;
  isWarping?: boolean;
}

export const HUD = forwardRef<HTMLDivElement, HUDProps>(
  (
    {
      activeCluster,
      onSelectCluster,
      onOpenGuide,
      onZoomIn,
      onZoomOut,
      onResetCamera,
      onWarpToCoords,
      radarCanvasRef,
      onReturnToHero,
      isWarping = false,
    },
    telemetryRef
  ) => {
    const [muted, setMuted] = useState(false);

    useEffect(() => {
      setMuted(isSoundMuted());
      const unsub = subscribeSoundMute(setMuted);
      return unsub;
    }, []);

    const handleToggleSound = () => {
      const next = toggleSound();
      setMuted(next);
      if (!next) {
        playKeyClick();
      }
    };

    const handleClusterClick = (c: ClusterType) => {
      playKeyClick();
      onSelectCluster(c);
    };

    return (
      <div
        className={`absolute inset-0 pointer-events-none flex flex-col justify-between p-5 md:p-6 z-50 transition-opacity duration-300 ${
          isWarping ? "opacity-0" : "opacity-100"
        }`}
      >
        <header className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-2.5 font-mono text-[11px] tracking-widest uppercase font-semibold text-zinc-200 hover:text-white pointer-events-auto cursor-pointer select-none px-4 py-2 rounded-xl border border-white/15 hover:border-accent-lime/50 bg-[#0c0d14]/90 backdrop-blur-md transition-all shadow-md"
              onClick={() => handleClusterClick("root")}
              role="button"
              tabIndex={0}
            >
              <span className="status-pulse" />
              <span>KWESI // 3D SPATIAL KERNEL</span>
            </div>
            {onReturnToHero && (
              <button
                className="hidden lg:flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-zinc-400 hover:text-white pointer-events-auto cursor-pointer select-none px-3 py-2 rounded-xl border border-white/10 hover:border-white/25 bg-[#0c0d14]/70 backdrop-blur-md transition-all"
                onClick={() => {
                  playKeyClick();
                  onReturnToHero();
                }}
                title="Return to Hero Portrait via Reverse Portal [ESC / 0]"
              >
                <span>&larr;</span>
                <span>HERO [0]</span>
              </button>
            )}
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
              onClick={() => handleClusterClick("root")}
            >
              [01 // ROOT <kbd>1</kbd>]
            </button>
            <button
              className={`font-mono text-[10px] tracking-wider px-3.5 py-1.5 rounded-lg cursor-pointer inline-flex items-center transition-all ${
                activeCluster === "arch"
                  ? "text-white bg-accent-lime/15 border border-accent-lime shadow-[0_0_15px_rgba(204,255,0,0.25)] font-semibold"
                  : "text-zinc-300 hover:text-white hover:bg-white/[0.08] border border-transparent hover:border-white/12"
              }`}
              onClick={() => handleClusterClick("arch")}
            >
              [02 // ARCH <kbd>2</kbd>]
            </button>
            <button
              className={`font-mono text-[10px] tracking-wider px-3.5 py-1.5 rounded-lg cursor-pointer inline-flex items-center transition-all ${
                activeCluster === "projects"
                  ? "text-white bg-accent-lime/15 border border-accent-lime shadow-[0_0_15px_rgba(204,255,0,0.25)] font-semibold"
                  : "text-zinc-300 hover:text-white hover:bg-white/[0.08] border border-transparent hover:border-white/12"
              }`}
              onClick={() => handleClusterClick("projects")}
            >
              [03 // PROJECTS <kbd>3</kbd>]
            </button>
            <button
              className={`font-mono text-[10px] tracking-wider px-3.5 py-1.5 rounded-lg cursor-pointer inline-flex items-center transition-all ${
                activeCluster === "stack"
                  ? "text-white bg-accent-lime/15 border border-accent-lime shadow-[0_0_15px_rgba(204,255,0,0.25)] font-semibold"
                  : "text-zinc-300 hover:text-white hover:bg-white/[0.08] border border-transparent hover:border-white/12"
              }`}
              onClick={() => handleClusterClick("stack")}
            >
              [04 // SKILLS <kbd>4</kbd>]
            </button>
          </nav>

          <div className="flex items-center gap-2.5 pointer-events-auto">
            {/* Audio haptics toggle */}
            <button
              className={`font-mono text-[11px] px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1.5 transition-all shadow-sm ${
                muted
                  ? "bg-white/[0.04] border border-white/15 text-zinc-400 hover:text-zinc-200 hover:border-white/30"
                  : "bg-accent-lime/10 border border-accent-lime/45 text-accent-lime hover:bg-accent-lime/20 hover:text-white"
              }`}
              onClick={handleToggleSound}
              title="Toggle Web Audio Synthesizer"
            >
              <span>{muted ? "AUDIO: OFF" : "AUDIO: ON"}</span>
              <span className="text-[10px]">{muted ? "🔇" : "🔊"}</span>
            </button>

            <button
              className="bg-accent-lime/10 border border-accent-lime/45 text-accent-lime font-mono text-[11px] px-3.5 py-1.5 rounded-xl cursor-pointer flex items-center gap-2 hover:bg-accent-lime/20 hover:border-accent-lime hover:text-white transition-all shadow-sm"
              onClick={() => {
                playKeyClick();
                onOpenGuide();
              }}
              title="View Navigation Guide"
            >
              <span>GUIDE</span>
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
          {/* Left spacer: clean view without bottom-left stage descriptions */}
          <div className="flex-1 pointer-events-none" />

          {/* Center spacer: leaves bottom-center completely clear for ProHintsBanner */}
          <div className="flex-1 pointer-events-none" />

          {/* Right: Tactical Radar Navigation Pod & High-Contrast Flight Controls */}
          <div className="flex items-center gap-2.5 pointer-events-auto bg-[#0a0c16]/95 backdrop-blur-xl border border-white/25 hover:border-accent-lime/70 p-2 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.95),0_0_30px_rgba(204,255,0,0.15)] ring-1 ring-white/10 transition-all group">
            <RadarMiniMap
              ref={radarCanvasRef}
              onWarpToCoords={onWarpToCoords}
            />

            {/* High-Contrast Cockpit Action Keys */}
            <div className="flex flex-col justify-between h-[122px] w-[50px] gap-1.5">
              <button
                className="flex-1 flex flex-col items-center justify-center bg-[#131626] border border-white/20 hover:border-accent-lime hover:bg-accent-lime/15 text-white hover:text-accent-lime rounded-xl transition-all cursor-pointer shadow-sm active:scale-95 group/btn"
                onClick={() => {
                  playKeyClick();
                  onZoomIn();
                }}
                title="Dolly Forward / Zoom In (+)"
                aria-label="Zoom In"
              >
                <span className="text-[17px] font-bold leading-none font-mono">+</span>
                <span className="text-[7.5px] font-mono font-semibold tracking-wider text-zinc-400 group-hover/btn:text-accent-lime">IN</span>
              </button>
              <button
                className="flex-1 flex flex-col items-center justify-center bg-[#131626] border border-white/20 hover:border-accent-lime hover:bg-accent-lime/15 text-white hover:text-accent-lime rounded-xl transition-all cursor-pointer shadow-sm active:scale-95 group/btn"
                onClick={() => {
                  playKeyClick();
                  onZoomOut();
                }}
                title="Dolly Backward / Zoom Out (-)"
                aria-label="Zoom Out"
              >
                <span className="text-[17px] font-bold leading-none font-mono">&minus;</span>
                <span className="text-[7.5px] font-mono font-semibold tracking-wider text-zinc-400 group-hover/btn:text-accent-lime">OUT</span>
              </button>
              <button
                className="flex-1 flex flex-col items-center justify-center bg-[#131626] border border-white/20 hover:border-accent-lime hover:bg-accent-lime/15 text-accent-lime rounded-xl transition-all cursor-pointer shadow-sm active:scale-95 group/btn"
                onClick={() => {
                  playKeyClick();
                  onResetCamera();
                }}
                title="Reset Overview / Center (1)"
                aria-label="Reset Overview"
              >
                <span className="text-[14px] font-bold leading-none font-mono">&#8635;</span>
                <span className="text-[7.5px] font-mono font-semibold tracking-wider text-zinc-400 group-hover/btn:text-accent-lime">CTR</span>
              </button>
            </div>
          </div>
        </footer>
      </div>
    );
  }
);

HUD.displayName = "HUD";
