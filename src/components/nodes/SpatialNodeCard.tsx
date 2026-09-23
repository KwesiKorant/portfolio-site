import React, { forwardRef, useCallback, useRef } from "react";
import { NodeData } from "@/types/graph";

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

export const SpatialNodeCard = forwardRef<SpatialNodeElement, SpatialNodeCardProps>(
  ({ node, isActive, onFocusNode, onHoverConnection }, ref) => {
    const innerCardRef = useRef<HTMLDivElement | null>(null);
    const cachedRectRef = useRef<DOMRect | null>(null);

    const handleMouseEnter = useCallback(
      () => {
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
            <div className="font-sans text-[13px] leading-relaxed text-zinc-300 mb-4 line-clamp-3">
              {node.desc}
            </div>
          )}

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
