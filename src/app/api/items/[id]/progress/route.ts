import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemId = parseInt(id, 10);

    if (isNaN(itemId)) {
      return NextResponse.json({ success: false, error: "ID inválido." }, { status: 400 });
    }

    const body = await req.json();
    const { progress, total_progress } = body;

    if (typeof progress !== "number") {
      return NextResponse.json({ success: false, error: "Valor de progresso inválido." }, { status: 400 });
    }

    const updatePayload: { progress: number; total_progress?: number } = {
      progress: Math.max(0, Math.floor(progress)),
    };

    if (typeof total_progress === "number" && total_progress > 0) {
      updatePayload.total_progress = Math.floor(total_progress);
    }

    await db
      .update(items)
      .set(updatePayload)
      .where(eq(items.id, itemId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PROGRESS POST ERROR]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao salvar progresso" },
      { status: 500 }
    );
  }
}
