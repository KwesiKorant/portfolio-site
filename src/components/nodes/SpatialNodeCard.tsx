import React, { forwardRef, useCallback, useRef } from "react";
import { NodeData, SubsystemType } from "@/types/graph";
import { playCardHover, playKeyClick } from "@/lib/soundEngine";

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

function SubsystemWidget({ type }: { type?: SubsystemType }) {
  if (!type) return null;

  switch (type) {
    case "router":
      return (
        <div className="mb-3.5 p-2.5 rounded-lg bg-black/40 border border-white/10 font-mono text-[9px]">
          <div className="flex justify-between items-center text-zinc-400 mb-1.5">
            <span className="flex items-center gap-1.5 text-accent-lime font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-lime animate-pulse" />
              ANYCAST INGRESS
            </span>
            <span className="text-zinc-300">p99: 1.18ms</span>
          </div>
          <div className="h-6 w-full relative overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 280 24" preserveAspectRatio="none">
              <defs>
                <linearGradient id="router-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ccff00" stopOpacity="0.25" />
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
                strokeWidth="1.5"
              />
              <circle cx="276" cy="6" r="2.5" fill="#ccff00" />
            </svg>
          </div>
          <div className="flex justify-between text-zinc-500 text-[8.5px] mt-1">
            <span>EDGE: 120k req/s</span>
            <span className="text-accent-lime font-semibold">DROP RATE: 0.00%</span>
          </div>
        </div>
      );

    case "stream":
      return (
        <div className="mb-3.5 p-2.5 rounded-lg bg-black/40 border border-white/10 font-mono text-[9px]">
          <div className="flex justify-between items-center text-zinc-400 mb-1.5">
            <span className="flex items-center gap-1.5 text-accent-cyan font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
              KAFKA FANOUT
            </span>
            <span className="text-zinc-300">48.2k frames/s</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 w-12 text-[8px]">SOCKETS</span>
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-accent-cyan w-[78%] rounded-full animate-pulse" />
              </div>
              <span className="text-zinc-400 text-[8.5px]">24k/s</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 w-12 text-[8px]">PIPELINES</span>
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-accent-lime w-[64%] rounded-full animate-pulse" />
              </div>
              <span className="text-zinc-400 text-[8.5px]">24k/s</span>
            </div>
          </div>
        </div>
      );

    case "vectordb":
      return (
        <div className="mb-3.5 p-2.5 rounded-lg bg-black/40 border border-white/10 font-mono text-[9px]">
          <div className="flex justify-between items-center text-zinc-400 mb-1.5">
            <span className="flex items-center gap-1.5 text-accent-lime font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-lime animate-pulse" />
              HNSW GRAPH
            </span>
            <span className="text-zinc-300">cos_sim: 0.984</span>
          </div>
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-accent-lime" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polygon points="12 2 2 8.5 2 15.5 12 22 22 15.5 22 8.5 12 2" strokeOpacity="0.4" />
                <line x1="12" y1="2" x2="12" y2="22" strokeOpacity="0.3" />
                <line x1="2" y1="8.5" x2="22" y2="8.5" strokeOpacity="0.3" />
                <circle cx="12" cy="12" r="2.5" fill="#ccff00" />
                <circle cx="2" cy="8.5" r="1.5" fill="#06b6d4" />
                <circle cx="22" cy="15.5" r="1.5" fill="#06b6d4" />
              </svg>
              <span className="text-zinc-300 text-[8.5px]">1536-DIM SIMD</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-accent-lime/10 text-accent-lime border border-accent-lime/30 text-[8px] font-semibold">
              AVX-512 FMA
            </span>
          </div>
        </div>
      );

    case "crdt":
      return (
        <div className="mb-3.5 p-2.5 rounded-lg bg-black/40 border border-white/10 font-mono text-[9px]">
          <div className="flex justify-between items-center text-zinc-400 mb-1.5">
            <span className="flex items-center gap-1.5 text-accent-emerald font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse" />
              PEER MESH
            </span>
            <span className="text-emerald-400 font-semibold">CONVERGED</span>
          </div>
          <div className="flex items-center justify-between text-[8.5px] px-1 text-zinc-300">
            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">PEER A</span>
            <span className="text-accent-emerald">&harr;</span>
            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">PEER B</span>
            <span className="text-accent-emerald">&harr;</span>
            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">PEER C</span>
          </div>
          <div className="text-[8px] text-zinc-500 mt-1.5 text-center">
            VECTOR CLOCK: [P1:42, P2:89, P3:15] &bull; 0 SPLIT-BRAIN
          </div>
        </div>
      );

    case "ebpf":
      return (
        <div className="mb-3.5 p-2.5 rounded-lg bg-black/40 border border-white/10 font-mono text-[8.5px] leading-tight">
          <div className="flex justify-between items-center text-zinc-400 mb-1">
            <span className="flex items-center gap-1.5 text-accent-cyan font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
              KERNEL PROBES
            </span>
            <span className="text-zinc-500">&lt; 0.8% CPU</span>
          </div>
          <div className="bg-[#050608] rounded p-1.5 border border-white/5 text-zinc-400 space-y-0.5">
            <div className="text-accent-cyan truncate">&gt; sys_enter_connect: pid 3841 (0.12ms)</div>
            <div className="text-zinc-500 truncate">&gt; ringbuf_submit: 64B [VERIFIED]</div>
          </div>
        </div>
      );

    case "cluster":
      return (
        <div className="mb-3.5 p-2.5 rounded-lg bg-black/40 border border-white/10 font-mono text-[9px]">
          <div className="flex justify-between items-center text-zinc-400 mb-1.5">
            <span className="flex items-center gap-1.5 text-accent-lime font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-lime animate-pulse" />
              POD REPLICAS
            </span>
            <span className="text-emerald-400 font-semibold">128/128 HEALTHY</span>
          </div>
          <div className="grid grid-cols-4 gap-1 text-[8px] text-center font-bold">
            <div className="py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">US-E</div>
            <div className="py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">US-W</div>
            <div className="py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">EU-C</div>
            <div className="py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">AP-S</div>
          </div>
        </div>
      );

    case "identity":
      return (
        <div className="mb-3.5 p-2.5 rounded-lg bg-black/40 border border-white/10 font-mono text-[9px]">
          <div className="flex justify-between items-center text-zinc-400 mb-1">
            <span className="flex items-center gap-1.5 text-accent-lime font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-lime animate-pulse" />
              VERIFIED KEY
            </span>
            <span className="text-zinc-300 font-semibold">ED25519</span>
          </div>
          <div className="text-[8.5px] text-zinc-400 tracking-wider truncate">
            FINGERPRINT: 4A7F 90B2 C811 09E4
          </div>
          <div className="flex justify-between text-[8px] text-zinc-500 mt-1">
            <span>UPTIME: 99.99%</span>
            <span className="text-accent-lime font-semibold">SYSTEM ARCHITECT</span>
          </div>
        </div>
      );

    default:
      return null;
  }
}

export const SpatialNodeCard = forwardRef<SpatialNodeElement, SpatialNodeCardProps>(
  ({ node, isActive, onFocusNode, onHoverConnection }, ref) => {
    const innerCardRef = useRef<HTMLDivElement | null>(null);

    const handleMouseEnter = useCallback(
      () => {
        playCardHover();
        const inner = innerCardRef.current;
        if (inner) {
          inner.style.transition = "border-color 200ms ease, box-shadow 200ms ease";
        }
        onHoverConnection(node.id, true);
      },
      [node.id, onHoverConnection]
    );

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      const inner = innerCardRef.current;
      if (!inner) return;

      const cardEl = e.currentTarget.parentElement as SpatialNodeElement | null;
      let normX = 0;
      let normY = 0;

      if (cardEl && cardEl._screenX !== undefined && cardEl._screenY !== undefined) {
        const scale = cardEl._scale || 1;
        const halfW = (340 * scale) / 2;
        const halfH = (220 * scale) / 2;
        normX = Math.max(-0.5, Math.min(0.5, (e.clientX - cardEl._screenX) / Math.max(halfW, 80)));
        normY = Math.max(-0.5, Math.min(0.5, (e.clientY - cardEl._screenY) / Math.max(halfH, 80)));
      } else {
        const rect = e.currentTarget.getBoundingClientRect();
        normX = (e.clientX - rect.left) / rect.width - 0.5;
        normY = (e.clientY - rect.top) / rect.height - 0.5;
      }

      inner.style.transform = `rotateX(${-normY * 14}deg) rotateY(${normX * 14}deg) translateZ(8px) scale3d(1.02, 1.02, 1)`;
    }, []);

    const handleMouseLeave = useCallback(() => {
      const inner = innerCardRef.current;
      if (inner) {
        inner.style.transition = "transform 280ms cubic-bezier(0.16, 1, 0.3, 1), border-color 200ms ease, box-shadow 200ms ease";
        inner.style.transform = `rotateX(0deg) rotateY(0deg) translateZ(0px) scale3d(1, 1, 1)`;
      }
      onHoverConnection(node.id, false);
    }, [node.id, onHoverConnection]);

    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        playKeyClick();
        onFocusNode(node.id);
      },
      [node.id, onFocusNode]
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
        className="spatial-node absolute top-0 left-0 w-[340px] max-w-[90vw] pointer-events-auto cursor-pointer [contain:layout_style_paint] will-change-transform origin-center select-none"
        style={{ opacity: 0, pointerEvents: "none" }}
        onClick={handleClick}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Inner Card handles 3D tilt without touching outer camera projection */}
        <div
          ref={innerCardRef}
          className={`relative rounded-2xl p-6 bg-[#0c0d14]/95 border text-zinc-100 group [transform-style:preserve-3d] transition-[border-color,box-shadow] duration-200 ease-out ${
            isActive
              ? "border-accent-lime ring-1 ring-accent-lime/50 shadow-[0_0_35px_rgba(204,255,0,0.3),0_12px_40px_rgba(0,0,0,0.85)]"
              : "border-white/15 hover:border-accent-lime/60 shadow-[0_10px_35px_rgba(0,0,0,0.7)] hover:shadow-[0_16px_50px_rgba(0,0,0,0.9)]"
          }`}
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Pre-rendered glow overlay */}
          <div
            className={`absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-accent-lime/25 via-transparent to-accent-cyan/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none -z-10 ${
              isActive ? "opacity-100" : ""
            }`}
          />

          <div className="flex items-center justify-between gap-3 mb-2.5 font-mono text-[10px] tracking-wider uppercase text-zinc-400">
            <span className="font-semibold">{node.category}</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-md font-mono font-medium text-[10px] shadow-sm ${badgeColorClass}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
              {node.badge}
            </span>
          </div>

          <div className="font-display text-[18px] font-bold text-white mb-2 tracking-tight group-hover:text-accent-lime transition-colors duration-150">
            {node.title}
          </div>

          {node.desc && (
            <div className="font-sans text-[13px] leading-relaxed text-zinc-300 mb-3.5 line-clamp-3">
              {node.desc}
            </div>
          )}

          {/* Differentiated live subsystem telemetry widget */}
          <SubsystemWidget type={node.subsystemType} />

          {node.tags && node.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3.5">
              {node.tags.map((t) => (
                <span
                  key={t}
                  className="font-mono text-[10px] px-2.5 py-0.5 rounded-md bg-white/[0.05] border border-white/12 text-zinc-300 shadow-sm"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-3.5 border-t border-white/10 font-mono text-[10px] text-zinc-400">
            <span>STATUS: ONLINE</span>
            <span className="text-accent-lime font-semibold group-hover:translate-x-1 transition-transform duration-150">
              Dolly In &rarr;
            </span>
          </div>
        </div>
      </div>
    );
  }
);

SpatialNodeCard.displayName = "SpatialNodeCard";

