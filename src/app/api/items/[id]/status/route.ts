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
    const { status } = body;

    const validStatuses = ["watching", "plan_to_watch", "completed", "dropped"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: "Status inválido." }, { status: 400 });
    }

    await db
      .update(items)
      .set({ status })
      .where(eq(items.id, itemId));

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error("[STATUS UPDATE API ERROR]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao atualizar status" },
      { status: 500 }
    );
  }
}
