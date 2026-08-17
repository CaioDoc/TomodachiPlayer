import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { folders, tags, folderTags, items, extensions } from "@/lib/schema";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const backupData = body.data || body;

    if (!backupData || typeof backupData !== "object") {
      return NextResponse.json({ success: false, error: "Arquivo de backup inválido." }, { status: 400 });
    }

    const {
      folders: inputFolders = [],
      tags: inputTags = [],
      folder_tags: inputFolderTags = [],
      items: inputItems = [],
      extensions: inputExtensions = [],
    } = backupData;

    let restoredStats = { folders: 0, tags: 0, items: 0, extensions: 0 };

    db.transaction((tx) => {
      // 1. Restore Folders
      for (const folder of inputFolders) {
        if (folder.path && folder.name && folder.type) {
          tx.insert(folders)
            .values({
              id: folder.id,
              path: folder.path,
              name: folder.name,
              type: folder.type,
              last_scanned_at: folder.last_scanned_at,
              created_at: folder.created_at,
            })
            .onConflictDoNothing()
            .run();
          restoredStats.folders++;
        }
      }

      // 2. Restore Tags
      for (const tag of inputTags) {
        if (tag.name) {
          tx.insert(tags)
            .values({
              id: tag.id,
              name: tag.name,
              color: tag.color || "#6366F1",
            })
            .onConflictDoNothing()
            .run();
          restoredStats.tags++;
        }
      }

      // 3. Restore Folder Tags
      for (const ft of inputFolderTags) {
        if (ft.folder_id && ft.tag_id) {
          tx.insert(folderTags)
            .values({
              folder_id: ft.folder_id,
              tag_id: ft.tag_id,
            })
            .onConflictDoNothing()
            .run();
        }
      }

      // 4. Restore Items & Progress
      for (const item of inputItems) {
        if (item.path && item.filename && item.folder_id) {
          tx.insert(items)
            .values({
              id: item.id,
              folder_id: item.folder_id,
              filename: item.filename,
              path: item.path,
              type: item.type,
              metadata_json: item.metadata_json,
              progress: item.progress || 0,
              total_progress: item.total_progress,
              is_favorite: item.is_favorite || 0,
              status: item.status || "watching",
              created_at: item.created_at,
            })
            .onConflictDoUpdate({
              target: items.path,
              set: {
                progress: item.progress || 0,
                total_progress: item.total_progress,
                is_favorite: item.is_favorite || 0,
                status: item.status || "watching",
                metadata_json: item.metadata_json,
              },
            })
            .run();
          restoredStats.items++;
        }
      }

      // 5. Restore Extensions
      for (const ext of inputExtensions) {
        if (ext.name && ext.url) {
          tx.insert(extensions)
            .values({
              id: ext.id,
              name: ext.name,
              url: ext.url,
              is_enabled: ext.is_enabled !== undefined ? ext.is_enabled : 1,
            })
            .onConflictDoNothing()
            .run();
          restoredStats.extensions++;
        }
      }
    });

    return NextResponse.json({
      success: true,
      restored: restoredStats,
    });
  } catch (error) {
    console.error("[BACKUP IMPORT ERROR]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao importar backup" },
      { status: 500 }
    );
  }
}
