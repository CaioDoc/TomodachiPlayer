import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { AniListRealSource } from "../../../../../extensions/anilist-real";
import { TMDBRealSource } from "../../../../../extensions/tmdb-real";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { itemId } = body;

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: "ID do item de mídia é obrigatório." },
        { status: 400 }
      );
    }

    const item = await db.select().from(items).where(eq(items.id, itemId)).get();
    if (!item) {
      return NextResponse.json({ success: false, error: "Item não encontrado." }, { status: 404 });
    }

    // 1. Try AniList Real API Source
    let metadata = await AniListRealSource.getMetadata(item.filename);

    // 2. If AniList has no match, fallback to TMDB Real API Source
    if (!metadata || !metadata.coverUrl) {
      const tmdbMetadata = await TMDBRealSource.getMetadata(item.filename);
      if (tmdbMetadata) {
        metadata = tmdbMetadata;
      }
    }

    if (metadata) {
      const metadataStr = JSON.stringify(metadata);
      await db
        .update(items)
        .set({ metadata_json: metadataStr })
        .where(eq(items.id, itemId));
    }

    return NextResponse.json({
      success: true,
      itemId,
      metadata,
    });
  } catch (error) {
    console.error("[EXTENSIONS SCAN POST ERROR]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao buscar metadados" },
      { status: 500 }
    );
  }
}
