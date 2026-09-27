import React, { forwardRef, useState, useEffect, useRef, useCallback } from "react";
import { ClusterType } from "@/types/graph";
import { RadarMiniMap } from "./RadarMiniMap";
import {
  isSoundMuted,
  toggleSound,
  subscribeSoundMute,
  playKeyClick,
} from "@/lib/soundEngine";

interface HUDProps {
  activeCluster?: ClusterType;
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
      () => (onContinuousZoom ? onContinuousZoom(-16) : onZoomIn()),
      16
    );
    const zoomOutHold = useHoldAction(
      onZoomOut,
      () => (onContinuousZoom ? onContinuousZoom(16) : onZoomOut()),
      16
    );
    const panUpHold = useHoldAction(
      () => onPanBy?.(0, 100),
      () => onPanBy?.(0, 12),
      16
    );
    const panDownHold = useHoldAction(
      () => onPanBy?.(0, -100),
      () => onPanBy?.(0, -12),
      16
    );
    const panLeftHold = useHoldAction(
      () => onPanBy?.(-120, 0),
      () => onPanBy?.(-14, 0),
      16
    );
    const panRightHold = useHoldAction(
      () => onPanBy?.(120, 0),
      () => onPanBy?.(14, 0),
      16
    );
    const rotLeftHold = useHoldAction(
      () => onRotateBy?.(-0.065, 0),
      () => onRotateBy?.(-0.008, 0),
      16
    );
    const rotRightHold = useHoldAction(
      () => onRotateBy?.(0.065, 0),
      () => onRotateBy?.(0.008, 0),
      16
    );
    const tiltDownHold = useHoldAction(
      () => onRotateBy?.(0, -0.055),
      () => onRotateBy?.(0, -0.0065),
      16
    );
    const tiltUpHold = useHoldAction(
      () => onRotateBy?.(0, 0.055),
      () => onRotateBy?.(0, 0.0065),
      16
    );

    return (
      <div
        className={`absolute inset-0 pointer-events-none flex flex-col justify-between p-5 md:p-6 z-50 transition-opacity duration-300 ${
          isWarping ? "opacity-0" : "opacity-100"
        }`}
      >
        <header className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            {onReturnToHero && (
              <button
                className="flex items-center gap-2 font-mono text-[11px] tracking-widest uppercase font-semibold text-zinc-200 hover:text-white hover:border-accent-lime/50 bg-[#0c0d14]/90 hover:bg-[#0c0d14] backdrop-blur-md border border-white/15 px-4 py-2 rounded-xl pointer-events-auto cursor-pointer select-none transition-all shadow-md active:scale-95"
                onClick={() => {
                  playKeyClick();
                  onReturnToHero();
                }}
                title="Return to Hero Stage"
                aria-label="Return to Hero"
              >
                <span className="text-[13px] leading-none">&larr;</span>
                <span>HERO</span>
              </button>
            )}
          </div>

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
          <div className="flex items-center gap-2.5 pointer-events-auto bg-[#0a0c16]/95 backdrop-blur-xl border border-white/25 hover:border-accent-lime/70 p-2.5 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.95),0_0_30px_rgba(204,255,0,0.15)] ring-1 ring-white/10 transition-all group">
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
                <span className="text-[17px] font-bold leading-none font-mono">+</span>
                <span className="text-[7.5px] font-mono font-semibold tracking-wider text-zinc-400 group-hover/btn:text-accent-lime">IN</span>
              </button>
              <button
                className="flex-1 flex flex-col items-center justify-center bg-[#131626] border border-white/20 hover:border-accent-lime hover:bg-accent-lime/15 text-white hover:text-accent-lime rounded-xl transition-all cursor-pointer shadow-sm active:scale-95 group/btn touch-none"
                {...zoomOutHold}
                title="Dolly Backward / Zoom Out (- hold to fly out)"
                aria-label="Zoom Out"
              >
                <span className="text-[17px] font-bold leading-none font-mono">&minus;</span>
                <span className="text-[7.5px] font-mono font-semibold tracking-wider text-zinc-400 group-hover/btn:text-accent-lime">OUT</span>
              </button>
            </div>

            {/* Tactical 9-Way Flight & Gimbal D-Pad Matrix (Pan X/Y + Orbit Yaw/Pitch + Center Reset) */}
            <div className="flex flex-col justify-between h-[122px] w-[96px] bg-[#0c0e1a]/80 border border-white/10 rounded-xl p-1.5">
              <div className="font-mono text-[7.5px] tracking-widest text-zinc-400 uppercase text-center font-semibold pb-0.5">
                GIMBAL 3D
              </div>

              {/* D-Pad Grid (3 rows x 3 cols) */}
              <div className="grid grid-cols-3 gap-1 items-center justify-items-center flex-1">
                {/* Row 1: Rotate Left (↺), Pan Up (▲), Rotate Right (↻) */}
                <button
                  className="w-[28px] h-[26px] flex items-center justify-center bg-[#131626] border border-white/20 hover:border-accent-lime hover:bg-accent-lime/20 text-zinc-300 hover:text-accent-lime rounded-lg transition-all cursor-pointer shadow-sm active:scale-90 touch-none"
                  {...rotLeftHold}
                  title="Orbit / Rotate Left (↺ hold to turn left)"
                  aria-label="Rotate Left"
                >
                  <span className="text-[12px] leading-none font-mono font-bold">↺</span>
                </button>

                <button
                  className="w-[28px] h-[26px] flex items-center justify-center bg-[#131626] border border-white/20 hover:border-accent-lime hover:bg-accent-lime/20 text-zinc-300 hover:text-accent-lime rounded-lg transition-all cursor-pointer shadow-sm active:scale-90 touch-none"
                  {...panUpHold}
                  title="Pan Up (▲ hold to glide)"
                  aria-label="Pan Up"
                >
                  <span className="text-[10px] leading-none font-mono font-bold">▲</span>
                </button>

                <button
                  className="w-[28px] h-[26px] flex items-center justify-center bg-[#131626] border border-white/20 hover:border-accent-lime hover:bg-accent-lime/20 text-zinc-300 hover:text-accent-lime rounded-lg transition-all cursor-pointer shadow-sm active:scale-90 touch-none"
                  {...rotRightHold}
                  title="Orbit / Rotate Right (↻ hold to turn right)"
                  aria-label="Rotate Right"
                >
                  <span className="text-[12px] leading-none font-mono font-bold">↻</span>
                </button>

                {/* Row 2: Pan Left (◀), Center Reset (⟳), Pan Right (▶) */}
                <button
                  className="w-[28px] h-[26px] flex items-center justify-center bg-[#131626] border border-white/20 hover:border-accent-lime hover:bg-accent-lime/20 text-zinc-300 hover:text-accent-lime rounded-lg transition-all cursor-pointer shadow-sm active:scale-90 touch-none"
                  {...panLeftHold}
                  title="Pan Left (◀ hold to glide)"
                  aria-label="Pan Left"
                >
                  <span className="text-[10px] leading-none font-mono font-bold">◀</span>
                </button>

                <button
                  className="w-[28px] h-[26px] flex items-center justify-center bg-accent-lime/10 border border-accent-lime/40 hover:border-accent-lime hover:bg-accent-lime/25 text-accent-lime rounded-lg transition-all cursor-pointer shadow-sm active:scale-90"
                  onClick={() => {
                    playKeyClick();
                    onResetCamera();
                  }}
                  title="Reset Overview & Orientation (⟳)"
                  aria-label="Reset Overview and Orientation"
                >
                  <span className="text-[12px] font-bold leading-none font-mono">&#8635;</span>
                </button>

                <button
                  className="w-[28px] h-[26px] flex items-center justify-center bg-[#131626] border border-white/20 hover:border-accent-lime hover:bg-accent-lime/20 text-zinc-300 hover:text-accent-lime rounded-lg transition-all cursor-pointer shadow-sm active:scale-90 touch-none"
                  {...panRightHold}
                  title="Pan Right (▶ hold to glide)"
                  aria-label="Pan Right"
                >
                  <span className="text-[10px] leading-none font-mono font-bold">▶</span>
                </button>

                {/* Row 3: Tilt Down (⤹), Pan Down (▼), Tilt Up (⤸) */}
                <button
                  className="w-[28px] h-[26px] flex items-center justify-center bg-[#131626] border border-white/20 hover:border-accent-lime hover:bg-accent-lime/20 text-zinc-300 hover:text-accent-lime rounded-lg transition-all cursor-pointer shadow-sm active:scale-90 touch-none"
                  {...tiltDownHold}
                  title="Tilt Down (⤹ hold to tilt down)"
                  aria-label="Tilt Down"
                >
                  <span className="text-[11px] leading-none font-mono font-bold">⤹</span>
                </button>

                <button
                  className="w-[28px] h-[26px] flex items-center justify-center bg-[#131626] border border-white/20 hover:border-accent-lime hover:bg-accent-lime/20 text-zinc-300 hover:text-accent-lime rounded-lg transition-all cursor-pointer shadow-sm active:scale-90 touch-none"
                  {...panDownHold}
                  title="Pan Down (▼ hold to glide)"
                  aria-label="Pan Down"
                >
                  <span className="text-[10px] leading-none font-mono font-bold">▼</span>
                </button>

                <button
                  className="w-[28px] h-[26px] flex items-center justify-center bg-[#131626] border border-white/20 hover:border-accent-lime hover:bg-accent-lime/20 text-zinc-300 hover:text-accent-lime rounded-lg transition-all cursor-pointer shadow-sm active:scale-90 touch-none"
                  {...tiltUpHold}
                  title="Tilt Up (⤸ hold to tilt up)"
                  aria-label="Tilt Up"
                >
                  <span className="text-[11px] leading-none font-mono font-bold">⤸</span>
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
