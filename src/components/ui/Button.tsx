import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "destructive" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const variants = {
      primary: "bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-sm active:scale-[0.98]",
      secondary: "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 font-medium active:scale-[0.98]",
      destructive: "bg-red-600/90 hover:bg-red-600 text-white font-medium active:scale-[0.98]",
      ghost: "bg-transparent hover:bg-zinc-800/80 text-zinc-300 hover:text-white",
    };

    const sizes = {
      sm: "h-10 px-3 text-xs rounded-xl min-h-[44px]",
      md: "h-11 px-4 text-sm rounded-xl min-h-[44px]",
      lg: "h-12 px-6 text-base rounded-2xl min-h-[48px]",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 disabled:pointer-events-none touch-target select-none cursor-pointer",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
