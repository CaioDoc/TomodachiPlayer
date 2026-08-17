import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items, folders, tags, folderTags } from "@/lib/schema";
import { eq, gt, or, isNull, lt, and, desc } from "drizzle-orm";

export async function GET() {
  try {
    const continueItems = await db
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
      .where(
        and(
          gt(items.progress, 0),
          or(isNull(items.total_progress), lt(items.progress, items.total_progress))
        )
      )
      .orderBy(desc(items.created_at))
      .limit(10);

    const result = await Promise.all(
      continueItems.map(async (item) => {
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
    console.error("[CONTINUE API ERROR]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao buscar itens de continuação" },
      { status: 500 }
    );
  }
}
