import { NextResponse } from "next/server";
import fsp from "fs/promises";
import path from "path";
import AdmZip from "adm-zip";
import sharp from "sharp";
import { db } from "@/lib/db";
import { items, folders } from "@/lib/schema";
import { eq } from "drizzle-orm";

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
    const idParam = searchParams.get("id");
    const pathParam = searchParams.get("path");

    let targetPath: string | null = pathParam;

    if (idParam) {
      const itemId = parseInt(idParam, 10);
      if (!isNaN(itemId)) {
        const itemRecord = await db.select({ path: items.path }).from(items).where(eq(items.id, itemId)).get();
        if (itemRecord) {
          targetPath = itemRecord.path;
        }
      }
    }

    if (!targetPath) {
      return NextResponse.json({ error: "ID ou caminho do mangá é obrigatório." }, { status: 400 });
    }

    const normalizedPath = path.resolve(targetPath);

    // SECURITY CHECK: Verify targetPath is inside a registered library folder
    const allFolders = await db.select({ path: folders.path }).from(folders);
    const isAllowed = allFolders.some((f) => {
      const folderPath = path.resolve(f.path);
      return normalizedPath.startsWith(folderPath);
    });

    if (!isAllowed) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    let stat;
    try {
      stat = await fsp.stat(normalizedPath);
    } catch {
      return NextResponse.json({ error: "Arquivo de mangá não encontrado." }, { status: 404 });
    }

    let rawBuffer: Buffer | null = null;

    if (stat.isDirectory()) {
      // 1. Directory of images
      const entries = await fsp.readdir(normalizedPath);
      const imageFiles = entries.filter(isImageFile).sort(naturalSort);

      if (imageFiles.length > 0) {
        const firstImagePath = path.join(normalizedPath, imageFiles[0]);
        rawBuffer = await fsp.readFile(firstImagePath);
      }
    } else {
      const ext = path.extname(normalizedPath).toLowerCase();

      if (ext === ".cbz" || ext === ".zip" || ext === ".cbr" || ext === ".rar") {
        // 2. ZIP / CBZ / RAR Archive
        try {
          const zip = new AdmZip(normalizedPath);
          const zipEntries = zip.getEntries();
          const imageEntries = zipEntries
            .filter((entry) => !entry.isDirectory && isImageFile(entry.entryName))
            .sort((a, b) => naturalSort(a.entryName, b.entryName));

          if (imageEntries.length > 0) {
            rawBuffer = imageEntries[0].getData();
          }
        } catch (err) {
          console.error("Erro ao ler primeira página do arquivo:", err);
        }
      } else if (isImageFile(normalizedPath)) {
        // 3. Direct image file
        rawBuffer = await fsp.readFile(normalizedPath);
      }
    }

    if (!rawBuffer) {
      return NextResponse.json({ error: "Nenhuma imagem de capa encontrada." }, { status: 404 });
    }

    // Optimize first page image with sharp for fast cover rendering
    const optimizedCover = await sharp(rawBuffer)
      .resize({ width: 400, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    return new Response(new Uint8Array(optimizedCover), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("[MANGA COVER API ERROR]", error);
    return NextResponse.json({ error: "Erro ao gerar capa do mangá" }, { status: 500 });
  }
}
