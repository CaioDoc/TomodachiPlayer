import React from "react";
import { cn } from "@/lib/utils";

export interface TagProps {
  name: string;
  color?: string;
  className?: string;
  onRemove?: () => void;
}

export const Tag: React.FC<TagProps> = ({ name, color = "#6366F1", className, onRemove }) => {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium text-white shadow-xs border border-white/10",
        className
      )}
      style={{ backgroundColor: color }}
    >
      <span>{name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="hover:opacity-75 focus:outline-none ml-0.5 text-white/80 hover:text-white cursor-pointer"
        >
          ×
        </button>
      )}
    </span>
  );
};
