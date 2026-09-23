import React from "react";
import { NodeData } from "@/types/graph";

interface ProjectDrawerProps {
  node: NodeData | null;
  isOpen: boolean;
  onClose: () => void;
  onNetworkSurge: () => void;
}

export const ProjectDrawer: React.FC<ProjectDrawerProps> = ({
  node,
  isOpen,
  onClose,
  onNetworkSurge,
}) => {
  if (!node) return null;

  return (
    <aside
      id="project-drawer"
      className={`fixed top-0 right-0 w-[460px] max-w-[90vw] md:max-w-[460px] h-full bg-[#0a0a0f] border-l border-white/15 z-30 p-7 md:p-8 flex flex-col justify-between overflow-y-auto transition-transform duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)] [contain:layout_style_paint] ${
        isOpen
          ? "translate-x-0 shadow-[-24px_0_60px_rgba(0,0,0,0.92)]"
          : "translate-x-full"
      }`}
      aria-label="Node Architecture Deep-Dive"
    >
      <button
        className="absolute top-6 right-6 w-8 h-8 rounded-lg border border-white/15 text-zinc-300 hover:text-white hover:border-accent-lime/60 font-mono flex items-center justify-center transition-colors cursor-pointer text-lg bg-white/[0.04]"
        onClick={onClose}
        aria-label="Close Inspector"
      >
        &times;
      </button>

      <div className="pt-2">
        <div className="font-mono text-[10px] tracking-widest uppercase text-accent-lime mb-2 font-medium">
          {node.category || "SYSTEM ARCHITECTURE"}
        </div>
        <h2 className="font-display text-2xl font-bold text-white mb-3 tracking-tight">
          {node.title}
        </h2>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent-lime/10 border border-accent-lime/40 rounded-md text-accent-lime font-mono text-[11px] mb-6 self-start shadow-sm">
          <span className="status-pulse" />
          <span className="font-medium">{node.badge || "ONLINE"}</span>
        </div>

        {node.desc && (
          <p className="font-sans text-[13px] leading-relaxed text-zinc-300 mb-6">
            {node.desc}
          </p>
        )}

        {node.metrics && node.metrics.length > 0 && (
          <div className="grid grid-cols-2 gap-3.5 mb-6 p-4.5 bg-white/[0.03] border border-white/12 rounded-xl shadow-inner">
            {node.metrics.map((m, idx) => (
              <div key={idx} className="flex flex-col gap-1">
                <span className="text-base font-bold text-white font-mono">
                  {m.val}
                </span>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">
                  {m.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {node.code && (
          <pre className="bg-[#07080a] border border-white/10 rounded-xl p-4 font-mono text-[11px] leading-relaxed text-slate-200 overflow-x-auto mb-6 shadow-inner">
            <code>{node.code}</code>
          </pre>
        )}

        {node.tags && node.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-8">
            {node.tags.map((t) => (
              <span
                key={t}
                className="font-mono text-[10px] px-3 py-1 rounded-md bg-white/[0.05] border border-white/12 text-zinc-300 shadow-sm"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-auto pt-5 border-t border-white/10">
        <button
          className="flex-1 py-3 px-4 rounded-lg font-mono text-[11px] tracking-wider text-center cursor-pointer bg-accent-lime hover:bg-[#b5e600] text-black font-bold border border-accent-lime shadow-[0_0_20px_rgba(204,255,0,0.2)] transition-all"
          onClick={onNetworkSurge}
        >
          PULSE NETWORK
        </button>
        <button
          className="flex-1 py-3 px-4 rounded-lg font-mono text-[11px] tracking-wider text-center cursor-pointer bg-white/[0.05] hover:bg-white/[0.1] hover:border-accent-lime/40 text-zinc-200 border border-white/15 transition-all shadow-sm"
          onClick={onClose}
        >
          BACK TO SPACE
        </button>
      </div>
    </aside>
  );
};
