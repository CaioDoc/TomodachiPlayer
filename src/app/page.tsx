"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Play,
  BookOpen,
  Settings,
  RefreshCw,
  FolderPlus,
  Film,
  Library,
  Clock,
  Search,
  X,
  Filter,
  ArrowUpDown,
  Heart,
  Bookmark,
  CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { ServerStatus } from "@/components/ServerStatus";
import { WelcomeScreen } from "@/components/WelcomeScreen";

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
  tags?: Array<{ id: number; name: string; color?: string }>;
}

interface TagItem {
  id: number;
  name: string;
  color?: string;
}

type SortOption = "newest" | "az" | "za" | "progress";
type ListFilter = "all" | "favorites" | "watching" | "plan_to_watch" | "completed";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"video" | "manga">("video");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [continueItems, setContinueItems] = useState<MediaItem[]>([]);
  const [availableTags, setAvailableTags] = useState<TagItem[]>([]);
  const [hasFolders, setHasFolders] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [listFilter, setListFilter] = useState<ListFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showFilters, setShowFilters] = useState(false);

  const fetchFoldersCheck = async () => {
    try {
      const res = await fetch("/api/folders");
      const data = await res.json();
      if (data.success) {
        setHasFolders(data.folders.length > 0);
      }
    } catch {
      setHasFolders(false);
    }
  };

  const fetchItemsAndTags = async () => {
    try {
      setLoading(true);
      const [itemsRes, continueRes, tagsRes] = await Promise.all([
        fetch("/api/items"),
        fetch("/api/items/continue"),
        fetch("/api/tags"),
      ]);

      const itemsData = await itemsRes.json();
      const continueData = await continueRes.json();
      const tagsData = await tagsRes.json();

      if (itemsData.success) setItems(itemsData.items);
      if (continueData.success) setContinueItems(continueData.items);
      if (tagsData.success) setAvailableTags(tagsData.tags);
    } catch (err) {
      console.error("[HOME] Erro ao buscar dados:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFoldersCheck();
    fetchItemsAndTags();

    setIsScanning(true);
    fetch("/api/scan")
      .then((res) => res.json())
      .then((data) => {
        console.log("[Tomodachi Scanner] Scan concluído:", data);
        if (data.totalInserted > 0 || data.totalDeleted > 0) {
          fetchItemsAndTags();
          fetchFoldersCheck();
        }
      })
      .catch((err) => console.error("[Tomodachi Scanner] Erro no scan:", err))
      .finally(() => setIsScanning(false));
  }, []);

  // Filter and Sort Items dynamically
  const filteredAndSortedItems = useMemo(() => {
    return items
      .filter((item) => item.type === activeTab)
      .filter((item) => {
        // List Filter
        if (listFilter === "favorites" && item.is_favorite !== 1) return false;
        if (listFilter === "watching" && (item.progress || 0) === 0) return false;
        if (
          listFilter === "completed" &&
          (!item.total_progress || (item.progress || 0) < item.total_progress)
        )
          return false;
        if (listFilter === "plan_to_watch" && (item.progress || 0) > 0) return false;

        // Search Query Filter
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          let title = item.filename.toLowerCase();
          if (item.metadata_json) {
            try {
              const meta = JSON.parse(item.metadata_json);
              if (meta?.title) title = meta.title.toLowerCase();
            } catch {
              // ignore
            }
          }
          if (!title.includes(query)) return false;
        }

        // Tag Filter
        if (selectedTag) {
          const itemTagNames = item.tags?.map((t) => t.name) || [];
          if (!itemTagNames.includes(selectedTag)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const getTitle = (item: MediaItem) => {
          if (item.metadata_json) {
            try {
              const meta = JSON.parse(item.metadata_json);
              if (meta?.title) return meta.title.toLowerCase();
            } catch {
              // ignore
            }
          }
          return item.filename.toLowerCase();
        };

        if (sortBy === "az") {
          return getTitle(a).localeCompare(getTitle(b));
        }
        if (sortBy === "za") {
          return getTitle(b).localeCompare(getTitle(a));
        }
        if (sortBy === "progress") {
          const progA = a.progress || 0;
          const progB = b.progress || 0;
          return progB - progA;
        }
        return (b.created_at || 0) - (a.created_at || 0);
      });
  }, [items, activeTab, searchQuery, selectedTag, listFilter, sortBy]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedTag(null);
    setListFilter("all");
    setSortBy("newest");
  };

  if (hasFolders === false) {
    return <WelcomeScreen />;
  }

  const isFiltered =
    searchQuery.trim().length > 0 || selectedTag !== null || listFilter !== "all" || sortBy !== "newest";

  const videoCount = items.filter((i) => i.type === "video").length;
  const mangaCount = items.filter((i) => i.type === "manga").length;

  return (
    <div className="flex flex-col min-h-screen py-4 gap-5">
      {/* Header */}
      <header className="flex flex-col gap-2.5 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              TomodachiPlayer
            </h1>
            <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
              <span>Visualizador de Mídias Locais</span>
              {isScanning && (
                <span className="flex items-center gap-1 text-indigo-400 animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span className="text-[10px]">Sincronizando...</span>
                </span>
              )}
            </p>
          </div>
          <Link
            href="/settings"
            className="touch-target p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
            aria-label="Configurações"
          >
            <Settings className="w-5 h-5" />
          </Link>
        </div>

        {/* Server Network Status Badge */}
        <ServerStatus />
      </header>

      {/* CONTINUAR DE ONDE PAROU */}
      {continueItems.length > 0 && !searchQuery && !selectedTag && listFilter === "all" && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-200 font-semibold text-sm">
              <Clock className="w-4 h-4 text-indigo-400" />
              <h2>Continuar de onde parou</h2>
            </div>
            <span className="text-[11px] text-zinc-500">{continueItems.length} mídias</span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-800">
            {continueItems.map((item) => (
              <div key={item.id} className="w-36 shrink-0">
                <Card
                  id={item.id}
                  filename={item.filename}
                  type={item.type}
                  progress={item.progress}
                  totalProgress={item.total_progress}
                  isFavorite={item.is_favorite}
                  status={item.status}
                  metadataJson={item.metadata_json}
                  folderName={item.folderName}
                  tags={item.tags}
                  onMetadataUpdated={fetchItemsAndTags}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SEARCH BAR & FILTERS TOOLBAR */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder={`Pesquisar ${activeTab === "video" ? "vídeos" : "mangás"}...`}
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

          <Button
            variant={showFilters || isFiltered ? "primary" : "secondary"}
            size="md"
            onClick={() => setShowFilters(!showFilters)}
            className="shrink-0"
            title="Filtros e Listas"
          >
            <Filter className="w-4 h-4" />
            <span className="sr-only sm:not-sr-only text-xs">Filtros</span>
          </Button>
        </div>

        {/* QUICK LIST FILTER CHIPS */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setListFilter("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all active:scale-95 cursor-pointer ${
              listFilter === "all"
                ? "bg-zinc-800 text-white border border-zinc-700 shadow-md ring-1 ring-zinc-600"
                : "bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-zinc-800"
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setListFilter("favorites")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all active:scale-95 cursor-pointer ${
              listFilter === "favorites"
                ? "bg-red-600 text-white border border-red-500 shadow-md shadow-red-600/30"
                : "bg-zinc-900/80 text-zinc-400 hover:text-red-300 hover:bg-zinc-800/60 border border-zinc-800"
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${listFilter === "favorites" ? "fill-white text-white" : "fill-red-500 text-red-500"}`} />
            <span>Favoritos</span>
          </button>
          <button
            onClick={() => setListFilter("watching")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all active:scale-95 cursor-pointer ${
              listFilter === "watching"
                ? "bg-indigo-600 text-white border border-indigo-500 shadow-md shadow-indigo-600/30"
                : "bg-zinc-900/80 text-zinc-400 hover:text-indigo-300 hover:bg-zinc-800/60 border border-zinc-800"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Em Andamento</span>
          </button>
          <button
            onClick={() => setListFilter("plan_to_watch")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all active:scale-95 cursor-pointer ${
              listFilter === "plan_to_watch"
                ? "bg-amber-600 text-white border border-amber-500 shadow-md shadow-amber-600/30"
                : "bg-zinc-900/80 text-zinc-400 hover:text-amber-300 hover:bg-zinc-800/60 border border-zinc-800"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            <span>Planejo Assistir</span>
          </button>
          <button
            onClick={() => setListFilter("completed")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all active:scale-95 cursor-pointer ${
              listFilter === "completed"
                ? "bg-emerald-600 text-white border border-emerald-500 shadow-md shadow-emerald-600/30"
                : "bg-zinc-900/80 text-zinc-400 hover:text-emerald-300 hover:bg-zinc-800/60 border border-zinc-800"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Concluídos</span>
          </button>
        </div>

        {/* EXPANDABLE FILTERS PANEL */}
        {showFilters && (
          <div className="flex flex-col gap-3 p-4 rounded-2xl bg-zinc-900/95 border border-zinc-800 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
                <span>Ordenar Por</span>
              </span>
              {isFiltered && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-indigo-400 hover:underline active:opacity-75 transition-opacity cursor-pointer"
                >
                  Limpar todos os filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => setSortBy("newest")}
                className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all active:scale-95 cursor-pointer ${
                  sortBy === "newest"
                    ? "bg-indigo-600 border-indigo-500 text-white font-semibold shadow-md"
                    : "bg-zinc-800/60 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                Mais Recentes
              </button>
              <button
                onClick={() => setSortBy("az")}
                className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all active:scale-95 cursor-pointer ${
                  sortBy === "az"
                    ? "bg-indigo-600 border-indigo-500 text-white font-semibold shadow-md"
                    : "bg-zinc-800/60 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                Nome (A-Z)
              </button>
              <button
                onClick={() => setSortBy("za")}
                className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all active:scale-95 cursor-pointer ${
                  sortBy === "za"
                    ? "bg-indigo-600 border-indigo-500 text-white font-semibold shadow-md"
                    : "bg-zinc-800/60 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                Nome (Z-A)
              </button>
              <button
                onClick={() => setSortBy("progress")}
                className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all active:scale-95 cursor-pointer ${
                  sortBy === "progress"
                    ? "bg-indigo-600 border-indigo-500 text-white font-semibold shadow-md"
                    : "bg-zinc-800/60 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                Progresso
              </button>
            </div>

            {/* Filter By Tag */}
            {availableTags.length > 0 && (
              <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
                <span className="text-xs font-semibold text-zinc-300">Filtrar por Tag</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setSelectedTag(null)}
                    className={`px-3 py-1 rounded-full text-xs transition-all active:scale-95 cursor-pointer ${
                      selectedTag === null
                        ? "bg-indigo-600 text-white font-semibold shadow-xs"
                        : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Todas
                  </button>
                  {availableTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => setSelectedTag(selectedTag === tag.name ? null : tag.name)}
                      className="active:scale-95 transition-transform cursor-pointer"
                    >
                      <Tag
                        name={tag.name}
                        color={selectedTag === tag.name ? tag.color || "#6366F1" : "#27272A"}
                        className={selectedTag === tag.name ? "ring-2 ring-indigo-400 scale-105" : "opacity-75 hover:opacity-100"}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Dynamic Tabs */}
      <div className="flex p-1 bg-zinc-900/90 rounded-2xl border border-zinc-800/80 shadow-lg">
        <button
          onClick={() => setActiveTab("video")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.97] touch-target select-none cursor-pointer ${
            activeTab === "video"
              ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
          }`}
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Vídeos</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${activeTab === "video" ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-400"}`}>
            {videoCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("manga")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.97] touch-target select-none cursor-pointer ${
            activeTab === "manga"
              ? "bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-md shadow-purple-600/30"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Mangás</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${activeTab === "manga" ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-400"}`}>
            {mangaCount}
          </span>
        </button>
      </div>

      {/* Media Grid */}
      <main className="flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-zinc-500 gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
            <p className="text-xs">Carregando mídias...</p>
          </div>
        ) : filteredAndSortedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 text-center gap-3 my-4">
            <div className="p-4 rounded-full bg-zinc-800/60 text-zinc-500">
              {activeTab === "video" ? <Film className="w-8 h-8" /> : <Library className="w-8 h-8" />}
            </div>
            <div>
              <h3 className="font-semibold text-sm text-zinc-200">
                {isFiltered
                  ? `Nenhum ${activeTab === "video" ? "vídeo" : "mangá"} encontrado para este filtro`
                  : `Nenhum ${activeTab === "video" ? "vídeo" : "mangá"} cadastrado`}
              </h3>
              <p className="text-xs text-zinc-400 max-w-xs mt-1">
                {isFiltered
                  ? "Tente limpar os filtros ou selecionar outra lista/categoria."
                  : "Adicione pastas locais nas Configurações para carregar seus arquivos automaticamente."}
              </p>
            </div>
            {isFiltered ? (
              <Button variant="secondary" size="sm" onClick={clearFilters} className="mt-1">
                <X className="w-4 h-4" />
                <span>Limpar Filtros</span>
              </Button>
            ) : (
              <Link href="/settings">
                <Button variant="primary" size="sm" className="mt-1">
                  <FolderPlus className="w-4 h-4" />
                  <span>Cadastrar Pastas de {activeTab === "video" ? "Vídeo" : "Mangá"}</span>
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {filteredAndSortedItems.map((item) => (
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
                folderName={item.folderName}
                tags={item.tags}
                onMetadataUpdated={fetchItemsAndTags}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
