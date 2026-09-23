import React from "react";

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <div
      id="shortcuts-modal"
      className={`fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center transition-opacity duration-200 ${
        isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`w-[540px] max-w-[90vw] bg-[#0c0d14]/98 border border-white/15 rounded-2xl p-7 md:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.92)] transition-transform duration-200 ${
          isOpen ? "scale-100" : "scale-95"
        }`}
      >
        <div className="flex justify-between items-center mb-6">
          <div
            className="font-display text-xl font-bold text-white tracking-tight flex items-center gap-2.5"
            id="modal-title"
          >
            <span className="w-2 h-2 rounded-full bg-accent-lime shadow-[0_0_10px_#ccff00]" />
            SPATIAL NAVIGATION GUIDE
          </div>
          <button
            className="w-8 h-8 rounded-lg border border-white/15 text-zinc-300 hover:text-white hover:border-accent-lime/60 font-mono flex items-center justify-center transition-colors cursor-pointer text-lg bg-white/[0.04]"
            id="guide-close"
            onClick={onClose}
            aria-label="Close Guide"
          >
            &times;
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white/[0.03] border border-white/12 rounded-xl p-4">
            <h4 className="font-mono text-[11px] text-accent-lime mb-3 uppercase tracking-wider font-semibold">
              Keyboard Shortcuts
            </h4>
            <div className="flex justify-between items-center text-[11px] text-zinc-300 mb-2">
              <span>Root Gateway</span>
              <kbd>1</kbd>
            </div>
            <div className="flex justify-between items-center text-[11px] text-zinc-300 mb-2">
              <span>Architecture Cluster</span>
              <kbd>2</kbd>
            </div>
            <div className="flex justify-between items-center text-[11px] text-zinc-300 mb-2">
              <span>Featured Projects</span>
              <kbd>3</kbd>
            </div>
            <div className="flex justify-between items-center text-[11px] text-zinc-300 mb-2">
              <span>Infrastructure Stack</span>
              <kbd>4</kbd>
            </div>
            <div className="flex justify-between items-center text-[11px] text-zinc-300 mb-2">
              <span>Lead Dossier</span>
              <kbd>5</kbd>
            </div>
            <div className="flex justify-between items-center text-[11px] text-zinc-300 mb-2">
              <span>Network Surge Pulse</span>
              <kbd>SPACE</kbd>
            </div>
            <div className="flex justify-between items-center text-[11px] text-zinc-300 mb-2">
              <span>Dismiss / Close</span>
              <kbd>ESC</kbd>
            </div>
            <div className="flex justify-between items-center text-[11px] text-zinc-300 mb-1">
              <span>Toggle Cheatsheet</span>
              <kbd>?</kbd>
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/12 rounded-xl p-4">
            <h4 className="font-mono text-[11px] text-accent-lime mb-3 uppercase tracking-wider font-semibold">
              Spatial Mouse / Touch
            </h4>
            <div className="flex justify-between items-center text-[11px] text-zinc-300 mb-2">
              <span>Pan 3D Viewport</span>
              <span className="font-mono text-[10px] text-zinc-400">Left-Click Drag</span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-zinc-300 mb-2">
              <span>Fly-Through Dolly</span>
              <span className="font-mono text-[10px] text-zinc-400">Mouse Scroll</span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-zinc-300 mb-2">
              <span>3D Card Tilt</span>
              <span className="font-mono text-[10px] text-zinc-400">Hover Card</span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-zinc-300 mb-2">
              <span>Open Deep-Dive</span>
              <span className="font-mono text-[10px] text-zinc-400">Click Node</span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-zinc-300 mb-2">
              <span>Jump Anywhere</span>
              <span className="font-mono text-[10px] text-zinc-400">Click Mini-Map</span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-zinc-300 mb-1">
              <span>Pinch Dolly</span>
              <span className="font-mono text-[10px] text-zinc-400">Two Fingers</span>
            </div>
          </div>
        </div>

        <button
          className="w-full py-3.5 px-4 rounded-xl font-mono text-[12px] tracking-wider text-center cursor-pointer bg-accent-lime hover:bg-[#b5e600] text-black font-bold border border-accent-lime shadow-[0_0_20px_rgba(204,255,0,0.22)] transition-all"
          onClick={onClose}
        >
          RESUME EXPLORATION
        </button>
      </div>
    </div>
  );
};
