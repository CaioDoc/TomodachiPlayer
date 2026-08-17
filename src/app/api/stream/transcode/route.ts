import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fsp from "fs/promises";
import { Readable } from "stream";
import ffmpegPath from "ffmpeg-static";
import { db } from "@/lib/db";
import { folders } from "@/lib/schema";

const ffmpegExecutable = ffmpegPath || "ffmpeg";

const QUALITY_CONFIG: Record<string, { height: number; bitrate: string }> = {
  "1080p": { height: 1080, bitrate: "3000k" },
  "720p": { height: 720, bitrate: "1500k" },
  "480p": { height: 480, bitrate: "700k" },
  "360p": { height: 360, bitrate: "400k" },
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filePathParam = searchParams.get("path");
    const quality = searchParams.get("quality") || "720p";
    const startTime = parseFloat(searchParams.get("startTime") || "0");

    if (!filePathParam) {
      return NextResponse.json({ error: "Caminho do arquivo é obrigatório." }, { status: 400 });
    }

    const normalizedPath = path.resolve(filePathParam);

    // SECURITY CHECK: Verify target file path is within registered library folders
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
    try {
      await fsp.stat(normalizedPath);
    } catch {
      return NextResponse.json({ error: "Arquivo de vídeo não encontrado." }, { status: 404 });
    }

    const qConfig = QUALITY_CONFIG[quality] || QUALITY_CONFIG["720p"];

    // FFmpeg arguments for live real-time fast transcoding & MP4 stream piping
    const ffmpegArgs: string[] = [];

    if (startTime > 0) {
      ffmpegArgs.push("-ss", startTime.toString());
    }

    ffmpegArgs.push(
      "-i", normalizedPath,
      "-vf", `scale=-2:${qConfig.height}`,
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-tune", "zerolatency",
      "-b:v", qConfig.bitrate,
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "frag_keyframe+empty_moov+default_base_moof",
      "-f", "mp4",
      "pipe:1"
    );

    const ffmpegProcess = spawn(ffmpegExecutable, ffmpegArgs);

    // Convert stdout to Web ReadableStream
    const webStream = Readable.toWeb(ffmpegProcess.stdout);

    // Kill FFmpeg process if client disconnects
    req.signal.addEventListener("abort", () => {
      try {
        ffmpegProcess.kill("SIGKILL");
      } catch {
        // process already terminated
      }
    });

    return new Response(webStream as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("[TRANSCODE API ERROR]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro no transcoding do vídeo" },
      { status: 500 }
    );
  }
}
