"use client";

import React, { forwardRef, useCallback, useRef, useState } from "react";
import { NodeData, SubsystemType } from "@/types/graph";
import {
  playCardHover,
  playGroundContactPing,
  playKeyClick,
  playCopySuccess,
} from "@/lib/soundEngine";

interface SpatialNodeCardProps {
  node: NodeData;
  isActive: boolean;
  onFocusNode: (nodeId: string) => void;
  onHoverConnection: (nodeId: string, isHovered: boolean) => void;
}

export interface SpatialNodeElement extends HTMLDivElement {
  _screenX?: number;
  _screenY?: number;
  _scale?: number;
}

function HighlightedCode({ code }: { code: string }) {
  const lines = code.split("\n");
  return (
    <code>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        const isComment = trimmed.startsWith("//") || trimmed.startsWith("#");
        if (isComment) {
          return (
            <div key={idx} className="text-zinc-500 italic font-normal">
              {line}
            </div>
          );
        }

        const parts = line.split(
          /("(?:[^"\\]|\\.)*"|\b(?:pub|async|fn|let|await|match|const|export|function|return|struct|module|for|in|case|default|int|u32|f32|unsafe)\b)/g
        );

        return (
          <div key={idx}>
            {parts.map((p, pIdx) => {
              if (p.startsWith('"') && p.endsWith('"')) {
                return (
                  <span key={pIdx} className="text-emerald-300 font-semibold">
                    {p}
                  </span>
                );
              }
              if (
                /^(pub|async|fn|let|await|match|const|export|function|return|struct|module|for|in|case|default|int|u32|f32|unsafe)$/.test(
                  p
                )
              ) {
                return (
                  <span key={pIdx} className="text-accent-lime font-bold">
                    {p}
                  </span>
                );
              }
              return <span key={pIdx}>{p}</span>;
            })}
          </div>
        );
      })}
    </code>
  );
}

function PipelineDiagram({ type }: { type?: SubsystemType }) {
  const stepsMap: Record<string, string[]> = {
    router: ["Inventory Ingress", "Material Costing", "P&L Engine", "Audit Report"],
    stream: ["3D Camera", "Perspective Math", "Zero-Reflow DOM", "Spatial Audio"],
    vectordb: ["Merchant Store", "Catalog Index", "Geo Ingress", "Consumer Discovery"],
    crdt: ["Pet Profile", "Vaccine Scheduler", "Clinical History", "Care Commerce"],
    ebpf: ["Order Ingress", "Real-Time Bus", "Kitchen Display", "Pickup Alert"],
    cluster: [
      "Type Contract",
      "Component Tree",
      "API Route",
      "Relational DB",
    ],
    identity: [
      "Design Engineer",
      "Co-Founder & CTO",
      "120 FPS Standard",
      "Ghana / Remote",
    ],
  };

  const steps = (type && stepsMap[type]) || [
    "Ingress",
    "Processor",
    "Buffer",
    "Destination",
  ];

  return (
    <div className="mb-3.5 p-3 bg-[#0d101a] border border-white/20 rounded-xl">
      <div className="flex items-center justify-between text-[10.5px] font-mono text-zinc-300 mb-2">
        <span className="text-accent-lime font-bold flex items-center gap-1.5 tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-lime shadow-[0_0_8px_#ccff00] animate-pulse" />
          SYSTEM PIPELINE FLOW
        </span>
        <span className="text-zinc-400 font-mono text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10">
          ZERO-COPY DIRECT
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1.5 font-mono text-[9.5px]">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#141724] border border-white/18 text-center relative shadow-sm"
          >
            <span className="text-[8.5px] text-accent-lime font-bold mb-0.5">0{idx + 1}</span>
            <span className="text-zinc-100 font-semibold leading-tight">
              {step}
            </span>
            {idx < 3 && (
              <span className="absolute -right-2 top-1/2 -translate-y-1/2 text-xs text-accent-lime font-bold z-10 hidden sm:block">
                &rarr;
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SubsystemWidget({ type }: { type?: SubsystemType }) {
  if (!type) return null;

  switch (type) {
    case "router":
      return (
        <div className="mb-3.5 p-3 rounded-xl bg-[#101424] border border-white/20 font-mono text-[9.5px] shadow-sm">
          <div className="flex justify-between items-center text-zinc-300 mb-1.5">
            <span className="flex items-center gap-1.5 text-accent-lime font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-lime shadow-[0_0_8px_#ccff00] animate-pulse" />
              ANYCAST INGRESS
            </span>
            <span className="text-zinc-200 font-semibold">p99: 1.18ms</span>
          </div>
          <div className="h-6 w-full relative overflow-hidden">
            <svg
              className="w-full h-full"
              viewBox="0 0 280 24"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="router-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ccff00" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#ccff00" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 16 Q 35 4, 70 14 T 140 8 T 210 16 T 276 6 L 276 24 L 0 24 Z"
                fill="url(#router-grad)"
              />
              <path
                d="M 0 16 Q 35 4, 70 14 T 140 8 T 210 16 T 276 6"
                fill="none"
                stroke="#ccff00"
                strokeWidth="1.8"
              />
              <circle cx="276" cy="6" r="2.5" fill="#ccff00" />
            </svg>
          </div>
          <div className="flex justify-between text-zinc-400 text-[9px] mt-1.5 font-medium">
            <span>EDGE: 120k req/s</span>
            <span className="text-accent-lime font-bold">
              DROP RATE: 0.00%
            </span>
          </div>
        </div>
      );

    case "stream":
      return (
        <div className="mb-3.5 p-3 rounded-xl bg-[#101424] border border-white/20 font-mono text-[9.5px] shadow-sm">
          <div className="flex justify-between items-center text-zinc-300 mb-1.5">
            <span className="flex items-center gap-1.5 text-accent-cyan font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan shadow-[0_0_8px_#06b6d4] animate-pulse" />
              KAFKA FANOUT
            </span>
            <span className="text-zinc-200 font-semibold">48.2k frames/s</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 w-14 text-[8.5px] font-semibold">SOCKETS</span>
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-accent-cyan w-[78%] rounded-full shadow-[0_0_8px_#06b6d4]" />
              </div>
              <span className="text-zinc-200 text-[9px] font-bold">24k/s</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 w-14 text-[8.5px] font-semibold">PIPELINES</span>
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-accent-lime w-[64%] rounded-full shadow-[0_0_8px_#ccff00]" />
              </div>
              <span className="text-zinc-200 text-[9px] font-bold">24k/s</span>
            </div>
          </div>
        </div>
      );

    case "vectordb":
      return (
        <div className="mb-3.5 p-3 rounded-xl bg-[#101424] border border-white/20 font-mono text-[9.5px] shadow-sm">
          <div className="flex justify-between items-center text-zinc-300 mb-1.5">
            <span className="flex items-center gap-1.5 text-accent-lime font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-lime shadow-[0_0_8px_#ccff00] animate-pulse" />
              HNSW GRAPH
            </span>
            <span className="text-zinc-200 font-semibold">cos_sim: 0.984</span>
          </div>
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-accent-lime"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <polygon
                  points="12 2 2 8.5 2 15.5 12 22 22 15.5 22 8.5 12 2"
                  strokeOpacity="0.6"
                />
                <line x1="12" y1="2" x2="12" y2="22" strokeOpacity="0.4" />
                <line x1="2" y1="8.5" x2="22" y2="8.5" strokeOpacity="0.4" />
                <circle cx="12" cy="12" r="2.5" fill="#ccff00" />
                <circle cx="2" cy="8.5" r="1.5" fill="#06b6d4" />
                <circle cx="22" cy="15.5" r="1.5" fill="#06b6d4" />
              </svg>
              <span className="text-zinc-200 text-[9px] font-bold">1536-DIM SIMD</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-accent-lime/15 text-accent-lime border border-accent-lime/40 text-[8.5px] font-bold">
              AVX-512 FMA
            </span>
          </div>
        </div>
      );

    case "crdt":
      return (
        <div className="mb-3.5 p-3 rounded-xl bg-[#101424] border border-white/20 font-mono text-[9.5px] shadow-sm">
          <div className="flex justify-between items-center text-zinc-300 mb-1.5">
            <span className="flex items-center gap-1.5 text-accent-emerald font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald shadow-[0_0_8px_#10b981] animate-pulse" />
              PEER MESH
            </span>
            <span className="text-emerald-400 font-bold">CONVERGED</span>
          </div>
          <div className="flex items-center justify-between text-[9px] px-1 text-zinc-200">
            <span className="px-2 py-0.5 rounded bg-white/10 border border-white/18 font-bold">
              PEER A
            </span>
            <span className="text-accent-emerald font-bold">&harr;</span>
            <span className="px-2 py-0.5 rounded bg-white/10 border border-white/18 font-bold">
              PEER B
            </span>
            <span className="text-accent-emerald font-bold">&harr;</span>
            <span className="px-2 py-0.5 rounded bg-white/10 border border-white/18 font-bold">
              PEER C
            </span>
          </div>
          <div className="text-[8.5px] text-zinc-400 mt-1.5 text-center font-medium">
            VECTOR CLOCK: [P1:42, P2:89, P3:15] &bull; 0 SPLIT-BRAIN
          </div>
        </div>
      );

    case "ebpf":
      return (
        <div className="mb-3.5 p-3 rounded-xl bg-[#101424] border border-white/20 font-mono text-[9px] leading-tight shadow-sm">
          <div className="flex justify-between items-center text-zinc-300 mb-1.5">
            <span className="flex items-center gap-1.5 text-accent-cyan font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan shadow-[0_0_8px_#06b6d4] animate-pulse" />
              KERNEL PROBES
            </span>
            <span className="text-zinc-300 font-bold">&lt; 0.8% CPU</span>
          </div>
          <div className="bg-[#05060a] rounded-lg p-2 border border-white/12 text-zinc-300 space-y-1 font-mono text-[9px]">
            <div className="text-accent-cyan font-semibold truncate">
              &gt; sys_enter_connect: pid 3841 (0.12ms)
            </div>
            <div className="text-zinc-400 truncate">
              &gt; ringbuf_submit: 64B [VERIFIED]
            </div>
          </div>
        </div>
      );

    case "cluster":
      return (
        <div className="mb-3.5 p-3 rounded-xl bg-[#101424] border border-white/20 font-mono text-[9.5px] shadow-sm">
          <div className="flex justify-between items-center text-zinc-300 mb-1.5">
            <span className="flex items-center gap-1.5 text-accent-lime font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-lime shadow-[0_0_8px_#ccff00] animate-pulse" />
              POD REPLICAS
            </span>
            <span className="text-emerald-400 font-bold">
              128/128 HEALTHY
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1 text-[8.5px] text-center font-bold">
            <div className="py-0.5 rounded bg-emerald-500/25 text-emerald-300 border border-emerald-500/40">
              US-E
            </div>
            <div className="py-0.5 rounded bg-emerald-500/25 text-emerald-300 border border-emerald-500/40">
              US-W
            </div>
            <div className="py-0.5 rounded bg-emerald-500/25 text-emerald-300 border border-emerald-500/40">
              EU-C
            </div>
            <div className="py-0.5 rounded bg-emerald-500/25 text-emerald-300 border border-emerald-500/40">
              AP-S
            </div>
          </div>
        </div>
      );

    case "identity":
      return (
        <div className="mb-3.5 p-3 rounded-xl bg-[#101424] border border-white/20 font-mono text-[9.5px] shadow-sm">
          <div className="flex justify-between items-center text-zinc-300 mb-1.5">
            <span className="flex items-center gap-1.5 text-accent-lime font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-lime shadow-[0_0_8px_#ccff00] animate-pulse" />
              VERIFIED KEY
            </span>
            <span className="text-zinc-100 font-bold">ED25519</span>
          </div>
          <div className="text-[9px] text-zinc-300 tracking-wider truncate font-semibold">
            FINGERPRINT: 4A7F 90B2 C811 09E4
          </div>
          <div className="flex justify-between text-[8.5px] text-zinc-400 mt-1.5 font-medium">
            <span>UPTIME: 99.99%</span>
            <span className="text-accent-lime font-bold">
              SYSTEM ARCHITECT
            </span>
          </div>
        </div>
      );

    default:
      return null;
  }
}

export const SpatialNodeCard = forwardRef<
  SpatialNodeElement,
  SpatialNodeCardProps
>(({ node, isActive, onFocusNode, onHoverConnection }, ref) => {
  const innerCardRef = useRef<HTMLDivElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<"screenshots" | "code">(
    node.screenshots && node.screenshots.length > 0 ? "screenshots" : "code"
  );
  const [selectedScreenshotIdx, setSelectedScreenshotIdx] = useState(0);

  const handleMouseEnter = useCallback(() => {
    if (isActive) return;
    playCardHover();
    setTimeout(() => {
      playGroundContactPing(node.badgeColor as "lime" | "cyan" | "emerald");
    }, 180);
    onHoverConnection(node.id, true);
  }, [isActive, node.id, node.badgeColor, onHoverConnection]);

  // Enhanced 3D Tilt with dynamic holographic light sheen
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isActive) return; // Keep level when zoomed into content
      const inner = innerCardRef.current;
      if (!inner) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const normX = (e.clientX - rect.left) / rect.width - 0.5;
      const normY = (e.clientY - rect.top) / rect.height - 0.5;

      inner.style.setProperty("--mouse-x", `${(normX * 100).toFixed(1)}%`);
      inner.style.setProperty("--mouse-y", `${(normY * 100).toFixed(1)}%`);

      // Tuned dynamic tilt: ±26° X/Y, 18px Z-lift, 1.04 scale
      inner.style.transform = `rotateX(${-normY * 26}deg) rotateY(${normX * 26}deg) translateZ(18px) scale3d(1.04, 1.04, 1)`;
    },
    [isActive]
  );

  const handleMouseLeave = useCallback(() => {
    const inner = innerCardRef.current;
    if (inner && !isActive) {
      inner.style.transition =
        "transform 360ms cubic-bezier(0.16, 1, 0.3, 1), border-color 200ms ease, box-shadow 200ms ease";
      inner.style.transform =
        "rotateX(0deg) rotateY(0deg) translateZ(0px) scale3d(1, 1, 1)";
    }
    onHoverConnection(node.id, false);
  }, [isActive, node.id, onHoverConnection]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      playKeyClick();
      if (!isActive) {
        onFocusNode(node.id);
      }
    },
    [isActive, node.id, onFocusNode]
  );

  const handleCloseZoom = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      playKeyClick();
      onFocusNode("root");
    },
    [onFocusNode]
  );

  const handleCopyCode = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!node.code) return;
      navigator.clipboard.writeText(node.code).then(() => {
        playCopySuccess();
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      });
    },
    [node.code]
  );

  const badgeColorClass =
    node.badgeColor === "cyan"
      ? "text-accent-cyan border-accent-cyan/35 bg-accent-cyan/10"
      : node.badgeColor === "emerald"
      ? "text-accent-emerald border-accent-emerald/35 bg-accent-emerald/10"
      : "text-accent-lime border-accent-lime/35 bg-accent-lime/10";

  return (
    <div
      ref={ref}
      id={`node-${node.id}`}
      className={`spatial-node absolute top-0 left-0 pointer-events-auto origin-center select-none transition-opacity duration-200 ease-out ${
        isActive
          ? "w-[1040px] max-w-[94vw] z-50 cursor-default"
          : "w-[330px] max-w-[90vw] z-20 cursor-pointer"
      }`}
      style={{ opacity: 0, pointerEvents: "none" }}
      onClick={handleClick}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Inner Card: 3D tilt when idle, crisp 2D flat rendering when active */}
      <div
        ref={innerCardRef}
        className={`relative rounded-2xl border text-zinc-100 group transition-[border-color,box-shadow] duration-150 ease-out overflow-hidden antialiased ${
          isActive
            ? "p-6 bg-[#0a0c16] border-2 border-accent-lime shadow-[0_0_60px_rgba(204,255,0,0.3),0_25px_80px_rgba(0,0,0,1)] ring-1 ring-white/20 overflow-hidden [transform-style:flat]"
            : "p-5 bg-[#0c0d14] border-white/15 hover:border-accent-lime/60 shadow-[0_10px_35px_rgba(0,0,0,0.7)] hover:shadow-[0_16px_50px_rgba(0,0,0,0.9)] [transform-style:preserve-3d]"
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={isActive ? { transform: "none" } : undefined}
      >
        {/* Holographic dynamic glare tracking pointer */}
        {!isActive && (
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"
            style={{
              background: `radial-gradient(circle at calc(50% + var(--mouse-x, 0%)) calc(50% + var(--mouse-y, 0%)), rgba(255,255,255,0.08) 0%, rgba(204,255,0,0.04) 40%, transparent 70%)`,
            }}
          />
        )}

        {/* Ambient edge aura */}
        <div
          className={`absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-accent-lime/25 via-transparent to-accent-cyan/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none -z-10 ${
            isActive ? "opacity-100" : ""
          }`}
        />

        {/* Header Bar */}
        <div className="flex items-center justify-between gap-3 mb-2.5 font-mono text-[10px] tracking-wider uppercase text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-300">{node.category}</span>
            {isActive && (
              <span className="text-zinc-600 font-mono text-[9px] hidden sm:inline">
                // SYSTEM DEEP DIVE
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-md font-mono font-medium text-[10px] shadow-sm ${badgeColorClass}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
              {node.badge}
            </span>
            {isActive && (
              <button
                onClick={handleCloseZoom}
                className="px-2 py-1 rounded-md bg-white/[0.08] hover:bg-white/[0.18] border border-white/20 text-zinc-300 hover:text-white flex items-center gap-1 font-mono text-[10px] cursor-pointer transition-colors"
                title="Zoom Out / Overview (ESC)"
                aria-label="Zoom Out"
              >
                <span>&times; ESC</span>
              </button>
            )}
          </div>
        </div>

        {/* Widescreen Landscape Layout when Active */}
        {isActive ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Specs, Metrics, Description */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-3.5">
                <div>
                  <div className="font-display text-[22px] font-bold text-white mb-1.5 tracking-tight">
                    {node.title}
                  </div>
                  {node.role && (
                    <div className="inline-flex items-center gap-1.5 mb-2 font-mono text-[10px] text-zinc-300 bg-white/[0.04] border border-white/10 px-2.5 py-1 rounded-md">
                      <span className="text-zinc-500 font-semibold">ROLE //</span>
                      <span className="text-accent-lime font-medium">{node.role}</span>
                    </div>
                  )}
                  {node.desc && (
                    <div className="font-sans text-[13px] leading-relaxed text-zinc-200 mb-3 font-normal">
                      {node.desc}
                    </div>
                  )}

                  {/* Structured Case Study Highlights */}
                  {(node.problem || node.solution || node.impact) && (
                    <div className="space-y-2 mb-3 font-sans text-[11px] leading-relaxed">
                      {node.problem && (
                        <div className="p-2.5 rounded-lg bg-red-950/25 border border-red-500/20 text-zinc-300">
                          <span className="font-mono text-[9px] text-red-400 font-semibold uppercase tracking-wider block mb-0.5">
                            PROBLEM &bull;
                          </span>
                          {node.problem}
                        </div>
                      )}
                      {node.solution && (
                        <div className="p-2.5 rounded-lg bg-emerald-950/25 border border-emerald-500/20 text-zinc-300">
                          <span className="font-mono text-[9px] text-emerald-400 font-semibold uppercase tracking-wider block mb-0.5">
                            SOLUTION &bull;
                          </span>
                          {node.solution}
                        </div>
                      )}
                      {node.impact && (
                        <div className="p-2.5 rounded-lg bg-accent-lime/10 border border-accent-lime/20 text-zinc-200">
                          <span className="font-mono text-[9px] text-accent-lime font-semibold uppercase tracking-wider block mb-0.5">
                            IMPACT &bull;
                          </span>
                          {node.impact}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Differentiated live subsystem telemetry widget */}
                  <SubsystemWidget type={node.subsystemType} />
                </div>

                {/* Architecture Metrics Grid */}
                {node.metrics && node.metrics.length > 0 && (
                  <div>
                    <div className="text-[10.5px] font-mono text-zinc-300 mb-1.5 uppercase tracking-wider font-bold">
                      LIVE TELEMETRY METRICS
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {node.metrics.map((m, idx) => (
                        <div
                          key={idx}
                          className="bg-[#131624] border border-white/18 rounded-lg p-2 text-center shadow-sm"
                        >
                          <div className="font-mono text-[9px] text-zinc-400 mb-0.5 uppercase tracking-wider font-semibold">
                            {m.label}
                          </div>
                          <div className="font-mono text-[13px] text-white font-bold tracking-tight">
                            {m.val}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {node.tags && node.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {node.tags.map((t) => (
                      <span
                        key={t}
                        className="font-mono text-[10px] px-2.5 py-0.5 rounded-md bg-white/[0.08] border border-white/20 text-zinc-100 font-medium"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Pipeline Diagram, Screenshots & Code Blueprint */}
              <div className="lg:col-span-7 flex flex-col space-y-3">
                {/* System Pipeline Flow */}
                <PipelineDiagram type={node.subsystemType} />

                {/* Tab Switcher if Screenshots are available */}
                {node.screenshots && node.screenshots.length > 0 && node.code && (
                  <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                    <button
                      onClick={() => setActiveRightTab("screenshots")}
                      className={`font-mono text-[10.5px] px-3 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeRightTab === "screenshots"
                          ? "bg-accent-lime/15 border border-accent-lime text-accent-lime font-bold shadow-sm"
                          : "text-zinc-400 hover:text-white bg-white/[0.04] border border-transparent"
                      }`}
                    >
                      <span>📸 PRODUCTION SCREENS ({node.screenshots.length})</span>
                    </button>
                    <button
                      onClick={() => setActiveRightTab("code")}
                      className={`font-mono text-[10.5px] px-3 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeRightTab === "code"
                          ? "bg-accent-lime/15 border border-accent-lime text-accent-lime font-bold shadow-sm"
                          : "text-zinc-400 hover:text-white bg-white/[0.04] border border-transparent"
                      }`}
                    >
                      <span>⚡ CODE BLUEPRINT</span>
                    </button>
                  </div>
                )}

                {/* Screenshots View */}
                {activeRightTab === "screenshots" && node.screenshots && node.screenshots.length > 0 ? (
                  <div className="flex-1 flex flex-col space-y-2.5">
                    {/* Thumbnail Switcher Pills */}
                    <div className="flex flex-wrap gap-2">
                      {node.screenshots.map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedScreenshotIdx(idx)}
                          className={`font-mono text-[10px] px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 border ${
                            selectedScreenshotIdx === idx
                              ? "bg-accent-lime/15 border-accent-lime text-white font-semibold shadow-sm"
                              : "bg-white/[0.03] border-white/10 text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              selectedScreenshotIdx === idx
                                ? "bg-accent-lime shadow-[0_0_6px_#ccff00]"
                                : "bg-zinc-600"
                            }`}
                          />
                          <span>{s.badge || `VIEW 0${idx + 1}`}</span>
                        </button>
                      ))}
                    </div>

                    {/* Screenshot Display Card */}
                    {(() => {
                      const currentShot =
                        node.screenshots[selectedScreenshotIdx] || node.screenshots[0];
                      return (
                        <div className="relative rounded-xl overflow-hidden border border-white/20 bg-black/60 shadow-lg">
                          <picture className="w-full block aspect-[16/9] overflow-hidden bg-black/80">
                            <img
                              src={currentShot.url}
                              alt={currentShot.title}
                              className="w-full h-full object-contain object-center"
                              loading="eager"
                            />
                          </picture>
                          <div className="p-3 bg-[#0a0d17]/95 border-t border-white/10">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-display text-xs font-bold text-white">
                                {currentShot.title}
                              </span>
                              {currentShot.badge && (
                                <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-accent-lime/10 border border-accent-lime/30 text-accent-lime font-semibold">
                                  {currentShot.badge}
                                </span>
                              )}
                            </div>
                            <p className="font-sans text-[11px] text-zinc-300 leading-relaxed">
                              {currentShot.caption}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  /* Code / Configuration Blueprint */
                  node.code && (
                    <div className="flex-1 flex flex-col">
                      <div className="flex justify-between items-center mb-1.5 font-mono text-[10.5px]">
                        <span className="text-zinc-300 uppercase tracking-wider font-bold">
                          ARCHITECTURE BLUEPRINT
                        </span>
                        <button
                          onClick={handleCopyCode}
                          className="cursor-pointer text-accent-lime hover:underline font-mono text-[10.5px] font-bold flex items-center gap-1"
                        >
                          <span>{copied ? "✓ COPIED" : "COPY BLUEPRINT"}</span>
                        </button>
                      </div>
                      <pre className="p-4 rounded-xl bg-[#06070c] border border-white/20 font-mono text-[11.5px] text-zinc-100 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden leading-relaxed max-h-52 flex-1 font-medium shadow-inner">
                        <HighlightedCode code={node.code} />
                      </pre>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Bottom Bar for Landscape Console */}
            <div className="flex items-center justify-between pt-3 border-t border-white/15 font-mono text-[10.5px] text-zinc-300">
              <span className="flex items-center gap-2 text-accent-lime text-[10px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-lime shadow-[0_0_8px_#ccff00] animate-pulse" />
                ACTIVE NODE TELEMETRY // ZERO-COPY RUNTIME
              </span>
              <button
                onClick={handleCloseZoom}
                className="text-accent-lime font-bold hover:underline cursor-pointer flex items-center gap-1.5 px-3 py-1 rounded-md bg-accent-lime/10 border border-accent-lime/30 hover:bg-accent-lime/20 transition-all text-[10.5px]"
              >
                <span>&larr; ZOOM OUT [ESC]</span>
              </button>
            </div>
          </div>
        ) : (
          /* Compact Overview Layout when Idle */
          <div>
            <div className="font-display text-[19px] font-bold text-white mb-1.5 tracking-tight group-hover:text-accent-lime transition-colors duration-150">
              {node.title}
            </div>

            {node.role && (
              <div className="font-mono text-[9.5px] text-accent-lime font-medium mb-2 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-accent-lime" />
                <span>{node.role}</span>
              </div>
            )}

            {node.desc && (
              <div className="font-sans text-[12.5px] leading-relaxed text-zinc-300 mb-3 line-clamp-2">
                {node.desc}
              </div>
            )}

            <SubsystemWidget type={node.subsystemType} />

            {node.tags && node.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5 mb-3">
                {node.tags.slice(0, 3).map((t) => (
                  <span
                    key={t}
                    className="font-mono text-[9px] px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/12 text-zinc-400"
                  >
                    {t}
                  </span>
                ))}
                {node.tags.length > 3 && (
                  <span className="font-mono text-[9px] px-1.5 py-0.5 text-zinc-500">
                    +{node.tags.length - 3}
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2.5 border-t border-white/10 font-mono text-[9.5px] text-zinc-400">
              <span>ONLINE</span>
              <span className="text-accent-lime font-semibold group-hover:translate-x-1 transition-transform duration-150">
                Inspect Node &rarr;
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

SpatialNodeCard.displayName = "SpatialNodeCard";
