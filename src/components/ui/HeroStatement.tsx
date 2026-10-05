import React, { forwardRef } from "react";

export const HeroStatement = forwardRef<HTMLDivElement>((props, ref) => {
  return (
    <div
      ref={ref}
      className="absolute top-0 left-0 pointer-events-auto w-[640px] max-w-[90vw] text-center flex flex-col items-center [contain:layout_style_paint] origin-center transition-opacity duration-200"
      style={{ opacity: 0 }}
      {...props}
    >
      <h1 className="font-display font-bold leading-[0.98] tracking-tight uppercase">
        <span className="block text-[21px] xs:text-[23px] sm:text-[27px] md:text-[34px] lg:text-[62px] text-white drop-shadow-[0_4px_32px_rgba(0,0,0,0.9)]">
          I&apos;M KWESI
        </span>
        <span className="block text-[15px] xs:text-[17px] sm:text-[19px] md:text-[23px] lg:text-[48px] bg-gradient-to-br from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent drop-shadow-[0_2px_20px_rgba(255,255,255,0.08)]">
          AND THIS IS WHAT I DO
        </span>
      </h1>
    </div>
  );
});

HeroStatement.displayName = "HeroStatement";
