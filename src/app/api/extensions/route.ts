import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { extensions } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const allExtensions = await db.select().from(extensions);
    return NextResponse.json({ success: true, extensions: allExtensions });
  } catch (error) {
    console.error("[EXTENSIONS GET ERROR]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao buscar extensões" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, url } = body;

    if (!name || !url) {
      return NextResponse.json(
        { success: false, error: "Nome e URL do repositório são obrigatórios." },
        { status: 400 }
      );
    }

    const [newExt] = await db
      .insert(extensions)
      .values({
        name: name.trim(),
        url: url.trim(),
        is_enabled: 1,
      })
      .returning();

    return NextResponse.json({ success: true, extension: newExt });
  } catch (error) {
    console.error("[EXTENSIONS POST ERROR]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao cadastrar extensão" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, is_enabled } = body;

    if (id === undefined || is_enabled === undefined) {
      return NextResponse.json(
        { success: false, error: "ID e estado (is_enabled) são obrigatórios." },
        { status: 400 }
      );
    }

    await db
      .update(extensions)
      .set({ is_enabled: is_enabled ? 1 : 0 })
      .where(eq(extensions.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[EXTENSIONS PATCH ERROR]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao atualizar extensão" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get("id");

    if (!idParam) {
      return NextResponse.json({ success: false, error: "ID da extensão é obrigatório" }, { status: 400 });
    }

    const extId = parseInt(idParam, 10);
    await db.delete(extensions).where(eq(extensions.id, extId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[EXTENSIONS DELETE ERROR]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao excluir extensão" },
      { status: 500 }
    );
  }
}
