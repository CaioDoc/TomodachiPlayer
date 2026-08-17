import { NextResponse } from "next/server";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import AdmZip from "adm-zip";
import { db } from "@/lib/db";
import { folders } from "@/lib/schema";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

function isImageFile(filename: string) {
  const lower = filename.toLowerCase();
  const ext = path.extname(lower);
  return IMAGE_EXTENSIONS.has(ext) && !filename.startsWith(".") && !filename.includes("__MACOSX");
}

function naturalSort(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const targetPath = searchParams.get("path");

    if (!targetPath) {
      return NextResponse.json({ error: "Caminho é obrigatório." }, { status: 400 });
    }

    const normalizedPath = path.resolve(targetPath);

    // SECURITY CHECK: Verify targetPath is inside a registered library folder
    const allFolders = await db.select({ path: folders.path }).from(folders);
    const isAllowed = allFolders.some((f) => {
      const folderPath = path.resolve(f.path);
      return normalizedPath.startsWith(folderPath);
    });

    if (!isAllowed) {
      return NextResponse.json(
        { error: "Acesso negado: o arquivo/pasta não pertence às bibliotecas registradas." },
        { status: 403 }
      );
    }

    let stat;
    try {
      stat = await fsp.stat(normalizedPath);
    } catch {
      return NextResponse.json({ error: "Arquivo ou pasta não encontrado no disco." }, { status: 404 });
    }

    const pages: Array<{ pageNumber: number; url: string; name: string }> = [];

    if (stat.isDirectory()) {
      // 1. Directory of image files
      const entries = await fsp.readdir(normalizedPath);
      const imageFiles = entries.filter((e) => isImageFile(e)).sort(naturalSort);

      imageFiles.forEach((file, index) => {
        const pageNumber = index + 1;
        const pageUrl = `/api/reader/image?path=${encodeURIComponent(normalizedPath)}&entry=${encodeURIComponent(file)}&isDir=true`;
        pages.push({ pageNumber, url: pageUrl, name: file });
      });
    } else {
      const ext = path.extname(normalizedPath).toLowerCase();

      if (ext === ".cbz" || ext === ".zip") {
        // 2. ZIP / CBZ Archive
        const zip = new AdmZip(normalizedPath);
        const zipEntries = zip.getEntries();

        const imageEntries = zipEntries
          .filter((entry) => !entry.isDirectory && isImageFile(entry.entryName))
          .map((entry) => entry.entryName)
          .sort(naturalSort);

        imageEntries.forEach((entryName, index) => {
          const pageNumber = index + 1;
          const pageUrl = `/api/reader/image?path=${encodeURIComponent(normalizedPath)}&entry=${encodeURIComponent(entryName)}`;
          pages.push({ pageNumber, url: pageUrl, name: path.basename(entryName) });
        });
      } else if (ext === ".cbr" || ext === ".rar") {
        // 3. RAR / CBR Archive (using AdmZip or fallback reading)
        try {
          const zip = new AdmZip(normalizedPath);
          const zipEntries = zip.getEntries();
          const imageEntries = zipEntries
            .filter((entry) => !entry.isDirectory && isImageFile(entry.entryName))
            .map((entry) => entry.entryName)
            .sort(naturalSort);

          imageEntries.forEach((entryName, index) => {
            const pageNumber = index + 1;
            const pageUrl = `/api/reader/image?path=${encodeURIComponent(normalizedPath)}&entry=${encodeURIComponent(entryName)}`;
            pages.push({ pageNumber, url: pageUrl, name: path.basename(entryName) });
          });
        } catch {
          // Return empty or single file fallback if format not supported
        }
      } else if (isImageFile(normalizedPath)) {
        // Single image file
        pages.push({
          pageNumber: 1,
          url: `/api/reader/image?path=${encodeURIComponent(normalizedPath)}&isDir=true`,
          name: path.basename(normalizedPath),
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalPages: pages.length,
      pages,
    });
  } catch (error) {
    console.error("[READER API ERROR]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao ler mangá" },
      { status: 500 }
    );
  }
}
