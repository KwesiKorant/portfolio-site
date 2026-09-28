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
        className={`w-[540px] max-w-[92vw] max-h-[88dvh] overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-[#0c0d14]/98 border border-white/15 rounded-2xl p-5 sm:p-7 md:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.92)] transition-transform duration-200 ${
          isOpen ? "scale-100" : "scale-95"
        }`}
      >
        <div className="flex justify-between items-center mb-5 sm:mb-6">
          <div
            className="font-display text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2 sm:gap-2.5"
            id="modal-title"
          >
            <span className="w-2 h-2 rounded-full bg-accent-lime shadow-[0_0_10px_#ccff00]" />
            SPATIAL NAVIGATION GUIDE
          </div>
          <button
            className="w-8 h-8 rounded-lg border border-white/15 text-zinc-300 hover:text-white hover:border-accent-lime/60 font-mono flex items-center justify-center transition-colors cursor-pointer text-lg bg-white/[0.04] active:scale-90"
            id="guide-close"
            onClick={onClose}
            aria-label="Close Guide"
          >
            &times;
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 mb-5 sm:mb-6">
          <div className="bg-white/[0.03] border border-white/12 rounded-xl p-3.5 sm:p-4">
            <h4 className="font-mono text-[10px] sm:text-[11px] text-accent-lime mb-2.5 sm:mb-3 uppercase tracking-wider font-semibold">
              Keyboard Navigation
            </h4>
            <div className="flex justify-between items-center text-[10.5px] sm:text-[11px] text-zinc-300 mb-2">
              <span>Next / Prev Card</span>
              <div className="flex items-center gap-1">
                <kbd>&larr;</kbd>
                <kbd>&rarr;</kbd>
              </div>
            </div>
            <div className="flex justify-between items-center text-[10.5px] sm:text-[11px] text-zinc-300 mb-2">
              <span>Root Gateway</span>
              <kbd>1</kbd>
            </div>
            <div className="flex justify-between items-center text-[10.5px] sm:text-[11px] text-zinc-300 mb-2">
              <span>Architecture Cluster</span>
              <kbd>2</kbd>
            </div>
            <div className="flex justify-between items-center text-[10.5px] sm:text-[11px] text-zinc-300 mb-2">
              <span>Featured Projects</span>
              <kbd>3</kbd>
            </div>
            <div className="flex justify-between items-center text-[10.5px] sm:text-[11px] text-zinc-300 mb-2">
              <span>Core Technical Skills</span>
              <kbd>4</kbd>
            </div>
            <div className="flex justify-between items-center text-[10.5px] sm:text-[11px] text-zinc-300 mb-2">
              <span>Reverse Portal to Hero</span>
              <kbd>0</kbd>
            </div>
            <div className="flex justify-between items-center text-[10.5px] sm:text-[11px] text-zinc-300 mb-2">
              <span>Zoom Out / Overview</span>
              <kbd>ESC</kbd>
            </div>
            <div className="flex justify-between items-center text-[10.5px] sm:text-[11px] text-zinc-300 mb-1">
              <span>Toggle Cheatsheet</span>
              <kbd>?</kbd>
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/12 rounded-xl p-3.5 sm:p-4">
            <h4 className="font-mono text-[10px] sm:text-[11px] text-accent-lime mb-2.5 sm:mb-3 uppercase tracking-wider font-semibold">
              Touch &amp; Cockpit Gestures
            </h4>
            <div className="flex justify-between items-center text-[10.5px] sm:text-[11px] text-zinc-300 mb-2">
              <span>Pan 3D Viewport</span>
              <span className="font-mono text-[9.5px] sm:text-[10px] text-zinc-400">1-Finger Drag</span>
            </div>
            <div className="flex justify-between items-center text-[10.5px] sm:text-[11px] text-zinc-300 mb-2">
              <span>Fly-Through Dolly</span>
              <span className="font-mono text-[9.5px] sm:text-[10px] text-zinc-400">Pinch or (+ / −)</span>
            </div>
            <div className="flex justify-between items-center text-[10.5px] sm:text-[11px] text-zinc-300 mb-2">
              <span>Radar Mini-Map</span>
              <span className="font-mono text-[9.5px] sm:text-[10px] text-accent-lime">Tap Grid Warp</span>
            </div>
            <div className="flex justify-between items-center text-[10.5px] sm:text-[11px] text-zinc-300 mb-2">
              <span>Rotate / Gimbal</span>
              <span className="font-mono text-[9.5px] sm:text-[10px] text-zinc-400">Hold Diagonals (↖ ↗)</span>
            </div>
            <div className="flex justify-between items-center text-[10.5px] sm:text-[11px] text-zinc-300 mb-2">
              <span>Reset Overview</span>
              <span className="font-mono text-[9.5px] sm:text-[10px] text-zinc-400">Tap Center (⟳)</span>
            </div>
            <div className="flex justify-between items-center text-[10.5px] sm:text-[11px] text-zinc-300 mb-2">
              <span>Card Deep Dive</span>
              <span className="font-mono text-[9.5px] sm:text-[10px] text-zinc-400">Tap Card to Zoom</span>
            </div>
            <div className="flex justify-between items-center text-[10.5px] sm:text-[11px] text-zinc-300 mb-1">
              <span>Stage Transit</span>
              <span className="font-mono text-[9.5px] sm:text-[10px] text-zinc-400">Swipe &uarr; &darr; Across Stages</span>
            </div>
          </div>
        </div>

        <button
          className="w-full py-3 sm:py-3.5 px-4 rounded-xl font-mono text-[11px] sm:text-[12px] tracking-wider text-center cursor-pointer bg-accent-lime hover:bg-[#b5e600] text-black font-bold border border-accent-lime shadow-[0_0_20px_rgba(204,255,0,0.22)] transition-all active:scale-[0.98]"
          onClick={onClose}
        >
          RESUME EXPLORATION
        </button>
      </div>
    </div>
  );
};
