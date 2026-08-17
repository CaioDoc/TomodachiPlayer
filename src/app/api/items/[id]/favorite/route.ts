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

    const item = await db.select({ is_favorite: items.is_favorite }).from(items).where(eq(items.id, itemId)).get();
    if (!item) {
      return NextResponse.json({ success: false, error: "Item não encontrado." }, { status: 404 });
    }

    const newFavStatus = item.is_favorite === 1 ? 0 : 1;

    await db
      .update(items)
      .set({ is_favorite: newFavStatus })
      .where(eq(items.id, itemId));

    return NextResponse.json({ success: true, is_favorite: newFavStatus });
  } catch (error) {
    console.error("[FAVORITE API ERROR]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao atualizar favorito" },
      { status: 500 }
    );
  }
}
