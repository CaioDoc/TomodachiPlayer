"use client";

import React, { use, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Video,
  BookOpen,
  Search,
  X,
  RefreshCw,
  Film,
  Library,
  Layers,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";

interface FolderDetails {
  id: number;
  name: string;
  path: string;
  type: "video" | "manga";
  tags?: Array<{ id: number; name: string; color?: string }>;
}

interface MediaItem {
  id: number;
  filename: string;
  type: "video" | "manga";
  progress?: number;
  total_progress?: number;
  is_favorite?: number;
  status?: string;
  metadata_json?: string | null;
  folderName?: string;
  created_at?: number;
}

export default function FolderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [folder, setFolder] = useState<FolderDetails | null>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadFolder = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/folders/${id}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Pasta não encontrada.");
      }
      setFolder(data.folder);
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar pasta.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFolder();
  }, [id]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter((item) => {
      let title = item.filename.toLowerCase();
      if (item.metadata_json) {
        try {
          const meta = JSON.parse(item.metadata_json);
          if (meta?.title) title = meta.title.toLowerCase();
        } catch {
          // ignore
        }
      }
      return title.includes(q);
    });
  }, [items, searchQuery]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-zinc-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
        <p className="text-sm font-medium">Carregando conteúdo da pasta...</p>
      </div>
    );
  }

  if (error || !folder) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-zinc-400 gap-4 text-center p-4">
        <p className="text-sm text-red-400 font-semibold">{error || "Pasta não encontrada."}</p>
        <Link href="/">
          <Button variant="secondary" size="sm">
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para a Home</span>
          </Button>
        </Link>
      </div>
    );
  }

  const isVideo = folder.type === "video";

  return (
    <div className="flex flex-col min-h-screen py-4 gap-5">
      {/* Header */}
      <header className="flex flex-col gap-3 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="touch-target p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer shrink-0"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-indigo-400 shrink-0">
              {isVideo ? <Video className="w-6 h-6 text-indigo-400" /> : <BookOpen className="w-6 h-6 text-purple-400" />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-zinc-100 truncate">{folder.name}</h1>
                <span className="px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700/60 text-[10px] uppercase font-bold text-zinc-300">
                  {isVideo ? "Vídeos" : "Mangás"}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-2">
                <span>{items.length} {isVideo ? "arquivos de vídeo" : "capítulos / imagens"}</span>
                <span className="text-zinc-600">•</span>
                <span className="font-mono text-[11px] truncate max-w-[200px] sm:max-w-xs">{folder.path}</span>
              </p>
            </div>
          </div>
        </div>

        {folder.tags && folder.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {folder.tags.map((t) => (
              <Tag key={t.id} name={t.name} color={t.color} />
            ))}
          </div>
        )}
      </header>

      {/* Search Input for items within this folder */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          autoComplete="off"
          data-1p-ignore="true"
          data-protonpass-ignore="true"
          suppressHydrationWarning
          placeholder={`Pesquisar dentro de ${folder.name}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full min-h-[44px] pl-10 pr-9 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white active:scale-90 transition-transform cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Items Grid */}
      <main className="flex-1">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 text-center gap-3 my-4">
            <div className="p-4 rounded-full bg-zinc-800/60 text-zinc-500">
              {isVideo ? <Film className="w-8 h-8" /> : <Library className="w-8 h-8" />}
            </div>
            <div>
              <h3 className="font-semibold text-sm text-zinc-200">
                {searchQuery ? "Nenhum arquivo encontrado para esta busca" : "Nenhum arquivo nesta pasta"}
              </h3>
              <p className="text-xs text-zinc-400 max-w-xs mt-1">
                {searchQuery ? "Tente digitar outro termo de busca." : "Certifique-se de que a pasta no computador contém arquivos de mídias suportados."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {filteredItems.map((item) => (
              <Card
                key={item.id}
                id={item.id}
                filename={item.filename}
                type={item.type}
                progress={item.progress}
                totalProgress={item.total_progress}
                isFavorite={item.is_favorite}
                status={item.status}
                metadataJson={item.metadata_json}
                folderName={folder.name}
                tags={folder.tags}
                onMetadataUpdated={loadFolder}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
