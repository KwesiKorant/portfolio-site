import React, { useState, useEffect } from "react";
import { NodeData, SubsystemType } from "@/types/graph";
import { playCopySuccess, playKeyClick } from "@/lib/soundEngine";

interface ProjectDrawerProps {
  node: NodeData | null;
  isOpen: boolean;
  onClose: () => void;
  onNetworkSurge: () => void;
}

function PipelineDiagram({ type }: { type?: SubsystemType }) {
  const stepsMap: Record<string, string[]> = {
    router: ["Client IP", "Edge Worker", "Token Bucket", "Upstream Peer"],
    stream: ["Producer", "Kafka Partition", "Ring Buffer", "48k WS Sockets"],
    vectordb: ["Raw Vector", "HNSW Index", "AVX-512 SIMD", "Top-K Matrix"],
    crdt: ["Local Write", "Automerge LWW", "WebRTC Mesh", "State Converged"],
    ebpf: ["Userspace Call", "kprobe/tcp", "eBPF Verifier", "Ring Buffer"],
    cluster: ["Ingress Controller", "Envoy Sidecar", "Pod Replica", "Postgres Primary"],
    identity: ["Client Request", "GPG Verification", "Dossier Registry", "SLA 99.99%"],
  };

  const steps = (type && stepsMap[type]) || ["Ingress", "Processor", "Buffer", "Destination"];

  return (
    <div className="mb-6 p-3.5 bg-black/50 border border-white/12 rounded-xl">
      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-2.5">
        <span className="text-accent-lime font-semibold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-lime animate-pulse" />
          SYSTEM PIPELINE FLOW
        </span>
        <span className="text-zinc-500 font-mono text-[9px]">ZERO-COPY DIRECT</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5 font-mono text-[9px]">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-white/[0.04] border border-white/10 text-center relative"
          >
            <span className="text-[8px] text-zinc-500 mb-0.5">0{idx + 1}</span>
            <span className="text-zinc-200 font-medium leading-tight">{step}</span>
            {idx < 3 && (
              <span className="absolute -right-2 top-1/2 -translate-y-1/2 text-[10px] text-accent-lime font-bold z-10 hidden sm:block">
                &rarr;
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export const ProjectDrawer: React.FC<ProjectDrawerProps> = ({
  node,
  isOpen,
  onClose,
  onNetworkSurge,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [node?.id]);

  if (!node) return null;

  const handleCopy = () => {
    if (!node.code) return;
    navigator.clipboard.writeText(node.code).then(() => {
      playCopySuccess();
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  const handleClose = () => {
    playKeyClick();
    onClose();
  };

  const handleSurge = () => {
    playKeyClick();
    onNetworkSurge();
  };

  return (
    <aside
      id="project-drawer"
      className={`fixed top-0 right-0 w-[470px] max-w-[92vw] md:max-w-[470px] h-full bg-[#0a0a0f] border-l border-white/15 z-30 p-7 md:p-8 flex flex-col justify-between overflow-y-auto transition-transform duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)] [contain:layout_style_paint] ${
        isOpen
          ? "translate-x-0 shadow-[-24px_0_60px_rgba(0,0,0,0.92)]"
          : "translate-x-full"
      }`}
      aria-label="Node Architecture Deep-Dive"
    >
      <button
        className="absolute top-6 right-6 w-8 h-8 rounded-lg border border-white/15 text-zinc-300 hover:text-white hover:border-accent-lime/60 font-mono flex items-center justify-center transition-colors cursor-pointer text-lg bg-white/[0.04]"
        onClick={handleClose}
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

        {/* Dynamic Architectural Pipeline Diagram */}
        <PipelineDiagram type={node.subsystemType} />

        {/* Kinetic Metrics Grid */}
        {node.metrics && node.metrics.length > 0 && (
          <div className="grid grid-cols-2 gap-3.5 mb-6 p-4 bg-white/[0.03] border border-white/12 rounded-xl shadow-inner">
            {node.metrics.map((m, idx) => (
              <div key={idx} className="flex flex-col gap-1 p-2 rounded-lg bg-black/30 border border-white/5">
                <span className="text-base font-bold text-accent-lime font-mono tracking-tight">
                  {m.val}
                </span>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">
                  {m.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Code Snippet with Interactive Copy Bar */}
        {node.code && (
          <div className="mb-6">
            <div className="flex items-center justify-between px-3.5 py-2 bg-[#0d0e14] border-t border-x border-white/15 rounded-t-xl font-mono text-[10px] text-zinc-400">
              <span className="text-zinc-300 font-semibold tracking-wide">
                KERNEL // IMPLEMENTATION
              </span>
              <button
                className={`cursor-pointer px-3 py-1 rounded-md text-[10px] font-mono font-semibold transition-all flex items-center gap-1.5 ${
                  copied
                    ? "bg-accent-lime text-black shadow-[0_0_15px_rgba(204,255,0,0.45)]"
                    : "bg-white/10 text-zinc-200 hover:bg-white/20 hover:text-white"
                }`}
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <span>✓</span>
                    <span>COPIED // 200 OK</span>
                  </>
                ) : (
                  <>
                    <span>📋</span>
                    <span>COPY CODE</span>
                  </>
                )}
              </button>
            </div>
            <pre className="bg-[#050608] border border-white/10 rounded-b-xl p-4 font-mono text-[11px] leading-relaxed text-slate-200 overflow-x-auto shadow-inner">
              <code>{node.code}</code>
            </pre>
          </div>
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
          onClick={handleSurge}
        >
          PULSE NETWORK
        </button>
        <button
          className="flex-1 py-3 px-4 rounded-lg font-mono text-[11px] tracking-wider text-center cursor-pointer bg-white/[0.05] hover:bg-white/[0.1] hover:border-accent-lime/40 text-zinc-200 border border-white/15 transition-all shadow-sm"
          onClick={handleClose}
        >
          BACK TO SPACE
        </button>
      </div>
    </aside>
  );
};
