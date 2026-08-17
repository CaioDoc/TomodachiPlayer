import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { folders, items, tags, folderTags } from "@/lib/schema";
import { eq } from "drizzle-orm";

function naturalSort(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const folderId = parseInt(id, 10);

    if (isNaN(folderId)) {
      return NextResponse.json({ success: false, error: "ID de pasta inválido." }, { status: 400 });
    }

    const folderRecord = await db.select().from(folders).where(eq(folders.id, folderId)).get();
    if (!folderRecord) {
      return NextResponse.json({ success: false, error: "Pasta não encontrada." }, { status: 404 });
    }

    // Associated tags
    const associatedTags = await db
      .select({
        id: tags.id,
        name: tags.name,
        color: tags.color,
      })
      .from(folderTags)
      .innerJoin(tags, eq(folderTags.tag_id, tags.id))
      .where(eq(folderTags.folder_id, folderId));

    // Items inside folder
    const folderItems = await db
      .select()
      .from(items)
      .where(eq(items.folder_id, folderId));

    // Natural sort items by filename (e.g. Ep 1, Ep 2, Ep 10...)
    const sortedItems = folderItems.sort((a, b) => naturalSort(a.filename, b.filename));

    return NextResponse.json({
      success: true,
      folder: {
        ...folderRecord,
        tags: associatedTags,
      },
      items: sortedItems,
    });
  } catch (error) {
    console.error("[SINGLE FOLDER GET ERROR]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao carregar pasta" },
      { status: 500 }
    );
  }
}
