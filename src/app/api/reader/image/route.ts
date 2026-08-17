import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import AdmZip from "adm-zip";
import sharp from "sharp";
import { db } from "@/lib/db";
import { folders } from "@/lib/schema";

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const targetPath = searchParams.get("path");
    const entryName = searchParams.get("entry");
    const isDir = searchParams.get("isDir") === "true";

    if (!targetPath) {
      return NextResponse.json({ error: "Caminho é obrigatório." }, { status: 400 });
    }

    const normalizedPath = path.resolve(targetPath);

    // SECURITY CHECK: Verify path is within registered library folders
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

    let imageBuffer: Buffer | null = null;
    let ext = ".jpg";

    if (isDir) {
      const fullFilePath = entryName ? path.join(normalizedPath, entryName) : normalizedPath;
      imageBuffer = await fs.readFile(fullFilePath);
      ext = path.extname(fullFilePath).toLowerCase();
    } else {
      const zip = new AdmZip(normalizedPath);
      if (entryName) {
        const zipEntry = zip.getEntry(entryName);
        if (zipEntry) {
          imageBuffer = zip.readAsText(zipEntry) ? zip.readFile(zipEntry) : null;
          ext = path.extname(entryName).toLowerCase();
        }
      }
    }

    if (!imageBuffer) {
      return NextResponse.json({ error: "Imagem não encontrada no arquivo." }, { status: 404 });
    }

    // Optimize image with Sharp for mobile high performance
    let processedBuffer: Buffer = imageBuffer;
    let mimeType = MIME_MAP[ext] || "image/jpeg";

    try {
      processedBuffer = await sharp(imageBuffer)
        .resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      mimeType = "image/jpeg";
    } catch {
      processedBuffer = imageBuffer;
    }

    return new Response(new Uint8Array(processedBuffer), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (error) {
    console.error("[READER IMAGE API ERROR]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao carregar imagem" },
      { status: 500 }
    );
  }
}
