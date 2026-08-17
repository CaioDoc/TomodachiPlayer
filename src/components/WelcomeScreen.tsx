import React from "react";
import Link from "next/link";
import { FolderPlus, Play, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

export const WelcomeScreen: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center animate-in fade-in zoom-in-95 duration-300">
      {/* Animated Logo Container */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
          <div className="flex items-center gap-1 text-white">
            <Play className="w-9 h-9 fill-current" />
            <BookOpen className="w-8 h-8" />
          </div>
        </div>
        <div className="absolute -top-1 -right-1 p-1.5 rounded-full bg-amber-400 text-zinc-950 shadow-md">
          <Sparkles className="w-4 h-4" />
        </div>
      </div>

      <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent mb-2">
        Bem-vindo ao TomodachiPlayer!
      </h2>

      <p className="text-sm text-zinc-400 max-w-sm mb-8 leading-relaxed">
        Seu hub pessoal e local para assistir vídeos e ler mangás com suporte a extensões e sincronização em rede local.
      </p>

      <div className="w-full max-w-xs flex flex-col gap-3">
        <Link href="/settings" className="w-full">
          <Button variant="primary" size="lg" className="w-full shadow-lg shadow-indigo-600/30">
            <FolderPlus className="w-5 h-5" />
            <span>Adicionar Primeira Pasta</span>
          </Button>
        </Link>
      </div>
    </div>
  );
};
