import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const targetDir = searchParams.get("dir") || os.homedir();

    const normalizedDir = path.resolve(targetDir);

    let entries;
    try {
      entries = await fs.readdir(normalizedDir, { withFileTypes: true });
    } catch {
      // Fallback to homedir if specified path is not accessible
      const fallbackDir = os.homedir();
      entries = await fs.readdir(fallbackDir, { withFileTypes: true });
      return NextResponse.json({
        success: true,
        currentDir: fallbackDir,
        parentDir: path.dirname(fallbackDir),
        directories: entries
          .filter((e) => e.isDirectory() && !e.name.startsWith("."))
          .map((e) => ({
            name: e.name,
            path: path.join(fallbackDir, e.name),
          })),
      });
    }

    const directories = entries
      .filter((e) => {
        if (!e.isDirectory()) return false;
        const name = e.name.toLowerCase();
        return !name.startsWith(".") && name !== "node_modules" && name !== "$recycle.bin";
      })
      .map((e) => ({
        name: e.name,
        path: path.join(normalizedDir, e.name),
      }));

    const parentDir = path.dirname(normalizedDir) !== normalizedDir ? path.dirname(normalizedDir) : null;

    // Common quick access shortcuts for user convenience
    const homedir = os.homedir();
    const shortcuts = [
      { name: "Início (Home)", path: homedir },
      { name: "Vídeos", path: path.join(homedir, "Videos") },
      { name: "Imagens", path: path.join(homedir, "Pictures") },
      { name: "Downloads", path: path.join(homedir, "Downloads") },
      { name: "Documentos", path: path.join(homedir, "Documents") },
      { name: "Área de Trabalho", path: path.join(homedir, "Desktop") },
    ];

    return NextResponse.json({
      success: true,
      currentDir: normalizedDir,
      parentDir,
      shortcuts,
      directories,
    });
  } catch (error) {
    console.error("[SYSTEM BROWSE API ERROR]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao explorar diretórios" },
      { status: 500 }
    );
  }
}
