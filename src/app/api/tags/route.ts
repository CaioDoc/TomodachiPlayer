import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tags } from "@/lib/schema";

export async function GET() {
  try {
    const allTags = await db.select().from(tags);
    return NextResponse.json({ success: true, tags: allTags });
  } catch (error) {
    console.error("[TAGS GET ERROR]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao buscar tags" },
      { status: 500 }
    );
  }
}
