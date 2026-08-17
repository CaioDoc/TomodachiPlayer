import { NextResponse } from "next/server";
import { scanAllFolders } from "@/features/scanner";

export async function GET() {
  try {
    const result = await scanAllFolders();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[SCAN API ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao escanear arquivos",
      },
      { status: 500 }
    );
  }
}
