"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { NODE_GRAPH } from "@/data/nodeGraph";
import { ClusterType } from "@/types/graph";
import { HeroStatement } from "@/components/ui/HeroStatement";
import {
  SpatialNodeCard,
  SpatialNodeElement,
} from "@/components/nodes/SpatialNodeCard";
import { HUD } from "@/components/ui/HUD";
import { ProHintsBanner } from "@/components/ui/ProHintsBanner";
import {
  SpatialCanvas,
  type SpatialCanvasHandle,
  MOBILE_NODE_ORDER,
} from "@/components/canvas/SpatialCanvas";
import { ImageRevealHero } from "@/components/sections/ImageRevealHero";
import {
  PortalGateway,
  type PortalGatewayHandle,
} from "@/components/sections/PortalGateway";
import type { MouseScrubSectionHandle } from "@/components/sections/MouseScrubSection";

// Offscreen sections dynamically imported for ultra-lean initial bundle (Vercel React Best Practices)
const MouseScrubSection = dynamic(
  () =>
    import("@/components/sections/MouseScrubSection").then(
      (m) => m.MouseScrubSection
    ),
  { ssr: false }
);

const FinaleSection = dynamic(
  () =>
    import("@/components/sections/FinaleSection").then((m) => m.FinaleSection),
  { ssr: false }
);

const ShortcutsModal = dynamic(
  () =>
    import("@/components/ui/ShortcutsModal").then((m) => m.ShortcutsModal),
  { ssr: false }
);

const STAGE_IDS = [
  "section-hero",
  "section-spatial",
  "section-scrub",
  "section-finale",
] as const;

function isInteractiveTarget(target: HTMLElement | null): boolean {
  if (!target) return false;
  return Boolean(
    target.closest(
      "button, a, input, select, textarea, [role='button'], [role='slider'], .hud-controls, #shortcuts-modal, #project-drawer, [data-prevent-stage-nav='true'], .spatial-node-scroll, [data-node-inspect='true']"
    )
  );
}

export default function SpatialPortfolioPage() {
  const [activeNodeId, setActiveNodeId] = useState<string>("root");
  const [mobileOrbitIndex, setMobileOrbitIndex] = useState(0);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [temporaryHint, setTemporaryHint] = useState<string | null>(null);
  const [isWarping, setIsWarping] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);

  // Refs for zero-reflow 120 FPS updates
  const canvasHandleRef = useRef<SpatialCanvasHandle | null>(null);
  const portalGatewayRef = useRef<PortalGatewayHandle | null>(null);
  const mouseScrubHandleRef = useRef<MouseScrubSectionHandle | null>(null);
  const statementRef = useRef<HTMLDivElement | null>(null);
  const telemetryRef = useRef<HTMLDivElement | null>(null);
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const nodeRefs = useRef<Map<string, SpatialNodeElement>>(new Map());

  // Navigation engine coordination refs
  const currentStageRef = useRef(0);
  const isWarpingRef = useRef(isWarping);
  isWarpingRef.current = isWarping;
  const activeNodeIdRef = useRef(activeNodeId);
  activeNodeIdRef.current = activeNodeId;

  const transitionStateRef = useRef<"IDLE" | "TRANSITIONING" | "QUENCHING">("IDLE");
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const quenchingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const quenchingSafetyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stage2ArrivalRef = useRef<number>(0);
  const transitionStartTimeRef = useRef<number>(0);
  const lastNavDirectionRef = useRef<1 | -1>(1);
  const wheelAccumulatorRef = useRef(0);
  const wheelResetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  const handleStepMobileOrbit = useCallback((step: 1 | -1) => {
    setMobileOrbitIndex((prev) => (prev + step + 6) % 6);
    canvasHandleRef.current?.stepMobileOrbit(step);
  }, []);

  // Centralized Inertia Quenching Phase (prevents cascading skips from trailing trackpad momentum)
  const beginQuenching = useCallback(() => {
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = null;
    transitionStateRef.current = "QUENCHING";
    wheelAccumulatorRef.current = 0;

    if (quenchingTimerRef.current) clearTimeout(quenchingTimerRef.current);
    if (quenchingSafetyTimerRef.current) clearTimeout(quenchingSafetyTimerRef.current);

    const settleToIdle = () => {
      if (quenchingTimerRef.current) clearTimeout(quenchingTimerRef.current);
      if (quenchingSafetyTimerRef.current) clearTimeout(quenchingSafetyTimerRef.current);
      quenchingTimerRef.current = null;
      quenchingSafetyTimerRef.current = null;
      transitionStateRef.current = "IDLE";
      wheelAccumulatorRef.current = 0;
    };

    // If no wheel events occur for 180ms after visual scroll finishes, transition safely to IDLE
    quenchingTimerRef.current = setTimeout(settleToIdle, 180);

    // Maximum quenching safety fallback: unconditionally release after 650ms
    quenchingSafetyTimerRef.current = setTimeout(settleToIdle, 650);
  }, []);

  // Portal Gateway Forward & Reverse Transitions
  const handleEnterPortal = useCallback(() => {
    setIsWarping(true);
    portalGatewayRef.current?.triggerForward();
  }, []);

  const handleBreachStage3 = useCallback(() => {
    canvasHandleRef.current?.triggerDimensionalBreach("enter");
    setActiveNodeId("root");
    currentStageRef.current = 1;
    setCurrentStage(1);
    setTimeout(() => {
      setIsWarping(false);
      beginQuenching();
    }, 280);
  }, [beginQuenching]);

  const handleExitToPortal = useCallback(() => {
    setIsWarping(true);
    canvasHandleRef.current?.triggerDimensionalBreach("exit");
    portalGatewayRef.current?.triggerReverse();
  }, []);

  const handleArriveStage1 = useCallback(() => {
    setActiveNodeId("root");
    currentStageRef.current = 0;
    setCurrentStage(0);
    setTimeout(() => {
      setIsWarping(false);
      beginQuenching();
    }, 180);
  }, [beginQuenching]);

  const handleWarmupPortal = useCallback(() => {
    portalGatewayRef.current?.preloadVideo();
  }, []);

  // Centralized Stage Navigator with Non-Extending Momentum Isolation
  const navigateToStage = useCallback(
    (targetIndex: number) => {
      if (targetIndex < 0 || targetIndex >= STAGE_IDS.length) return;
      if (targetIndex === currentStageRef.current) return;
      if (isWarpingRef.current) return;

      const fromIndex = currentStageRef.current;
      const direction: 1 | -1 = targetIndex > fromIndex ? 1 : -1;

      // If already transitioning, allow immediate reversal only if user deliberately changed directions with conviction
      if (transitionStateRef.current !== "IDLE") {
        const timeSinceStart = Date.now() - transitionStartTimeRef.current;
        if (direction === lastNavDirectionRef.current || timeSinceStart < 180) {
          return;
        }
      }

      transitionStateRef.current = "TRANSITIONING";
      transitionStartTimeRef.current = Date.now();
      lastNavDirectionRef.current = direction;
      wheelAccumulatorRef.current = 0;
      currentStageRef.current = targetIndex;
      setCurrentStage(targetIndex);

      if (targetIndex === 1) {
        setActiveNodeId("root");
      }

      // Record arrival timestamp for Stage 2 (Turntable Scrub) and notify scrub controller of direction
      if (targetIndex === 2) {
        stage2ArrivalRef.current = Date.now();
        const arrivalDir: "forward" | "reverse" = fromIndex < 2 ? "forward" : "reverse";
        mouseScrubHandleRef.current?.setArrivalDirection(arrivalDir);
      }

      if (fromIndex === 0 && targetIndex === 1) {
        handleEnterPortal();
        return;
      }

      if (fromIndex === 1 && targetIndex === 0) {
        handleExitToPortal();
        return;
      }

      const targetEl = document.getElementById(STAGE_IDS[targetIndex]);
      if (targetEl) {
        const prefersReducedMotion =
          typeof window !== "undefined" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        targetEl.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "start",
        });
      }

      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      // Fast, non-extending safety fallback: 480ms (visual scroll takes ~380ms)
      transitionTimerRef.current = setTimeout(beginQuenching, 480);

      // Instant release into quenching as soon as browser finishes smooth scroll
      if (typeof window !== "undefined" && "onscrollend" in window) {
        const onScrollEnd = () => {
          window.removeEventListener("scrollend", onScrollEnd);
          beginQuenching();
        };
        window.addEventListener("scrollend", onScrollEnd, { once: true });
      }
    },
    [handleEnterPortal, handleExitToPortal, beginQuenching]
  );

  // Lock scroll propagation during cinematic portal warp (Stage 02) to prevent momentum leakage
  useEffect(() => {
    if (!isWarping) return;
    const preventScroll = (e: Event) => {
      e.preventDefault();
    };
    window.addEventListener("wheel", preventScroll, { passive: false });
    window.addEventListener("touchmove", preventScroll, { passive: false });
    return () => {
      window.removeEventListener("wheel", preventScroll);
      window.removeEventListener("touchmove", preventScroll);
    };
  }, [isWarping]);

  // Viewport synchronization: align stage index if navigated via buttons or links
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    STAGE_IDS.forEach((id, index) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (
              entry.isIntersecting &&
              transitionStateRef.current === "IDLE" &&
              !isWarpingRef.current
            ) {
              currentStageRef.current = index;
              setCurrentStage(index);
            }
          }
        },
        { threshold: 0.55 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, []);

  const activeCluster: ClusterType =
    NODE_GRAPH.find((n) => n.id === activeNodeId)?.cluster || "root";

  // Display temporary hint with auto-reset
  const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleShowTemporaryHint = useCallback((msg: string) => {
    setTemporaryHint(msg);
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    hintTimeoutRef.current = setTimeout(() => {
      setTemporaryHint(null);
    }, 4000);
  }, []);

  // Focus node handler: dollies directly into the card in 3D (no sidebar)
  const handleFocusNode = useCallback((nodeId: string) => {
    setActiveNodeId(nodeId);
    const idx = MOBILE_NODE_ORDER.indexOf(nodeId);
    if (idx !== -1) {
      setMobileOrbitIndex(idx);
    }
    canvasHandleRef.current?.focusNode(nodeId);
  }, []);

  // Cluster selector
  const handleSelectCluster = useCallback(
    (cluster: ClusterType) => {
      switch (cluster) {
        case "root":
          handleFocusNode("root");
          break;
        case "arch":
          handleFocusNode("edge-gateway");
          break;
        case "projects":
          handleFocusNode("hyperscale");
          break;
        case "stack":
          handleFocusNode("infra-compute");
          break;
      }
    },
    [handleFocusNode]
  );

  // Connection hover highlight
  const handleHoverConnection = useCallback(
    (nodeId: string, isHovered: boolean) => {
      canvasHandleRef.current?.highlightConnection(nodeId, isHovered);
    },
    []
  );

  // Keyboard navigation & interaction controller
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "Escape") {
        if (isGuideOpen) {
          setIsGuideOpen(false);
        } else if (activeNodeId !== "root") {
          handleFocusNode("root");
        }
      } else if (e.key === "0") {
        handleExitToPortal();
      } else if (e.key === "1") {
        handleFocusNode("root");
      } else if (e.key === "2") {
        handleFocusNode("edge-gateway");
      } else if (e.key === "3") {
        handleFocusNode("hyperscale");
      } else if (e.key === "4") {
        handleFocusNode("infra-compute");
      } else if (e.key === "ArrowRight") {
        const spatialSection = document.getElementById("section-spatial");
        if (spatialSection) {
          const rect = spatialSection.getBoundingClientRect();
          const inView =
            rect.top < window.innerHeight * 0.75 &&
            rect.bottom > window.innerHeight * 0.25;
          if (inView) {
            e.preventDefault();
            const order = [
              "root",
              "edge-gateway",
              "event-stream",
              "hyperscale",
              "omnisync",
              "kerneltrace",
              "infra-compute",
            ];
            const currIdx = order.indexOf(activeNodeId);
            const nextIdx = (currIdx + 1) % order.length;
            handleFocusNode(order[nextIdx]);
          }
        }
      } else if (e.key === "ArrowLeft") {
        const spatialSection = document.getElementById("section-spatial");
        if (spatialSection) {
          const rect = spatialSection.getBoundingClientRect();
          const inView =
            rect.top < window.innerHeight * 0.75 &&
            rect.bottom > window.innerHeight * 0.25;
          if (inView) {
            e.preventDefault();
            const order = [
              "root",
              "edge-gateway",
              "event-stream",
              "hyperscale",
              "omnisync",
              "kerneltrace",
              "infra-compute",
            ];
            const currIdx = order.indexOf(activeNodeId);
            const prevIdx = (currIdx - 1 + order.length) % order.length;
            handleFocusNode(order[prevIdx]);
          }
        }
      } else if (e.key === "ArrowDown" || e.key === "PageDown") {
        if (!isGuideOpen && transitionStateRef.current === "IDLE" && !isWarpingRef.current) {
          e.preventDefault();
          if (currentStageRef.current < STAGE_IDS.length - 1) {
            navigateToStage(currentStageRef.current + 1);
          }
        }
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        if (!isGuideOpen && transitionStateRef.current === "IDLE" && !isWarpingRef.current) {
          e.preventDefault();
          if (currentStageRef.current > 0) {
            navigateToStage(currentStageRef.current - 1);
          }
        }
      } else if (e.key === "?") {
        setIsGuideOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleFocusNode, handleExitToPortal, isGuideOpen, activeNodeId, navigateToStage]);

  // Centralized Wheel Navigation with Universal Trackpad & Mouse Momentum Quenching
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Allow modal internal scrolling without triggering stage transitions
      if (isGuideOpen) return;

      // If cinematic portal warp is in progress, absorb wheel
      if (isWarpingRef.current) {
        e.preventDefault();
        return;
      }

      // Check if event occurred inside an interactive UI element
      const target = e.target as HTMLElement | null;
      if (isInteractiveTarget(target)) {
        return;
      }

      // During active stage transition or inertia quenching, absorb decaying trackpad inertia to prevent multi-stage skipping
      if (transitionStateRef.current === "TRANSITIONING" || transitionStateRef.current === "QUENCHING") {
        e.preventDefault();
        const wheelDirection: 1 | -1 = e.deltaY > 0 ? 1 : -1;
        const timeSinceStart = Date.now() - transitionStartTimeRef.current;

        // Directional reversal bypass: If user deliberately scrolled in the opposite direction with conviction
        if (
          wheelDirection !== lastNavDirectionRef.current &&
          timeSinceStart > 180 &&
          Math.abs(e.deltaY) > 35
        ) {
          if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
          if (quenchingTimerRef.current) clearTimeout(quenchingTimerRef.current);
          if (quenchingSafetyTimerRef.current) clearTimeout(quenchingSafetyTimerRef.current);
          transitionStateRef.current = "IDLE";
          wheelAccumulatorRef.current = 0;
        } else {
          // If in QUENCHING phase, keep postponing the quiet timer until the trackpad stream actually stops
          if (transitionStateRef.current === "QUENCHING") {
            if (quenchingTimerRef.current) clearTimeout(quenchingTimerRef.current);
            quenchingTimerRef.current = setTimeout(() => {
              if (quenchingSafetyTimerRef.current) clearTimeout(quenchingSafetyTimerRef.current);
              quenchingTimerRef.current = null;
              quenchingSafetyTimerRef.current = null;
              transitionStateRef.current = "IDLE";
              wheelAccumulatorRef.current = 0;
            }, 180);
          }
          return;
        }
      }

      // STAGE 03 (Index 1): Coordinate with SpatialCanvas 3D Dolly Zoom
      if (currentStageRef.current === 1) {
        // If a node card is currently zoomed in:
        if (activeNodeIdRef.current !== "root") {
          // If the wheel occurred INSIDE the inspect card, let the internal card container scroll freely!
          if (target && target.closest(".spatial-node")) {
            return;
          }
          // Only if scrolling OUTSIDE the card on the canvas backdrop, pull out into root overview
          e.preventDefault();
          if (Math.abs(e.deltaY) > 15) {
            handleFocusNode("root");
          }
          return;
        }

        // Overview mode: Prevent window scroll and delegate wheel directly to 3D camera dolly zoom
        e.preventDefault();
        const dollyResult = canvasHandleRef.current?.handleWheelDolly(e.deltaY);
        if (dollyResult === "overscroll-down") {
          navigateToStage(2);
        } else if (dollyResult === "overscroll-up") {
          navigateToStage(0);
        }
        return;
      }

      // STAGE 02 (Index 2 - Turntable Scrub): Asymmetric Scroll-Scrub & Quenched Transitions
      if (currentStageRef.current === 2) {
        const timeSinceStage2Arrival = Date.now() - stage2ArrivalRef.current;
        if (timeSinceStage2Arrival < 400 && e.deltaY > 0) {
          // Absorb initial landing momentum so Stage 1 -> Stage 2 momentum never jerks the turntable
          e.preventDefault();
          return;
        }

        e.preventDefault();
        const scrubResult = mouseScrubHandleRef.current?.handleWheelScrub(e.deltaY);
        if (scrubResult === "overscroll-down") {
          navigateToStage(3);
        } else if (scrubResult === "overscroll-up") {
          navigateToStage(1);
        }
        return;
      }

      // STAGES 00, 03: Direct stage-to-stage navigation with device-normalized thresholds
      e.preventDefault();
      
      // Determine device signature: notched mouse wheel vs continuous trackpad
      const isTrackpad =
        Math.abs(e.deltaY) % 100 !== 0 &&
        Math.abs(e.deltaY) % 120 !== 0 &&
        e.deltaMode === 0;

      wheelAccumulatorRef.current += e.deltaY;
      if (wheelResetTimerRef.current) clearTimeout(wheelResetTimerRef.current);
      wheelResetTimerRef.current = setTimeout(() => {
        wheelAccumulatorRef.current = 0;
      }, isTrackpad ? 220 : 180);

      // Calibrated thresholds per stage & device:
      // Stage 0 (Hero): 120px trackpad / 90px mouse
      // Stage 3 (Finale back to Scrub): 120px trackpad / 90px mouse
      const forwardThreshold = isTrackpad ? 120 : 90;
      const reverseThreshold = isTrackpad ? 120 : 90;

      if (wheelAccumulatorRef.current > forwardThreshold) {
        wheelAccumulatorRef.current = 0;
        if (currentStageRef.current < STAGE_IDS.length - 1) {
          navigateToStage(currentStageRef.current + 1);
        }
      } else if (wheelAccumulatorRef.current < -reverseThreshold) {
        wheelAccumulatorRef.current = 0;
        if (currentStageRef.current > 0) {
          navigateToStage(currentStageRef.current - 1);
        }
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", handleWheel);
      if (wheelResetTimerRef.current) clearTimeout(wheelResetTimerRef.current);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      if (quenchingTimerRef.current) clearTimeout(quenchingTimerRef.current);
      if (quenchingSafetyTimerRef.current) clearTimeout(quenchingSafetyTimerRef.current);
    };
  }, [navigateToStage, handleFocusNode, isGuideOpen]);

  // Centralized Touch Navigation for Natural Mobile Viewport Transitions
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      if (isGuideOpen) return;
      if (isWarpingRef.current) return;
      const target = e.target as HTMLElement | null;
      if (isInteractiveTarget(target)) return;
      if (
        currentStageRef.current === 1 &&
        activeNodeIdRef.current !== "root" &&
        target?.closest(".spatial-node")
      ) {
        return;
      }

      // Unconditionally record touch start coordinates so mobile gestures are never lost!
      touchStartYRef.current = e.touches[0].clientY;
      touchStartXRef.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStartYRef.current === null || touchStartXRef.current === null) return;
      if (e.changedTouches.length !== 1) return;
      if (isGuideOpen || isWarpingRef.current) {
        touchStartYRef.current = null;
        touchStartXRef.current = null;
        return;
      }

      const target = e.target as HTMLElement | null;
      if (isInteractiveTarget(target)) {
        touchStartYRef.current = null;
        touchStartXRef.current = null;
        return;
      }

      const currentY = e.changedTouches[0].clientY;
      const currentX = e.changedTouches[0].clientX;
      const deltaY = touchStartYRef.current - currentY; // positive = swipe up (advance forward)
      const deltaX = currentX - touchStartXRef.current;
      const absDy = Math.abs(deltaY);
      const absDx = Math.abs(deltaX);

      touchStartYRef.current = null;
      touchStartXRef.current = null;

      // Relaxed natural threshold; directional guard guarantees horizontal carousel or scrub gestures are respected
      const TOUCH_THRESHOLD = 38;
      if (absDy < TOUCH_THRESHOLD || absDy <= absDx * 1.15) {
        return;
      }

      // If on Stage 1 and a card is zoomed in, un-zoom to root only if swipe was OUTSIDE the card
      if (currentStageRef.current === 1 && activeNodeIdRef.current !== "root") {
        if (target && target.closest(".spatial-node")) {
          return;
        }
        handleFocusNode("root");
        return;
      }

      if (deltaY > 0) {
        // Swipe UP (finger dragged upward) -> move to next stage
        if (currentStageRef.current < STAGE_IDS.length - 1) {
          navigateToStage(currentStageRef.current + 1);
        }
      } else {
        // Swipe DOWN (finger dragged downward) -> move to previous stage
        if (currentStageRef.current > 0) {
          navigateToStage(currentStageRef.current - 1);
        }
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [navigateToStage, handleFocusNode, isGuideOpen]);

  const handleSelectProjectFromHero = useCallback(
    (projectId: string) => {
      currentStageRef.current = 1;
      setCurrentStage(1);
      const el = document.getElementById("section-spatial");
      el?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => {
        handleFocusNode(projectId);
      }, 400);
    },
    [handleFocusNode]
  );

  return (
    <main className="w-full min-h-screen bg-[#050508] relative">
      {/* STAGE 01: Image Reveal Hero (Cursor Spotlight Mask) */}
      <ImageRevealHero
        onEnterPortal={handleEnterPortal}
        onWarmupPortal={handleWarmupPortal}
        onSelectProject={handleSelectProjectFromHero}
      />

      {/* STAGE 02: Portal Gateway (Fullscreen Fixed Cinematic Conduit Bridge) */}
      <PortalGateway
        ref={portalGatewayRef}
        onBreachStage3={handleBreachStage3}
        onArriveStage1={handleArriveStage1}
      />

      {/* STAGE 03: 3D Spatial Canvas Dimension (Viewport Culled) */}
      <section
        id="section-spatial"
        className="relative w-full h-[100dvh] overflow-hidden bg-[#050508]"
      >
        {/* Seamless transition blends from Stage 02 and into Stage 04 */}
        <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-[#050508] to-transparent pointer-events-none z-[2]" />
        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-[#050508] to-transparent pointer-events-none z-[2]" />

        {/* Three.js Perspective Canvas */}
        <SpatialCanvas
          ref={canvasHandleRef}
          onNodeActivated={setActiveNodeId}
          onShowTemporaryHint={handleShowTemporaryHint}
          statementRef={statementRef}
          telemetryRef={telemetryRef}
          radarCanvasRef={radarCanvasRef}
          nodeRefs={nodeRefs}
          onExitToPortal={handleExitToPortal}
          isWarping={isWarping}
          onStepMobileOrbit={handleStepMobileOrbit}
        />

        {/* Fullscreen Backdrop: Clicking outside the active card sends it back to overview */}
        {activeNodeId !== "root" && (
          <div
            id="card-zoom-backdrop"
            className="absolute inset-0 z-30 cursor-pointer bg-black/80 transition-opacity duration-200"
            onClick={(e) => {
              e.stopPropagation();
              handleFocusNode("root");
            }}
            title="Click outside to zoom out (ESC)"
            aria-label="Click outside to zoom out"
          />
        )}

        {/* Spatial World: 3D perspective projected DOM elements (Elevated to z-40 so active card sits above backdrop) */}
        <div id="spatial-world" className="relative z-40 pointer-events-none">
          <HeroStatement ref={statementRef} />

          {/* Multi-depth child node cards: smoothly zoom in-place on selection */}
          {NODE_GRAPH.filter((n) => n.id !== "root").map((node) => (
            <SpatialNodeCard
              key={node.id}
              ref={(el) => {
                if (el) {
                  nodeRefs.current.set(node.id, el);
                } else {
                  nodeRefs.current.delete(node.id);
                }
              }}
              node={node}
              isActive={activeNodeId === node.id}
              onFocusNode={handleFocusNode}
              onHoverConnection={handleHoverConnection}
            />
          ))}
        </div>

        {/* Technical HUD Overlay */}
        <HUD
          ref={telemetryRef}
          activeCluster={activeCluster}
          activeNodeId={activeNodeId}
          onFocusNode={handleFocusNode}
          onStepMobileOrbit={handleStepMobileOrbit}
          mobileOrbitIndex={mobileOrbitIndex}
          onSelectCluster={handleSelectCluster}
          onOpenGuide={() => setIsGuideOpen(true)}
          onZoomIn={() => canvasHandleRef.current?.dollyBy(-180)}
          onZoomOut={() => canvasHandleRef.current?.dollyBy(180)}
          onContinuousZoom={(dz) => canvasHandleRef.current?.dollyBy(dz)}
          onPanBy={(dx, dy) => canvasHandleRef.current?.panBy(dx, dy)}
          onRotateBy={(dyaw, dpitch) => canvasHandleRef.current?.rotateBy(dyaw, dpitch)}
          onResetCamera={() => {
            canvasHandleRef.current?.resetCamera();
            handleFocusNode("root");
          }}
          onWarpToCoords={(wx, wy) =>
            canvasHandleRef.current?.warpToCoords(wx, wy)
          }
          radarCanvasRef={radarCanvasRef}
          onReturnToHero={handleExitToPortal}
          isWarping={isWarping}
        />

        {/* Pro Hint Cycling Ticker Banner */}
        <ProHintsBanner
          onOpenGuide={() => setIsGuideOpen(true)}
          temporaryHint={temporaryHint}
        />
      </section>

      {/* STAGE 04: Interactive Turntable / Mouse-Controlled Scrub */}
      <MouseScrubSection
        onRegisterHandle={(handle) => {
          mouseScrubHandleRef.current = handle;
        }}
      />

      {/* STAGE 05: Finale / Direct Uplink & Dossier */}
      <FinaleSection />

      {/* Spatial Controls Cheatsheet Modal */}
      <ShortcutsModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </main>
  );
}
