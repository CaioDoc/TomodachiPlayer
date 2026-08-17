import { NextResponse } from "next/server";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { db } from "@/lib/db";
import { folders } from "@/lib/schema";

const MIME_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mkv": "video/x-matroska",
  ".webm": "video/webm",
  ".avi": "video/x-msvideo",
  ".mov": "video/quicktime",
  ".m4v": "video/x-m4v",
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filePathParam = searchParams.get("path");

    if (!filePathParam) {
      return NextResponse.json({ error: "Caminho do arquivo é obrigatório." }, { status: 400 });
    }

    const normalizedPath = path.resolve(filePathParam);

    // SECURITY CHECK: Verify file path is within registered library folders
    const allFolders = await db.select({ path: folders.path }).from(folders);
    const isAllowed = allFolders.some((f) => {
      const folderPath = path.resolve(f.path);
      return normalizedPath.startsWith(folderPath);
    });

    if (!isAllowed) {
      return NextResponse.json(
        { error: "Acesso negado: o arquivo não pertence às bibliotecas registradas." },
        { status: 403 }
      );
    }

    // Verify file exists
    let stat;
    try {
      stat = await fsp.stat(normalizedPath);
    } catch {
      return NextResponse.json({ error: "Arquivo de vídeo não encontrado no disco." }, { status: 404 });
    }

    const fileSize = stat.size;
    const ext = path.extname(normalizedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "video/mp4";

    const range = req.headers.get("range");

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        return new Response(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileSize}`,
          },
        });
      }

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(normalizedPath, { start, end });
      // Convert Node ReadStream to Web ReadableStream
      const webStream = Readable.toWeb(fileStream);

      return new Response(webStream as BodyInit, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": contentType,
        },
      });
    } else {
      const fileStream = fs.createReadStream(normalizedPath);
      const webStream = Readable.toWeb(fileStream);

      return new Response(webStream as BodyInit, {
        status: 200,
        headers: {
          "Accept-Ranges": "bytes",
          "Content-Length": fileSize.toString(),
          "Content-Type": contentType,
        },
      });
    }
  } catch (error) {
    console.error("[STREAM API ERROR]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao abrir stream de vídeo" },
      { status: 500 }
    );
  }
}
