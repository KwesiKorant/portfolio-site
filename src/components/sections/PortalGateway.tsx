"use client";

import React, {
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from "react";

export interface PortalGatewayHandle {
  triggerForward: () => void;
  triggerReverse: () => void;
  isWarping: () => boolean;
}

interface PortalGatewayProps {
  onBreachStage3?: () => void;
  onArriveStage1?: () => void;
}

export const PortalGateway = forwardRef<PortalGatewayHandle, PortalGatewayProps>(
  ({ onBreachStage3, onArriveStage1 }, ref) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [isActive, setIsActive] = useState(false);
    const [isFadingOut, setIsFadingOut] = useState(false);
    const [opacity, setOpacity] = useState(0);
    const isWarpingRef = useRef(false);
    const reverseRafRef = useRef<number | null>(null);

    // Preload video on mount
    useEffect(() => {
      const video = videoRef.current;
      if (video) {
        video.load();
      }
    }, []);

    // Forward warp sequence: 2.0s All-Intra cinematic flight into Stage 03
    const triggerForward = useCallback(() => {
      const video = videoRef.current;
      if (!video || isWarpingRef.current) return;

      isWarpingRef.current = true;
      setIsFadingOut(false);
      setIsActive(true);
      setOpacity(1);

      video.currentTime = 0;
      video.playbackRate = 1.0;

      video
        .play()
        .catch((err) => console.warn("Portal forward play blocked:", err));

      // At 1.65s (apex where warp tunnel explodes into deep-space starfield):
      // Breach the 3D dimension and align Stage 03
      setTimeout(() => {
        const spatialEl = document.getElementById("section-spatial");
        if (spatialEl) {
          spatialEl.scrollIntoView({ behavior: "instant" });
        }
        if (onBreachStage3) onBreachStage3();
      }, 1650);

      // At 2.0s (video finish): fade out overlay to reveal active 3D world
      setTimeout(() => {
        setIsFadingOut(true);
        setOpacity(0);
        setTimeout(() => {
          setIsActive(false);
          isWarpingRef.current = false;
        }, 300);
      }, 2000);
    }, [onBreachStage3]);

    // Reverse warp sequence: rewinds from starfield through tunnel back to Stage 01 portrait
    const triggerReverse = useCallback(() => {
      const video = videoRef.current;
      if (!video || isWarpingRef.current) return;

      isWarpingRef.current = true;
      video.pause();
      // Instantly prime at starfield frame matching Stage 03
      video.currentTime = 2.0;

      setIsFadingOut(false);
      setIsActive(true);
      setOpacity(1);

      const startVideoTime = 2.0;
      const durationMs = 1500;
      const startTime = performance.now();

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / durationMs);

        // All-Intra H.264 enables 0ms hardware reverse seek
        video.currentTime = Math.max(0, startVideoTime * (1 - progress));

        if (progress < 1) {
          reverseRafRef.current = requestAnimationFrame(step);
        } else {
          // Reached portrait frame: align Stage 01
          const heroEl = document.getElementById("section-hero");
          if (heroEl) {
            heroEl.scrollIntoView({ behavior: "instant" });
          }
          if (onArriveStage1) onArriveStage1();

          // Fade out overlay to reveal live hero portrait
          setIsFadingOut(true);
          setOpacity(0);
          setTimeout(() => {
            setIsActive(false);
            isWarpingRef.current = false;
          }, 250);
        }
      };

      reverseRafRef.current = requestAnimationFrame(step);
    }, [onArriveStage1]);

    useImperativeHandle(
      ref,
      () => ({
        triggerForward,
        triggerReverse,
        isWarping: () => isWarpingRef.current,
      }),
      [triggerForward, triggerReverse]
    );

    useEffect(() => {
      return () => {
        if (reverseRafRef.current) cancelAnimationFrame(reverseRafRef.current);
      };
    }, []);

    return (
      <div
        className={`fixed inset-0 z-[100] bg-[#050508] overflow-hidden ${
          isFadingOut ? "transition-opacity duration-300 ease-out" : ""
        } ${isActive ? "pointer-events-auto" : "pointer-events-none invisible"}`}
        style={{ opacity: isActive ? opacity : 0 }}
        aria-hidden={!isActive}
      >
        {/* Fullscreen 2.0s All-Intra Warp Video */}
        <video
          ref={videoRef}
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover pointer-events-none"
        >
          <source src="/portal_warp.mp4" type="video/mp4" />
        </video>

        {/* Subtle Edge Vignettes */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050508]/40 via-transparent to-[#050508]/60 pointer-events-none" />

        {/* Cinematic Telemetry Overlay */}
        <div className="absolute top-6 left-6 flex items-center gap-2.5 font-mono text-[11px] tracking-widest text-zinc-300 pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-lime shadow-[0_0_8px_#ccff00] animate-ping" />
          <span>PORTAL GATEWAY // HYPERSPACE CONDUIT ENGAGED</span>
        </div>

        <div className="absolute bottom-6 right-6 font-mono text-[10px] tracking-widest text-zinc-400 pointer-events-none">
          STAGE 02 &bull; DIMENSIONAL TRANSIT &bull; 48 FPS
        </div>
      </div>
    );
  }
);

PortalGateway.displayName = "PortalGateway";
