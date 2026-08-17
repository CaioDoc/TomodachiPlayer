/**
 * ==============================================================================
 * TOMODACHI PLAYER - EXEMPLO DE EXTENSÃO (TMDB & ANIME SOURCE MOCK)
 * ==============================================================================
 * Este arquivo é um modelo de extensão para o TomodachiPlayer.
 * Você pode criar novas extensões TypeScript nesta pasta (`/extensions`) para buscar
 * capas, sinopses e metadados de APIs públicas como:
 *  - TMDB (The Movie Database) para filmes e séries
 *  - MyAnimeList / AniList para animes e mangás
 *  - MangaDex para quadrinhos e mangás
 *
 * Para implementar uma nova extensão:
 * 1. Implemente a interface `ExtensionSource` definida em `@/lib/extensions/types`.
 * 2. Preencha os campos `id`, `name`, `version`, `lang`.
 * 3. Escreva o método `getMetadata(filename)` que retorna o objeto `MediaMetadata`.
 * ==============================================================================
 */

import { ExtensionSource, MediaMetadata } from "../src/lib/extensions/types";

export const TMDBExampleSource: ExtensionSource = {
  id: "tmdb-example",
  name: "TMDB & Anime Metadata Source",
  version: "1.0.0",
  lang: "pt-BR",

  async getMetadata(filename: string): Promise<MediaMetadata | null> {
    // Normaliza o nome do arquivo removendo extensão e caracteres de formatação
    const cleanTitle = filename
      .replace(/\.[^/.]+$/, "")
      .replace(/[._-]/g, " ")
      .trim();

    // Simulação de delay de requisição assíncrona para API externa
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      title: cleanTitle,
      synopsis: `Sinopse sincronizada via extensão para "${cleanTitle}". Acompanhe esta obra incrível no TomodachiPlayer!`,
      coverUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80",
      rating: 8.8,
      tags: ["HD", "Legendado", "Popular"],
      year: 2024,
      author: "TMDB Extension Engine",
    };
  },
};

export default TMDBExampleSource;
