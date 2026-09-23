"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { NODE_GRAPH } from "@/data/nodeGraph";
import { ClusterType, NodeData } from "@/types/graph";
import { HeroStatement } from "@/components/ui/HeroStatement";
import { HeroMetaBadge } from "@/components/ui/HeroMetaBadge";
import {
  SpatialNodeCard,
  SpatialNodeElement,
} from "@/components/nodes/SpatialNodeCard";
import { HUD } from "@/components/ui/HUD";
import { ProHintsBanner } from "@/components/ui/ProHintsBanner";
import { ProjectDrawer } from "@/components/ui/ProjectDrawer";
import { ShortcutsModal } from "@/components/ui/ShortcutsModal";
import {
  SpatialCanvas,
  type SpatialCanvasHandle,
} from "@/components/canvas/SpatialCanvas";

export default function SpatialPortfolioPage() {
  const [activeNodeId, setActiveNodeId] = useState<string>("root");
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [temporaryHint, setTemporaryHint] = useState<string | null>(null);

  // Refs for zero-reflow 120 FPS updates
  const canvasHandleRef = useRef<SpatialCanvasHandle | null>(null);
  const statementRef = useRef<HTMLDivElement | null>(null);
  const heroBadgeRef = useRef<HTMLDivElement | null>(null);
  const telemetryRef = useRef<HTMLDivElement | null>(null);
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const nodeRefs = useRef<Map<string, SpatialNodeElement>>(new Map());

  const activeCluster: ClusterType =
    NODE_GRAPH.find((n) => n.id === activeNodeId)?.cluster || "root";

  // Trigger network surge
  const handleNetworkSurge = useCallback(() => {
    canvasHandleRef.current?.triggerNetworkSurge();
  }, []);

  // Display temporary hint with auto-reset
  const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleShowTemporaryHint = useCallback((msg: string) => {
    setTemporaryHint(msg);
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    hintTimeoutRef.current = setTimeout(() => {
      setTemporaryHint(null);
    }, 4000);
  }, []);

  // Focus node handler
  const handleFocusNode = useCallback((nodeId: string) => {
    const node = NODE_GRAPH.find((n) => n.id === nodeId);
    if (!node) return;

    setActiveNodeId(nodeId);
    canvasHandleRef.current?.focusNode(nodeId);

    if (node.id !== "root") {
      setSelectedNode(node);
      setIsDrawerOpen(true);
    } else {
      setIsDrawerOpen(false);
    }
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
        case "dossier":
          handleFocusNode("dossier");
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
      // Don't capture when typing in inputs or textareas
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "Escape") {
        setIsDrawerOpen(false);
        setIsGuideOpen(false);
      } else if (e.key === " ") {
        e.preventDefault();
        handleNetworkSurge();
      } else if (e.key === "1") {
        handleFocusNode("root");
      } else if (e.key === "2") {
        handleFocusNode("edge-gateway");
      } else if (e.key === "3") {
        handleFocusNode("hyperscale");
      } else if (e.key === "4") {
        handleFocusNode("infra-compute");
      } else if (e.key === "5") {
        handleFocusNode("dossier");
      } else if (e.key === "?") {
        setIsGuideOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleFocusNode, handleNetworkSurge]);

  return (
    <main style={{ position: "relative", width: "100vw", height: "100vh" }}>
      {/* Three.js Perspective Canvas */}
      <SpatialCanvas
        ref={canvasHandleRef}
        onNodeActivated={setActiveNodeId}
        onShowTemporaryHint={handleShowTemporaryHint}
        statementRef={statementRef}
        heroBadgeRef={heroBadgeRef}
        telemetryRef={telemetryRef}
        radarCanvasRef={radarCanvasRef}
        nodeRefs={nodeRefs}
      />

      {/* Spatial World: 3D perspective projected DOM elements */}
      <div id="spatial-world">
        {/* Bold All-Caps Statement Anchored 55px Above Video */}
        <HeroStatement ref={statementRef} />

        {/* Hero Node Status Badge Anchored 24px Below Video */}
        <HeroMetaBadge
          ref={heroBadgeRef}
          onNetworkSurge={handleNetworkSurge}
        />

        {/* Multi-depth child node cards */}
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
        onNetworkSurge={handleNetworkSurge}
        onResetCamera={() => handleFocusNode("root")}
        onWarpToCoords={(wx, wy) =>
          canvasHandleRef.current?.warpToCoords(wx, wy)
        }
        radarCanvasRef={radarCanvasRef}
      />

      {/* Pro Hint Cycling Ticker Banner */}
      <ProHintsBanner
        onOpenGuide={() => setIsGuideOpen(true)}
        temporaryHint={temporaryHint}
      />

      {/* Slideover Project Deep-Dive Inspector */}
      <ProjectDrawer
        node={selectedNode}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onNetworkSurge={handleNetworkSurge}
      />

      {/* Spatial Controls Cheatsheet Modal */}
      <ShortcutsModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </main>
  );
}
