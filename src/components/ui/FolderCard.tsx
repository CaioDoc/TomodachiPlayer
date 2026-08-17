import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Folder, Video, BookOpen, Layers } from "lucide-react";
import { Tag } from "./Tag";
import { cn } from "@/lib/utils";

export interface FolderCardProps {
  id: number;
  name: string;
  path: string;
  type: "video" | "manga";
  itemCount: number;
  tags?: Array<{ id: number; name: string; color?: string }>;
  className?: string;
}

export const FolderCard: React.FC<FolderCardProps> = ({
  id,
  name,
  path,
  type,
  itemCount,
  tags = [],
  className,
}) => {
  const isVideo = type === "video";

  // Automatic cover art for the folder from its first item
  const coverUrl = !isVideo ? `/api/reader/cover?path=${encodeURIComponent(path)}` : undefined;

  return (
    <Link
      href={`/folder/${id}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800/80 hover:border-indigo-500/60 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-200 active:scale-[0.96] focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer select-none",
        className
      )}
    >
      {/* Cover Box */}
      <div className="relative aspect-[3/4] w-full bg-gradient-to-br from-zinc-800 via-zinc-900 to-black flex flex-col items-center justify-center overflow-hidden">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
          />
        ) : (
          <div className="p-4 rounded-2xl bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 group-hover:scale-110 group-hover:text-white group-hover:bg-indigo-600/30 transition-all duration-300">
            {isVideo ? (
              <Video className="w-10 h-10 text-indigo-400" />
            ) : (
              <BookOpen className="w-10 h-10 text-purple-400" />
            )}
          </div>
        )}

        {/* Type Badge Top Left */}
        <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/10 text-[10px] font-bold tracking-wider text-zinc-300 uppercase flex items-center gap-1">
          <Layers className="w-3 h-3 text-indigo-400" />
          <span>Série / Pasta</span>
        </div>

        {/* Item Count Badge Top Right */}
        <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-indigo-600/90 backdrop-blur-md text-[10px] font-bold text-white shadow-xs">
          {itemCount} {isVideo ? "vídeos" : "capítulos"}
        </div>

        {/* Bottom Title Overlay */}
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black via-black/85 to-transparent flex flex-col justify-end p-3 pointer-events-none">
          <h3 className="text-sm font-bold text-zinc-100 line-clamp-1 leading-tight group-hover:text-indigo-300 transition-colors flex items-center gap-1.5">
            <Folder className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>{name}</span>
          </h3>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5 max-h-5 overflow-hidden">
              {tags.slice(0, 2).map((tag) => (
                <Tag key={tag.id} name={tag.name} color={tag.color || "#6366F1"} className="text-[9px] px-1.5 py-0" />
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};
