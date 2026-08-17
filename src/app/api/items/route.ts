import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items, folders, tags, folderTags } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const typeParam = searchParams.get("type"); // 'video' | 'manga'

    const query = db
      .select({
        id: items.id,
        folder_id: items.folder_id,
        filename: items.filename,
        path: items.path,
        type: items.type,
        metadata_json: items.metadata_json,
        progress: items.progress,
        total_progress: items.total_progress,
        is_favorite: items.is_favorite,
        status: items.status,
        created_at: items.created_at,
        folderName: folders.name,
      })
      .from(items)
      .innerJoin(folders, eq(items.folder_id, folders.id));

    let allItems;
    if (typeParam === "video" || typeParam === "manga") {
      allItems = await query.where(eq(items.type, typeParam));
    } else {
      allItems = await query;
    }

    // Attach tags for each item based on its parent folder
    const result = await Promise.all(
      allItems.map(async (item) => {
        const itemTags = await db
          .select({
            id: tags.id,
            name: tags.name,
            color: tags.color,
          })
          .from(folderTags)
          .innerJoin(tags, eq(folderTags.tag_id, tags.id))
          .where(eq(folderTags.folder_id, item.folder_id));

        return {
          ...item,
          tags: itemTags,
        };
      })
    );

    return NextResponse.json({ success: true, items: result });
  } catch (error) {
    console.error("[ITEMS GET ERROR]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao buscar itens de mídia" },
      { status: 500 }
    );
  }
}
