import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { folders, tags, folderTags, items, extensions } from "@/lib/schema";

export async function GET() {
  try {
    const [allFolders, allTags, allFolderTags, allItems, allExtensions] = await Promise.all([
      db.select().from(folders),
      db.select().from(tags),
      db.select().from(folderTags),
      db.select().from(items),
      db.select().from(extensions),
    ]);

    const backupData = {
      version: "1.0.0",
      exported_at: new Date().toISOString(),
      data: {
        folders: allFolders,
        tags: allTags,
        folder_tags: allFolderTags,
        items: allItems,
        extensions: allExtensions,
      },
    };

    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `tomodachi-backup-${dateStr}.json`;

    return new Response(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[BACKUP EXPORT ERROR]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao exportar backup" },
      { status: 500 }
    );
  }
}
