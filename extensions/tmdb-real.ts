/**
 * ==============================================================================
 * TOMODACHI PLAYER - FONTE DE EXTENSÃO REAL (TMDB - MOVIES & TV SHOWS)
 * ==============================================================================
 * Esta extensão faz chamadas reais à API v3 do TMDB (The Movie Database).
 * Suporta o parâmetro de ambiente `TMDB_API_KEY`.
 * Busca automaticamente:
 *   - Capas em HD (https://image.tmdb.org/t/p/w500/...)
 *   - Sinopses em Português (pt-BR)
 *   - Notas de avaliação dos usuários (0-10)
 *   - Ano de lançamento
 * ==============================================================================
 */

import { ExtensionSource, MediaMetadata } from "../src/lib/extensions/types";

export const TMDBRealSource: ExtensionSource = {
  id: "tmdb-real-source",
  name: "TMDB Real API (Filmes & Séries)",
  version: "1.2.0",
  lang: "pt-BR",

  async getMetadata(filename: string): Promise<MediaMetadata | null> {
    const apiKey = process.env.TMDB_API_KEY || "15d260044e040062a4d334547900b99d"; // Public fallback read key

    const cleanedTitle = filename
      .replace(/\.[^/.]+$/, "")
      .replace(/\[.*?\]|\(.*?\)/g, "")
      .replace(/S\d+E\d+|E\d+|\bEp?\s*\d+\b/gi, "")
      .replace(/[._-]/g, " ")
      .trim();

    if (!cleanedTitle) return null;

    try {
      const url = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(
        cleanedTitle
      )}&language=pt-BR&page=1`;

      const response = await fetch(url);
      if (!response.ok) return null;

      const data = await response.json();
      const results = data?.results;

      if (!Array.isArray(results) || results.length === 0) return null;

      const firstResult = results.find((r) => r.poster_path) || results[0];

      const title = firstResult.title || firstResult.name || firstResult.original_title || cleanedTitle;
      const coverUrl = firstResult.poster_path
        ? `https://image.tmdb.org/t/p/w500${firstResult.poster_path}`
        : undefined;

      const releaseDate = firstResult.release_date || firstResult.first_air_date;
      const year = releaseDate ? parseInt(releaseDate.split("-")[0], 10) : undefined;
      const rating = firstResult.vote_average ? parseFloat(firstResult.vote_average.toFixed(1)) : undefined;

      return {
        title,
        synopsis: firstResult.overview || "Sem sinopse disponível.",
        coverUrl,
        rating,
        tags: [firstResult.media_type === "tv" ? "Série" : "Filme"],
        year,
        author: "TMDB Database",
      };
    } catch (error) {
      console.error("[TMDB Real Source Error]", error);
      return null;
    }
  },
};

export default TMDBRealSource;
