import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { folders, tags, folderTags } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { scanAndSyncFolder } from "@/features/scanner";

export async function GET() {
  try {
    const allFolders = await db.select().from(folders);

    const result = await Promise.all(
      allFolders.map(async (folder) => {
        const associatedTags = await db
          .select({
            id: tags.id,
            name: tags.name,
            color: tags.color,
          })
          .from(folderTags)
          .innerJoin(tags, eq(folderTags.tag_id, tags.id))
          .where(eq(folderTags.folder_id, folder.id));

        return {
          ...folder,
          tags: associatedTags,
        };
      })
    );

    return NextResponse.json({ success: true, folders: result });
  } catch (error) {
    console.error("[FOLDERS GET ERROR]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao buscar pastas" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, path: folderPath, type: mediaType, tags: inputTags } = body;

    if (!name || !folderPath || !mediaType) {
      return NextResponse.json(
        { success: false, error: "Nome, Caminho e Tipo são obrigatórios." },
        { status: 400 }
      );
    }

    if (mediaType !== "video" && mediaType !== "manga") {
      return NextResponse.json(
        { success: false, error: "Tipo inválido. Escolha 'video' ou 'manga'." },
        { status: 400 }
      );
    }

    // Insert folder
    const [insertedFolder] = await db
      .insert(folders)
      .values({
        name: name.trim(),
        path: folderPath.trim(),
        type: mediaType,
      })
      .returning();

    // Process Tags if provided
    if (Array.isArray(inputTags) && inputTags.length > 0) {
      const colors = ["#6366F1", "#8B5CF6", "#EC4899", "#10B981", "#F59E0B", "#3B82F6"];

      for (let i = 0; i < inputTags.length; i++) {
        const tagName = inputTags[i].trim();
        if (!tagName) continue;

        // Find or create tag
        let tagRecord = await db.select().from(tags).where(eq(tags.name, tagName)).get();

        if (!tagRecord) {
          const color = colors[i % colors.length];
          [tagRecord] = await db
            .insert(tags)
            .values({ name: tagName, color })
            .returning();
        }

        // Link folder and tag
        if (tagRecord) {
          await db
            .insert(folderTags)
            .values({
              folder_id: insertedFolder.id,
              tag_id: tagRecord.id,
            })
            .onConflictDoNothing();
        }
      }
    }

    // Trigger immediate scan for newly added folder
    try {
      await scanAndSyncFolder(insertedFolder);
    } catch (scanErr) {
      console.warn("[FOLDERS POST] Folder added but initial scan had warnings:", scanErr);
    }

    return NextResponse.json({ success: true, folder: insertedFolder });
  } catch (error) {
    console.error("[FOLDERS POST ERROR]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao adicionar pasta" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get("id");

    if (!idParam) {
      return NextResponse.json({ success: false, error: "ID da pasta é obrigatório" }, { status: 400 });
    }

    const folderId = parseInt(idParam, 10);
    await db.delete(folders).where(eq(folders.id, folderId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[FOLDERS DELETE ERROR]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao deletar pasta" },
      { status: 500 }
    );
  }
}
