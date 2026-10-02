import React, { forwardRef, useState, useEffect, useRef, useCallback } from "react";
import { ClusterType } from "@/types/graph";
import { NODE_GRAPH } from "@/data/nodeGraph";
import { MOBILE_NODE_ORDER } from "@/components/canvas/SpatialCanvas";
import { RadarMiniMap } from "./RadarMiniMap";
import {
  isSoundMuted,
  toggleSound,
  subscribeSoundMute,
  playKeyClick,
} from "@/lib/soundEngine";

interface HUDProps {
  activeCluster?: ClusterType;
  activeNodeId?: string;
  onFocusNode?: (nodeId: string) => void;
  onStepMobileOrbit?: (step: 1 | -1) => void;
  mobileOrbitIndex?: number;
  onSelectCluster?: (cluster: ClusterType) => void;
  onOpenGuide: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onContinuousZoom?: (deltaZ: number) => void;
  onPanBy?: (deltaX: number, deltaY: number) => void;
  onRotateBy?: (deltaYaw: number, deltaPitch: number) => void;
  onResetCamera: () => void;
  onWarpToCoords: (wx: number, wy: number) => void;
  radarCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  onReturnToHero?: () => void;
  isWarping?: boolean;
}

// Unified Vector SVG Icons for Flight Controls (Matching 2.75px stroke weight & geometry)
const ChevronIcon = ({
  angle = 0,
  className = "",
}: {
  angle?: number;
  className?: string;
}) => (
  <span
    className="inline-flex items-center justify-center pointer-events-none select-none"
    style={{ transform: `rotate(${angle}deg)` }}
  >
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 15l-6-6-6 6" />
    </svg>
  </span>
);

const ResetGimbalIcon = ({ className = "" }: { className?: string }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const PlusIcon = ({ className = "" }: { className?: string }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const MinusIcon = ({ className = "" }: { className?: string }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M5 12h14" />
  </svg>
);

function useHoldAction(
  onPress: () => void,
  onContinuous: () => void,
  intervalMs = 16
) {
  const isHoldingRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);
  const delayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const stop = useCallback(() => {
    isHoldingRef.current = false;
    if (delayTimerRef.current) {
      clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  const start = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      playKeyClick();
      onPress();
      isHoldingRef.current = true;

      delayTimerRef.current = setTimeout(() => {
        let lastTime = performance.now();
        const loop = () => {
          if (!isHoldingRef.current) return;
          const now = performance.now();
          if (now - lastTime >= intervalMs) {
            onContinuous();
            lastTime = now;
          }
          rafIdRef.current = requestAnimationFrame(loop);
        };
        rafIdRef.current = requestAnimationFrame(loop);
      }, 200);
    },
    [onPress, onContinuous, intervalMs]
  );

  useEffect(() => {
    return stop;
  }, [stop]);

  return {
    onPointerDown: start,
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
  };
}

export const HUD = forwardRef<HTMLDivElement, HUDProps>(
  (
    {
      activeNodeId,
      onFocusNode,
      onStepMobileOrbit,
      mobileOrbitIndex = 0,
      onOpenGuide,
      onZoomIn,
      onZoomOut,
      onContinuousZoom,
      onPanBy,
      onRotateBy,
      onResetCamera,
      onWarpToCoords,
      radarCanvasRef,
      onReturnToHero,
      isWarping = false,
    },
    telemetryRef
  ) => {
    const [muted, setMuted] = useState(false);
    const activeNode =
      activeNodeId && activeNodeId !== "root"
        ? NODE_GRAPH.find((n) => n.id === activeNodeId)
        : NODE_GRAPH.find(
            (n) => n.id === MOBILE_NODE_ORDER[mobileOrbitIndex ?? 0]
          ) || NODE_GRAPH[1];

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

    // Flight control continuous hold handlers
    const zoomInHold = useHoldAction(
      onZoomIn,
      () => (onContinuousZoom ? onContinuousZoom(-24) : onZoomIn()),
      16
    );
    const zoomOutHold = useHoldAction(
      onZoomOut,
      () => (onContinuousZoom ? onContinuousZoom(24) : onZoomOut()),
      16
    );
    const panUpHold = useHoldAction(
      () => onPanBy?.(0, 140),
      () => onPanBy?.(0, 20),
      16
    );
    const panDownHold = useHoldAction(
      () => onPanBy?.(0, -140),
      () => onPanBy?.(0, -20),
      16
    );
    const panLeftHold = useHoldAction(
      () => onPanBy?.(-160, 0),
      () => onPanBy?.(-22, 0),
      16
    );
    const panRightHold = useHoldAction(
      () => onPanBy?.(160, 0),
      () => onPanBy?.(22, 0),
      16
    );
    const rotUpLeftHold = useHoldAction(
      () => onRotateBy?.(-0.065, 0.05),
      () => onRotateBy?.(-0.010, 0.008),
      16
    );
    const rotUpRightHold = useHoldAction(
      () => onRotateBy?.(0.065, 0.05),
      () => onRotateBy?.(0.010, 0.008),
      16
    );
    const rotDownLeftHold = useHoldAction(
      () => onRotateBy?.(-0.065, -0.05),
      () => onRotateBy?.(-0.010, -0.008),
      16
    );
    const rotDownRightHold = useHoldAction(
      () => onRotateBy?.(0.065, -0.05),
      () => onRotateBy?.(0.010, -0.008),
      16
    );

    const [isMobilePodOpen, setIsMobilePodOpen] = useState(false);

    return (
      <div
        className={`absolute inset-0 pointer-events-none flex flex-col justify-between p-4 sm:p-5 md:p-6 z-50 transition-opacity duration-300 ${
          isWarping ? "opacity-0" : "opacity-100"
        }`}
      >
        <header className="flex justify-between items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            {onReturnToHero && (
              <button
                className="flex items-center gap-1.5 sm:gap-2 font-mono text-[10px] sm:text-[11px] tracking-widest uppercase font-semibold text-zinc-200 hover:text-white hover:border-accent-lime/50 bg-[#0c0d14]/96 hover:bg-[#0c0d14] border border-white/15 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl pointer-events-auto cursor-pointer select-none transition-all shadow-md active:scale-95"
                onClick={() => {
                  playKeyClick();
                  onReturnToHero();
                }}
                title="Return to Hero Stage"
                aria-label="Return to Hero"
              >
                <span className="text-[12px] sm:text-[13px] leading-none">&larr;</span>
                <span>HERO</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 pointer-events-auto">
            {/* Audio haptics toggle */}
            <button
              className={`font-mono text-[10px] sm:text-[11px] px-2.5 sm:px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1.5 transition-all shadow-sm ${
                muted
                  ? "bg-white/[0.04] border border-white/15 text-zinc-400 hover:text-zinc-200 hover:border-white/30"
                  : "bg-accent-lime/10 border border-accent-lime/45 text-accent-lime hover:bg-accent-lime/20 hover:text-white"
              }`}
              onClick={handleToggleSound}
              title="Toggle Web Audio Synthesizer"
            >
              <span className="hidden sm:inline">{muted ? "AUDIO: OFF" : "AUDIO: ON"}</span>
              <span className="text-[11px]">{muted ? "🔇" : "🔊"}</span>
            </button>

            <button
              className="bg-accent-lime/10 border border-accent-lime/45 text-accent-lime font-mono text-[10px] sm:text-[11px] px-2.5 sm:px-3.5 py-1.5 rounded-xl cursor-pointer flex items-center gap-1.5 sm:gap-2 hover:bg-accent-lime/20 hover:border-accent-lime hover:text-white transition-all shadow-sm"
              onClick={() => {
                playKeyClick();
                onOpenGuide();
              }}
              title="View Navigation Guide"
            >
              <span>GUIDE</span>
              <kbd className="hidden sm:inline-block">?</kbd>
            </button>
            <div
              className="font-mono text-[10px] sm:text-[11px] tracking-wider text-zinc-300 text-right bg-[#0c0d14]/96 border border-white/15 px-2.5 sm:px-3.5 py-1.5 rounded-xl shadow-sm"
              ref={telemetryRef}
              id="telemetry"
            >
              <span className="hidden sm:inline">POS: [0, 40, 1100] | </span>120 FPS
            </div>
          </div>
        </header>

        <footer className="flex flex-col md:flex-row justify-between items-center md:items-end gap-2.5 sm:gap-5 w-full">
          {/* Mobile Portrait 3D Node Orbit Deck (1-Thumb Step Navigation: Visible only in overview) */}
          {onFocusNode && activeNodeId === "root" && (
            <div className="md:hidden flex items-center justify-between w-full max-w-[340px] px-2.5 py-1.5 bg-[#0a0c16]/96 backdrop-blur-md border border-white/18 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.85),0_0_20px_rgba(204,255,0,0.1)] pointer-events-auto -translate-y-3">
              <button
                onClick={() => {
                  playKeyClick();
                  if (onStepMobileOrbit) {
                    onStepMobileOrbit(-1);
                  } else {
                    const curr = mobileOrbitIndex ?? 0;
                    const prev = (curr - 1 + 6) % 6;
                    onFocusNode(MOBILE_NODE_ORDER[prev]);
                  }
                }}
                className="px-2.5 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-zinc-200 hover:text-accent-lime font-mono text-[9px] font-bold active:scale-90 transition-all cursor-pointer shrink-0 shadow-sm"
                aria-label="Previous Project"
              >
                ◀ PREV
              </button>

              <button
                onClick={() => {
                  playKeyClick();
                  onFocusNode(activeNode?.id || "edge-gateway");
                }}
                className="flex flex-col items-center px-1 text-center cursor-pointer min-w-0 max-w-[190px]"
              >
                <div className="flex items-center gap-1 font-mono text-[7.5px] tracking-wider uppercase text-accent-lime font-bold truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-lime shadow-[0_0_6px_#ccff00] animate-pulse shrink-0" />
                  <span className="truncate">{`0${(mobileOrbitIndex ?? 0) + 1} / 06 • ${activeNode?.badge || "ACTIVE"}`}</span>
                </div>
                <div className="font-display text-[11px] font-bold text-white tracking-tight truncate max-w-[180px]">
                  {activeNode?.title || "SELECT PROJECT ▾"}
                </div>
              </button>

              <button
                onClick={() => {
                  playKeyClick();
                  if (onStepMobileOrbit) {
                    onStepMobileOrbit(1);
                  } else {
                    const curr = mobileOrbitIndex ?? 0;
                    const next = (curr + 1) % 6;
                    onFocusNode(MOBILE_NODE_ORDER[next]);
                  }
                }}
                className="px-2.5 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-zinc-200 hover:text-accent-lime font-mono text-[9px] font-bold active:scale-90 transition-all cursor-pointer shrink-0 shadow-sm"
                aria-label="Next Project"
              >
                NEXT ▶
              </button>
            </div>
          )}

          {/* Left spacer: clean view without bottom-left stage descriptions */}
          <div className="hidden md:block flex-1 pointer-events-none" />

          {/* Center spacer: leaves bottom-center completely clear for ProHintsBanner */}
          <div className="hidden md:block flex-1 pointer-events-none" />

          {/* Right: Tactical Radar Navigation Pod & High-Contrast Flight Controls */}
          <div className="pointer-events-auto self-end md:self-auto">
            {/* Mobile Collapsed Pod Trigger: enhanced with radar sweep beacon to capture attention */}
            {!isMobilePodOpen && (
              <div className="md:hidden relative group pointer-events-auto">
                {/* Ambient radar ping beacon glow (Compositor-only) */}
                <div className="absolute -inset-1 rounded-2xl bg-accent-lime/20 blur-sm opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none" />

                <button
                  onClick={() => {
                    playKeyClick();
                    setIsMobilePodOpen(true);
                  }}
                  className="relative flex items-center gap-2 font-mono text-[9.5px] tracking-wider uppercase font-bold text-white bg-gradient-to-r from-[#0d1020]/98 via-[#131933]/98 to-[#0d1020]/98 border border-accent-lime/60 hover:border-accent-lime px-3 py-1.5 rounded-xl cursor-pointer shadow-[0_0_22px_rgba(204,255,0,0.3),0_8px_24px_rgba(0,0,0,0.9)] ring-1 ring-accent-lime/30 active:scale-95 transition-all"
                  aria-label="Open 3D Radar and Cockpit"
                >
                  {/* Tactical Radar Reticle with Sweeping Beam */}
                  <span className="relative flex items-center justify-center w-4 h-4 rounded-full bg-[#161c36] border border-accent-lime/70 shrink-0 overflow-hidden shadow-[0_0_8px_#ccff00]">
                    <span className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,rgba(204,255,0,0.75)_360deg)] animate-[spin_2s_linear_infinite]" />
                    <span className="relative w-1.5 h-1.5 rounded-full bg-accent-lime shadow-[0_0_6px_#ccff00] z-10" />
                    <span className="absolute inset-0 rounded-full border border-accent-lime/60 animate-ping opacity-50 pointer-events-none" />
                  </span>

                  <span className="text-zinc-100 group-hover:text-white transition-colors tracking-wide">RADAR & COCKPIT</span>

                  <span className="px-1.5 py-0.5 rounded-md bg-accent-lime/20 border border-accent-lime/50 text-accent-lime text-[7.5px] font-black tracking-wider animate-pulse flex items-center gap-0.5">
                    <span>▲</span>
                  </span>
                </button>
              </div>
            )}

            {/* Tactical Pod Container: always flex on desktop md:, toggled on mobile */}
            <div
              className={`${
                isMobilePodOpen ? "flex" : "hidden md:flex"
              } flex-col items-end gap-2 bg-[#0a0c16] border border-white/25 hover:border-accent-lime/70 p-2.5 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.95),0_0_30px_rgba(204,255,0,0.15)] ring-1 ring-white/10 transition-all group max-h-[70dvh] md:max-h-none overflow-hidden`}
            >
              {/* Mobile-only Close Header inside Cockpit */}
              {isMobilePodOpen && (
                <div className="w-full flex md:hidden items-center justify-between pb-1.5 mb-0.5 border-b border-white/10 font-mono text-[9px]">
                  <span className="text-accent-lime font-bold tracking-wider">TACTICAL COCKPIT</span>
                  <button
                    onClick={() => setIsMobilePodOpen(false)}
                    className="text-zinc-400 hover:text-white px-2 py-0.5 rounded bg-white/[0.06] border border-white/12 cursor-pointer font-bold"
                  >
                    ✕ HIDE
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2.5">
                {/* 3D Radar Mini-Map */}
                <RadarMiniMap
                  ref={radarCanvasRef}
                  onWarpToCoords={onWarpToCoords}
                />

                {/* Tactical Divider */}
                <div className="w-[1px] h-[116px] bg-white/10" />

                {/* Zoom / Depth Column (+ / −) */}
                <div className="flex flex-col justify-between h-[122px] w-[38px] gap-1.5">
              <button
                className="flex-1 flex flex-col items-center justify-center bg-[#131626] border border-white/20 hover:border-accent-lime hover:bg-accent-lime/15 text-white hover:text-accent-lime rounded-xl transition-all cursor-pointer shadow-sm active:scale-95 group/btn touch-none"
                {...zoomInHold}
                title="Dolly Forward / Zoom In (+ hold to fly in)"
                aria-label="Zoom In"
              >
                <PlusIcon className="mb-0.5 text-zinc-200 group-hover/btn:text-accent-lime" />
                <span className="text-[7.5px] font-mono font-semibold tracking-wider text-zinc-400 group-hover/btn:text-accent-lime">IN</span>
              </button>
              <button
                className="flex-1 flex flex-col items-center justify-center bg-[#131626] border border-white/20 hover:border-accent-lime hover:bg-accent-lime/15 text-white hover:text-accent-lime rounded-xl transition-all cursor-pointer shadow-sm active:scale-95 group/btn touch-none"
                {...zoomOutHold}
                title="Dolly Backward / Zoom Out (- hold to fly out)"
                aria-label="Zoom Out"
              >
                <MinusIcon className="mb-0.5 text-zinc-200 group-hover/btn:text-accent-lime" />
                <span className="text-[7.5px] font-mono font-semibold tracking-wider text-zinc-400 group-hover/btn:text-accent-lime">OUT</span>
              </button>
            </div>

            {/* Tactical 9-Way Flight & Gimbal D-Pad Matrix (Pan X/Y + Orbit Yaw/Pitch + Center Reset) */}
            <div className="flex flex-col justify-between h-[122px] w-[96px] bg-[#0c0e1a]/80 border border-white/10 rounded-xl p-1.5">
              <div className="font-mono text-[7.5px] tracking-widest text-zinc-400 uppercase text-center font-semibold pb-0.5">
                GIMBAL 3D
              </div>

              {/* D-Pad Grid (3 rows x 3 cols: unified 8-way precision vector chevrons) */}
              <div className="grid grid-cols-3 gap-1 items-center justify-items-center flex-1">
                {/* Row 1: Orbit Up-Left (↖), Pan Up (↑), Orbit Up-Right (↗) */}
                <button
                  className="w-[28px] h-[26px] flex items-center justify-center bg-[#131626] border border-white/20 hover:border-accent-lime hover:bg-accent-lime/20 text-zinc-300 hover:text-accent-lime rounded-lg transition-all cursor-pointer shadow-sm active:scale-90 touch-none group"
                  {...rotUpLeftHold}
                  title="Orbit Up-Left (↖ hold to orbit)"
                  aria-label="Orbit Up-Left"
                >
                  <ChevronIcon angle={-45} className="group-hover:scale-110 transition-transform" />
                </button>

                <button
                  className="w-[28px] h-[26px] flex items-center justify-center bg-[#131626] border border-white/20 hover:border-accent-lime hover:bg-accent-lime/20 text-zinc-300 hover:text-accent-lime rounded-lg transition-all cursor-pointer shadow-sm active:scale-90 touch-none group"
                  {...panUpHold}
                  title="Pan Up (↑ hold to glide)"
                  aria-label="Pan Up"
                >
                  <ChevronIcon angle={0} className="group-hover:scale-110 transition-transform" />
                </button>

                <button
                  className="w-[28px] h-[26px] flex items-center justify-center bg-[#131626] border border-white/20 hover:border-accent-lime hover:bg-accent-lime/20 text-zinc-300 hover:text-accent-lime rounded-lg transition-all cursor-pointer shadow-sm active:scale-90 touch-none group"
                  {...rotUpRightHold}
                  title="Orbit Up-Right (↗ hold to orbit)"
                  aria-label="Orbit Up-Right"
                >
                  <ChevronIcon angle={45} className="group-hover:scale-110 transition-transform" />
                </button>

                {/* Row 2: Pan Left (←), Center Reset (⟳), Pan Right (→) */}
                <button
                  className="w-[28px] h-[26px] flex items-center justify-center bg-[#131626] border border-white/20 hover:border-accent-lime hover:bg-accent-lime/20 text-zinc-300 hover:text-accent-lime rounded-lg transition-all cursor-pointer shadow-sm active:scale-90 touch-none group"
                  {...panLeftHold}
                  title="Pan Left (← hold to glide)"
                  aria-label="Pan Left"
                >
                  <ChevronIcon angle={-90} className="group-hover:scale-110 transition-transform" />
                </button>

                <button
                  className="w-[28px] h-[26px] flex items-center justify-center bg-accent-lime/10 border border-accent-lime/40 hover:border-accent-lime hover:bg-accent-lime/25 text-accent-lime rounded-lg transition-all cursor-pointer shadow-sm active:scale-90 group"
                  onClick={() => {
                    playKeyClick();
                    onResetCamera();
                  }}
                  title="Reset Overview & Orientation (⟳)"
                  aria-label="Reset Overview and Orientation"
                >
                  <ResetGimbalIcon className="transition-transform group-hover:rotate-180 duration-300" />
                </button>

                <button
                  className="w-[28px] h-[26px] flex items-center justify-center bg-[#131626] border border-white/20 hover:border-accent-lime hover:bg-accent-lime/20 text-zinc-300 hover:text-accent-lime rounded-lg transition-all cursor-pointer shadow-sm active:scale-90 touch-none group"
                  {...panRightHold}
                  title="Pan Right (→ hold to glide)"
                  aria-label="Pan Right"
                >
                  <ChevronIcon angle={90} className="group-hover:scale-110 transition-transform" />
                </button>

                {/* Row 3: Orbit Down-Left (↙), Pan Down (↓), Orbit Down-Right (↘) */}
                <button
                  className="w-[28px] h-[26px] flex items-center justify-center bg-[#131626] border border-white/20 hover:border-accent-lime hover:bg-accent-lime/20 text-zinc-300 hover:text-accent-lime rounded-lg transition-all cursor-pointer shadow-sm active:scale-90 touch-none group"
                  {...rotDownLeftHold}
                  title="Orbit Down-Left (↙ hold to orbit)"
                  aria-label="Orbit Down-Left"
                >
                  <ChevronIcon angle={-135} className="group-hover:scale-110 transition-transform" />
                </button>

                <button
                  className="w-[28px] h-[26px] flex items-center justify-center bg-[#131626] border border-white/20 hover:border-accent-lime hover:bg-accent-lime/20 text-zinc-300 hover:text-accent-lime rounded-lg transition-all cursor-pointer shadow-sm active:scale-90 touch-none group"
                  {...panDownHold}
                  title="Pan Down (↓ hold to glide)"
                  aria-label="Pan Down"
                >
                  <ChevronIcon angle={180} className="group-hover:scale-110 transition-transform" />
                </button>

                <button
                  className="w-[28px] h-[26px] flex items-center justify-center bg-[#131626] border border-white/20 hover:border-accent-lime hover:bg-accent-lime/20 text-zinc-300 hover:text-accent-lime rounded-lg transition-all cursor-pointer shadow-sm active:scale-90 touch-none group"
                  {...rotDownRightHold}
                  title="Orbit Down-Right (↘ hold to orbit)"
                  aria-label="Orbit Down-Right"
                >
                  <ChevronIcon angle={135} className="group-hover:scale-110 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  </div>
    );
  }
);

HUD.displayName = "HUD";
