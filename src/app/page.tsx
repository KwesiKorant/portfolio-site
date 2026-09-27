"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { NODE_GRAPH } from "@/data/nodeGraph";
import { ClusterType } from "@/types/graph";
import { HeroStatement } from "@/components/ui/HeroStatement";
import {
  SpatialNodeCard,
  SpatialNodeElement,
} from "@/components/nodes/SpatialNodeCard";
import { HUD } from "@/components/ui/HUD";
import { ProHintsBanner } from "@/components/ui/ProHintsBanner";
import { ShortcutsModal } from "@/components/ui/ShortcutsModal";
import {
  SpatialCanvas,
  type SpatialCanvasHandle,
} from "@/components/canvas/SpatialCanvas";
import { ImageRevealHero } from "@/components/sections/ImageRevealHero";
import {
  PortalGateway,
  type PortalGatewayHandle,
} from "@/components/sections/PortalGateway";
import { MouseScrubSection } from "@/components/sections/MouseScrubSection";
import { FinaleSection } from "@/components/sections/FinaleSection";

export default function SpatialPortfolioPage() {
  const [activeNodeId, setActiveNodeId] = useState<string>("root");
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [temporaryHint, setTemporaryHint] = useState<string | null>(null);
  const [isWarping, setIsWarping] = useState(false);

  // Refs for zero-reflow 120 FPS updates
  const canvasHandleRef = useRef<SpatialCanvasHandle | null>(null);
  const portalGatewayRef = useRef<PortalGatewayHandle | null>(null);
  const statementRef = useRef<HTMLDivElement | null>(null);
  const telemetryRef = useRef<HTMLDivElement | null>(null);
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const nodeRefs = useRef<Map<string, SpatialNodeElement>>(new Map());

  // Portal Gateway Forward & Reverse Transitions
  const handleEnterPortal = useCallback(() => {
    setIsWarping(true);
    portalGatewayRef.current?.triggerForward();
  }, []);

  const handleBreachStage3 = useCallback(() => {
    canvasHandleRef.current?.triggerDimensionalBreach("enter");
    setActiveNodeId("root");
    setTimeout(() => {
      setIsWarping(false);
    }, 380);
  }, []);

  const handleExitToPortal = useCallback(() => {
    setIsWarping(true);
    canvasHandleRef.current?.triggerDimensionalBreach("exit");
    portalGatewayRef.current?.triggerReverse();
  }, []);

  const handleArriveStage1 = useCallback(() => {
    setActiveNodeId("root");
    setTimeout(() => {
      setIsWarping(false);
    }, 200);
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
      } else if (e.key === "?") {
        setIsGuideOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleFocusNode, handleExitToPortal, isGuideOpen, activeNodeId]);

  const handleSelectProjectFromHero = useCallback(
    (projectId: string) => {
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
          onSelectCluster={handleSelectCluster}
          onOpenGuide={() => setIsGuideOpen(true)}
          onZoomIn={() => canvasHandleRef.current?.dollyBy(-220)}
          onZoomOut={() => canvasHandleRef.current?.dollyBy(220)}
          onResetCamera={() => handleFocusNode("root")}
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
