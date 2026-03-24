"use client";

import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ShimmerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  shimmerSize?: string;
  shimmerDuration?: string;
}

const ShimmerButton = forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      shimmerColor = "hsl(270, 80%, 70%)",
      shimmerSize = "0.1em",
      shimmerDuration = "2.5s",
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          "group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-xl px-6 font-semibold text-primary-foreground transition-all duration-300",
          "bg-primary hover:scale-[1.02] active:scale-[0.98]",
          "disabled:pointer-events-none disabled:opacity-50 disabled:saturate-50",
          className
        )}
        style={
          {
            "--shimmer-color": shimmerColor,
            "--shimmer-size": shimmerSize,
            "--shimmer-duration": shimmerDuration,
          } as React.CSSProperties
        }
        {...props}
      >
        <span className="absolute inset-0 overflow-hidden rounded-xl">
          <span
            className="absolute inset-[-100%] animate-[shimmer_var(--shimmer-duration)_ease-in-out_infinite]"
            style={{
              background: `conic-gradient(from 0deg, transparent 0%, var(--shimmer-color) 10%, transparent 20%)`,
              opacity: 0.3,
            }}
          />
        </span>
        <span className="relative z-10 flex items-center gap-2">{children}</span>
      </button>
    );
  }
);

ShimmerButton.displayName = "ShimmerButton";

export { ShimmerButton };
