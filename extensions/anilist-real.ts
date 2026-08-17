/**
 * ==============================================================================
 * TOMODACHI PLAYER - FONTE DE EXTENSÃO REAL (ANILIST API - ANIME & MANGÁ)
 * ==============================================================================
 * Esta extensão faz chamadas reais à API GraphQL pública do AniList.
 * Não requer chave de API (100% gratuita e pública).
 * Busca automaticamente:
 *   - Capas em HD (coverImage.extraLarge)
 *   - Sinopses formatadas (sem tags HTML)
 *   - Notas/Avaliação (Average Score 0-10)
 *   - Tags e Gêneros (Genres)
 *   - Ano de lançamento e autor/estúdio
 * ==============================================================================
 */

import { ExtensionSource, MediaMetadata } from "../src/lib/extensions/types";

const ANILIST_API_URL = "https://graphql.anilist.co";

const SEARCH_QUERY = `
query ($search: String) {
  Media(search: $search, sort: SEARCH_MATCH) {
    id
    title {
      romaji
      english
      native
    }
    description(asHtml: false)
    coverImage {
      extraLarge
      large
    }
    averageScore
    genres
    startDate {
      year
    }
    staff(limit: 3) {
      nodes {
        name {
          full
        }
      }
    }
  }
}
`;

export const AniListRealSource: ExtensionSource = {
  id: "anilist-real-source",
  name: "AniList Real API (Animes & Mangás)",
  version: "1.2.0",
  lang: "pt-BR",

  async getMetadata(filename: string): Promise<MediaMetadata | null> {
    // Clean filename: remove extension, bracket tags like [Subs], season/episode numbers (e.g., S01E05, Ep 1)
    const cleanedTitle = filename
      .replace(/\.[^/.]+$/, "") // extension
      .replace(/\[.*?\]|\(.*?\)/g, "") // brackets/parens
      .replace(/S\d+E\d+|E\d+|\bEp?\s*\d+\b/gi, "") // episode info
      .replace(/[._-]/g, " ")
      .trim();

    if (!cleanedTitle) return null;

    try {
      const response = await fetch(ANILIST_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          query: SEARCH_QUERY,
          variables: { search: cleanedTitle },
        }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      const media = data?.data?.Media;

      if (!media) return null;

      // Clean HTML tags from synopsis
      const cleanSynopsis = media.description
        ? media.description.replace(/<[^>]*>?/gm, "").trim()
        : "Sem sinopse disponível.";

      const titleStr = media.title.romaji || media.title.english || media.title.native || cleanedTitle;
      const ratingVal = media.averageScore ? parseFloat((media.averageScore / 10).toFixed(1)) : undefined;

      const authors = media.staff?.nodes?.map((n: { name: { full: string } }) => n.name.full).filter(Boolean) || [];

      return {
        title: titleStr,
        synopsis: cleanSynopsis,
        coverUrl: media.coverImage?.extraLarge || media.coverImage?.large,
        rating: ratingVal,
        tags: media.genres || ["Anime"],
        year: media.startDate?.year || undefined,
        author: authors.join(", ") || "AniList Database",
      };
    } catch (error) {
      console.error("[AniList Real Source Error]", error);
      return null;
    }
  },
};

export default AniListRealSource;
