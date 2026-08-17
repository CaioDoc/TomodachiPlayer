import fs from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { folders, items, type Folder } from "@/lib/schema";
import { eq, inArray } from "drizzle-orm";

const VIDEO_EXTENSIONS = new Set([".mp4", ".mkv", ".webm", ".avi", ".mov", ".m4v"]);
const MANGA_EXTENSIONS = new Set([".cbz", ".cbr", ".zip", ".rar", ".jpg", ".png", ".webp", ".jpeg", ".gif"]);

const IGNORED_FILES = new Set([".ds_store", "thumbs.db", "desktop.ini", ".gitkeep"]);

export interface ScannedFile {
  filename: string;
  path: string;
  type: "video" | "manga";
}

/**
 * Recursively scans a directory on disk, filtering by supported video and manga extensions.
 */
export async function scanFolder(folder: { id: number; path: string; type: "video" | "manga"; name: string }): Promise<ScannedFile[]> {
  const fileList: ScannedFile[] = [];

  async function walk(currentDir: string) {
    let entries;
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      // Folder not accessible or deleted
      return;
    }

    for (const entry of entries) {
      const entryName = entry.name;
      const lowerName = entryName.toLowerCase();

      // Skip hidden files, system files, and git keep files
      if (entryName.startsWith(".") || IGNORED_FILES.has(lowerName)) {
        continue;
      }

      const fullPath = path.resolve(currentDir, entryName);

      // Ignore extensions folder and node_modules if inside watched directory
      if (lowerName === "extensions" || lowerName === "node_modules") {
        continue;
      }

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(lowerName);
        let detectedType: "video" | "manga" | null = null;

        if (VIDEO_EXTENSIONS.has(ext)) {
          detectedType = "video";
        } else if (MANGA_EXTENSIONS.has(ext)) {
          detectedType = "manga";
        }

        if (detectedType) {
          fileList.push({
            filename: entryName,
            path: fullPath,
            type: detectedType || folder.type,
          });
        }
      }
    }
  }

  await walk(folder.path);
  return fileList;
}

/**
 * Synchronizes scanned files with the database (INSERT new items, DELETE missing items).
 */
export async function syncDatabase(
  folderId: number,
  folderType: "video" | "manga",
  scannedFiles: ScannedFile[]
) {
  const existingItems = await db
    .select({ id: items.id, path: items.path })
    .from(items)
    .where(eq(items.folder_id, folderId));

  const existingMap = new Map<string, number>();
  existingItems.forEach((item) => existingMap.set(path.normalize(item.path), item.id));

  const scannedPathsSet = new Set<string>();
  const toInsert: {
    folder_id: number;
    filename: string;
    path: string;
    type: "video" | "manga";
  }[] = [];

  for (const file of scannedFiles) {
    const normalizedPath = path.normalize(file.path);
    scannedPathsSet.add(normalizedPath);

    if (!existingMap.has(normalizedPath)) {
      toInsert.push({
        folder_id: folderId,
        filename: file.filename,
        path: file.path,
        type: file.type,
      });
    }
  }

  const toDeleteIds: number[] = [];
  for (const [existingPath, itemId] of existingMap.entries()) {
    if (!scannedPathsSet.has(existingPath)) {
      toDeleteIds.push(itemId);
    }
  }

  // Execute database batch operations inside a transaction
  db.transaction((tx) => {
    if (toInsert.length > 0) {
      const chunkSize = 100;
      for (let i = 0; i < toInsert.length; i += chunkSize) {
        const chunk = toInsert.slice(i, i + chunkSize);
        tx.insert(items).values(chunk).onConflictDoNothing().run();
      }
    }

    if (toDeleteIds.length > 0) {
      const chunkSize = 100;
      for (let i = 0; i < toDeleteIds.length; i += chunkSize) {
        const chunk = toDeleteIds.slice(i, i + chunkSize);
        tx.delete(items).where(inArray(items.id, chunk)).run();
      }
    }

    tx.update(folders)
      .set({ last_scanned_at: Math.floor(Date.now() / 1000) })
      .where(eq(folders.id, folderId))
      .run();
  });

  return {
    inserted: toInsert.length,
    deleted: toDeleteIds.length,
    total: scannedFiles.length,
  };
}

/**
 * Convenience function to scan and sync a single folder.
 */
export async function scanAndSyncFolder(folder: Folder) {
  const files = await scanFolder({
    id: folder.id,
    path: folder.path,
    type: folder.type as "video" | "manga",
    name: folder.name,
  });
  return await syncDatabase(folder.id, folder.type as "video" | "manga", files);
}

/**
 * Scans all folders stored in the database.
 */
export async function scanAllFolders() {
  const startTime = Date.now();
  const allFolders = await db.select().from(folders);

  let totalInserted = 0;
  let totalDeleted = 0;

  for (const folder of allFolders) {
    const res = await scanAndSyncFolder(folder);
    totalInserted += res.inserted;
    totalDeleted += res.deleted;
  }

  const executionTimeMs = Date.now() - startTime;
  return {
    foldersScanned: allFolders.length,
    totalInserted,
    totalDeleted,
    executionTimeMs,
  };
}
