"use client";

import React, { useEffect, useState } from "react";
import { PRO_HINTS } from "@/data/nodeGraph";

interface ProHintsBannerProps {
  onOpenGuide: () => void;
  temporaryHint: string | null;
}

export const ProHintsBanner: React.FC<ProHintsBannerProps> = ({
  onOpenGuide,
  temporaryHint,
}) => {
  const [hintIndex, setHintIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setHintIndex((prev) => (prev + 1) % PRO_HINTS.length);
    }, 6500);
    return () => clearInterval(timer);
  }, []);

  const currentHint = temporaryHint || PRO_HINTS[hintIndex];

  return (
    <div
      className="hidden lg:flex absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto bg-[#0c0d14] border border-accent-lime/45 hover:border-accent-lime rounded-full px-5.5 py-2.5 items-center gap-3 font-mono text-[11px] text-zinc-100 shadow-[0_10px_35px_rgba(0,0,0,0.85),0_0_20px_rgba(204,255,0,0.2)] cursor-pointer hover:scale-[1.02] transition-[border-color,box-shadow,transform] duration-200 ease-out whitespace-nowrap max-w-[90vw] z-10 select-none"
      id="pro-hint-banner"
      onClick={onOpenGuide}
      title="Click to view navigation cheatsheet (?)"
      role="button"
      tabIndex={0}
    >
      <span className="text-accent-lime text-[13px]">&#10022;</span>
      <span className="text-zinc-300" id="hint-text">
        {temporaryHint ? (
          <strong className="text-white font-bold tracking-wide">
            {temporaryHint}
          </strong>
        ) : (
          <>
            <strong className="text-white font-semibold">PRO HINT:</strong>{" "}
            {currentHint.split(" ").map((word, idx) => {
              if (
                word === "0" ||
                word === "1" ||
                word === "5" ||
                word === "RADAR" ||
                word === "MAP" ||
                word === "ESC" ||
                word === "?"
              ) {
                return <kbd key={idx}>{word}</kbd>;
              }
              return " " + word;
            })}
          </>
        )}
      </span>
    </div>
  );
};
