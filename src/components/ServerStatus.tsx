"use client";

import React, { useEffect, useState } from "react";
import { Wifi, Copy, Check } from "lucide-react";

export const ServerStatus: React.FC = () => {
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.localUrl) {
          setLocalUrl(data.localUrl);
        }
      })
      .catch((err) => console.error("Erro ao verificar IP do servidor:", err));
  }, []);

  const handleCopy = () => {
    if (!localUrl) return;
    navigator.clipboard.writeText(localUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!localUrl) return null;

  return (
    <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-xs text-indigo-200">
      <div className="flex items-center gap-2 truncate">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <Wifi className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <span className="truncate">Rede Local: <strong className="font-mono text-white">{localUrl}</strong></span>
      </div>

      <button
        onClick={handleCopy}
        className="ml-2 p-1 rounded-md hover:bg-indigo-900/60 text-indigo-300 hover:text-white transition-colors cursor-pointer shrink-0"
        title="Copiar URL para o Celular"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};
