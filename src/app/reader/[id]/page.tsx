"use client";

import React, { use, useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Settings,
  Loader2,
  BookOpen,
  LayoutList,
  Columns,
  Square,
  X,
  Check,
} from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Zoom, Keyboard } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";

import "swiper/css";
import "swiper/css/zoom";
import "swiper/css/keyboard";

import { Button } from "@/components/ui/Button";

type ReadingMode = "single" | "double" | "webtoon";

interface MangaPageItem {
  pageNumber: number;
  url: string;
  name: string;
}

interface MediaItemData {
  id: number;
  filename: string;
  path: string;
  type: string;
  progress: number;
  total_progress?: number;
  folderName?: string;
}

export default function ReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [item, setItem] = useState<MediaItemData | null>(null);
  const [pages, setPages] = useState<MangaPageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [readingMode, setReadingMode] = useState<ReadingMode>("single");
  const [showControls, setShowControls] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const swiperRef = useRef<SwiperType | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load reading mode from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem("tomodachi_reader_mode") as ReadingMode | null;
    if (savedMode && ["single", "double", "webtoon"].includes(savedMode)) {
      setReadingMode(savedMode);
    }
  }, []);

  // Fetch item and pages list
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // 1. Fetch item
        const itemRes = await fetch(`/api/items/${id}`);
        const itemData = await itemRes.json();
        if (!itemRes.ok || !itemData.success) {
          throw new Error(itemData.error || "Erro ao carregar mangá.");
        }
        setItem(itemData.item);

        // 2. Fetch manga pages
        const pagesRes = await fetch(`/api/reader?path=${encodeURIComponent(itemData.item.path)}`);
        const pagesData = await pagesRes.json();
        if (!pagesRes.ok || !pagesData.success) {
          throw new Error(pagesData.error || "Erro ao listar páginas do mangá.");
        }

        setPages(pagesData.pages);

        // Restore saved progress page
        const savedPage = itemData.item.progress || 1;
        setCurrentPage(Math.min(Math.max(1, savedPage), pagesData.pages.length || 1));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar o mangá.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  // Debounced Save Progress API
  const saveProgressToDb = useCallback(
    (page: number, total: number) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      debounceTimerRef.current = setTimeout(async () => {
        try {
          await fetch(`/api/items/${id}/progress`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              progress: page,
              total_progress: total,
            }),
          });
        } catch (err) {
          console.error("Erro ao salvar progresso do leitor:", err);
        }
      }, 1500);
    },
    [id]
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (pages.length > 0) {
      saveProgressToDb(page, pages.length);
    }
  };

  // Auto-hide controls after inactivity
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);

    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3500);
  }, []);

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [resetControlsTimeout]);

  const handleModeChange = (mode: ReadingMode) => {
    setReadingMode(mode);
    localStorage.setItem("tomodachi_reader_mode", mode);
    setShowSettingsModal(false);
  };

  const handleBack = async () => {
    if (pages.length > 0) {
      await fetch(`/api/items/${id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progress: currentPage,
          total_progress: pages.length,
        }),
      });
    }
    router.push("/");
  };

  const jumpToPage = (pageIndex: number) => {
    if (swiperRef.current) {
      swiperRef.current.slideTo(pageIndex);
    }
    handlePageChange(pageIndex + 1);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-zinc-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        <p className="text-sm font-medium">Carregando páginas do mangá...</p>
      </div>
    );
  }

  if (error || pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-zinc-400 gap-4 p-4 text-center">
        <p className="text-sm text-red-400 font-semibold">{error || "Nenhuma página encontrada neste mangá."}</p>
        <Link href="/">
          <Button variant="secondary" size="sm">
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para a Home</span>
          </Button>
        </Link>
      </div>
    );
  }

  const cleanTitle = item?.filename.replace(/\.[^/.]+$/, "") || "Leitor de Mangá";

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col justify-between overflow-hidden select-none z-50">
      {/* HEADER OVERLAY */}
      <header
        className={`absolute top-0 inset-x-0 z-30 flex items-center justify-between p-3.5 bg-gradient-to-b from-black/90 via-black/60 to-transparent transition-opacity duration-300 ${
          showControls ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={handleBack}
            className="touch-target p-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-300 hover:text-white backdrop-blur-md transition-colors cursor-pointer"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="font-bold text-sm text-zinc-100 truncate max-w-[220px] sm:max-w-md">{cleanTitle}</h1>
            <p className="text-[11px] text-purple-400 font-medium">
              Página {currentPage} de {pages.length}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setShowSettingsModal(true);
            resetControlsTimeout();
          }}
          className="touch-target p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-300 hover:text-white backdrop-blur-md transition-colors cursor-pointer"
          aria-label="Configurações de Leitura"
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>

      {/* MANGA CONTENT AREA */}
      <main
        className="w-full h-full flex items-center justify-center overflow-hidden cursor-pointer"
        onClick={resetControlsTimeout}
      >
        {readingMode === "webtoon" ? (
          /* MODO CONTÍNUO (WEBTOON - SCROLL VERTICAL) */
          <div className="w-full h-full overflow-y-auto overflow-x-hidden flex flex-col items-center py-16 gap-1 scroll-smooth">
            {pages.map((page) => (
              <div key={page.pageNumber} className="w-full max-w-2xl flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={page.url}
                  alt={`Página ${page.pageNumber}`}
                  className="w-full h-auto object-contain"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        ) : (
          /* MODO PÁGINA SIMPLES OU DUPLA (SWIPER JS) */
          <Swiper
            modules={[Zoom, Keyboard]}
            zoom={true}
            keyboard={{ enabled: true }}
            dir={readingMode === "single" ? "rtl" : "ltr"}
            slidesPerView={readingMode === "double" ? 2 : 1}
            spaceBetween={readingMode === "double" ? 10 : 0}
            initialSlide={currentPage - 1}
            onSwiper={(swiper) => {
              swiperRef.current = swiper;
            }}
            onSlideChange={(swiper) => handlePageChange(swiper.activeIndex + 1)}
            className="w-full h-full"
          >
            {pages.map((page) => (
              <SwiperSlide key={page.pageNumber} className="w-full h-full flex items-center justify-center bg-black">
                <div className="swiper-zoom-container w-full h-full flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={page.url}
                    alt={`Página ${page.pageNumber}`}
                    className="max-h-full max-w-full object-contain select-none pointer-events-auto"
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </main>

      {/* FOOTER CONTROLS OVERLAY */}
      <footer
        className={`absolute bottom-0 inset-x-0 z-30 flex flex-col gap-2.5 p-4 bg-gradient-to-t from-black/95 via-black/80 to-transparent transition-opacity duration-300 ${
          showControls ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Page Slider / Progress */}
        <div className="flex items-center gap-3 max-w-xl mx-auto w-full">
          <button
            onClick={() => jumpToPage(0)}
            className="touch-target p-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Primeira Página"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          <input
            type="range"
            min={1}
            max={pages.length}
            value={currentPage}
            onChange={(e) => jumpToPage(parseInt(e.target.value, 10) - 1)}
            className="flex-1 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />

          <button
            onClick={() => jumpToPage(pages.length - 1)}
            className="touch-target p-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Última Página"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>

        <div className="text-center text-xs text-zinc-400 font-mono">
          {currentPage} / {pages.length}
        </div>
      </footer>

      {/* SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 p-5 flex flex-col gap-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-purple-400">
                <Settings className="w-5 h-5" />
                <h3 className="font-semibold text-base text-zinc-100">Modo de Leitura</h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleModeChange("single")}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                  readingMode === "single"
                    ? "bg-purple-600/20 border-purple-500 text-purple-300 font-semibold"
                    : "bg-zinc-800/60 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Square className="w-5 h-5" />
                  <div className="text-left">
                    <p className="text-xs font-semibold">Página Simples (Mangá Style)</p>
                    <p className="text-[10px] text-zinc-400">Direita para a Esquerda</p>
                  </div>
                </div>
                {readingMode === "single" && <Check className="w-4 h-4 text-purple-400" />}
              </button>

              <button
                onClick={() => handleModeChange("double")}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                  readingMode === "double"
                    ? "bg-purple-600/20 border-purple-500 text-purple-300 font-semibold"
                    : "bg-zinc-800/60 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Columns className="w-5 h-5" />
                  <div className="text-left">
                    <p className="text-xs font-semibold">Página Dupla</p>
                    <p className="text-[10px] text-zinc-400">Ideal para Tablets & Monitores</p>
                  </div>
                </div>
                {readingMode === "double" && <Check className="w-4 h-4 text-purple-400" />}
              </button>

              <button
                onClick={() => handleModeChange("webtoon")}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                  readingMode === "webtoon"
                    ? "bg-purple-600/20 border-purple-500 text-purple-300 font-semibold"
                    : "bg-zinc-800/60 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <LayoutList className="w-5 h-5" />
                  <div className="text-left">
                    <p className="text-xs font-semibold">Modo Contínuo (Webtoon)</p>
                    <p className="text-[10px] text-zinc-400">Rolagem Vertical Rápida</p>
                  </div>
                </div>
                {readingMode === "webtoon" && <Check className="w-4 h-4 text-purple-400" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
