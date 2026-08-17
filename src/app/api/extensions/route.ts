import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { extensions } from "@/lib/schema";
import { eq } from "drizzle-orm";

interface ExternalExtensionPlugin {
  id?: string;
  name: string;
  pkg?: string;
  url?: string;
  version?: string;
  lang?: string;
  icon?: string;
}

export async function GET() {
  try {
    const installedExtensions = await db.select().from(extensions);

    // Fetch catalog extensions from enabled extension repository URLs
    const catalog: ExternalExtensionPlugin[] = [];

    for (const repo of installedExtensions) {
      if (repo.is_enabled === 1 && repo.url.startsWith("http")) {
        try {
          const res = await fetch(repo.url, { next: { revalidate: 3600 } });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              data.forEach((item: ExternalExtensionPlugin) => {
                catalog.push({
                  name: item.name || "Fonte Sem Nome",
                  pkg: item.pkg || item.id,
                  version: item.version || "1.0.0",
                  lang: item.lang || "all",
                  icon: item.icon,
                  url: item.url || repo.url,
                });
              });
            }
          }
        } catch {
          // Continue if single repo fetch fails
        }
      }
    }

    return NextResponse.json({
      success: true,
      extensions: installedExtensions,
      catalog,
    });
  } catch (error) {
    console.error("[EXTENSIONS GET ERROR]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao carregar extensões" },
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

    const [inserted] = await db
      .insert(extensions)
      .values({
        name: name.trim(),
        url: url.trim(),
        is_enabled: 1,
      })
      .returning();

    return NextResponse.json({ success: true, extension: inserted });
  } catch (error) {
    console.error("[EXTENSIONS POST ERROR]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao adicionar extensão" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, is_enabled } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID é obrigatório." }, { status: 400 });
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
      return NextResponse.json({ success: false, error: "ID é obrigatório" }, { status: 400 });
    }

    const id = parseInt(idParam, 10);
    await db.delete(extensions).where(eq(extensions.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[EXTENSIONS DELETE ERROR]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao excluir extensão" },
      { status: 500 }
    );
  }
}
