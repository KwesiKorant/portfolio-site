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
  preloadVideo: () => void;
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

    // Forward warp sequence: cinematic flight into Stage 03
    const triggerForward = useCallback(() => {
      const video = videoRef.current;
      if (!video || isWarpingRef.current) return;

      isWarpingRef.current = true;
      setIsFadingOut(false);
      setIsActive(true);
      setOpacity(1);

      const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
      video.currentTime = 0;
      // On mobile, decode at native 1.0x to avoid hardware decoder frame drops; desktop plays at 1.33x
      video.playbackRate = isMobile ? 1.0 : 2.0 / 1.5;

      video
        .play()
        .catch((err) => console.warn("Portal forward play blocked:", err));

      const breachDelay = isMobile ? 1400 : 1240;
      const finishDelay = isMobile ? 1750 : 1500;

      // Breach 3D dimension and align Stage 03
      setTimeout(() => {
        const spatialEl = document.getElementById("section-spatial");
        if (spatialEl) {
          spatialEl.scrollIntoView({ behavior: "instant" });
        }
        if (onBreachStage3) onBreachStage3();
        // Immediately pause video on mobile once breach is reached to release GPU decoder bandwidth
        if (isMobile && video) {
          video.pause();
        }
      }, breachDelay);

      // Fade out overlay to reveal active 3D world
      setTimeout(() => {
        setIsFadingOut(true);
        setOpacity(0);
        setTimeout(() => {
          setIsActive(false);
          isWarpingRef.current = false;
          if (video) video.pause();
        }, 300);
      }, finishDelay);
    }, [onBreachStage3]);

    // Reverse warp sequence: rewinds from starfield through tunnel back to Stage 01 portrait
    const triggerReverse = useCallback(() => {
      const video = videoRef.current;
      if (!video || isWarpingRef.current) return;

      isWarpingRef.current = true;
      video.pause();

      setIsFadingOut(false);
      setIsActive(true);
      setOpacity(1);

      const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

      if (isMobile) {
        // On mobile: avoid per-frame video.currentTime seeking which stalls mobile decoders.
        // Use high-speed 0ms seek to mid-point, instant align Stage 01, and hardware opacity reveal.
        video.currentTime = 0.5;
        setTimeout(() => {
          const heroEl = document.getElementById("section-hero");
          if (heroEl) {
            heroEl.scrollIntoView({ behavior: "instant" });
          }
          if (onArriveStage1) onArriveStage1();
          setIsFadingOut(true);
          setOpacity(0);
          setTimeout(() => {
            setIsActive(false);
            isWarpingRef.current = false;
            if (video) video.pause();
          }, 250);
        }, 350);
        return;
      }

      // Desktop: All-Intra 60 FPS reverse seek
      video.currentTime = 2.0;
      const startVideoTime = 2.0;
      const durationMs = 1500;
      const startTime = performance.now();

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / durationMs);

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

          setIsFadingOut(true);
          setOpacity(0);
          setTimeout(() => {
            setIsActive(false);
            isWarpingRef.current = false;
            if (video) video.pause();
          }, 250);
        }
      };

      reverseRafRef.current = requestAnimationFrame(step);
    }, [onArriveStage1]);

    const preloadVideo = useCallback(() => {
      const video = videoRef.current;
      if (video && video.preload !== "auto") {
        video.preload = "auto";
        video.load();
      }
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        triggerForward,
        triggerReverse,
        preloadVideo,
        isWarping: () => isWarpingRef.current,
      }),
      [triggerForward, triggerReverse, preloadVideo]
    );

    // Warm up video during browser idle time (after initial critical hero paint)
    useEffect(() => {
      if (typeof window === "undefined") return;

      const warmUp = () => {
        if (videoRef.current && videoRef.current.preload !== "auto") {
          videoRef.current.preload = "auto";
          videoRef.current.load();
        }
      };

      if ("requestIdleCallback" in window) {
        const idleId = (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback(warmUp, { timeout: 2200 });
        return () => {
          if ("cancelIdleCallback" in window) {
            (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(idleId);
          }
        };
      } else {
        const timerId = setTimeout(warmUp, 1800);
        return () => clearTimeout(timerId);
      }
    }, []);

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
        onWheel={(e) => e.preventDefault()}
        onTouchMove={(e) => e.preventDefault()}
      >
        {/* Fullscreen 1.5s All-Intra Warp Video */}
        <video
          ref={videoRef}
          muted
          playsInline
          preload="none"
          className="w-full h-full object-cover pointer-events-none"
        >
          <source src="/portal_warp.mp4" type="video/mp4" />
        </video>

        {/* Subtle Edge Vignettes */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050508]/40 via-transparent to-[#050508]/60 pointer-events-none" />
      </div>
    );
  }
);

PortalGateway.displayName = "PortalGateway";
