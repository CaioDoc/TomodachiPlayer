import React, { useState } from "react";
import Link from "next/link";
import { Play, BookOpen, Star, RefreshCw, Heart } from "lucide-react";
import { Tag } from "./Tag";
import { cn } from "@/lib/utils";
import { MediaMetadata } from "@/lib/extensions/types";

export interface ItemCardProps {
  id: number;
  filename: string;
  type: "video" | "manga";
  progress?: number;
  totalProgress?: number;
  isFavorite?: number;
  status?: string;
  metadataJson?: string | null;
  tags?: Array<{ id: number; name: string; color?: string }>;
  folderName?: string;
  className?: string;
  onMetadataUpdated?: () => void;
  onFavoriteToggled?: (id: number, newFav: number) => void;
}

export const Card: React.FC<ItemCardProps> = ({
  id,
  filename,
  type,
  progress = 0,
  totalProgress,
  isFavorite = 0,
  metadataJson,
  tags = [],
  folderName,
  className,
  onMetadataUpdated,
  onFavoriteToggled,
}) => {
  const [fetchingMetadata, setFetchingMetadata] = useState(false);
  const [favStatus, setFavStatus] = useState<number>(isFavorite);

  let metadata: MediaMetadata | null = null;
  if (metadataJson) {
    try {
      metadata = JSON.parse(metadataJson);
    } catch {
      metadata = null;
    }
  }

  const title = metadata?.title || filename.replace(/\.[^/.]+$/, "");
  const coverUrl = metadata?.coverUrl;
  const rating = metadata?.rating;

  const targetHref = type === "video" ? `/player/${id}` : `/reader/${id}`;
  const isVideo = type === "video";

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const newFav = favStatus === 1 ? 0 : 1;
    setFavStatus(newFav);
    if (onFavoriteToggled) onFavoriteToggled(id, newFav);

    try {
      await fetch(`/api/items/${id}/favorite`, { method: "POST" });
    } catch (err) {
      console.error("Erro ao favoritar item:", err);
      setFavStatus(isFavorite);
    }
  };

  const handleScanMetadata = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      setFetchingMetadata(true);
      const res = await fetch("/api/extensions/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: id }),
      });
      const data = await res.json();
      if (data.success && onMetadataUpdated) {
        onMetadataUpdated();
      }
    } catch (err) {
      console.error("Erro ao sincronizar metadados:", err);
    } finally {
      setFetchingMetadata(false);
    }
  };

  return (
    <Link
      href={targetHref}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800/80 hover:border-indigo-500/60 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-200 active:scale-[0.96] focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer select-none",
        className
      )}
    >
      {/* Cover Art Box */}
      <div className="relative aspect-[3/4] w-full bg-gradient-to-br from-zinc-800 via-zinc-900 to-black flex flex-col items-center justify-center overflow-hidden">
        {coverUrl ? (
          // Render Cover Image from Metadata
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
          />
        ) : (
          // Placeholder Icon when no cover image exists
          <div className="p-4 rounded-2xl bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 group-hover:scale-110 group-hover:text-white group-hover:bg-indigo-600/30 transition-all duration-300">
            {isVideo ? (
              <Play className="w-9 h-9 fill-current ml-0.5" />
            ) : (
              <BookOpen className="w-9 h-9" />
            )}
          </div>
        )}

        {/* Rating Badge Top Left */}
        {rating !== undefined ? (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-amber-500/30 text-[10px] font-bold text-amber-400">
            <Star className="w-3 h-3 fill-amber-400 stroke-none" />
            <span>{rating}</span>
          </div>
        ) : (
          /* Folder Name Badge if no rating */
          folderName && (
            <div className="absolute top-2.5 left-2.5 max-w-[60%] truncate px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/10 text-[10px] font-medium text-zinc-300">
              {folderName}
            </div>
          )
        )}

        {/* Heart Favorite Button Top Right */}
        <button
          type="button"
          onClick={handleToggleFavorite}
          title={favStatus === 1 ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
          className="absolute top-2.5 right-2.5 p-2 rounded-full bg-black/65 backdrop-blur-md border border-white/10 text-white transition-all hover:scale-110 active:scale-90 cursor-pointer z-10"
        >
          <Heart
            className={`w-3.5 h-3.5 transition-colors ${
              favStatus === 1 ? "fill-red-500 stroke-red-500 text-red-500" : "text-zinc-300 hover:text-white"
            }`}
          />
        </button>

        {/* Metadata Scan Trigger */}
        {!metadata && (
          <button
            type="button"
            onClick={handleScanMetadata}
            disabled={fetchingMetadata}
            title="Buscar capa e metadados via extensões"
            className="absolute bottom-14 right-2.5 p-2 rounded-full bg-black/80 backdrop-blur-md text-zinc-300 hover:text-indigo-400 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity active:scale-90 cursor-pointer z-10"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fetchingMetadata ? "animate-spin text-indigo-400" : ""}`} />
          </button>
        )}

        {/* Bottom Gradient Overlay for Title */}
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col justify-end p-3 pointer-events-none">
          <h3 className="text-xs font-semibold text-zinc-100 line-clamp-2 leading-tight group-hover:text-indigo-300 transition-colors">
            {title}
          </h3>

          {/* Tags preview */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5 max-h-5 overflow-hidden">
              {tags.slice(0, 2).map((tag) => (
                <Tag key={tag.id} name={tag.name} color={tag.color || "#6366F1"} className="text-[9px] px-1.5 py-0" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {totalProgress && totalProgress > 0 && progress > 0 ? (
        <div className="h-1.5 w-full bg-zinc-800/80">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
            style={{ width: `${Math.min(100, Math.round((progress / totalProgress) * 100))}%` }}
          />
        </div>
      ) : null}
    </Link>
  );
};
