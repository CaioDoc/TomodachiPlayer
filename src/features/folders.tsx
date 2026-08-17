"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Tag } from "@/components/ui/Tag";
import {
  Folder,
  Plus,
  FolderPlus,
  X,
  Check,
  Loader2,
  FolderSearch,
  ChevronRight,
  Home,
  CornerLeftUp,
  HardDrive,
} from "lucide-react";

interface FolderFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface DirectoryEntry {
  name: string;
  path: string;
}

interface ShortcutEntry {
  name: string;
  path: string;
}

export const FolderForm: React.FC<FolderFormProps> = ({ onSuccess, onCancel }) => {
  const [name, setName] = useState("");
  const [folderPath, setFolderPath] = useState("");
  const [type, setType] = useState<"video" | "manga">("video");
  const [tagInput, setTagInput] = useState("");
  const [tagsList, setTagsList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Folder Browser Modal State
  const [showBrowserModal, setShowBrowserModal] = useState(false);
  const [browserCurrentDir, setBrowserCurrentDir] = useState<string>("");
  const [browserParentDir, setBrowserParentDir] = useState<string | null>(null);
  const [browserDirectories, setBrowserDirectories] = useState<DirectoryEntry[]>([]);
  const [browserShortcuts, setBrowserShortcuts] = useState<ShortcutEntry[]>([]);
  const [loadingBrowser, setLoadingBrowser] = useState(false);

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tagsList.includes(trimmed)) {
      setTagsList([...tagsList, trimmed]);
      setTagInput("");
    }
  };

  const handleKeyDownTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTagsList(tagsList.filter((t) => t !== tagToRemove));
  };

  // Open directory browser modal
  const handleOpenBrowser = async (dirToLoad?: string) => {
    setShowBrowserModal(true);
    setLoadingBrowser(true);
    try {
      const url = dirToLoad ? `/api/system/browse?dir=${encodeURIComponent(dirToLoad)}` : "/api/system/browse";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setBrowserCurrentDir(data.currentDir);
        setBrowserParentDir(data.parentDir);
        setBrowserDirectories(data.directories || []);
        if (data.shortcuts) setBrowserShortcuts(data.shortcuts);
      }
    } catch (err) {
      console.error("Erro ao explorar diretórios:", err);
    } finally {
      setLoadingBrowser(false);
    }
  };

  // Native File System API folder picker fallback
  const handleNativeShowDirectoryPicker = async () => {
    try {
      if ("showDirectoryPicker" in window) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handle = await (window as any).showDirectoryPicker();
        if (handle && handle.name) {
          // If native directory picker works, auto set name if empty
          if (!name.trim()) setName(handle.name);
        }
      }
    } catch {
      // User cancelled directory picker
    }
  };

  const handleSelectCurrentBrowserFolder = (selectedPath: string, folderName?: string) => {
    setFolderPath(selectedPath);
    if (!name.trim() && folderName) {
      setName(folderName);
    }
    setShowBrowserModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Por favor, informe um nome para a biblioteca.");
      return;
    }
    if (!folderPath.trim()) {
      setError("Por favor, informe o caminho absoluto da pasta.");
      return;
    }

    setLoading(true);

    try {
      const finalTags = [...tagsList];
      if (tagInput.trim() && !finalTags.includes(tagInput.trim())) {
        finalTags.push(tagInput.trim());
      }

      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          path: folderPath.trim(),
          type,
          tags: finalTags,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao cadastrar pasta.");
      }

      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2 text-indigo-400">
            <FolderPlus className="w-5 h-5" />
            <h3 className="font-semibold text-base text-zinc-100">Adicionar Nova Pasta Local</h3>
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-xs text-red-300">
            {error}
          </div>
        )}

        <Input
          label="Nome da Biblioteca"
          placeholder="Ex: Meus Animes, Mangás VIP"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        {/* CAMINHO DA PASTA COM BOTÃO PROCURAR PASTA */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-300">Caminho Absoluto da Pasta</label>
          <div className="flex gap-2">
            <Input
              placeholder="Ex: C:\Videos\Animes ou /home/usuario/Videos"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              className="flex-1"
              required
            />
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => {
                handleNativeShowDirectoryPicker();
                handleOpenBrowser(folderPath.trim() || undefined);
              }}
              title="Procurar pasta no computador"
              className="shrink-0 bg-indigo-950/80 text-indigo-300 border-indigo-800 hover:bg-indigo-900"
            >
              <FolderSearch className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold">Procurar Pasta</span>
            </Button>
          </div>
        </div>

        <Select
          label="Tipo de Mídia"
          value={type}
          onChange={(e) => setType(e.target.value as "video" | "manga")}
          options={[
            { value: "video", label: "Vídeo (MP4, MKV, WEBM, AVI)" },
            { value: "manga", label: "Mangá / Quadrinho (CBZ, CBR, JPG, PNG, WEBP)" },
          ]}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-300">Tags (opcional)</label>
          <div className="flex gap-2">
            <Input
              placeholder="Digite uma tag e pressione Enter ou vírgula..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleKeyDownTag}
              className="flex-1"
            />
            <Button type="button" variant="secondary" size="md" onClick={handleAddTag}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {tagsList.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tagsList.map((t) => (
                <Tag key={t} name={t} onRemove={() => handleRemoveTag(t)} />
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 mt-3 pt-3 border-t border-zinc-800">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
              Cancelar
            </Button>
          )}
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando e Escaneando...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Salvar Biblioteca</span>
              </>
            )}
          </Button>
        </div>
      </form>

      {/* MODAL DE NAVEGAÇÃO E SELEÇÃO DE PASTAS */}
      {showBrowserModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 p-5 flex flex-col gap-4 shadow-2xl max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-indigo-400">
                <FolderSearch className="w-5 h-5" />
                <h3 className="font-semibold text-base text-zinc-100">Selecionar Pasta no Computador</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBrowserModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Shortcuts */}
            {browserShortcuts.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Atalhos Rápidos</span>
                <div className="flex flex-wrap gap-1.5">
                  {browserShortcuts.map((s) => (
                    <button
                      key={s.path}
                      type="button"
                      onClick={() => handleOpenBrowser(s.path)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-xs text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Current Path Bar & Up Button */}
            <div className="flex items-center gap-2 bg-black/60 p-2.5 rounded-xl border border-zinc-800">
              {browserParentDir && (
                <button
                  type="button"
                  onClick={() => handleOpenBrowser(browserParentDir)}
                  className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  title="Voltar pasta acima"
                >
                  <CornerLeftUp className="w-4 h-4" />
                </button>
              )}
              <div className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto text-xs font-mono text-indigo-300 whitespace-nowrap">
                <Home className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                <span>{browserCurrentDir}</span>
              </div>
            </div>

            {/* Directories List */}
            <div className="flex-1 overflow-y-auto max-h-60 border border-zinc-800 rounded-xl bg-black/30 p-2 flex flex-col gap-1">
              {loadingBrowser ? (
                <div className="flex items-center justify-center p-8 text-zinc-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                  <span className="text-xs">Explorando diretórios...</span>
                </div>
              ) : browserDirectories.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-500">
                  Nenhuma subpasta encontrada neste diretório.
                </div>
              ) : (
                browserDirectories.map((dir) => (
                  <button
                    key={dir.path}
                    type="button"
                    onClick={() => handleOpenBrowser(dir.path)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-800/80 text-left transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Folder className="w-4 h-4 text-indigo-400 shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-medium text-zinc-200 truncate">{dir.name}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 shrink-0" />
                  </button>
                ))
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
              <Button type="button" variant="ghost" onClick={() => setShowBrowserModal(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() =>
                  handleSelectCurrentBrowserFolder(
                    browserCurrentDir,
                    browserCurrentDir.split(/[/\\]/).pop() || undefined
                  )
                }
                className="bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30"
              >
                <Check className="w-4 h-4" />
                <span>Selecionar Esta Pasta</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
