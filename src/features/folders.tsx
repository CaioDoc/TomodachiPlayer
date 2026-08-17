"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Tag } from "@/components/ui/Tag";
import { Folder, Plus, FolderPlus, X, Check, Loader2 } from "lucide-react";

interface FolderFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const FolderForm: React.FC<FolderFormProps> = ({ onSuccess, onCancel }) => {
  const [name, setName] = useState("");
  const [folderPath, setFolderPath] = useState("");
  const [type, setType] = useState<"video" | "manga">("video");
  const [tagInput, setTagInput] = useState("");
  const [tagsList, setTagsList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      // Include any remaining text in tagInput as tag
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
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
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

      <Input
        label="Caminho Absoluto da Pasta"
        placeholder="Ex: C:\Videos\Animes ou /home/usuario/Videos"
        value={folderPath}
        onChange={(e) => setFolderPath(e.target.value)}
        required
      />

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
  );
};
