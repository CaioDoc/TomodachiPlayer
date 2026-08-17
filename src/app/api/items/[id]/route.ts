import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items, folders, tags, folderTags } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemId = parseInt(id, 10);

    if (isNaN(itemId)) {
      return NextResponse.json({ success: false, error: "ID inválido." }, { status: 400 });
    }

    const item = await db
      .select({
        id: items.id,
        folder_id: items.folder_id,
        filename: items.filename,
        path: items.path,
        type: items.type,
        metadata_json: items.metadata_json,
        progress: items.progress,
        total_progress: items.total_progress,
        created_at: items.created_at,
        folderName: folders.name,
      })
      .from(items)
      .innerJoin(folders, eq(items.folder_id, folders.id))
      .where(eq(items.id, itemId))
      .get();

    if (!item) {
      return NextResponse.json({ success: false, error: "Item de mídia não encontrado." }, { status: 404 });
    }

    const itemTags = await db
      .select({
        id: tags.id,
        name: tags.name,
        color: tags.color,
      })
      .from(folderTags)
      .innerJoin(tags, eq(folderTags.tag_id, tags.id))
      .where(eq(folderTags.folder_id, item.folder_id));

    return NextResponse.json({
      success: true,
      item: {
        ...item,
        tags: itemTags,
      },
    });
  } catch (error) {
    console.error("[ITEM GET ERROR]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao buscar item" },
      { status: 500 }
    );
  }
}
