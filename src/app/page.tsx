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
      "button, a, input, select, textarea, [role='button'], [role='slider'], .hud-controls, #shortcuts-modal, #project-drawer, [data-prevent-stage-nav='true']"
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

  const transitionStateRef = useRef<"IDLE" | "TRANSITIONING" | "COOLDOWN">("IDLE");
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wheelAccumulatorRef = useRef(0);
  const wheelResetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  const handleStepMobileOrbit = useCallback((step: 1 | -1) => {
    setMobileOrbitIndex((prev) => (prev + step + 6) % 6);
    canvasHandleRef.current?.stepMobileOrbit(step);
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
      transitionStateRef.current = "COOLDOWN";
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = setTimeout(() => {
        transitionStateRef.current = "IDLE";
      }, 300);
    }, 380);
  }, []);

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
      transitionStateRef.current = "COOLDOWN";
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = setTimeout(() => {
        transitionStateRef.current = "IDLE";
      }, 250);
    }, 200);
  }, []);

  const handleWarmupPortal = useCallback(() => {
    portalGatewayRef.current?.preloadVideo();
  }, []);

  // Centralized Stage Navigator with Momentum Isolation
  const navigateToStage = useCallback(
    (targetIndex: number) => {
      if (targetIndex < 0 || targetIndex >= STAGE_IDS.length) return;
      if (targetIndex === currentStageRef.current) return;
      if (transitionStateRef.current !== "IDLE" || isWarpingRef.current) return;

      const fromIndex = currentStageRef.current;
      transitionStateRef.current = "TRANSITIONING";
      wheelAccumulatorRef.current = 0;
      currentStageRef.current = targetIndex;
      setCurrentStage(targetIndex);

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
      transitionTimerRef.current = setTimeout(() => {
        transitionStateRef.current = "COOLDOWN";
        if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = setTimeout(() => {
          transitionStateRef.current = "IDLE";
        }, 250);
      }, 800);
    },
    [handleEnterPortal, handleExitToPortal]
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

  // Centralized Wheel Navigation with Zero-Jank Momentum Absorption
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Allow modal internal scrolling without triggering stage transitions
      if (isGuideOpen) return;

      // If warping or transitioning, absorb all wheel events to swallow kinetic momentum
      if (isWarpingRef.current || transitionStateRef.current === "TRANSITIONING") {
        e.preventDefault();
        return;
      }

      // If in cooldown, absorb and reset cooldown timer (so lingering trackpad momentum dies completely)
      if (transitionStateRef.current === "COOLDOWN") {
        e.preventDefault();
        if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = setTimeout(() => {
          transitionStateRef.current = "IDLE";
        }, 250);
        return;
      }

      // Check if event occurred inside an interactive UI element
      const target = e.target as HTMLElement | null;
      if (isInteractiveTarget(target)) {
        return;
      }

      // Prevent uncoordinated free-scroll blowout
      e.preventDefault();

      // If currently on Stage 1 and a card is zoomed in, un-zoom to root overview first
      if (currentStageRef.current === 1 && activeNodeIdRef.current !== "root") {
        if (Math.abs(e.deltaY) > 20) {
          handleFocusNode("root");
          transitionStateRef.current = "COOLDOWN";
          if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
          cooldownTimerRef.current = setTimeout(() => {
            transitionStateRef.current = "IDLE";
          }, 350);
        }
        return;
      }

      wheelAccumulatorRef.current += e.deltaY;
      if (wheelResetTimerRef.current) clearTimeout(wheelResetTimerRef.current);
      wheelResetTimerRef.current = setTimeout(() => {
        wheelAccumulatorRef.current = 0;
      }, 250);

      const WHEEL_THRESHOLD = 60;

      if (wheelAccumulatorRef.current > WHEEL_THRESHOLD) {
        wheelAccumulatorRef.current = 0;
        if (currentStageRef.current < STAGE_IDS.length - 1) {
          navigateToStage(currentStageRef.current + 1);
        }
      } else if (wheelAccumulatorRef.current < -WHEEL_THRESHOLD) {
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
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  }, [navigateToStage, handleFocusNode, isGuideOpen]);

  // Centralized Touch Navigation for Natural Mobile Viewport Transitions
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      if (isGuideOpen) return;
      if (isWarpingRef.current || transitionStateRef.current !== "IDLE") return;
      const target = e.target as HTMLElement | null;
      if (isInteractiveTarget(target)) return;

      touchStartYRef.current = e.touches[0].clientY;
      touchStartXRef.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStartYRef.current === null || touchStartXRef.current === null) return;
      if (e.changedTouches.length !== 1) return;
      if (isGuideOpen) return;
      if (isWarpingRef.current || transitionStateRef.current !== "IDLE") return;

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
      const TOUCH_THRESHOLD = 45;
      if (absDy < TOUCH_THRESHOLD || absDy <= absDx * 1.15) {
        return;
      }

      // If on Stage 1 and a card is zoomed in, un-zoom to root first
      if (currentStageRef.current === 1 && activeNodeIdRef.current !== "root") {
        handleFocusNode("root");
        transitionStateRef.current = "COOLDOWN";
        if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = setTimeout(() => {
          transitionStateRef.current = "IDLE";
        }, 350);
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
      <MouseScrubSection />

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
