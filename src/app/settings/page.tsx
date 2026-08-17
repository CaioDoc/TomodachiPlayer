"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FolderPlus,
  Folder,
  Trash2,
  Video,
  BookOpen,
  RefreshCw,
  Layers,
  Compass,
  Plus,
  X,
  Check,
  Globe,
  Database,
  Download,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Tag } from "@/components/ui/Tag";
import { FolderForm } from "@/features/folders";

interface FolderItem {
  id: number;
  name: string;
  path: string;
  type: "video" | "manga";
  last_scanned_at?: number;
  tags?: Array<{ id: number; name: string; color?: string }>;
}

interface ExtensionItem {
  id: number;
  name: string;
  url: string;
  is_enabled: number;
}

export default function SettingsPage() {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [extensions, setExtensions] = useState<ExtensionItem[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [loadingExtensions, setLoadingExtensions] = useState(true);

  // Forms state
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [showAddExtension, setShowAddExtension] = useState(false);
  const [extName, setExtName] = useState("");
  const [extUrl, setExtUrl] = useState("");
  const [extSubmitting, setExtSubmitting] = useState(false);
  const [extError, setExtError] = useState<string | null>(null);

  // Backup State
  const [importing, setImporting] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFolders = async () => {
    try {
      setLoadingFolders(true);
      const res = await fetch("/api/folders");
      const data = await res.json();
      if (data.success) {
        setFolders(data.folders);
      }
    } catch (err) {
      console.error("Erro ao carregar pastas:", err);
    } finally {
      setLoadingFolders(false);
    }
  };

  const fetchExtensions = async () => {
    try {
      setLoadingExtensions(true);
      const res = await fetch("/api/extensions");
      const data = await res.json();
      if (data.success) {
        setExtensions(data.extensions);
      }
    } catch (err) {
      console.error("Erro ao carregar extensões:", err);
    } finally {
      setLoadingExtensions(false);
    }
  };

  useEffect(() => {
    fetchFolders();
    fetchExtensions();
  }, []);

  const handleDeleteFolder = async (id: number) => {
    if (!confirm("Tem certeza que deseja remover esta pasta da biblioteca? Os arquivos não serão apagados do disco.")) {
      return;
    }

    try {
      const res = await fetch(`/api/folders?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setFolders(folders.filter((f) => f.id !== id));
      }
    } catch (err) {
      console.error("Erro ao excluir pasta:", err);
    }
  };

  const handleToggleExtension = async (id: number, currentEnabled: boolean) => {
    try {
      const newStatus = !currentEnabled;
      setExtensions(extensions.map((e) => (e.id === id ? { ...e, is_enabled: newStatus ? 1 : 0 } : e)));

      await fetch("/api/extensions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_enabled: newStatus }),
      });
    } catch (err) {
      console.error("Erro ao atualizar extensão:", err);
      fetchExtensions();
    }
  };

  const handleDeleteExtension = async (id: number) => {
    if (!confirm("Tem certeza que deseja remover esta extensão?")) return;

    try {
      const res = await fetch(`/api/extensions?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setExtensions(extensions.filter((e) => e.id !== id));
      }
    } catch (err) {
      console.error("Erro ao excluir extensão:", err);
    }
  };

  const handleAddExtensionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setExtError(null);

    if (!extName.trim() || !extUrl.trim()) {
      setExtError("Por favor, preencha o nome e a URL do repositório.");
      return;
    }

    setExtSubmitting(true);
    try {
      const res = await fetch("/api/extensions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: extName.trim(), url: extUrl.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao adicionar extensão.");
      }

      setExtName("");
      setExtUrl("");
      setShowAddExtension(false);
      fetchExtensions();
    } catch (err) {
      setExtError(err instanceof Error ? err.message : "Erro ao salvar extensão.");
    } finally {
      setExtSubmitting(false);
    }
  };

  // Backup Export
  const handleExportBackup = () => {
    window.location.href = "/api/backup/export";
  };

  // Backup Import
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      setBackupMessage(null);
      const text = await file.text();
      const json = JSON.parse(text);

      const res = await fetch("/api/backup/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao importar backup.");
      }

      setBackupMessage(`Backup restaurado com sucesso! (${data.restored.items} itens atualizados)`);
      fetchFolders();
      fetchExtensions();
    } catch (err) {
      setBackupMessage(`Erro: ${err instanceof Error ? err.message : "Falha na restauração."}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col min-h-screen py-4 gap-8">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="touch-target p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Configurações</h1>
            <p className="text-xs text-zinc-400">Bibliotecas locais, repositórios de extensões e backup</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col gap-8">
        {/* SEÇÃO 1: BIBLIOTECAS */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-200 font-semibold text-base">
              <Layers className="w-5 h-5 text-indigo-400" />
              <h2>Bibliotecas Cadastradas</h2>
            </div>
            {!showAddFolder && (
              <Button variant="primary" size="sm" onClick={() => setShowAddFolder(true)}>
                <FolderPlus className="w-4 h-4" />
                <span>Adicionar Pasta</span>
              </Button>
            )}
          </div>

          {showAddFolder && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <FolderForm
                onSuccess={() => {
                  setShowAddFolder(false);
                  fetchFolders();
                }}
                onCancel={() => setShowAddFolder(false)}
              />
            </div>
          )}

          {loadingFolders ? (
            <div className="flex items-center justify-center p-8 text-zinc-400 gap-2">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-sm">Carregando bibliotecas...</span>
            </div>
          ) : folders.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-center gap-3">
              <Folder className="w-10 h-10 text-zinc-600" />
              <div>
                <p className="font-semibold text-sm text-zinc-300">Nenhuma pasta cadastrada</p>
                <p className="text-xs text-zinc-500 max-w-xs mt-1">
                  Adicione pastas locais contendo vídeos ou mangás para iniciar sua biblioteca.
                </p>
              </div>
              {!showAddFolder && (
                <Button variant="secondary" size="sm" onClick={() => setShowAddFolder(true)}>
                  <FolderPlus className="w-4 h-4" />
                  <span>Cadastrar primeira pasta</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-zinc-900 border border-zinc-800/90 gap-3 transition-colors hover:border-zinc-700"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-xl bg-zinc-800 text-indigo-400 mt-0.5 sm:mt-0">
                      {folder.type === "video" ? (
                        <Video className="w-5 h-5" />
                      ) : (
                        <BookOpen className="w-5 h-5 text-purple-400" />
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-zinc-100">{folder.name}</span>
                        <span className="px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700/60 text-[10px] uppercase font-semibold text-zinc-300">
                          {folder.type === "video" ? "Vídeos" : "Mangás"}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-zinc-400 break-all select-all">{folder.path}</p>

                      {folder.tags && folder.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {folder.tags.map((tag) => (
                            <Tag key={tag.id} name={tag.name} color={tag.color} className="text-[10px]" />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="destructive"
                    size="sm"
                    className="self-end sm:self-center"
                    onClick={() => handleDeleteFolder(folder.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="sr-only sm:not-sr-only text-xs">Excluir</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SEÇÃO 2: EXTENSÕES */}
        <section className="flex flex-col gap-4 border-t border-zinc-800/80 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-200 font-semibold text-base">
              <Compass className="w-5 h-5 text-purple-400" />
              <h2>Repositórios de Extensões (Mihon/Aniyomi)</h2>
            </div>
            {!showAddExtension && (
              <Button variant="secondary" size="sm" onClick={() => setShowAddExtension(true)}>
                <Plus className="w-4 h-4" />
                <span>Adicionar Extensão</span>
              </Button>
            )}
          </div>

          {showAddExtension && (
            <form
              onSubmit={handleAddExtensionSubmit}
              className="flex flex-col gap-4 p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2 text-purple-400">
                  <Globe className="w-5 h-5" />
                  <h3 className="font-semibold text-base text-zinc-100">Instalar Nova Extensão</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddExtension(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {extError && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-xs text-red-300">
                  {extError}
                </div>
              )}

              <Input
                label="Nome da Extensão"
                placeholder="Ex: TMDB Anime Source, MyAnimeList Repo"
                value={extName}
                onChange={(e) => setExtName(e.target.value)}
                required
              />

              <Input
                label="URL do Repositório ou Fonte .ts"
                placeholder="Ex: https://raw.githubusercontent.com/.../extension.ts"
                value={extUrl}
                onChange={(e) => setExtUrl(e.target.value)}
                required
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowAddExtension(false)} disabled={extSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" disabled={extSubmitting}>
                  {extSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Instalando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Salvar Extensão</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {loadingExtensions ? (
            <div className="flex items-center justify-center p-6 text-zinc-400 gap-2">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-sm">Carregando extensões...</span>
            </div>
          ) : extensions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-center gap-3">
              <Compass className="w-10 h-10 text-zinc-600" />
              <div>
                <p className="font-semibold text-sm text-zinc-300">Nenhuma extensão instalada</p>
                <p className="text-xs text-zinc-500 max-w-xs mt-1">
                  Adicione fontes de extensões para sincronizar automaticamente capas e sinopses online.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {extensions.map((ext) => (
                <div
                  key={ext.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900 border border-zinc-800/90 gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm text-zinc-100 truncate">{ext.name}</h4>
                      <p className="text-xs font-mono text-zinc-400 truncate">{ext.url}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleExtension(ext.id, ext.is_enabled === 1)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        ext.is_enabled === 1 ? "bg-indigo-600" : "bg-zinc-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          ext.is_enabled === 1 ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-2 h-9 w-9 min-h-[36px] text-zinc-400 hover:text-red-400"
                      onClick={() => handleDeleteExtension(ext.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SEÇÃO 3: BACKUP E RESTAURAÇÃO */}
        <section className="flex flex-col gap-4 border-t border-zinc-800/80 pt-6">
          <div className="flex items-center gap-2 text-zinc-200 font-semibold text-base">
            <Database className="w-5 h-5 text-emerald-400" />
            <h2>Backup e Restauração do Banco de Dados</h2>
          </div>

          {backupMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs font-medium border ${
                backupMessage.startsWith("Erro")
                  ? "bg-red-950/60 border-red-800 text-red-300"
                  : "bg-emerald-950/60 border-emerald-800 text-emerald-300"
              }`}
            >
              {backupMessage}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-zinc-900 border border-zinc-800/90">
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold text-sm text-zinc-200">Exportar Backup</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Baixe um arquivo JSON contendo todo o seu progresso, favoritos, tags e configurações para salvar ou mover para outro dispositivo.
              </p>
              <Button variant="secondary" size="md" onClick={handleExportBackup} className="mt-2 self-start">
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Exportar Backup (JSON)</span>
              </Button>
            </div>

            <div className="flex flex-col gap-2 border-t sm:border-t-0 sm:border-l border-zinc-800 pt-4 sm:pt-0 sm:pl-5">
              <h3 className="font-semibold text-sm text-zinc-200">Restaurar Backup</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Selecione um arquivo de backup `.json` exportado anteriormente para restaurar suas mídias, tags e histórico.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />

              <Button
                variant="primary"
                size="md"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="mt-2 self-start bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30"
              >
                {importing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Restaurando...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Restaurar Backup</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
